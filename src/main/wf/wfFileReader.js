import fs from 'fs';
import { readdir, mkdir, readFile, writeFile, copyFile } from 'fs/promises';
import zlib from 'zlib';
import amfjs from 'amfjs';
import { Readable } from 'stream';
import sharp from 'sharp';
import GifEncoder from 'gif-encoder';
import getPixels from 'get-pixels';
import path from 'path';
import { restoreCorruptedMp3 } from './restoreMp3';
import { openAndReadOrderedMap } from './readOrderedMap';
import { digestWfFileName } from './digest';
import logger from './logger';
import { ELIGIBLE_PATH_PREFIXES, POSSIBLE_PATH_REGEX } from './constants';

function bufferToStream(binary) {
  const readableInstanceStream = new Readable({
    read() {
      this.push(binary);
      this.push(null);
    },
  });

  return readableInstanceStream;
}

const asyncInflateRaw = (buffer) =>
  new Promise((resolve, reject) =>
    zlib.inflateRaw(buffer, (err, res) => (err ? reject(err) : resolve(res)))
  );

const copyFileRecursive = async (filePath, destPath) => {
  const dirs = destPath.split('/').slice(0, -1).join('/');

  await mkdir(dirs, { recursive: true });

  return copyFile(filePath, destPath);
};

const writeFileRecursive = async (destPath, fileData) => {
  const dirs = destPath.split('/').slice(0, -1).join('/');

  (async () => {
    await mkdir(dirs, { recursive: true });

    writeFile(destPath, fileData);
  })();
  return true;
};

export default class WfFileReader {
  constructor({ rootDir }) {
    this._rootDir = rootDir;
  }

  loadSavedDigestFileMap = async () => {
    const openedFile = await readFile(`${this._rootDir}/digestFileMap.lock`);
    this.digestFileMap = JSON.parse(openedFile.toString());

    return this.digestFileMap;
  };

  buildDigestFileMap = async () => {
    this.digestFileMap = {};

    const targetDirectories = [];
    let totalCount = 0;

    for (const pathPrefix of ELIGIBLE_PATH_PREFIXES) {
      const dirPath = `${this._rootDir}/${pathPrefix}`;

      const subDirs = await readdir(dirPath);

      targetDirectories.push({
        dirPath,
        subDirs,
      });

      totalCount += subDirs.length;
    }

    logger.data({
      type: 'progressStart',
      data: {
        id: 'Building hash map...',
        max: totalCount,
      },
    });
    let count = 0;

    for (const { dirPath, subDirs } of targetDirectories) {
      for (const subDir of subDirs) {
        logger.data(
          {
            type: 'progress',
            data: {
              id: 'Building hash map...',
              progress: (count += 1),
            },
          },
          { maxThrottled: 12 }
        );
        const files = await readdir(`${dirPath}/${subDir}`);

        files.forEach((file) => {
          const hashFile = {
            filePath: `${dirPath}/${subDir}/${file}`,
          };
          this.digestFileMap[`${subDir}${file}`] = hashFile;
        });
      }
    }
    logger.data({
      type: 'progressEnd',
      data: {
        id: 'Building hash map...',
      },
    });

    await writeFile(
      `${this._rootDir}/digestFileMap.lock`,
      JSON.stringify(this.digestFileMap)
    );
  };

  checkDigestPath = async (
    digest,
    { rootDir = this._rootDir, skipCheck } = {}
  ) => {
    if (!this.digestFileMap) {
      throw new Error('UNDEFINED_DIGEST_MAP');
    }

    return this.digestFileMap[digest]?.filePath;
  };

  readGeneralAndCreateOutput = async (
    filePath,
    originSavePath,
    { rootDir = this._rootDir } = {}
  ) => {
    const openedFile = await readFile(filePath);

    let fileContent = await asyncInflateRaw(openedFile);

    let savePath = originSavePath;
    let jsonData;

    if (/amf3/.test(savePath)) {
      const decoder = new amfjs.AMFDecoder(bufferToStream(fileContent));

      let decodedValue;
      let breaker = 0;

      while (breaker < 5 && !decodedValue) {
        breaker += 1;
        try {
          decodedValue = decoder.decode(amfjs.AMF3);
        } catch (err) {
          continue;
        }
      }

      if (decodedValue) {
        jsonData = decodedValue;
        savePath = savePath.replace('.amf3', '.json');
        fileContent = JSON.stringify(decodedValue, null, 4);
      }
    }

    const saveName = `${rootDir}/output/assets/${savePath.replace(
      '.deflate',
      ''
    )}`;

    await writeFileRecursive(saveName, fileContent);

    return {
      name: saveName,
      body: fileContent,
      json: jsonData,
    };
  };

  createGifFromFrames = async (targetFrames, destPath, { delay } = {}) => {
    try {
      let minX = Infinity;
      let maxX = 0;
      let minY = Infinity;
      let maxY = 0;

      targetFrames.forEach(({ fx = 0, w = 0, fy = 0, h = 0 }) => {
        if (-fx < minX) {
          minX = -fx;
        }
        if (-fx + w > maxX) {
          maxX = -fx + w;
        }
        if (-fy < minY) {
          minY = -fy;
        }
        if (-fy + h > maxY) {
          maxY = -fy + h;
        }
      });
      const refinedWidth = maxX - minX;
      const refinedHeight = maxY - minY;

      const refinedFrames = await Promise.all(
        targetFrames.map(async (image) => {
          const { frame, fx = 0, fy = 0, w = 0, h = 0 } = image;
          const animationFrame = await sharp({
            create: {
              channels: 4,
              background: { r: 245, g: 245, b: 245, alpha: 1 },
              width: Math.max(refinedWidth, w),
              height: Math.max(refinedHeight, h),
            },
          })
            .png()
            .composite([{ input: frame, left: -fx - minX, top: -fy - minY }])
            .toBuffer();

          const resized = await sharp(animationFrame)
            .resize({
              width: refinedWidth * 2,
              height: refinedHeight * 2,
              fit: 'inside',
              kernel: 'nearest',
            })
            .toBuffer();

          return resized;
        })
      );
      const encoder = new GifEncoder(refinedWidth * 2, refinedHeight * 2);
      encoder.pipe(fs.createWriteStream(destPath));
      encoder.setRepeat(0);
      encoder.setQuality(1);
      encoder.setDelay(delay || 75);
      encoder.setTransparent('0xF5F5F5');
      encoder.writeHeader();

      for (const image of refinedFrames) {
        if (!image) continue;
        const imagePixels = await new Promise((resolve) =>
          getPixels(
            `data:image/png;base64,${image.toString('base64')}`,
            (err, pixels) => {
              resolve(pixels);
            }
          )
        );
        encoder.addFrame(imagePixels.data);
      }
      encoder.finish();
    } catch (err) {
      console.log(err);
      console.log(`Failed to save ${destPath.replace(this._rootDir, '')}`);
    }
  };

  createGifFromSequence = async ({
    sequence,
    images,
    destPath,
    delay,
    indexMode = 'saveName',
    maxIndex,
  }) => {
    const { begin, end, name } = sequence;

    let targetFrames;

    switch (indexMode) {
      case 'arrayIndex': {
        const refinedBegin = Math.ceil(
          (parseInt(begin, 10) / maxIndex) * images.length
        );
        const refinedEnd = Math.ceil(
          (parseInt(end, 10) / maxIndex) * images.length
        );
        targetFrames = images.slice(refinedBegin, refinedEnd);

        break;
      }
      default: {
        targetFrames = images.filter(({ saveName }) => {
          const frameIdx = parseFloat(saveName.replace(/[^0-9]/g, ''));

          return frameIdx >= begin && frameIdx <= end;
        });
      }
    }

    this.createGifFromFrames(targetFrames, `${destPath}/${name}.gif`, {
      delay,
    });
  };

  cropSpritesFromAtlas = async ({
    sprite,
    atlases,
    destPath,
    generateGif,
    extractAll = false,
  } = {}) => {
    let needGenerateGif;
    let dest;
    let begin;
    let end;
    let gifOptions = {};

    if (typeof generateGif === 'string') {
      needGenerateGif = true;
      dest = generateGif;
    } else if (typeof generateGif === 'object') {
      needGenerateGif = true;
      ({ dest, begin, end, ...gifOptions } = generateGif);
    }
    const xyCache = {};

    let targetImages = [];
    const images = await Promise.all(
      atlases.map(async (args) => {
        const { n: name, w, h, x, y, r } = args;
        let imageBuffer;
        let isDuplicated;
        let cacheResolver;
        if (xyCache[`${x}${y}`]) {
          imageBuffer = await xyCache[`${x}${y}`];
          isDuplicated = true;
          if (r) {
            args.w = h;
            args.h = w;
            args.x = y;
            args.y = x;
          }
        } else {
          xyCache[`${x}${y}`] = new Promise((resolve) => {
            cacheResolver = resolve;
          });
          if (r) {
            imageBuffer = await sharp(sprite)
              .extract({ left: x, top: y, width: w, height: h })
              .rotate(-90)
              .toBuffer();
            args.w = h;
            args.h = w;
            args.x = y;
            args.y = x;
          } else {
            imageBuffer = await sharp(sprite)
              .extract({ left: x, top: y, width: w, height: h })
              .toBuffer();
          }

          cacheResolver(imageBuffer);
        }
        const frameId = name.split('/').pop();
        let saveNameRoot = frameId;

        if (!/[0-9]/.test(frameId)) {
          saveNameRoot = frameId.padStart(4, '0');
        }

        const saveName = `${saveNameRoot}.png`;

        if (begin && end) {
          const frameSqeunce = parseFloat(saveName.replace(/[^0-9]/g, ''));
          if (frameSqeunce >= begin && frameSqeunce <= end) {
            targetImages.push({
              frame: imageBuffer,
              saveName,
              frameId,
              ...args,
              duplicated: isDuplicated,
            });
          }
        }

        if (!isDuplicated || extractAll) {
          await mkdir(destPath, { recursive: true });

          await writeFile(path.join(destPath, saveName), imageBuffer);
        }

        return {
          frame: imageBuffer,
          ...args,
          saveName,
          frameId,
          duplicated: isDuplicated,
        };
      })
    );

    targetImages = targetImages.sort((prev, next) =>
      prev.saveName.localeCompare(next.saveName)
    );

    if (needGenerateGif) {
      await this.createGifFromFrames(
        (targetImages.length && targetImages) || images,
        dest,
        gifOptions
      );
    }

    return images.sort((prev, next) =>
      prev.saveName.localeCompare(next.saveName)
    );
  };

  readPngAndGenerateOutput = async (
    filePath,
    savePath,
    { rootDir = this._rootDir } = {}
  ) => {
    logger.devLog(`Reading file ${filePath}...`);
    const openedFile = await readFile(filePath);

    const [, byte1, byte2, byte3] = openedFile;

    if (`${byte1}${byte2}${byte3}` !== '112110103')
      throw new Error(
        'Invalid format. This file not detected as wf PNG format.'
      );

    openedFile[1] = 80;
    openedFile[2] = 78;
    openedFile[3] = 71;

    return writeFileRecursive(
      `${rootDir}/output/assets/${savePath}`,
      openedFile
    );
  };

  writeWfAsset = async (assetPath, data) => {
    const outputPath = `${this._rootDir}/output/assets/${assetPath}`;

    return writeFileRecursive(outputPath, data);
  };

  readMp3AndGenerateOutput = async (
    filePath,
    savePath,
    { rootDir = this._rootDir } = {}
  ) => {
    const restoredMp3 = await restoreCorruptedMp3(filePath, savePath);

    return writeFileRecursive(
      `${rootDir}/output/assets/${savePath}`,
      restoredMp3
    );
  };

  getAssetsFromAsFiles = async (asFiles) => {
    const possibleFilePaths = {};

    logger.data({
      type: 'progressStart',
      data: {
        id: 'Parsing possible asset paths...',
        max: asFiles.length,
      },
    });
    let rawCount = 0;

    let count = 0;

    for (const asFilePath of asFiles) {
      count += 1;
      logger.data({
        type: 'progress',
        data: {
          id: 'Parsing possible asset paths...',
          progress: count,
        },
      });
      const asFileContent = await readFile(asFilePath);
      Array.from(
        asFileContent.toString('utf-8').matchAll(POSSIBLE_PATH_REGEX)
      ).forEach(([possiblePath]) => { // eslint-disable-line
        rawCount += 1;
        possibleFilePaths[possiblePath] = true;
      });
    }
    logger.data({
      type: 'progressEnd',
      data: {
        id: 'Parsing possible asset paths...',
      },
    });
    const deduplicatedPaths = Object.keys(possibleFilePaths);
    logger.log(
      `Total of ${rawCount} asset paths found. ${
        rawCount - deduplicatedPaths.length
      } entries removed for deduplication.`
    );

    return deduplicatedPaths;
  };

  readBootFcAndGenerateOutput = async ({ rootDir = this._rootDir } = {}) => {
    const openedFile = fs.readFileSync(`${rootDir}/swf/scripts/boot_ffc6.as`);

    const bootFfcContent = openedFile.toString('utf-8');
    const pathCapturer = /(?:"path":")(.*)(?:")/g;
    const paths = Array.from(bootFfcContent.matchAll(pathCapturer)).map(
      ([, innerPath]) => innerPath
    );
    const refinedPaths = paths.map(
      (innerPath) => `master${innerPath}.orderedmap`
    );
    const digestedPaths = await Promise.all(refinedPaths.map(digestWfFileName));
    const digestedPathsOriginFileNameMap = digestedPaths.reduce(
      (acc, cur, idx) => ({ ...acc, [cur]: paths[idx] }),
      {}
    );
    const pathFileName = digestedPaths.map((digested) => [
      digested.slice(0, 2),
      digested.slice(2),
    ]);

    const masterTableFiles = [];
    const possibleFilePaths = {};

    logger.data({
      type: 'progressStart',
      data: {
        id: 'Extracting Master Tables...',
        max: pathFileName.length,
      },
    });

    let count = 0;

    for (const [dir, fileName] of pathFileName) {
      count += 1;
      logger.data({
        type: 'progress',
        data: {
          id: 'Extracting Master Tables...',
          progress: count,
        },
      });
      const digest = `${dir}${fileName}`;

      const filePath = await this.checkDigestPath(digest);

      if (!filePath) continue;
      logger.devLog(`Found ${digest}`);
      const originFileName =
        digestedPathsOriginFileNameMap[`${dir}${fileName}`];
      const fileRootName = `${rootDir}/output/orderedmap/${originFileName
        .split('/')
        .filter((val) => val)
        .join('/')}`;
      const orederedMapFilePath = `${fileRootName}.orderedmap`;
      await copyFileRecursive(filePath, orederedMapFilePath);
      const orderedMapDataJson = await openAndReadOrderedMap(
        orederedMapFilePath
      );
      const stringifiedJson = JSON.stringify(
        orderedMapDataJson,
        (k, v) => {
          if (v instanceof Array) return JSON.stringify(v);
          return v;
        },
        4
      )
        .replace(/"\[/g, '[')
        .replace(/\]"/g, ']')
        .replace(/\[\\"/g, '["')
        .replace(/\\"\]/g, '"]')
        .replace(/\\",\\"/g, '","');

      Array.from(stringifiedJson.matchAll(POSSIBLE_PATH_REGEX)).forEach(
        ([possiblePath]) => {
          possibleFilePaths[possiblePath] = true;
        }
      );
      const jsonFilePath = `${fileRootName}.json`;
      logger.devLog(`Exporting orderedmap to JSON ${jsonFilePath}`);
      await writeFileRecursive(jsonFilePath, stringifiedJson);

      masterTableFiles.push([jsonFilePath, `${dir}${fileName}`]);
    }

    logger.data({
      type: 'progressEnd',
      data: {
        id: 'Extracting Master Tables...',
      },
    });

    const filePaths = Object.keys(possibleFilePaths);

    await writeFile(
      `${this._rootDir}/filePaths.lock`,
      JSON.stringify(filePaths)
    );

    return {
      masterTableFiles: masterTableFiles.filter((v) => v),
      filePaths,
    };
  };
}

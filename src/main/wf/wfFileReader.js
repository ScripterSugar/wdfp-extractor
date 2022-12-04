import fs from 'fs';
import { readdir, mkdir, readFile, writeFile, copyFile } from 'fs/promises';
import zlib from 'zlib';
import amfjs from 'amfjs';
import { Readable } from 'stream';
import sharp from 'sharp';
import GifEncoder from 'gif-encoder';
import getPixels from 'get-pixels';
import path from 'path';
import { app } from 'electron';
import { restoreCorruptedMp3 } from './restoreMp3';
import { openAndReadOrderedMap } from './readOrderedMap';
import { digestWfFileName } from './digest';
import logger from './logger';
import { ELIGIBLE_PATH_PREFIXES, POSSIBLE_PATH_REGEX } from './constants';

const EQUIPMENT_BACKGROUNDS = {
  1: 'item_white',
  2: 'item_bronze',
  3: 'item_silver',
  4: 'item_gold',
  5: 'item_rainbow',
};

const RESOURCE_PATH = app.isPackaged
  ? process.resourcesPath
  : path.join(__dirname, '../../../');

const ASSETS_PATH = path.join(RESOURCE_PATH, 'assets');
const getAssetPath = (...paths) => {
  return path.join(ASSETS_PATH, ...paths);
};

const IMAGE_CACHE = {};

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

      let subDirs;

      try {
        subDirs = await readdir(dirPath);
      } catch (err) {
        console.log(err);
        continue;
      }

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

    if (Object.keys(this.digestFileMap).length) {
      await writeFile(
        `${this._rootDir}/digestFileMap.lock`,
        JSON.stringify(this.digestFileMap)
      );
    } else {
      throw new Error('EMPTY_DIGEST');
    }
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

  createGifFromFrames = async (
    targetFrames,
    destPath,
    { delay: defaultDelay = 75, begin = 0, animationScale = 2 } = {}
  ) => {
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
      const scaledWidth = refinedWidth * animationScale;
      const scaledHeight = refinedHeight * animationScale;
      const refinedFrames = await Promise.all(
        targetFrames.map(async (image, idx) => {
          const { frame, fx = 0, fy = 0, w = 0, h = 0, frameId } = image;
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
              width: scaledWidth,
              height: scaledHeight,
              fit: 'inside',
              kernel: 'nearest',
            })
            .toBuffer();

          let frameDelay = defaultDelay;
          let frameIndex = frameId?.replace(/[^0-9]/g, '') || '';

          if (frameIndex.length > 3) {
            frameIndex = parseFloat(frameIndex);
            const beforeFrameIndex =
              parseFloat(
                targetFrames[idx - 1]?.frameId?.replace(/[^0-9]/g, '')
              ) || begin;

            const frameAmount = frameIndex - beforeFrameIndex;

            frameDelay = Math.round(1000 * (frameAmount / 60));
          }

          return {
            frame: resized,
            delay: frameDelay,
          };
        })
      );
      const encoder = new GifEncoder(scaledWidth, scaledHeight);
      encoder.pipe(fs.createWriteStream(destPath));
      encoder.setRepeat(0);
      encoder.setQuality(1);
      encoder.setTransparent('0xF5F5F5');
      encoder.writeHeader();

      for (const image of refinedFrames) {
        if (!image) continue;
        const { frame, delay } = image;
        encoder.setDelay(delay);
        const imagePixels = await new Promise((resolve) =>
          getPixels(
            `data:image/png;base64,${frame.toString('base64')}`,
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
    animationScale,
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
      animationScale,
      begin,
    });
  };

  loadOrBuildEquipmentMap = async () => {
    if (this.equipmentMap) return this.equipmentMap;

    try {
      const equipments = JSON.parse(
        await readFile(`${this._rootDir}/output/orderedmap/item/equipment.json`)
      );

      this.equipmentMap = Object.entries(equipments).reduce(
        (acc, [id, item]) => ({
          ...acc,
          [item[6].split('/').pop()]: {
            id,
            itemId: item[0],
            name: item[1],
            description: item[7],
            maxLevel: parseInt(item[8], 10),
            rarity: parseInt(item[11], 10),
            _raw: item,
          },
        }),
        {}
      );

      return this.equipmentMap;
    } catch (err) {
      console.log(err);
      return {};
    }
  };

  buildSpriteBackgrounds = async (scale) => {
    await Promise.all(
      Object.entries(EQUIPMENT_BACKGROUNDS).map(
        async ([rarity, backgroundId]) => {
          let bgFile;

          try {
            bgFile = await readFile(
              `${this._rootDir}/output/assets/scene/general/sprite_sheet/thumbnail-assets/${backgroundId}.png`
            );
          } catch (err) {
            bgFile = await readFile(getAssetPath(`/${backgroundId}.png`));
          }

          const bg = await sharp(bgFile)
            .resize({
              width: 24 * scale,
              height: 24 * scale,
              fit: 'inside',
              kernel: 'nearest',
            })
            .toBuffer();
          IMAGE_CACHE[backgroundId] = bg;

          return true;
        }
      )
    );
  };

  cropSpritesFromAtlas = async ({
    sprite,
    atlases,
    destPath: _destPath,
    generateGif,
    scale,
    animationScale,
    extractAll = false,
    eliyaBot,
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
    const dirCache = {};
    if (eliyaBot) {
      await this.loadOrBuildEquipmentMap();
    }

    let targetImages = [];
    const images = await Promise.all(
      atlases.map(async (args) => {
        const { n: name, w, h, x, y, r } = args;
        let imageBuffer;
        let isDuplicated;
        let cacheResolver;
        let destPath = _destPath;

        if (xyCache[`${x}|${y}`]) {
          imageBuffer = await xyCache[`${x}|${y}`];
          isDuplicated = true;
          if (r) {
            args.w = h;
            args.h = w;
            args.x = y;
            args.y = x;
          }
        } else {
          xyCache[`${x}|${y}`] = new Promise((resolve) => {
            cacheResolver = resolve;
          });
          if (r) {
            if (scale && scale !== 1) {
              imageBuffer = await sharp(sprite)
                .extract({ left: x, top: y, width: w, height: h })
                .resize({
                  width: w * scale,
                  height: h * scale,
                  fit: 'inside',
                  kernel: 'nearest',
                })
                .rotate(-90)
                .toBuffer();
            } else {
              imageBuffer = await sharp(sprite)
                .extract({ left: x, top: y, width: w, height: h })
                .rotate(-90)
                .toBuffer();
            }
            args.w = h;
            args.h = w;
            args.x = y;
            args.y = x;
          } else if (scale && scale !== 1) {
            imageBuffer = await sharp(sprite)
              .extract({ left: x, top: y, width: w, height: h })
              .resize({
                width: w * scale,
                height: h * scale,
                fit: 'inside',
                kernel: 'nearest',
              })
              .toBuffer();
          } else {
            imageBuffer = await sharp(sprite)
              .extract({ left: x, top: y, width: w, height: h })
              .toBuffer();
          }

          cacheResolver(imageBuffer);
        }

        const destAssetOriginRootPath = destPath
          .replace(`${this._rootDir}/output/assets/`, '')
          .split('/')
          .slice(0, -1)
          .join('/');

        if (
          name.split('/').slice(0, -1).join('/') !== destAssetOriginRootPath
        ) {
          destPath = `${this._rootDir}/output/assets/${name
            .split('/')
            .slice(0, -1)
            .join('/')}/`;
        }

        const frameId = name.split('/').pop();
        let saveNameRoot = frameId;

        if (!/[0-9]/.test(frameId)) {
          saveNameRoot = frameId.padStart(4, '0');
        }

        let saveName = `${saveNameRoot}.png`;

        if (eliyaBot) {
          if (/equipment|ability_soul/.test(name)) {
            destPath = `${this._rootDir}/output/assets/item/eliyaBot`;
            const equipmentMap = await this.loadOrBuildEquipmentMap();
            const isSoul = /ability_soul/.test(name);
            const equipmentInfo = equipmentMap[saveNameRoot];
            const { rarity, itemId } = equipmentInfo || { rarity: 1 };
            const backgroundId = EQUIPMENT_BACKGROUNDS[rarity];
            saveName = `${itemId}${(isSoul && '_soul') || ''}.png`;
            const background = IMAGE_CACHE[backgroundId];

            if (isSoul) {
              imageBuffer = await sharp({
                create: {
                  width: 24 * scale,
                  height: 24 * scale,
                  channels: 4,
                  background: { r: 0, g: 0, b: 0, alpha: 0 },
                },
              })
                .png()
                .composite([{ input: imageBuffer, gravity: 'center' }]);
            } else {
              imageBuffer = await sharp(background).composite([
                // ...(isSoul ? [{ input: soulFrame }] : []),
                { input: imageBuffer, gravity: 'center' },
              ]);
            }
          }
        }

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
          if (!dirCache[destPath]) {
            await mkdir(destPath, { recursive: true });
            dirCache[destPath] = true;
          }

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
        { ...gifOptions, animationScale }
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

    if (/full_shot_1440_1920/.test(savePath)) {
      const resized = await sharp(openedFile)
        .resize({
          width: 500,
          height: 500,
          fit: 'inside',
        })
        .toBuffer();

      const resizedFile = await sharp({
        create: {
          width: 500,
          height: 500,
          channels: 4,
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        },
      })
        .composite([{ input: resized, gravity: 'center' }])
        .png()
        .toBuffer();

      await writeFileRecursive(
        `${rootDir}/output/assets/${savePath.replace('.png', '_resized.png')}`,
        resizedFile
      );
    }

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

  readMasterTableAndGenerateOutput = async (
    filePath,
    savePath,
    { rootDir = this._rootDir, readOnly } = {}
  ) => {
    const masterTableContent = await openAndReadOrderedMap(filePath);

    if (readOnly) return masterTableContent;

    await writeFileRecursive(
      `${rootDir}/output/orderedmap/${savePath
        .replace('master/', '')
        .replace('.orderedmap', '.json')}`,
      this.stringifyMasterTable(masterTableContent)
    );

    return masterTableContent;
  };

  stringifyMasterTable = (masterTableJson) =>
    JSON.stringify(masterTableJson, null, 4);

  readBootFcAndGenerateOutput = async ({ rootDir = this._rootDir } = {}) => {
    let bootffc6;
    let isUsingDefaultBootFFC6 = false;

    try {
      bootffc6 = fs.readFileSync(`${rootDir}/swf/scripts/boot_ffc6.as`);
    } catch (err) {
      bootffc6 = fs.readFileSync(getAssetPath('/boot_ffc6.as'));
      isUsingDefaultBootFFC6 = true;
    }

    const bootFfcContent = bootffc6.toString('utf-8');
    const pathCapturer = /(?:"path":")(.*)(?:")/g;
    const paths = Array.from(bootFfcContent.matchAll(pathCapturer)).map(
      ([, innerPath]) => innerPath
    );
    const refinedPaths = paths.map(
      (innerPath) =>
        `master${innerPath[0] === '/' ? innerPath : `/${innerPath}`}.orderedmap`
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
      const stringifiedJson = this.stringifyMasterTable(orderedMapDataJson);

      await Promise.all(
        Array.from(stringifiedJson.matchAll(POSSIBLE_PATH_REGEX)).map(
          async ([possiblePath]) => {
            possibleFilePaths[possiblePath] = true;

            const possibleMasterPath = `master/${possiblePath}.orderedmap`;
            const foundMasterInMaster = await this.checkDigestPath(
              digestWfFileName(possibleMasterPath)
            );

            if (foundMasterInMaster) {
              const innerJson = this.stringifyMasterTable(
                await this.readMasterTableAndGenerateOutput(
                  foundMasterInMaster,
                  possibleMasterPath
                )
              );

              Array.from(innerJson.matchAll(POSSIBLE_PATH_REGEX)).forEach(
                ([innerPath]) => {
                  possibleFilePaths[innerPath] = true;
                }
              );
            }
          }
        )
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

    if (!isUsingDefaultBootFFC6) {
      await writeFile(
        `${this._rootDir}/filePaths.lock`,
        JSON.stringify(filePaths)
      );
    }

    return {
      masterTableFiles: masterTableFiles.filter((v) => v),
      filePaths,
    };
  };
}

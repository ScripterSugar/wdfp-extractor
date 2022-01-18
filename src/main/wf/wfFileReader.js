import fs from 'fs';
import zlib from 'zlib';
import amfjs from 'amfjs';
import { Readable } from 'stream';
import sharp from 'sharp';
import GifEncoder from 'gif-encoder';
import getPixels from 'get-pixels';
import path from 'path';
import { openAndReadOrderedMap } from './readOrderedMap';
import { digestWfFileName } from './digest';
import logger from './logger';
import { ELIGIBLE_PATH_PREFIXES } from './constants';

function bufferToStream(binary) {
  const readableInstanceStream = new Readable({
    read() {
      this.push(binary);
      this.push(null);
    },
  });

  return readableInstanceStream;
}

const asyncExist = async (path) =>
  new Promise((resolve) => fs.exists(path, resolve));
const asyncMkdir = (...args) =>
  new Promise((resolve) => fs.mkdir(...args, resolve));
const asyncReadFile = async (path) =>
  new Promise((resolve, reject) =>
    fs.readFile(path, (err, data) => (err ? reject(err) : resolve(data)))
  );
const asyncWriteFile = (...args) =>
  new Promise((resolve) => fs.writeFile(...args, resolve));
const asyncCopyFile = (...args) =>
  new Promise((resolve) => fs.copyFile(...args, resolve));

const asyncInflateRaw = (buffer) =>
  new Promise((resolve, reject) =>
    zlib.inflateRaw(buffer, (err, res) => (err ? reject(err) : resolve(res)))
  );

const copyFileRecursive = async (filePath, destPath) => {
  const dirs = destPath.split('/').slice(0, -1).join('/');

  await asyncMkdir(dirs, { recursive: true });

  return asyncCopyFile(filePath, destPath);
};

const writeFileRecursive = async (destPath, fileData) => {
  const dirs = destPath.split('/').slice(0, -1).join('/');

  await asyncMkdir(dirs, { recursive: true });

  return asyncWriteFile(destPath, fileData);
};

export default class WfFileReader {
  constructor({ rootDir }) {
    this._rootDir = rootDir;
  }

  checkDigestPath = async (
    digest,
    { rootDir = this._rootDir, skipCheck } = {}
  ) => {
    const dir = digest.slice(0, 2);
    const fileName = digest.slice(2);

    for (const pathPrefix of ELIGIBLE_PATH_PREFIXES) {
      const filePath = `${rootDir}/${pathPrefix}${dir}/${fileName}`;

      if (skipCheck || (await asyncExist(filePath))) {
        return filePath;
      }
    }

    return null;
  };

  readGeneralAndCreateOutput = async (
    filePath,
    originSavePath,
    { rootDir = this._rootDir } = {}
  ) => {
    const openedFile = await asyncReadFile(filePath);

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
    let minX = Infinity;
    let maxX = 0;
    let minY = Infinity;
    let maxY = 0;

    targetFrames.forEach(({ fx, w, fy, h }) => {
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
      targetFrames.map(async ({ frame, fx, fy, w, h, n }) => {
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
  };

  cropSpritesFromAtlas = async ({
    sprite,
    atlases,
    destPath,
    generateGif,
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
        const { n: name, w, h, x, y, r, fx, fy, fw, fh } = args;
        let imageBuffer;
        let isDuplicated;
        let cacheResolver;
        if (xyCache[`${x}${y}`]) {
          imageBuffer = await xyCache[`${x}${y}`];
          isDuplicated = true;
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
        const saveName = `${name.split('/').pop()}.png`;

        if (begin && end) {
          const frameSqeunce = parseFloat(saveName.replace(/[^0-9]/g, ''));
          if (frameSqeunce >= begin && frameSqeunce <= end) {
            targetImages.push({
              frame: imageBuffer,
              saveName,
              ...args,
              duplicated: isDuplicated,
            });
          }
        }

        if (!isDuplicated) {
          console.log(`Savgin ${saveName}`);
          await asyncMkdir(destPath, { recursive: true });

          await asyncWriteFile(path.join(destPath, saveName), imageBuffer);
        }

        return {
          frame: imageBuffer,
          ...args,
          saveName,
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

    return true;
  };

  readPngAndGenerateOutput = async (
    filePath,
    savePath,
    { rootDir = this._rootDir } = {}
  ) => {
    logger.devLog(`Reading file ${filePath}...`);
    const openedFile = await asyncReadFile(filePath);

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
      for (const pathPrefix of ELIGIBLE_PATH_PREFIXES) {
        const filePath = `${rootDir}/${pathPrefix}${dir}/${fileName}`;

        if (await asyncExist(filePath)) {
          logger.devLog(`Found ${filePath}`);
          const originFileName =
            digestedPathsOriginFileNameMap[`${dir}${fileName}`];
          const fileRootName = `${rootDir}/output/orderedmap/${originFileName
            .split('/')
            .filter((val) => val)
            .join('/')}`;
          const orederedMapFilePath = `${fileRootName}.orderedmap`;
          await copyFileRecursive(filePath, orederedMapFilePath);
          const orderedMapDataJson = openAndReadOrderedMap(orederedMapFilePath);
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
          const jsonFilePath = `${fileRootName}.json`;
          logger.devLog(`Exporting orderedmap to JSON ${jsonFilePath}`);
          await writeFileRecursive(jsonFilePath, stringifiedJson);

          masterTableFiles.push([jsonFilePath, `${dir}${fileName}`]);
        }
      }
    }

    logger.data({
      type: 'progressEnd',
      data: {
        id: 'Extracting Master Tables...',
      },
    });

    return masterTableFiles.filter((v) => v);
  };
}

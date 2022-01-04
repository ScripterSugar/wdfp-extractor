import fs from 'fs';
import { openAndReadOrderedMap } from './readOrderedMap';
import { digestWfFileName } from './digest';
import logger from './logger';
import { ELIGIBLE_PATH_PREFIXES } from './constants';

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

  checkDigestPath = async (digest, { rootDir = this._rootDir } = {}) => {
    const dir = digest.slice(0, 2);
    const fileName = digest.slice(2);

    for (const pathPrefix of ELIGIBLE_PATH_PREFIXES) {
      const filePath = `${rootDir}/${pathPrefix}${dir}/${fileName}`;

      if (await asyncExist(filePath)) {
        return filePath;
      }
    }

    return null;
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
      `${rootDir}/output/images/${savePath}`,
      openedFile
    );
  };

  readBootFcAndGenerateOutput = async ({ rootDir = this._rootDir } = {}) => {
    const openedFile = fs.readFileSync(`${rootDir}/swf/scripts/boot_ffc6.as`);

    const bootFfcContent = openedFile.toString('utf-8');
    const pathCapturer = /(?:"path":")(.*)(?:")/g;
    const paths = Array.from(bootFfcContent.matchAll(pathCapturer)).map(
      ([, path]) => path
    );
    const refinedPaths = paths.map((path) => `master${path}.orderedmap`);
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

    for (const [dir, fileName] of pathFileName) {
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
          const jsonFilePath = `${fileRootName}.json`;
          logger.devLog(`Exporting orderedmap to JSON ${jsonFilePath}`);
          await writeFileRecursive(
            jsonFilePath,
            JSON.stringify(
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
              .replace(/\\",\\"/g, '","')
          );

          masterTableFiles.push([jsonFilePath, `${dir}${fileName}`]);
        }
      }
    }

    return masterTableFiles.filter((v) => v);
  };
}

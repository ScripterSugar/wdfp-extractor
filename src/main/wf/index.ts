import fs from 'fs';
import moment from 'moment';
import fkill from 'fkill';
import path from 'path';
import AdmZip from 'adm-zip';
import crypto from 'crypto';
import rimraf from 'rimraf';
import { app } from 'electron';
import { ChildProcess, spawn } from 'child_process';
import WfFileReader from './wfFileReader';
import logger from './logger';
import { LSResult, WFExtractorMetaData } from './typedefs';
import { digestWfFileName } from './digest';
import {
  asyncExec,
  asyncMkdir,
  asyncReadDir,
  asyncReadFile,
  asyncRename,
  refineLs,
  sleep,
  spawnCommand,
} from './helpers';
import {
  CHARACTER_AMF_PRESERTS,
  CHARACTER_SPRITE_PRESETS,
  DATEFORMAT_A,
  MERGEABLE_PATH_PREFIXES,
  NOX_PORT_LIST,
} from './constants';

const RESOURCES_PATH = app.isPackaged
  ? path.join(process.resourcesPath, 'assets')
  : path.join(__dirname, '../../../assets');

const getAssetPath = (...paths: string[]): string => {
  return path.join(RESOURCES_PATH, ...paths);
};

const DIR_CACHE = {};

const createAndCacheDirectory = async (dir) => {
  await asyncMkdir(dir, { recursive: true });
  DIR_CACHE[dir] = true;
};

const DEFAULT_ROOT_PATH = 'D:/wfextract';
const ADB_PATH = getAssetPath(`/adb/adb.exe`);
const METADATA_PATH = (rootPath) => `${rootPath}/metadata.json`;

const getDeviceList = async () => {
  const devices = await asyncExec(`${ADB_PATH} devices`);

  return devices
    .split(/[\r]{0,}\n/)
    .slice(1)
    .filter((val) => val)
    .map((val) => val.split('\t')[0]);
};

const tryConnect = async () => {
  await Promise.all(
    NOX_PORT_LIST.map((port) => {
      return asyncExec(`${ADB_PATH} connect 127.0.0.1:${port}`);
    })
  );
  return true;
};
class AdbShell {
  drained = false;

  shell = ChildProcess;

  execResult = '';

  execResolver: (any) => void;

  execRejector: (any) => void;

  DEVICE_ID: string;

  constructor({ deviceId }) {
    this.DEVICE_ID = deviceId;
    this.shell = spawn(`${ADB_PATH} -s ${this.DEVICE_ID} shell`, {
      shell: true,
    });

    this.shell.stdout.on('data', this.onReceiveStdOut);
    this.shell.stderr.on('data', this.onReceiveStdErr);
    this.shell.stdin.setDefaultEncoding('utf-8');
    this.shell.on('close', () => {
      this.drained = true;
    });
  }

  init = async () => {};

  exec = async (command) => {
    if (this.drained) {
      throw new Error('Calling exec from already drained shell instance.');
    }

    this.shell.stdin.write(`${command}; echo FLAG_WDFP_EXTRACTOR_DONE\r\n`);
    console.log(`${command}`);
    this.result = '';

    return new Promise((resolve, reject) => {
      this.execResolver = resolve;
      this.execRejector = reject;
    });
  };

  onReceiveStdOut = (data) => {
    const received = data.toString();

    if (/FLAG_WDFP_EXTRACTOR_DONE/.test(received)) {
      return this.execResolver?.(
        `${this.result}${received.replace(
          /FLAG_WDFP_EXTRACTOR_DONE/,
          ''
        )}`.trim()
      );
    }

    this.result += received;

    return null;
  };

  onReceiveStdErr = (data) => {
    const received = data.toString();
    if (this.execRejector) {
      this.execRejector(received);
      this.execResolver = null;
      this.execRejector = null;
    }
  };

  kill = () => {
    this.shell.stdin.pause();
    this.shell.kill();
  };
}

class WfExtractor {
  metadata: WFExtractorMetaData;

  fileReader: WfFileReader;

  adbShell: AdbShell;

  adbWfPath: string;

  deltaFiles: any[];

  ROOT_PATH: string;

  DEVICE_ID: string;

  ADB_ROOT = false;

  target: 'gl' | 'jp';

  APK_NAME_KEY = {
    gl: 'wdfp',
    jp: 'worldflipper',
  };

  constructor({ region, rootDir } = {}) {
    this.metadata = {};

    this.setRootPath(rootDir || DEFAULT_ROOT_PATH);
    logger.log(`Target region set as ${region}`);
    this.region = region || 'jp';
  }

  setRootPath = (rootPath) => {
    this.ROOT_PATH = rootPath;
    this.fileReader = new WfFileReader({ rootDir: this.ROOT_PATH });
  };

  markMetaData = (update: WFExtractorMetaData) => {
    this.metadata = {
      ...this.metadata,
      ...update,
    };

    fs.writeFile(
      METADATA_PATH(this.ROOT_PATH),
      JSON.stringify(this.metadata),
      () => {}
    );
  };

  init = async () => {
    logger.log('Initializing extraction process.');

    try {
      await asyncExec('java -version');
    } catch (err) {
      throw new Error('JAVA_NOT_INSTALLED');
    }

    if (!fs.existsSync(METADATA_PATH(this.ROOT_PATH))) {
      fs.writeFileSync(
        METADATA_PATH(this.ROOT_PATH),
        JSON.stringify({
          lastExtractionDate: null,
          lastPackageVersion: null,
          lastSwfChecksum: null,
        })
      );
    }

    this.metadata = JSON.parse(
      fs.readFileSync(METADATA_PATH(this.ROOT_PATH)).toString()
    );
  };

  selectDevice = async (deviceId) => {
    logger.log('scanning connected devices.');

    if (deviceId) {
      this.DEVICE_ID = deviceId;
    } else {
      await tryConnect();
      const foundDevices = await getDeviceList();

      logger.log(`${foundDevices.length} device(s) found.`);

      if (!foundDevices.length) {
        throw new Error('DEVICE_NOT_FOUND');
      }
      if (foundDevices.length > 1) {
        throw new Error(`MULTIPLE_DEVICES_FOUND/${foundDevices.join('/')}`);
      }

      [this.DEVICE_ID] = foundDevices;
    }

    logger.log(`Connected to device ${this.DEVICE_ID}`);

    const adbRootQuery = await asyncExec(
      `${ADB_PATH} -s ${this.DEVICE_ID} root`
    );

    if (/cannot run as root/.test(adbRootQuery)) {
      logger.log('WARNING: Adb connected as non-root permission.');
      this.ADB_ROOT = false;
    } else {
      logger.log('ADB connected as root.');
      this.ADB_ROOT = true;
    }
    return true;
  };

  connectAdbShell = async () => {
    this.adbShell = new AdbShell({ deviceId: this.DEVICE_ID });

    if (!this.ADB_ROOT) {
      try {
        await this.adbShell.shell.stdin.write('su\r\n');
      } catch (err) {
        console.log(err);
        throw new Error('DEVICE_NOT_ROOTED');
      }
    }

    logger.log('Adb shell connected.');
  };

  indexWfAssets = async () => {
    let foundWfPath;

    try {
      [foundWfPath] = (
        await this.adbShell.exec(
          'find /data/data -name "*4d576b424178c5b2b253a2dd5aa3d78fa74ef3*"'
        )
      ).split('/upload');
    } catch (err) {
      console.log(err);

      throw new Error('PROHIBITED_DATA_PERMISSION');
    }

    if (!foundWfPath) throw new Error('ADB_ASSET_PATH_NOT_FOUND');

    this.adbWfPath = foundWfPath;

    logger.log('Wf assets found. building files index...');

    const subDirs = (await this.adbShell.exec(`ls "${this.adbWfPath}"`))
      .split(/[\r]{0,}\n/)
      .filter((val) => val);
    const files: LSResult[] = [];

    for (const subDir of subDirs) {
      files.push(
        ...refineLs(
          await this.adbShell.exec(`ls -lR "${this.adbWfPath}/${subDir}"`)
        )
      );
    }

    this.files = files;
  };

  adbPull = async (source, target) => {
    if (this.ADB_ROOT) {
      return asyncExec(
        `${ADB_PATH} -s ${this.DEVICE_ID} pull "${source}" "${target}"`
      );
    }

    await this.adbShell.exec('mkdir -p /sdcard/wdfpExtract');

    const sourceTargetName = source
      .split('/')
      .filter((val) => val)
      .pop();

    logger.log(`Copying files from ${source} to pullable destination...`);

    await this.adbShell.exec(`cp -a "${source}" "/sdcard/wdfpExtract"`);

    logger.log(`Successfully copied files from ${source} to sdcard.`);
    logger.log(`Pulling copied files from sdcard to extraction directory...`);

    return asyncExec(
      `${ADB_PATH} -s ${this.DEVICE_ID} pull "/sdcard/wdfpExtract/${sourceTargetName}" "${target}"`
    );
  };

  dumpWfAssets = async () => {
    logger.log('Asset dump started.');

    const { lastExtractionDate } = this.metadata;

    if (lastExtractionDate) {
      const deltaFiles = this.files.filter(
        (file) => file.modifiedDate > lastExtractionDate && !file.isDirectory
      );

      logger.log('Extracting deltas...');

      for (const deltaFile of deltaFiles) {
        const targetPath = `${this.ROOT_PATH}/dump/${deltaFile.path
          .replace(this.adbWfPath, '')
          .split('/')
          .slice(0, -1)
          .join('/')}`;

        if (!DIR_CACHE[targetPath]) {
          createAndCacheDirectory(targetPath);
        }

        await this.adbPull(deltaFile.path, `${targetPath}/`);
      }

      this.deltaFiles = deltaFiles;

      logger.log(`${deltaFiles.length} files newly extracted and saved.`);
    } else {
      logger.log(
        'WARNING: failed to find metadata, executing full asset dump. this process might take more than several minutes, so please be patience.'
      );
      await new Promise((resolve) => rimraf(`${this.ROOT_PATH}/dump`, resolve));
      console.log('Existing dump data cleared.');
      await this.adbPull(this.adbWfPath, `${this.ROOT_PATH}/dump`);
    }

    logger.log('Asset dump successful.');

    this.markMetaData(
      {
        lastExtractionDate: moment().format(DATEFORMAT_A),
      },
      this.ROOT_PATH
    );
  };

  mergeAssets = async () => {
    for (const mergeablePath of MERGEABLE_PATH_PREFIXES) {
      try {
        const foundSubPathes = await asyncReadDir(
          `${this.ROOT_PATH}/${mergeablePath}`
        );

        for (const mergeableSubPath of foundSubPathes) {
          const foundAssets = await asyncReadDir(
            `${this.ROOT_PATH}/${mergeablePath}/${mergeableSubPath}`
          );

          for (const foundAsset of foundAssets) {
            await asyncRename(
              `${this.ROOT_PATH}/${mergeablePath}/${mergeableSubPath}/${foundAsset}`,
              `${this.ROOT_PATH}/dump/upload/${mergeableSubPath}/${foundAsset}`
            );
          }
        }

        await new Promise((resolve) =>
          rimraf(`${this.ROOT_PATH}/${mergeablePath}`, resolve)
        );
      } catch (err) {
        console.log(err);
        continue;
      }
    }
  };

  dumpAndExtractApk = async () => {
    logger.log('Extracting Package APK...');

    const apkPath = `${this.ROOT_PATH}/apk.apk`;
    const apkExtractionPath = `${this.ROOT_PATH}/apk-extract`;

    const packageInfoLine = await this.adbShell.exec(
      `pm list packages -f | grep ${this.APK_NAME_KEY[this.region]}`
    );

    const packageName = packageInfoLine
      .split('=')
      .slice(-1)[0]
      .replace(/[\r]{0,}\n/, '');

    if (!packageInfoLine || !packageName) {
      throw new Error('APK_NOT_FOUND');
    }

    const packageVersion = (
      await this.adbShell.exec(
        `dumpsys package ${packageName} | grep versionName`
      )
    )
      .trim()
      .replace('versionName=', '');

    if (
      !this.metadata.lastPackageVersion ||
      packageVersion !== this.metadata.lastPackageVersion
    ) {
      logger.log('APK version mismatch - exporting new APK...');
      if (fs.existsSync(apkPath)) {
        fs.rmSync(apkPath);
      }
      if (fs.existsSync(apkExtractionPath)) {
        await new Promise((resolve) => rimraf(apkExtractionPath, resolve));
      }

      const savedApkPath = packageInfoLine
        .split('=')
        .slice(0, -1)
        .join('=')
        .replace('package:', '');

      await asyncExec(
        `${ADB_PATH} -s ${this.DEVICE_ID} pull "${savedApkPath}" "${apkPath}"`
      );

      new AdmZip(`${this.ROOT_PATH}/apk.apk`).extractAllTo(apkExtractionPath);
      logger.log(`APK extracted and saved to ${apkPath}`);

      const assetFileList = fs.readdirSync(`${apkExtractionPath}/assets/`);

      const swfFileName = assetFileList.find((file) => /.swf/.test(file));
      const swfData = await asyncReadFile(
        `${apkExtractionPath}/assets/${swfFileName}`
      );

      const swfCheckSum = crypto
        .createHash('md5')
        .update(swfData, 'utf8')
        .digest('hex');

      if (swfCheckSum !== this.metadata.lastSwfChecksum) {
        logger.log(
          'SWF checksum mismatch - decompile swf and export essential scripts... (This might take more than several minutes.)'
        );

        const swfExtractionPath = `${this.ROOT_PATH}/swf`;

        if (fs.existsSync(swfExtractionPath)) {
          logger.log('Cleaning up existing files...');
          await new Promise((resolve) => rimraf(swfExtractionPath, resolve));
          logger.log('File cleanup successful.');
        }

        const { process: swfExtractionProcess, awaiter } = await spawnCommand(
          'java',
          [
            '-jar',
            getAssetPath('/ffdec/ffdec.jar'),
            '-export',
            'script',
            `${swfExtractionPath}`,
            `${apkExtractionPath}/assets/worldflipper_android_release.swf`,
          ],
          { wait: 'boot_ffc6' }
        );

        await awaiter;

        logger.log(
          'boot_ffc6.as script generated. terminating extraction process...'
        );

        try {
          await fkill(swfExtractionProcess.pid, { force: true });
        } catch (err) {
          logger.log(err);
        }

        logger.log('SWF Extraction successful.');
      }

      this.markMetaData(
        {
          lastPackageVersion: packageVersion,
          lastSwfChecksum: swfCheckSum,
        },
        this.ROOT_PATH
      );
    } else {
      logger.log('APK not updated. skipping apk extraction...');
    }
  };

  extractMasterTable = async () => {
    logger.log('Start extracting orderedMaps...');

    const masterTables = await this.fileReader.readBootFcAndGenerateOutput({
      rootDir: this.ROOT_PATH,
    });

    logger.log('Successfully extracted orderedMaps.');
  };

  characterListCache = null;

  getCharacterList = async () => {
    if (this.characterListCache) return this.characterListCache;

    let characters = Object.values(
      JSON.parse(
        (
          await asyncReadFile(
            `${this.ROOT_PATH}/output/orderedmap/character/character.json`
          )
        ).toString()
      )
    ).map(([name]) => name);

    characters.push(
      ...Object.keys(
        JSON.parse(
          (
            await asyncReadFile(
              `${this.ROOT_PATH}/output/orderedmap/generated/trimmed_image.json`
            )
          ).toString()
        )
      ).map((key) => key.split('/')[1])
    );

    characters = [...new Set(characters)];

    this.characterListCache = characters;

    return characters;
  };

  extractImageAssets = async () => {
    logger.log('Start extracting character image assets...');

    const characters = await this.getCharacterList();

    const characterImageDigests = [
      ...new Set(
        characters
          .map((character) =>
            CHARACTER_SPRITE_PRESETS.map((preset) =>
              new Array(3).fill().map((_, idx) => preset(character, idx))
            )
          )
          .reduce(
            (acc, fileNameArrays) => [
              ...acc,
              ...fileNameArrays.reduce(
                (accInner, array) => [...accInner, ...array],
                []
              ),
            ],
            []
          )
      ),
    ].map((file) => [`${file}.png`, digestWfFileName(`${file}.png`)]);

    const characterImagePaths = [];

    let count = 0;
    logger.data({
      type: 'progressStart',
      data: {
        id: 'Generating digests for possible assets...',
        max: characterImageDigests.length,
      },
    });
    for (const [fileName, digest] of characterImageDigests) {
      count += 1;
      logger.data({
        type: 'progress',
        data: {
          id: 'Generating digests for possible assets...',
          progress: count,
        },
      });
      const filePath = await this.fileReader.checkDigestPath(digest);
        if (!filePath) continue; // eslint-disable-line
      characterImagePaths.push([fileName, filePath]);
    }
    logger.data({
      type: 'progressEnd',
      data: {
        id: 'Generating digests for possible assets...',
      },
    });

    count = 0;
    logger.data({
      type: 'progressStart',
      data: {
        id: 'Exporting character image assets...',
        max: characterImagePaths.length,
      },
    });
    for (const [fileName, filePath] of characterImagePaths) {
      count += 1;
      logger.data({
        type: 'progress',
        data: {
          id: 'Exporting character image assets...',
          progress: count,
        },
      });
      await this.fileReader.readPngAndGenerateOutput(filePath, fileName);
    }
    logger.data({
      type: 'progressEnd',
      data: {
        id: 'Exporting character image assets...',
      },
    });
    logger.log('Exporting sprite atlases & frames...');

    logger.log('Successfully extracted character image assets.');
  };

  extractCharacterSpriteMetaDatas = async () => {
    const characters = await this.getCharacterList();

    const characterAmfDigests = characters
      .map((character) =>
        CHARACTER_AMF_PRESERTS.map((preset) => preset(character))
      )
      .reduce((acc, fileNameArrays) => [...acc, ...fileNameArrays], [])
      .map((file) => [`${file}`, digestWfFileName(`${file}`)]);

    const characterAmfPaths = [];

    for (const [fileName, digest] of characterAmfDigests) {
      const filePath = await this.fileReader.checkDigestPath(digest);
        if (!filePath) continue; // eslint-disable-line
      characterAmfPaths.push([fileName, filePath]);
    }

    let count = 0;
    logger.data({
      type: 'progressStart',
      data: {
        id: 'Exporting sprite atlases...',
        max: characterAmfPaths.length,
      },
    });
    for (const [fileName, filePath] of characterAmfPaths) {
      count += 1;
      logger.data({
        type: 'progress',
        data: {
          id: 'Exporting sprite atlases...',
          progress: count,
        },
      });
      await this.fileReader.readGeneralAndCreateOutput(filePath, fileName);
    }
    logger.data({
      type: 'progressEnd',
      data: {
        id: 'Exporting sprite atlases...',
      },
    });
  };

  generateAnimatedSprites = async () => {
    logger.log('Cropping character sprites & generating animated GIFs...');
    const characters = await this.getCharacterList();

    logger.data({
      type: 'progressStart',
      data: {
        id: 'Processing Character Sprites...',
        max: characters.length,
      },
    });

    let count = 0;

    for (const character of characters) {
      count += 1;
      try {
        if (!this.metadata.spriteProcessedLock?.includes(character)) {
          const spriteImage = await asyncReadFile(
            `${this.ROOT_PATH}/output/assets/character/${character}/pixelart/sprite_sheet.png`
          );
          const spriteAtlases = JSON.parse(
            (
              await asyncReadFile(
                `${this.ROOT_PATH}/output/assets/character/${character}/pixelart/sprite_sheet.atlas.json`
              )
            ).toString()
          );
          const timeline = JSON.parse(
            (
              await asyncReadFile(
                `${this.ROOT_PATH}/output/assets/character/${character}/pixelart/pixelart.timeline.json`
              )
            ).toString()
          );
          const { begin, end } = timeline.sequences.find(
            (sequence) => sequence.name === 'walk_front'
          );
          await this.fileReader.cropSpritesFromAtlas({
            sprite: spriteImage,
            atlases: spriteAtlases,
            destPath: `${this.ROOT_PATH}/output/assets/character/${character}/pixelart/sprite_sheet`,
            generateGif: {
              begin,
              end,
              dest: `${this.ROOT_PATH}/output/assets/character/${character}/pixelart/walk_front.gif`,
              delay: 150,
            },
          });
          await this.markMetaData({
            spriteProcessedLock: [
              ...(this.metadata.spriteProcessedLock || []),
              character,
            ],
          });
        }

        if (!this.metadata.specialSpriteProcessedLock?.includes(character)) {
          const specialImage = await asyncReadFile(
            `${this.ROOT_PATH}/output/assets/character/${character}/pixelart/special_sprite_sheet.png`
          );
          const specialAtlases = JSON.parse(
            (
              await asyncReadFile(
                `${this.ROOT_PATH}/output/assets/character/${character}/pixelart/special_sprite_sheet.atlas.json`
              )
            ).toString()
          );
          await this.fileReader.cropSpritesFromAtlas({
            sprite: specialImage,
            atlases: specialAtlases,
            destPath: `${this.ROOT_PATH}/output/assets/character/${character}/pixelart/special_sprite_sheet`,
            generateGif: `${this.ROOT_PATH}/output/assets/character/${character}/pixelart/special.gif`,
          });

          await this.markMetaData({
            specialSpriteProcessedLock: [
              ...(this.metadata.specialSpriteProcessedLock || []),
              character,
            ],
          });
        }
      } catch (err) {
        if (character === 'emilia') {
          console.log(err);
        }
        continue;
      } finally {
        logger.data({
          type: 'progress',
          data: {
            id: 'Processing Character Sprites...',
            progress: count,
          },
        });
      }
    }

    logger.data({
      type: 'progressEnd',
      data: {
        id: 'Processing Character Sprites...',
      },
    });
    logger.log('Successfully cropped and saved all character sprites.');
  };

  close = async () => {
    await this.adbShell.kill();

    return true;
  };
}

export default WfExtractor;

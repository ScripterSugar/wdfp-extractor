import fs, { existsSync, mkdirSync, readFileSync } from 'fs';
import moment from 'moment';
import fkill from 'fkill';
import path from 'path';
import AdmZip from 'adm-zip';
import crypto from 'crypto';
import rimraf from 'rimraf';
import fetch from 'node-fetch';
import msgpack from 'msgpack-lite';
import { app } from 'electron';
import { ChildProcess, spawn } from 'child_process';
import { access, mkdir, readdir, readFile, stat, writeFile } from 'fs/promises';
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
  deepSearchUniqueMeaningfulStringsFromObject,
  refineLs,
  sleep,
  spawnCommand,
  withAsyncBandwidth,
} from './helpers';
import {
  ACTION_DSL_FORMAT_DEFLATE,
  BASE_ODD_MAP,
  CHARACTER_AMF_PRESERTS,
  CHARACTER_SPRITE_PRESETS,
  CHARACTER_VOICE_PRESETS,
  COMMON_FILE_FORMAT,
  DATEFORMAT_A,
  ENEMY_DSL_FORMAT_DEFLATE,
  IS_DEVELOPMENT,
  MERGEABLE_PATH_PREFIXES,
  NOX_PORT_LIST,
  POSSIBLE_PATH_REGEX,
} from './constants';

const RESOURCES_PATH = app.isPackaged
  ? path.join(process.resourcesPath, 'assets')
  : path.join(__dirname, '../../../assets');

const API_PATHS = {
  host: {
    jp: 'https://api.worldflipper.jp/latest/api/index.php',
    en: 'https://na.wdfp.kakaogames.com/latest/api/index.php',
    kr: 'https://kr.wdfp.kakaogames.com/latest/api/index.php',
  },
  asset: {
    jp: 'https://api.worldflipper.jp/latest/api/index.php/gacha/exec',
    en: 'https://na.wdfp.kakaogames.com/latest/api/index.php/gacha/exec',
    kr: 'https://kr.wdfp.kakaogames.com/latest/api/index.php/gacha/exec',
  },
  cdn: {
    en: 'http://patch.wdfp.kakaogames.com/Live/2.0.0',
    kr: 'http://patch.wdfp.kakaogames.com/Live/2.0.0',
  },
};

const getAssetPath = (...paths: string[]): string => {
  return path.join(RESOURCES_PATH, ...paths);
};

const pushExist = (array, arg) => arg && array.push(arg);

const DIR_CACHE = {};

const createAndCacheDirectory = async (dir) => {
  await asyncMkdir(dir, { recursive: true });
  DIR_CACHE[dir] = true;
};

const DEFAULT_ROOT_PATH = 'C:/wfextract';
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

const tryConnect = async (customPort) => {
  await Promise.all(
    [...NOX_PORT_LIST, ...((customPort && [customPort]) || [])].map((port) => {
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

type PossibleAssetPathTuple = [string, string];

class WfExtractor {
  metadata: WFExtractorMetaData;

  fileReader: WfFileReader;

  adbShell: AdbShell;

  adbWfPath: string;

  possibleAssetCache: {
    possibleImageAssets: PossibleAssetPathTuple[];
    possibleGeneralAmfAssets: PossibleAssetPathTuple[];
    possibleAudioAssets: PossibleAssetPathTuple[];
    possibleImageAmfAssets: PossibleAssetPathTuple[];
    sprites: { [spritePath: string]: string };
  };

  deltaFiles: any[];

  ORIGIN_ROOT_PATH: string;

  ROOT_PATH: string;

  DEVICE_ID: string;

  ADB_ROOT = false;

  region: 'gl' | 'jp';

  regionVariant: 'en' | 'kr' | 'jp';

  APK_NAME_KEY = {
    gl: 'wdfp',
    jp: 'worldflipper',
  };

  swfMode: 'simple' | 'full';

  filePaths: string[];

  asFilePaths: string[];

  customPort: string;

  deltaMode: boolean;

  confirmedDigests = {};

  constructor({
    region,
    rootDir,
    customPort,
    swfMode,
    extractAllFrames,
    regionVariant,
    deltaMode,
  }: { swfMode: 'simple' | 'full' } = {}) {
    this.metadata = {};
    this.swfMode = swfMode || 'simple';
    this.customPort = customPort;
    this.deltaMode = deltaMode;

    this.options = {
      extractAllFrames,
    };

    this.ORIGIN_ROOT_PATH = rootDir;

    let refinedRootDir = rootDir;

    if (deltaMode) {
      const deltaPath = `${rootDir}/delta-${deltaMode}`;
      if (deltaMode === 'latest') {
        mkdirSync(deltaPath, { recursive: true });
      } else if (!existsSync(deltaPath)) {
        fs.renameSync(`${rootDir}/delta-latest`, deltaPath);
      }
      refinedRootDir = deltaPath;
    }

    this.setRootPath(refinedRootDir || DEFAULT_ROOT_PATH);
    if (region) {
      logger.log(`Target region set as ${region}`);
    }
    this.region = region || 'jp';
    if (regionVariant) {
      logger.log(`Target region variant set as ${regionVariant}`);
    }
    this.regionVariant = regionVariant || 'jp';
  }

  dev = async () => {
    this.fileReader.buildDigestFileMap();
  };

  setRootPath = (rootPath) => {
    this.ROOT_PATH = rootPath;
    this.fileReader = new WfFileReader({ rootDir: this.ROOT_PATH });
  };

  markMetaData = (
    update: WFExtractorMetaData,
    { ignoreDeltaMode = false } = {}
  ) => {
    this.metadata = {
      ...this.metadata,
      ...update,
    };

    fs.writeFile(
      METADATA_PATH(ignoreDeltaMode ? this.ORIGIN_ROOT_PATH : this.ROOT_PATH),
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

    try {
      this.metadata = JSON.parse(
        fs.readFileSync(METADATA_PATH(this.ROOT_PATH)).toString()
      );
    } catch (err) {
      fs.writeFileSync(
        METADATA_PATH(this.ROOT_PATH),
        JSON.stringify({
          lastExtractionDate: null,
          lastPackageVersion: null,
          lastSwfChecksum: null,
        })
      );
    }
  };

  selectDevice = async (deviceId) => {
    logger.log('scanning connected devices.');

    if (deviceId) {
      this.DEVICE_ID = deviceId;
    } else {
      await tryConnect(this.customPort);
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

    if (/cannot run as root|restarting adbd as root/.test(adbRootQuery)) {
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

    await this.adbShell.exec(`cp -a "${source}" "/sdcard/wdfpExtract"`);
    return asyncExec(
      `${ADB_PATH} -s ${this.DEVICE_ID} pull "/sdcard/wdfpExtract/${sourceTargetName}" "${target}"`
    );
  };

  dumpWfAssets = async () => {
    logger.log('Asset dump started.');
    let isChanged;

    const { lastExtractionDate } = this.metadata;

    if (lastExtractionDate) {
      const deltaFiles = this.files.filter(
        (file) => file.modifiedDate > lastExtractionDate && !file.isDirectory
      );

      const deltaProgress = logger.progressStart({
        id: 'Extracting deltas...',
        max: deltaFiles.length,
      });

      for (const deltaFile of deltaFiles) {
        deltaProgress.progress();
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
      deltaProgress.end();

      this.deltaFiles = deltaFiles;

      if (deltaFiles.length) {
        isChanged = true;
      }

      logger.log(`${deltaFiles.length} files newly extracted and saved.`);
    } else {
      logger.log(
        'WARNING: failed to find metadata, executing full asset dump. this process might take more than several minutes, so please be patient.'
      );
      isChanged = true;
      await new Promise((resolve) => rimraf(`${this.ROOT_PATH}/dump`, resolve));
      console.log('Existing dump data cleared.');
      console.log('Copying asset files to /dump...');
      await this.adbPull(this.adbWfPath, `${this.ROOT_PATH}/dump`);
    }

    logger.log('Asset dump successful.');

    const deviceDateTime = await this.adbShell.exec('date "+%Y-%m-%d %H:%M"');

    this.markMetaData({
      lastExtractionDate: deviceDateTime,
      ...(isChanged && { lockedHashMap: false }),
    });
  };

  buildDigestFileMap = async () => {
    try {
      if (this.metadata.lockedHashMap) {
        logger.log(`Loading saved hashmap.`);
        await this.fileReader.loadSavedDigestFileMap();
      } else {
        logger.log(`Building asset digest hash map...`);
        await this.fileReader.buildDigestFileMap();
        logger.log(`Successfully built asset digest hash map.`);
        this.markMetaData({
          lockedHashMap: true,
        });
      }
    } catch (err) {
      console.log('Failed to generate hashmap.');
    }
  };

  mergeAssets = async () => {
    for (const mergeablePath of MERGEABLE_PATH_PREFIXES) {
      try {
        const foundSubPaths = await asyncReadDir(
          `${this.ROOT_PATH}/${mergeablePath}`
        );

        for (const mergeableSubPath of foundSubPaths) {
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

      this.markMetaData({
        lastPackageVersion: packageVersion,
      });
    } else {
      logger.log('APK not updated. skipping apk extraction...');
    }
  };

  checkBootFfc6 = async () => {
    try {
      const bootFfc6 = await stat(`${this.ROOT_PATH}/swf/scripts/boot_ffc6.as`);

      if (bootFfc6.size < 500 * 1024) {
        throw new Error('INVALID_BOOT_FFC6');
      }
    } catch (err) {
      console.log(err);

      if (err.message === 'INVALID_BOOT_FFC6') {
        throw err;
      }
      throw new Error('FAILED_TO_EXTRACT_BOOT_FFC6');
    }
  };

  decompileAndExportSwf = async () => {
    const apkExtractionPath = `${this.ROOT_PATH}/apk-extract`;
    const swfExtractionPath = `${this.ROOT_PATH}/swf`;

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
    } else if (
      this.swfMode === 'full' &&
      this.metadata.lastSwfMode === 'simple'
    ) {
      logger.log('Processing full asset dump...');
    } else {
      await this.checkBootFfc6();
      logger.log('Skipping Swf extraction.');
      return;
    }

    if (fs.existsSync(swfExtractionPath)) {
      logger.log('Cleaning up existing files...');
      await new Promise((resolve) => rimraf(swfExtractionPath, resolve));

      this.markMetaData({
        lastSwfChecksum: null,
        lastSwfMode: null,
      });
      logger.log('File cleanup successful.');
    }

    let logStarted = false;
    let exportStarted = false;
    let maxProgress = 0;

    const { process: swfExtractionProcess, awaiter } = await spawnCommand(
      'java',
      [
        '-jar',
        getAssetPath('/ffdec/ffdec.jar'),
        '-timeout',
        '600',
        '-exportFileTimeout',
        '6000',
        '-exportTimeout',
        '60000',
        '-export',
        'script',
        `${swfExtractionPath}`,
        `${apkExtractionPath}/assets/worldflipper_android_release.swf`,
      ],
      {
        ...((this.swfMode === 'simple' && { wait: 'boot_ffc6' }) || {
          logFn: (chunk, resolver) => {
            const data = chunk.toString();

            console.log(data);

            if (!logStarted) {
              logger.data({
                type: 'progressStart',
                data: {
                  id: 'Preparing swf decompile...',
                  max: 1,
                },
              });

              logStarted = true;
              return;
            }
            const [progress, max] = (
              data.match(/[0-9]*\/[0-9]*/)?.[0]?.split('/') || []
            ).map(parseFloat);

            if (progress && max && progress === max) {
              resolver();
            }

            if (!progress || !max) return;

            if (exportStarted && progress > maxProgress) {
              maxProgress = progress;
              logger.data({
                type: 'progress',
                data: {
                  id: 'Exporting ActionScripts...',
                  progress,
                },
              });
            } else if (!exportStarted) {
              logger.data({
                type: 'progressEnd',
                data: {
                  id: 'Preparing swf decompile...',
                },
              });
              logger.data({
                type: 'progressStart',
                data: {
                  id: 'Exporting ActionScripts...',
                  max,
                },
              });
              exportStarted = true;
            }
          },
        }),
      }
    );

    await awaiter;

    if (this.swfMode === 'full') {
      logger.data({
        type: 'progressEnd',
        data: {
          id: 'Exporting ActionScripts...',
        },
      });
    } else {
      logger.log('scripts exported. terminating extraction process...');
    }

    try {
      await fkill(swfExtractionProcess.pid, { force: true });
    } catch (err) {
      console.log(err);
    }

    await this.checkBootFfc6();

    this.markMetaData({
      lastSwfChecksum: swfCheckSum,
      lastSwfMode: this.swfMode,
    });

    logger.log('SWF Extraction successful.');
  };

  extractMasterTable = async () => {
    logger.log('Start extracting orderedMaps...');

    const { filePaths } = await this.fileReader.readBootFcAndGenerateOutput({
      rootDir: this.ROOT_PATH,
    });

    this.filePaths = [
      ...new Set([...filePaths, ...(await this.loadDefaultFilePaths())]),
    ];

    logger.log('Successfully extracted orderedMaps.');
  };

  loadDefaultFilePaths = async () =>
    JSON.parse((await readFile(getAssetPath('/filePaths.lock'))).toString());

  loadFilePaths = async () => {
    console.log('Loading file paths...');
    try {
      if (this.filePaths) {
        this.filePaths = [
          ...new Set([
            ...this.filePaths,
            ...(await this.loadDefaultFilePaths()),
          ]),
        ];
        return;
      }
      const loadedFilePaths = JSON.parse(
        (await readFile(`${this.ROOT_PATH}/filePaths.lock`)).toString()
      );
      this.filePaths = [
        ...new Set([
          ...loadedFilePaths,
          ...(await this.loadDefaultFilePaths()),
        ]),
      ];
    } catch (err) {
      this.filePaths = await this.loadDefaultFilePaths();
      console.log(err);
    }
  };

  loadDefaultAsFilePaths = async () =>
    JSON.parse((await readFile(getAssetPath('/asFilePaths.lock'))).toString());

  loadAsFilePaths = async () => {
    if (this.asFilePaths) {
      return;
    }

    try {
      const loadedAsFilePaths = JSON.parse(
        (await readFile(`${this.ROOT_PATH}/asFilePaths.lock`)).toString()
      );
      this.asFilePaths = [
        ...new Set([
          ...(loadedAsFilePaths || []),
          ...(await this.loadDefaultAsFilePaths()),
        ]),
      ];
    } catch (err) {
      console.log(err);
    }

    if (!this.asFilePaths?.length) {
      this.asFilePaths = await this.loadDefaultAsFilePaths();
    }
  };

  characterListCache = null;

  readCharacterTextFile = async () => {
    const characterData = JSON.parse(
      (
        await asyncReadFile(
          `${this.ROOT_PATH}/output/orderedmap/character/character_text.json`
        )
      ).toString()
    );

    return characterData;
  };

  getCharacterList = async ({ raw }: { raw: boolean } = {}) => {
    try {
      if (this.characterListCache && !raw) return this.characterListCache;

      const characterData = JSON.parse(
        (
          await asyncReadFile(
            `${this.ROOT_PATH}/output/orderedmap/character/character.json`
          )
        ).toString()
      );

      if (raw) {
        return characterData;
      }

      let characters = Object.values(characterData).map(([name]) => name);

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
    } catch (err) {
      return [];
    }
  };

  extractCharacter = async (character) => {
    const characterImageDigests = CHARACTER_SPRITE_PRESETS.map((preset) =>
      new Array(3).fill().map((_, idx) => preset(character, idx))
    )
      .reduce((acc, array) => [...acc, ...array], [])
      .map((file) => [`${file}.png`, digestWfFileName(`${file}.png`)]);

    const characterImagePaths = [];

    const digestTracker = logger.progressStart({
      id: 'Generating digests for possible assets...',
      max: characterImageDigests.length,
    });
    for (const [fileName, digest] of characterImageDigests) {
      digestTracker.progress();
      const filePath = await this.fileReader.checkDigestPath(digest);
        if (!filePath) continue; // eslint-disable-line
      characterImagePaths.push([fileName, filePath]);
    }
    digestTracker.end();

    const imageTracker = logger.progressStart({
      id: 'Exporting character image assets...',
      max: characterImagePaths.length,
    });
    for (const [fileName, filePath] of characterImagePaths) {
      imageTracker.progress();
      await this.fileReader.readPngAndGenerateOutput(filePath, fileName);
    }
    imageTracker.end();

    logger.log('Successfully extracted character image assets.');
  };

  extractCharacterImageAssets = async () => {
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

    const digestTracker = logger.progressStart({
      id: 'Generating digests for possible assets...',
      max: characterImageDigests.length,
    });
    for (const [fileName, digest] of characterImageDigests) {
      digestTracker.progress();
      const filePath = await this.fileReader.checkDigestPath(digest);
        if (!filePath) continue; // eslint-disable-line
      characterImagePaths.push([fileName, filePath]);
    }
    digestTracker.end();

    const imageTracker = logger.progressStart({
      id: 'Exporting character image assets...',
      max: characterImagePaths.length,
    });
    for (const [fileName, filePath] of characterImagePaths) {
      imageTracker.progress();
      await this.fileReader.readPngAndGenerateOutput(filePath, fileName);
    }
    imageTracker.end();
    logger.log('Exporting sprite atlases & frames...');

    logger.log('Successfully extracted character image assets.');
  };

  extractCharacterVoiceAssets = async () => {
    try {
      const characterMap = await this.getCharacterList({ raw: true });
      const characterSpeeches = JSON.parse(
        (
          await asyncReadFile(
            `${this.ROOT_PATH}/output/orderedmap/character/character_speech.json`
          )
        ).toString()
      );

      const speechEntries = Object.entries(characterSpeeches);

      logger.log('Start extracting character voice assets.');
      const tracker = logger.progressStart({
        id: 'Extracting character voice assets...',
        max: speechEntries.length,
      });

      for (const [characterId, speechesRaw] of speechEntries) {
        tracker.progress();
        const characterData = characterMap[characterId];
        const speeches = speechesRaw.slice(3);
        if (!characterData || !speeches?.forEach) continue;

        const [name] = characterData;

        const voiceAssetPaths = CHARACTER_VOICE_PRESETS.map((preset) =>
          preset(name)
        );
        const voiceLineTexts = {};
        speeches.forEach((speech, idx) => {
          if (POSSIBLE_PATH_REGEX.test(speech)) {
            speech.split('\\n').forEach((speechPath) => {
              if (speechPath.includes('/')) {
                voiceAssetPaths.push(
                  `character/${name}/voice/${speechPath}.mp3`
                );
              }
            });
          } else if (speech.length > 5) {
            const voiceTitle = speeches[idx + 1]?.split('\\n')?.[0];
            if (voiceTitle) {
              voiceLineTexts[voiceTitle] = speech;
            }
          }
        });

        const dedupedVoiceAssetPaths = [...new Set(voiceAssetPaths)];

        const pathDigests = (
          await Promise.all(
            dedupedVoiceAssetPaths.map(async (voicePath) => {
              const digest = digestWfFileName(voicePath);
              const digestPath = await this.fileReader.checkDigestPath(digest);

              if (!digestPath) return null;

              return [voicePath, digestPath];
            })
          )
        ).filter((v) => v);

        if (pathDigests.length) {
          await this.fileReader.writeWfAsset(
            `character/${name}/voice/voiceLines.json`,
            JSON.stringify(voiceLineTexts, null, 4)
          );
        }

        for (const [fileName, filePath] of pathDigests) {
          await this.fileReader.readMp3AndGenerateOutput(filePath, fileName);
        }
      }

      tracker.end();
      logger.log('Extracted character voice assets.');
    } catch (err) {
      return null;
    }
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

  processSpritesByAtlases = async (
    spritePath,
    {
      animate,
      sheetName = 'sprite_sheet',
      timelineRoot,
      extractAll,
      scale,
      cropProps = {},
    } = {}
  ) => {
    try {
      const timelineName = timelineRoot || 'pixelart';

      const spriteImage = await asyncReadFile(`${spritePath}/${sheetName}.png`);
      const spriteAtlases = JSON.parse(
        (
          await asyncReadFile(`${spritePath}/${sheetName}.atlas.json`)
        ).toString()
      );
      const images = await this.fileReader.cropSpritesFromAtlas({
        sprite: spriteImage,
        atlases: spriteAtlases,
        destPath: `${spritePath}/${sheetName}`,
        extractAll,
        scale,
        ...cropProps,
      });

      if (!images) return;

      if (animate) {
        let timeline;

        try {
          timeline = JSON.parse(
            (
              await asyncReadFile(`${spritePath}/${timelineName}.timeline.json`)
            ).toString()
          );
        } catch (err) {
          console.log(err, `${spritePath}/${timelineName}.timeline.json`);
          return;
        }
        await asyncMkdir(`${spritePath}/animated`, { recursive: true });

        const indexMode = images[0].frameId.replace(/[^0-9]/g, '').length
          ? 'saveName'
          : 'arrayIndex';
        let maxSequenceIndex;
        if (indexMode === 'arrayIndex') {
          maxSequenceIndex = Math.max(
            ...timeline.sequences.map((sequence) => parseInt(sequence.end, 10))
          );
        }

        for (const sequence of timeline.sequences) {
          await this.fileReader.createGifFromSequence({
            images,
            sequence,
            destPath: `${spritePath}/animated`,
            delay: 100,
            indexMode,
            maxIndex: maxSequenceIndex,
          });
        }
      }
    } catch (err) {
      console.log(err);
    }
  };

  animateCharacterSprite = async (character, { ignoreCache = false } = {}) => {
    if (
      !this.metadata.spriteProcessedLock?.includes(character) ||
      ignoreCache
    ) {
      await this.processSpritesByAtlases(
        `${this.ROOT_PATH}/output/assets/character/${character}/pixelart`,
        { animate: true, extractAll: this.options.extractAllFrames }
      );
      await this.markMetaData({
        spriteProcessedLock: [
          ...(this.metadata.spriteProcessedLock || []),
          character,
        ],
      });
    }

    if (
      !this.metadata.specialSpriteProcessedLock?.includes(character) ||
      ignoreCache
    ) {
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
      await asyncMkdir(
        `${this.ROOT_PATH}/output/assets/character/${character}/pixelart/animated`,
        { recursive: true }
      );
      await this.fileReader.cropSpritesFromAtlas({
        sprite: specialImage,
        atlases: specialAtlases,
        destPath: `${this.ROOT_PATH}/output/assets/character/${character}/pixelart/special_sprite_sheet`,
        generateGif: `${this.ROOT_PATH}/output/assets/character/${character}/pixelart/animated/special.gif`,
      });
      await this.markMetaData({
        specialSpriteProcessedLock: [
          ...(this.metadata.specialSpriteProcessedLock || []),
          character,
        ],
      });
    }
  };

  generateAnimatedSprites = async () => {
    logger.log('Cropping character sprites & generating animated GIFs...');
    const characters = await this.getCharacterList();

    const tracker = logger.progressStart({
      id: 'Processing Character Sprites...',
      max: characters.length,
    });

    for (const character of characters) {
      try {
        await this.animateCharacterSprite(character);
      } catch (err) {
        continue;
      } finally {
        tracker.progress();
      }
    }

    tracker.end();
    logger.log('Successfully cropped and saved all character sprites.');
  };

  buildAsFilePaths = async () => {
    try {
      const foundAsFiles = [];
      const recurseFind = async (parentPath) => {
        const children = await readdir(parentPath, { withFileTypes: true });

        for (const child of children) {
          const childPath = `${parentPath}/${child.name}`;

          if (/\.as/.test(child.name)) {
            foundAsFiles.push(childPath);
          } else if (child.isDirectory()) {
            await recurseFind(childPath);
          }
        }
      };
      logger.log('Searching for script files...');
      await recurseFind(`${this.ROOT_PATH}/swf/scripts`);
      logger.log(`${foundAsFiles.length} scripts found.`);

      const asFilePaths = await this.fileReader.getAssetsFromAsFiles(
        foundAsFiles
      );

      this.asFilePaths = [
        new Set([
          ...(asFilePaths || []),
          ...(await this.loadDefaultAsFilePaths()),
        ]),
      ];

      await writeFile(
        `${this.ROOT_PATH}/asFilePaths.lock`,
        JSON.stringify(this.asFilePaths)
      );
    } catch (err) {
      console.log(err);
      logger.log('Failed to search script files.');

      this.asFilePaths = await this.loadDefaultAsFilePaths();
    }
  };

  digestAndCheckFilePath = async (filePath) => {
    const digest = await digestWfFileName(filePath);
    const digestPath = await this.fileReader.checkDigestPath(digest);

    if (digestPath) {
      this.confirmedDigests[digest] = filePath;
      return [filePath, digestPath];
    }

    return null;
  };

  generateNormalPath = (filePath) => {
    const splittedPath = filePath.split('/');
    splittedPath.pop();
    const lastParent = splittedPath.pop();
    splittedPath.push(lastParent);
    splittedPath.push(lastParent);
    return splittedPath.join('/');
  };

  loadPossibleAssets = async (paths) => {
    if (this.possibleAssetCache && !paths) return this.possibleAssetCache;

    const possibleImageAssets = [];
    const possibleAudioAssets = [];
    const possibleImageAmfAssets = [];
    const possibleGeneralAmfAssets = [];
    const possibleEsdlAssets = [];

    const sprites = {};
    const fileNameMap = {};

    if (!paths) {
      this.developWriteJson('workFilePath.json', this.filePaths);
      this.developWriteJson('workAsFilePath.json', this.asFilePaths);
    }

    for (const filePath of paths ||
      [...new Set([...(this.asFilePaths || []), ...this.filePaths])].filter(
        (value) => !!value
      )) {
      pushExist(
        possibleImageAssets,
        await this.digestAndCheckFilePath(`${filePath}.png`)
      );
      pushExist(
        possibleImageAssets,
        await this.digestAndCheckFilePath(
          `${filePath.replace(/\/[A-z0-9_]*$/, '/sprite_sheet')}.png`
        )
      );
      pushExist(
        possibleGeneralAmfAssets,
        await this.digestAndCheckFilePath(
          `${filePath}${ACTION_DSL_FORMAT_DEFLATE}`
        )
      );
      pushExist(
        possibleEsdlAssets,
        await this.digestAndCheckFilePath(
          `${filePath}${ENEMY_DSL_FORMAT_DEFLATE}`
        )
      );
      const normalPath = this.generateNormalPath(filePath);
      pushExist(
        possibleImageAssets,
        await this.digestAndCheckFilePath(`${normalPath}.png`)
      );
      pushExist(
        possibleAudioAssets,
        await this.digestAndCheckFilePath(`${filePath}.mp3`)
      );
      pushExist(
        possibleGeneralAmfAssets,
        await this.digestAndCheckFilePath(`${filePath}.atf.deflate`)
      );
      pushExist(
        possibleGeneralAmfAssets,
        await this.digestAndCheckFilePath(`${filePath}.frame.amf3.deflate`)
      );
      pushExist(
        possibleGeneralAmfAssets,
        await this.digestAndCheckFilePath(`${filePath}.parts.amf3.deflate`)
      );
      pushExist(
        possibleGeneralAmfAssets,
        await this.digestAndCheckFilePath(`${filePath}.timeline.amf3.deflate`)
      );
      pushExist(
        possibleGeneralAmfAssets,
        await this.digestAndCheckFilePath(
          `${filePath.replace(/\/[A-z0-9_]*$/, '/sprite_sheet')}.atf.deflate`
        )
      );
    }

    if (!paths) {
      await this.developWriteJson('image_assets.json', possibleImageAssets);
    }

    const amf3Tracker = logger.progressStart({
      id: 'Searching for possible amf3 assets...',
      max: possibleImageAssets.length,
    });
    for (const [imagePath] of possibleImageAssets) {
      amf3Tracker.progress();
      const fileName = imagePath.split('/').pop();
      const fileNameRoot = fileName.replace('.png', '');
      const parentPath = `${this.ROOT_PATH}/output/assets/${imagePath.replace(
        `/${fileName}`,
        ''
      )}`;
      fileNameMap[parentPath] = fileNameRoot;
      const atlasEntry = await this.digestAndCheckFilePath(
        imagePath.replace(fileName, `${fileNameRoot}.atlas.amf3.deflate`)
      );
      const pixelartFrameEntry = await this.digestAndCheckFilePath(
        imagePath.replace(fileName, 'pixelart.frame.amf3.deflate')
      );
      const pixelArtTimelineEntry = await this.digestAndCheckFilePath(
        imagePath.replace(fileName, 'pixelart.timeline.amf3.deflate')
      );
      const frameEntry = await this.digestAndCheckFilePath(
        imagePath.replace(fileName, `${fileNameRoot}.frame.amf3.deflate`)
      );
      const timelineEntry = await this.digestAndCheckFilePath(
        imagePath.replace(fileName, `${fileNameRoot}.timeline.amf3.deflate`)
      );
      const partsEntry = await this.digestAndCheckFilePath(
        imagePath.replace(fileName, `${fileNameRoot}.parts.amf3.deflate`)
      );
      const atfEntry = await this.digestAndCheckFilePath(
        imagePath.replace(fileName, `${fileNameRoot}.atf.deflate`)
      );

      pushExist(possibleImageAmfAssets, partsEntry);
      pushExist(possibleImageAmfAssets, frameEntry);
      pushExist(possibleImageAmfAssets, pixelartFrameEntry);
      pushExist(possibleImageAmfAssets, atfEntry);

      if (atlasEntry) {
        sprites[parentPath] = 'sprite';
        possibleImageAmfAssets.push(atlasEntry);
      }
      if (timelineEntry) {
        sprites[parentPath] = 'animated';
        possibleImageAmfAssets.push(timelineEntry);
      }
      if (pixelArtTimelineEntry) {
        sprites[parentPath] = 'animated_2';
        possibleImageAmfAssets.push(pixelArtTimelineEntry);
      }
      if (this.__debug) {
        const debugEntry = await this.digestAndCheckFilePath(
          imagePath.replace(
            fileName,
            `${this.__debug.replace(/\$rootname/, fileNameRoot)}`
          )
        );
        pushExist(possibleImageAmfAssets, debugEntry);
      }
    }
    amf3Tracker.end();

    if (paths) {
      return {
        possibleImageAssets,
        possibleAudioAssets,
        possibleImageAmfAssets,
        possibleGeneralAmfAssets,
        possibleEsdlAssets,
        sprites,
        fileNameMap,
      };
    }

    this.possibleAssetCache = {
      possibleImageAssets,
      possibleAudioAssets,
      possibleImageAmfAssets,
      possibleGeneralAmfAssets,
      possibleEsdlAssets,
      sprites,
      fileNameMap,
    };
    return this.possibleAssetCache;
  };

  loadAndExtractPossibleAssets = async (
    paths?: string[],
    {
      exclude,
      preventDoneLog,
    }: {
      exclude: ['image', 'audio', 'general', 'esdl'];
      preventDoneLog: boolean;
    } = {
      exclude: [],
      preventDoneLog: false,
    }
  ) => {
    logger.preventDoneLog = preventDoneLog;

    const possibleAssets = await this.loadPossibleAssets(paths);

    if (!exclude.includes('image')) {
      await this.extractPossibleImageAssets({
        cropSprites: true,
        possibleAssets,
      });
    }
    if (!exclude.includes('audio')) {
      await this.extractPossibleAudioAssets(possibleAssets);
    }
    if (!exclude.includes('general')) {
      await this.extractPossibleGeneralAmf3Assets(possibleAssets);
    }
    if (!exclude.includes('esdl')) {
      await this.extractPossibleEnemyDslAssets(possibleAssets);
    }

    logger.preventDoneLog = false;

    return possibleAssets;
  };

  extractPossibleEnemyDslAssets = async (possibleAssets) => {
    const { possibleEsdlAssets } =
      possibleAssets || (await this.loadPossibleAssets());
    const esdlTracker = logger.progressStart({
      id: 'Extracting possible enemy dsl assets...',
      max: possibleEsdlAssets.length,
    });

    for (const [filePath, digest] of possibleEsdlAssets) {
      esdlTracker.progress();
      try {
        await this.extractEnemyDslAndRelatedAssets(filePath);
      } catch (err) {
        console.log(err);
      }
    }

    esdlTracker.end();
  };

  extractPossibleAudioAssets = async (possibleAssets) => {
    const { possibleAudioAssets } =
      possibleAssets || (await this.loadPossibleAssets());

    const audioTracker = logger.progressStart({
      id: 'Extracting audio assets...',
      max: possibleAudioAssets.length,
    });
    for (const [fileName, filePath] of possibleAudioAssets) {
      audioTracker.progress();
      try {
        await this.fileReader.readMp3AndGenerateOutput(filePath, fileName);
      } catch (err) {
        console.log(err);
      }
    }
    audioTracker.end();
  };

  extractPossibleGeneralAmf3Assets = async (possibleAssets) => {
    const { possibleGeneralAmfAssets } =
      possibleAssets || (await this.loadPossibleAssets());

    await this.developWriteJson('general_amf.json', possibleGeneralAmfAssets);

    const amfTracker = logger.progressStart({
      id: 'Extracting general amf3 assets...',
      max: possibleGeneralAmfAssets.length,
    });
    for (const [fileName, filePath] of possibleGeneralAmfAssets) {
      amfTracker.progress();
      await this.fileReader.readGeneralAndCreateOutput(filePath, fileName);
    }
    amfTracker.end();
  };

  extractPossibleImageAssets = async ({
    cropSprites,
    possibleAssets,
  }: { cropSprites: boolean; possibleAssets: any } = {}) => {
    const {
      possibleImageAssets,
      possibleImageAmfAssets,
      sprites,
      fileNameMap,
    } = possibleAssets || (await this.loadPossibleAssets());
    const imageTracker = logger.progressStart({
      id: 'Extracting general image assets...',
      max: possibleImageAssets.length,
    });
    for (const [fileName, filePath] of possibleImageAssets) {
      imageTracker.progress();
      await this.fileReader.readPngAndGenerateOutput(filePath, fileName);
    }
    imageTracker.end();

    const amfAssetTracker = logger.progressStart({
      id: 'Extracting deflated generals...',
      max: possibleImageAmfAssets.length,
    });
    for (const [fileName, filePath] of possibleImageAmfAssets) {
      amfAssetTracker.progress();
      await this.fileReader.readGeneralAndCreateOutput(filePath, fileName);
    }
    amfAssetTracker.end();

    let processedSprites = {};

    try {
      processedSprites = JSON.parse(
        (await readFile(`${this.ROOT_PATH}/sprites.lock`)).toString()
      );
    } catch (err) {
      console.log(err);
    }

    if (cropSprites) {
      const spriteEntries = Object.entries(sprites);
      const spriteTracker = logger.progressStart({
        id: 'Rendering sprites from atlases...',
        max: spriteEntries.length,
      });
      let count = 0;
      for (const [spritePath, type] of spriteEntries) {
        spriteTracker.progress();
        count += 1;
        if (processedSprites[spritePath] === type) continue;
        try {
          await this.processSpritesByAtlases(spritePath, {
            // animate: /animated/.test(type),
            sheetName: fileNameMap[spritePath],
            extractAll: this.options.extractAllFrames,
            // timelineRoot: type === 'animated_2' ? fileNameMap[spritePath] : '',
          });
          processedSprites[spritePath] = type;
        } catch (err) {
          console.log(err);
        }

        if (!(count % 10)) {
          await writeFile(
            `${this.ROOT_PATH}/sprites.lock`,
            JSON.stringify(processedSprites, null, 2)
          );
        }
      }
      await writeFile(
        `${this.ROOT_PATH}/sprites.lock`,
        JSON.stringify(processedSprites, null, 2)
      );

      spriteTracker.end();
    }
  };

  extractSkillEffects = async () => {
    try {
      let battleEffectPaths = [];

      for (let i = 1; i <= 5; i += 1) {
        const rarityPath = `${this.ROOT_PATH}/output/assets/battle/action/skill/action/rare${i}`;

        try {
          await access(rarityPath);
        } catch (err) {
          continue;
        }

        const actionDescriptors = await readdir(rarityPath);

        for (const actionDescriptor of actionDescriptors) {
          const descContent = await readFile(
            `${rarityPath}/${actionDescriptor}`
          );

          battleEffectPaths.push(
            ...Array.from(
              descContent.toString('utf-8').matchAll(POSSIBLE_PATH_REGEX)
            ).map(([match]) => match)
          );
        }
      }

      battleEffectPaths = Array.from(
        new Set([
          ...battleEffectPaths,
          ...battleEffectPaths.map(this.generateNormalPath),
        ])
      );

      const foundEffectAssets = [];
      const foundEffectAmf3Assets = [];
      const sprites = {};

      for (const effectPath of battleEffectPaths) {
        const normalPath = this.generateNormalPath(effectPath);
        let refinedEffectPath = effectPath;
        let refinedNormalPath = normalPath;

        if (/^character/.test(effectPath)) {
          refinedEffectPath = [
            ...effectPath.split('/').slice(0, -1),
            'sprite_sheet',
          ].join('/');
          refinedNormalPath = [
            ...normalPath.split('/').slice(0, -1),
            'sprite_sheet',
          ].join('/');
        }

        pushExist(
          foundEffectAssets,
          await this.digestAndCheckFilePath(`${refinedEffectPath}.png`)
        );
        pushExist(
          foundEffectAmf3Assets,
          await this.digestAndCheckFilePath(`${effectPath}.frame.amf3.deflate`)
        );
        pushExist(
          foundEffectAmf3Assets,
          await this.digestAndCheckFilePath(`${effectPath}.parts.amf3.deflate`)
        );
        if (
          pushExist(
            foundEffectAmf3Assets,
            await this.digestAndCheckFilePath(
              `${refinedEffectPath}.atlas.amf3.deflate`
            )
          )
        ) {
          if (!sprites[refinedNormalPath]) {
            sprites[refinedNormalPath] = {
              type: 'sprite',
              timelines: [],
            };
          }
          sprites[
            refinedNormalPath
          ].atlas = `${refinedEffectPath}.atlas.amf3.json`;
        }
        if (
          pushExist(
            foundEffectAmf3Assets,
            await this.digestAndCheckFilePath(
              `${effectPath}.timeline.amf3.deflate`
            )
          )
        ) {
          if (!sprites[refinedNormalPath]) {
            sprites[refinedNormalPath] = {
              type: 'animated',
              timelines: [],
            };
          }
          sprites[refinedNormalPath].type = 'animated';
          sprites[refinedNormalPath].timelines.push(
            `${effectPath}.timeline.amf3.json`
          );
        }
      }

      const effectTracker = logger.progressStart({
        id: 'Exporting effect images...',
        max: foundEffectAssets.length,
      });
      for (const [fileName, filePath] of foundEffectAssets) {
        effectTracker.progress();
        await this.fileReader.readPngAndGenerateOutput(filePath, fileName);
      }
      effectTracker.end();
      const amfTracker = logger.progressStart({
        id: 'Exporting effect atlases...',
        max: foundEffectAmf3Assets.length,
      });
      for (const [fileName, filePath] of foundEffectAmf3Assets) {
        amfTracker.progress();
        await this.fileReader.readGeneralAndCreateOutput(filePath, fileName);
      }
      amfTracker.end();

      await this.developWriteJson('effect_sprites.json', sprites);

      const spriteEntries = Object.entries(sprites);

      const spriteTracker = logger.progressStart({
        id: 'Rendering skill effect sprites...',
        max: spriteEntries.length,
      });

      for (const [rootPath, { type, timelines, atlas }] of spriteEntries) {
        spriteTracker.progress();
        const splittedRootPath = rootPath.split('/');
        const sheetName = splittedRootPath.pop();
        await this.processSpritesByAtlases(
          `${this.ROOT_PATH}/output/assets/${splittedRootPath.join('/')}`,
          {
            sheetName,
            extractAll: true,
          }
        );
      }
      spriteTracker.end();
    } catch (err) {
      console.log(err);
      logger.log('Failed to load battle effect paths.');
    }
  };

  developWriteJson = async (fileName, content) => {
    if (IS_DEVELOPMENT) {
      await writeFile(
        `${this.ROOT_PATH}/dev_${fileName}`,
        JSON.stringify(content, null, 2)
      );
    }
  };

  extractGachaOdds = async () => {
    try {
      const gachaFile = JSON.parse(
        await readFile(`${this.ROOT_PATH}/output/orderedmap/gacha/gacha.json`)
      );

      const gachaTracker = logger.progressStart({
        id: 'Exporting gacha odds table...',
        max: Object.values(gachaFile).length,
      });

      const characterTextMap = await this.readCharacterTextFile();

      await mkdir(`${this.ROOT_PATH}/output/orderedmap/gacha_odds/summaries`, {
        recursive: true,
      });

      const equipmentTextMap = JSON.parse(
        (
          await asyncReadFile(
            `${this.ROOT_PATH}/output/orderedmap/item/equipment.json`
          )
        ).toString()
      );

      for (const [
        id,
        name,
        ,
        banner,
        ,
        ,
        ,
        ,
        ,
        ,
        ,
        ,
        ,
        equipmentFlag,
        rarity3Path,
        rarity4Path,
        rarity5Path,
        ,
        ,
        ,
        ,
        ,
        equipmentRarity3Path,
        equipmentRarity4Path,
        equipmentRarity5Path,
      ] of Object.values(gachaFile)) {
        gachaTracker.progress();
        const isEquipment = equipmentFlag === '1';
        const oddFilePaths = [];

        if (isEquipment) {
          oddFilePaths.push(
            `master/gacha_odds/${equipmentRarity3Path}.orderedmap`,
            `master/gacha_odds/${equipmentRarity4Path}.orderedmap`,
            `master/gacha_odds/${equipmentRarity5Path}.orderedmap`
          );
        } else {
          oddFilePaths.push(
            `master/gacha_odds/${rarity3Path}.orderedmap`,
            `master/gacha_odds/${rarity4Path}.orderedmap`,
            `master/gacha_odds/${rarity5Path}.orderedmap`
          );
        }

        const gachaOddsMap = {
          name,
          banner,
        };

        for (const filePath of oddFilePaths) {
          const found = await this.digestAndCheckFilePath(filePath);
          if (found) {
            const gachaOddsData =
              await this.fileReader.readMasterTableAndGenerateOutput(
                found[1],
                found[0]
              );

            const oddsList = Object.values(Object.values(gachaOddsData)[0]);

            const oddsInBetterFormat = oddsList.map(
              ([characterId, rank, odd, isPickup]) => {
                const characterName = isEquipment
                  ? equipmentTextMap[characterId][0]
                  : characterTextMap[characterId][0];

                return {
                  name: characterName,
                  rank: parseInt(rank, 10),
                  odd: parseInt(odd, 10),
                  isPickup: isPickup === 'true',
                };
              }
            );

            const totalOdds = oddsInBetterFormat.reduce(
              (acc, cur) => acc + cur.odd,
              0
            );
            gachaOddsMap[`rarity${oddsInBetterFormat[0].rank}`] =
              oddsInBetterFormat.map((odd) => ({
                ...odd,
                localRate: parseFloat(
                  (Math.floor((odd.odd / totalOdds) * 100000) / 1000).toFixed(3)
                ),
                rate: parseFloat(
                  (
                    Math.floor(
                      (odd.odd / totalOdds) * BASE_ODD_MAP[odd.rank] * 100000
                    ) / 1000
                  ).toFixed(3)
                ),
              }));
          }
        }

        await writeFile(
          `${this.ROOT_PATH}/output/orderedmap/gacha_odds/summaries/${id}_${name}.json`,
          JSON.stringify(gachaOddsMap, null, 2)
        );
      }

      gachaTracker.end();
    } catch (err) {
      console.log(err);
      logger.log('FATAL: Failed to extract gacha info.');
      logger.progressAbort('Exporting gacha odds table...');
    }
  };

  extractEXBoostMasterTable = async () => {
    try {
      const exBoosts = Object.values(
        JSON.parse(
          await readFile(
            `${this.ROOT_PATH}/output/orderedmap/ex_boost/ex_boost.json`
          )
        )
      );

      const exBoostTracker = await logger.progressStart({
        id: 'Extracting ex boost odds table...',
        max: exBoosts.length,
      });

      for (const exBoost of exBoosts) {
        exBoostTracker.progress();
        const exBoostMasterPath = `master/ex_boost/odds/lots_combination/${exBoost[1]}.orderedmap`;

        const found = await this.digestAndCheckFilePath(exBoostMasterPath);
        await this.fileReader.readMasterTableAndGenerateOutput(
          found[1],
          found[0]
        );

        await this.fileReader.readMasterTableAndGenerateOutput(
          ...(
            await this.digestAndCheckFilePath(
              `master/ex_boost/odds/ability/${exBoost[1]}_a.orderedmap`
            )
          ).reverse()
        );
        await this.fileReader.readMasterTableAndGenerateOutput(
          ...(
            await this.digestAndCheckFilePath(
              `master/ex_boost/odds/ability/${exBoost[1]}_b.orderedmap`
            )
          ).reverse()
        );
        await this.fileReader.readMasterTableAndGenerateOutput(
          ...(
            await this.digestAndCheckFilePath(
              `master/ex_boost/odds/status/${exBoost[1]}.orderedmap`
            )
          ).reverse()
        );
      }

      exBoostTracker.end();
    } catch (err) {
      logger.log(err);
      logger.log('Skipping EX Boost odds extraction');
    }
  };

  constructReadableExBoostOddsTable = async () => {
    const abilities = JSON.parse(
      await readFile(
        `${this.ROOT_PATH}/output/orderedmap/ex_boost/ex_ability.json`
      )
    );
    const statuses = JSON.parse(
      await readFile(
        `${this.ROOT_PATH}/output/orderedmap/ex_boost/ex_status.json`
      )
    );
    const exBoosts = Array.from(
      new Set(
        Object.values(
          JSON.parse(
            await readFile(
              `${this.ROOT_PATH}/output/orderedmap/ex_boost/ex_boost.json`
            )
          )
        ).map(([, boostId]) => boostId)
      )
    );

    const boostOddsMap = {};

    for (const boostId of exBoosts) {
      const lotsCombination = JSON.parse(
        await readFile(
          `${this.ROOT_PATH}/output/orderedmap/ex_boost/odds/lots_combination/${boostId}.json`
        )
      );
      const statusPool = JSON.parse(
        await readFile(
          `${this.ROOT_PATH}/output/orderedmap/ex_boost/odds/status/${boostId}.json`
        )
      );
      const abilityPoolA = JSON.parse(
        await readFile(
          `${this.ROOT_PATH}/output/orderedmap/ex_boost/odds/ability/${boostId}_a.json`
        )
      );
      const abilityPoolB = JSON.parse(
        await readFile(
          `${this.ROOT_PATH}/output/orderedmap/ex_boost/odds/ability/${boostId}_b.json`
        )
      );

      boostOddsMap[boostId] = {
        combinations: {
          totalWeight: 0,
        },
        status: {
          totalWeight: 0,
        },
        abilityA: {
          totalWeight: 0,
        },
        abilityB: {
          totalWeight: 0,
        },
      };

      Object.values(lotsCombination[`${boostId}`])
        .map(([weight, , status, abi1Flag, ability1, abi2Flag, ability2]) => {
          boostOddsMap[boostId].combinations.totalWeight += parseFloat(weight);

          return {
            weight: parseFloat(weight),
            status,
            abilityA: /_a$/.test(ability1) || /_a$/.test(ability2),
            abilityB: /_b$/.test(ability1) || /_b$/.test(ability2),
          };
        })
        .forEach(({ weight, status, abilityA, abilityB }) => {
          const combinationKey = `status${(abilityA && '_a') || ''}${
            (abilityB && '_b') || ''
          }`;
          if (!boostOddsMap[boostId].combinations[combinationKey]) {
            boostOddsMap[boostId].combinations[combinationKey] = {
              weight: 0,
              rate: 0,
            };
          }

          boostOddsMap[boostId].combinations[combinationKey].weight += weight;
          boostOddsMap[boostId].combinations[combinationKey].rate += parseFloat(
            (
              (weight / boostOddsMap[boostId].combinations.totalWeight) *
              100
            ).toFixed(3)
          );
        });

      Object.values(statusPool[boostId])
        .map(([statusId, weight]) => {
          boostOddsMap[boostId].status.totalWeight += parseFloat(weight);
          return {
            weight: parseFloat(weight),
            statusId,
          };
        })
        .forEach(({ weight, statusId }) => {
          const statusName = statuses[statusId][0];
          const hp = statuses[statusId][1];
          const atk = statuses[statusId][2];

          boostOddsMap[boostId].status[statusName] = {
            weight,
            rate: parseFloat(
              (
                (weight / boostOddsMap[boostId].status.totalWeight) *
                100
              ).toFixed(3)
            ),
            hp,
            atk,
          };
        });

      Object.values(abilityPoolA[`${boostId}_a`])
        .map(([abilityId, weight]) => {
          boostOddsMap[boostId].abilityA.totalWeight += parseFloat(weight);
          return {
            weight: parseFloat(weight),
            abilityId,
          };
        })
        .forEach(({ weight, abilityId }) => {
          const abilityAName = abilities[abilityId][0];
          const abilityAPower = parseFloat(abilities[abilityId][46]) / 1000;

          boostOddsMap[boostId].abilityA[abilityAName] = {
            weight,
            rate: parseFloat(
              (
                (weight / boostOddsMap[boostId].abilityA.totalWeight) *
                100
              ).toFixed(3)
            ),
            power: abilityAPower,
          };
        });

      Object.values(abilityPoolB[`${boostId}_b`])
        .map(([abilityId, weight]) => {
          boostOddsMap[boostId].abilityB.totalWeight += parseFloat(weight);
          return {
            weight: parseFloat(weight),
            abilityId,
          };
        })
        .forEach(({ weight, abilityId }) => {
          const abilityBName = abilities[abilityId][0];
          const abilityBPower = parseFloat(abilities[abilityId][46]) / 1000;

          boostOddsMap[boostId].abilityB[abilityBName] = {
            weight,
            rate: parseFloat(
              (
                (weight / boostOddsMap[boostId].abilityB.totalWeight) *
                100
              ).toFixed(3)
            ),
            power: abilityBPower,
          };
        });
    }

    await writeFile(
      `${this.ROOT_PATH}/output/orderedmap/ex_boost/odds_summary.json`,
      JSON.stringify(boostOddsMap, null, 4)
    );
  };

  fetchAssetsFromApi = async (
    baseVersion,
    { cdn = API_PATHS.cdn[this.regionVariant], ignoreFull } = {}
  ) => {
    try {
      const fileListTracker = logger.progressStart({
        id: 'Fetching asset file list from server...',
        max: 1,
      });

      const requestHeaders = {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/103.0.0.0 Safari/537.36',
        Accept: 'gzip, deflate, br',
        RES_VER: baseVersion || `1.532.1`,
        ...(this.regionVariant !== 'jp' && {
          DEVICE_LANG: (this.regionVariant === 'en' && 'en') || 'ko',
        }),
      };

      let fileListRes;
      try {
        fileListRes = await fetch(API_PATHS.asset[this.regionVariant], {
          method: 'get',
          headers: requestHeaders,
        });
      } catch (err) {
        console.log(err);
        fileListTracker.end();

        logger.log(`Failed to fetch asset list: ${err.message}`);
        return null;
      }
      fileListTracker.end();

      if (fileListRes.status !== 200) {
        logger.log(
          `API Request failed: ${fileListRes.status} ${fileListRes.statusText}`
        );
        logger.log(
          `The error maybe originated from the server blocking your api access due to access region (KR/CN ip is blocked from jp)`
        );
        return null;
      }

      const bodyString = (await fileListRes.buffer()).toString();
      const base64Decoded = Buffer.from(bodyString, 'base64');
      const decodedMsgPack = await msgpack.decode(base64Decoded);

      if (IS_DEVELOPMENT) {
        await fs.promises.writeFile(
          `${this.ROOT_PATH}/api_res_${new Date().getTime()}.json`,
          JSON.stringify(decodedMsgPack)
        );
      }

      if (!decodedMsgPack.data?.info) {
        logger.log('No updates / assets to download.');
        return null;
      }

      const {
        data: {
          full: fullList,
          diff: diffList,
          info: {
            client_asset_version: clientVersion,
            eventual_target_asset_version: latestVersion,
            latest_maj_first_version: majVersion,
          },
        },
        data_headers: dataHeaders,
      } = decodedMsgPack;

      const diffAssetList = diffList.reduce(
        (acc, diff) => [...acc, ...diff.archive],
        []
      );

      const fullAssetList = fullList?.archive || [];

      const targetAssetList = [];

      if (!ignoreFull) {
        targetAssetList.push(...fullAssetList);
      }
      targetAssetList.push(...diffAssetList);

      const totalSize = Math.round(
        targetAssetList.reduce((acc, asset) => acc + asset.size, 0) / 1024
      );

      const assetTracker = logger.progressStart({
        id: 'Downloading assets...',
        max: totalSize,
      });

      let extractionIndex = 0;

      await Promise.all(
        withAsyncBandwidth(targetAssetList, async (asset, currentIndex) => {
          const { location, size } = asset;
          let refinedLocation = location;

          if (this.region === 'gl') {
            refinedLocation = location.replace('{$cdnAddress}', cdn);
          }
          try {
            const downloadedZip = await (await fetch(refinedLocation)).buffer();

            while (extractionIndex !== currentIndex) {
              await sleep(50);
            }
            new AdmZip(downloadedZip).extractAllTo(
              `${this.ROOT_PATH}/dump`,
              true
            );
          } catch (err) {
            console.log(err);
          } finally {
            extractionIndex += 1;
          }

          assetTracker.progress(Math.round(size / 1024));
        })
      );

      assetTracker.end();

      const foundUploads = await asyncReadDir(
        `${this.ROOT_PATH}/dump/production`
      );

      let pathCounts = 0;
      for (const mergeablePath of foundUploads) {
        try {
          const foundSubPaths = await asyncReadDir(
            `${this.ROOT_PATH}/dump/production/${mergeablePath}`
          );

          for (const mergeableSubPath of foundSubPaths) {
            const foundAssets = await asyncReadDir(
              `${this.ROOT_PATH}/dump/production/${mergeablePath}/${mergeableSubPath}`
            );

            pathCounts += foundAssets.length;
          }
        } catch (err) {
          continue;
        }
      }

      const mergeTracker = logger.progressStart({
        id: 'Merging downloaded assets...',
        max: pathCounts,
      });

      for (const mergeablePath of foundUploads) {
        try {
          const foundSubPaths = await asyncReadDir(
            `${this.ROOT_PATH}/dump/production/${mergeablePath}`
          );

          for (const mergeableSubPath of foundSubPaths) {
            const foundAssets = await asyncReadDir(
              `${this.ROOT_PATH}/dump/production/${mergeablePath}/${mergeableSubPath}`
            );

            for (const foundAsset of foundAssets) {
              mergeTracker.progress();
              await asyncMkdir(
                `${this.ROOT_PATH}/dump/upload/${mergeableSubPath}/`,
                { recursive: true }
              );
              await asyncRename(
                `${this.ROOT_PATH}/dump/production/${mergeablePath}/${mergeableSubPath}/${foundAsset}`,
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
      try {
        await new Promise((resolve) =>
          rimraf(`${this.ROOT_PATH}/dump/production`, resolve)
        );
      } catch (err) {
        console.log(err);
      }

      mergeTracker.end();

      this.markMetaData(
        {
          [`${this.regionVariant}LatestApiAssetVersion`]: latestVersion,
          latestPullStamp: latestVersion,
          deltaAvailable: !!this.deltaMode,
        },
        { ignoreDeltaMode: true }
      );

      return true;
    } catch (err) {
      logger.log(`Failed to fetch: ${err.message}`);

      return null;
    }
  };

  saveConfirmedDigests = async (rootPath = this.ROOT_PATH) => {
    let loadedConfirmedDigests = {};

    try {
      loadedConfirmedDigests = this.loadConfirmedDigests(rootPath);
    } catch (err) {
      console.log(err);
    }

    await fs.promises.writeFile(
      `${rootPath}/confirmedDigests.lock`,
      JSON.stringify({ ...loadedConfirmedDigests, ...this.confirmedDigests })
    );
  };

  loadConfirmedDigests = async (rootPath = this.ROOT_PATH) => {
    const confirmedDigestString = readFileSync(
      `${rootPath}/confirmedDigests.lock`
    ).toString();
    return JSON.parse(confirmedDigestString);
  };

  //   fetch(
  //     'https://kr.wdfp.kakaogames.com/latest/api/index.php/comic/get_list',
  //     {
  //       method: 'post',
  //       headers: {
  //         'Content-Type': 'application/x-www-form-urlencoded',
  //         RES_VER: '2.0.51',
  //         APP_VER: '0.0.45',
  //         DEVICE_LANG: 'ko',
  //         PARAM: '7b382ac98c21bac8be9be9de25d8d9b2525984fd',
  //         UDID: 'BC51B46F-B7D5-49C3-A651-62D255A49C8471D9',
  //         DEVICE: '2',
  //         'x-flash-version': '33,1,1,554',
  //         Referer: 'app:/worldflipper_android_release.swf',
  //       },
  //       body: 'g6pwYWdlX2luZGV4BqRraW5kAKl2aWV3ZXJfaWTONM1PIQ==',
  //     }
  //   )
  // )

  fetchLatestAssetVersion = async ({
    regionVariant = this.regionVariant,
  } = {}) => {
    const latestAssetTracker = logger.progressStart({
      id: 'Fetching latest asset info from server...',
      max: 1,
    });

    const requestHeaders = {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/103.0.0.0 Safari/537.36',
      Accept: 'gzip, deflate, br',
      RES_VER: '0.0.0',
      ...(regionVariant !== 'jp' && {
        DEVICE_LANG: (regionVariant === 'en' && 'en') || 'ko',
      }),
    };

    let fileListRes;
    try {
      fileListRes = await fetch(API_PATHS.asset[regionVariant], {
        method: 'get',
        headers: requestHeaders,
      });
    } catch (err) {
      console.log(err);
      latestAssetTracker.end();

      logger.log(`Failed to fetch asset list: ${err.message}`);
      return null;
    }
    latestAssetTracker.end();
    if (fileListRes.status !== 200) {
      logger.log(
        `API Request failed: ${fileListRes.status} ${fileListRes.statusText}`
      );
      logger.log(
        `The error maybe originated from the server blocking your api access due to access region (KR/CN ip is blocked from jp)`
      );
      return null;
    }

    const bodyString = (await fileListRes.buffer()).toString();
    const base64Decoded = Buffer.from(bodyString, 'base64');
    const decodedMsgPack = await msgpack.decode(base64Decoded);

    return decodedMsgPack.data.info.eventual_target_asset_version;
  };

  extractEnemyDslAndRelatedAssets = async (dslPath) => {
    const dslPathTests = ['.esdl.amf3', '.esdl.json', '.esdl'].reduce(
      (acc, cur) => [...acc, `${dslPath}${cur}`, `${dslPath}${cur}.deflate`],
      [dslPath]
    );

    let foundEnemyDsl;

    for (const testPath of dslPathTests) {
      const searchResult = await this.digestAndCheckFilePath(testPath);

      if (searchResult) {
        foundEnemyDsl = searchResult;
        break;
      }
    }

    if (!foundEnemyDsl) {
      throw new Error('Enemy dsl not found from path.');
    }

    const { json } = await this.fileReader.readGeneralAndCreateOutput(
      foundEnemyDsl[1],
      foundEnemyDsl[0]
    );

    const meaingfulStrings = deepSearchUniqueMeaningfulStringsFromObject(json);

    const possibleAssetPaths = meaingfulStrings.filter((string) =>
      string.includes('/')
    );

    await this.loadAndExtractPossibleAssets(possibleAssetPaths, {
      exclude: ['esdl'],
      preventDoneLog: true,
    });

    const possibleActionDslPaths = meaingfulStrings
      .filter((string) => !string.includes('/'))
      .map((string) => `${json.bH}${string}${ACTION_DSL_FORMAT_DEFLATE}`);

    const exportedDsl = await Promise.all(
      possibleActionDslPaths.map(async (actionDslPath) => {
        const foundActionDsl = await this.digestAndCheckFilePath(actionDslPath);

        if (foundActionDsl) {
          return this.fileReader.readGeneralAndCreateOutput(
            foundActionDsl[1],
            foundActionDsl[0]
          );
        }

        return null;
      })
    );

    return exportedDsl.filter((v) => v);
  };

  development = async (debug) => {
    await this.init();
    await this.buildDigestFileMap();
    // await this.extractMasterTable();
    // await this.buildAsFilePaths();
    await this.loadFilePaths();
    await this.loadAsFilePaths();

    this.__debug = debug;

    switch (true) {
      case /^fetchComics/.test(debug): {
        const args = debug.split(' ').slice(1);
        let regionVariant = 'jp';
        args.forEach((arg, idx) => {
          if (/^-region$/.test(arg)) {
            regionVariant = args[idx + 1];
          }
        });
        const latestAssetVersion = await this.fetchLatestAssetVersion({
          regionVariant,
        });

        const comicListIndex = 5;

        const fetchUrl = `${API_PATHS.host[regionVariant]}/comic/get_list`;
        const fetchOptions = {
          method: 'post',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            RES_VER: latestAssetVersion,
            APP_VER: '0.0.45',
            ...(regionVariant !== 'jp' && {
              DEVICE_LANG: (regionVariant === 'en' && 'en') || 'ko',
            }),
            PARAM: '7b382ac98c21bac8be9be9de25d8d9b2525984fd',
            UDID: 'BC51B46F-B7D5-49C3-A651-62D255A49C8471D9',
            DEVICE: '2',
          },
          body: (
            await msgpack.encode({
              page_index: comicListIndex,
              kind: 0,
              viewer_id: 885870369,
            })
          ).toString('base64'),
        };

        //   await (await (fetch('https://kr.wdfp.kakaogames.com/latest/api/index.php/comic/get_list', {
        //    method: 'post',
        //    headers: {
        //        'Content-Type': 'application/x-www-form-urlencoded',
        //        RES_VER: '2.0.51',
        //        APP_VER: '0.0.45',
        //        DEVICE_LANG: 'ko',
        //        PARAM: '7b382ac98c21bac8be9be9de25d8d9b2525984fd',
        //        UDID: 'BC51B46F-B7D5-49C3-A651-62D255A49C8471D9',
        //        DEVICE: '2',
        //      },
        //    body: 'g6pwYWdlX2luZGV4BqRraW5kAKl2aWV3ZXJfaWTONM1PIQ==',
        //  }))).text()

        console.log(fetchUrl, fetchOptions);

        const fetchedResult = await (
          await fetch(fetchUrl, fetchOptions)
        ).text();
        console.log(fetchedResult);

        const comicResponse = await msgpack.decode(
          Buffer.from(fetchedResult, 'base64')
        );
        console.log(comicResponse);

        return null;
      }
      case /fetchAssets/.test(debug): {
        const args = debug.split(' ').slice(1);
        await this.fetchAssetsFromApi(args[0]);
        return null;
      }
      case /^checkUnknowns/.test(debug): {
        const args = debug.split(' ').slice(1);

        let targetDelta;

        args.forEach((arg, idx) => {
          if (/^-delta$/.test(arg)) {
            targetDelta = args[idx + 1];
          }
        });

        const rootDir = `${this.ROOT_PATH}${
          (targetDelta && `/delta-${targetDelta}`) || ''
        }`;

        const targetDirectory = `${rootDir}/dump`;

        const savedDigests = await this.loadConfirmedDigests(rootDir);

        const unknownAssets = [];
        let total = 0;

        const targetUploads = await asyncReadDir(targetDirectory);

        for (const targetUpload of targetUploads) {
          try {
            const targetSubPaths = await asyncReadDir(
              `${targetDirectory}/${targetUpload}`
            );

            for (const targetSubPath of targetSubPaths) {
              const targetAssets = await asyncReadDir(
                `${targetDirectory}/${targetUpload}/${targetSubPath}`
              );

              for (const targetAsset of targetAssets) {
                total += 1;
                if (!savedDigests[`${targetSubPath}${targetAsset}`]) {
                  unknownAssets.push([
                    `${targetDirectory}/${targetUpload}/${targetSubPath}/${targetAsset}`,
                    `${targetSubPath}${targetAsset}`,
                  ]);
                }
              }
            }
          } catch (err) {
            continue;
          }
        }

        const unknownTracker = logger.progressStart({
          id: 'Checking unknown asset files...',
          max: unknownAssets.length,
        });

        let unknownImages = 0;

        for (const unknownAsset of unknownAssets) {
          unknownTracker.progress();
          try {
            await this.fileReader.readPngAndGenerateOutput(
              unknownAsset[0],
              `unknown/images/${unknownAsset[1]}.png`,
              { rootDir }
            );
            unknownImages += 1;
          } catch (err) {
            continue;
          }
        }
        unknownTracker.end();

        logger.log(
          `Saved ${unknownImages} unknown images, out of total ${unknownAssets.length} unknowns (Total delta files: ${total})`
        );

        return null;
      }
      case /^character/.test(debug): {
        const args = debug.split(' ').slice(1);
        this.extractCharacter(args[0]);

        return null;
      }
      case /exboost/.test(debug): {
        await this.extractEXBoostMasterTable();
        return this.constructReadableExBoostOddsTable();
      }
      case /^(animate) .*/.test(debug): {
        const args = debug.split(' ').slice(1);

        let character;

        args.forEach((arg, idx) => {
          if (/^-character$/.test(arg)) {
            character = args[idx + 1];
          }
        });

        if (!character) {
          return logger.log(
            'Invalid parameter. Available args: -character [characterName]'
          );
        }

        const characters = await this.getCharacterList();

        if (!characters.includes(character)) {
          return logger.log(`Character ${character} not found.`);
        }
        const foundPng = await this.digestAndCheckFilePath(
          `character/${character}/pixelart/sprite_sheet.png`
        );
        if (!foundPng) {
          logger.log('Image not found.');
          return null;
        }
        const foundAtlas = await this.digestAndCheckFilePath(
          `character/${character}/pixelart/sprite_sheet.atlas.amf3.deflate`
        );
        const foundTimeline = await this.digestAndCheckFilePath(
          `character/${character}/pixelart/pixelart.timeline.amf3.deflate`
        );
        const foundSpecialPng = await this.digestAndCheckFilePath(
          `character/${character}/pixelart/special_sprite_sheet.png`
        );
        const foundSpecialAtlas = await this.digestAndCheckFilePath(
          `character/${character}/pixelart/special_sprite_sheet.atlas.amf3.deflate`
        );
        const foundSpecialTimeline = await this.digestAndCheckFilePath(
          `character/${character}/pixelart/special.timeline.amf3.deflate`
        );
        if (!foundAtlas) {
          logger.log('Atlas not found.');
          return null;
        }

        await this.fileReader.readPngAndGenerateOutput(
          foundPng[1],
          foundPng[0]
        );
        await this.fileReader.readGeneralAndCreateOutput(
          foundAtlas[1],
          foundAtlas[0]
        );
        await this.fileReader.readGeneralAndCreateOutput(
          foundTimeline[1],
          foundTimeline[0]
        );
        if (foundSpecialPng) {
          await this.fileReader.readPngAndGenerateOutput(
            foundSpecialPng[1],
            foundSpecialPng[0]
          );
          await this.fileReader.readGeneralAndCreateOutput(
            foundSpecialAtlas[1],
            foundSpecialAtlas[0]
          );
          await this.fileReader.readGeneralAndCreateOutput(
            foundSpecialTimeline[1],
            foundSpecialTimeline[0]
          );
        }

        return this.animateCharacterSprite(character, { ignoreCache: true });
      }
      case /^(sprite) .*/.test(debug): {
        const args = debug.split(' ').slice(1);
        const destPath = args.pop();
        const command = debug.split(' ')[0];

        let scale = 1;
        let eliyaBot = false;
        let animate = false;
        let timelineRoot = '';
        let noTimeline = false;
        let deltaVer = false;

        args.forEach((arg, idx) => {
          if (/^-scale$/.test(arg)) {
            scale = parseFloat(args[idx + 1] || 1);
          }
          if (/^-timeline$/.test(arg)) {
            timelineRoot = args[idx + 1];
          }
          if (/^-eliyabot$/.test(arg)) {
            eliyaBot = true;
          }
          if (/^-noTimeline$/.test(arg)) {
            noTimeline = true;
          }
          if (/^-animate$/.test(arg)) {
            animate = true;
          }
          if (/^-delta$/.test(arg)) {
            deltaVer = args[idx + 1];
          }
        });

        if (deltaVer) {
          this.deltaMode = deltaVer;
          await this.setRootPath(`${this.ROOT_PATH}/delta-${deltaVer}`);
          await this.init();
          await this.buildDigestFileMap();
        }

        if (eliyaBot) {
          await this.fileReader.buildSpriteBackgrounds(scale);
        }

        const foundPng = await this.digestAndCheckFilePath(`${destPath}.png`);
        if (!foundPng) {
          logger.log('Image not found.');
          return null;
        }
        const foundAtlas = await this.digestAndCheckFilePath(
          `${destPath}.atlas.amf3.deflate`
        );
        if (!foundAtlas) {
          logger.log('Atlas not found.');
          return null;
        }

        await this.fileReader.readPngAndGenerateOutput(
          foundPng[1],
          foundPng[0]
        );
        await this.fileReader.readGeneralAndCreateOutput(
          foundAtlas[1],
          foundAtlas[0]
        );

        const sheetName = destPath.split('/').pop();

        if (noTimeline) {
          const sprite = await asyncReadFile(
            `${this.ROOT_PATH}/output/assets/${destPath}.png`
          );
          const atlases = JSON.parse(
            (
              await asyncReadFile(
                `${this.ROOT_PATH}/output/assets/${destPath}.atlas.json`
              )
            ).toString()
          );
          await this.fileReader.cropSpritesFromAtlas({
            sprite,
            atlases,
            destPath: `${this.ROOT_PATH}/output/assets/${destPath}`,
            generateGif: `${this.ROOT_PATH}/output/assets/${destPath}/${sheetName}.gif`,
          });
        } else {
          await this.processSpritesByAtlases(
            `${this.ROOT_PATH}/output/assets/${destPath
              .split('/')
              .slice(0, -1)
              .join('/')}`,
            {
              extractAll: true,
              scale,
              sheetName,
              animate,
              timelineRoot,
              cropProps: {
                eliyaBot,
              },
            }
          );
        }

        return null;
      }
      case /^enemyDsl .*/.test(debug): {
        const destPath = debug.split(' ').pop();

        await this.extractEnemyDslAndRelatedAssets(destPath);

        return true;
      }
      case /^(search) .*/.test(debug): {
        const destPath = debug.split(' ').pop();
        const args = debug.split(' ').slice(1, debug.split(' ').length - 1);

        let customFormats = [];
        let extract = false;

        args.forEach((arg, idx) => {
          if (/^-ff$|^-format$/.test(arg)) {
            customFormats = args[idx + 1].split('|');
          }
          if (/^-e$|^-extract$/.test(arg)) {
            extract = true;
          }
        });

        const searchTracker = logger.progressStart({
          id: 'Searching assets...',
          max: COMMON_FILE_FORMAT.length + 6,
        });

        let isFound;
        for (const possibleFormat of [
          '.orderedmap',
          '.atlas.amf3',
          '.timeline.amf3',
          '.frame.amf3',
          '.parts.amf3',
          '.atf',
          '.action.dsl',
          '.action.dsl.amf3',
          '.action.dsl.json',
          '.esdl.amf3',
          '.esdl.json',
          '.esdl',
          ...customFormats,
          ...COMMON_FILE_FORMAT,
        ]) {
          searchTracker.progress();
          const curPath = `${destPath}${possibleFormat}`;
          const curDigestPath = `${destPath}${possibleFormat}.deflate`;

          const found = await this.digestAndCheckFilePath(curPath);
          const digestFound = await this.digestAndCheckFilePath(curDigestPath);

          if (found) {
            logger.log(`Asset found at ${curPath}`);
          }
          if (digestFound) {
            logger.log(`Asset found at ${curDigestPath}`);
          }

          if (found || digestFound) {
            isFound = true;
          }
        }
        searchTracker.end();

        if (extract && isFound) {
          await this.loadAndExtractPossibleAssets([destPath]);
        }

        return null;
      }
      case /^(master|image|audio|general) .*/.test(debug): {
        const destPath = debug.split(' ').slice(1).join(' ');
        const command = debug.split(' ')[0];
        const found = await this.digestAndCheckFilePath(destPath);

        logger.log(JSON.stringify(found || {}));

        if (!found) {
          logger.log('Asset not found for path.');

          return null;
        }

        switch (command) {
          case 'master': {
            return this.fileReader.readMasterTableAndGenerateOutput(
              found[1],
              found[0]
            );
          }
          case 'image': {
            return this.fileReader.readPngAndGenerateOutput(found[1], found[0]);
          }
          case 'audio': {
            return this.fileReader.readMp3AndGenerateOutput(found[1], found[0]);
          }
          default: {
            return this.fileReader.readGeneralAndCreateOutput(
              found[1],
              found[0]
            );
          }
        }
      }
      default: {
        return logger.log(`Command not found: ${debug.split(' ')[0]}`);
      }
    }

    return true;
  };

  close = async () => {
    await this.adbShell.kill();

    return true;
  };
}

export default WfExtractor;

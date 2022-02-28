import fs from 'fs';
import moment from 'moment';
import fkill from 'fkill';
import path from 'path';
import AdmZip from 'adm-zip';
import crypto from 'crypto';
import rimraf from 'rimraf';
import { app } from 'electron';
import { ChildProcess, spawn } from 'child_process';
import { mkdir, readdir, readFile, stat, writeFile } from 'fs/promises';
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
  BASE_ODD_MAP,
  CHARACTER_AMF_PRESERTS,
  CHARACTER_SPRITE_PRESETS,
  CHARACTER_VOICE_PRESETS,
  COMMON_FILE_FORMAT,
  DATEFORMAT_A,
  IS_DEVELOPMENT,
  MERGEABLE_PATH_PREFIXES,
  NOX_PORT_LIST,
  POSSIBLE_PATH_REGEX,
} from './constants';

const RESOURCES_PATH = app.isPackaged
  ? path.join(process.resourcesPath, 'assets')
  : path.join(__dirname, '../../../assets');

const getAssetPath = (...paths: string[]): string => {
  return path.join(RESOURCES_PATH, ...paths);
};

const pushExist = (array, arg) => arg && array.push(arg);

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

  ROOT_PATH: string;

  DEVICE_ID: string;

  ADB_ROOT = false;

  target: 'gl' | 'jp';

  APK_NAME_KEY = {
    gl: 'wdfp',
    jp: 'worldflipper',
  };

  swfMode: 'simple' | 'full';

  filePaths: string[];

  asFilePaths: string[];

  customPort: string;

  constructor({
    region,
    rootDir,
    customPort,
    swfMode,
    extractAllFrames,
  }: { swfMode: 'simple' | 'full' } = {}) {
    this.metadata = {};
    this.swfMode = swfMode || 'simple';
    this.customPort = customPort;

    this.options = {
      extractAllFrames,
    };

    this.setRootPath(rootDir || DEFAULT_ROOT_PATH);
    logger.log(`Target region set as ${region}`);
    this.region = region || 'jp';
  }

  dev = async () => {
    this.fileReader.buildDigestFileMap();
  };

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
    let isChanged;

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

    const { masterTableFiles, filePaths } =
      await this.fileReader.readBootFcAndGenerateOutput({
        rootDir: this.ROOT_PATH,
      });

    this.filePaths = filePaths;

    logger.log('Successfully extracted orderedMaps.');
  };

  loadFilePaths = async () => {
    if (this.filePaths) {
      return;
    }

    try {
      const loadedFilePaths = JSON.parse(
        (await readFile(`${this.ROOT_PATH}/filePaths.lock`)).toString()
      );
      this.filePaths = loadedFilePaths;
    } catch (err) {
      console.log(err);
    }

    if (!this.filePaths?.length) {
      throw new Error('FAILED_TO_LOAD_PATHS');
    }
  };

  loadAsFilePaths = async () => {
    if (this.asFilePaths) {
      return;
    }

    try {
      const loadedAsFilePaths = JSON.parse(
        (await readFile(`${this.ROOT_PATH}/asFilePaths.lock`)).toString()
      );
      this.asFilePaths = loadedAsFilePaths || [];
    } catch (err) {
      console.log(err);
    }

    if (!this.asFilePaths?.length) {
      this.asFilePaths = [];
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
      if (!characterData) continue;

      const [name] = characterData;

      const voiceAssetPaths = CHARACTER_VOICE_PRESETS.map((preset) =>
        preset(name)
      );
      const voiceLineTexts = {};

      speeches.forEach((speech, idx) => {
        if (POSSIBLE_PATH_REGEX.test(speech)) {
          speech.split('\\n').forEach((speechPath) => {
            if (speechPath.includes('/')) {
              voiceAssetPaths.push(`character/${name}/voice/${speechPath}.mp3`);
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

      await this.fileReader.writeWfAsset(
        `character/${name}/voice/voiceLines.json`,
        JSON.stringify(voiceLineTexts, null, 4)
      );

      for (const [fileName, filePath] of pathDigests) {
        await this.fileReader.readMp3AndGenerateOutput(filePath, fileName);
      }
    }

    tracker.end();
    logger.log('Extracted character voice assets.');
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
    const timelineName = timelineRoot || 'pixelart';

    const spriteImage = await asyncReadFile(`${spritePath}/${sheetName}.png`);
    console.log(`${spritePath}/${sheetName}.atlas.json`);
    const spriteAtlases = JSON.parse(
      (await asyncReadFile(`${spritePath}/${sheetName}.atlas.json`)).toString()
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
        if (!this.metadata.spriteProcessedLock?.includes(character)) {
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

        if (!this.metadata.specialSpriteProcessedLock?.includes(character)) {
          await asyncMkdir(
            `${this.ROOT_PATH}/output/assets/character/${character}/pixelart/animated`,
            { recursive: true }
          );

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
            generateGif: `${this.ROOT_PATH}/output/assets/character/${character}/pixelart/animated/special.gif`,
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
        tracker.progress();
      }
    }

    tracker.end();
    logger.log('Successfully cropped and saved all character sprites.');
  };

  buildAsFilePaths = async () => {
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

    this.asFilePaths = asFilePaths || [];

    await writeFile(
      `${this.ROOT_PATH}/asFilePaths.lock`,
      JSON.stringify(asFilePaths)
    );
  };

  digestAndCheckFilePath = async (filePath) => {
    const digest = await digestWfFileName(filePath);
    const digestPath = await this.fileReader.checkDigestPath(digest);

    if (digestPath) {
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

  loadPossibleAssets = async () => {
    if (this.possibleAssetCache) return this.possibleAssetCache;

    const possibleImageAssets = [];
    const possibleAudioAssets = [];
    const possibleImageAmfAssets = [];
    const possibleGeneralAmfAssets = [];

    const sprites = {};
    const fileNameMap = {};

    for (const filePath of [
      ...new Set([...(this.asFilePaths || []), ...this.filePaths]),
    ]) {
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
        await this.digestAndCheckFilePath(`${filePath}.action.dsl.amf3.deflate`)
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
        await this.digestAndCheckFilePath(
          `${filePath.replace(/\/[A-z0-9_]*$/, '/sprite_sheet')}.atf.deflate`
        )
      );
    }
    await this.developWriteJson('image_assets.json', possibleImageAssets);

    const amf3Tracker = logger.progressStart({
      id: 'Searching for possible atlases...',
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
      const frameEntry = await this.digestAndCheckFilePath(
        imagePath.replace(fileName, `${fileNameRoot}.frame.amf3.deflate`)
      );
      const pixelArtTimelineEntry = await this.digestAndCheckFilePath(
        imagePath.replace(fileName, 'pixelart.timeline.amf3.deflate')
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

    this.possibleAssetCache = {
      possibleImageAssets,
      possibleAudioAssets,
      possibleImageAmfAssets,
      possibleGeneralAmfAssets,
      sprites,
      fileNameMap,
    };

    return this.possibleAssetCache;
  };

  extractPossibleAudioAssets = async () => {
    const { possibleAudioAssets } = await this.loadPossibleAssets();

    const audioTracker = logger.progressStart({
      id: 'Extracting audio assets...',
      max: possibleAudioAssets.length,
    });
    for (const [fileName, filePath] of possibleAudioAssets) {
      audioTracker.progress();
      await this.fileReader.readMp3AndGenerateOutput(filePath, fileName);
    }
    audioTracker.end();
  };

  extractPossibleGeneralAmf3Assets = async () => {
    const { possibleGeneralAmfAssets } = await this.loadPossibleAssets();

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
  }: { cropSprites: boolean } = {}) => {
    const {
      possibleImageAssets,
      possibleImageAmfAssets,
      sprites,
      fileNameMap,
    } = await this.loadPossibleAssets();
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
    let battleEffectPaths = [];

    for (let i = 1; i <= 5; i += 1) {
      const rarityPath = `${this.ROOT_PATH}/output/assets/battle/action/skill/action/rare${i}`;
      const actionDescriptors = await readdir(rarityPath);

      for (const actionDescriptor of actionDescriptors) {
        const descContent = await readFile(`${rarityPath}/${actionDescriptor}`);

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
    const gachaFile = JSON.parse(
      await readFile(`${this.ROOT_PATH}/output/orderedmap/gacha/gacha.json`)
    );

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

    const gachaTracker = logger.progressStart({
      id: 'Exporting gacha odds table...',
      max: Object.values(gachaFile).length,
    });
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

  development = async (debug) => {
    await this.init();
    await this.buildDigestFileMap();
    // await this.extractMasterTable();
    // await this.buildAsFilePaths();
    await this.loadFilePaths();
    await this.loadAsFilePaths();

    this.__debug = debug;

    switch (true) {
      case /exboost/.test(debug): {
        await this.extractEXBoostMasterTable();
        return this.constructReadableExBoostOddsTable();
      }
      case /^(sprite) .*/.test(debug): {
        const args = debug.split(' ').slice(1);
        const destPath = args.pop();
        const command = debug.split(' ')[0];

        let scale = 1;
        let eliyaBot = false;

        args.forEach((arg, idx) => {
          if (/scale/.test(arg)) {
            scale = parseFloat(args[idx + 1] || 1);
          }
          if (/eliyabot/.test(arg)) {
            eliyaBot = true;
          }
        });

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

        await this.processSpritesByAtlases(
          `${this.ROOT_PATH}/output/assets/${destPath
            .split('/')
            .slice(0, -1)
            .join('/')}`,
          {
            extractAll: true,
            scale,
            sheetName,
            cropProps: {
              eliyaBot,
            },
          }
        );

        return null;
        return null;
      }
      case /^(search) .*/.test(debug): {
        const destPath = debug.split(' ').slice(1).join(' ');

        const searchTracker = logger.progressStart({
          id: 'Searching assets...',
          max: COMMON_FILE_FORMAT.length + 6,
        });
        for (const possibleFormat of [
          '.orderedmap',
          '.atlas.amf3',
          '.timeline.amf3',
          '.frame.amf3',
          '.parts.amf3',
          '.atf',
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
        }
        searchTracker.end();

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
        console.log('');
      }
    }

    const found = await this.digestAndCheckFilePath(debug);

    logger.log(JSON.stringify(found || {}));

    // return this.extractGachaOdds();

    // return this.extractSkillEffects();

    if (found) {
      try {
        if (/orderedmap/.test(debug)) {
          await this.fileReader.readMasterTableAndGenerateOutput(
            found[1],
            found[0]
          );
        } else {
          await this.fileReader.readGeneralAndCreateOutput(found[1], found[0]);
        }
      } catch (err) {
        console.log(err);
      }
    }

    // await this.processSpritesByAtlases(`${this.ROOT_PATH}/output/assets/item`, {
    //   extractAll: true,
    // });
    // await this.processSpritesByAtlases(
    //   `${this.ROOT_PATH}/output/assets/character/alice/pixelart`,
    //   {
    //     extractAll: true,
    //   }
    // );

    return true;
  };

  close = async () => {
    await this.adbShell.kill();

    return true;
  };
}

export default WfExtractor;

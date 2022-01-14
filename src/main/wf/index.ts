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
  asyncReadDir,
  asyncReadFile,
  asyncRename,
  refineLs,
  spawnCommand,
} from './helpers';
import {
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

const DEFAULT_ROOT_PATH = 'D:/wfextract';
const ADB_PATH = getAssetPath(`/adb/adb.exe`);
const METADATA_PATH = (rootPath) => `${rootPath}/metadata.json`;

const getDeviceList = async () => {
  const devices = await asyncExec(`${ADB_PATH} devices`);

  return devices
    .split(/[\r]{0,}\n/)
    .slice(1)
    .filter((val) => val);
};

const tryConnect = async () => {
  await Promise.all(
    NOX_PORT_LIST.map((port) =>
      asyncExec(`${ADB_PATH} connect 127.0.0.1:${port}`)
    )
  );
  return true;
};
class AdbShell {
  drained = false;

  outputDebounce = {
    out: {
      timeout: null,
      chunks: [],
    },
    err: {
      timeout: null,
      chunks: [],
    },
  };

  shell = ChildProcess;

  execResolver: (any) => void;

  execRejector: (any) => void;

  constructor() {
    this.shell = spawn(`${ADB_PATH} shell`, { shell: true });

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

    this.shell.stdin.write(`${command}\r\n`);

    return new Promise((resolve, reject) => {
      this.execResolver = resolve;
      this.execRejector = reject;
    });
  };

  onReceiveStdOut = (data) => {
    const received = data.toString();
    if (this.execResolver) {
      if (this.outputDebounce.out) {
        clearTimeout(this.outputDebounce.out.timeout);
      }

      this.outputDebounce.out.chunks.push(received);
      this.outputDebounce.out.timeout = setTimeout(() => {
        this.execResolver(
          this.outputDebounce.out.chunks.reduce((acc, cur) => acc + cur, '')
        );
        this.execResolver = null;
        this.execRejector = null;
        this.outputDebounce.out.chunks = [];
      }, 100);
    }
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

  constructor() {
    this.ROOT_PATH = DEFAULT_ROOT_PATH;
    this.fileReader = new WfFileReader({ rootDir: this.ROOT_PATH });
    this.metadata = {};
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

    fs.writeFileSync(
      METADATA_PATH(this.ROOT_PATH),
      JSON.stringify(this.metadata)
    );
  };

  init = async () => {
    logger.log('Initializing extraction process.');

    try {
      await asyncExec('java -version');
    } catch (err) {
      console.log(err);
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

  getDeviceList = async () => {
    logger.log('scanning connected devices.');
    let foundDevices = await getDeviceList();

    if (!foundDevices.length) {
      await tryConnect();
      foundDevices = await getDeviceList();
    }

    logger.log(`${foundDevices.length} devices found.`);
    return foundDevices;
  };

  connectAdbShell = async () => {
    this.adbShell = new AdbShell();

    logger.log('Adb shell connected.');
  };

  indexWfAssets = async () => {
    try {
      const foundWfPath = (
        await this.adbShell.exec(
          'find /data/data -name "*4d576b424178c5b2b253a2dd5aa3d78fa74ef3*"'
        )
      ).split('/upload')[0];
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

  dumpWfAssets = async () => {
    logger.log('Asset dump started.');

    const { lastExtractionDate } = this.metadata;

    if (lastExtractionDate) {
      const deltaFiles = this.files.filter(
        (file) => file.modifiedDate > lastExtractionDate && !file.isDirectory
      );

      logger.log('Extracting deltas...');

      await Promise.all(
        deltaFiles.map((deltaFile) => {
          const targetPath = `${this.ROOT_PATH}/dump/${deltaFile.path
            .replace(this.adbWfPath, '')
            .split('/')
            .slice(0, -1)
            .join('/')}`;

          if (!DIR_CACHE[targetPath]) {
            createAndCacheDirectory(targetPath);
          }

          return asyncExec(
            `${ADB_PATH} pull "${deltaFile.path}" "${targetPath}/"`
          );
        })
      );

      this.deltaFiles = deltaFiles;

      logger.log(`${deltaFiles.length} files newly extracted and saved.`);
    } else {
      logger.log(
        'WARNING: failed to find metadata, executing full asset dump. this process might take more than several minutes, so please be patience.'
      );
      await asyncExec(
        `${ADB_PATH} pull "${this.adbWfPath}" "${this.ROOT_PATH}/dump"`
      );
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
      'pm list packages -f | grep wdfp'
    );
    const packageName = packageInfoLine
      .split('=')
      .slice(-1)[0]
      .replace(/[\r]{0,}\n/, '');

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

      await asyncExec(`${ADB_PATH} pull "${savedApkPath}" "${apkPath}"`);

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

  extractImageAssets = async () => {
    logger.log('Start extracting character image assets...');

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

    for (const [fileName, digest] of characterImageDigests) {
      const filePath = await this.fileReader.checkDigestPath(digest);
        if (!filePath) continue; // eslint-disable-line
      characterImagePaths.push([fileName, filePath]);
    }

    const characterImageFiles = characterImagePaths.filter((v) => v);

    for (const [fileName, filePath] of characterImageFiles) {
      await this.fileReader.readPngAndGenerateOutput(filePath, fileName);
    }

    logger.log('Successfully extracted character image assets.');
  };

  close = async () => {
    await this.adbShell.kill();

    return true;
  };
}

export default WfExtractor;

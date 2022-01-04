import fs from 'fs';
import moment from 'moment';
import fkill from 'fkill';
import path from 'path';
import AdmZip from 'adm-zip';
import crypto from 'crypto';
import rimraf from 'rimraf';
import { app } from 'electron';
import { exec, spawn } from 'child_process';
import WfFileReader from './wfFileReader';
import logger from './logger';
import { digestWfFileName } from './digest';

const RESOURCES_PATH = app.isPackaged
  ? path.join(process.resourcesPath, 'assets')
  : path.join(__dirname, '../../../assets');

const getAssetPath = (...paths: string[]): string => {
  return path.join(RESOURCES_PATH, ...paths);
};

const asyncMkdir = (...args) =>
  new Promise((resolve) => fs.mkdir(...args, resolve));
const asyncReadFile = (...args) =>
  new Promise((resolve) => fs.readFile(...args, (err, data) => resolve(data)));

const NOX_PORT_LIST = [62001, 62025];
const DEFAULT_ROOT_PATH = 'D:/wfextract';
const DATEFORMAT_A = 'YYYY-MM-DD HH:mm';
const ADB_PATH = getAssetPath(`/adb/adb.exe`);

const METADATA_PATH = (rootPath) => `${rootPath}/metadata.json`;

const CHARACTER_SPRITE_PRESETS = [
  (character, index) => `character/${character}/pixelart/sprite_sheet`,
  (character, index) => `character/${character}/pixelart/special_sprite_sheet`,
  (character, index) => `character/${character}/pixelart/special`,
  (character, index) => `character/${character}/ui/skill_cutin_${index}`,
  (character, index) => `character/${character}/ui/cutin_skill_chain_${index}`,
  (character, index) => `character/${character}/pixelart/pixelart`,
  (character, index) => `character/${character}/ui/thumb_party_unison_${index}`,
  (character, index) => `character/${character}/ui/thumb_party_main_${index}`,
  (character, index) =>
    `character/${character}/ui/battle_member_status_${index}`,
  (character, index) => `character/${character}/ui/thumb_level_up_${index}`,
  (character, index) => `character/${character}/ui/square_${index}`,
  (character, index) => `character/${character}/ui/square_132_132_${index}`,
  (character, index) =>
    `character/${character}/ui/square_round_136_136_${index}`,
  (character, index) => `character/${character}/ui/square_round_95_95_${index}`,
  (character, index) =>
    `character/${character}/ui/battle_member_status_${index}`,
  (character, index) => `character/${character}/ui/episode_banner_0`,
  (character, index) =>
    `character/${character}/ui/battle_control_board_${index}`,
  (character, index) =>
    `character/${character}/battle/character_detail_skill_preview`,
  (character, index) =>
    `character/${character}/ui/illustration_setting_sprite_sheet`,
  (character, index) =>
    `character/${character}/battle/character_info_skill_preview`,
  (character, index) =>
    `character/${character}/ui/full_shot_1440_1920_${index}`,
  (character, index) =>
    `character/${character}/ui/full_shot_illustration_setting_${index}`,
];

const asyncExec = async (command: string): Promise<string> =>
  new Promise((resolve, reject) =>
    exec(command, (err, stdout) => (err ? reject(err) : resolve(stdout)))
  );

process.env.IS_DEBUG = process.argv.includes('--debug');

const sleep = (timeout) =>
  new Promise((resolve) => setTimeout(resolve, timeout));

const spawnCommand = (command, args, { wait }) => {
  const child = spawn(command, args, {});

  child.stderr.pipe(process.stderr);
  if (wait) {
    let awaitResolver;
    const awaiter = new Promise((resolve) => {
      awaitResolver = resolve;
    });

    let lastChunkString;

    child.stdout.on('data', (chunk) => {
      if (`${lastChunkString}${chunk.toString()}`.includes(wait)) {
        awaitResolver();
      }
      lastChunkString = chunk.toString();
    });

    return { process: child, awaiter };
  }
  child.stdout.pipe(process.stdout);

  return { process: child, awaiter: new Promise() };
};

type LSResult = {
  permission: string;
  linkCount: string;
  owner: string;
  group: string;
  size: string;
  modifiedDate: string;
  name: string;
  path: string;
};

type WFExtractorMetaData = {
  lastExtractionDate: string;
  lastPackageVersion: string;
  lastSwfChecksum: string;
};

const DIR_CACHE = {};

let metadata: WFExtractorMetaData;

const init = (ROOT_PATH): WFExtractorMetaData => {
  if (!fs.existsSync(METADATA_PATH(ROOT_PATH))) {
    fs.writeFileSync(
      METADATA_PATH(ROOT_PATH),
      JSON.stringify({
        lastExtractionDate: null,
        lastPackageVersion: null,
        lastSwfChecksum: null,
      })
    );
  }

  metadata = JSON.parse(fs.readFileSync(METADATA_PATH(ROOT_PATH)).toString());

  return metadata;
};

const markMetaData = (update: WFExtractorMetaData, ROOT_PATH) => {
  metadata = {
    ...metadata,
    ...update,
  };

  fs.writeFileSync(METADATA_PATH(ROOT_PATH), JSON.stringify(metadata));
};

const createAndCacheDirectory = async (dir) => {
  await asyncMkdir(dir, { recursive: true });
  DIR_CACHE[dir] = true;
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

  constructor() {
    this.shell = spawn(`${ADB_PATH} shell`, { shell: true });

    this.shell.stdout.on('data', this.onReceiveStdOut);
    this.shell.stderr.on('data', this.onReceiveStdErr);
    this.shell.stdin.setDefaultEncoding('utf-8');
  }

  exec = async (command) => {
    this.shell.stdin.write(`${command}\r\n`);

    return new Promise((resolve) => {
      this.execResolver = resolve;
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
        this.outputDebounce.out.chunks = [];
      }, 100);
    }
  };

  onReceiveStdErr = (data) => {
    const received = data.toString();
    if (this.execResolver) {
      this.execResolver(received);
      this.execResolver = null;
    }
  };

  kill = () => {
    this.shell.stdin.pause();
    this.shell.kill();
  };
}

const refineLs = (lsResult): Array<LSResult> => {
  const splits = lsResult.split(/[\r]{0,}\n/);

  let root;

  return splits
    .map((split) => {
      if (!/^[-a-z]{10}/.test(split)) {
        if (/:$/.test(split)) {
          [root] = split.split(':');
        }
        return null;
      }

      const chunks = split.split(' ').filter((val) => val);

      const [permission, linkCount, owner, group, size, date, time, name] =
        chunks;

      return {
        isDirectory: permission[0] === 'd',
        permission,
        linkCount,
        owner,
        group,
        size,
        modifiedDate: `${date} ${time}`,
        name,
        path: `${root}/${name}`,
      };
    })
    .filter((val) => val);
};

// const checkAdbInstalled = async () => {
//   const adbResult = await asyncExec('adb --version');

//   if (/version [0-9.]*/i.test(adbResult)) {
//     const version = adbResult.split(/[\r]{0,}\n/)[0];
//     logger.log(`Installed ADB version: ${version}. continue...`);
//     return true;
//   }

//   throw Error('ADB NOT DETECTED');
// };

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

const extractionProcess = async (ROOT_PATH = DEFAULT_ROOT_PATH) => {
  try {
    logger.log('Initializing extraction process.');
    init(ROOT_PATH);

    const wfFileReader = new WfFileReader({ rootDir: ROOT_PATH });

    // await checkAdbInstalled();

    let foundDevices = await getDeviceList();

    if (!foundDevices.length) {
      await tryConnect();
      foundDevices = await getDeviceList();
    }

    const adbShell = new AdbShell();

    logger.log('Adb shell connected.');

    const foundWfDir = (
      await adbShell.exec(
        'find /data/data -name "*4d576b424178c5b2b253a2dd5aa3d78fa74ef3*"'
      )
    ).split('/upload')[0];

    logger.log('Wf assets found. bulding files index...');

    const subDirs = (await adbShell.exec(`ls "${foundWfDir}"`))
      .split(/[\r]{0,}\n/)
      .filter((val) => val);
    const files: LSResult[] = [];

    for (const subDir of subDirs) {
      files.push(
        ...refineLs(await adbShell.exec(`ls -lR "${foundWfDir}/${subDir}"`))
      );
    }

    logger.log('Extraction started.');

    const { lastExtractionDate } = metadata;

    if (lastExtractionDate) {
      const deltaFiles = files.filter(
        (file) => file.modifiedDate > lastExtractionDate && !file.isDirectory
      );

      logger.log('Extracting deltas...');

      await Promise.all(
        deltaFiles.map((deltaFile) => {
          const targetPath = `${ROOT_PATH}/dump/${deltaFile.path
            .replace(foundWfDir, '')
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

      logger.log(`${deltaFiles.length} files newly extracted and saved.`);
    } else {
      logger.log(
        'WARNING: failed to find metadata, executing full asset dump. this process might take more than several minutes, so please be patience.'
      );
      await asyncExec(`${ADB_PATH} pull "${foundWfDir}" "${ROOT_PATH}/dump"`);
    }

    logger.log('Asset dump successful.');

    markMetaData(
      {
        lastExtractionDate: moment().format(DATEFORMAT_A),
      },
      ROOT_PATH
    );

    logger.log('Extracting Package APK...');

    const apkPath = `${ROOT_PATH}/apk.apk`;
    const apkExtractionPath = `${ROOT_PATH}/apk-extract`;

    const packageInfoLine = await adbShell.exec(
      'pm list packages -f | grep wdfp'
    );
    const packageName = packageInfoLine
      .split('=')
      .slice(-1)[0]
      .replace(/[\r]{0,}\n/, '');

    const packageVersion = (
      await adbShell.exec(`dumpsys package ${packageName} | grep versionName`)
    )
      .trim()
      .replace('versionName=', '');

    if (
      !metadata.lastPackageVersion ||
      packageVersion !== metadata.lastPackageVersion
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

      new AdmZip(`${ROOT_PATH}/apk.apk`).extractAllTo(apkExtractionPath);
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

      if (swfCheckSum !== metadata.lastSwfChecksum) {
        logger.log(
          'SWF checksum mismatch - decompile swf and export essential scripts... (This might take more than several minutes.)'
        );

        const swfExtractionPath = `${ROOT_PATH}/swf`;

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

      markMetaData(
        {
          lastPackageVersion: packageVersion,
          lastSwfChecksum: swfCheckSum,
        },
        ROOT_PATH
      );
    } else {
      logger.log('APK not updated. skipping apk extraction...');
    }

    logger.log('Start extracting orderedMaps...');

    const masterTables = await wfFileReader.readBootFcAndGenerateOutput({
      rootDir: ROOT_PATH,
    });

    logger.log('Successfully extracted orderedMaps.');

    logger.log('Start extracting character image assets...');

    let characters = Object.values(
      JSON.parse(
        (
          await asyncReadFile(
            `${ROOT_PATH}/output/orderedmap/character/character.json`
          )
        ).toString()
      )
    ).map(([name]) => name);

    characters.push(
      ...Object.keys(
        JSON.parse(
          (
            await asyncReadFile(
              `${ROOT_PATH}/output/orderedmap/generated/trimmed_image.json`
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
      const filePath = await wfFileReader.checkDigestPath(digest);
      if (!filePath) continue; // eslint-disable-line
      characterImagePaths.push([fileName, filePath]);
    }

    const characterImageFiles = characterImagePaths.filter((v) => v);

    for (const [fileName, filePath] of characterImageFiles) {
      await wfFileReader.readPngAndGenerateOutput(filePath, fileName);
    }

    logger.log('Successfully extracted character image assets.');

    await adbShell.kill();
  } catch (err) {
    logger.log(err);
  }

  return true;
};

export default extractionProcess;

import fs from 'fs';
import { exec, spawn } from 'child_process';
import logger from './logger';
import { NOX_PORT_LIST } from './constants';

export const asyncMkdir = (...args) =>
  new Promise((resolve) => fs.mkdir(...args, resolve));

export const asyncReadFile = (...args) =>
  new Promise((resolve) => fs.readFile(...args, (err, data) => resolve(data)));

export const asyncReadDir = (...args) =>
  new Promise((resolve, reject) =>
    fs.readdir(...args, (err, data) => (err ? reject(err) : resolve(data)))
  );

export const asyncRename = (...args) =>
  new Promise((resolve, reject) =>
    fs.rename(...args, (err, data) => (err ? reject(err) : resolve(data)))
  );

export const asyncExec = async (command: string): Promise<string> => {
  console.log(command);
  return new Promise((resolve, reject) =>
    exec(command, (err, stdout) => {
      console.log('EXEC', err, stdout);
      return err ? reject(err) : resolve(stdout);
    })
  );
};

export const sleep = (timeout) =>
  new Promise((resolve) => setTimeout(resolve, timeout));

export const spawnCommand = (command, args, { wait, logFn }) => {
  const child = spawn(command, args, {});
  child.stderr.pipe(process.stderr);
  let awaitResolver;

  const awaiter = new Promise((resolve) => {
    awaitResolver = resolve;
  });

  if (logFn) {
    child.stdout.on('data', (chunk) => logFn(chunk, awaitResolver));
  }

  if (wait) {
    let lastChunkString;

    child.stdout.on('data', (chunk) => {
      console.log(chunk.toString());
      if (`${lastChunkString}${chunk.toString()}`.includes(wait)) {
        awaitResolver();
      }

      lastChunkString = chunk.toString();
    });

    return { process: child, awaiter };
  }

  child.on('exit', awaitResolver);

  return { process: child, awaiter };
};

export const refineLs = (lsResult): Array<LSResult> => {
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

export const deepSearchUniqueMeaningfulStringsFromObject = (obj, arr = []) => {
  for (const prop in obj) {
    if (obj.hasOwnProperty(prop)) {
      if (typeof obj[prop] === 'object') {
        deepSearchUniqueMeaningfulStringsFromObject(obj[prop], arr);
      } else if (typeof obj[prop] === 'string') {
        if (arr.indexOf(obj[prop]) === -1) {
          arr.push(obj[prop]);
        }
      }
    }
  }
  return arr;
};

export const withAsyncBandwidth = (
  array,
  asyncMapper,
  { bandwidth = 5 } = {}
) => {
  if (bandwidth < 2) throw new Error('Bandwidth must bigger than 1');

  const entries = [...array];
  const chainedResponses = new Array(bandwidth)
    .fill()
    .map(() => new Promise((resolve) => resolve()));
  let iterator = 0;
  let index = 0;

  while (entries.length) {
    const currentEntry = entries.shift();
    const currentIndex = index;

    const beforeResponse = chainedResponses[iterator];

    chainedResponses[iterator] = beforeResponse.then(() =>
      asyncMapper(currentEntry, currentIndex)
    );

    index += 1;
    if (iterator < bandwidth - 1) {
      iterator += 1;
    } else {
      iterator = 0;
    }
  }

  return chainedResponses;
};

export const compareVersion = (prev, next) => {
  const prevSplit = prev.split('.').map(parseFloat);
  const nextSplit = next.split('.').map(parseFloat);

  for (let majority = 0; majority < prevSplit.length; majority += 1) {
    const prevVersion = prevSplit[majority];
    const nextVersion = nextSplit[majority];

    if (prevVersion > nextVersion || !nextVersion) {
      return 1;
    }
    if (nextVersion > prevVersion) {
      return -1;
    }
  }

  return 0;
};

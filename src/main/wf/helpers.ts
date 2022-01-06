export const asyncMkdir = (...args) =>
  new Promise((resolve) => fs.mkdir(...args, resolve));

export const asyncReadFile = (...args) =>
  new Promise((resolve) => fs.readFile(...args, (err, data) => resolve(data)));

export const asyncExec = async (command: string): Promise<string> =>
  new Promise((resolve, reject) =>
    exec(command, (err, stdout) => (err ? reject(err) : resolve(stdout)))
  );

export const sleep = (timeout) =>
  new Promise((resolve) => setTimeout(resolve, timeout));

export const spawnCommand = (command, args, { wait }) => {
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

const DIR_CACHE = {};

export const createAndCacheDirectory = async (dir) => {
  await asyncMkdir(dir, { recursive: true });
  DIR_CACHE[dir] = true;
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

export const getDeviceList = async () => {
  const devices = await asyncExec(`${ADB_PATH} devices`);

  return devices
    .split(/[\r]{0,}\n/)
    .slice(1)
    .filter((val) => val);
};

export const tryConnect = async () => {
  await Promise.all(
    NOX_PORT_LIST.map((port) =>
      asyncExec(`${ADB_PATH} connect 127.0.0.1:${port}`)
    )
  );
  return true;
};

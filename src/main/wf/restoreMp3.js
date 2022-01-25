const { readFile, writeFile } = require('fs/promises');
const iconv = require('iconv-lite');

const hexesToBin = (hexString) => {
  return hexString
    .match(/.{2}/g)
    .map((hex) => parseInt(hex, 16).toString(2).padStart(8, '0'))
    .reduce((acc, cur) => acc + cur, '');
};

const LAYER = {
  '00': 0,
  '01': 3,
  10: 2,
  11: 1,
};

const VERSION = {
  '00': 2.5,
  10: 2,
  11: 1,
};

const BITRATE_INDEX = {
  1000: {
    v1l1: '256',
    v1l2: '128',
    v1l3: '112',
    v2l1: '128',
    v2l2: '64',
    v2l3: '64',
  },
  1001: {
    v1l1: '288',
    v1l2: '160',
    v1l3: '128',
    v2l1: '144',
    v2l2: '80',
    v2l3: '80',
  },
  1010: {
    v1l1: '320',
    v1l2: '192',
    v1l3: '160',
    v2l1: '160',
    v2l2: '96',
    v2l3: '96',
  },
  1011: {
    v1l1: '352',
    v1l2: '224',
    v1l3: '192',
    v2l1: '176',
    v2l2: '112',
    v2l3: '112',
  },
  1100: {
    v1l1: '384',
    v1l2: '256',
    v1l3: '224',
    v2l1: '192',
    v2l2: '128',
    v2l3: '128',
  },
  1101: {
    v1l1: '416',
    v1l2: '320',
    v1l3: '256',
    v2l1: '224',
    v2l2: '144',
    v2l3: '144',
  },
  1110: {
    v1l1: '448',
    v1l2: '384',
    v1l3: '320',
    v2l1: '256',
    v2l2: '160',
    v2l3: '160',
  },
  1111: {
    v1l1: 'bad',
    v1l2: 'bad',
    v1l3: 'bad',
    v2l1: 'bad',
    v2l2: 'bad',
    v2l3: 'bad',
  },
  '0000': {
    v1l1: 'free',
    v1l2: 'free',
    v1l3: 'free',
    v2l1: 'free',
    v2l2: 'free',
    v2l3: 'free',
  },
  '0001': {
    v1l1: '32',
    v1l2: '32',
    v1l3: '32',
    v2l1: '32',
    v2l2: '8',
    v2l3: '8',
  },
  '0010': {
    v1l1: '64',
    v1l2: '48',
    v1l3: '40',
    v2l1: '48',
    v2l2: '16',
    v2l3: '16',
  },
  '0011': {
    v1l1: '96',
    v1l2: '56',
    v1l3: '48',
    v2l1: '56',
    v2l2: '24',
    v2l3: '24',
  },
  '0100': {
    v1l1: '128',
    v1l2: '64',
    v1l3: '56',
    v2l1: '64',
    v2l2: '32',
    v2l3: '32',
  },
  '0101': {
    v1l1: '160',
    v1l2: '80',
    v1l3: '64',
    v2l1: '80',
    v2l2: '40',
    v2l3: '40',
  },
  '0110': {
    v1l1: '192',
    v1l2: '96',
    v1l3: '80',
    v2l1: '96',
    v2l2: '48',
    v2l3: '48',
  },
  '0111': {
    v1l1: '224',
    v1l2: '112',
    v1l3: '96',
    v2l1: '112',
    v2l2: '56',
    v2l3: '56',
  },
};

const FREQUENCY = {
  1: {
    '00': 44100,
    '01': 48000,
    10: 32000,
  },
  2: {
    '00': 22050,
    '01': 24000,
    10: 16000,
  },
  2.5: {
    '00': 11025,
    '01': 12000,
    10: 8000,
  },
};

const calculateFrameSize = (binaryHeader) => {
  const mpegVersion = VERSION[binaryHeader.slice(11, 13)];
  const layer = LAYER[binaryHeader.slice(13, 15)];
  const bitrate =
    parseFloat(
      BITRATE_INDEX[binaryHeader.slice(16, 20)][
        `v${mpegVersion === 1 ? 1 : 2}l${layer}`
      ]
    ) * 1000;
  const frequency = FREQUENCY[mpegVersion][binaryHeader.slice(20, 22)];
  const padding = parseFloat(binaryHeader.slice(22, 23));

  return Math.floor((bitrate * 144) / frequency + padding);
};

const spliceBuffer = (buffer, targetIndex, deleteCount, ...items) => {
  const bufferArray = Array.from(buffer);

  bufferArray.splice(targetIndex, deleteCount, ...items);

  return Buffer.from(bufferArray);
};

const restoreCorruptedMp3 = async (filePath, debug) => {
  let file = await readFile(filePath);

  const hexString = file.toString('hex');
  if (hexString.slice(0, 6) === '494433') {
    // ID3V2
    const tit2Index = hexString.indexOf('54495432');
    if (tit2Index !== -1 && tit2Index < 1024) {
      const sizeByteIndex = (tit2Index + 8) / 2;
      const encodingByteIndex = (tit2Index + 20) / 2;
      const tit2Size = parseInt(
        hexString.slice(tit2Index + 8, tit2Index + 16),
        16
      );
      const shiftJisTitle = file.slice(
        tit2Index / 2 + 11,
        tit2Index / 2 + 11 + tit2Size - 1
      );
      const decodedTitle = iconv.decode(shiftJisTitle, 'SHIFT_JIS');
      const utf8Title = iconv.encode(decodedTitle, 'utf-16');
      file[encodingByteIndex] = 1;
      utf8Title.length
        .toString(16)
        .padStart(8, '0')
        .match(/.{2}/g)
        .map((hex) => parseInt(hex, 16))
        .forEach((sizeByte, idx) => {
          file[sizeByteIndex + idx] = sizeByte;
        });

      try {
        if (tit2Size > 1024) throw Error('TOO LARGE TIT2');
        file = spliceBuffer(file, tit2Index / 2 + 11, tit2Size, ...utf8Title);
      } catch (err) {
        console.log(debug, tit2Index, tit2Size);
      }
    }
  }

  let byteIndex = file.toString('hex').indexOf('7ffb') / 2;

  while (byteIndex < file.byteLength) {
    const header = file.slice(byteIndex, byteIndex + 4).toString('hex');
    const binaryHeader = hexesToBin(header);
    if (!/^7f/.test(header)) {
      break;
    }
    file[byteIndex] = 255;
    const frameSize = calculateFrameSize(binaryHeader);
    byteIndex += frameSize;
  }

  return file;
};

module.exports = {
  restoreCorruptedMp3,
};

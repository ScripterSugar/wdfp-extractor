const fs = require('fs');
const { readFile } = require('fs/promises');
const zlib = require('zlib');

const asyncUnzip = (...args) =>
  new Promise((resolve, reject) =>
    zlib.unzip(...args, (err, res) => (err ? reject(err) : resolve(res)))
  );

const asyncDeflate = (data) =>
  new Promise((resolve, reject) =>
    zlib.deflate(data, (err, res) => (err ? reject(err) : resolve(res)))
  );

const readOrderedMap = async (mapping) => {
  try {
    const readHeaderSize = (buffer) => buffer.readInt32LE(0);

    const headerSize = readHeaderSize(mapping);

    const zlibCompressedHeader = mapping.slice(4, headerSize + 4);
    const uncompressedHeader = await asyncUnzip(zlibCompressedHeader);

    const readHeaderData = (headerDataBuffer) => {
      const entriesCount = headerDataBuffer.readInt32LE(0);
      const entryOffsetsBuffer = headerDataBuffer.slice(
        4,
        entriesCount * 8 + 4
      );

      const entryOffsets = new Array(entriesCount)
        .fill()
        .map((_, entryIndex) => {
          const keyEndOffset = entryOffsetsBuffer.readInt32LE(entryIndex * 8);
          const dataEndOffset = entryOffsetsBuffer.readInt32LE(
            entryIndex * 8 + 4
          );

          return [keyEndOffset, dataEndOffset];
        });

      let currentKeyOffset = 0;
      const keysBuffer = headerDataBuffer.slice(entriesCount * 8 + 4);

      const keys = entryOffsets.map(([keyEndOffset]) => {
        const currentKey = keysBuffer.slice(currentKeyOffset, keyEndOffset);
        currentKeyOffset = keyEndOffset;

        return currentKey.toString('utf-8');
      });

      return {
        entryOffsets,
        keys,
      };
    };

    const { entryOffsets, keys } = readHeaderData(uncompressedHeader);

    const contentSection = mapping.slice(4 + headerSize);

    const readContentData = async (contentBuffer, offsets) => {
      let currentOffset = 0;

      const contents = offsets.map(([, dataOffset]) => {
        const content = contentBuffer.slice(currentOffset, dataOffset);
        currentOffset = dataOffset;

        return content;
      });

      return Promise.all(
        contents.map(async (content) => {
          try {
            const unzipped = await asyncUnzip(content);

            return unzipped.toString('utf-8');
          } catch (err) {
            return readOrderedMap(content);
          }
        })
      );
    };

    const values = await readContentData(contentSection, entryOffsets);

    return keys.reduce(
      (acc, key, index) => ({
        ...acc,
        [key]: values[index]?.split?.(',') || values[index],
      }),
      {}
    );
  } catch (err) {
    console.log('FAILED READING FILE DATA');
    console.log(err);

    return {};
  }
};

/* eslint-disable */
const test_1 = {
  "0": ["70000","0","alterite_r3","1","alterite_r3_a","1","alterite_r3_b","(None)","","(None)","","(None)","","(None)","","(None)","","(None)","","(None)",""],
  "1": ["10000","0","alterite_r3","1","alterite_r3_a","(None)","","(None)","","(None)","","(None)","","(None)","","(None)","","(None)","","(None)",""],
  "2": ["10000","0","alterite_r3","1","alterite_r3_b","(None)","","(None)","","(None)","","(None)","","(None)","","(None)","","(None)","","(None)",""],
  "3": ["10000","0","alterite_r3","(None)","","(None)","","(None)","","(None)","","(None)","","(None)","","(None)","","(None)","","(None)",""]
};

const testObject = {
  "alterite_r3": {
      "0": ["70000","0","alterite_r3","1","alterite_r3_a","1","alterite_r3_b","(None)","","(None)","","(None)","","(None)","","(None)","","(None)","","(None)",""],
      "1": ["10000","0","alterite_r3","1","alterite_r3_a","(None)","","(None)","","(None)","","(None)","","(None)","","(None)","","(None)","","(None)",""],
      "2": ["10000","0","alterite_r3","1","alterite_r3_b","(None)","","(None)","","(None)","","(None)","","(None)","","(None)","","(None)","","(None)",""],
      "3": ["10000","0","alterite_r3","(None)","","(None)","","(None)","","(None)","","(None)","","(None)","","(None)","","(None)","","(None)",""]
  }
};
/* eslint-enable */

const createOrderedMap = async (targetObject) => {
  const keys = Object.keys(targetObject).map((key) => Buffer.from(key));

  const values = await Promise.all(
    Object.values(targetObject).map(async (value) =>
      Array.isArray(value)
        ? asyncDeflate(value.join(','))
        : createOrderedMap(value)
    )
  );

  let keyOffset = 0;
  let valueOffset = 0;

  const entryOffsets = keys.map((key, idx) => {
    const value = values[idx];

    keyOffset += key.length;
    valueOffset += value.length;

    const entryBuffer = Buffer.alloc(8);

    entryBuffer.writeInt32LE(keyOffset, 0);
    entryBuffer.writeInt32LE(valueOffset, 4);

    return entryBuffer;
  }).reduce((acc, buf) => Buffer.concat([acc, buf]), Buffer.alloc(0));

  console.log(entryOffsets);
};

const openAndReadOrderedMap = async (fileName) => {
  const openedFile = await readFile(fileName);
  return readOrderedMap(openedFile);
};

module.exports = {
  openAndReadOrderedMap,
  readOrderedMap,
};

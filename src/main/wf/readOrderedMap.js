const fs = require('fs');
const zlib = require('zlib');

const readOrderedMap = (mapping) => {
  try {
    const readHeaderSize = (buffer) => buffer.readInt32LE(0);

    const headerSize = readHeaderSize(mapping);

    const zlibCompressedHeader = mapping.slice(4, headerSize + 4);
    const uncompressedHeader = zlib.unzipSync(zlibCompressedHeader);

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

    const readContentData = (contentBuffer, offsets) => {
      let currentOffset = 0;

      const contents = offsets.map(([, dataOffset]) => {
        const content = contentBuffer.slice(currentOffset, dataOffset);
        currentOffset = dataOffset;

        return content;
      });

      return contents.map((content) => {
        try {
          const unzipped = zlib.unzipSync(content);

          return unzipped.toString('utf-8');
        } catch (err) {
          return readOrderedMap(content);
        }
      });
    };

    const values = readContentData(contentSection, entryOffsets);

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

const openAndReadOrderedMap = (fileName) => {
  const openedFile = fs.readFileSync(fileName);
  return readOrderedMap(openedFile);
};

module.exports = {
  openAndReadOrderedMap,
  readOrderedMap,
};

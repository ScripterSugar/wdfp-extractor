const crypto = require('crypto');

const digest = (originText) => {
  const shasum = crypto.createHash('sha1');
  shasum.update(`${originText}K6R9T9Hz22OpeIGEWB0ui6c6PYFQnJGy`);
  return shasum.digest('hex');
};

module.exports = {
  digestWfFileName: digest,
};

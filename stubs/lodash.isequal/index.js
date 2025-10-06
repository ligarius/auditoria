const { isDeepStrictEqual } = require('node:util');

function isEqual(value, other) {
  return isDeepStrictEqual(value, other);
}

module.exports = isEqual;
module.exports.default = isEqual;

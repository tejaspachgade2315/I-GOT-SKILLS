const { v4: uuidv4 } = require('uuid');

function generateApiKey() {
  return `ak_${uuidv4().replace(/-/g, '')}`;
}

module.exports = { generateApiKey };

const fs = require('fs');
const path = require('path');

function loadModels() {
  const file = path.join(__dirname, '..', 'config', 'models.json');
  const raw = fs.readFileSync(file, 'utf-8');
  return JSON.parse(raw);
}

module.exports = loadModels;
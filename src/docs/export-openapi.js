const fs = require('node:fs');
const path = require('node:path');
const document = require('./openapi.js');

const target = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.join(__dirname, 'openapi.integrado.json');

fs.writeFileSync(target, JSON.stringify(document, null, 2) + '\n');

console.log(`Especificación integrada exportada: ${target}`);

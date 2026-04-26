#!/usr/bin/env node

const wendy = require('./wendy.js');
const url = process.argv[2];

if (!url) {
  console.error('Usage: wendy <url>');
  process.exit(1);
}

wendy(url);
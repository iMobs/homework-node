'use strict'

const axios = require('axios');
const download = require('download');
const Promise = require('bluebird');

// Hard Code the packages for now
const packages = [
  'lodash',
  'request',
  'chalk',
  'async',
  'express',
  'bluebird',
  'react',
  'commander',
  'debug',
  'moment'
]

module.exports = downloadPackages;

async function downloadPackages (count, callback) {
  await Promise.map(packages, downloadPackage);

  // Finally invoke the callback to signal we're done
  if (typeof callback === 'function') {
    callback();
  }
}

const downloadPackage = async (packageName) => {
  const { data } = await axios.get(`https://registry.npmjs.com/${packageName}`);

  const version = data['dist-tags'].latest;
  
  const latestVersion = data.versions[version];
  
  const { tarball } = latestVersion.dist;
  
  await download(tarball, `./packages/${packageName}`, {
    extract: true,
  });
};

'use strict'

const axios = require('axios');
const cheerio = require('cheerio');
const del = require('del');
const download = require('download');
const Promise = require('bluebird');

module.exports = async (count, callback) => {
  await del('./packages/*');

  const packages = await getPackageList(count);

  await Promise.map(packages, downloadPackage);

  // Finally invoke the callback to signal we're done
  if (typeof callback === 'function') {
    callback();
  }
};

const getPackageList = async (count) => {
  const packages = [];

  while (packages.length < count) {
    // Get the most-depended-upon page
    const { data } = await axios.get('https://www.npmjs.com/browse/depended', {
      params: {
        offset: packages.length,
      },
    });

    // Load it into the parser
    const $ = cheerio.load(data);

    // Select all package detail names (easiest place to find what we want)
    $('.package-details a.name').each(function() {
      // Push package name into list
      packages.push($(this).text());

      // Bail out if target count is reached
      if (packages.length === count) {
        return false;
      }
    });
  }

  return packages;
};

const downloadPackage = async (packageName) => {
  const { data } = await axios.get(`https://registry.npmjs.com/${packageName}`);

  const version = data['dist-tags'].latest;
  
  const latestVersion = data.versions[version];
  
  const { tarball } = latestVersion.dist;
  
  await download(tarball, `./packages/${packageName}`, {
    extract: true,
  });
};

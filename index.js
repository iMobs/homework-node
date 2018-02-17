'use strict'

const axios = require('axios');
const cheerio = require('cheerio');
const del = require('del');
const download = require('download');
const fs = require('fs-extra');

module.exports = async (count, callback) => {
  try {
    await del('./packages/*');
  
    const packages = await getPackageList(count);
  
    await Promise.all(packages.map(downloadPackage));
  
    // Finally invoke the callback to signal we're done
    if (typeof callback === 'function') {
      callback();
    }
  } catch (error) {
    console.error('Failed to download packages:', error.message);
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

  const packagePath = `./packages/${packageName}`;
  
  await download(tarball, packagePath, {
    extract: true,
  });

  // Gotta move the contents of $packageName/package up
  const contents = await fs.readdir(`${packagePath}/package`);

  await Promise.all(contents.map(file => {
    const oldPath = `${packagePath}/package/${file}`;
    const newPath = `${packagePath}/${file}`;

    return fs.move(oldPath, newPath);
  }));

  fs.remove(`${packagePath}/package`);
};

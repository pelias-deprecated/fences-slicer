var fs = require('fs-extra');
var path = require('path');
var async = require('async');
var geojsonSlicer = require('./geojsonSlicer');
var colors = require('colors');

/**
 * Create output files with any polygons
 * overlapping the specified regions.
 *
 * @param {[]} regions
 * @param {string} inputDir
 * @param {string} outputDir
 */
module.exports = function run(regions, inputDir, outputDir) {

  if (!fs.existsSync(inputDir)) {
    console.error(colors.red('[Error]:'), 'Input directory does not exist');
    process.exit(1);
  }

  var inputFiles = fs.readdirSync(inputDir);

  if (inputFiles.length === 0) {
    console.error(colors.red('[Error]:'), 'No geojson files found for slicing!');
    process.exit(1);
  }

  console.log('Slicing these files: ', inputFiles);

  async.forEach(
    inputFiles,
    processFile.bind(null, regions, inputDir, outputDir),
    function (code) {
      if (code) {
        process.exit(code);
      }
    }
  );
};

/**
 * Process single file
 *
 * @param {string} regions
 * @param {string} inputDir
 * @param {string} outputDir
 * @param {string} inputFile
 * @param {function} callback
 * @returns {*}
 */
function processFile(regions, inputDir, outputDir, inputFile, callback) { // jshint ignore:line

  // skip non geojson files
  if (path.extname(inputFile) !== '.geojson') {
    process.nextTick(callback);
    return;
  }

  var regionResults = regions.map(function (region) {
    return {
      outputFile: getOutputFile(outputDir, inputFile, region.name),
      box: region.box
    };
  });

  geojsonSlicer.extractRegions(
    getInputFile(inputDir, inputFile),
    regionResults,
    function () {
      console.log('Extractions done for ', inputFile);
      callback();
    }
  );
}

function getInputFile(dir, file) {
  return path.join(dir, file);
}

function getOutputFile(dir, file, region) {
  fs.ensureDirSync(path.join(dir, region));
  return path.join(dir, region, file);
}
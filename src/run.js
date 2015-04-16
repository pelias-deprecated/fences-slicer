var fs = require('fs-extra');
var path = require('path');
var async = require('async');
var colors = require('colors');
var fork = require('child_process').fork;

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

  var inputFiles = fs.readdirSync(inputDir).filter(function (file) {
    return path.extname(file) === '.geojson';
  });

  if (inputFiles.length === 0) {
    console.error(colors.red('[Error]:'), 'No geojson files found for slicing!');
    process.exit(1);
  }

  console.log('Slicing these files: ', inputFiles);

  async.forEach(
    inputFiles,
    processFile.bind(null, regions, inputDir, outputDir),
    function (code) {
      process.exit(code || 0);
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

  var regionResults = regions.map(function (region) {
    return {
      outputFile: getOutputFile(outputDir, inputFile, region.name),
      box: region.box
    };
  });

  var child = fork(__dirname + '/childProcess.js', [], { silent: false });

  child.on('exit', function (code) {
    console.log(colors.blue('[Info]:'), 'Finished slicing', inputFile);
    if (code !== 0) {
      callback(code || 100);
    }
    else {
      callback();
    }
  });

  console.log(colors.blue('[Info]:'), 'Starting on', inputFile);

  child.send({
    type: 'start',
    data: {
      inputFile: getInputFile(inputDir, inputFile),
      regions: regionResults
    }
  });
}

function getInputFile(dir, file) {
  return path.join(dir, file);
}

function getOutputFile(dir, file, region) {
  fs.ensureDirSync(path.join(dir, region));
  return path.join(dir, region, file);
}
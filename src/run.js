var fs = require('fs-extra');
var path = require('path');
var async = require('async');
var colors = require('colors');
var fork = require('child_process').fork;

/**
 * Create output files with any polygons
 * overlapping the specified regions.
 *
 * @param {string} regionFile
 * @param {string} inputDir
 * @param {string} outputDir
 */
module.exports = function run(regionFile, inputDir, outputDir) {

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
    processFile.bind(null, regionFile, inputDir, outputDir),
    function (code) {
      process.exit(code || 0);
    }
  );
};

/**
 * Process single file
 *
 * @param {string} regionFile
 * @param {string} inputDir
 * @param {string} outputDir
 * @param {string} inputFile
 * @param {function} callback
 * @returns {*}
 */
function processFile(regionFile, inputDir, outputDir, inputFile, callback) { // jshint ignore:line

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
      inputDir: inputDir,
      inputFile: inputFile,
      outputDir: outputDir,
      regionFile: regionFile
    }
  });
}

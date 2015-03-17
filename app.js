var fs = require('fs');
var path = require('path');
var async = require('async');
var geojsonSlicer = require('./');
var nconf = require('nconf');
var colors = require('colors');

// setup config
nconf.argv().env();

if (nconf.get('config')) {
  nconf.file({file: nconf.get('config')});
}

if (! (nconf.get('inputDir') && nconf.get('outputDir') && nconf.get('regions')) ) {
  console.error(colors.red('[Invalid usage]:'),
    'Must specify inputDir, outputDir, and regions. If using config file, use --config=<path>');
  process.exit(1);
}


(function run() {
  var inputFiles = fs.readdirSync(nconf.get('inputDir'));

  function processFile(inputFile, callback) {
    // skip non geojson files
    if (path.extname(inputFile) !== '.geojson') {
      return callback();
    }

    var regions = [];
    nconf.get('regions').forEach(function (region) {
      regions.push({
        outputFile: getOutputFile(nconf.get('outputDir'), inputFile, region.name),
        box: region.box
      });
    });

    geojsonSlicer.extractRegion(
      getInputFile(nconf.get('inputDir'), inputFile),
      regions,
      function () {
        console.log('Extractions done for ', inputFile);
        callback();
      });
  }

  console.log(inputFiles);

  async.forEach(inputFiles, processFile, function () {
      console.log('All done!');
    });
})();

function getInputFile(dir, file) {
  return path.join(dir, file);
}

function getOutputFile(dir, file, region) {
  return dir + region + '--' + file;
}

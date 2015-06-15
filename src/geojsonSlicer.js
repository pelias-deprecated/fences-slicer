var fs = require('fs-extra');
var path = require('path');
var through2 = require('through2');
var geojsonStream = require('geojson-stream');
var intersectionFilterStream = require('./intersectionFilterStream');
var progress = require('progress-stream');
var stats = require('./stats');


/**
 * Extract data in inputFile that overlaps the given region
 *
 * @param {object} params
 * @param {string} params.inputDir
 * @param {string} params.inputFile
 * @param {string} params.outputDir
 * @param {string} params.regionFile
 * @param {function} callback
 */
function extractRegions(params, callback) {
  var inputFile = getInputFile(params.inputDir, params.inputFile);

  validatePath(inputFile);

  var stat = fs.statSync(inputFile);
  var progressStream = progress({
    length: stat.size,
    time: 1000
  });

  progressStream.on('progress', function (p) {
    stats.set('progress:' + params.inputFile, Math.floor(p.percentage));
  });

  // Because of the offshoot streams, we must keep track of how many were started
  // and how many ended in order to invoke the callback at the correct time,
  // which is after all the output files have been closed.
  var streamCount = 0;
  function endCounter() {
    streamCount--;
    if (streamCount === 0) {
      callback();
    }
  }

  // pipe to each region stream
  createRegionStreams(params, endCounter, function (err, regionStreams) {

    streamCount = regionStreams.length;
    if (streamCount === 0) {
      throw new Error('No regions found');
    }

    // create input stream and pipe to geojson parser
    var dataStream = fs.createReadStream(inputFile)
      .pipe(progressStream)
      .pipe(geojsonStream.parse());

    regionStreams.forEach(function (s) {
      dataStream.pipe(s);
    });
  });
}

/**
 * Create a stream per region in specified regions file
 *
 * @param {object} params
 * @param {function} endCounter
 * @param {function} callback (err, regionStreams:[])
 */
function createRegionStreams(params, endCounter, callback) {
  var regionStreams = [];

  var stream = fs.createReadStream(params.regionFile)
    .pipe(geojsonStream.parse())
    .pipe(through2.obj(function (data, enc, callback) {
      var outputFile = getOutputFile(params.outputDir, data.properties.name, params.inputFile);
      regionStreams.push(extractRegionOffshoot(outputFile, data, endCounter));

      this.push('Created pipe for ' + params.inputFile + ' to region ' + data.properties.name + '\n');
      callback();
    }));

  stream.pipe(process.stdout);

  stream.on('finish', function () {
    callback(null, regionStreams);
  });
}

/**
 * Create through steam that filters out objects that don't lie within the given region.
 * Incoming objects are expected to be GEOJSON objects with valid Polygon|Multipolygon geometries.
 *
 * @param {string} outputFile
 * @param {number[]} region [x1,y1,x2,y2]
 * @param {function} callback optional callback function on completion of stream
 * @returns {Stream}
 */
function extractRegionOffshoot(outputFile, region, callback) {
  var inputStream = intersectionFilterStream(outputFile, region);

  var stream = inputStream
    .pipe(geojsonStream.stringify())
    .pipe(fs.createWriteStream(outputFile));

  if (callback) {
    stream.on('finish', function () {
      callback();
    });
  }

  return inputStream;
}

function validatePath(path) {
  if (!fs.existsSync(path)) {
    console.error(path + ' does not exist');
    process.exit(1);
  }
}

function getInputFile(dir, file) {
  return path.resolve(path.join(dir, file));
}

function getOutputFile(dir, region, file) {
  fs.ensureDirSync(path.join(dir, region));
  return path.resolve(path.join(dir, region, file));
}

module.exports.extractRegions = extractRegions;

// exposed to ease testing
module.exports.getOutputFile = getOutputFile;
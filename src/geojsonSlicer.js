var async = require('async');
var fs = require('fs-extra');
var path = require('path');
var through2 = require('through2');
var geojsonStream = require('geocodejson-stream');
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

  // Because of the offshoot streams, we must keep track of how many were started
  // and how many ended in order to invoke the callback at the correct time,
  // which is after all the output files have been closed.
  var context = {
    inputFile: inputFile,
    params: params,
    callback: callback,
    streamCount: 0,
    endCounter: function endCounter() {
      this.streamCount--;
      if (this.streamCount === 0) {
        this.callback();
      }
    }
  };

  async.waterfall(
    [
      parseGeocodingInfo.bind(null, inputFile), // step-1
      createRegionStreams.bind(context), // step-2
      checkRegionCount.bind(context), // step-3
      pipeInputToRegionStreams.bind(context) // step-4
    ],
    function (err) {
      if (err) {
        throw err;
      }
    }
  );
}


/**
 * STEP 1
 *
 * Grab geocoding info block from input file
 *
 * @param {string} inputFile
 * @param {function} callback (err, geocodingInfo)
 */
function parseGeocodingInfo(inputFile, callback) {
  var found = false;
  var readStream = fs.createReadStream(inputFile);

  var geoStream = readStream.pipe(geojsonStream.parseGeocoding());

  // if geocoding block is found, pass it on to the callback
  geoStream.on('data', function (data) {
    found = true;
    readStream.destroy();
    callback(null, data);
  });

  // if end of file is reached and no geocoding is found, that's bad news!
  geoStream.on('end', function () {
    if (found) {
      return;
    }
    callback(null, {timestamp: Date.now()});
  });
}


/**
 * STEP 2
 *
 * Create a stream per region in specified regions file
 *
 * @this {object} { params: {
 *                    regionFile: {string},
 *                    outputDir: {string},
 *                    inputFile: {string} } }
 * @param {object} geocodingInfo properties copied from original input geocodejson file
 * @param {function} callback (err, regionStreams:[])
 */
function createRegionStreams(geocodingInfo, callback) {
  var context = this;
  var regionStreams = [];

  var stream = fs.createReadStream(context.params.regionFile)
    .pipe(geojsonStream.parse())
    .pipe(through2.obj(function (data, enc, callback) {
      var outputFile = getOutputFile(context.params.outputDir, data.properties.name, context.params.inputFile);
      regionStreams.push(extractRegionOffshoot(geocodingInfo, outputFile, data, context.endCounter.bind(context)));

      this.push('Created pipe for ' + context.params.inputFile + ' to region ' + data.properties.name + '\n');
      callback();
    }));

  stream.pipe(process.stdout);

  stream.on('finish', function () {
    callback(null, regionStreams);
  });
}


/**
 * STEP 3
 *
 * Check region count isn't 0
 *
 * @this {object} { params: { streamCount: {number} } }
 * @param {array} regionsStreams
 * @param {function} callback(err, regionStreams)
 */
function checkRegionCount(regionsStreams, callback) {
  this.streamCount = regionsStreams.length;
  if (this.streamCount === 0) {
    return callback(new Error('No regions found'));
  }
  callback(null, regionsStreams);
}


/**
 * STEP 4
 *
 * Pipe input geojson into each of the created region streams
 * where it will be sliced based on the region specified for each stream
 *
 * @param regionStreams
 * @param callback
 */
function pipeInputToRegionStreams(regionStreams, callback) {
  // create input stream and pipe to geojson parser
  var dataStream = fs.createReadStream(this.inputFile)
    .pipe(createProgressStream(this.inputFile))
    .pipe(geojsonStream.parse());

  regionStreams.forEach(function (s) {
    dataStream.pipe(s);
  });

  callback();
}


// ===========================
//      HELPER FUNCTIONS
// ===========================

/**
 * Create a progress stream for given input file
 *
 * @param inputFile
 * @returns {Stream}
 */
function createProgressStream(inputFile) {
  // create progress stream for input geojson file
  var stat = fs.statSync(inputFile);
  var progressStream = progress({
    length: stat.size,
    time: 1000
  });

  // update stats on progress notifications
  progressStream.on('progress', function (p) {
    stats.set('progress:' + inputFile, Math.floor(p.percentage));
  });

  return progressStream;
}

/**
 * Create through steam that filters out objects that don't lie within the given region.
 * Incoming objects are expected to be GEOJSON objects with valid Polygon|Multipolygon geometries.
 *
 * @param {object} geocodingInfo properties copied from original input geocodejson file
 * @param {string} outputFile
 * @param {number[]} region [x1,y1,x2,y2]
 * @param {function} callback optional callback function on completion of stream
 * @returns {Stream}
 */
function extractRegionOffshoot(geocodingInfo, outputFile, region, callback) {
  var inputStream = intersectionFilterStream(outputFile, region);

  var stream = inputStream
    .pipe(geojsonStream.stringify(geocodingInfo))
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
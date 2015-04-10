var fs = require('fs-extra');
var through = require('through2');
var terminus = require('terminus');
var turf = require('turf');
var geojsonStream = require('geojson-stream');
var intersectionFilterStream = require('./intersectionFilterStream');

/**
 * Extract data in inputFile that overlaps the given region
 *
 * @param {string} inputFile
 * @param {object[]} regions [{ outputFile, box }]
 * @param {function} callback
 */
function extractRegions(inputFile, regions, callback) {
  validatePath(inputFile);

  // Because of the offshoot streams, we must keep track of how many were started
  // and how many ended in order to invoke the callback at the correct time,
  // which is after all the output files have been closed.
  var streamCount = regions.length;
  function endCounter() {
    streamCount--;
    if (streamCount === 0) {
      callback();
    }
  }

  // create input stream and pipe to geojson parser
  var stream = fs.createReadStream(inputFile).pipe(geojsonStream.parse());

  // in order to avoid parsing the large input file more than once, we need to
  // pipe the data through to all the region extraction streams, one after the other.
  regions.forEach(function (region) {
    validateRegion(region.box);
    stream = stream.pipe(passthroughStream(extractRegionOffshoot(region.outputFile, region.box, endCounter)));
  });

  stream.pipe(terminus.devnull({objectMode: true}));
}

/**
 * Create a pass-through stream that will write data
 * to the input stream and pass it along as is.
 *
 * @param {Stream} stream
 * @returns {Stream}
 */
function passthroughStream(stream) {
  return through.obj(
    function pass(data, enc, callback) {
      stream.write(data);
      this.push(data);
      callback();
    },
    function end(callback) {
      stream.end();
      callback();
    }
  );
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
  var inputStream = intersectionFilterStream(turf.bboxPolygon(region));

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

/**
 * Check that region has name and box
 *
 * @param {object} region
 */
function validateRegion(region) {
  if (region instanceof Array && region.length === 4 ) {
    return;
  }
  throw new Error('Invalid region', region);
}

function validatePath(path) {
  if (!fs.existsSync(path)) {
    throw new Error(path + ' does not exist');
  }
}

module.exports.extractRegions = extractRegions;
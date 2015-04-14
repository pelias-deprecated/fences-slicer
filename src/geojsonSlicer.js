var fs = require('fs-extra');
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
  var stream = fs.createReadStream(inputFile)
    .pipe(geojsonStream.parse());

  // pipe to each region stream
  var regionStreams = createRegionStreams(regions, endCounter);
  regionStreams.forEach(function (s) {
    stream.pipe(s);
  });
}

function createRegionStreams(regions, endCounter) {
  return regions.map(function (region) {
    validateRegion(region.box);
    return extractRegionOffshoot(region.outputFile, region.box, endCounter);
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
  var boundingBox = turf.bboxPolygon([
    region.sw.longitude,
    region.sw.latitude,
    region.ne.longitude,
    region.ne.latitude
  ]);
  var inputStream = intersectionFilterStream(boundingBox);

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
  if (region.hasOwnProperty('sw') &&
      region.hasOwnProperty('ne') &&
      region.sw.hasOwnProperty('latitude') &&
      region.ne.hasOwnProperty('latitude') &&
      region.sw.hasOwnProperty('longitude') &&
      region.ne.hasOwnProperty('longitude')) {
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
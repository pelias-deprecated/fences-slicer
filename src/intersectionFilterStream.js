var through2 = require('through2');
var geoUtils = require('./util');
var stats = require('./stats');
var PolygonLookup = require('polygon-lookup');
var simplify = require('simplify-geojson');

/**
 * Returns a through stream that only propagates data that overlaps the
 * region specified at creation time
 *
 * @param {string} streamId identifier for stream instance
 * @param {[]} regionPoly bounding region with which incoming data should overlap
 * @param {Stream} [errorStream] optional error stream, defaults to stderr
 * @returns {*}
 */
module.exports = function intersectionFilterStream(streamId, regionPoly, errorStream)
{
  var bbox = geoUtils.getBoundingBox(regionPoly);
  var lookup = new PolygonLookup(geoUtils.getFeatureCollection([regionPoly]));

  return through2.obj(function (data, enc, callback) {
    try {
      var bboxData = geoUtils.getBoundingBox(data);

      if( geoUtils.isInside(bbox, bboxData) ) {
        stats.increment('bbox_overlap');

        var center = geoUtils.getCenter(simplify(data, 0.001));

        if (geoUtils.isPointInside(lookup, center)) {
          stats.increment('centroid_inside_region');
          this.push(data);
        }
        else {
          stats.increment('centroid_outside_region');
        }
      }
      else {
        stats.increment('no_bbox_overlap');
      }
    }
    catch (ex) {
      handleException(streamId, errorStream, data, ex);
    }
    callback();
  });
};

function handleException(streamId, errorStream, data, ex) {
  stats.increment('exceptions');

  var err = {
    message: ex.message
  };

  if (errorStream) {
    err.data = data;
    err.stack = ex.stack;
    errorStream.write(JSON.stringify(err, null, 2));
  }
  else {
    err.data = {
      properties: data.properties
    };
    console.error('[Exception]: ', '[' + streamId + ']', JSON.stringify(err, null, 2), ex.stack);
  }
}
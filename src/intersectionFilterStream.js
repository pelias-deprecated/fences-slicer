var through2 = require('through2');
var geoUtils = require('./util');
var stats = require('./stats');
var PolygonLookup = require('polygon-lookup');
var simplify = require('simplify-geojson');

/**
 * Returns a through stream that only propagates data that overlaps the
 * region specified at creation time
 *
 * @param {[]} regionPoly bounding region with which incoming data should overlap
 * @param {Stream} [errorStream] optional error stream, defaults to stderr
 * @returns {*}
 */
module.exports = function intersectionFilterStream(regionPoly, errorStream)
{
  var bbox = geoUtils.getBoundingBox(regionPoly);
  var lookup = new PolygonLookup(geoUtils.getFeatureCollection([regionPoly]));

  return through2.obj(function (data, enc, callback) {
    try {
      var bboxData = geoUtils.getBoundingBox(data);

      if( geoUtils.isInside(bbox, bboxData) ) {
        stats.increment('bbox_overlap');

        if (geoUtils.isPointInside(lookup, geoUtils.getCenter(simplify(data, 0.001)))) {
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
      handleException(errorStream, data, ex);
    }
    callback();
  });
};

function handleException(errorStream, data, ex) {
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
      name: data.name
    };
    console.error('[Exception]:', JSON.stringify(err), ex.stack);
  }
}
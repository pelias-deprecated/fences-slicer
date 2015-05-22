var through2 = require('through2');
var geoUtils = require('./util');

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

  return through2.obj(function (data, enc, callback) {
    try {
      if( geoUtils.isInside(bbox, data) && geoUtils.isInside(regionPoly, data)) {
        this.push(data);
      }
    }
    catch (ex) {
      handleException(errorStream, data, ex);
    }
    callback();
  });
};

function handleException(errorStream, data, ex) {
  var err = {
    message: ex.message
  };

  if (errorStream) {
    err.data = data;
    errorStream.write(JSON.stringify(err));
  }
  else {
    err.data = {
      name: data.name
    };
    console.error('[Exception]:', JSON.stringify(err), ex.stack);
  }
}
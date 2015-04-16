var turf = require('turf');
var through2 = require('through2');

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
  return through2.obj(function (data, enc, callback) {
    try {
      var intersection = turf.intersect(regionPoly, data);
      if (intersection) {
        this.push(data);
      }
    }
    catch(ex) {
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
        console.error('[Exception]:', JSON.stringify(err));
      }
    }
    callback();
  });
};
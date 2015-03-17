var turf = require('turf');
var through2 = require('through2');

module.exports = function (regionPoly)
{
  return through2.obj(function (data, enc, callback) {
    try {
      var intersection = turf.intersect(regionPoly, data);
      if (intersection) {
        this.push(data);
      }
    }
    catch(ex) {
      console.error('Exception caught:', ex.message, JSON.stringify(regionPoly), JSON.stringify(data));
    }
    callback();
  });
};
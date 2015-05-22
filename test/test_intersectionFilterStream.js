var proxyquire = require('proxyquire');

proxyquire.noPreserveCache();
proxyquire.noCallThru();

module.exports.tests = {};

module.exports.tests.interface = function(test) {
  test('turf error', function (t) {

    var regionPoly = {
      type: 'Feature',
      properties: {'name': 'admin_area'},
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [ 1, 1 ],
          [ 2, 2 ],
          [ 3, 3 ],
          [ 4, 4 ]
        ]]
      }
    };

    var box = {
      type: 'Feature',
      properties: {'name': 'box'},
      geometry: {
        type: 'Polygon',
          coordinates: [[
          [ 11, 11 ],
          [ 12, 12 ],
          [ 13, 13 ],
          [ 14, 14 ]
        ]]
      }
    };

    var data = {
      foo: 'bar'
    };
    var error = new Error('bad things are a happenin');

    var utilsMock = {
      getBoundingBox: function (feature) {
        t.equal(feature, regionPoly, 'region polygon used');
        return box;
      },
      isInside: function (bbox, feature) {
        t.deepEqual(bbox, box, 'bounding box used');
        t.deepEqual(feature, data, 'data is used');
        throw error;
      }
    };
    var filter = proxyquire('../src/intersectionFilterStream', { './util': utilsMock });

    var errorStream = {
      write: function (err) {
        err = JSON.parse(err);
        t.deepEqual(err.message, error.message, 'exception message sent to error stream');
        t.deepEqual(err.data, data, 'exception causing data sent to error stream');
        t.end();
      }
    };

    var stream = filter(regionPoly, errorStream);
    stream.write(data);
  });
};


module.exports.all = function (tape, common) {

  function test(name, testFunction) {
    return tape('intersectionFilterStream ' + name, testFunction);
  }

  for( var testCase in module.exports.tests ){
    module.exports.tests[testCase](test, common);
  }
};

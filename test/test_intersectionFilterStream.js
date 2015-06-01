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

    var boxes = {
      region: {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [[
            [11, 11],
            [12, 12],
            [13, 13],
            [14, 14]
          ]]
        }
      },
      data: {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [[
            [111, 111],
            [122, 122],
            [133, 133],
            [144, 144]
          ]]
        }
      }

    };

    var data = {
      type: 'Feature',
      properties: {'name': 'somedata'},
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [111, 111],
          [122, 122],
          [133, 133],
          [144, 144]
        ]]
      }
    };

    var error = new Error('bad things are a happenin');

    var utilsMock = {
      getFeatureCollection: function (featureArray) {
        t.assert(featureArray instanceof Array, 'features are an array');
        t.deepEqual(featureArray[0], regionPoly, 'region is passed in');
        return {
          'type': 'FeatureCollection',
          'features': featureArray
        };
      },
      getBoundingBox: function (feature) {
        t.assert(feature === regionPoly || feature === data, 'region polygon used');
        if (feature === regionPoly) {
          return boxes.region;
        }
        else {
          return boxes.data;
        }
      },
      isInside: function (bbox, feature) {
        t.deepEqual(bbox, boxes.region, 'bounding box of region is used');
        t.deepEqual(feature, boxes.data, 'bounding box of input data is used');
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

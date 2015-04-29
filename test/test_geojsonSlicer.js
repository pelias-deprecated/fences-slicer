var slicer = require('../');
var fs = require('fs');

module.exports.tests = {};

function before() {

  var context = {};

  context.inputFile = './tmpInputFile.geojson';
  context.outputFile = './tmpOutputFile.geojson';

  context.data = {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: {'name': 'admin_area'},
        geometry: {
          type: 'Polygon',
          coordinates: [[
            [ -74.4488525390625, 41.147637985391874 ],
            [ -73.68255615234368, 41.073139733293424 ],
            [ -73.2733154296875, 40.66188943992171 ],
            [ -73.95996093749999, 40.52215098562377 ],
            [ -74.45159912109375, 40.71603763556807 ],
            [ -74.4488525390625, 41.147637985391874 ]
          ]]
        }
      }
    ]
  };

  fs.writeFileSync(context.inputFile, JSON.stringify(context.data));

  context.regions = {
    inside: {
      left: -74.26895141601562,
      bottom: 40.73997376331186,
      right: -73.729248046875,
      top: 41.00477542222949
    },
    outside: {
      left: -74.014892578125,
      bottom: 41.19828983779905,
      right: -73.62075805664062,
      top: 41.469486382476376
    },
    overlap: {
      left: -74.94598388671875,
      bottom: 40.861602479810266,
      right: -74.22637939453125,
      top: 41.226183305514596
    },
    cover: {
      left: -74.77569580078125,
      bottom: 40.405130697527866,
      right: -73.01788330078125,
      top: 41.236511201246216
    }
  };

  return context;
}

function after(context) {
  fs.unlink(context.inputFile);
}

module.exports.tests.interface = function(test) {
  test('extract polygons when covering region', function (t) {
    var context = before();
    var regions = [{outputFile: context.outputFile, box: context.regions.inside}];
    slicer.extractRegions(context.inputFile, regions, function () {
      areaShouldBeExtracted(t, context.outputFile);
      after(context);
      t.end();
    });
  });

  test('don\'t extract polygons when outside region', function (t) {
    var context = before();
    var regions = [{outputFile: context.outputFile, box: context.regions.outside}];
    slicer.extractRegions(context.inputFile, regions, function () {
      areaShouldNotBeExtracted(t, context.outputFile);
      after(context);
      t.end();
    });
  });

  test('extract polygons when overlapping region', function (t) {
    var context = before();
    var regions = [{outputFile: context.outputFile, box: context.regions.overlap}];
    slicer.extractRegions(context.inputFile, regions, function () {
      areaShouldBeExtracted(t, context.outputFile);
      after(context);
      t.end();
    });
  });

  test('extract polygons when inside region', function (t) {
    var context = before();
    var regions = [{outputFile: context.outputFile, box: context.regions.cover}];
    slicer.extractRegions(context.inputFile, regions, function () {
      areaShouldBeExtracted(t, context.outputFile);
      after(context);
      t.end();
    });
  });
};

function areaShouldBeExtracted(t, outputFile) {
  var results = JSON.parse(fs.readFileSync(outputFile));
  t.assert(results, 'results exist');
  t.equal(results.type, 'FeatureCollection', 'valid FeatureCollection');
  t.assert(results.features instanceof Array, 'valid features array');
  t.equal(results.features.length, 1, 'features extracted');
  t.equal(results.features[0].properties.name, 'admin_area', 'admin_area property found');
  fs.unlinkSync(outputFile);
}

function areaShouldNotBeExtracted(t, outputFile) {
  var results = JSON.parse(fs.readFileSync(outputFile));
  t.equal(results.features.length, 0);
  fs.unlinkSync(outputFile);
}


module.exports.all = function (tape, common) {

  function test(name, testFunction) {
    return tape('GeojsonSlicer ' + name, testFunction);
  }

  for( var testCase in module.exports.tests ){
    module.exports.tests[testCase](test, common);
  }
};

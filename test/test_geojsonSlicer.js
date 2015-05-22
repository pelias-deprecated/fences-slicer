var slicer = require('../');
var fs = require('fs');

module.exports.tests = {};

function before(regionType) {

  var context = {};

  context.outputDir = 'temp';
  context.regionFile = 'tmpRegionFile.geojson';
  context.inputFile = 'tmpInputFile.geojson';

  context.params = {
    inputDir: './',
    inputFile: context.inputFile,
    outputDir: './',
    regionFile: context.regionFile
  };


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

  fs.writeFileSync(context.inputFile, JSON.stringify(context.data, null, 2));

  context.regions = {
    'type': 'FeatureCollection',
    'features': [{
      'type': 'Feature',
      'properties': { 'name': context.outputDir }
    }]};

  switch( regionType ) {
    case 'self':
      context.regions.features[0].geometry = {
        'type': 'Polygon',
        'coordinates': [[
          [-74.4488525390625, 41.147637985391874],
          [-73.68255615234368, 41.073139733293424],
          [-73.2733154296875, 40.66188943992171],
          [-73.95996093749999, 40.52215098562377],
          [-74.45159912109375, 40.71603763556807],
          [-74.4488525390625, 41.147637985391874]
        ]]
      };
      break;
    case 'outside':
      context.regions.features[0].geometry = {
        'type': 'Polygon',
        'coordinates': [[
          [-75.7177734375, 41.73033005046653],
          [-75.849609375, 41.47977575214487],
          [-75.531005859375, 41.29844430929419],
          [-75.0860595703125, 41.541477666790286],
          [-75.3277587890625, 41.86547012230937],
          [-75.7177734375, 41.73033005046653]
        ]]
      };
      break;
    case 'inside':
      context.regions.features[0].geometry = {
        'type': 'Polygon',
        'coordinates': [[
          [-74.2181396484375, 41.008920735004885],
          [-73.76220703125, 40.992337919312284],
          [-73.66333007812499, 40.74725696280421],
          [-74.0478515625, 40.643135583312805],
          [-74.2291259765625, 40.75974059207392],
          [-74.2181396484375, 41.008920735004885]
        ]]
      };
      break;
    case 'cover':
      context.regions.features[0].geometry = {
        'type': 'Polygon',
        'coordinates': [[
          [-74.915771484375, 41.31082388091818],
          [-73.3612060546875, 41.492120839687786],
          [-72.5042724609375, 40.5930995321649],
          [-73.80615234375, 39.91816284660943],
          [-75.0970458984375, 40.60144147645398],
          [-74.915771484375, 41.31082388091818]
        ]]
      };
      break;
    case 'overlap':
      context.regions.features[0].geometry = {
        'type': 'Polygon',
        'coordinates': [[
          [-73.773193359375, 41.47154438707647],
          [-74.0313720703125, 40.81796653313175],
          [-73.4710693359375, 40.18307014852531],
          [-72.6690673828125, 40.41767833585549],
          [-72.6690673828125, 41.17038447781618],
          [-73.773193359375, 41.47154438707647]
        ]]
      };
      break;
    case 'multi':
      context.regions.features[0].geometry = {
        'type': 'MultiPolygon',
        'coordinates': [[[
          // overlap
          [-73.773193359375, 41.47154438707647],
          [-74.0313720703125, 40.81796653313175],
          [-73.4710693359375, 40.18307014852531],
          [-72.6690673828125, 40.41767833585549],
          [-72.6690673828125, 41.17038447781618],
          [-73.773193359375, 41.47154438707647]
        ], [
          // outside
          [-75.7177734375, 41.73033005046653],
          [-75.849609375, 41.47977575214487],
          [-75.531005859375, 41.29844430929419],
          [-75.0860595703125, 41.541477666790286],
          [-75.3277587890625, 41.86547012230937],
          [-75.7177734375, 41.73033005046653]
        ]]]
      };
  }

  fs.writeFileSync(context.regionFile, JSON.stringify(context.regions, null, 2));

  return context;
}

function after(context) {
  fs.unlinkSync(context.inputFile);
  fs.unlinkSync(context.regionFile);
  fs.rmdirSync(context.outputDir);
}

module.exports.tests.interface = function(test) {

  test('extract polygons when self region', function (t) {
    var context = before('self');
    slicer.extractRegions(context.params, function () {
      areaShouldBeExtracted(t, slicer.getOutputFile('./', context.outputDir, context.inputFile));
      after(context);
      t.end();
    });
  });

  test('extract polygons when covering region', function (t) {
    var context = before('cover');
    slicer.extractRegions(context.params, function () {
      areaShouldBeExtracted(t, slicer.getOutputFile('./', context.outputDir, context.inputFile));
      after(context);
      t.end();
    });
  });

  test('don\'t extract polygons when outside region', function (t) {
    var context = before('outside');
    slicer.extractRegions(context.params, function () {
      areaShouldNotBeExtracted(t, slicer.getOutputFile('./', context.outputDir, context.inputFile));
      after(context);
      t.end();
    });
  });

  test('extract polygons when overlapping region', function (t) {
    var context = before('overlap');
    slicer.extractRegions(context.params, function () {
      areaShouldBeExtracted(t, slicer.getOutputFile('./', context.outputDir, context.inputFile));
      after(context);
      t.end();
    });
  });

  test('extract polygons when inside region', function (t) {
    var context = before('inside');
    slicer.extractRegions(context.params, function () {
      areaShouldBeExtracted(t, slicer.getOutputFile('./', context.outputDir, context.inputFile));
      after(context);
      t.end();
    });
  });

  test('extract polygons when inside mutli polygon region', function (t) {
    var context = before('multi');
    slicer.extractRegions(context.params, function () {
      areaShouldBeExtracted(t, slicer.getOutputFile('./', context.outputDir, context.inputFile));
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
  t.assert(results.features instanceof Array, 'features are an array');
  t.equal(results.features.length, 0, 'no features extracted');
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

var run = require('../src/runRegions');
var fs = require('fs');

module.exports.tests = {};

function before(includeGeocodingInfo) {

  includeGeocodingInfo = (includeGeocodingInfo !== undefined) ? includeGeocodingInfo : true;

  var context = {};

  context.inputRegionFile = 'tmpInputRegionFile2.geojson';
  context.outputRegionFile = 'tmpOutputRegionFile2.geojson';

  context.params = {
    inputFile: context.inputFile,
    regionFile: context.regionFile
  };

  context.data = {
    'type': 'FeatureCollection',
    'features': [
      {
        'type': 'Feature',
        'properties': {
          'name': 'USA',
          'flag': 'something'
        },
        'geometry': {
          'type': 'Polygon',
          'coordinates': [
            [
              [
                -121.640625,
                48.45835188280866
              ],
              [
                -92.46093749999999,
                49.15296965617042
              ],
              [
                -78.046875,
                44.33956524809713
              ],
              [
                -76.640625,
                36.03133177633189
              ],
              [
                -82.96875,
                27.68352808378776
              ],
              [
                -100.1953125,
                28.613459424004414
              ],
              [
                -116.01562499999999,
                32.54681317351517
              ],
              [
                -126.5625,
                41.244772343082076
              ],
              [
                -121.640625,
                48.45835188280866
              ]
            ]
          ]
        }
      },
      {
        'type': 'Feature',
        'properties': {
          'name:en':'RUS',
          'flag': 'something'
        },
        'geometry': {
          'type': 'Polygon',
          'coordinates': [
            [
              [
                49.92187499999999,
                64.47279382008166
              ],
              [
                75.234375,
                63.704722429433225
              ],
              [
                100.546875,
                61.270232790000634
              ],
              [
                92.8125,
                54.77534585936447
              ],
              [
                74.1796875,
                55.57834467218206
              ],
              [
                54.4921875,
                56.9449741808516
              ],
              [
                40.078125,
                60.75915950226991
              ],
              [
                49.92187499999999,
                64.47279382008166
              ]
            ]
          ]
        }
      },
      {
        'type': 'Feature',
        'properties': {'name':'ab:=+cd', 'flag': 'something'},
        'geometry': {
          'type': 'Polygon',
          'coordinates': [
            [
              [
                49.92187499999999,
                64.47279382008166
              ],
              [
                75.234375,
                63.704722429433225
              ],
              [
                100.546875,
                61.270232790000634
              ],
              [
                92.8125,
                54.77534585936447
              ],
              [
                74.1796875,
                55.57834467218206
              ],
              [
                54.4921875,
                56.9449741808516
              ],
              [
                40.078125,
                60.75915950226991
              ],
              [
                49.92187499999999,
                64.47279382008166
              ]
            ]
          ]
        }
      },
      {
        'type': 'Feature',
        'properties': {'name':'no flag'},
        'geometry': {
          'type': 'Polygon',
          'coordinates': []
        }
      }
    ]
  };

  if (includeGeocodingInfo) {
    context.data.geocoding = {
      version: '1.2.3',
      license: 'MIT'
    };
  }

  fs.writeFileSync(context.inputRegionFile, JSON.stringify(context.data, null, 2));

  return context;
}

function after(context) {
  fs.unlinkSync(context.inputRegionFile);
  fs.unlinkSync(context.outputRegionFile);
}

module.exports.tests.interface = function(test) {

  test('create simplified regions', function (t) {
    var context = before(true);
    run(context.inputRegionFile, context.outputRegionFile, undefined, function () {
      geocodingBlockShouldBeExtracted(t, context.outputRegionFile, context.data.geocoding);
      areaShouldBeExtracted(t, context.outputRegionFile, ['USA','RUS','ab:=+cd'], ['no flag']);
      after(context);
      t.end();
    });
  });

  test('create simplified regions without geocoding info', function (t) {
    var context = before(false);
    run(context.inputRegionFile, context.outputRegionFile, [], function () {
      geocodingBlockShouldBeCreated(t, context.outputRegionFile);
      areaShouldBeExtracted(t, context.outputRegionFile, ['USA','RUS','ab:=+cd'], ['no flag']);
      after(context);
      t.end();
    });
  });

  test('create simplified regions with wanted param', function (t) {
    var context = before(true);
    run(context.inputRegionFile, context.outputRegionFile, ['RUS'], function () {
      areaShouldBeExtracted(t, context.outputRegionFile, ['RUS'], ['USA','ab:=+cd','no flag']);
      after(context);
      t.end();
    });
  });

};

function areaShouldBeExtracted(t, outputFile, expected, unexpected) {
  var results = JSON.parse(fs.readFileSync(outputFile));

  t.assert(results, 'results exist');
  t.equal(results.type, 'FeatureCollection', 'valid FeatureCollection');
  t.assert(results.features instanceof Array, 'valid features array');
  t.equal(results.features.length, expected.length, 'features extracted');

  results.features.forEach(function (feature) {
    if (expected) {
      t.assert(expected.indexOf(feature.properties['name:display']) !== -1);
    }
    if (unexpected) {
      t.assert(unexpected.indexOf(feature.properties['name:display']) === -1);
    }
    t.assert(feature.properties.hasOwnProperty('name'), 'name property found');
    t.assert(feature.properties.hasOwnProperty('name:display'), 'name:display property found');
  });
}

function geocodingBlockShouldBeExtracted(t, outputFile, expectedGeocoding) {
  var results = JSON.parse(fs.readFileSync(outputFile));
  t.deepEqual(results.geocoding, expectedGeocoding, 'geocoding block matches expected');
}

function geocodingBlockShouldBeCreated(t, outputFile) {
  var pkg = require('../package.json');
  var moment = require('moment');

  var results = JSON.parse(fs.readFileSync(outputFile));
  t.equal(results.geocoding.creation_date, moment().format('YYYY-MM-DD'), 'geocoding has creation_date');
  t.equal(results.geocoding.generator.author, pkg.author, 'geocoding has author name');
  t.equal(results.geocoding.generator.package, pkg.name, 'geocoding has package name');
  t.equal(results.geocoding.generator.version, pkg.version, 'geocoding has package version');
  t.equal(results.geocoding.license, 'ODbL (see http://www.openstreetmap.org/copyright)', 'geocoding has license');
}

module.exports.all = function (tape, common) {

  function test(name, testFunction) {
    return tape('runRegions ' + name, testFunction);
  }

  for( var testCase in module.exports.tests ){
    module.exports.tests[testCase](test, common);
  }
};

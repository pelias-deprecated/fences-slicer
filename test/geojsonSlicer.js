var should = require('should');
var slicer = require('../');
var fs = require('fs');

describe('GeojsonSlicer', function () {

  var context = {};

  before(function () {

    context.inputFile = './tmpInputFile.geojson';
    context.outputFile = './tmpOutputFile.geojson';

    context.data = {
      type: 'FeatureCollection',
      features:[
        {
          type: 'Feature',
          properties: { 'name': 'admin_area' },
          geometry: {
            type: 'Polygon',
            coordinates: [
              [
                [
                  -74.4488525390625,
                  41.147637985391874
                ],
                [
                  -73.68255615234368,
                  41.073139733293424
                ],
                [
                  -73.2733154296875,
                  40.66188943992171
                ],
                [
                  -73.95996093749999,
                  40.52215098562377
                ],
                [
                  -74.45159912109375,
                  40.71603763556807
                ],
                [
                  -74.4488525390625,
                  41.147637985391874
                ]
              ]
            ]
          }
        }
      ]
    };

    fs.writeFileSync(context.inputFile, JSON.stringify(context.data));

    context.regions = {
      inside: {
        sw: {
          longitude: -74.26895141601562,
          latitude: 40.73997376331186
        },
        ne: {
          longitude: -73.729248046875,
          latitude: 41.00477542222949
        }
      },
      outside: {
        sw: {
          longitude: -74.014892578125,
          latitude: 41.19828983779905
        },
        ne: {
          longitude: -73.62075805664062,
          latitude: 41.469486382476376
        }
      },
      overlap: {
        sw: {
          longitude: -74.94598388671875,
          latitude: 40.861602479810266
        },
        ne: {
          longitude: -74.22637939453125,
          latitude: 41.226183305514596
        }
      },
      cover: {
        sw: {
          longitude: -74.77569580078125,
          latitude: 40.405130697527866
        },
        ne: {
          longitude: -73.01788330078125,
          latitude: 41.236511201246216
        }
      }
    };
  });

  after(function () {
    fs.unlink(context.inputFile);
  });

  describe('extractRegions', function () {

    it('should extract polygons when covering region', function (done) {
      var regions = [{outputFile: context.outputFile, box: context.regions.inside}];
      slicer.extractRegions(context.inputFile, regions, function () {
        areaShouldBeExtracted(context.outputFile);
        done();
      });
    });

    it('should not extract polygons when outside region', function (done) {
      var regions = [{outputFile: context.outputFile, box: context.regions.outside}];
      slicer.extractRegions(context.inputFile, regions, function () {
        areaShouldNotBeExtracted(context.outputFile);
        done();
      });
    });

    it('should extract polygons when overlapping region', function (done) {
      var regions = [{outputFile: context.outputFile, box: context.regions.overlap}];
      slicer.extractRegions(context.inputFile, regions, function () {
        areaShouldBeExtracted(context.outputFile);
        done();
      });
    });

    it('should extract polygons when inside region', function (done) {
      var regions = [{outputFile: context.outputFile, box: context.regions.cover}];
      slicer.extractRegions(context.inputFile, regions, function () {
        areaShouldBeExtracted(context.outputFile);
        done();
      });
    });

  });
});

function areaShouldBeExtracted(outputFile) {
  var results = JSON.parse(fs.readFileSync(outputFile));
  should.exist(results);
  results.should.have.property('type', 'FeatureCollection');
  results.should.have.property('features').instanceOf(Array);
  results.features.length.should.equal(1);
  results.features[0].properties.should.have.property('name', 'admin_area');
  fs.unlinkSync(outputFile);
}

function areaShouldNotBeExtracted(outputFile) {
  var results = JSON.parse(fs.readFileSync(outputFile));
  results.features.length.should.equal(0);
  fs.unlinkSync(outputFile);
}
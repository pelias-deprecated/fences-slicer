var should = require('should');
var proxyquire = require('proxyquire');

describe('run', function () {

  it('should create output directory', function (done) {
    var inputDir = 'fooDir';
    var outputDir = 'barDir';
    var files = [ 'file1.geojson', 'file2.geojson' ];
    var regions = [
      {
        name: 'USA',
        box: [-66.885444, 49.384358, -124.848974, 24.396308]
      }
    ];

    var checks = {
      extractRegionCalled: []
    };

    var fsMock = {
      existsSync: function (dir) {
        dir.should.equal(inputDir);
        return true;
      },
      readdirSync: function (dir) {
        dir.should.equal(inputDir);
        return files;
      },
      ensureDirSync: function (dir) {
        dir.should.equal(outputDir + '/' + regions[0].name);
      }
    };

    var slicerMock = {
      extractRegions: function (inputFile, regs, callback) {
        checks.extractRegionCalled[inputFile] = true;
        regs[0].box.should.equal(regions[0].box);

        switch(inputFile) {
          case inputDir + '/' + files[0]:
            regs[0].outputFile.should.equal(outputDir + '/' + regions[0].name + '/' + files[0]);
            break;
          case inputDir + '/' + files[1]:
            regs[0].outputFile.should.equal(outputDir + '/' + regions[0].name + '/' + files[1]);
            break;
          default:
            should.exist(false);
        }
        callback();
      }
    };

    var run = proxyquire('./../src/run', {
      'fs-extra': fsMock,
      './geojsonSlicer': slicerMock
    });

    run(regions, inputDir, outputDir);
    done();

  });
});
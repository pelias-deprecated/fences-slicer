var path = require('path');
var should = require('should');
var proxyquire = require('proxyquire');

describe('run', function () {

  it('should create output directory', function (done) {
    var inputDir = 'fooDir';
    var outputDir = 'barDir';
    var geojsonFiles = [ 'file1.geojson', 'file2.geojson' ];
    var regions = [
      {
        name: 'USA',
        box: [-66.885444, 49.384358, -124.848974, 24.396308]
      }
    ];

    var checks = {
      forkCalled: 0,
      sendCalled: [],
      onCalled: 0
    };

    var fsMock = {
      existsSync: function (dir) {
        dir.should.equal(inputDir);
        return true;
      },
      readdirSync: function (dir) {
        dir.should.equal(inputDir);
        return geojsonFiles.concat([ 'file3.json' ]); // inject some non geojson files
      },
      ensureDirSync: function (dir) {
        dir.should.equal(outputDir + '/' + regions[0].name);
      }
    };

    var child = {
      send: function (msg) {
        msg.should.have.property('type', 'start');
        msg.should.have.property('data');
        msg.data.should.have.property('inputFile');
        msg.data.should.have.property('regions');

        checks.sendCalled.push(msg.data.inputFile);

        msg.data.regions[0].box.should.eql(regions[0].box);

        switch(msg.data.inputFile) {
          case inputDir + '/' + geojsonFiles[0]:
            msg.data.regions[0].outputFile.should.equal(outputDir + '/' + regions[0].name + '/' + geojsonFiles[0]);
            break;
          case inputDir + '/' + geojsonFiles[1]:
            msg.data.regions[0].outputFile.should.equal(outputDir + '/' + regions[0].name + '/' + geojsonFiles[1]);
            break;
          default:
            should.exist(false);
        }

      },
      on: function (msg, callback) {
        msg.should.equal('exit');
        callback.should.be.type('function');
        checks.onCalled++;
      }
    };

    var forkMock = {
      fork: function (childModule, args, options) {
        childModule.should.equal(path.resolve(__dirname + '/../src/childProcess.js'));
        args.should.eql([]);
        options.should.eql({silent: false});

        checks.forkCalled++;
        return child;
      }
    };

    var run = proxyquire('./../src/run', {
      'fs-extra': fsMock,
      'child_process': forkMock
    });

    run(regions, inputDir, outputDir);

    checks.forkCalled.should.equal(geojsonFiles.length);
    checks.sendCalled.length.should.equal(geojsonFiles.length);
    checks.onCalled.should.equal(geojsonFiles.length);

    done();

  });
});
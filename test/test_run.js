var path = require('path');
var proxyquire = require('proxyquire');

module.exports.tests = {};

module.exports.tests.interface = function(test) {
  test('create output dir', function (t) {

    var inputDir = 'fooDir';
    var outputDir = 'barDir';
    var geojsonFiles = ['file1.geojson', 'file2.geojson'];
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
        t.equal(dir, inputDir, 'check input dir exists');
        return true;
      },
      readdirSync: function (dir) {
        t.equal(dir, inputDir, 'get input dir contents');
        return geojsonFiles.concat(['file3.json']); // inject some non geojson files
      },
      ensureDirSync: function (dir) {
        t.equal(dir, outputDir + '/' + regions[0].name, 'output dir is correct');
      }
    };

    var child = {
      send: function (msg) {
        t.equal(msg.type, 'start', 'start msg sent');
        t.assert(msg.hasOwnProperty('data'), 'start msg data');
        t.equal(typeof msg.data.inputFile, 'string', 'start msg inputFile');
        t.assert(msg.data.regions instanceof Array, 'start msg regions array');

        checks.sendCalled.push(msg.data.inputFile);

        t.equal(msg.data.regions[0].box, regions[0].box, 'region box');

        switch (msg.data.inputFile) {
          case inputDir + '/' + geojsonFiles[0]:
            t.equal(
              msg.data.regions[0].outputFile,
              outputDir + '/' + regions[0].name + '/' + geojsonFiles[0],
              'region output file'
            );
            break;
          case inputDir + '/' + geojsonFiles[1]:
            t.equal(msg.data.regions[0].outputFile,
              outputDir + '/' + regions[0].name + '/' + geojsonFiles[1], 'output file');
            break;
          default:
            t.fail();
        }

      },
      on: function (msg, callback) {
        t.equal(msg, 'exit', 'exit message sent');
        t.equal(typeof callback, 'function', 'callback is a function');
        checks.onCalled++;
      }
    };

    var forkMock = {
      fork: function (childModule, args, options) {
        t.equal(childModule, path.resolve(__dirname + '/../src/childProcess.js'), 'child process module');
        t.deepEqual(args, [], 'no args to child process');
        t.deepEqual(options, {silent: false}, 'silent option set');

        checks.forkCalled++;
        return child;
      }
    };

    var run = proxyquire('./../src/run', {
      'fs-extra': fsMock,
      'child_process': forkMock
    });

    run(regions, inputDir, outputDir);

    t.equal(checks.forkCalled, geojsonFiles.length, 'single child process per input file');
    t.equal(checks.sendCalled.length, geojsonFiles.length, 'send called for each input file');
    t.equal(checks.onCalled, geojsonFiles.length, 'callback called for each input file');

    t.end();
  });
};


module.exports.all = function (tape, common) {

  function test(name, testFunction) {
    return tape('slicer parent process ' + name, testFunction);
  }

  for( var testCase in module.exports.tests ){
    module.exports.tests[testCase](test, common);
  }
};

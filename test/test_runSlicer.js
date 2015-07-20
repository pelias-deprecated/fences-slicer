var path = require('path');
var proxyquire = require('proxyquire');

module.exports.tests = {};

module.exports.tests.interface = function(test) {
  test('create output dir', function (t) {

    var inputDir = 'fooDir';
    var outputDir = 'barDir';
    var geojsonFiles = ['file1.geojson', 'file2.geojson'];
    var regionFile = 'regions.geojson';

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
      }
    };

    var child = {
      send: function (msg) {
        t.comment(msg.data.inputFile);
        t.equal(msg.type, 'start', 'start msg sent');
        t.assert(msg.hasOwnProperty('data'), 'start msg data');
        t.equal(msg.data.inputDir, inputDir, 'start msg inputDir');
        t.assert(geojsonFiles.indexOf(msg.data.inputFile) !== -1, 'start msg inputFile');
        t.equal(msg.data.outputDir, outputDir, 'start msg outputDir');
        t.equal(msg.data.regionFile, regionFile, 'start msg regionFile');
        checks.sendCalled.push(msg.data.inputFile);
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

    var run = proxyquire('./../src/runSlicer', {
      'fs-extra': fsMock,
      'child_process': forkMock
    });

    run(regionFile, inputDir, outputDir);

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

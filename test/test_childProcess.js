var proxyquire = require('proxyquire');

module.exports.tests = {};

module.exports.tests.interface = function(test) {
  test('slice', function (t) {

    var params = {
      inputFile: 'someInputFile.geojson',
      regions: ['foo', 'bar']
    };

    process.send = function (msg) {
      t.equal(msg.type, 'done', 'done message sent');
      t.equal(msg.data.inputFile, params.inputFile, 'input file sent in done message');
      t.end();
    };

    var slicerMock = {
      extractRegions: function (_params, callback) {
        t.equal(params, params, 'params passed to slicer');
        t.equal(typeof callback, 'function', 'callback is a function');
        callback();
      }
    };

    proxyquire('../src/childProcess', { './geojsonSlicer': slicerMock });

    process.emit('message', {type: 'not_important'});

    process.emit('message', {type: 'start', data: params});
  });
};


module.exports.all = function (tape, common) {

  function test(name, testFunction) {
    return tape('childProcess ' + name, testFunction);
  }

  for( var testCase in module.exports.tests ){
    module.exports.tests[testCase](test, common);
  }
};

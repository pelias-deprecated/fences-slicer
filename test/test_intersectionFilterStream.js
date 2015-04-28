var proxyquire = require('proxyquire');

module.exports.tests = {};

module.exports.tests.interface = function(test) {
  test('turf error', function (t) {

    var regionPoly = [1,2,3,4];
    var data = {
      foo: 'bar'
    };
    var error = new Error('bad things are a happenin');

    var turfMock = {
      intersect: function (_regionPoly, _data) {
        t.equal(_regionPoly, regionPoly, 'region polygon used');
        t.equal(_data, data, 'data used');
        throw error;
      }
    };
    var filter = proxyquire('../src/intersectionFilterStream', { 'turf': turfMock });

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

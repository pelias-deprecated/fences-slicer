
var tape = require('tape');
var common = {};

var tests = [
  require('./test_run'),
  require('./test_geojsonSlicer'),
  require('./test_childProcess'),
  require('./test_intersectionFilterStream')
];

tests.map(function(t) {
  t.all(tape, common);
});
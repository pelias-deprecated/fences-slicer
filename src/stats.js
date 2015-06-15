var colors = require('colors');
var microtime = require('microtime');

function Stats() {
  this.data = {};

  this.start();
}

Stats.prototype.start = function start(intr) {
  this.startTime = microtime.now();
  this.interval = setInterval(function () {
    console.log(colors.green('[STATS][' + new Date().toISOString() + ']: '), JSON.stringify(this.data, null, 2));
  }.bind(this), intr || 3000);
};

Stats.prototype.stop = function stop() {
  if (this.interval) {
    clearInterval(this.interval);
    this.duration = microtime.now() - this.startTime;
  }
  console.log(colors.green('[STATS][' + new Date().toISOString() + ']: '),
              colors.blue(' __FINAL__ duration=' + this.duration/1000 + 'ms' || 'n/a'),
              JSON.stringify(this.data, null, 2));
};

Stats.prototype.get = function get(key) {
  return this.data[key];
};

Stats.prototype.set = function set(key, val) {
  this.data[key] = val;
};

Stats.prototype.increment = function increment(key, incr) {
  var _incr = incr || 1;
  if (this.data.hasOwnProperty(key)) {
    this.data[key] += _incr;
  }
  else {
    this.data[key] = _incr;
  }
};

var stats = new Stats();

module.exports = stats;
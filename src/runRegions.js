var fs = require('fs-extra');
var through2 = require('through2');
var geojsonStream = require('geojson-stream');
var simplify = require('simplify-geojson');

var names = [];

module.exports = function run(inputRegionFile, outputRegionFile) {
  var stream = fs.createReadStream(inputRegionFile)
    .pipe(geojsonStream.parse())
    .pipe(through2.obj(function (data, enc, cb) {
      try {
        isCountry(data);
        data.properties['name:FENCES'] = sanitizeName(data);
        dedupe(data);

        data = simplify(data, 0.001);

        names.push(data.properties['name:FENCES']);

        var copy = {
          properties: {
            'name': data.properties['name:en'],
            'name:FENCES': data.properties['name:FENCES']
          },
          geometry: data.geometry,
          type: data.type
        };

        this.push(copy);
      }
      catch (ex) {
        console.error(ex.message);
      }
      cb();
    }))
    .pipe(geojsonStream.stringify())
    .pipe(fs.createWriteStream(outputRegionFile));

  stream.on('finish', function () {
    console.log('\nAll done!!!\nRegions file generated with ' + names.length + ' regions');
  });
};

function sanitizeName(obj) {
  var name = obj.properties['name:en']; // || obj.properties['name'];
  var clean = name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  var check = name.replace(/[_]/gi, '');
  if (clean.length > 0 && check.length > 0) {
    return clean;
  }

  throw new Error('Could not sanitize name: ' + obj.properties.name);
}

function dedupe(obj) {
  if (names.indexOf(obj.properties['name:FENCES']) !== -1) {
    throw new Error('Duplicate object not added: ' + obj.properties.name);
  }
}

function isCountry(obj) {
  if (!obj.properties.hasOwnProperty('flag')) {
    throw new Error('No flag: ' + obj.properties.name);
  }
}
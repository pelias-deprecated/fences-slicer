var async = require('async');
var fs = require('fs-extra');
var through2 = require('through2');
var geojsonStream = require('geocodejson-stream');
var simplify = require('simplify-geojson');

var names = [];

function run(inputRegionFile, outputRegionFile, wanted, callback) {
  // clear previous run names
  names = [];

  if (wanted && wanted.length === 0) {
    wanted = undefined;
  }

  async.waterfall(
    [
      parseGeocodingInfo.bind(null, inputRegionFile),
      sliceInputFile.bind(null, inputRegionFile, outputRegionFile, wanted)
    ],
    function () {
      console.log('\nRegions file generated with ' + names.length + ' regions');
      if (callback) {
        callback();
      }
    });
}

/**
 * STEP 1
 *
 * Grab geocoding info block from input file
 *
 * @param {string} inputFile
 * @param {function} callback (err, geocodingInfo)
 */
function parseGeocodingInfo(inputFile, callback) {
  var found = false;
  var readStream = fs.createReadStream(inputFile);

  var geoStream = readStream.pipe(geojsonStream.parseGeocoding());

  // if geocoding block is found, pass it on to the callback
  geoStream.on('data', function (data) {
    found = true;
    readStream.destroy();
    callback(null, data);
  });

  // if end of file is reached and no geocoding is found, that's bad news!
  geoStream.on('end', function () {
    if (found) {
      return;
    }
    console.log('Geocoding block not found in input file. Creating.');
    callback(null, {timestamp: Date.now()});
  });
}


function sliceInputFile(inputRegionFile, outputRegionFile, wanted, geocodingInfo, callback) { // jshint ignore:line
  var stream = fs.createReadStream(inputRegionFile)
    .pipe(geojsonStream.parse())
    .pipe(createSliceStream(wanted))
    .pipe(geojsonStream.stringify(geocodingInfo))
    .pipe(fs.createWriteStream(outputRegionFile));

  stream.on('finish', callback);
}

function createSliceStream(wanted) {
  return through2.obj(function (data, enc, cb) {
    try {
      isCountry(data, wanted);
      var cleanName = sanitizeName(data);
      dedupe(cleanName);

      data = simplify(data, 0.001);

      names.push(cleanName);

      var copy = {
        properties: {
          'name:display': getName(data),
          'name': cleanName
        },
        geometry: data.geometry,
        type: data.type
      };

      this.push(copy);
    }
    catch (ex) {
      console.log('[Info:] ', ex.message);
    }
    cb();
  });
}

function sanitizeName(obj) {
  var name = getName(obj);
  var clean = name.replace(/[^a-z0-9]/gi, '-').toLowerCase();
  var check = name.replace(/[-]/gi, '');
  if (clean.length > 0 && check.length > 0) {
    return clean;
  }

  throw new Error('Could not sanitize name: ' + name);
}

function getName(obj) {
  return obj.properties['name:en'] || obj.properties.name;
}

function dedupe(name) {
  if (names.indexOf(name) !== -1) {
    throw new Error('Duplicate object not added: ' + name);
  }
}

function isCountry(obj, wanted) {
  if (wanted && wanted.indexOf(getName(obj)) === -1) {
    throw new Error('Not wanted: ' + getName(obj));
  }

  if (!obj.properties.hasOwnProperty('flag')) {
    throw new Error('No flag: ' + getName(obj));
  }
}

module.exports = run;
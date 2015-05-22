var geojsonSlicer = require('./geojsonSlicer');

/**
 * This childProcess responds to a start message and will
 * slice an input file into specified regions
 *
 * @param {object} payload
 * @param {string} payload.type 'start'
 * @param {object} payload.data
 */
process.on('message', function (payload) {
  if (payload.type === 'start') {
    return slice(payload.data);
  }
});

/**
 * Execute slicer function with given params
 *
 * @param {object} params
 * @param {string} params.inputDir
 * @param {string} params.inputFile
 * @param {string} params.outputDir
 * @param {string} params.regionFile GeoJSON file with region polygons
 */
function slice(params) {
  geojsonSlicer.extractRegions(params, function () {
    process.send({
      type: 'done',
      data: { inputFile: params.inputFile }
    });
    process.nextTick(process.exit.bind(null, 0));
  });
}

module.exports.slice = slice;
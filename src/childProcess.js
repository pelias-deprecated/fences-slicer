var geojsonSlicer = require('./geojsonSlicer');

/**
 * This childProcess responds to a start message and will
 * slice an input file into specified regions
 *
 * payload is expected to have the following properties:
 *
 *  {string} type 'start'
 *  {object} data
 *  {string} data.inputFile
 *  {[]}     data.regions [{outputFile: {string}, box: [lat1,lon1,lat2,lon1]}]
 */
process.on('message', function (payload) {
  if (payload.type === 'start') {
    slice(payload.data.inputFile, payload.data.regions);
  }
});

/**
 * Execute slicer function with given params
 *
 * @param {string} inputFile
 * @param {[]} regions
 */
function slice(inputFile, regions) {
  geojsonSlicer.extractRegions(inputFile, regions, function () {
    process.send({
      type: 'done',
      data: { inputFile: inputFile }
    });
    process.nextTick(process.exit.bind(null, 0));
  });
}
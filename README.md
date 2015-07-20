# fences-slicer

Split large geojson file into smaller region files

[![NPM](https://nodei.co/npm/fences-slicer.png)](https://nodei.co/npm/fences-slicer/)

## install

Note: you will need `node` and `npm` installed first. The easiest way to install `node.js` is with [nave.sh](https://github.com/isaacs/nave) by executing `[sudo] ./nave.sh usemain stable`

`npm install fences-slicer`

## usage

### preparing regions file

You can feed a geojson file through the `fences-regions` command to sanitize and prepare the file to be used in the `fences-slicer` step.

`$ fences-regions --inputGeojson=/etc/planet-fences/admin_level_2.geojson --outputFile=./regions.geojson`

In order for input regions to show up in output regions they must meet the following requirements:

* have `name` or `name:en` property
* have `flag` property

You could provide a `wanted` list of names as a filter. In that case the results will all be names matching the items in
the `wanted` list.

Regions in output will also be simplified (to 0.001).

Output regions will each have the following `properties`:

* `name_display` : name to be used for display purposes
* `name` : sanitized version of the name that can be used for filenames


### standalone utility

When using `fences-slicer` from the command line, it expects the following config parameters in order to do its job.

| Name | Description |
| :---- | :----------- |
|`inputDir` | path to the directory containing geojson input files that need to be split into regions. Only `GEOJSON` files will be processed, all others will be skipped. Input files will not be modified. |
|`outputDir`| path to an existing directory that will contain output files after the slicer is done slicing. |
|`regionFile`  | Geojson file containing regions to be used when slicing. Each region feature must have a `name` in properties. |


The expected parameters can be specified via a config file like so:

`$ fences-slicer --config=./etc/config.json`

#### sample config file contents

```javascript
{
  "inputDir": "/some/dir/planet-latest-fences",
  "outputDir": "/some/dir/planet-latest-fences-regions",
  "regionFile": "/some/geojson/file..geojson"
}
```

If not using a config file, or using a config file but need to override a particular parameter do this:

`$ fences-slicer --inputDir=/path/different/from/config --config=./etc/config.json`


### dependency module

When using `fences-slicer` in your `node.js` package as dependency, you need to provide an input file and an array
of regions, where each region has an output file and box. See example below.

```javascript
var slicer = require('fences-slicer');

var param = {
  inputDir: '/some/dir/planet-fences/',
  inputFile: 'planet-level-2.geojson',
  outputDir: '/some/dir/to/throw/output/',
  regionFile: '/etc/my/regions.geojson'
};

slicer.extractRegions(params, function () {
  console.log('fences sliced successfully!');
});
```

## coverage

`$ npm run coverage`


## test

`$ npm test`

[![Build Status](https://travis-ci.org/pelias/fences-slicer.svg?branch=master)](https://travis-ci.org/pelias/fences-slicer)




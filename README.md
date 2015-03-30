# fences-slicer

Split large geojson file into smaller region files

[![NPM](https://nodei.co/npm/fences-slicer.png)](https://nodei.co/npm/fences-slicer/)

## install

Note: you will need `node` and `npm` installed first. The easiest way to install `node.js` is with [nave.sh](https://github.com/isaacs/nave) by executing `[sudo] ./nave.sh usemain stable`

`npm install fences-slicer`

## usage

### standalone utility

When using `fences-slicer` from the command line, it expects the following config parameters in order to do its job.

| Name | Description |
| :---- | :----------- |
|`inputDir` | path to the directory containing geojson input files that need to be split into regions. Only `GEOJSON` files will be processed, all others will be skipped. Input files will not be modified. |
|`outputDir`| path to an existing directory that will contain output files after the slicer is done slicing. |
|`regions`  | JSON array of regions to extract out of the input files. Each region object must contain `name` and `box` properties. See sample config file for details. |


The expected parameters can be specified via a config file like so:

`$ fences-slicer --config=./etc/config.json`

#### sample config file contents

```javascript
{
  "inputDir": "/some/dir/planet-latest-fences",
  "outputDir": "/some/dir/planet-latest-fences-regions",
  "regions": [
    { "name": "USA",
      "box": [-66.885444, 49.384358, -124.848974, 24.396308]
    }
  ]
}
```

If not using a config file, or using a config file but need to override a particular parameter do this:

`$ fences-slicer --inputDir=/path/different/from/config --config=./etc/config.json`


### dependency module

When using `fences-slicer` in your `node.js` package as dependency, you need to provide an input file and an array
of regions, where each region has an output file and box. See example below.

```javascript
var slicer = require('fences-slicer');

var inputFile = '/some/dir/planet-fences/planet-level-2.geojson';

var regions = [
    {
        outputFile: '/some/dir/USA-fences/USA-level-2.geojson',
        box: [-66.885444, 49.384358, -124.848974, 24.396308]
    }
];

slicer.extractRegion(inputFile, regions, function () {
    console.log('hello fence slices!');
});
```

## test

`$ npm test`

[![Build Status](https://travis-ci.org/pelias/fences-slicer.svg?branch=master)](https://travis-ci.org/pelias/fences-slicer)




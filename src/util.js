var turf = require('turf');
var stats = require('./stats');

module.exports.getFeatureCollection = function getFeatureCollection(features) {
  return turf.featurecollection(features);
};

module.exports.getBoundingBox = function getBoundingBox(feature) {
  if( feature.geometry.type === 'Polygon' ) {
    return turf.envelope(feature);
  }

  if( feature.geometry.type === 'MultiPolygon' ) {
    var boxes = [];
    feature.geometry.coordinates.forEach(function (points) {
      try {
        boxes.push(turf.bboxPolygon(turf.extent(turf.polygon(points))));
      }
      catch (ex) {
        // attempt to use turf bbox algorithm, if exception thrown use brute force min/max approach

        stats.increment('util_bbox_exceptions');
        boxes.push(turf.bboxPolygon(boundingBoxAroundPolyCoords(points[0])));
      }
    });
    var collection = turf.featurecollection(boxes);
    collection = turf.merge(collection);

    return collection;
  }

  throw new Error('[GeoUtils]: Bounding box should be Polygon or MultiPolygon');
};

function boundingBoxAroundPolyCoords(coords) {
  var xAll = [], yAll = [];

  for (var i = 0; i < coords[0].length; i++) {
    xAll.push(coords[0][i][1]);
    yAll.push(coords[0][i][0]);
  }

  xAll = xAll.sort(function (a, b) { return a - b; });
  yAll = yAll.sort(function (a, b) { return a - b; });

  return [[xAll[0], yAll[0]], [xAll[xAll.length - 1], yAll[yAll.length - 1]]];
}

module.exports.isInside = function isInside(bbox, feature) {
  var intersection = turf.intersect(bbox, feature);
  if (intersection) {
    var intArea = turf.area(intersection);
    if (Math.floor(intArea) > 0) {
      return true;
    }
  }
  return false;
};

module.exports.isPointInside = function isPointInside(lookup, point) {
  return !! (lookup.search(point.geometry.coordinates[0], point.geometry.coordinates[1]));
};

/**
 *   turf.polygonreduce (copied and slightly modified to suit our needs)
 *   Function that reduces a {@link Polygon} to {@link Point} through inside
 *   buffering iteration (Pole of inaccessibility)
 * @param {Feature<(Polygon|MultiPolygon)>} feature - single Polygon Feature
 * @param {Number} [tolerance=0.1] - factor of shrinking = tolerance * area^1/2
 * @return {Feature<(Point)>}
 */

module.exports.getCenter = function getCenter(feature, tolerance) {
  var fine = true;

  // check poly is a polygon
  if (feature.geometry === void 0 ||
     ( feature.geometry.type !== 'Polygon' &&
       feature.geometry.type !== 'MultiPolygon' )) {
    throw new Error('Cannot compute center of non polygon');
  }

  // init defaults
  tolerance = (tolerance === void 0 || isNaN(tolerance) || tolerance === 0) ? 0.1 : Math.abs(tolerance);

  var area = turf.area(feature);

  // if area is really large, process runs out of memory if tolerance is 0.1
  if (area > 10000000000.00) {
    tolerance = 0.001;
  }

  // max number of points to force a simplify
  var maxcount = (fine) ? 500 : 250;

  // factor of shrinking ~ feature.area^1/2
  var factor;

  // check if multiple islands and choose the bigger one
  // simplify if needed
  var multi2simple = function (e) {
    var e2 = (e.features !== void 0) ? e.features[0] : e,
        a  = 0, j = -1, p, count;
    if (e2.geometry.type === 'MultiPolygon') {
      for (var i = 0; i < e2.geometry.coordinates.length; i++) {
        p = turf.polygon(e2.geometry.coordinates[i]);
        if (turf.area(p) > a) {
          a = turf.area(p);
          j = i;
        }
      }
      e2.geometry.coordinates = [e2.geometry.coordinates[j][0]];
      e2.geometry.type = 'Polygon';
    }
    count = e2.geometry.coordinates.reduce(function (a, b) {
      return a + b.length;
    }, 0);
    return (count > maxcount) ? turf.simplify(e2) : e2;
  };

  // iteration loop, limited to area > 1 m^2 to avoid lockings
  while (area > 1) {
    factor = -1 * tolerance * Math.sqrt(area);
    try {
      feature = turf.buffer(feature, factor, 'meters');
    } catch (err) {
      /* it usually crashes before getting smaller than 1 m^2
       because it tries to buffer the "unbufferable" and crashes
       when processing a 0-vertex polygon (turf.js, line 12068)*/
      return turf.centroid(feature);
    }
    feature = multi2simple(feature);
    area = turf.area(feature);
  }

  // finally, if area<=1
  return turf.centroid(feature);
};
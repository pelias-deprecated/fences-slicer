var turf = require('turf');

module.exports.getBoundingBox = function getBoundingBox(feature) {
  if( feature.geometry.type === 'Polygon' ) {
    return turf.envelope(feature);
  }

  if( feature.geometry.type === 'MultiPolygon' ) {
    var boxes = [];
    feature.geometry.coordinates.forEach(function (points) {
      boxes.push(turf.bboxPolygon(turf.extent(turf.polygon(points))));
    });
    var collection = turf.featurecollection(boxes);
    collection = turf.merge(collection);

    return collection;
  }

  throw new Error('[GeoUtils]: Bounding box should be Polygon or MultiPolygon');
};

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
const EARTH_R = 6371000;
const toRad = (d) => (d * Math.PI) / 180;

const haversine = (lat1, lng1, lat2, lng2) => {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const pointToSegmentDistance = (pLat, pLng, aLat, aLng, bLat, bLng) => {
  const dx = bLng - aLng, dy = bLat - aLat;
  if (dx === 0 && dy === 0) return haversine(pLat, pLng, aLat, aLng);
  const t = Math.max(0, Math.min(1,
    ((pLng - aLng) * dx + (pLat - aLat) * dy) / (dx * dx + dy * dy)
  ));
  return haversine(pLat, pLng, aLat + t * dy, aLng + t * dx);
};

exports.decodePolyline = (encoded) => {
  let index = 0, lat = 0, lng = 0;
  const result = [];
  while (index < encoded.length) {
    let b, shift = 0, result2 = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result2 |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    lat += result2 & 1 ? ~(result2 >> 1) : result2 >> 1;

    shift = 0; result2 = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result2 |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    lng += result2 & 1 ? ~(result2 >> 1) : result2 >> 1;

    result.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }
  return result;
};

exports.pointOnRoute = (routePoints, lat, lng, toleranceM) => {
  for (let i = 0; i < routePoints.length - 1; i++) {
    const d = pointToSegmentDistance(
      lat, lng,
      routePoints[i].lat, routePoints[i].lng,
      routePoints[i + 1].lat, routePoints[i + 1].lng
    );
    if (d <= toleranceM) return true;
  }
  return false;
};

const closestIndex = (routePoints, lat, lng) => {
  let minD = Infinity, idx = 0;
  routePoints.forEach((p, i) => {
    const d = haversine(lat, lng, p.lat, p.lng);
    if (d < minD) { minD = d; idx = i; }
  });
  return idx;
};

exports.segmentDistance = (routePoints, pickupLat, pickupLng, dropoffLat, dropoffLng) => {
  const fromIdx = closestIndex(routePoints, pickupLat, pickupLng);
  const toIdx   = closestIndex(routePoints, dropoffLat, dropoffLng);
  if (fromIdx >= toIdx) return haversine(pickupLat, pickupLng, dropoffLat, dropoffLng) / 1000;
  let dist = 0;
  for (let i = fromIdx; i < toIdx; i++) {
    dist += haversine(
      routePoints[i].lat, routePoints[i].lng,
      routePoints[i + 1].lat, routePoints[i + 1].lng
    );
  }
  return dist / 1000;
};

exports.haversine = haversine;
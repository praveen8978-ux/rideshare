const https = require('https');

exports.getRoutePolyline = (originLat, originLng, destLat, destLng) => {
  return new Promise((resolve, reject) => {
    const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${originLat},${originLng}&destination=${destLat},${destLng}&key=${process.env.GOOGLE_MAPS_API_KEY}`;
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (!json.routes[0]) return reject(new Error('No route found'));
          const route        = json.routes[0];
          const polyline     = route.overview_polyline.points;
          const distanceKm   = route.legs[0].distance.value / 1000;
          const durationMins = route.legs[0].duration.value / 60;
          resolve({ polyline, distanceKm, durationMins });
        } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
};
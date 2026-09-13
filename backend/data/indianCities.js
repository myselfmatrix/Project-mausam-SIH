/*
  A bundled list of Indian cities with authoritative coordinates.

  Three jobs, none of which the live geocoder can do:

  1. Offline reverse geocoding. When a user grants GPS access, the coordinates
     have to become a place name. That is a network call, and it is the one
     call in the whole flow that the user is actively waiting on. If it fails,
     falling back to the nearest city in this list gives them "Kanpur, Uttar
     Pradesh, 12 km away" instead of a spinner and an error.

  2. The picker's opening screen. Before anyone types anything there has to be
     something to tap, and a fixed set of well-known cities is both instant and
     predictable - no request, no empty state, no flicker.

  3. Deterministic behaviour. A demo on a conference network that has decided
     to block an unfamiliar API still has a working location picker.

  Coordinates are NOT typed by hand. This file is generated from the
  geocoding API by scripts in the repo history, filtered to GeoNames
  populated-place codes so that airports and toll gates named after cities do
  not end up standing in for the cities themselves, and ranked by population so
  that the largest same-named place wins. Cities renamed since independence are
  listed under the name the index answers to, with the current name displayed.

  Population figures are the geocoder's and are only used for ranking.
*/

const INDIAN_CITIES = [
  { name: 'Mumbai', region: 'Maharashtra', lat: 19.0728, lon: 72.8826, population: 12691836 },
  { name: 'Delhi', region: 'National Capital Territory of Delhi', lat: 28.652, lon: 77.2315, population: 11034555 },
  { name: 'Bengaluru', region: 'Karnataka', lat: 12.9719, lon: 77.5937, population: 8495492 },
  { name: 'Hyderabad', region: 'Telangana', lat: 17.384, lon: 78.4564, population: 6993262 },
  { name: 'Ahmedabad', region: 'Gujarat', lat: 23.0258, lon: 72.5873, population: 6357693 },
  { name: 'Chennai', region: 'Tamil Nadu', lat: 13.0878, lon: 80.2785, population: 4681087 },
  { name: 'Kolkata', region: 'West Bengal', lat: 22.5626, lon: 88.363, population: 4631392 },
  { name: 'Surat', region: 'Gujarat', lat: 21.1959, lon: 72.8302, population: 4591246 },
  { name: 'Pune', region: 'Maharashtra', lat: 18.5196, lon: 73.8554, population: 3124458 },
  { name: 'Jaipur', region: 'Rajasthan', lat: 26.9196, lon: 75.7878, population: 3046163 },
  { name: 'Kanpur', region: 'Uttar Pradesh', lat: 26.4652, lon: 80.3498, population: 2823249 },
  { name: 'Navi Mumbai', region: 'Maharashtra', lat: 19.0368, lon: 73.0158, population: 2600000 },
  { name: 'Lucknow', region: 'Uttar Pradesh', lat: 26.8393, lon: 80.9231, population: 2472011 },
  { name: 'Nagpur', region: 'Maharashtra', lat: 21.1463, lon: 79.0849, population: 2405665 },
  { name: 'Coimbatore', region: 'Tamil Nadu', lat: 11.0056, lon: 76.9661, population: 2136916 },
  { name: 'Indore', region: 'Madhya Pradesh', lat: 22.7179, lon: 75.8333, population: 1994397 },
  { name: 'Thane', region: 'Maharashtra', lat: 19.197, lon: 72.9636, population: 1841488 },
  { name: 'Vadodara', region: 'Gujarat', lat: 22.2994, lon: 73.2081, population: 1822221 },
  { name: 'Bhopal', region: 'Madhya Pradesh', lat: 23.2547, lon: 77.4029, population: 1798218 },
  { name: 'Patna', region: 'Bihar', lat: 25.5941, lon: 85.1356, population: 1684297 },
  { name: 'Ludhiana', region: 'Punjab', lat: 30.912, lon: 75.8538, population: 1618879 },
  { name: 'Nashik', region: 'Maharashtra', lat: 19.9973, lon: 73.791, population: 1486053 },
  { name: 'Madurai', region: 'Tamil Nadu', lat: 9.919, lon: 78.1195, population: 1465625 },
  { name: 'Tirunelveli', region: 'Tamil Nadu', lat: 8.7274, lon: 77.6838, population: 1435844 },
  { name: 'Agra', region: 'Uttar Pradesh', lat: 27.1833, lon: 78.0167, population: 1430055 },
  { name: 'Faridabad', region: 'Haryana', lat: 28.4112, lon: 77.3132, population: 1414050 },
  { name: 'Rajkot', region: 'Gujarat', lat: 22.2916, lon: 70.7932, population: 1390640 },
  { name: 'Jamshedpur', region: 'Jharkhand', lat: 22.8028, lon: 86.1855, population: 1339438 },
  { name: 'Gorakhpur', region: 'Haryana', lat: 29.4477, lon: 75.6721, population: 1324570 },
  { name: 'Meerut', region: 'Uttar Pradesh', lat: 28.98, lon: 77.7064, population: 1223184 },
  { name: 'Srinagar', region: 'Jammu and Kashmir', lat: 34.0857, lon: 74.8056, population: 1206419 },
  { name: 'Ghaziabad', region: 'Uttar Pradesh', lat: 28.6654, lon: 77.4392, population: 1199191 },
  { name: 'Dhanbad', region: 'Jharkhand', lat: 23.7976, lon: 86.4299, population: 1196214 },
  { name: 'Aurangabad', region: 'Maharashtra', lat: 19.8776, lon: 75.3423, population: 1175116 },
  { name: 'Varanasi', region: 'Uttar Pradesh', lat: 25.3167, lon: 83.0104, population: 1164404 },
  { name: 'Amritsar', region: 'Punjab', lat: 31.6223, lon: 74.8753, population: 1159227 },
  { name: 'Vijayawada', region: 'Andhra Pradesh', lat: 16.5075, lon: 80.6466, population: 1143232 },
  { name: 'Ranchi', region: 'Jharkhand', lat: 23.3432, lon: 85.3094, population: 1120374 },
  { name: 'Jabalpur', region: 'Madhya Pradesh', lat: 23.167, lon: 79.9501, population: 1081677 },
  { name: 'Prayagraj', region: 'Uttar Pradesh', lat: 25.4448, lon: 81.8432, population: 1073438 },
  { name: 'Visakhapatnam', region: 'Andhra Pradesh', lat: 17.6801, lon: 83.2016, population: 1063178 },
  { name: 'Jodhpur', region: 'Rajasthan', lat: 26.2684, lon: 73.0059, population: 1056191 },
  { name: 'Gwalior', region: 'Madhya Pradesh', lat: 26.2298, lon: 78.1734, population: 1054420 },
  { name: 'Howrah', region: 'West Bengal', lat: 22.5769, lon: 88.3186, population: 1027672 },
  { name: 'Raipur', region: 'Chhattisgarh', lat: 21.2333, lon: 81.6333, population: 1027264 },
  { name: 'Tiruchirappalli', region: 'Tamil Nadu', lat: 10.8155, lon: 78.6965, population: 1022518 },
  { name: 'Kota', region: 'Rajasthan', lat: 25.1825, lon: 75.8391, population: 1001694 },
  { name: 'Solapur', region: 'Maharashtra', lat: 17.6715, lon: 75.9104, population: 997281 },
  { name: 'Chandigarh', region: 'Chandigarh', lat: 30.7363, lon: 76.7884, population: 970602 },
  { name: 'Tirupur', region: 'Tamil Nadu', lat: 11.1154, lon: 77.3546, population: 963173 },
  { name: 'Guwahati', region: 'Assam', lat: 26.1844, lon: 91.7458, population: 962334 },
  { name: 'Hubballi', region: 'Karnataka', lat: 15.3478, lon: 75.1338, population: 943788 },
  { name: 'Mysuru', region: 'Karnataka', lat: 12.2979, lon: 76.6393, population: 920550 },
  { name: 'Salem', region: 'Tamil Nadu', lat: 11.6538, lon: 78.1554, population: 917414 },
  { name: 'Gurugram', region: 'Haryana', lat: 28.4601, lon: 77.0263, population: 886519 },
  { name: 'Bhubaneswar', region: 'Odisha', lat: 20.2724, lon: 85.8339, population: 885363 },
  { name: 'Bhiwandi', region: 'Maharashtra', lat: 19.3002, lon: 73.0588, population: 874032 },
  { name: 'Jalandhar', region: 'Punjab', lat: 31.3256, lon: 75.5792, population: 868929 },
  { name: 'Thiruvananthapuram', region: 'Kerala', lat: 8.4855, lon: 76.9492, population: 788271 },
  { name: 'Aligarh', region: 'Uttar Pradesh', lat: 27.8815, lon: 78.0746, population: 753207 },
  { name: 'Bareilly', region: 'Uttar Pradesh', lat: 28.3668, lon: 79.4317, population: 745435 },
  { name: 'Morādābād', region: 'Uttar Pradesh', lat: 28.8389, lon: 78.7768, population: 721139 },
  { name: 'Warangal', region: 'Telangana', lat: 18, lon: 79.5833, population: 704570 },
  { name: 'Guntur', region: 'Andhra Pradesh', lat: 16.2997, lon: 80.4573, population: 670073 },
  { name: 'Puducherry', region: 'Puducherry', lat: 11.9338, lon: 79.8298, population: 657209 },
  { name: 'Amravati', region: 'Maharashtra', lat: 20.9333, lon: 77.75, population: 647057 },
  { name: 'Bikaner', region: 'Rajasthan', lat: 28.0176, lon: 73.315, population: 644406 },
  { name: 'Kochi', region: 'Kerala', lat: 9.9399, lon: 76.2602, population: 633553 },
  { name: 'Bhilai', region: 'Chhattisgarh', lat: 21.2092, lon: 81.4285, population: 627734 },
  { name: 'Cuttack', region: 'Odisha', lat: 20.465, lon: 85.8793, population: 610189 },
  { name: 'Sangli', region: 'Maharashtra', lat: 16.8544, lon: 74.5642, population: 601214 },
  { name: 'Jammu', region: 'Jammu and Kashmir', lat: 32.7353, lon: 74.8617, population: 576198 },
  { name: 'Kolhāpur', region: 'Maharashtra', lat: 16.6956, lon: 74.2317, population: 549236 },
  { name: 'Nellore', region: 'Andhra Pradesh', lat: 14.4499, lon: 79.987, population: 547621 },
  { name: 'Ajmer', region: 'Rajasthan', lat: 26.4521, lon: 74.6387, population: 542321 },
  { name: 'Dehradun', region: 'Uttarakhand', lat: 30.3244, lon: 78.0339, population: 522081 },
  { name: 'Durgapur', region: 'West Bengal', lat: 23.5158, lon: 87.308, population: 518872 },
  { name: 'Siliguri', region: 'West Bengal', lat: 26.71, lon: 88.4285, population: 515574 },
  { name: 'Ujjain', region: 'Madhya Pradesh', lat: 23.1824, lon: 75.7764, population: 515215 },
  { name: 'Mangaluru', region: 'Karnataka', lat: 12.9172, lon: 74.856, population: 499487 },
  { name: 'Belagavi', region: 'Karnataka', lat: 15.8521, lon: 74.5045, population: 490045 },
  { name: 'Sahāranpur', region: 'Uttar Pradesh', lat: 29.9679, lon: 77.5452, population: 484873 },
  { name: 'Gaya', region: 'Bihar', lat: 24.7969, lon: 85.0039, population: 474093 },
  { name: 'Jalgaon', region: 'Maharashtra', lat: 21.0029, lon: 75.566, population: 460228 },
  { name: 'Udaipur', region: 'Rajasthan', lat: 24.5858, lon: 73.7135, population: 451100 },
  { name: 'Jhānsi', region: 'Uttar Pradesh', lat: 25.4589, lon: 78.5799, population: 412927 },
  { name: 'Thoothukudi', region: 'Tamil Nadu', lat: 8.7674, lon: 78.1343, population: 410760 },
  { name: 'Agartala', region: 'Tripura', lat: 23.8361, lon: 91.2794, population: 400004 },
  { name: 'Kākināda', region: 'Andhra Pradesh', lat: 16.9604, lon: 82.2381, population: 384182 },
  { name: 'Firozabad', region: 'Uttar Pradesh', lat: 27.1509, lon: 78.3978, population: 306409 },
  { name: 'Noida', region: 'Uttar Pradesh', lat: 28.58, lon: 77.33, population: 293908 },
  { name: 'Aizawl', region: 'Mizoram', lat: 23.7289, lon: 92.7179, population: 293416 },
  { name: 'Gandhinagar', region: 'Gujarat', lat: 23.2167, lon: 72.6833, population: 292797 },
  { name: 'Imphal', region: 'Manipur', lat: 24.8081, lon: 93.9442, population: 277196 },
  { name: 'Alappuzha', region: 'Kerala', lat: 9.49, lon: 76.3264, population: 240991 },
  { name: 'Udhagamandalam', region: 'Tamil Nadu', lat: 11.4134, lon: 76.6952, population: 233426 },
  { name: 'Puri', region: 'Odisha', lat: 19.7983, lon: 85.8249, population: 200564 },
  { name: 'Shimla', region: 'Himachal Pradesh', lat: 31.1044, lon: 77.1666, population: 173503 },
  { name: 'Verāval', region: 'Gujarat', lat: 20.9077, lon: 70.3679, population: 171121 },
  { name: 'Porbandar', region: 'Gujarat', lat: 21.6422, lon: 69.6093, population: 152760 },
  { name: 'Shillong', region: 'Meghalaya', lat: 25.5689, lon: 91.8831, population: 143229 },
  { name: 'Darjeeling', region: 'West Bengal', lat: 27.0333, lon: 88.2667, population: 123797 },
  { name: 'Port Blair', region: 'Andaman and Nicobar', lat: 11.6661, lon: 92.7464, population: 112050 },
  { name: 'Amaravati', region: 'Andhra Pradesh', lat: 16.514, lon: 80.516, population: 103000 },
  { name: 'Gangtok', region: 'Sikkim', lat: 27.3257, lon: 88.6122, population: 100286 },
  { name: 'Kohima', region: 'Nagaland', lat: 25.6747, lon: 94.111, population: 99039 },
  { name: 'Silvassa', region: 'Dadra and Nagar Haveli and Daman and Diu', lat: 20.2739, lon: 72.9967, population: 98265 },
  { name: 'Paradip', region: 'Odisha', lat: 20.3164, lon: 86.6085, population: 85868 },
  { name: 'Karwar', region: 'Karnataka', lat: 14.8136, lon: 74.1297, population: 77139 },
  { name: 'Ratnagiri', region: 'Maharashtra', lat: 16.9915, lon: 73.3102, population: 76229 },
  { name: 'Panaji', region: 'Goa', lat: 15.4957, lon: 73.8262, population: 70991 },
  { name: 'Munnar', region: 'Kerala', lat: 10.0882, lon: 77.0624, population: 68000 },
  { name: 'Itanagar', region: '', lat: 27.0869, lon: 93.6099, population: 59490 },
  { name: 'Rameswaram', region: 'Tamil Nadu', lat: 9.2885, lon: 79.3127, population: 44856 },
  { name: 'Daman', region: 'Dadra and Nagar Haveli and Daman and Diu', lat: 20.4143, lon: 72.8324, population: 44282 },
  { name: 'Nainital', region: 'Uttarakhand', lat: 29.3974, lon: 79.4469, population: 42309 },
  { name: 'Leh', region: 'Ladakh', lat: 34.165, lon: 77.584, population: 37475 },
  { name: 'Kodaikānāl', region: 'Tamil Nadu', lat: 10.2393, lon: 77.4893, population: 36501 },
  { name: 'Manali', region: 'Tamil Nadu', lat: 13.1667, lon: 80.2667, population: 35248 },
  { name: 'Mussoorie', region: 'Uttarakhand', lat: 30.455, lon: 78.0707, population: 25753 },
  { name: 'Mount Abu', region: 'Rajasthan', lat: 24.5937, lon: 72.7176, population: 24981 },
  { name: 'Diu', region: 'Dadra and Nagar Haveli and Daman and Diu', lat: 20.7141, lon: 70.9822, population: 23991 },
  { name: 'Kanniyākumāri', region: 'Tamil Nadu', lat: 8.0901, lon: 77.5384, population: 22453 },
  { name: 'Alibag', region: 'Maharashtra', lat: 18.6481, lon: 72.8758, population: 20752 },
  { name: 'Kavaratti', region: 'Lakshadweep', lat: 10.5669, lon: 72.642, population: 11210 },
  { name: 'Digha', region: 'West Bengal', lat: 21.6278, lon: 87.5197, population: 3667 },
  { name: 'Gulmarg', region: 'Jammu and Kashmir', lat: 34.0536, lon: 74.3819, population: 1965 },
];

/* The opening screen of the picker: the biggest metros plus one coastal city,
   so the first tap can demonstrate the marine data path. Kept short on
   purpose - a wall of chips is a worse starting point than eight obvious
   choices and a search box. */
const POPULAR_CITY_NAMES = [
  'Delhi', 'Mumbai', 'Bengaluru', 'Kolkata', 'Chennai', 'Hyderabad', 'Lucknow', 'Puri',
];

const POPULAR_CITIES = POPULAR_CITY_NAMES
  .map((name) => INDIAN_CITIES.find((c) => c.name === name))
  .filter(Boolean);

const EARTH_RADIUS_KM = 6371;
const toRad = (deg) => (deg * Math.PI) / 180;

/**
 * Great-circle distance in kilometres.
 *
 * Haversine rather than a flat approximation: India spans 30 degrees of
 * latitude, and treating degrees as a grid puts Kanyakumari and Leh measurably
 * closer together than they are.
 */
function distanceKm(lat1, lon1, lat2, lon2) {
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a));
}

/*
  How much closer a village has to be than a city before it wins.

  This function answers "where am I, roughly?", and for that question the
  nearest pin is not always the best answer: someone 14 km from a hamlet and
  15 km from Lucknow is, for every practical purpose, near Lucknow. So each
  candidate's distance is discounted by its significance - about 3 km of
  slack for a metro, half a kilometre for a village - and the smallest
  adjusted distance wins.

  Logarithmic and deliberately small: it breaks near-ties towards the
  recognisable name without ever letting a distant city beat a genuinely
  closer town. The distance reported back is always the true one.
*/
const significanceSlackKm = (population) => Math.log10((population || 0) + 10) / 2;

/**
 * Nearest city in the bundled list, with its true distance.
 *
 * `maxKm` guards against absurd answers: a point in the middle of the Bay of
 * Bengal is not "in Chennai", and saying so would be worse than admitting the
 * name is unknown. Beyond the limit this returns null and the caller falls
 * back to showing coordinates.
 */
function nearestCity(lat, lon, maxKm = 150) {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

  let best = null;
  for (const city of INDIAN_CITIES) {
    const km = distanceKm(lat, lon, city.lat, city.lon);
    const adjusted = km - significanceSlackKm(city.population);
    if (!best || adjusted < best.adjusted) {
      best = { ...city, adjusted, distanceKm: Math.round(km * 10) / 10 };
    }
  }
  if (!best || best.distanceKm > maxKm) return null;

  const { adjusted, ...place } = best;
  return place;
}

module.exports = { INDIAN_CITIES, POPULAR_CITIES, nearestCity, distanceKm };

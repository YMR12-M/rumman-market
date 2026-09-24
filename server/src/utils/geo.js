/**
 * حساب المسافة بين نقطتين على سطح الأرض بمعادلة هافرساين.
 * نستخدمها لترتيب الفروع حسب قربها من موقع العميل.
 *
 * @returns {number} المسافة بالكيلومترات (مقرّبة لخانتين عشريتين)
 */
export function haversineKm(lat1, lon1, lat2, lon2) {
  const EARTH_RADIUS_KM = 6371;
  const toRad = (deg) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;

  return Math.round(EARTH_RADIUS_KM * 2 * Math.asin(Math.sqrt(a)) * 100) / 100;
}

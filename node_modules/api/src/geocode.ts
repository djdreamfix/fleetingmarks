import fetch from 'node-fetch';

export async function reverseGeocode(lat: number, lng: number): Promise<string | undefined> {
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=uk`;
  const res = await fetch(url, { headers: { 'User-Agent': 'fleeting-marks/1.0' } });
  if (!res.ok) return undefined;
  const data = await res.json();
  const road = data?.address?.road || data?.name;
  const city = data?.address?.city || data?.address?.town || data?.address?.village;
  if (road && city) return `вул. ${road}, ${city}`;
  return road || city || data?.display_name;
}

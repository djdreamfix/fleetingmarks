// apps/api/src/geocode.ts
type NominatimPlace = {
  name?: string;
  display_name?: string;
  address?: {
    road?: string;
    pedestrian?: string;
    house_number?: string;
    neighbourhood?: string;
    suburb?: string;
    city?: string;
    town?: string;
    village?: string;
    state?: string;
    country?: string;
  };
};

function isPlace(x: unknown): x is NominatimPlace {
  return typeof x === "object" && x !== null;
}

export async function reverseGeocode(lat: number, lng: number): Promise<string | undefined> {
  const url =
    `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;

  const r = await fetch(url, {
    headers: {
      // бажано для Nominatim
      "User-Agent": "fleetingmarks/1.0 (admin@example.com)",
      "Accept": "application/json",
    },
  });

  if (!r.ok) return undefined;

  const data: unknown = await r.json();
  if (!isPlace(data)) return undefined;

  const address = data.address;

  // Найбільш стабільний “street label”
  const street =
    address?.road ||
    address?.pedestrian ||
    data.name ||
    data.display_name;

  if (!street) return undefined;

  // Якщо треба більш “людське” — можете зібрати з road + house_number
  const house = address?.house_number;
  if (address?.road && house) return `${address.road} ${house}`;

  return street;
}

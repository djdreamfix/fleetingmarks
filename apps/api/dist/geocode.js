function isPlace(x) {
    return typeof x === "object" && x !== null;
}
export async function reverseGeocode(lat, lng) {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;
    const r = await fetch(url, {
        headers: {
            // бажано для Nominatim
            "User-Agent": "fleetingmarks/1.0 (admin@example.com)",
            "Accept": "application/json",
        },
    });
    if (!r.ok)
        return undefined;
    const data = await r.json();
    if (!isPlace(data))
        return undefined;
    const address = data.address;
    // Найбільш стабільний “street label”
    const street = address?.road ||
        address?.pedestrian ||
        data.name ||
        data.display_name;
    if (!street)
        return undefined;
    // Якщо треба більш “людське” — можете зібрати з road + house_number
    const house = address?.house_number;
    if (address?.road && house)
        return `${address.road} ${house}`;
    return street;
}

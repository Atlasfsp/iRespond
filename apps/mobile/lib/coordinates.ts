export type CoordinateSource = 'device' | 'manual';

export type InterventionCoordinates = {
  latitude: number;
  longitude: number;
};

export function parseInterventionCoordinates(
  latitude: string | number | undefined,
  longitude: string | number | undefined,
): InterventionCoordinates | null {
  if (latitude === undefined || longitude === undefined) return null;
  const latitudeText = typeof latitude === 'number' ? String(latitude) : latitude.trim();
  const longitudeText = typeof longitude === 'number' ? String(longitude) : longitude.trim();
  if (!latitudeText || !longitudeText) return null;
  const parsedLatitude = Number(latitudeText);
  const parsedLongitude = Number(longitudeText);
  if (!Number.isFinite(parsedLatitude) || !Number.isFinite(parsedLongitude)) return null;
  if (parsedLatitude < -90 || parsedLatitude > 90 || parsedLongitude < -180 || parsedLongitude > 180) return null;
  return { latitude: parsedLatitude, longitude: parsedLongitude };
}

export function formatCoordinate(value: number) {
  return value.toFixed(6);
}

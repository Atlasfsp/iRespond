export type CoordinateSource = 'device' | 'manual';

export type InterventionCoordinates = {
  latitude: number;
  longitude: number;
};

export function parseInterventionCoordinates(
  latitude: string | number | undefined,
  longitude: string | number | undefined,
): InterventionCoordinates | null {
  if (latitude === '' || longitude === '' || latitude === undefined || longitude === undefined) return null;
  const parsedLatitude = typeof latitude === 'number' ? latitude : Number(latitude.trim());
  const parsedLongitude = typeof longitude === 'number' ? longitude : Number(longitude.trim());
  if (!Number.isFinite(parsedLatitude) || !Number.isFinite(parsedLongitude)) return null;
  if (parsedLatitude < -90 || parsedLatitude > 90 || parsedLongitude < -180 || parsedLongitude > 180) return null;
  return { latitude: parsedLatitude, longitude: parsedLongitude };
}

export function formatCoordinate(value: number) {
  return value.toFixed(6);
}

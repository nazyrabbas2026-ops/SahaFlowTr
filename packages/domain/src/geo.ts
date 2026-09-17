export interface Coordinate {
  latitude: number;
  longitude: number;
}

const EARTH_RADIUS_METERS = 6_371_000;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

export function isCoordinate(value: unknown): value is Coordinate {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<Coordinate>;
  return (
    typeof candidate.latitude === "number" &&
    typeof candidate.longitude === "number" &&
    candidate.latitude >= -90 &&
    candidate.latitude <= 90 &&
    candidate.longitude >= -180 &&
    candidate.longitude <= 180
  );
}

/** Great-circle distance in meters. */
export function haversineMeters(from: Coordinate, to: Coordinate): number {
  const dLat = toRadians(to.latitude - from.latitude);
  const dLon = toRadians(to.longitude - from.longitude);
  const lat1 = toRadians(from.latitude);
  const lat2 = toRadians(to.latitude);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.min(1, Math.sqrt(a)));
}

/**
 * Straight-line distance inflated to an approximate road distance. Urban routing
 * rarely follows a straight line; 1.35 is a conservative detour factor.
 */
export function estimatedRoadMeters(
  from: Coordinate,
  to: Coordinate,
  detourFactor = 1.35,
): number {
  return haversineMeters(from, to) * detourFactor;
}

export function travelMinutes(
  meters: number,
  averageSpeedKmh = 32,
  latencyMinutes = 0,
): number {
  const speedMetersPerMinute = Math.max(1, (averageSpeedKmh * 1000) / 60);
  return Math.round(meters / speedMetersPerMinute) + Math.max(0, latencyMinutes);
}

export function formatDistance(meters: number): string {
  if (meters < 950) return `${Math.round(meters / 10) * 10} m`;
  return `${(meters / 1000).toLocaleString("tr-TR", { maximumFractionDigits: 1 })} km`;
}

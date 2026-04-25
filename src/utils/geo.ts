import type { GpxPoint, RouteSummary, TrackPoint } from '../types'

const EARTH_RADIUS_METERS = 6_371_008.8

const toRadians = (degrees: number) => (degrees * Math.PI) / 180
const toDegrees = (radians: number) => (radians * 180) / Math.PI

export function haversineDistance(a: GpxPoint, b: GpxPoint): number {
  const deltaLat = toRadians(b.lat - a.lat)
  const deltaLon = toRadians(b.lon - a.lon)
  const lat1 = toRadians(a.lat)
  const lat2 = toRadians(b.lat)

  const sinLat = Math.sin(deltaLat / 2)
  const sinLon = Math.sin(deltaLon / 2)
  const h =
    sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLon * sinLon

  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.min(1, Math.sqrt(h)))
}

export function calculateBearing(a: GpxPoint, b: GpxPoint): number {
  const lat1 = toRadians(a.lat)
  const lat2 = toRadians(b.lat)
  const deltaLon = toRadians(b.lon - a.lon)
  const y = Math.sin(deltaLon) * Math.cos(lat2)
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLon)

  return (toDegrees(Math.atan2(y, x)) + 360) % 360
}

export function buildTrack(points: GpxPoint[]): {
  points: TrackPoint[]
  stats: RouteSummary
} {
  let totalDistance = 0
  let elevationGain = 0
  let elevationLoss = 0
  const firstTimestamp = points.find((point) =>
    Number.isFinite(point.timestamp),
  )?.timestamp

  const trackPoints = points.map<TrackPoint>((point, index) => {
    const previous = points[index - 1]
    const segmentDistance = previous ? haversineDistance(previous, point) : 0
    totalDistance += segmentDistance

    let grade = 0
    if (
      previous?.elevation !== null &&
      previous?.elevation !== undefined &&
      point.elevation !== null &&
      segmentDistance > 0
    ) {
      const elevationChange = point.elevation - previous.elevation
      grade = (elevationChange / segmentDistance) * 100

      if (elevationChange > 0) {
        elevationGain += elevationChange
      } else if (elevationChange < 0) {
        elevationLoss += Math.abs(elevationChange)
      }
    }

    const elapsedSeconds =
      firstTimestamp !== undefined && point.timestamp !== undefined
        ? Math.max(0, (point.timestamp - firstTimestamp) / 1000)
        : undefined

    return {
      ...point,
      segmentDistance,
      distanceFromStart: totalDistance,
      grade,
      elapsedSeconds,
    }
  })

  const elevations = trackPoints
    .map((point) => point.elevation)
    .filter((elevation): elevation is number => elevation !== null)
  const timestampedPoints = trackPoints.filter((point) =>
    Number.isFinite(point.timestamp),
  )
  const startTimestamp = timestampedPoints[0]?.timestamp
  const endTimestamp = timestampedPoints.at(-1)?.timestamp
  const durationSeconds =
    startTimestamp !== undefined &&
    endTimestamp !== undefined &&
    endTimestamp > startTimestamp
      ? (endTimestamp - startTimestamp) / 1000
      : undefined

  return {
    points: trackPoints,
    stats: {
      pointCount: trackPoints.length,
      totalDistance,
      elevationGain,
      elevationLoss,
      minElevation: elevations.length ? Math.min(...elevations) : null,
      maxElevation: elevations.length ? Math.max(...elevations) : null,
      hasTimestamps: timestampedPoints.length >= 2,
      startTimestamp,
      endTimestamp,
      durationSeconds,
    },
  }
}

export function findPointIndexByDistance(
  points: TrackPoint[],
  targetDistance: number,
): number {
  if (points.length === 0 || targetDistance <= 0) {
    return 0
  }

  const lastIndex = points.length - 1
  if (targetDistance >= points[lastIndex].distanceFromStart) {
    return lastIndex
  }

  let low = 0
  let high = lastIndex
  while (low < high) {
    const middle = Math.floor((low + high) / 2)
    if (points[middle].distanceFromStart < targetDistance) {
      low = middle + 1
    } else {
      high = middle
    }
  }

  const previousIndex = Math.max(0, low - 1)
  const previousDelta = Math.abs(
    points[previousIndex].distanceFromStart - targetDistance,
  )
  const nextDelta = Math.abs(points[low].distanceFromStart - targetDistance)

  return nextDelta < previousDelta ? low : previousIndex
}

export function getCurrentSegmentStats(
  points: TrackPoint[],
  currentIndex: number,
) {
  const current = points[currentIndex]
  const previous = points[Math.max(0, currentIndex - 1)]
  if (
    !current ||
    !previous ||
    current.timestamp === undefined ||
    previous.timestamp === undefined
  ) {
    return {}
  }

  const deltaSeconds = (current.timestamp - previous.timestamp) / 1000
  if (deltaSeconds <= 0 || current.segmentDistance <= 0) {
    return {}
  }

  const speedMps = current.segmentDistance / deltaSeconds
  return {
    speedMps,
    paceSecondsPerKm: 1000 / speedMps,
  }
}

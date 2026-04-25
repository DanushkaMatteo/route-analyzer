export type CameraMode = 'free' | 'follow' | 'cinematic'

export interface GpxPoint {
  lat: number
  lon: number
  elevation: number | null
  time?: string
  timestamp?: number
}

export interface TrackPoint extends GpxPoint {
  segmentDistance: number
  distanceFromStart: number
  grade: number
  elapsedSeconds?: number
}

export interface RouteSummary {
  pointCount: number
  totalDistance: number
  elevationGain: number
  elevationLoss: number
  minElevation: number | null
  maxElevation: number | null
  hasTimestamps: boolean
  startTimestamp?: number
  endTimestamp?: number
  durationSeconds?: number
}

export interface ParsedRoute {
  id: string
  name: string
  fileName: string
  points: TrackPoint[]
  stats: RouteSummary
}

export interface CurrentSegmentStats {
  speedMps?: number
  paceSecondsPerKm?: number
}

export interface StoredRouteRecord {
  id: string
  name: string
  fileName: string
  uploadedAt: number
  route: ParsedRoute
  rawGpx: string
}

export interface StoredRouteSummary {
  id: string
  name: string
  fileName: string
  uploadedAt: number
  pointCount: number
  totalDistance: number
  elevationGain: number
  elevationLoss: number
  hasTimestamps: boolean
  durationSeconds?: number
}

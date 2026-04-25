import { gpx } from '@tmcw/togeojson'
import type {
  Feature,
  GeoJsonProperties,
  LineString,
  MultiLineString,
  Position,
} from 'geojson'
import type { GpxPoint, ParsedRoute } from '../types'
import { buildTrack } from './geo'

type LineFeature = Feature<LineString | MultiLineString, GeoJsonProperties>

interface CandidateRoute {
  feature: LineFeature
  coordinates: Position[]
  times: Array<string | undefined>
  score: number
}

export async function parseGpxFile(file: File): Promise<ParsedRoute> {
  const text = await file.text()
  return parseGpxText(text, file.name)
}

export function parseGpxText(
  text: string,
  fileName = 'route.gpx',
  routeId = createRouteId(fileName),
): ParsedRoute {
  if (!text.trim()) {
    throw new Error('The GPX file is empty.')
  }

  const document = new DOMParser().parseFromString(text, 'application/xml')
  if (document.querySelector('parsererror')) {
    throw new Error('The GPX file is not valid XML.')
  }

  if (!document.querySelector('gpx')) {
    throw new Error('The file does not contain a GPX document.')
  }

  const collection = gpx(document)
  const candidates = collection.features
    .filter(isLineFeature)
    .map(toCandidateRoute)
    .filter((candidate): candidate is CandidateRoute => candidate !== null)

  if (candidates.length === 0) {
    throw new Error('No usable track or route with at least two points was found.')
  }

  candidates.sort((a, b) => b.score - a.score)
  const selected = candidates[0]
  const rawPoints = selected.coordinates.map<GpxPoint>((coordinate, index) => {
    const lon = Number(coordinate[0])
    const lat = Number(coordinate[1])
    const elevation = Number(coordinate[2])
    const time = selected.times[index]
    const parsedTimestamp = time ? Date.parse(time) : Number.NaN

    if (!isValidCoordinate(lat, lon)) {
      throw new Error('The GPX file contains invalid latitude or longitude data.')
    }

    return {
      lat,
      lon,
      elevation: Number.isFinite(elevation) ? elevation : null,
      time,
      timestamp: Number.isFinite(parsedTimestamp) ? parsedTimestamp : undefined,
    }
  })

  const uniquePoints = removeConsecutiveDuplicates(rawPoints)
  if (uniquePoints.length < 2) {
    throw new Error('The GPX route needs at least two unique points.')
  }

  const { points, stats } = buildTrack(uniquePoints)
  if (stats.totalDistance <= 0) {
    throw new Error('The GPX route has no measurable distance.')
  }

  const routeName = readFeatureName(selected.feature) ?? fileName.replace(/\.gpx$/i, '')

  return {
    id: routeId,
    name: routeName || 'Uploaded route',
    fileName,
    points,
    stats,
  }
}

export function createRouteId(fileName = 'route.gpx'): string {
  const fallbackId = `${fileName}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}`
  return globalThis.crypto?.randomUUID?.() ?? fallbackId
}

function isLineFeature(feature: Feature): feature is LineFeature {
  return (
    feature.geometry?.type === 'LineString' ||
    feature.geometry?.type === 'MultiLineString'
  )
}

function toCandidateRoute(feature: LineFeature): CandidateRoute | null {
  const coordinates =
    feature.geometry.type === 'LineString'
      ? feature.geometry.coordinates
      : feature.geometry.coordinates.flat()

  if (coordinates.length < 2) {
    return null
  }

  const times = flattenCoordinateTimes(feature)
  const hasMatchingTimes = times.length === coordinates.length
  const featureType = feature.properties?._gpxType
  const trackBias = featureType === 'trk' ? 1_000_000 : 0

  return {
    feature,
    coordinates,
    times: hasMatchingTimes ? times : [],
    score: trackBias + coordinates.length,
  }
}

function flattenCoordinateTimes(feature: LineFeature): Array<string | undefined> {
  const coordinateProperties = feature.properties?.coordinateProperties
  if (!isRecord(coordinateProperties)) {
    return []
  }

  const times = coordinateProperties.times
  if (!Array.isArray(times)) {
    return []
  }

  if (feature.geometry.type === 'LineString') {
    return times.filter((time): time is string => typeof time === 'string')
  }

  return times.flatMap((segmentTimes) =>
    Array.isArray(segmentTimes)
      ? segmentTimes.filter((time): time is string => typeof time === 'string')
      : [],
  )
}

function readFeatureName(feature: LineFeature): string | null {
  const name = feature.properties?.name
  return typeof name === 'string' && name.trim() ? name.trim() : null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isValidCoordinate(lat: number, lon: number): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lon) &&
    lat >= -90 &&
    lat <= 90 &&
    lon >= -180 &&
    lon <= 180
  )
}

function removeConsecutiveDuplicates(points: GpxPoint[]): GpxPoint[] {
  return points.filter((point, index) => {
    const previous = points[index - 1]
    return (
      !previous ||
      previous.lat !== point.lat ||
      previous.lon !== point.lon ||
      previous.elevation !== point.elevation
    )
  })
}

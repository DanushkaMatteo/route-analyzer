import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import type { FeatureCollection, LineString } from 'geojson'
import type {
  CameraMode,
  CurrentSegmentStats,
  ParsedRoute,
  TrackPoint,
} from '../types'
import { calculateBearing } from '../utils/geo'
import StatsPanel from './StatsPanel'
import { useDraggableOverlay } from '../hooks/useDraggableOverlay'

const ROUTE_SOURCE_ID = 'uploaded-route-source'
const ROUTE_CASING_LAYER_ID = 'uploaded-route-casing'
const ROUTE_LAYER_ID = 'uploaded-route-line'
const TERRAIN_SOURCE_ID = 'mapbox-terrain-dem'
const HILLSHADE_SOURCE_ID = 'mapbox-hillshade-dem'
const HILLSHADE_LAYER_ID = 'mapbox-terrain-hillshade'
const TERRAIN_EXAGGERATION = 2.6

interface MapViewProps {
  route: ParsedRoute | null
  currentIndex: number
  progress: number
  cameraMode: CameraMode
  mapboxToken: string
  segmentStats: CurrentSegmentStats
  onCameraModeChange: (mode: CameraMode) => void
}

function MapView({
  route,
  currentIndex,
  progress,
  cameraMode,
  mapboxToken,
  segmentStats,
  onCameraModeChange,
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const currentMarkerRef = useRef<mapboxgl.Marker | null>(null)
  const startMarkerRef = useRef<mapboxgl.Marker | null>(null)
  const finishMarkerRef = useRef<mapboxgl.Marker | null>(null)
  const [isMapReady, setIsMapReady] = useState(false)
  const toolbarDrag = useDraggableOverlay('map-toolbar')

  const points = route?.points ?? []
  const currentPoint = points[currentIndex] ?? null

  const routeData = useMemo<FeatureCollection<LineString>>(
    () => ({
      type: 'FeatureCollection',
      features:
        points.length >= 2
          ? [
              {
                type: 'Feature',
                properties: {},
                geometry: {
                  type: 'LineString',
                  coordinates: points.map((point) => [
                    point.lon,
                    point.lat,
                    point.elevation ?? 0,
                  ]),
                },
              },
            ]
          : [],
    }),
    [points],
  )

  const fitRoute = useCallback(() => {
    const map = mapRef.current
    if (!map || points.length === 0) {
      return
    }

    const bounds = new mapboxgl.LngLatBounds()
    points.forEach((point) => bounds.extend([point.lon, point.lat]))

    map.fitBounds(bounds, {
      duration: 850,
      maxZoom: cameraMode === 'cinematic' ? 15.75 : 15,
      padding: {
        top: window.innerWidth > 960 ? 138 : 96,
        right: 96,
        bottom: window.innerWidth > 960 ? 310 : 240,
        left: window.innerWidth > 960 ? 430 : 72,
      },
    })
  }, [cameraMode, points])

  useEffect(() => {
    if (!mapboxToken || !containerRef.current || mapRef.current) {
      return
    }

    mapboxgl.accessToken = mapboxToken

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/satellite-streets-v12',
      center: [-3.5, 54.5],
      zoom: 5,
      pitch: 0,
      bearing: 0,
      antialias: true,
      attributionControl: true,
    })

    map.setMaxPitch(85)
    map.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }), 'bottom-right')
    map.addControl(new mapboxgl.ScaleControl({ unit: 'metric' }), 'bottom-left')

    map.on('load', () => {
      enableTerrain(map)
      setIsMapReady(true)
    })

    mapRef.current = map

    return () => {
      currentMarkerRef.current?.remove()
      startMarkerRef.current?.remove()
      finishMarkerRef.current?.remove()
      map.remove()
      mapRef.current = null
      setIsMapReady(false)
    }
  }, [mapboxToken])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !isMapReady) {
      return
    }

    const existingSource = map.getSource(ROUTE_SOURCE_ID) as
      | mapboxgl.GeoJSONSource
      | undefined

    if (existingSource) {
      existingSource.setData(routeData)
    } else {
      map.addSource(ROUTE_SOURCE_ID, {
        type: 'geojson',
        data: routeData,
        lineMetrics: true,
      })

      map.addLayer({
        id: ROUTE_CASING_LAYER_ID,
        type: 'line',
        source: ROUTE_SOURCE_ID,
        layout: {
          'line-cap': 'round',
          'line-join': 'round',
        },
        paint: {
          'line-color': '#050505',
          'line-width': [
            'interpolate',
            ['linear'],
            ['zoom'],
            8,
            7,
            14,
            11,
            17,
            17,
          ],
          'line-opacity': 0.78,
        },
      })

      map.addLayer({
        id: ROUTE_LAYER_ID,
        type: 'line',
        source: ROUTE_SOURCE_ID,
        layout: {
          'line-cap': 'round',
          'line-join': 'round',
        },
        paint: {
          'line-gradient': [
            'interpolate',
            ['linear'],
            ['line-progress'],
            0,
            '#ffe24a',
            0.45,
            '#ff7a00',
            1,
            '#ff2c18',
          ],
          'line-width': [
            'interpolate',
            ['linear'],
            ['zoom'],
            8,
            4,
            14,
            7,
            17,
            12,
          ],
          'line-opacity': 0.96,
          'line-emissive-strength': 1,
        },
      })
    }

    startMarkerRef.current?.remove()
    finishMarkerRef.current?.remove()
    startMarkerRef.current = null
    finishMarkerRef.current = null

    if (points.length >= 2) {
      const start = points[0]
      const finish = points[points.length - 1]
      startMarkerRef.current = new mapboxgl.Marker({ color: '#2f7d59' })
        .setLngLat([start.lon, start.lat])
        .setPopup(new mapboxgl.Popup({ offset: 20 }).setText('Start'))
        .addTo(map)
      finishMarkerRef.current = new mapboxgl.Marker({ color: '#2563a9' })
        .setLngLat([finish.lon, finish.lat])
        .setPopup(new mapboxgl.Popup({ offset: 20 }).setText('Finish'))
        .addTo(map)

      window.requestAnimationFrame(() => {
        if (cameraMode === 'cinematic') {
          focusTerrainCamera(map, points, 0, 1250)
        } else {
          fitRoute()
        }
      })
    }
  }, [cameraMode, fitRoute, isMapReady, points, routeData])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !isMapReady) {
      return
    }

    enableTerrain(map)
  }, [isMapReady])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !isMapReady) {
      return
    }

    if (!currentPoint) {
      currentMarkerRef.current?.remove()
      currentMarkerRef.current = null
      return
    }

    if (!currentMarkerRef.current) {
      currentMarkerRef.current = new mapboxgl.Marker({
        element: createRunnerMarker(),
      })
        .setLngLat([currentPoint.lon, currentPoint.lat])
        .addTo(map)
    }

    currentMarkerRef.current.setLngLat([currentPoint.lon, currentPoint.lat])
  }, [currentPoint, isMapReady])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !isMapReady || cameraMode !== 'free') {
      return
    }

    map.easeTo({
      pitch: 0,
      bearing: 0,
      duration: 550,
    })
  }, [cameraMode, isMapReady])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !isMapReady || !currentPoint) {
      return
    }

    if (cameraMode === 'free') {
      return
    }

    const nextPoint = getNextPoint(points, currentIndex)
    const bearing =
      cameraMode === 'cinematic' && nextPoint
        ? calculateBearing(currentPoint, nextPoint)
        : map.getBearing()

    map.easeTo({
      center: [currentPoint.lon, currentPoint.lat],
      zoom: cameraMode === 'cinematic' ? Math.max(map.getZoom(), 16.4) : map.getZoom(),
      pitch: cameraMode === 'cinematic' ? 78 : map.getPitch(),
      bearing,
      duration: 650,
      essential: true,
    })
  }, [cameraMode, currentIndex, currentPoint, isMapReady, points])

  return (
    <section className="map-shell" aria-label="Route map">
      <div ref={containerRef} className="map-container" />

      {!mapboxToken ? (
        <div className="map-state">
          <h2>Mapbox token missing</h2>
          <p>Add VITE_MAPBOX_TOKEN to your environment.</p>
        </div>
      ) : null}

      <StatsPanel
        route={route}
        currentPoint={currentPoint}
        progress={progress}
        segmentStats={segmentStats}
      />

      <div
        className="map-toolbar"
        aria-label="Camera controls"
        style={toolbarDrag.style}
        onPointerDown={toolbarDrag.onPointerDown}
      >
        <div className="mode-switch">
          <button
            type="button"
            className={cameraMode === 'free' ? 'active' : ''}
            onClick={() => onCameraModeChange('free')}
          >
            Free
          </button>
          <button
            type="button"
            className={cameraMode === 'follow' ? 'active' : ''}
            onClick={() => onCameraModeChange('follow')}
            disabled={!route}
          >
            Follow
          </button>
          <button
            type="button"
            className={cameraMode === 'cinematic' ? 'active' : ''}
            onClick={() => onCameraModeChange('cinematic')}
            disabled={!route}
          >
            3D Terrain
          </button>
        </div>
        <button type="button" onClick={fitRoute} disabled={!route || !mapboxToken}>
          Fit Route
        </button>
      </div>
    </section>
  )
}

function enableTerrain(map: mapboxgl.Map) {
  if (!map.getSource(TERRAIN_SOURCE_ID)) {
    map.addSource(TERRAIN_SOURCE_ID, {
      type: 'raster-dem',
      url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
      tileSize: 512,
      maxzoom: 14,
    })
  }

  if (!map.getSource(HILLSHADE_SOURCE_ID)) {
    map.addSource(HILLSHADE_SOURCE_ID, {
      type: 'raster-dem',
      url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
      tileSize: 512,
      maxzoom: 14,
    })
  }

  if (!map.getLayer(HILLSHADE_LAYER_ID)) {
    const beforeLayer = map.getLayer(ROUTE_CASING_LAYER_ID)
      ? ROUTE_CASING_LAYER_ID
      : undefined

    map.addLayer(
      {
        id: HILLSHADE_LAYER_ID,
        type: 'hillshade',
        source: HILLSHADE_SOURCE_ID,
        paint: {
          'hillshade-accent-color': '#6f7159',
          'hillshade-exaggeration': 0.72,
          'hillshade-highlight-color': '#ffffff',
          'hillshade-shadow-color': '#151814',
        },
      },
      beforeLayer,
    )
  }

  map.setTerrain({
    source: TERRAIN_SOURCE_ID,
    exaggeration: TERRAIN_EXAGGERATION,
  })

  map.setFog({
    color: 'rgb(218, 226, 220)',
    'high-color': 'rgb(104, 135, 166)',
    'horizon-blend': 0.22,
    'space-color': 'rgb(7, 10, 12)',
    'star-intensity': 0.02,
  })
}

function focusTerrainCamera(
  map: mapboxgl.Map,
  points: TrackPoint[],
  index: number,
  duration = 900,
) {
  const point = points[index]
  if (!point) {
    return
  }

  const nextPoint = getNextPoint(points, index)
  const bearing = nextPoint ? calculateBearing(point, nextPoint) : map.getBearing()

  map.easeTo({
    center: [point.lon, point.lat],
    zoom: 16.4,
    pitch: 78,
    bearing,
    duration,
    essential: true,
  })
}

function createRunnerMarker() {
  const marker = document.createElement('div')
  marker.className = 'runner-marker'
  return marker
}

function getNextPoint(points: TrackPoint[], currentIndex: number) {
  return points[Math.min(points.length - 1, currentIndex + 1)]
}

export default MapView

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import ElevationChart from './components/ElevationChart'
import GPXUploader from './components/GPXUploader'
import MapView from './components/MapView'
import PlaybackControls from './components/PlaybackControls'
import RouteLibrary from './components/RouteLibrary'
import { useDraggableOverlay } from './hooks/useDraggableOverlay'
import type { CameraMode, ParsedRoute, StoredRouteSummary } from './types'
import { findPointIndexByDistance, getCurrentSegmentStats } from './utils/geo'
import { createRouteId, parseGpxText } from './utils/gpx'
import {
  deleteStoredRoute,
  getStoredRoute,
  listStoredRoutes,
  saveStoredRoute,
} from './utils/routeStorage'
import './App.css'

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN ?? ''

function App() {
  const [route, setRoute] = useState<ParsedRoute | null>(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [cameraMode, setCameraMode] = useState<CameraMode>('free')
  const [isParsingFile, setIsParsingFile] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [storedRoutes, setStoredRoutes] = useState<StoredRouteSummary[]>([])
  const [isLoadingLibrary, setIsLoadingLibrary] = useState(true)
  const [libraryError, setLibraryError] = useState<string | null>(null)
  const [loadingRouteId, setLoadingRouteId] = useState<string | null>(null)
  const [activeStoredRouteId, setActiveStoredRouteId] = useState<string | null>(null)
  const playbackDistanceRef = useRef(0)
  const dockDrag = useDraggableOverlay('analysis-dock')

  const currentPoint = route?.points[currentIndex] ?? null
  const maxIndex = route ? route.points.length - 1 : 0
  const progress =
    route && maxIndex > 0 ? (currentIndex / maxIndex) * 100 : 0
  const segmentStats = useMemo(
    () => (route ? getCurrentSegmentStats(route.points, currentIndex) : {}),
    [currentIndex, route],
  )

  const refreshStoredRoutes = useCallback(async () => {
    setLibraryError(null)

    try {
      setStoredRoutes(await listStoredRoutes())
    } catch {
      setLibraryError('Saved routes could not be loaded in this browser.')
    }
  }, [])

  useEffect(() => {
    refreshStoredRoutes().finally(() => setIsLoadingLibrary(false))
  }, [refreshStoredRoutes])

  useEffect(() => {
    if (!isPlaying || !route) {
      return
    }

    let animationFrame = 0
    let previousTimestamp = performance.now()
    const baseDuration = getPlaybackDuration(route.stats.totalDistance)
    const metersPerSecond = route.stats.totalDistance / baseDuration

    const tick = (timestamp: number) => {
      const deltaSeconds = Math.max(0, (timestamp - previousTimestamp) / 1000)
      previousTimestamp = timestamp

      setCurrentIndex((previousIndex) => {
        const lastIndex = route.points.length - 1
        if (
          previousIndex >= lastIndex ||
          playbackDistanceRef.current >= route.stats.totalDistance
        ) {
          setIsPlaying(false)
          return lastIndex
        }

        const nextDistance = Math.min(
          route.stats.totalDistance,
          playbackDistanceRef.current + metersPerSecond * speed * deltaSeconds,
        )
        playbackDistanceRef.current = nextDistance

        if (nextDistance >= route.stats.totalDistance) {
          setIsPlaying(false)
          return lastIndex
        }

        return Math.max(
          previousIndex,
          findPointIndexByDistance(route.points, nextDistance),
        )
      })

      animationFrame = window.requestAnimationFrame(tick)
    }

    animationFrame = window.requestAnimationFrame(tick)

    return () => {
      window.cancelAnimationFrame(animationFrame)
    }
  }, [isPlaying, route, speed])

  const handleUpload = async (file: File) => {
    setIsParsingFile(true)
    setError(null)
    setIsPlaying(false)

    try {
      const rawGpx = await file.text()
      const routeId = createRouteId(file.name)
      const parsedRoute = parseGpxText(rawGpx, file.name, routeId)
      playbackDistanceRef.current = 0
      setRoute(parsedRoute)
      setCurrentIndex(0)
      setCameraMode('cinematic')
      setActiveStoredRouteId(parsedRoute.id)

      try {
        await saveStoredRoute(parsedRoute, rawGpx)
        await refreshStoredRoutes()
      } catch {
        setError('Route loaded, but it could not be saved locally.')
      }
    } catch (unknownError) {
      setRoute(null)
      setCurrentIndex(0)
      playbackDistanceRef.current = 0
      setActiveStoredRouteId(null)
      setError(
        unknownError instanceof Error
          ? unknownError.message
          : 'Unable to parse this GPX file.',
      )
    } finally {
      setIsParsingFile(false)
    }
  }

  const handleLoadStoredRoute = async (id: string) => {
    setLoadingRouteId(id)
    setError(null)
    setIsPlaying(false)

    try {
      const storedRoute = await getStoredRoute(id)
      if (!storedRoute) {
        setLibraryError('That saved route is no longer available.')
        await refreshStoredRoutes()
        return
      }

      playbackDistanceRef.current = 0
      setRoute(storedRoute.route)
      setCurrentIndex(0)
      setCameraMode('cinematic')
      setActiveStoredRouteId(storedRoute.id)
    } catch {
      setLibraryError('Saved route could not be opened.')
    } finally {
      setLoadingRouteId(null)
    }
  }

  const handleDeleteStoredRoute = async (id: string) => {
    try {
      await deleteStoredRoute(id)
      await refreshStoredRoutes()

      if (id === activeStoredRouteId) {
        setRoute(null)
        setCurrentIndex(0)
        playbackDistanceRef.current = 0
        setIsPlaying(false)
        setActiveStoredRouteId(null)
      }
    } catch {
      setLibraryError('Saved route could not be deleted.')
    }
  }

  const handlePlay = () => {
    if (!route) {
      return
    }

    if (currentIndex >= route.points.length - 1) {
      playbackDistanceRef.current = 0
      setCurrentIndex(0)
    } else {
      playbackDistanceRef.current =
        route.points[currentIndex]?.distanceFromStart ?? 0
    }
    setIsPlaying(true)
  }

  const handlePause = () => setIsPlaying(false)

  const handleReset = () => {
    setIsPlaying(false)
    playbackDistanceRef.current = 0
    setCurrentIndex(0)
  }

  const handleScrub = (index: number) => {
    const clampedIndex = Math.min(Math.max(0, index), maxIndex)
    playbackDistanceRef.current =
      route?.points[clampedIndex]?.distanceFromStart ?? 0
    setCurrentIndex(clampedIndex)
    if (clampedIndex >= maxIndex) {
      setIsPlaying(false)
    }
  }

  const coveredDistance = currentPoint?.distanceFromStart ?? 0
  const totalDistance = route?.stats.totalDistance ?? 0

  return (
    <main className="app-shell">
      <MapView
        route={route}
        currentIndex={currentIndex}
        progress={progress}
        cameraMode={cameraMode}
        mapboxToken={MAPBOX_TOKEN}
        segmentStats={segmentStats}
        onCameraModeChange={setCameraMode}
      />

      <GPXUploader
        route={route}
        isLoading={isParsingFile}
        error={error}
        onUpload={handleUpload}
      />

      <RouteLibrary
        routes={storedRoutes}
        activeRouteId={activeStoredRouteId}
        isLoading={isLoadingLibrary}
        loadingRouteId={loadingRouteId}
        error={libraryError}
        onLoadRoute={handleLoadStoredRoute}
        onDeleteRoute={handleDeleteStoredRoute}
      />

      <div
        className="analysis-dock"
        style={dockDrag.style}
        onPointerDown={dockDrag.onPointerDown}
      >
        <PlaybackControls
          disabled={!route}
          isPlaying={isPlaying}
          speed={speed}
          currentIndex={currentIndex}
          maxIndex={maxIndex}
          coveredDistance={coveredDistance}
          totalDistance={totalDistance}
          progress={progress}
          onPlay={handlePlay}
          onPause={handlePause}
          onReset={handleReset}
          onScrub={handleScrub}
          onSpeedChange={setSpeed}
        />

        <ElevationChart
          route={route}
          currentIndex={currentIndex}
          onSelectIndex={(index) => handleScrub(index)}
        />
      </div>
    </main>
  )
}

function getPlaybackDuration(totalDistance: number) {
  const distanceBasedDuration = totalDistance / 100
  return Math.min(240, Math.max(30, distanceBasedDuration))
}

export default App

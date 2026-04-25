import type { CurrentSegmentStats, ParsedRoute, TrackPoint } from '../types'
import {
  formatCoordinates,
  formatDistance,
  formatDuration,
  formatElevation,
  formatGrade,
  formatPace,
  formatPercent,
  formatSpeed,
} from '../utils/format'
import { useDraggableOverlay } from '../hooks/useDraggableOverlay'

interface StatsPanelProps {
  route: ParsedRoute | null
  currentPoint: TrackPoint | null
  progress: number
  segmentStats: CurrentSegmentStats
}

function StatsPanel({
  route,
  currentPoint,
  progress,
  segmentStats,
}: StatsPanelProps) {
  const drag = useDraggableOverlay('stats-panel')

  if (!route || !currentPoint) {
    return (
      <aside
        className="stats-panel"
        aria-label="Route statistics"
        style={drag.style}
        onPointerDown={drag.onPointerDown}
      >
        <h2>Route Stats</h2>
        <p className="muted">Upload a GPX to begin.</p>
      </aside>
    )
  }

  const { stats } = route

  return (
    <aside
      className="stats-panel"
      aria-label="Route statistics"
      style={drag.style}
      onPointerDown={drag.onPointerDown}
    >
      <div className="stats-heading">
        <h2>Live Stats</h2>
        <span>{formatPercent(progress)}</span>
      </div>

      <dl className="stats-grid">
        <div>
          <dt>Covered</dt>
          <dd>{formatDistance(currentPoint.distanceFromStart)}</dd>
        </div>
        <div>
          <dt>Total</dt>
          <dd>{formatDistance(stats.totalDistance)}</dd>
        </div>
        <div>
          <dt>Elevation</dt>
          <dd>{formatElevation(currentPoint.elevation)}</dd>
        </div>
        <div>
          <dt>Grade</dt>
          <dd>{formatGrade(currentPoint.grade)}</dd>
        </div>
        <div>
          <dt>Gain</dt>
          <dd>{formatElevation(stats.elevationGain)}</dd>
        </div>
        <div>
          <dt>Loss</dt>
          <dd>{formatElevation(stats.elevationLoss)}</dd>
        </div>
        <div className="wide">
          <dt>Coordinates</dt>
          <dd>{formatCoordinates(currentPoint.lat, currentPoint.lon)}</dd>
        </div>
        <div>
          <dt>Elapsed</dt>
          <dd>{formatDuration(currentPoint.elapsedSeconds)}</dd>
        </div>
        <div>
          <dt>Speed</dt>
          <dd>{stats.hasTimestamps ? formatSpeed(segmentStats.speedMps) : 'n/a'}</dd>
        </div>
        <div className="wide">
          <dt>Pace</dt>
          <dd>
            {stats.hasTimestamps
              ? formatPace(segmentStats.paceSecondsPerKm)
              : 'n/a'}
          </dd>
        </div>
      </dl>
    </aside>
  )
}

export default StatsPanel

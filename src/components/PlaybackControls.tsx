import { formatDistance, formatPercent } from '../utils/format'

const SPEEDS = [0.1, 0.25, 0.5, 1, 2, 5, 10] as const

interface PlaybackControlsProps {
  disabled: boolean
  isPlaying: boolean
  speed: number
  currentIndex: number
  maxIndex: number
  coveredDistance: number
  totalDistance: number
  progress: number
  onPlay: () => void
  onPause: () => void
  onReset: () => void
  onScrub: (index: number) => void
  onSpeedChange: (speed: number) => void
}

function PlaybackControls({
  disabled,
  isPlaying,
  speed,
  currentIndex,
  maxIndex,
  coveredDistance,
  totalDistance,
  progress,
  onPlay,
  onPause,
  onReset,
  onScrub,
  onSpeedChange,
}: PlaybackControlsProps) {
  return (
    <section className="playback-panel" aria-label="Playback controls">
      <div className="transport-controls">
        <button type="button" disabled={disabled || isPlaying} onClick={onPlay}>
          Play
        </button>
        <button type="button" disabled={disabled || !isPlaying} onClick={onPause}>
          Pause
        </button>
        <button type="button" disabled={disabled} onClick={onReset}>
          Reset
        </button>
      </div>

      <label className="speed-control">
        Speed
        <select
          value={speed}
          disabled={disabled}
          onChange={(event) => onSpeedChange(Number(event.currentTarget.value))}
        >
          {SPEEDS.map((option) => (
            <option key={option} value={option}>
              {option}x
            </option>
          ))}
        </select>
      </label>

      <div className="timeline">
        <input
          type="range"
          min="0"
          max={maxIndex}
          step="1"
          value={currentIndex}
          disabled={disabled}
          aria-label="Route playback position"
          onChange={(event) => onScrub(Number(event.currentTarget.value))}
        />
        <div className="timeline-readout">
          <span>
            {formatDistance(coveredDistance)} / {formatDistance(totalDistance)}
          </span>
          <span>{formatPercent(progress)}</span>
        </div>
      </div>
    </section>
  )
}

export default PlaybackControls

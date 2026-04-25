export function formatDistance(meters: number): string {
  if (!Number.isFinite(meters)) {
    return 'n/a'
  }

  if (meters < 1000) {
    return `${Math.round(meters)} m`
  }

  return `${(meters / 1000).toFixed(2)} km`
}

export function formatElevation(meters: number | null | undefined): string {
  if (meters === null || meters === undefined || !Number.isFinite(meters)) {
    return 'n/a'
  }

  return `${Math.round(meters)} m`
}

export function formatGrade(grade: number): string {
  if (!Number.isFinite(grade)) {
    return 'n/a'
  }

  const sign = grade > 0 ? '+' : ''
  return `${sign}${grade.toFixed(1)}%`
}

export function formatDuration(totalSeconds: number | undefined): string {
  if (totalSeconds === undefined || !Number.isFinite(totalSeconds)) {
    return 'n/a'
  }

  const seconds = Math.max(0, Math.round(totalSeconds))
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const remainingSeconds = seconds % 60

  if (hours > 0) {
    return `${hours}h ${minutes.toString().padStart(2, '0')}m ${remainingSeconds
      .toString()
      .padStart(2, '0')}s`
  }

  return `${minutes}m ${remainingSeconds.toString().padStart(2, '0')}s`
}

export function formatSpeed(speedMps: number | undefined): string {
  if (speedMps === undefined || !Number.isFinite(speedMps)) {
    return 'n/a'
  }

  return `${(speedMps * 3.6).toFixed(1)} km/h`
}

export function formatPace(secondsPerKm: number | undefined): string {
  if (secondsPerKm === undefined || !Number.isFinite(secondsPerKm)) {
    return 'n/a'
  }

  const minutes = Math.floor(secondsPerKm / 60)
  const seconds = Math.round(secondsPerKm % 60)
  return `${minutes}:${seconds.toString().padStart(2, '0')} min/km`
}

export function formatCoordinates(lat: number, lon: number): string {
  return `${lat.toFixed(5)}, ${lon.toFixed(5)}`
}

export function formatPercent(percent: number): string {
  if (!Number.isFinite(percent)) {
    return '0%'
  }

  return `${Math.round(percent)}%`
}

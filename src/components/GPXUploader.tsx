import type { ParsedRoute } from '../types'

interface GPXUploaderProps {
  route: ParsedRoute | null
  isLoading: boolean
  error: string | null
  onUpload: (file: File) => void
}

function GPXUploader({ route, isLoading, error, onUpload }: GPXUploaderProps) {
  return (
    <section className="upload-bar" aria-label="GPX upload">
      <div className="upload-copy">
        <p className="eyebrow">Trail route analysis</p>
        <h1>GPX Route Visualiser</h1>
        <p className="route-status">
          {route
            ? `${route.name} · ${route.stats.pointCount.toLocaleString()} points`
            : 'No route loaded'}
        </p>
        <p className="creator-credit">
          Created by Danushka Matteo for the ❤️ of trail running
        </p>
      </div>

      <div className="upload-actions">
        <label className="file-button">
          <input
            type="file"
            accept=".gpx,application/gpx+xml,application/xml,text/xml"
            disabled={isLoading}
            onChange={(event) => {
              const file = event.currentTarget.files?.[0]
              if (file) {
                onUpload(file)
              }
              event.currentTarget.value = ''
            }}
          />
          {isLoading ? 'Parsing...' : 'Upload GPX'}
        </label>
        {error ? <p className="error-message">{error}</p> : null}
      </div>
    </section>
  )
}

export default GPXUploader

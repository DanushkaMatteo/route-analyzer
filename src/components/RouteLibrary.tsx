import type { StoredRouteSummary } from '../types'
import {
  formatDistance,
  formatDuration,
  formatElevation,
} from '../utils/format'

interface RouteLibraryProps {
  routes: StoredRouteSummary[]
  activeRouteId: string | null
  isLoading: boolean
  loadingRouteId: string | null
  error: string | null
  onLoadRoute: (id: string) => void
  onDeleteRoute: (id: string) => void
}

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

function RouteLibrary({
  routes,
  activeRouteId,
  isLoading,
  loadingRouteId,
  error,
  onLoadRoute,
  onDeleteRoute,
}: RouteLibraryProps) {
  return (
    <section className="route-library" aria-label="Saved GPX routes">
      <div className="library-header">
        <div>
          <h2>Saved Routes</h2>
          <p>{routes.length ? `${routes.length} stored locally` : 'No saved GPX files yet'}</p>
        </div>
        {isLoading ? <span className="library-loading">Loading...</span> : null}
      </div>

      {error ? <p className="library-error">{error}</p> : null}

      {routes.length ? (
        <div className="route-list">
          {routes.map((savedRoute) => {
            const isActive = savedRoute.id === activeRouteId
            const isRouteLoading = savedRoute.id === loadingRouteId

            return (
              <article
                key={savedRoute.id}
                className={`saved-route ${isActive ? 'active' : ''}`}
              >
                <div className="saved-route-main">
                  <h3>{savedRoute.name}</h3>
                  <p>
                    {savedRoute.fileName} · {dateFormatter.format(savedRoute.uploadedAt)}
                  </p>
                </div>

                <dl className="saved-route-stats">
                  <div>
                    <dt>Distance</dt>
                    <dd>{formatDistance(savedRoute.totalDistance)}</dd>
                  </div>
                  <div>
                    <dt>Gain</dt>
                    <dd>{formatElevation(savedRoute.elevationGain)}</dd>
                  </div>
                  <div>
                    <dt>Time</dt>
                    <dd>
                      {savedRoute.hasTimestamps
                        ? formatDuration(savedRoute.durationSeconds)
                        : 'n/a'}
                    </dd>
                  </div>
                  <div>
                    <dt>Points</dt>
                    <dd>{savedRoute.pointCount.toLocaleString()}</dd>
                  </div>
                </dl>

                <div className="saved-route-actions">
                  <button
                    type="button"
                    onClick={() => onLoadRoute(savedRoute.id)}
                    disabled={isRouteLoading}
                  >
                    {isRouteLoading ? 'Loading...' : isActive ? 'Loaded' : 'Analyze'}
                  </button>
                  <button
                    type="button"
                    className="delete-route"
                    onClick={() => onDeleteRoute(savedRoute.id)}
                    aria-label={`Delete ${savedRoute.name}`}
                  >
                    Delete
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      ) : (
        <div className="library-empty">
          Upload a GPX once, then reopen it here for quicker analysis.
        </div>
      )}
    </section>
  )
}

export default RouteLibrary

import type {
  ParsedRoute,
  StoredRouteRecord,
  StoredRouteSummary,
} from '../types'

const DATABASE_NAME = 'gpx-route-visualiser'
const DATABASE_VERSION = 1
const ROUTE_STORE_NAME = 'routes'

export async function saveStoredRoute(
  route: ParsedRoute,
  rawGpx: string,
): Promise<void> {
  const database = await openRouteDatabase()
  const record: StoredRouteRecord = {
    id: route.id,
    name: route.name,
    fileName: route.fileName,
    uploadedAt: Date.now(),
    route,
    rawGpx,
  }

  await requestToPromise(
    database
      .transaction(ROUTE_STORE_NAME, 'readwrite')
      .objectStore(ROUTE_STORE_NAME)
      .put(record),
  )
  database.close()
}

export async function listStoredRoutes(): Promise<StoredRouteSummary[]> {
  const database = await openRouteDatabase()
  const records = await requestToPromise<StoredRouteRecord[]>(
    database
      .transaction(ROUTE_STORE_NAME, 'readonly')
      .objectStore(ROUTE_STORE_NAME)
      .getAll(),
  )
  database.close()

  return records
    .map((record) => ({
      id: record.id,
      name: record.name,
      fileName: record.fileName,
      uploadedAt: record.uploadedAt,
      pointCount: record.route.stats.pointCount,
      totalDistance: record.route.stats.totalDistance,
      elevationGain: record.route.stats.elevationGain,
      elevationLoss: record.route.stats.elevationLoss,
      hasTimestamps: record.route.stats.hasTimestamps,
      durationSeconds: record.route.stats.durationSeconds,
    }))
    .sort((a, b) => b.uploadedAt - a.uploadedAt)
}

export async function getStoredRoute(
  id: string,
): Promise<StoredRouteRecord | null> {
  const database = await openRouteDatabase()
  const record = await requestToPromise<StoredRouteRecord | undefined>(
    database
      .transaction(ROUTE_STORE_NAME, 'readonly')
      .objectStore(ROUTE_STORE_NAME)
      .get(id),
  )
  database.close()

  return record ?? null
}

export async function deleteStoredRoute(id: string): Promise<void> {
  const database = await openRouteDatabase()
  await requestToPromise(
    database
      .transaction(ROUTE_STORE_NAME, 'readwrite')
      .objectStore(ROUTE_STORE_NAME)
      .delete(id),
  )
  database.close()
}

function openRouteDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION)

    request.onupgradeneeded = () => {
      const database = request.result
      if (!database.objectStoreNames.contains(ROUTE_STORE_NAME)) {
        const store = database.createObjectStore(ROUTE_STORE_NAME, {
          keyPath: 'id',
        })
        store.createIndex('uploadedAt', 'uploadedAt')
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function requestToPromise<T = unknown>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

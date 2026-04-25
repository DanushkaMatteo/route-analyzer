import { useMemo, useRef, useState } from 'react'
import type { ParsedRoute } from '../types'
import { formatDistance, formatElevation } from '../utils/format'
import { findPointIndexByDistance } from '../utils/geo'

const WIDTH = 1000
const HEIGHT = 260
const PADDING = {
  top: 18,
  right: 30,
  bottom: 38,
  left: 58,
}

interface ElevationChartProps {
  route: ParsedRoute | null
  currentIndex: number
  onSelectIndex: (index: number) => void
}

function ElevationChart({
  route,
  currentIndex,
  onSelectIndex,
}: ElevationChartProps) {
  const svgRef = useRef<SVGSVGElement | null>(null)
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)

  const chart = useMemo(() => {
    if (!route || route.stats.minElevation === null || route.stats.maxElevation === null) {
      return null
    }

    const innerWidth = WIDTH - PADDING.left - PADDING.right
    const innerHeight = HEIGHT - PADDING.top - PADDING.bottom
    const minElevation = Math.floor(route.stats.minElevation / 10) * 10
    const maxElevation = Math.ceil(route.stats.maxElevation / 10) * 10
    const elevationSpan = Math.max(1, maxElevation - minElevation)
    const totalDistance = route.stats.totalDistance

    let lastKnownElevation = route.stats.minElevation
    const points = route.points.map((point) => {
      if (point.elevation !== null) {
        lastKnownElevation = point.elevation
      }

      const x =
        PADDING.left +
        (point.distanceFromStart / Math.max(1, totalDistance)) * innerWidth
      const y =
        PADDING.top +
        innerHeight -
        ((lastKnownElevation - minElevation) / elevationSpan) * innerHeight

      return { x, y, elevation: lastKnownElevation, point }
    })

    const path = points
      .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
      .join(' ')

    const areaPath = `${path} L ${
      PADDING.left + innerWidth
    } ${PADDING.top + innerHeight} L ${PADDING.left} ${
      PADDING.top + innerHeight
    } Z`

    const yTicks = [minElevation, (minElevation + maxElevation) / 2, maxElevation]
    const xTicks = [0, totalDistance / 2, totalDistance]

    return {
      areaPath,
      path,
      points,
      xTicks,
      yTicks,
      minElevation,
      maxElevation,
      innerWidth,
      innerHeight,
    }
  }, [route])

  if (!route) {
    return (
      <section className="chart-panel" aria-label="Elevation profile">
        <div className="chart-header">
          <h2>Elevation Profile</h2>
          <p>No route loaded</p>
        </div>
        <div className="chart-empty">Elevation data will appear here.</div>
      </section>
    )
  }

  if (!chart) {
    return (
      <section className="chart-panel" aria-label="Elevation profile">
        <div className="chart-header">
          <h2>Elevation Profile</h2>
          <p>{route.name}</p>
        </div>
        <div className="chart-empty">This GPX file has no elevation data.</div>
      </section>
    )
  }

  const activeIndex = hoverIndex ?? currentIndex
  const activePoint = chart.points[activeIndex] ?? chart.points[currentIndex]
  const currentPoint = chart.points[currentIndex]

  const resolvePointerIndex = (event: React.PointerEvent<SVGSVGElement>) => {
    const svg = svgRef.current
    if (!svg) {
      return currentIndex
    }

    const ctm = svg.getScreenCTM()
    let xInViewBox: number
    if (ctm) {
      const point = svg.createSVGPoint()
      point.x = event.clientX
      point.y = event.clientY
      xInViewBox = point.matrixTransform(ctm.inverse()).x
    } else {
      const rect = svg.getBoundingClientRect()
      xInViewBox = ((event.clientX - rect.left) / rect.width) * WIDTH
    }

    const ratio = Math.min(
      1,
      Math.max(
        0,
        (xInViewBox - PADDING.left) / Math.max(1, chart.innerWidth),
      ),
    )
    return findPointIndexByDistance(route.points, ratio * route.stats.totalDistance)
  }

  return (
    <section className="chart-panel" aria-label="Elevation profile">
      <div className="chart-header">
        <div>
          <h2>Elevation Profile</h2>
          <p>{route.name}</p>
        </div>
        <div className="chart-readout">
          <span>{formatDistance(activePoint.point.distanceFromStart)}</span>
          <span>{formatElevation(activePoint.elevation)}</span>
        </div>
      </div>

      <svg
        ref={svgRef}
        className="elevation-chart"
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label="Elevation over route distance"
        onPointerLeave={() => setHoverIndex(null)}
        onPointerMove={(event) => {
          const index = resolvePointerIndex(event)
          setHoverIndex(index)
          if (event.buttons === 1) {
            onSelectIndex(index)
          }
        }}
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId)
          const index = resolvePointerIndex(event)
          setHoverIndex(index)
          onSelectIndex(index)
        }}
      >
        <rect width={WIDTH} height={HEIGHT} className="chart-background" />

        {chart.yTicks.map((tick) => {
          const y =
            PADDING.top +
            chart.innerHeight -
            ((tick - chart.minElevation) /
              Math.max(1, chart.maxElevation - chart.minElevation)) *
              chart.innerHeight
          return (
            <g key={tick}>
              <line
                x1={PADDING.left}
                x2={WIDTH - PADDING.right}
                y1={y}
                y2={y}
                className="grid-line"
              />
              <text x={18} y={y + 4} className="axis-label">
                {Math.round(tick)}m
              </text>
            </g>
          )
        })}

        {chart.xTicks.map((tick) => {
          const x =
            PADDING.left +
            (tick / Math.max(1, route.stats.totalDistance)) * chart.innerWidth
          return (
            <g key={tick}>
              <line
                x1={x}
                x2={x}
                y1={PADDING.top}
                y2={HEIGHT - PADDING.bottom}
                className="grid-line vertical"
              />
              <text x={x} y={HEIGHT - 12} className="axis-label x-axis">
                {(tick / 1000).toFixed(tick === 0 ? 0 : 1)} km
              </text>
            </g>
          )
        })}

        <path d={chart.areaPath} className="elevation-area" />
        <path d={chart.path} className="elevation-line" />

        <line
          x1={currentPoint.x}
          x2={currentPoint.x}
          y1={PADDING.top}
          y2={HEIGHT - PADDING.bottom}
          className="current-line"
        />
        <circle cx={currentPoint.x} cy={currentPoint.y} r="7" className="current-dot" />

        {hoverIndex !== null ? (
          <circle cx={activePoint.x} cy={activePoint.y} r="5" className="hover-dot" />
        ) : null}
      </svg>
    </section>
  )
}

export default ElevationChart

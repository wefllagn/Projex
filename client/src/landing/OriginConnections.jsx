import { useEffect, useRef, useState } from 'react'

export default function OriginConnections({ sceneRef, kind }) {
  const [geometry, setGeometry] = useState({
    width: 1,
    height: 1,
    paths: [],
    nodes: [],
  })
  const svgRef = useRef(null)

  useEffect(() => {
    const scene = sceneRef.current
    if (!scene || !window.ResizeObserver) return
    let disposed = false
    let visible = false
    function measure() {
      if (disposed) return
      const bounds = scene.getBoundingClientRect()
      const ports = Object.fromEntries(
        [...scene.querySelectorAll('[data-origin-port]')].map((port) => {
          const point = port.getBoundingClientRect()
          return [
            port.dataset.originPort,
            { x: point.x - bounds.x, y: point.y - bounds.y },
          ]
        }),
      )
      let paths
      let nodes
      if (kind === 'hero') {
        const root = ports.root
        const targets = [ports.commit, ports.branch, ports.merge]
        const joint = {
          x:
            root.x +
            Math.max(
              20,
              (Math.min(...targets.map((p) => p.x)) - root.x) * 0.45,
            ),
          y: root.y,
        }
        paths = [
          `M ${root.x} ${root.y} H ${joint.x}`,
          ...targets.map(
            (target) =>
              `M ${joint.x} ${joint.y} C ${joint.x + 24} ${joint.y}, ${target.x - 28} ${target.y}, ${target.x} ${target.y}`,
          ),
          `M ${ports['merge-out'].x} ${ports['merge-out'].y} C ${ports['merge-out'].x} ${ports['merge-out'].y + 28}, ${ports.submit.x - 28} ${ports.submit.y}, ${ports.submit.x} ${ports.submit.y}`,
        ]
        nodes = [joint, ...targets, ports.submit]
      } else {
        const targets = [
          ports.main,
          ports['feature/arrays'],
          ports['feature/loops'],
          ports['lesson-3'],
        ]
        const joint = {
          x: Math.max(12, Math.min(...targets.map((p) => p.x)) - 48),
          y: targets[1].y,
        }
        paths = targets.map(
          (target) =>
            `M ${joint.x} ${joint.y} C ${joint.x} ${target.y}, ${target.x - 28} ${target.y}, ${target.x} ${target.y}`,
        )
        const title = scene
          .closest('.origin-progress-inner')
          ?.querySelector('[data-origin-bridge]')
          ?.getBoundingClientRect()
        const source =
          title && title.right + 18 < bounds.x + joint.x
            ? {
                x: title.right + 18 - bounds.x,
                y: title.y + title.height / 2 - bounds.y,
              }
            : { x: joint.x, y: 4 }
        paths.unshift(
          `M ${source.x} ${source.y} C ${source.x + (source.y < 0 ? 0 : 24)} ${source.y}, ${joint.x} ${joint.y}, ${joint.x} ${joint.y}`,
        )
        nodes = [joint, ...targets, source]
      }
      setGeometry({ width: bounds.width, height: bounds.height, paths, nodes })
    }
    function syncPlayback() {
      svgRef.current?.setAttribute(
        'data-flow-paused',
        String(!visible || document.hidden),
      )
    }
    const resize = new ResizeObserver(measure)
    resize.observe(scene)
    const bridge = scene
      .closest('.origin-progress-inner')
      ?.querySelector('[data-origin-bridge]')
    if (bridge) resize.observe(bridge)
    scene
      .querySelectorAll('[data-origin-panel]')
      .forEach((panel) => resize.observe(panel))
    const intersection = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting
      syncPlayback()
    })
    intersection.observe(scene)
    document.addEventListener('visibilitychange', syncPlayback)
    document.fonts?.ready.then(measure)
    measure()
    return () => {
      disposed = true
      resize.disconnect()
      intersection.disconnect()
      document.removeEventListener('visibilitychange', syncPlayback)
    }
  }, [sceneRef, kind])

  return (
    <svg
      ref={svgRef}
      className="origin-connections"
      viewBox={`0 0 ${geometry.width} ${geometry.height}`}
      aria-hidden="true"
      fill="none"
      data-flow-paused="true"
    >
      <g className="origin-connection-glow">
        {geometry.paths.map((d, index) => (
          <path key={index} d={d} />
        ))}
      </g>
      <g className="origin-connection-lines">
        {geometry.paths.map((d, index) => (
          <path key={index} d={d} />
        ))}
      </g>
      <g className="origin-connection-signals">
        {geometry.paths.map((d, index) => (
          <path
            key={index}
            d={d}
            pathLength="1"
            style={{ animationDelay: `${index * -1.6}s` }}
          />
        ))}
      </g>
      {geometry.nodes.map((point, index) => (
        <circle
          key={index}
          cx={point.x}
          cy={point.y}
          r={index === 0 ? 3.5 : 2.5}
          className="origin-connection-node"
        />
      ))}
    </svg>
  )
}

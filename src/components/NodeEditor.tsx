import React, { useEffect, useRef, useState } from 'react'
import { Graph, Node, Edge, FunctionDef } from '../types/graph'
import { Camera, panStart, panUpdate, toWorld as camToWorld, zoomAt } from '../lib/camera'

type Props = {
  graph: Graph
  setGraph: (g: Graph) => void
  setGraphLive: (g: Graph) => void
  beginLiveChange: () => void
  commitLiveChange: () => void
  onCreateFunction: (def: FunctionDef) => void
  onUpdateFunction: (def: FunctionDef) => void
  functionLibrary: FunctionDef[]
}

function uid(): string {
  return Math.random().toString(36).slice(2)
}

//

function NodeView({ n, onMouseDown, onPortMouseDown, onPortMouseUp, highlighted, onDoubleClick }: { n: Node; onMouseDown: (e: React.MouseEvent) => void; onPortMouseDown: (e: React.MouseEvent, portId: string, isOutput: boolean) => void; onPortMouseUp: (e: React.MouseEvent, portId: string, isOutput: boolean) => void; highlighted: boolean; onDoubleClick: (e: React.MouseEvent) => void }): React.JSX.Element {
  const selected = n.selected
  return (
    <div
      style={{ position: 'absolute', left: n.x, top: n.y, width: 160, height: 80, border: '2px solid ' + (highlighted ? '#ef4444' : selected ? '#3b82f6' : '#555'), borderRadius: 8, background: '#1f2937', color: '#fff', userSelect: 'none' }}
      onMouseDown={onMouseDown}
      onDoubleClick={onDoubleClick}
    >
      <div style={{ padding: 8, fontWeight: 600, fontSize: 12 }}>{n.label}</div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 4, padding: 8 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {n.inputPorts.map(p => (
            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div id={`port-${p.id}`} style={{ width: 10, height: 10, borderRadius: 5, background: '#10b981', cursor: 'crosshair' }} onMouseDown={e => onPortMouseDown(e, p.id, false)} onMouseUp={e => onPortMouseUp(e, p.id, false)} />
              <div style={{ fontSize: 11 }}>{p.name}</div>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {n.outputPorts.map(p => (
            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end' }}>
              <div style={{ fontSize: 11 }}>{p.name}</div>
              <div id={`port-${p.id}`} style={{ width: 10, height: 10, borderRadius: 5, background: '#f59e0b', cursor: 'crosshair' }} onMouseDown={e => onPortMouseDown(e, p.id, true)} onMouseUp={e => onPortMouseUp(e, p.id, true)} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function NodeEditor({ graph, setGraph, setGraphLive, beginLiveChange, commitLiveChange, onCreateFunction, onUpdateFunction, functionLibrary: _functionLibrary }: Props): React.JSX.Element {
  const editorRef = useRef<HTMLDivElement>(null)
  const draggingRef = useRef<{ id: string; dxw: number; dyw: number } | null>(null)
  const [connecting, setConnecting] = useState<{ fromNodeId: string; fromPortId: string; fromIsOutput: boolean; x: number; y: number } | null>(null)
  const [camera, setCamera] = useState<Camera>({ scale: 1, offset: { x: 0, y: 0 } })
  const panningRef = useRef<{ sx: number; sy: number } | null>(null)
  const [isPanning, setIsPanning] = useState(false)
  const [isErasing, setIsErasing] = useState(false)
  const [erasePath, setErasePath] = useState<{ x: number; y: number }[]>([])
  const [eraseHits, setEraseHits] = useState<{ nodes: Set<string>; edges: Set<string> }>({ nodes: new Set(), edges: new Set() })
  const [snapTarget, setSnapTarget] = useState<{ nodeId: string; portId: string; isOutput: boolean } | null>(null)
  const [selecting, setSelecting] = useState<{ x0: number; y0: number; x1: number; y1: number } | null>(null)
  const [fadePath, setFadePath] = useState<{ x: number; y: number }[] | null>(null)
  const [fadeOpacity, setFadeOpacity] = useState(0)
  const [fadeWidth, setFadeWidth] = useState(0)
  const fadeTimerRef = useRef<number | null>(null)
  const [eraseCanceled, setEraseCanceled] = useState(false)
  const cancelRef = useRef<HTMLDivElement>(null)

  function toWorld(clientX: number, clientY: number): { x: number; y: number } {
    const rect = editorRef.current!.getBoundingClientRect()
    return camToWorld(camera, rect, clientX, clientY)
  }

  useEffect(() => {
    function onMouseMove(e: MouseEvent): void {
      if (draggingRef.current) {
        const { id, dxw, dyw } = draggingRef.current
        const w = toWorld(e.clientX, e.clientY)
        const nx = w.x - dxw
        const ny = w.y - dyw
        setGraphLive({ nodes: graph.nodes.map(n => (n.id === id ? { ...n, x: nx, y: ny } : n)), edges: graph.edges })
      } else if (connecting) {
        const w = toWorld(e.clientX, e.clientY)
        setConnecting({ ...connecting, x: w.x, y: w.y })
        setSnapTarget(nearestPort(w.x, w.y, 24))
      } else if (isErasing) {
        const w = toWorld(e.clientX, e.clientY)
        setErasePath(prev => [...prev, w])
        hitTestEraseAtPoint(w)
      } else if (panningRef.current) {
        const next = panUpdate(camera, { sx: panningRef.current.sx, sy: panningRef.current.sy }, e.clientX, e.clientY)
        panningRef.current = { sx: e.clientX, sy: e.clientY }
        setCamera({ scale: camera.scale, offset: next })
      }
    }
    function onMouseUp(): void {
      if (draggingRef.current) {
        commitLiveChange()
      }
      draggingRef.current = null
      setConnecting(null)
      panningRef.current = null
      setIsErasing(false)
    }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [graph, connecting, setGraph])

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && isErasing) {
        e.preventDefault()
        setEraseCanceled(true)
        setEraseHits({ nodes: new Set(), edges: new Set() })
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isErasing])

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.ctrlKey && e.key.toLowerCase() === 'g') {
        const selected = graph.nodes.filter(n => n.selected)
        const hasInput = selected.some(n => n.type === 'Input')
        if (!hasInput) return
        const def: FunctionDef = {
          id: uid(),
          name: 'Func_' + Math.random().toString(36).slice(2, 6),
          graph: { nodes: selected.map(n => ({ ...n, selected: false })), edges: graph.edges.filter(e => selected.find(s => s.id === e.fromNodeId || s.id === e.toNodeId)) },
          inputs: selected.flatMap(n => (n.type === 'Input' ? n.outputPorts : [])),
          outputs: selected.flatMap(n => (n.type === 'Output' ? n.inputPorts : [])),
        }
        onCreateFunction(def)
        const fnNode: Node = {
          id: uid(),
          type: 'CallFunction',
          label: def.name,
          x: selected[0]?.x ?? 80,
          y: selected[0]?.y ?? 80,
          inputPorts: def.inputs.map(p => ({ id: uid(), name: p.name })),
          outputPorts: def.outputs.map(p => ({ id: uid(), name: p.name })),
          data: { functionId: def.id },
        }
        const remainingNodes = graph.nodes.filter(n => !selected.find(s => s.id === n.id))
        setGraph({ nodes: [...remainingNodes, fnNode], edges: graph.edges.filter(e => remainingNodes.find(n => n.id === e.fromNodeId || n.id === e.toNodeId)) })
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [graph, onCreateFunction, setGraph])

  function onBackgroundMouseDown(e: React.MouseEvent): void {
    if (e.button === 1) {
      e.preventDefault()
    }
    if (e.button === 0) {
      const w = toWorld(e.clientX, e.clientY)
      const overNode = graph.nodes.some(n => w.x >= n.x && w.x <= n.x + 160 && w.y >= n.y && w.y <= n.y + 80)
      if (!overNode) {
        setSelecting({ x0: w.x, y0: w.y, x1: w.x, y1: w.y })
        setGraphLive({ nodes: graph.nodes.map(n => ({ ...n, selected: false })), edges: graph.edges })
      }
    }
  }

  function onAuxClick(e: React.MouseEvent): void {
    e.preventDefault()
  }

  function onPointerDown(e: React.PointerEvent): void {
    if (e.button === 1) {
      e.preventDefault()
      editorRef.current?.setPointerCapture(e.pointerId)
      panningRef.current = panStart(e.clientX, e.clientY)
      setIsPanning(true)
      setGraph({ nodes: graph.nodes.map(n => ({ ...n, selected: false })), edges: graph.edges })
    } else if (e.button === 2) {
      e.preventDefault()
      const w = toWorld(e.clientX, e.clientY)
      const overNode = graph.nodes.some(n => w.x >= n.x && w.x <= n.x + 160 && w.y >= n.y && w.y <= n.y + 80)
      if (overNode) return
      editorRef.current?.setPointerCapture(e.pointerId)
      setIsErasing(true)
      setEraseCanceled(false)
      setErasePath([w])
      setEraseHits({ nodes: new Set(), edges: new Set() })
    } else if (e.button === 0) {
      const w = toWorld(e.clientX, e.clientY)
      const overNode = graph.nodes.some(n => w.x >= n.x && w.x <= n.x + 160 && w.y >= n.y && w.y <= n.y + 80)
      if (!overNode) {
        setSelecting({ x0: w.x, y0: w.y, x1: w.x, y1: w.y })
        setGraphLive({ nodes: graph.nodes.map(n => ({ ...n, selected: false })), edges: graph.edges })
      }
    } else if (e.button === 0 && isErasing) {
      e.preventDefault()
      setEraseCanceled(true)
      setEraseHits({ nodes: new Set(), edges: new Set() })
    }
  }

  function onPointerMove(e: React.PointerEvent): void {
    if (isErasing) {
      e.preventDefault()
      const w = toWorld(e.clientX, e.clientY)
      setErasePath(prev => [...prev, w])
      hitTestEraseAtPoint(w)
      const el = cancelRef.current
      if (el) {
        const r = el.getBoundingClientRect()
        if (e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom) {
          setEraseHits({ nodes: new Set(), edges: new Set() })
        }
      }
    } else if (panningRef.current) {
      e.preventDefault()
      const next = panUpdate(camera, { sx: panningRef.current.sx, sy: panningRef.current.sy }, e.clientX, e.clientY)
      panningRef.current = { sx: e.clientX, sy: e.clientY }
      setCamera({ scale: camera.scale, offset: next })
    } else if (selecting) {
      const w = toWorld(e.clientX, e.clientY)
      const rect = { x0: Math.min(selecting.x0, w.x), y0: Math.min(selecting.y0, w.y), x1: Math.max(selecting.x0, w.x), y1: Math.max(selecting.y0, w.y) }
      setSelecting({ ...selecting, x1: w.x, y1: w.y })
      setGraphLive({
        nodes: graph.nodes.map(n => {
          const nx0 = n.x
          const ny0 = n.y
          const nx1 = n.x + 160
          const ny1 = n.y + 80
          const overlap = !(nx1 < rect.x0 || nx0 > rect.x1 || ny1 < rect.y0 || ny0 > rect.y1)
          return { ...n, selected: overlap }
        }),
        edges: graph.edges,
      })
    }
  }

  function onPointerUp(e: React.PointerEvent): void {
    if (panningRef.current) {
      editorRef.current?.releasePointerCapture(e.pointerId)
      panningRef.current = null
      setIsPanning(false)
    }
    if (connecting) {
      const n = snapTarget ?? nearestPort(connecting.x, connecting.y)
      if (n) {
        const node = graph.nodes.find(x => x.id === n.nodeId)
        if (node) finishConnect(node, n.portId, n.isOutput, (e as unknown) as React.MouseEvent)
      } else {
        setConnecting(null)
      }
      setSnapTarget(null)
    }
    if (isErasing) {
      editorRef.current?.releasePointerCapture(e.pointerId)
      setIsErasing(false)
      const cancelByArea = (() => {
        const el = cancelRef.current
        if (!el) return false
        const r = el.getBoundingClientRect()
        return e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom
      })()
      const shouldCancel = eraseCanceled || cancelByArea
      if (!shouldCancel) {
        const removedNodes = new Set(eraseHits.nodes)
        const removedEdges = new Set(eraseHits.edges)
        const nextNodes = graph.nodes.filter(n => !removedNodes.has(n.id))
        const nextEdges = graph.edges.filter(ed => !removedEdges.has(ed.id) && !removedNodes.has(ed.fromNodeId) && !removedNodes.has(ed.toNodeId))
        setGraph({ nodes: nextNodes, edges: nextEdges })
      }
      setFadePath(erasePath)
      setFadeOpacity(0.35)
      setFadeWidth(Math.max(2, 8 / camera.scale))
      if (fadeTimerRef.current) window.clearInterval(fadeTimerRef.current)
      fadeTimerRef.current = window.setInterval(() => {
        setFadeOpacity(prev => {
          const v = prev - 0.06
          return v <= 0 ? 0 : v
        })
        setFadeWidth(prev => {
          const v = prev - 0.5
          return v <= 0 ? 0 : v
        })
      }, 20)
      window.setTimeout(() => {
        if (fadeTimerRef.current) window.clearInterval(fadeTimerRef.current)
        setFadePath(null)
        setFadeOpacity(0)
        setFadeWidth(0)
      }, 220)
      setEraseCanceled(false)
      setErasePath([])
      setEraseHits({ nodes: new Set(), edges: new Set() })
    }
    if (selecting) {
      setSelecting(null)
    }
  }

  function onPointerCancel(e: React.PointerEvent): void {
    if (panningRef.current) {
      editorRef.current?.releasePointerCapture(e.pointerId)
      panningRef.current = null
      setIsPanning(false)
    }
    if (isErasing) {
      editorRef.current?.releasePointerCapture(e.pointerId)
      setIsErasing(false)
      setErasePath([])
      setEraseHits({ nodes: new Set(), edges: new Set() })
    }
  }

  function startDragNode(n: Node, e: React.MouseEvent): void {
    const world = toWorld(e.clientX, e.clientY)
    const dxw = world.x - n.x
    const dyw = world.y - n.y
    draggingRef.current = { id: n.id, dxw, dyw }
    beginLiveChange()
    setGraphLive({ nodes: graph.nodes.map(x => (x.id === n.id ? { ...x, selected: true } : { ...x, selected: e.shiftKey ? x.selected : false })), edges: graph.edges })
  }

  function startConnect(n: Node, portId: string, isOutput: boolean, e: React.MouseEvent): void {
    e.stopPropagation()
    const w = toWorld(e.clientX, e.clientY)
    setConnecting({ fromNodeId: n.id, fromPortId: portId, fromIsOutput: isOutput, x: w.x, y: w.y })
  }

  function finishConnect(n: Node, portId: string, isOutput: boolean, e: React.MouseEvent): void {
    e.stopPropagation()
    if (!connecting) return
    const fromNodeId = connecting.fromNodeId
    const toNodeId = n.id
    if (fromNodeId === toNodeId && connecting.fromPortId === portId) {
      setConnecting(null)
      return
    }
    const valid = (connecting.fromIsOutput && !isOutput) || (!connecting.fromIsOutput && isOutput)
    if (!valid) {
      setConnecting(null)
      return
    }
    const toPortId = isOutput ? connecting.fromPortId : portId
    const fromPortId = isOutput ? portId : connecting.fromPortId
    const fromId = isOutput ? toNodeId : fromNodeId
    const toId = isOutput ? fromNodeId : toNodeId
    const exists = graph.edges.some(ed => ed.toPortId === toPortId)
    if (exists) {
      setConnecting(null)
      return
    }
    const newEdge: Edge = { id: uid(), fromNodeId: fromId, fromPortId, toNodeId: toId, toPortId: toPortId }
    setGraph({ nodes: graph.nodes, edges: [...graph.edges, newEdge] })
    setConnecting(null)
  }

  function nearestPort(xw: number, yw: number, pixelRadius = 20): { nodeId: string; portId: string; isOutput: boolean } | null {
    const rect = editorRef.current!.getBoundingClientRect()
    let best: { nodeId: string; portId: string; isOutput: boolean } | null = null
    let bestD = Infinity
    graph.nodes.forEach(n => {
      n.inputPorts.forEach(p => {
        const el = document.getElementById(`port-${p.id}`)
        if (!el) return
        const r = el.getBoundingClientRect()
        const cx = camToWorld(camera, rect, r.left + r.width / 2, r.top + r.height / 2).x
        const cy = camToWorld(camera, rect, r.left + r.width / 2, r.top + r.height / 2).y
        const d = Math.hypot(cx - xw, cy - yw)
        if (d < bestD) {
          bestD = d
          best = { nodeId: n.id, portId: p.id, isOutput: false }
        }
      })
      n.outputPorts.forEach(p => {
        const el = document.getElementById(`port-${p.id}`)
        if (!el) return
        const r = el.getBoundingClientRect()
        const cx = camToWorld(camera, rect, r.left + r.width / 2, r.top + r.height / 2).x
        const cy = camToWorld(camera, rect, r.left + r.width / 2, r.top + r.height / 2).y
        const d = Math.hypot(cx - xw, cy - yw)
        if (d < bestD) {
          bestD = d
          best = { nodeId: n.id, portId: p.id, isOutput: true }
        }
      })
    })
    const thresholdWorld = pixelRadius / camera.scale
    if (best && bestD <= thresholdWorld) return best
    return null
  }

  function pointRectDistance(px: number, py: number, x: number, y: number, w: number, h: number): number {
    const dx = Math.max(x - px, 0, px - (x + w))
    const dy = Math.max(y - py, 0, py - (y + h))
    return Math.hypot(dx, dy)
  }

  function pointSegmentDistance(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
    const dx = x2 - x1
    const dy = y2 - y1
    const len2 = dx * dx + dy * dy
    if (len2 === 0) return Math.hypot(px - x1, py - y1)
    let t = ((px - x1) * dx + (py - y1) * dy) / len2
    t = Math.max(0, Math.min(1, t))
    const sx = x1 + t * dx
    const sy = y1 + t * dy
    return Math.hypot(px - sx, py - sy)
  }

  function sampleEdge(e: Edge, steps = 32): { x: number; y: number }[] {
    const from = graph.nodes.find(n => n.id === e.fromNodeId)
    const to = graph.nodes.find(n => n.id === e.toNodeId)
    if (!from || !to) return []
    const a1 = portAnchor(from, e.fromPortId, true)
    const a2 = portAnchor(to, e.toPortId, false)
    const x1 = a1.x
    const y1 = a1.y
    const x2 = a2.x
    const y2 = a2.y
    const mx = (x1 + x2) / 2
    const pts: { x: number; y: number }[] = []
    for (let i = 0; i <= steps; i++) {
      const t = i / steps
      const ax = x1 + (mx - x1) * t
      const ay = y1 + (y1 - y1) * t
      const bx = mx + (mx - mx) * t
      const by = y1 + (y2 - y1) * t
      const cx = mx + (x2 - mx) * t
      const cy = y2 + (y2 - y2) * t
      const dx1 = ax + (bx - ax) * t
      const dy1 = ay + (by - ay) * t
      const dx2 = bx + (cx - bx) * t
      const dy2 = by + (cy - by) * t
      const x = dx1 + (dx2 - dx1) * t
      const y = dy1 + (dy2 - dy1) * t
      pts.push({ x, y })
    }
    return pts
  }

  function hitTestEraseAtPoint(p: { x: number; y: number }): void {
    const R = 24 / camera.scale
    const nodeHits = new Set(eraseHits.nodes)
    const edgeHits = new Set(eraseHits.edges)
    graph.nodes.forEach(n => {
      const d = pointRectDistance(p.x, p.y, n.x, n.y, 160, 80)
      if (d <= R) nodeHits.add(n.id)
    })
    graph.edges.forEach(e => {
      const pts = sampleEdge(e, 24)
      for (let i = 1; i < pts.length; i++) {
        const a = pts[i - 1]
        const b = pts[i]
        if (pointSegmentDistance(p.x, p.y, a.x, a.y, b.x, b.y) <= R) {
          edgeHits.add(e.id)
          break
        }
      }
    })
    setEraseHits({ nodes: nodeHits, edges: edgeHits })
  }

  function onWheel(e: React.WheelEvent): void {
    e.preventDefault()
    const rect = editorRef.current!.getBoundingClientRect()
    const next = zoomAt(camera, rect, e.clientX, e.clientY, e.deltaY)
    setCamera(next)
  }

  function portAnchor(n: Node, portId: string, isOutput: boolean): { x: number; y: number } {
    const rect = editorRef.current!.getBoundingClientRect()
    const el = document.getElementById(`port-${portId}`)
    if (el) {
      const r = el.getBoundingClientRect()
      const cx = camToWorld(camera, rect, r.left + r.width / 2, r.top + r.height / 2).x
      const cy = camToWorld(camera, rect, r.left + r.width / 2, r.top + r.height / 2).y
      return { x: cx, y: cy }
    }
    const idx = (isOutput ? n.outputPorts : n.inputPorts).findIndex(p => p.id === portId)
    const baseY = n.y + 32
    const step = 22
    const cy = baseY + idx * step
    const cx = isOutput ? n.x + 160 : n.x
    return { x: cx, y: cy }
  }

  function defaultDataForType(type: Node['type']): Node['data'] {
    switch (type) {
      case 'ImageClick':
        return { image: '' }
      case 'Wait':
        return { seconds: 1 }
      case 'If':
        return { condition: '' }
      case 'Loop':
        return { times: 1 }
      case 'SetVar':
        return { name: 'var', value: '' }
      case 'CallFunction':
        return { functionId: '' }
      case 'Input':
      case 'Output':
        return {}
      default:
        return {}
    }
  }

  function onDrop(e: React.DragEvent): void {
    e.preventDefault()
    const payload = e.dataTransfer.getData('application/json')
    if (!payload) return
    let item: { type: Node['type']; label: string; inputs: string[]; outputs: string[] } | null = null
    try {
      item = JSON.parse(payload)
    } catch {}
    if (!item) return
    const w = toWorld(e.clientX, e.clientY)
    const node: Node = {
      id: uid(),
      type: item.type,
      label: item.label,
      x: w.x,
      y: w.y,
      inputPorts: item.inputs.map(n => ({ id: uid(), name: n })),
      outputPorts: item.outputs.map(n => ({ id: uid(), name: n })),
      data: defaultDataForType(item.type),
    }
    setGraph({ nodes: [...graph.nodes, node], edges: graph.edges })
  }

  const [edgesPaths, setEdgesPaths] = useState<{ id: string; d: string }[]>([])

  useEffect(() => {
    const paths: { id: string; d: string }[] = []
    graph.edges.forEach(e => {
      const from = graph.nodes.find(n => n.id === e.fromNodeId)
      const to = graph.nodes.find(n => n.id === e.toNodeId)
      if (!from || !to) return
      const a1 = portAnchor(from, e.fromPortId, true)
      const a2 = portAnchor(to, e.toPortId, false)
      const x1 = a1.x
      const y1 = a1.y
      const x2 = a2.x
      const y2 = a2.y
      const mx = (x1 + x2) / 2
      const d = `M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`
      paths.push({ id: e.id, d })
    })
    setEdgesPaths(paths)
  }, [graph, camera])

  function onNodeDoubleClick(n: Node): void {
    if (n.type !== 'CallFunction') return
    const fid = (n.data as any).functionId as string
    const def = _functionLibrary.find((f: FunctionDef) => f.id === fid)
    if (!def) return
    const newName = window.prompt('函数名称', def.name) || def.name
    const inNames = window.prompt('输入端名称(逗号分隔)', def.inputs.map(p => p.name).join(',')) || def.inputs.map(p => p.name).join(',')
    const outNames = window.prompt('输出端名称(逗号分隔)', def.outputs.map(p => p.name).join(',')) || def.outputs.map(p => p.name).join(',')
    const inArr = inNames.split(',').map((s: string) => s.trim()).filter(Boolean)
    const outArr = outNames.split(',').map((s: string) => s.trim()).filter(Boolean)
    const newDef: FunctionDef = { ...def, name: newName, inputs: inArr.map((nm: string) => ({ id: Math.random().toString(36).slice(2), name: nm })), outputs: outArr.map((nm: string) => ({ id: Math.random().toString(36).slice(2), name: nm })) }
    onUpdateFunction(newDef)
    const newNodes = graph.nodes.map((x: Node) => (x.id === n.id ? { ...x, label: newName, inputPorts: newDef.inputs.map(p => ({ id: Math.random().toString(36).slice(2), name: p.name })), outputPorts: newDef.outputs.map(p => ({ id: Math.random().toString(36).slice(2), name: p.name })) } : x))
    setGraph({ nodes: newNodes, edges: graph.edges })
  }

  return (
    <div
      ref={editorRef}
      style={{ position: 'relative', width: '100%', height: '100%', background: '#0b1220', overflow: 'hidden', userSelect: 'none', cursor: isPanning ? 'grabbing' : 'default' }}
      onMouseDown={onBackgroundMouseDown}
      onMouseDownCapture={e => {
        if (e.button === 1) e.preventDefault()
      }}
      onAuxClick={onAuxClick}
      onAuxClickCapture={e => {
        e.preventDefault()
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onWheel={onWheel}
      onDragOver={e => e.preventDefault()}
      onContextMenu={e => e.preventDefault()}
      onDrop={onDrop}
    >
      {isErasing && (
        <div ref={cancelRef} style={{ position: 'absolute', right: 12, top: 12, zIndex: 1, background: '#111827', color: '#fca5a5', border: '1px solid #fca5a5', padding: '6px 10px', borderRadius: 6, fontSize: 12 }}>
          取消区域
        </div>
      )}
      <div style={{ position: 'absolute', inset: 0, transform: `translate(${camera.offset.x}px, ${camera.offset.y}px) scale(${camera.scale})`, transformOrigin: '0 0' }}>
        <div
          style={{ position: 'absolute', inset: 0, backgroundImage: `repeating-linear-gradient(0deg, #111 0, #111 1px, transparent 1px, transparent 20px), repeating-linear-gradient(90deg, #111 0, #111 1px, transparent 1px, transparent 20px)`, opacity: 0.6, pointerEvents: 'none' }}
        />
        <svg style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
          {edgesPaths.map(p => (
            <path key={p.id} d={p.d} stroke={eraseHits.edges.has(p.id) ? '#ef4444' : '#9ca3af'} fill="none" strokeWidth={2} />
          ))}
          {connecting && (() => {
            const from = graph.nodes.find(n => n.id === connecting.fromNodeId)
            if (!from) return null
            const a1 = portAnchor(from, connecting.fromPortId, connecting.fromIsOutput)
            let ex = connecting.x
            let ey = connecting.y
            if (snapTarget) {
              const targetNode = graph.nodes.find(n => n.id === snapTarget.nodeId)
              if (targetNode) {
                const a2 = portAnchor(targetNode, snapTarget.portId, snapTarget.isOutput)
                ex = a2.x
                ey = a2.y
              }
            }
            const d = `M ${a1.x} ${a1.y} L ${ex} ${ey}`
            return (
              <>
                <path d={d} stroke={connecting.fromIsOutput ? '#f59e0b' : '#10b981'} fill="none" strokeWidth={2} />
                {snapTarget && (() => {
                  const targetNode = graph.nodes.find(n => n.id === snapTarget.nodeId)
                  if (!targetNode) return null
                  const a2 = portAnchor(targetNode, snapTarget.portId, snapTarget.isOutput)
                  return <circle cx={a2.x} cy={a2.y} r={6} fill="none" stroke="#e5e7eb" strokeDasharray="2,2" />
                })()}
              </>
            )
          })()}
          {isErasing && erasePath.length > 1 && (
            (() => {
              const d = `M ${erasePath[0].x} ${erasePath[0].y} ` + erasePath.slice(1).map(pt => `L ${pt.x} ${pt.y}`).join(' ')
              return <path d={d} stroke="#e5e7eb" fill="none" strokeWidth={Math.max(2, 8 / camera.scale)} opacity={0.35} />
            })()
          )}
          {fadePath && fadePath.length > 1 && (
            (() => {
              const d = `M ${fadePath[0].x} ${fadePath[0].y} ` + fadePath.slice(1).map(pt => `L ${pt.x} ${pt.y}`).join(' ')
              return <path d={d} stroke="#e5e7eb" fill="none" strokeWidth={fadeWidth} opacity={fadeOpacity} />
            })()
          )}
        </svg>
        {graph.nodes.map(n => (
          <NodeView key={n.id} n={n} highlighted={eraseHits.nodes.has(n.id)} onMouseDown={e => startDragNode(n, e)} onDoubleClick={() => onNodeDoubleClick(n)} onPortMouseDown={(e, pid, out) => startConnect(n, pid, out, e)} onPortMouseUp={(e, pid, out) => finishConnect(n, pid, out, e)} />
        ))}
        <svg style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 1000, overflow: 'visible' }}>
          {selecting && (() => {
            const x0 = Math.min(selecting.x0, selecting.x1)
            const y0 = Math.min(selecting.y0, selecting.y1)
            const w = Math.abs(selecting.x1 - selecting.x0)
            const h = Math.abs(selecting.y1 - selecting.y0)
            return (
              <>
                <rect x={x0} y={y0} width={w} height={h} fill="#10b981" opacity={0.18} />
                <rect x={x0} y={y0} width={w} height={h} fill="none" stroke="#10b981" strokeWidth={2.5} strokeDasharray="4,3" />
              </>
            )
          })()}
        </svg>
      </div>
    </div>
  )
}
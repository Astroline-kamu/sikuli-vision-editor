import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Graph, Node, Edge, FunctionDef } from '../types/graph'
import { Camera, panStart, panUpdate, toWorld as camToWorld, zoomAt } from '../lib/camera'

type Props = {
  graph: Graph
  setGraph: (g: Graph) => void
  onCreateFunction: (def: FunctionDef) => void
  functionLibrary: FunctionDef[]
}

function uid(): string {
  return Math.random().toString(36).slice(2)
}

//

function NodeView({ n, onMouseDown, onPortMouseDown, onPortMouseUp }: { n: Node; onMouseDown: (e: React.MouseEvent) => void; onPortMouseDown: (e: React.MouseEvent, portId: string, isOutput: boolean) => void; onPortMouseUp: (e: React.MouseEvent, portId: string) => void }): React.JSX.Element {
  const selected = n.selected
  return (
    <div
      style={{ position: 'absolute', left: n.x, top: n.y, width: 160, height: 80, border: '2px solid ' + (selected ? '#3b82f6' : '#555'), borderRadius: 8, background: '#1f2937', color: '#fff', userSelect: 'none' }}
      onMouseDown={onMouseDown}
    >
      <div style={{ padding: 8, fontWeight: 600, fontSize: 12 }}>{n.label}</div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 4, padding: 8 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {n.inputPorts.map(p => (
            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 10, height: 10, borderRadius: 5, background: '#10b981', cursor: 'crosshair' }} onMouseDown={e => onPortMouseDown(e, p.id, false)} onMouseUp={e => onPortMouseUp(e, p.id)} />
              <div style={{ fontSize: 11 }}>{p.name}</div>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {n.outputPorts.map(p => (
            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end' }}>
              <div style={{ fontSize: 11 }}>{p.name}</div>
              <div style={{ width: 10, height: 10, borderRadius: 5, background: '#f59e0b', cursor: 'crosshair' }} onMouseDown={e => onPortMouseDown(e, p.id, true)} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function NodeEditor({ graph, setGraph, onCreateFunction, functionLibrary: _functionLibrary }: Props): React.JSX.Element {
  const editorRef = useRef<HTMLDivElement>(null)
  const draggingRef = useRef<{ id: string; dxw: number; dyw: number } | null>(null)
  const [connecting, setConnecting] = useState<{ fromNodeId: string; fromPortId: string; x: number; y: number } | null>(null)
  const [camera, setCamera] = useState<Camera>({ scale: 1, offset: { x: 0, y: 0 } })
  const panningRef = useRef<{ sx: number; sy: number } | null>(null)

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
        setGraph({ nodes: graph.nodes.map(n => (n.id === id ? { ...n, x: nx, y: ny } : n)), edges: graph.edges })
      } else if (connecting) {
        const w = toWorld(e.clientX, e.clientY)
        setConnecting({ ...connecting, x: w.x, y: w.y })
      } else if (panningRef.current) {
        const next = panUpdate(camera, { sx: panningRef.current.sx, sy: panningRef.current.sy }, e.clientX, e.clientY)
        panningRef.current = { sx: e.clientX, sy: e.clientY }
        setCamera({ scale: camera.scale, offset: next })
      }
    }
    function onMouseUp(): void {
      draggingRef.current = null
      setConnecting(null)
      panningRef.current = null
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
      if (e.key.toLowerCase() === 'g') {
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
    if (e.target === editorRef.current && e.button === 1) {
      setGraph({ nodes: graph.nodes.map(n => ({ ...n, selected: false })), edges: graph.edges })
      panningRef.current = panStart(e.clientX, e.clientY)
    }
  }

  function startDragNode(n: Node, e: React.MouseEvent): void {
    const world = toWorld(e.clientX, e.clientY)
    const dxw = world.x - n.x
    const dyw = world.y - n.y
    draggingRef.current = { id: n.id, dxw, dyw }
    setGraph({ nodes: graph.nodes.map(x => (x.id === n.id ? { ...x, selected: true } : { ...x, selected: e.shiftKey ? x.selected : false })), edges: graph.edges })
  }

  function startConnect(n: Node, portId: string, isOutput: boolean, e: React.MouseEvent): void {
    e.stopPropagation()
    if (isOutput) {
      const w = toWorld(e.clientX, e.clientY)
      setConnecting({ fromNodeId: n.id, fromPortId: portId, x: w.x, y: w.y })
    }
  }

  function finishConnect(n: Node, portId: string, e: React.MouseEvent): void {
    e.stopPropagation()
    if (!connecting) return
    const fromNodeId = connecting.fromNodeId
    const toNodeId = n.id
    if (fromNodeId === toNodeId) {
      setConnecting(null)
      return
    }
    const exists = graph.edges.some(ed => ed.toPortId === portId)
    if (exists) {
      setConnecting(null)
      return
    }
    const newEdge: Edge = { id: uid(), fromNodeId: connecting.fromNodeId, fromPortId: connecting.fromPortId, toNodeId, toPortId: portId }
    setGraph({ nodes: graph.nodes, edges: [...graph.edges, newEdge] })
    setConnecting(null)
  }

  function onWheel(e: React.WheelEvent): void {
    e.preventDefault()
    const rect = editorRef.current!.getBoundingClientRect()
    const next = zoomAt(camera, rect, e.clientX, e.clientY, e.deltaY)
    setCamera(next)
  }

  function portAnchor(n: Node, portId: string, isOutput: boolean): { x: number; y: number } {
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

  const edgesPath = useMemo(() => {
    return graph.edges.map(e => {
      const from = graph.nodes.find(n => n.id === e.fromNodeId)
      const to = graph.nodes.find(n => n.id === e.toNodeId)
      if (!from || !to) return null
      const a1 = portAnchor(from, e.fromPortId, true)
      const a2 = portAnchor(to, e.toPortId, false)
      const x1 = a1.x
      const y1 = a1.y
      const x2 = a2.x
      const y2 = a2.y
      const mx = (x1 + x2) / 2
      const d = `M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`
      return { id: e.id, d }
    }).filter(Boolean) as { id: string; d: string }[]
  }, [graph])

  return (
    <div
      ref={editorRef}
      style={{ position: 'relative', width: '100%', height: '100%', background: '#0b1220', overflow: 'hidden' }}
      onMouseDown={onBackgroundMouseDown}
      onWheel={onWheel}
      onDragOver={e => e.preventDefault()}
      onDrop={onDrop}
    >
      <div style={{ position: 'absolute', inset: 0, transform: `translate(${camera.offset.x}px, ${camera.offset.y}px) scale(${camera.scale})`, transformOrigin: '0 0' }}>
        <div
          style={{ position: 'absolute', inset: 0, backgroundImage: `repeating-linear-gradient(0deg, #111 0, #111 1px, transparent 1px, transparent 20px), repeating-linear-gradient(90deg, #111 0, #111 1px, transparent 1px, transparent 20px)`, opacity: 0.6, pointerEvents: 'none' }}
        />
        <svg style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
          {edgesPath.map(p => (
            <path key={p.id} d={p.d} stroke="#9ca3af" fill="none" strokeWidth={2} />
          ))}
          {connecting && (
            (() => {
              const from = graph.nodes.find(n => n.id === connecting.fromNodeId)
              if (!from) return null
              const a1 = portAnchor(from, connecting.fromPortId, true)
              const d = `M ${a1.x} ${a1.y} L ${connecting.x} ${connecting.y}`
              return <path d={d} stroke="#f59e0b" fill="none" strokeWidth={2} />
            })()
          )}
        </svg>
        {graph.nodes.map(n => (
          <NodeView key={n.id} n={n} onMouseDown={e => startDragNode(n, e)} onPortMouseDown={(e, pid, out) => startConnect(n, pid, out, e)} onPortMouseUp={(e, pid) => finishConnect(n, pid, e)} />
        ))}
      </div>
    </div>
  )
}
import { useEffect, useMemo, useRef, useState } from 'react'
import { Graph, Node, Edge, FunctionDef, Port } from '../types/graph'

type Props = {
  graph: Graph
  setGraph: (g: Graph) => void
  onCreateFunction: (def: FunctionDef) => void
  functionLibrary: FunctionDef[]
}

function uid() {
  return Math.random().toString(36).slice(2)
}

function hitTestNode(nodes: Node[], x: number, y: number) {
  return nodes.findLast(n => x >= n.x && x <= n.x + 160 && y >= n.y && y <= n.y + 80)
}

function NodeView({ n, onMouseDown, onPortMouseDown }: { n: Node; onMouseDown: (e: React.MouseEvent) => void; onPortMouseDown: (e: React.MouseEvent, portId: string, isOutput: boolean) => void }) {
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
              <div style={{ width: 10, height: 10, borderRadius: 5, background: '#10b981', cursor: 'crosshair' }} onMouseDown={e => onPortMouseDown(e, p.id, false)} />
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

export default function NodeEditor({ graph, setGraph, onCreateFunction, functionLibrary }: Props) {
  const editorRef = useRef<HTMLDivElement>(null)
  const draggingRef = useRef<{ id: string; dx: number; dy: number } | null>(null)
  const [connecting, setConnecting] = useState<{ fromNodeId: string; fromPortId: string; x: number; y: number } | null>(null)

  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      if (draggingRef.current) {
        const { id, dx, dy } = draggingRef.current
        const nx = e.clientX - dx
        const ny = e.clientY - dy
        setGraph({
          nodes: graph.nodes.map(n => (n.id === id ? { ...n, x: nx, y: ny } : n)),
          edges: graph.edges,
        })
      } else if (connecting) {
        setConnecting({ ...connecting, x: e.clientX, y: e.clientY })
      }
    }
    function onMouseUp() {
      draggingRef.current = null
      setConnecting(null)
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

  function onBackgroundMouseDown(e: React.MouseEvent) {
    if (e.target === editorRef.current) {
      setGraph({ nodes: graph.nodes.map(n => ({ ...n, selected: false })), edges: graph.edges })
    }
  }

  function startDragNode(n: Node, e: React.MouseEvent) {
    const dx = e.clientX - n.x
    const dy = e.clientY - n.y
    draggingRef.current = { id: n.id, dx, dy }
    setGraph({ nodes: graph.nodes.map(x => (x.id === n.id ? { ...x, selected: true } : { ...x, selected: e.shiftKey ? x.selected : false })), edges: graph.edges })
  }

  function startConnect(n: Node, portId: string, isOutput: boolean, e: React.MouseEvent) {
    e.stopPropagation()
    if (isOutput) {
      setConnecting({ fromNodeId: n.id, fromPortId: portId, x: e.clientX, y: e.clientY })
    } else if (connecting) {
      const newEdge: Edge = { id: uid(), fromNodeId: connecting.fromNodeId, fromPortId: connecting.fromPortId, toNodeId: n.id, toPortId: portId }
      setGraph({ nodes: graph.nodes, edges: [...graph.edges, newEdge] })
      setConnecting(null)
    }
  }

  const edgesPath = useMemo(() => {
    return graph.edges.map(e => {
      const from = graph.nodes.find(n => n.id === e.fromNodeId)
      const to = graph.nodes.find(n => n.id === e.toNodeId)
      if (!from || !to) return null
      const x1 = from.x + 160
      const y1 = from.y + 40
      const x2 = to.x
      const y2 = to.y + 40
      const mx = (x1 + x2) / 2
      const d = `M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`
      return { id: e.id, d }
    }).filter(Boolean) as { id: string; d: string }[]
  }, [graph])

  return (
    <div ref={editorRef} style={{ position: 'relative', width: '100%', height: '100%', background: '#0b1220' }} onMouseDown={onBackgroundMouseDown}>
      <svg style={{ position: 'absolute', inset: 0 }}>
        {edgesPath.map(p => (
          <path key={p.id} d={p.d} stroke="#9ca3af" fill="none" strokeWidth={2} />
        ))}
        {connecting && <path d={`M ${graph.nodes.find(n => n.id === connecting.fromNodeId)?.x! + 160} ${graph.nodes.find(n => n.id === connecting.fromNodeId)?.y! + 40} L ${connecting.x} ${connecting.y}`} stroke="#f59e0b" fill="none" strokeWidth={2} />}
      </svg>
      {graph.nodes.map(n => (
        <NodeView key={n.id} n={n} onMouseDown={e => startDragNode(n, e)} onPortMouseDown={(e, pid, out) => startConnect(n, pid, out, e)} />
      ))}
    </div>
  )
}
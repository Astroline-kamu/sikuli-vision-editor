import React, { useMemo, useState } from 'react'
import NodeEditor from './NodeEditor'
import { FunctionDef, Graph, Node } from '../types/graph'
import ControlLibrary from './ControlLibrary'

type Props = {
  def: FunctionDef
  onSave: (updated: FunctionDef) => void
  onClose: () => void
  functions: FunctionDef[]
}

export default function FunctionEditor({ def, onSave, onClose, functions }: Props): React.JSX.Element {
  const [currentDef, setCurrentDef] = useState<FunctionDef>(def)
  const [name, setName] = useState(currentDef.name)
  const [funcGraph, setFuncGraph] = useState<Graph>({ nodes: currentDef.graph.nodes, edges: currentDef.graph.edges })
  const inputNodes = useMemo(() => funcGraph.nodes.filter(n => n.type === 'Input'), [funcGraph])
  const outputNodes = useMemo(() => funcGraph.nodes.filter(n => n.type === 'Output'), [funcGraph])

  function save() {
    const updated: FunctionDef = {
      ...currentDef,
      name,
      inputs: inputNodes.map(n => ({ id: Math.random().toString(36).slice(2), name: n.label })),
      outputs: outputNodes.map(n => ({ id: Math.random().toString(36).slice(2), name: n.label })),
      graph: funcGraph,
    }
    onSave(updated)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
      <div style={{ width: '90vw', height: '85vh', background: '#0b1220', border: '1px solid #1f2937', borderRadius: 8, overflow: 'hidden', display: 'grid', gridTemplateColumns: '240px 1fr', gridTemplateRows: '48px 1fr' }}>
        <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: 8, padding: '0 12px', background: '#0b1220', color: '#e5e7eb', borderBottom: '1px solid #1f2937' }}>
          <input value={name} onChange={e => setName(e.target.value)} style={{ background: '#111827', color: '#e5e7eb', border: '1px solid #374151', borderRadius: 6, padding: '6px 8px' }} />
          <button onClick={save} style={{ marginLeft: 'auto' }}>保存</button>
          <button onClick={onClose}>关闭</button>
        </div>
        <ControlLibrary
          onAddNode={(n: Node) => setFuncGraph({ nodes: [...funcGraph.nodes, n], edges: funcGraph.edges })}
          functions={[...functions, def]}
        />
        <div>
          <NodeEditor
            graph={funcGraph}
            setGraph={setFuncGraph}
            setGraphLive={setFuncGraph}
            beginLiveChange={() => {}}
            commitLiveChange={() => {}}
            onCreateFunction={() => {}}
            onUpdateFunction={() => {}}
            functionLibrary={functions}
            onOpenFunction={(fid) => {
              const next = functions.find(f => f.id === fid)
              if (!next) return
              setCurrentDef(next)
              setName(next.name)
              setFuncGraph({ nodes: next.graph.nodes, edges: next.graph.edges })
            }}
          />
        </div>
      </div>
    </div>
  )
}
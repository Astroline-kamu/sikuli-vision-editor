import React, { useMemo, useState } from 'react'
import NodeEditor from './NodeEditor'
import { FunctionDef, Graph } from '../types/graph'

type Props = {
  def: FunctionDef
  onSave: (updated: FunctionDef) => void
  onClose: () => void
}

export default function FunctionEditor({ def, onSave, onClose }: Props): React.JSX.Element {
  const [name, setName] = useState(def.name)
  const [funcGraph, setFuncGraph] = useState<Graph>({ nodes: def.graph.nodes, edges: def.graph.edges })
  const inputNodes = useMemo(() => funcGraph.nodes.filter(n => n.type === 'Input'), [funcGraph])
  const outputNodes = useMemo(() => funcGraph.nodes.filter(n => n.type === 'Output'), [funcGraph])

  function renameNode(id: string, label: string) {
    setFuncGraph({ nodes: funcGraph.nodes.map(n => (n.id === id ? { ...n, label } : n)), edges: funcGraph.edges })
  }
  function save() {
    const updated: FunctionDef = {
      ...def,
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
        <div style={{ padding: 12, background: '#0f172a', color: '#e5e7eb', borderRight: '1px solid #1f2937', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>入参（编辑 Input 节点名称）</div>
            {inputNodes.map(n => (
              <div key={n.id} style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                <input value={n.label} onChange={e => renameNode(n.id, e.target.value)} style={{ flex: 1, background: '#111827', color: '#e5e7eb', border: '1px solid #374151', borderRadius: 6, padding: '6px 8px' }} />
              </div>
            ))}
          </div>
          <div>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>出参（编辑 Output 节点名称）</div>
            {outputNodes.map(n => (
              <div key={n.id} style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                <input value={n.label} onChange={e => renameNode(n.id, e.target.value)} style={{ flex: 1, background: '#111827', color: '#e5e7eb', border: '1px solid #374151', borderRadius: 6, padding: '6px 8px' }} />
              </div>
            ))}
          </div>
        </div>
        <div>
          <NodeEditor
            graph={funcGraph}
            setGraph={setFuncGraph}
            setGraphLive={setFuncGraph}
            beginLiveChange={() => {}}
            commitLiveChange={() => {}}
            onCreateFunction={() => {}}
            onUpdateFunction={() => {}}
            functionLibrary={[]}
          />
        </div>
      </div>
    </div>
  )
}
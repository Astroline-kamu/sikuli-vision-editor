import React from 'react'
import { Node, NodeType } from '../types/graph'

type Props = {
  onAddNode: (n: Node) => void
}

function uid() {
  return Math.random().toString(36).slice(2)
}

export default function ControlLibrary({ onAddNode }: Props): React.JSX.Element {
  const items: ReadonlyArray<{ type: NodeType; label: string; inputs: string[]; outputs: string[] }> = [
    { type: 'Input', label: 'Input', inputs: [], outputs: ['out'] },
    { type: 'Output', label: 'Output', inputs: ['in'], outputs: [] },
    { type: 'ImageClick', label: 'Click Image', inputs: ['in'], outputs: ['out'] },
    { type: 'Wait', label: 'Wait', inputs: ['in'], outputs: ['out'] },
    { type: 'If', label: 'If', inputs: ['in'], outputs: ['true', 'false'] },
    { type: 'Loop', label: 'Loop', inputs: ['in'], outputs: ['out'] },
    { type: 'SetVar', label: 'Set Var', inputs: ['in'], outputs: ['out'] },
    { type: 'CallFunction', label: 'Call Function', inputs: ['in'], outputs: ['out'] },
  ]

  function add(i: (typeof items)[number]): void {
    let data: Node['data']
    switch (i.type) {
      case 'ImageClick':
        data = { image: '' }
        break
      case 'Wait':
        data = { seconds: 1 }
        break
      case 'If':
        data = { condition: '' }
        break
      case 'Loop':
        data = { times: 1 }
        break
      case 'SetVar':
        data = { name: 'var', value: '' }
        break
      case 'CallFunction':
        data = { functionId: '' }
        break
      case 'Input':
      case 'Output':
        data = {}
        break
      default:
        data = {}
    }
    const node: Node = {
      id: uid(),
      type: i.type,
      label: i.label,
      x: 40,
      y: 40,
      inputPorts: i.inputs.map(n => ({ id: uid(), name: n })),
      outputPorts: i.outputs.map(n => ({ id: uid(), name: n })),
      data,
    }
    onAddNode(node)
  }

  return (
    <div style={{ width: 240, borderRight: '1px solid #1f2937', background: '#0f172a', color: '#e5e7eb', padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ fontWeight: 600 }}>控件库</div>
      {items.map(i => (
        <button key={i.type} style={{ background: '#1f2937', padding: 8, borderRadius: 6, textAlign: 'left' }} onClick={() => add(i)}>
          {i.label}
        </button>
      ))}
    </div>
  )
}
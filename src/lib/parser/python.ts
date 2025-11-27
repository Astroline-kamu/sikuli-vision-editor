import { Graph, Node } from '../types/graph'

function uid() {
  return Math.random().toString(36).slice(2)
}

export function pythonToGraph(code: string): Graph {
  const nodes: Node[] = []
  const edges: any[] = []
  const lines = code.split(/\r?\n/).map(s => s.trim()).filter(Boolean)
  let lastNode: Node | null = null
  lines.forEach(line => {
    if (/^click\(.*\)/.test(line)) {
      const m = line.match(/^click\("(.*)"\)/)
      const node: Node = { id: uid(), type: 'ImageClick', label: 'Click Image', x: 60 + nodes.length * 10, y: 60 + nodes.length * 10, inputPorts: [{ id: uid(), name: 'in' }], outputPorts: [{ id: uid(), name: 'out' }], data: { image: m?.[1] || '' } }
      nodes.push(node)
      if (lastNode) edges.push({ id: uid(), fromNodeId: lastNode.id, fromPortId: lastNode.outputPorts[0].id, toNodeId: node.id, toPortId: node.inputPorts[0].id })
      lastNode = node
    } else if (/^wait\(.*\)/.test(line)) {
      const m = line.match(/^wait\((.*)\)/)
      const sec = Number(m?.[1] || 1)
      const node: Node = { id: uid(), type: 'Wait', label: 'Wait', x: 60 + nodes.length * 10, y: 60 + nodes.length * 10, inputPorts: [{ id: uid(), name: 'in' }], outputPorts: [{ id: uid(), name: 'out' }], data: { seconds: sec } }
      nodes.push(node)
      if (lastNode) edges.push({ id: uid(), fromNodeId: lastNode.id, fromPortId: lastNode.outputPorts[0].id, toNodeId: node.id, toPortId: node.inputPorts[0].id })
      lastNode = node
    } else if (/^\w+\s*=\s*/.test(line)) {
      const m = line.match(/^(\w+)\s*=\s*(.*)$/)
      const node: Node = { id: uid(), type: 'SetVar', label: 'Set Var', x: 60 + nodes.length * 10, y: 60 + nodes.length * 10, inputPorts: [{ id: uid(), name: 'in' }], outputPorts: [{ id: uid(), name: 'out' }], data: { name: m?.[1] || 'var', value: m?.[2] || '' } }
      nodes.push(node)
      if (lastNode) edges.push({ id: uid(), fromNodeId: lastNode.id, fromPortId: lastNode.outputPorts[0].id, toNodeId: node.id, toPortId: node.inputPorts[0].id })
      lastNode = node
    }
  })
  return { nodes, edges }
}
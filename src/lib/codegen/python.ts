import { Edge, Graph, Node } from '../types/graph'

function topo(graph: Graph) {
  const incoming = new Map<string, number>()
  graph.nodes.forEach(n => incoming.set(n.id, 0))
  graph.edges.forEach(e => incoming.set(e.toNodeId, (incoming.get(e.toNodeId) || 0) + 1))
  const q = graph.nodes.filter(n => (incoming.get(n.id) || 0) === 0)
  const res: Node[] = []
  const edges = [...graph.edges]
  while (q.length) {
    const n = q.shift()!
    res.push(n)
    const out = edges.filter(e => e.fromNodeId === n.id)
    out.forEach(e => {
      incoming.set(e.toNodeId, (incoming.get(e.toNodeId) || 0) - 1)
      if ((incoming.get(e.toNodeId) || 0) === 0) q.push(graph.nodes.find(x => x.id === e.toNodeId)!)
    })
  }
  return res
}

function genNode(n: Node) {
  if (n.type === 'ImageClick') return `click("${n.data?.image || ''}")`
  if (n.type === 'Wait') return `wait(${n.data?.seconds || 1})`
  if (n.type === 'SetVar') return `${n.data?.name || 'var'} = ${JSON.stringify(n.data?.value ?? '')}`
  if (n.type === 'If') return `# if ${n.data?.condition || ''}`
  if (n.type === 'Loop') return `# for ${n.data?.times || 1}`
  if (n.type === 'CallFunction') return `${n.label}()`
  return ''
}

export function graphToPython(graph: Graph) {
  const lines: string[] = []
  lines.push('from sikuli import *')
  topo(graph).forEach(n => {
    const s = genNode(n)
    if (s) lines.push(s)
  })
  return lines.join('\n')
}
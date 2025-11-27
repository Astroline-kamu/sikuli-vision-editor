import { Graph, Node, getImageClickData, getWaitData, getSetVarData, getIfData, getLoopData } from '../../types/graph'

function topo(graph: Graph): Node[] {
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

function genNode(n: Node): string {
  const img = getImageClickData(n)
  if (img) return `click("${img.image}")`
  const wait = getWaitData(n)
  if (wait) return `wait(${wait.seconds})`
  const setv = getSetVarData(n)
  if (setv) return `${setv.name} = ${JSON.stringify(setv.value)}`
  const iff = getIfData(n)
  if (iff) return `# if ${iff.condition}`
  const loop = getLoopData(n)
  if (loop) return `# for ${loop.times}`
  if (n.type === 'CallFunction') return `${n.label}()`
  return ''
}

export function graphToPython(graph: Graph): string {
  const lines: string[] = []
  lines.push('from sikuli import *')
  topo(graph).forEach(n => {
    const s = genNode(n)
    if (s) lines.push(s)
  })
  return lines.join('\n')
}
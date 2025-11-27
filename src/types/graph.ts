export type Port = {
  id: string
  name: string
}

export type Edge = {
  id: string
  fromNodeId: string
  fromPortId: string
  toNodeId: string
  toPortId: string
}

export type NodeType =
  | 'ImageClick'
  | 'Wait'
  | 'If'
  | 'Loop'
  | 'SetVar'
  | 'CallFunction'
  | 'Input'
  | 'Output'

export type NodeData = Record<string, any>

export type Node = {
  id: string
  type: NodeType
  label: string
  x: number
  y: number
  inputPorts: Port[]
  outputPorts: Port[]
  data: NodeData
  selected?: boolean
}

export type Graph = {
  nodes: Node[]
  edges: Edge[]
}

export type FunctionDef = {
  id: string
  name: string
  graph: Graph
  inputs: Port[]
  outputs: Port[]
}
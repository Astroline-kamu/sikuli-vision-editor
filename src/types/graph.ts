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

export type ImageClickData = { image: string }
export type WaitData = { seconds: number }
export type IfData = { condition: string }
export type LoopData = { times: number }
export type SetVarData = { name: string; value: string | number | boolean | null }
export type CallFunctionData = { functionId: string }
export type InputData = Record<string, never>
export type OutputData = Record<string, never>

export type NodeData =
  | ImageClickData
  | WaitData
  | IfData
  | LoopData
  | SetVarData
  | CallFunctionData
  | InputData
  | OutputData

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

export function getImageClickData(n: Node): ImageClickData | null {
  return n.type === 'ImageClick' ? (n.data as ImageClickData) : null
}

export function getWaitData(n: Node): WaitData | null {
  return n.type === 'Wait' ? (n.data as WaitData) : null
}

export function getIfData(n: Node): IfData | null {
  return n.type === 'If' ? (n.data as IfData) : null
}

export function getLoopData(n: Node): LoopData | null {
  return n.type === 'Loop' ? (n.data as LoopData) : null
}

export function getSetVarData(n: Node): SetVarData | null {
  return n.type === 'SetVar' ? (n.data as SetVarData) : null
}

export function getCallFunctionData(n: Node): CallFunctionData | null {
  return n.type === 'CallFunction' ? (n.data as CallFunctionData) : null
}
export type Camera = { scale: number; offset: { x: number; y: number } }

export function clampScale(s: number, min = 0.25, max = 2): number {
  return Math.max(min, Math.min(max, s))
}

export function toWorld(camera: Camera, rect: DOMRect, clientX: number, clientY: number): { x: number; y: number } {
  const x = (clientX - rect.left - camera.offset.x) / camera.scale
  const y = (clientY - rect.top - camera.offset.y) / camera.scale
  return { x, y }
}

export function zoomAt(camera: Camera, rect: DOMRect, clientX: number, clientY: number, deltaY: number): Camera {
  const world = toWorld(camera, rect, clientX, clientY)
  const scale = clampScale(camera.scale * (1 - deltaY * 0.001))
  const offsetX = clientX - rect.left - world.x * scale
  const offsetY = clientY - rect.top - world.y * scale
  return { scale, offset: { x: offsetX, y: offsetY } }
}

export function panStart(clientX: number, clientY: number): { sx: number; sy: number } {
  return { sx: clientX, sy: clientY }
}

export function panUpdate(camera: Camera, pan: { sx: number; sy: number }, clientX: number, clientY: number): { x: number; y: number } {
  const dx = clientX - pan.sx
  const dy = clientY - pan.sy
  return { x: camera.offset.x + dx, y: camera.offset.y + dy }
}
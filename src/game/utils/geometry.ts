export type Rect = {
  x: number
  y: number
  width: number
  height: number
}

/**
 * Axis-aligned rectangle intersection.
 */
export const rectsIntersect = (a: Rect, b: Rect): boolean => {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  )
}

/**
 * Circle vs rectangle collision test using closest-point distance.
 */
export const circleIntersectsRect = (
  cx: number,
  cy: number,
  radius: number,
  rx: number,
  ry: number,
  rw: number,
  rh: number,
): boolean => {
  const closestX = Math.max(rx, Math.min(cx, rx + rw))
  const closestY = Math.max(ry, Math.min(cy, ry + rh))
  const dx = cx - closestX
  const dy = cy - closestY
  return dx * dx + dy * dy <= radius * radius
}

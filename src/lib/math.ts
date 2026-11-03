export const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value))

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t

/** Peredaman yang tidak bergantung frame rate (damping eksponensial). */
export const damp = (current: number, target: number, lambda: number, dt: number) =>
  lerp(current, target, 1 - Math.exp(-lambda * Math.max(dt, 0)))

export const smoothstep = (t: number) => {
  const x = clamp(t, 0, 1)
  return x * x * (3 - 2 * x)
}

export const mapRange = (value: number, inMin: number, inMax: number, outMin: number, outMax: number) =>
  outMin + ((value - inMin) / (inMax - inMin)) * (outMax - outMin)

export const degToRad = (deg: number) => (deg * Math.PI) / 180

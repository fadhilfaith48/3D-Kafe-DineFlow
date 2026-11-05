/**
 * Input sentuh untuk walk mode.
 *
 * Joystick menulis vektor ternormalisasi ke objek mutable (bukan state
 * React) agar useFrame tidak memicu render setiap gerakan jari.
 */

export const touchInput = { x: 0, y: 0 }

export function resetTouchInput(): void {
  touchInput.x = 0
  touchInput.y = 0
}

export interface JoystickInput {
  x: number
  y: number
  /** 0 = diam, 1 = joystick penuh. */
  strength: number
}

/**
 * Ubah offset joystick (piksel, y positif = bawah) menjadi vektor -1..1.
 * Ada deadzone agar jari yang sedikit bergeser tidak membuat pemain berjalan.
 */
export function joystickToInput(
  dx: number,
  dy: number,
  radius: number,
  deadzone = 0.14,
): JoystickInput {
  const distance = Math.hypot(dx, dy)
  if (distance < 1e-4 || radius <= 0) return { x: 0, y: 0, strength: 0 }

  const clamped = Math.min(distance, radius) / radius
  const strength = clamped <= deadzone ? 0 : (clamped - deadzone) / (1 - deadzone)
  if (strength === 0) return { x: 0, y: 0, strength: 0 }

  return {
    x: (dx / distance) * strength,
    y: (dy / distance) * strength,
    strength,
  }
}

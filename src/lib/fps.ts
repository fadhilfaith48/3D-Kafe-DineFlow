/**
 * Pengukur FPS dengan perataan eksponensial.
 * Nilai mentah FPS sangat berisik, jadi kita haluskan sebelum dipakai
 * untuk memutuskan perubahan kualitas.
 */
export class FpsMeter {
  private frames = 0
  private elapsed = 0
  private smoothed = 60

  update(delta: number): number {
    this.frames += 1
    this.elapsed += delta
    if (this.elapsed >= 0.5) {
      const instant = this.frames / this.elapsed
      this.smoothed = this.smoothed * 0.6 + instant * 0.4
      this.frames = 0
      this.elapsed = 0
    }
    return this.smoothed
  }

  get value() {
    return this.smoothed
  }

  reset(fps = 60) {
    this.frames = 0
    this.elapsed = 0
    this.smoothed = fps
  }
}

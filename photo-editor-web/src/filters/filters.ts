import { FilterSettings } from '../types'

export function cssFilterString(filters: FilterSettings): string {
  const parts: string[] = []

  if (filters.brightness !== 100) parts.push(`brightness(${filters.brightness}%)`)
  if (filters.contrast !== 100) parts.push(`contrast(${filters.contrast}%)`)
  if (filters.saturate !== 100) parts.push(`saturate(${filters.saturate}%)`)
  if (filters.blur > 0) parts.push(`blur(${filters.blur}px)`)
  if (filters.grayscale > 0) parts.push(`grayscale(${filters.grayscale}%)`)
  if (filters.sepia > 0) parts.push(`sepia(${filters.sepia}%)`)
  if (filters.invert > 0) parts.push(`invert(${filters.invert}%)`)
  if (filters.hueRotate !== 0) parts.push(`hue-rotate(${filters.hueRotate}deg)`)

  return parts.join(' ')
}

export function filterHash(filters: FilterSettings): string {
  return `${filters.brightness},${filters.contrast},${filters.saturate},${filters.blur},${filters.grayscale},${filters.sepia},${filters.invert},${filters.hueRotate},${filters.sharpen}`
}

export function applySharpen(
  imageData: ImageData,
  intensity: number = 1,
): ImageData {
  const { data, width, height } = imageData
  const output = new Uint8ClampedArray(data)

  const kernel = [0, -1, 0, -1, 5, -1, 0, -1, 0]

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = (y * width + x) * 4

      for (let c = 0; c < 3; c++) {
        let sum = 0
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const pixelIdx = ((y + ky) * width + (x + kx)) * 4 + c
            sum += data[pixelIdx] * kernel[(ky + 1) * 3 + (kx + 1)]
          }
        }
        const orig = data[idx + c]
        const val = orig + (sum - orig) * intensity
        output[idx + c] = Math.max(0, Math.min(255, val))
      }
    }
  }

  return new ImageData(output, width, height)
}

export async function removeImageBackground(
  imageBlob: Blob,
  onProgress?: (progress: number) => void,
): Promise<Blob> {
  try {
    const { removeBackground } = await import('@imgly/background-removal')

    const blob = await removeBackground(imageBlob, {
      progress: (key: string, value: number) => {
        if (onProgress) onProgress(value)
      },
    })

    return blob
  } catch (err) {
    console.error('Background removal error:', err)
    throw err
  }
}

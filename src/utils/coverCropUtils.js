export const COVER_PREVIEW_SIZE = 304
export const COVER_OUTPUT_SIZE = 1400
export const COVER_MIN_ZOOM = 1
export const COVER_MAX_ZOOM = 2.5

export const DEFAULT_COVER_CROP = {
  cropEnabled: false,
  zoom: COVER_MIN_ZOOM,
  offsetX: 0,
  offsetY: 0,
}

export function loadImageElement(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error('Upload a cover image before opening the crop tool.'))
      return
    }

    const objectUrl = URL.createObjectURL(file)
    const image = new Image()

    image.onload = () => {
      URL.revokeObjectURL(objectUrl)
      resolve(image)
    }

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('BeatDrop could not load this cover image for cropping.'))
    }

    image.src = objectUrl
  })
}

export function getOutputType(file) {
  if (!file?.type) return 'image/png'
  if (['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
    return file.type
  }
  return 'image/png'
}

export function getOutputExtension(file) {
  if (file?.type === 'image/jpeg') return 'jpg'
  if (file?.type === 'image/webp') return 'webp'
  return 'png'
}

export function getCoverPreviewMetrics({
  width,
  height,
  frameSize = COVER_PREVIEW_SIZE,
  cropEnabled = false,
  zoom = COVER_MIN_ZOOM,
  offsetX = 0,
  offsetY = 0,
}) {
  if (!width || !height) return null

  const baseScale = cropEnabled
    ? Math.max(frameSize / width, frameSize / height)
    : Math.min(frameSize / width, frameSize / height)
  const scale = baseScale * zoom
  const drawWidth = width * scale
  const drawHeight = height * scale
  const maxOffsetX = cropEnabled ? Math.max((drawWidth - frameSize) / 2, 0) : 0
  const maxOffsetY = cropEnabled ? Math.max((drawHeight - frameSize) / 2, 0) : 0
  const left = (frameSize - drawWidth) / 2 + (offsetX / 100) * maxOffsetX
  const top = (frameSize - drawHeight) / 2 + (offsetY / 100) * maxOffsetY

  return {
    drawWidth,
    drawHeight,
    left,
    top,
    scale,
    sourceX: (0 - left) / scale,
    sourceY: (0 - top) / scale,
    sourceWidth: frameSize / scale,
    sourceHeight: frameSize / scale,
  }
}

export async function createCroppedCover(sourceImageFile, cropSettings, outputSize = COVER_OUTPUT_SIZE) {
  const image = await loadImageElement(sourceImageFile)
  const width = image.naturalWidth || image.width
  const height = image.naturalHeight || image.height
  const cropMetrics = getCoverPreviewMetrics({
    width,
    height,
    frameSize: outputSize,
    ...cropSettings,
  })

  if (!cropMetrics) {
    throw new Error('BeatDrop could not prepare the cover crop.')
  }

  const canvas = document.createElement('canvas')
  canvas.width = outputSize
  canvas.height = outputSize
  const ctx = canvas.getContext('2d')

  if (!ctx) {
    throw new Error('BeatDrop could not prepare the crop canvas.')
  }

  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(
    image,
    cropMetrics.sourceX,
    cropMetrics.sourceY,
    cropMetrics.sourceWidth,
    cropMetrics.sourceHeight,
    0,
    0,
    outputSize,
    outputSize,
  )

  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (nextBlob) => {
        if (!nextBlob) {
          reject(new Error('BeatDrop could not create the cropped cover file.'))
          return
        }
        resolve(nextBlob)
      },
      getOutputType(sourceImageFile),
      0.95,
    )
  })

  const baseName = sourceImageFile.name.replace(/\.[^/.]+$/, '')
  const extension = getOutputExtension(sourceImageFile)

  return new File([blob], `${baseName}-cover-crop.${extension}`, {
    type: getOutputType(sourceImageFile),
    lastModified: Date.now(),
  })
}

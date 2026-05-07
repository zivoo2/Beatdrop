import { resolveVideoSize } from './uploadOptions'

const VIDEO_FRAME_RATE = 30

const SUPPORTED_VIDEO_MIME_TYPES = [
  'video/webm;codecs=vp9,opus',
  'video/webm;codecs=vp8,opus',
  'video/webm',
]

function loadImage(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      resolve(null)
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
      reject(new Error('Could not load the cover image.'))
    }
    image.src = objectUrl
  })
}

function loadAudio(file) {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file)
    const audio = new Audio(objectUrl)
    audio.preload = 'auto'
    audio.crossOrigin = 'anonymous'

    const cleanup = () => {
      audio.onloadedmetadata = null
      audio.onerror = null
    }

    audio.onloadedmetadata = () => {
      cleanup()
      resolve({ audio, objectUrl })
    }
    audio.onerror = () => {
      cleanup()
      URL.revokeObjectURL(objectUrl)
      reject(new Error('Could not load the audio file.'))
    }
  })
}

function pickRecorderMimeType() {
  const supported = SUPPORTED_VIDEO_MIME_TYPES.find((type) => MediaRecorder.isTypeSupported(type))
  if (!supported) {
    throw new Error('This browser cannot create a YouTube-ready video from your audio file. Try Chrome.')
  }
  return supported
}

function renderVideoFrame(ctx, coverAsset, size) {
  ctx.clearRect(0, 0, size.width, size.height)
  ctx.fillStyle = '#000000'
  ctx.fillRect(0, 0, size.width, size.height)

  if (coverAsset?.element) {
    const sourceWidth = coverAsset.element.width
    const sourceHeight = coverAsset.element.height
    if (!sourceWidth || !sourceHeight) return

    const maxWidth = size.width
    const maxHeight = size.height
    const scale = Math.min(maxWidth / sourceWidth, maxHeight / sourceHeight)
    const drawWidth = Math.round(sourceWidth * scale)
    const drawHeight = Math.round(sourceHeight * scale)
    const x = Math.round((size.width - drawWidth) / 2)
    const y = Math.round((size.height - drawHeight) / 2)

    ctx.drawImage(coverAsset.element, x, y, drawWidth, drawHeight)
  }
}

export async function createUploadableVideo({ audioFile, coverFile, videoSize, onProgress }) {
  if (!audioFile) {
    throw new Error('Select an audio file before uploading.')
  }

  onProgress?.({ phase: 'preparing', progress: 0, label: 'Preparing media...' })

  const [coverImage, audioAsset] = await Promise.all([loadImage(coverFile), loadAudio(audioFile)])
  const coverAsset = coverImage ? { element: coverImage } : null
  const { audio, objectUrl } = audioAsset
  const size = resolveVideoSize(videoSize)

  const audioContext = new window.AudioContext()
  const canvas = document.createElement('canvas')
  canvas.width = size.width
  canvas.height = size.height
  const ctx = canvas.getContext('2d')

  if (!ctx) {
    URL.revokeObjectURL(objectUrl)
    await audioContext.close()
    throw new Error('Could not prepare the video canvas.')
  }

  renderVideoFrame(ctx, coverAsset, size)

  const videoStream = canvas.captureStream(VIDEO_FRAME_RATE)
  const destination = audioContext.createMediaStreamDestination()
  const source = audioContext.createMediaElementSource(audio)
  const silentGain = audioContext.createGain()
  silentGain.gain.value = 0
  source.connect(destination)
  source.connect(silentGain)
  silentGain.connect(audioContext.destination)

  const combinedStream = new MediaStream([
    ...videoStream.getVideoTracks(),
    ...destination.stream.getAudioTracks(),
  ])

  const mimeType = pickRecorderMimeType()
  const recorder = new MediaRecorder(combinedStream, { mimeType })
  const chunks = []
  let rafId = 0

  const updateCanvas = () => {
    renderVideoFrame(ctx, coverAsset, size)

    if (audio.duration > 0) {
      const progress = Math.min(audio.currentTime / audio.duration, 1)
      onProgress?.({
        phase: 'converting',
        progress,
        label: `Converting audio to video (${Math.round(progress * 100)}%)`,
      })
    }

    rafId = window.requestAnimationFrame(updateCanvas)
  }

  return new Promise((resolve, reject) => {
    let finished = false

    const cleanup = async () => {
      window.cancelAnimationFrame(rafId)
      audio.pause()
      audio.removeAttribute('src')
      URL.revokeObjectURL(objectUrl)
      combinedStream.getTracks().forEach((track) => track.stop())
      videoStream.getTracks().forEach((track) => track.stop())
      await audioContext.close()
    }

    recorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        chunks.push(event.data)
      }
    }

    recorder.onerror = () => {
      if (finished) return
      finished = true
      cleanup()
        .then(() => reject(new Error('The browser could not encode the video for upload.')))
        .catch(() => reject(new Error('The browser could not encode the video for upload.')))
    }

    recorder.onstop = () => {
      if (finished) return
      finished = true

      const blob = new Blob(chunks, { type: mimeType })
      cleanup()
        .then(() => {
          if (!blob.size) {
            reject(new Error('The generated video was empty.'))
            return
          }

          onProgress?.({ phase: 'converting', progress: 1, label: 'Video ready for upload.' })

          const extension = mimeType.includes('webm') ? 'webm' : 'mp4'
          const baseName = audioFile.name.replace(/\.[^/.]+$/, '')
          resolve(
            new File([blob], `${baseName}.${extension}`, {
              type: mimeType,
              lastModified: Date.now(),
            }),
          )
        })
        .catch(() => reject(new Error('The browser could not finalize the upload video.')))
    }

    audio.onended = () => {
      if (recorder.state !== 'inactive') {
        recorder.stop()
      }
    }

    audioContext
      .resume()
      .then(() => {
        recorder.start(1000)
        updateCanvas()
        return audio.play()
      })
      .catch((error) => {
        if (recorder.state !== 'inactive') {
          recorder.stop()
        }
        if (!finished) {
          finished = true
          cleanup()
            .then(() =>
              reject(error instanceof Error ? error : new Error('Could not start the media conversion.')),
            )
            .catch(() => reject(new Error('Could not start the media conversion.')))
        }
      })
  })
}

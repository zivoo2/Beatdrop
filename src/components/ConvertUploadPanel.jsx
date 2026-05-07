import { useState } from 'react'
import { motion } from 'framer-motion'
import { createUploadableVideo } from '../utils/uploadVideoUtils'
import { DEFAULT_UPLOAD_DETAILS } from '../utils/uploadOptions'
import { getApiUrl } from '../utils/api'
import { createCroppedCover } from '../utils/coverCropUtils'

const parseTags = (tags) =>
  tags
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean)

function resolveScheduledPublishAt(details) {
  if (!details.schedulePublish) return ''

  const rawValue = String(details.publishAt || '').trim()
  if (!rawValue) {
    throw new Error('Choose a future publish date and time before uploading.')
  }

  const parsedDate = new Date(rawValue)
  if (Number.isNaN(parsedDate.getTime())) {
    throw new Error('Scheduled publish time is invalid.')
  }

  if (parsedDate.getTime() <= Date.now()) {
    throw new Error('Scheduled publish time must be in the future.')
  }

  return parsedDate.toISOString()
}

function formatScheduledPublishAt(value) {
  if (!value) return ''

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

const formatEta = (seconds) => {
  if (!Number.isFinite(seconds) || seconds <= 0) return 'Calculating...'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return mins > 0 ? `${mins}m ${secs}s remaining` : `${secs}s remaining`
}

const extractApiErrorMessage = (value, fallbackMessage) => {
  if (!value) return fallbackMessage

  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return fallbackMessage

    try {
      return extractApiErrorMessage(JSON.parse(trimmed), trimmed)
    } catch {
      return trimmed
    }
  }

  if (typeof value === 'object') {
    if (typeof value.message === 'string' && value.message.trim()) {
      return value.message.trim()
    }

    if (value.error !== undefined) {
      return extractApiErrorMessage(value.error, fallbackMessage)
    }

    if (Array.isArray(value.errors) && value.errors.length > 0) {
      return extractApiErrorMessage(value.errors[0], fallbackMessage)
    }
  }

  return fallbackMessage
}

const isThumbnailPermissionError = (message) =>
  message.toLowerCase().includes("doesn't have permissions to upload and set custom video thumbnails")

const formatThumbnailWarning = (message) => {
  if (isThumbnailPermissionError(message)) {
    return ''
  }

  return `Video uploaded, but the custom thumbnail could not be applied. ${message}`
}

const parseApiError = async (response, fallbackMessage) => {
  const text = await response.text()
  if (!text) return fallbackMessage

  try {
    const parsed = JSON.parse(text)
    return extractApiErrorMessage(parsed, fallbackMessage)
  } catch {
    return extractApiErrorMessage(text, fallbackMessage)
  }
}

async function startResumableSession({ token, uploadFile, details, publishAt }) {
  const response = await fetch(getApiUrl('/api/youtube/upload/initiate'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=UTF-8',
    },
    body: JSON.stringify({
      accessToken: token,
      uploadMimeType: uploadFile.type || 'video/webm',
      uploadSize: uploadFile.size,
      notifySubscribers: details.notifySubscribers ?? DEFAULT_UPLOAD_DETAILS.notifySubscribers,
      details: {
        title: details.title || 'Untitled Beat',
        description: details.description || '',
        tags: parseTags(details.tags || ''),
        categoryId: details.categoryId || DEFAULT_UPLOAD_DETAILS.categoryId,
        visibility: publishAt ? 'private' : details.visibility || DEFAULT_UPLOAD_DETAILS.visibility,
        publishAt,
        madeForKids: details.madeForKids ?? DEFAULT_UPLOAD_DETAILS.madeForKids,
        embeddable: details.embeddable ?? DEFAULT_UPLOAD_DETAILS.embeddable,
        license: details.license || DEFAULT_UPLOAD_DETAILS.license,
      },
    }),
  })

  if (!response.ok) {
    throw new Error(await parseApiError(response, 'Could not start resumable upload session.'))
  }

  const { uploadUrl } = await response.json()
  if (!uploadUrl) {
    throw new Error('Missing upload URL from YouTube.')
  }

  return uploadUrl
}

function uploadBinaryWithProgress({ uploadUrl, uploadFile, onProgress }) {
  return uploadFile
    .arrayBuffer()
    .then(async (payload) => {
      onProgress(0, payload.byteLength)

      const response = await fetch(getApiUrl('/api/youtube/upload/transfer'), {
        method: 'POST',
        headers: {
          'X-Upload-Url': uploadUrl,
          'X-Upload-Size': String(payload.byteLength),
          'Content-Type': uploadFile.type || 'video/webm',
        },
        body: payload,
      })

      const responseText = await response.text()

      if (!response.ok) {
        try {
          const parsed = JSON.parse(responseText)
          throw new Error(parsed.error || 'YouTube upload failed.')
        } catch {
          throw new Error(responseText || 'YouTube upload failed.')
        }
      }

      onProgress(payload.byteLength, payload.byteLength)

      try {
        return JSON.parse(responseText)
      } catch {
        throw new Error('Upload completed but response was invalid.')
      }
    })
    .catch((error) => {
      throw error instanceof Error ? error : new Error('Could not prepare the upload payload.')
    })
}

async function uploadThumbnail({ token, videoId, imageFile }) {
  if (!imageFile) return
  const response = await fetch(
    getApiUrl(`/api/youtube/upload/thumbnail?videoId=${encodeURIComponent(videoId)}`),
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': imageFile.type || 'image/jpeg',
      },
      body: imageFile,
    },
  )

  if (!response.ok) {
    throw new Error(await parseApiError(response, 'Video uploaded, but thumbnail upload failed.'))
  }
}

function ConvertUploadPanel({ audioFile, sourceImageFile, imageFile, cropSettings, token, ensureValidToken, details }) {
  const MotionSection = motion.section
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [uploadWarning, setUploadWarning] = useState('')
  const [videoUrl, setVideoUrl] = useState('')
  const [uploadedTitle, setUploadedTitle] = useState('')
  const [scheduledPublishLabel, setScheduledPublishLabel] = useState('')
  const [progress, setProgress] = useState(0)
  const [eta, setEta] = useState('')
  const [statusLabel, setStatusLabel] = useState('Ready to prepare your upload.')

  const canUpload = Boolean(token && audioFile && !uploading)

  const handleUpload = async () => {
    if (!audioFile) return

    setUploading(true)
    setUploadError('')
    setUploadWarning('')
    setVideoUrl('')
    setUploadedTitle('')
    setScheduledPublishLabel('')
    setProgress(0)
    setEta('')
    setStatusLabel('Preparing your upload...')

    try {
      const authToken = ensureValidToken ? await ensureValidToken() : token
      if (!authToken) {
        throw new Error('Connect your YouTube account before uploading.')
      }

      const publishAt = resolveScheduledPublishAt(details)
      const uploadThumbnailFile =
        cropSettings?.cropEnabled && sourceImageFile
          ? await createCroppedCover(sourceImageFile, cropSettings)
          : imageFile

      const uploadFile = await createUploadableVideo({
        audioFile,
        coverFile: uploadThumbnailFile,
        videoSize: details.videoSize,
        onProgress: ({ progress: conversionProgress, label }) => {
          setProgress(Math.round((conversionProgress || 0) * 20))
          setStatusLabel(label || 'Converting audio to video...')
          setEta('Preparing video...')
        },
      })

      setStatusLabel('Video ready. Starting YouTube upload...')
      setEta('Starting upload...')

      const uploadStartedAt = Date.now()
      const uploadUrl = await startResumableSession({ token: authToken, uploadFile, details, publishAt })
      const result = await uploadBinaryWithProgress({
        uploadUrl,
        uploadFile,
        onProgress: (loaded, total) => {
          const uploadProgress = total > 0 ? loaded / total : 0
          const nextProgress = 20 + Math.round(uploadProgress * 80)
          setProgress(nextProgress)

          const elapsedSec = (Date.now() - uploadStartedAt) / 1000
          const speed = elapsedSec > 0 ? loaded / elapsedSec : 0
          const remaining = speed > 0 ? (total - loaded) / speed : Infinity
          setEta(loaded >= total ? 'Finishing upload...' : formatEta(remaining))
          setStatusLabel('Uploading video to YouTube...')
        },
      })

      if (result.id) {
        let thumbnailWarning = ''

        if (uploadThumbnailFile) {
          try {
            await uploadThumbnail({ token: authToken, videoId: result.id, imageFile: uploadThumbnailFile })
          } catch (error) {
            const message =
              error instanceof Error ? error.message || 'Thumbnail upload failed.' : 'Thumbnail upload failed.'
            thumbnailWarning = formatThumbnailWarning(message)
          }
        }

        setVideoUrl(`https://www.youtube.com/watch?v=${result.id}`)
        setUploadedTitle(details.title || audioFile.name.replace(/\.[^/.]+$/, '') || 'Untitled Beat')
        setScheduledPublishLabel(publishAt ? formatScheduledPublishAt(publishAt) : '')
        setProgress(100)
        setEta(thumbnailWarning ? 'Video uploaded' : publishAt ? 'Scheduled' : 'Complete')
        setStatusLabel(
          thumbnailWarning
            ? 'Video uploaded. Thumbnail needs attention.'
            : publishAt
              ? 'Upload complete. YouTube will publish it on schedule.'
              : 'Upload complete.',
        )
        setUploadWarning(thumbnailWarning)
      }
    } catch (error) {
      const message = error instanceof Error ? error.message || 'Upload failed.' : 'Upload failed.'
      setUploadError(message)
      setStatusLabel('Upload failed.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <MotionSection
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-[28px] border border-white/8 bg-[#111111] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.36)]"
    >
      <h2 className="text-xl font-semibold tracking-[-0.03em] text-white">Upload to YouTube</h2>
      <p className="mt-1 text-sm leading-6 text-white/60">
        Your audio and cover media are turned into a video in the browser, then uploaded to YouTube.
      </p>

      {!token ? (
        <p className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/72">
          Connect your YouTube account first.
        </p>
      ) : (
        <button
          className="mt-4 rounded-full bg-[#f3f3f3] px-5 py-3 text-sm font-semibold transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
          style={{ color: '#0a0a0a' }}
          onClick={handleUpload}
          disabled={!canUpload}
        >
          {uploading ? 'Uploading...' : 'Upload to YouTube'}
        </button>
      )}

      <div className="mt-4 space-y-3">
        <div>
          <p className="mb-1 text-xs font-medium uppercase tracking-[0.18em] text-white/45">Upload Progress</p>
          <div className="h-2 overflow-hidden rounded-full bg-white/8">
            <div
              className="h-full rounded-full bg-white transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-white/45">
            {progress}% {uploading || eta ? `- ${eta || 'Calculating...'}` : ''}
          </p>
          <p className="mt-1 text-xs text-white/45">{statusLabel}</p>
        </div>

        {videoUrl && (
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4 text-sm text-white/80">
            <p className="font-semibold text-white">Upload complete</p>
            <p className="mt-1">{uploadedTitle}</p>
            {scheduledPublishLabel && (
              <p className="mt-1 text-white/60">Scheduled for {scheduledPublishLabel}</p>
            )}
            <a
              href={videoUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-block rounded-full bg-[#f3f3f3] px-4 py-2 text-xs font-semibold transition hover:bg-white"
              style={{ color: '#0a0a0a' }}
            >
              View on YouTube
            </a>
          </div>
        )}

        {videoUrl && (
          <p className="text-xs text-white/45">
            YouTube link:{' '}
            <a className="text-white underline" href={videoUrl} target="_blank" rel="noreferrer">
              {videoUrl}
            </a>
          </p>
        )}

        {uploadWarning && (
          <div className="rounded-3xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm text-amber-800">{uploadWarning}</p>
          </div>
        )}

        {uploadError && (
          <div className="rounded-3xl border border-red-100 bg-red-50 p-4">
            <p className="text-sm text-red-700">{uploadError}</p>
            <button
              onClick={handleUpload}
              disabled={!canUpload}
              className="mt-2 rounded-full border border-red-200 px-4 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Retry Upload
            </button>
          </div>
        )}
      </div>
    </MotionSection>
  )
}

export default ConvertUploadPanel

import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import {
  ACCEPTED_COVER_IMAGE_TYPES,
  isAcceptedCoverImageFile,
} from '../utils/coverMediaUtils'
import { useFileDataUrl } from '../hooks/useFileDataUrl'
import { COVER_PREVIEW_SIZE, getCoverPreviewMetrics, loadImageElement } from '../utils/coverCropUtils'

const ACCEPTED_AUDIO_TYPES = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/wave', 'audio/x-wav']

function FieldSpinner({ active }) {
  if (!active) return null

  return (
    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/16 border-t-white" />
  )
}

function PremiumStar() {
  return <span aria-hidden="true" className="inline-block text-[11px] leading-none text-[#d4b15a]">â˜…</span>
}

function TempoIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 fill-none stroke-current stroke-[1.8]">
      <path d="M12 5a7 7 0 1 0 7 7" />
      <path d="M12 8v4l2.5 1.5" />
      <path d="M16.5 4.5h3v3" />
    </svg>
  )
}

function KeyIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 fill-none stroke-current stroke-[1.8]">
      <circle cx="8.5" cy="12" r="3.5" />
      <path d="M12 12h8" />
      <path d="M17 12v2" />
      <path d="M20 12v2" />
    </svg>
  )
}

function isAcceptedAudioFile(file) {
  if (!file) return false

  const fileName = file.name.toLowerCase()
  return ACCEPTED_AUDIO_TYPES.includes(file.type) || fileName.endsWith('.mp3') || fileName.endsWith('.wav')
}

function UploadZone({
  audioFile,
  sourceImageFile,
  imageFile,
  cropSettings = {},
  isProPlan = false,
  bpm,
  musicalKey,
  bpmLoading = false,
  keyLoading = false,
  onBpmChange,
  onMusicalKeyChange,
  onAudioFileChange,
  onImageFileChange,
}) {
  const MotionSection = motion.section
  const [dragActive, setDragActive] = useState(false)
  const [fileMessage, setFileMessage] = useState('')
  const [imageMeta, setImageMeta] = useState({ width: 0, height: 0 })
  const audioInputRef = useRef(null)
  const coverInputRef = useRef(null)
  const previewSourceFile = sourceImageFile || imageFile
  const imagePreview = useFileDataUrl(previewSourceFile)
  const squareThumbnailPreview = Boolean(cropSettings?.cropEnabled && imagePreview)
  const previewMetrics = getCoverPreviewMetrics({
    width: imageMeta.width,
    height: imageMeta.height,
    frameSize: COVER_PREVIEW_SIZE,
    ...cropSettings,
  })

  useEffect(() => {
    let cancelled = false

    if (!previewSourceFile) {
      return () => {
        cancelled = true
      }
    }

    loadImageElement(previewSourceFile)
      .then((image) => {
        if (cancelled) return
        setImageMeta({
          width: image.naturalWidth || image.width,
          height: image.naturalHeight || image.height,
        })
      })
      .catch(() => {
        if (cancelled) return
        setImageMeta({ width: 0, height: 0 })
      })

    return () => {
      cancelled = true
    }
  }, [previewSourceFile])

  const handleFile = (file) => {
    if (!file) return

    if (isAcceptedAudioFile(file)) {
      setFileMessage('')
      onAudioFileChange(file)
      return
    }

    if (isAcceptedCoverImageFile(file)) {
      setFileMessage('')
      onImageFileChange(file)
      return
    }

    if (file.type.startsWith('video/')) {
      setFileMessage('Cover videos are no longer supported. Choose a PNG, JPG, or WEBP cover image.')
      return
    }

    if (file.type.startsWith('image/')) {
      setFileMessage('Choose a PNG, JPG, or WEBP cover image.')
      return
    }

    setFileMessage('Choose MP3 or WAV audio, plus a cover image.')
  }

  const coverAccept = ['.png', '.jpg', '.jpeg', '.webp', ...ACCEPTED_COVER_IMAGE_TYPES].join(',')

  return (
    <MotionSection
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-[28px] border border-white/8 bg-[#111111] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.36)]"
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-[-0.03em] text-white">Upload Audio + Cover</h2>
          <p className="mt-1 text-sm leading-6 text-white/60">
            Drag and drop an MP3 or WAV plus a cover image (PNG/JPG/WEBP), or click to browse.
          </p>
        </div>
        <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white/72">
          Cover image workflow
        </span>
      </div>

      <div
        onDragOver={(event) => {
          event.preventDefault()
          setDragActive(true)
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(event) => {
          event.preventDefault()
          setDragActive(false)
          Array.from(event.dataTransfer.files).forEach(handleFile)
        }}
        className={`mt-4 rounded-[28px] border-2 border-dashed p-8 text-center transition ${
          dragActive ? 'border-white/24 bg-white/[0.06]' : 'border-white/10 bg-white/[0.03]'
        }`}
      >
        <p className="text-sm text-white/72">Drop files here</p>
        <div className="mt-4 flex flex-wrap justify-center gap-3">
          <button
            onClick={() => audioInputRef.current?.click()}
            className="rounded-full bg-[#f3f3f3] px-5 py-3 text-sm font-semibold transition hover:bg-white"
            style={{ color: '#0a0a0a' }}
          >
            Choose Audio
          </button>
          <button
            onClick={() => coverInputRef.current?.click()}
            className="rounded-full border border-white/12 bg-transparent px-5 py-3 text-sm font-semibold text-white transition hover:border-white/24 hover:bg-white/4"
          >
            Choose Cover Image
          </button>
        </div>
      </div>

      <input
        ref={audioInputRef}
        type="file"
        accept=".mp3,.wav,audio/mpeg,audio/mp3,audio/wav,audio/wave,audio/x-wav"
        className="hidden"
        onChange={(event) => handleFile(event.target.files?.[0])}
      />
      <input
        ref={coverInputRef}
        type="file"
        accept={coverAccept}
        className="hidden"
        onChange={(event) => handleFile(event.target.files?.[0])}
      />

      {!isProPlan && (
        <p className="mt-4 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-white/60">
          BeatDrop Pro unlocks reusable presets, upload scheduling, and faster metadata tools.
        </p>
      )}

      {fileMessage && (
        <p className="mt-4 rounded-2xl border border-[#d4b15a]/25 bg-[rgba(212,177,90,0.08)] px-4 py-3 text-sm text-[#f3d58f]">
          {fileMessage}
        </p>
      )}

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <div className="rounded-3xl border border-white/8 bg-white/[0.03] p-4">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-white/45">Audio File</p>
          <p className="mt-2 truncate text-sm font-medium text-white/84">
            {audioFile ? audioFile.name : 'No audio file selected'}
          </p>
          {audioFile && (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {isProPlan ? (
                <>
                  <label className="rounded-[22px] border border-[#d4b15a]/14 bg-[linear-gradient(180deg,rgba(255,255,255,0.04)_0%,rgba(10,10,10,0.28)_100%)] p-3">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 text-[#f3d58f]">
                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#d4b15a]/22 bg-[rgba(212,177,90,0.10)]">
                          <TempoIcon />
                        </span>
                        <span className="text-xs font-medium uppercase tracking-[0.18em]">BPM</span>
                      </div>
                      <FieldSpinner active={bpmLoading} />
                    </div>
                    <input
                      type="text"
                      value={bpm}
                      onChange={(event) => onBpmChange?.(event.target.value)}
                      className="w-full rounded-2xl border border-white/10 bg-[#09090b] px-4 py-3 text-sm text-white outline-none transition focus:border-[#d4b15a]/36"
                      placeholder="120"
                    />
                  </label>

                  <label className="rounded-[22px] border border-[#d4b15a]/14 bg-[linear-gradient(180deg,rgba(255,255,255,0.04)_0%,rgba(10,10,10,0.28)_100%)] p-3">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 text-[#f3d58f]">
                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#d4b15a]/22 bg-[rgba(212,177,90,0.10)]">
                          <KeyIcon />
                        </span>
                        <span className="text-xs font-medium uppercase tracking-[0.18em]">Key</span>
                      </div>
                      <FieldSpinner active={keyLoading} />
                    </div>
                    <input
                      type="text"
                      value={musicalKey}
                      onChange={(event) => onMusicalKeyChange?.(event.target.value)}
                      className="w-full rounded-2xl border border-white/10 bg-[#09090b] px-4 py-3 text-sm text-white outline-none transition focus:border-[#d4b15a]/36"
                      placeholder="A Minor"
                    />
                  </label>
                </>
              ) : (
                <>
                  <div className="rounded-[22px] border border-[#d4b15a]/14 bg-[linear-gradient(180deg,rgba(255,255,255,0.04)_0%,rgba(10,10,10,0.28)_100%)] p-3">
                    <div className="flex items-center gap-2 text-[#f3d58f]">
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#d4b15a]/22 bg-[rgba(212,177,90,0.10)]">
                        <TempoIcon />
                      </span>
                      <p className="text-xs font-medium uppercase tracking-[0.18em]">Auto BPM</p>
                    </div>
                    <p className="mt-2 text-sm text-white/84">Unlock automatic tempo analysis</p>
                  </div>
                  <div className="rounded-[22px] border border-[#d4b15a]/14 bg-[linear-gradient(180deg,rgba(255,255,255,0.04)_0%,rgba(10,10,10,0.28)_100%)] p-3">
                    <div className="flex items-center gap-2 text-[#f3d58f]">
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#d4b15a]/22 bg-[rgba(212,177,90,0.10)]">
                        <KeyIcon />
                      </span>
                      <p className="text-xs font-medium uppercase tracking-[0.18em]">Auto Key</p>
                    </div>
                    <p className="mt-2 text-sm text-white/84">Unlock key detection for each upload</p>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
        <div className="rounded-3xl border border-white/8 bg-white/[0.03] p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-white/45">Thumbnail Image</p>
            {isProPlan && imageFile && (
              <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-white/45">
                Sent to YouTube
              </span>
            )}
          </div>
          {imagePreview ? (
            squareThumbnailPreview && previewMetrics ? (
              <div className="mt-2 flex justify-start">
                <div
                  className="relative overflow-hidden rounded-2xl border border-white/8 bg-[#050505]"
                  style={{ width: `${COVER_PREVIEW_SIZE}px`, height: `${COVER_PREVIEW_SIZE}px`, maxWidth: '100%' }}
                >
                  <img
                    src={imagePreview}
                    alt="Thumbnail preview"
                    className="absolute max-w-none select-none"
                    style={{
                      width: `${previewMetrics.drawWidth}px`,
                      height: `${previewMetrics.drawHeight}px`,
                      left: `${previewMetrics.left}px`,
                      top: `${previewMetrics.top}px`,
                    }}
                  />
                </div>
              </div>
            ) : (
              <div className="mt-2 overflow-hidden rounded-2xl border border-white/8 bg-[#050505]">
                <img src={imagePreview} alt="Thumbnail preview" className="h-24 w-full object-cover" />
              </div>
            )
          ) : (
            <p className="mt-2 text-sm font-medium text-white/84">No thumbnail image selected</p>
          )}
        </div>
      </div>
    </MotionSection>
  )
}

export default UploadZone

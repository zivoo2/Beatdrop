import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useFileDataUrl } from '../hooks/useFileDataUrl'
import {
  COVER_MAX_ZOOM,
  COVER_MIN_ZOOM,
  COVER_PREVIEW_SIZE,
  createCroppedCover,
  getCoverPreviewMetrics,
  loadImageElement,
} from '../utils/coverCropUtils'

function CoverCropPanel({
  sourceImageFile,
  imageFile,
  cropSettings,
  onCropSettingsChange,
  onImageFileChange,
  onResetToSource,
}) {
  const MotionSection = motion.section
  const [isOpen, setIsOpen] = useState(false)
  const [imageMeta, setImageMeta] = useState({ width: 0, height: 0 })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const sourcePreviewUrl = useFileDataUrl(sourceImageFile)
  const previewMetrics = getCoverPreviewMetrics({
    width: imageMeta.width,
    height: imageMeta.height,
    frameSize: COVER_PREVIEW_SIZE,
    ...cropSettings,
  })
  const currentIsEdited = Boolean(sourceImageFile && imageFile && sourceImageFile !== imageFile)
  const { cropEnabled, zoom, offsetX, offsetY } = cropSettings

  useEffect(() => {
    let cancelled = false
    setIsOpen(false)
    setError('')
    setSaving(false)
    setImageMeta({ width: 0, height: 0 })

    if (!sourceImageFile) {
      return () => {
        cancelled = true
      }
    }

    loadImageElement(sourceImageFile)
      .then((image) => {
        if (cancelled) return
        setImageMeta({
          width: image.naturalWidth || image.width,
          height: image.naturalHeight || image.height,
        })
      })
      .catch((loadError) => {
        if (cancelled) return
        setError(loadError.message || 'BeatDrop could not prepare the cover crop tool.')
      })

    return () => {
      cancelled = true
    }
  }, [sourceImageFile])

  if (!sourceImageFile) {
    return null
  }

  const handleApplyCrop = async () => {
    if (!previewMetrics) return

    if (!cropEnabled) {
      onResetToSource()
      return
    }

    setSaving(true)
    setError('')

    try {
      const nextFile = await createCroppedCover(sourceImageFile, cropSettings)
      onImageFileChange(nextFile)
    } catch (cropError) {
      setError(cropError.message || 'BeatDrop could not apply the cover crop.')
    } finally {
      setSaving(false)
    }
  }

  const handleResetCrop = () => {
    onCropSettingsChange({
      cropEnabled: false,
      zoom: COVER_MIN_ZOOM,
      offsetX: 0,
      offsetY: 0,
    })
    setError('')
    onResetToSource()
  }

  return (
    <MotionSection
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-[28px] border border-white/8 bg-[#111111] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.36)]"
    >
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex w-full items-center justify-between gap-4 rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4 text-left transition hover:border-white/14 hover:bg-white/[0.05]"
      >
        <div>
          <h2 className="text-xl font-semibold tracking-[-0.03em] text-white">Cover Crop Tool</h2>
          <p className="mt-1 text-sm leading-6 text-white/60">
            Turn on square crop, adjust the framing, and apply the edited cover when it looks right.
          </p>
        </div>
        <span
          aria-hidden="true"
          className={`text-lg leading-none text-white/55 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        >
          ^
        </span>
      </button>

      {isOpen && (
        <div className="mt-4 grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-[28px] border border-white/8 bg-white/[0.03] p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-white/45">Crop Preview</p>
              <p className="text-xs text-white/45">{cropEnabled ? 'Square crop on' : 'Original framing'}</p>
            </div>

            <div className="mt-4 flex justify-center">
              <div
                className="relative overflow-hidden rounded-[26px] border border-white/8 bg-[#0d0d0f]"
                style={{ width: `${COVER_PREVIEW_SIZE}px`, height: `${COVER_PREVIEW_SIZE}px` }}
              >
                {sourcePreviewUrl && previewMetrics ? (
                  <img
                    src={sourcePreviewUrl}
                    alt="Crop preview"
                    className="absolute max-w-none select-none"
                    style={{
                      width: `${previewMetrics.drawWidth}px`,
                      height: `${previewMetrics.drawHeight}px`,
                      left: `${previewMetrics.left}px`,
                      top: `${previewMetrics.top}px`,
                    }}
                  />
                ) : (
                  <div className="absolute inset-0 bg-[#0d0d0f]" />
                )}
              </div>
            </div>

            <p className="mt-4 text-sm leading-7 text-white/60">
              This preview shows the square artwork that will be generated when you apply the crop.
            </p>
          </div>

          <div className="grid gap-4">
            <div className="rounded-[28px] border border-white/8 bg-white/[0.03] p-5">
              <label className="flex items-center justify-between gap-4 rounded-3xl border border-white/8 bg-[#0d0d0f] px-4 py-4">
                <div>
                  <p className="text-sm font-semibold text-white">Make image square</p>
                  <p className="mt-1 text-sm leading-6 text-white/60">
                    Use a simple square crop and adjust it only if you want to.
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={cropEnabled}
                  onClick={() =>
                    onCropSettingsChange({
                      ...cropSettings,
                      cropEnabled: !cropEnabled,
                    })
                  }
                  className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition ${
                    cropEnabled ? 'bg-[#f3f3f3]' : 'bg-white/12'
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 rounded-full bg-[#0a0a0a] transition ${
                      cropEnabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </label>

              {cropEnabled && (
                <div className="mt-4 grid gap-4">
                  <label className="grid gap-2">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs font-medium uppercase tracking-[0.18em] text-white/45">Zoom</span>
                      <span className="text-xs text-white/45">{Math.round(zoom * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min={COVER_MIN_ZOOM}
                      max={COVER_MAX_ZOOM}
                      step="0.01"
                      value={zoom}
                      onChange={(event) =>
                        onCropSettingsChange({
                          ...cropSettings,
                          zoom: Number(event.target.value),
                        })
                      }
                      className="accent-white"
                    />
                  </label>

                  <label className="grid gap-2">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs font-medium uppercase tracking-[0.18em] text-white/45">Left / Right</span>
                      <span className="text-xs text-white/45">{offsetX}%</span>
                    </div>
                    <input
                      type="range"
                      min="-100"
                      max="100"
                      step="1"
                      value={offsetX}
                      onChange={(event) =>
                        onCropSettingsChange({
                          ...cropSettings,
                          offsetX: Number(event.target.value),
                        })
                      }
                      className="accent-white"
                    />
                  </label>

                  <label className="grid gap-2">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs font-medium uppercase tracking-[0.18em] text-white/45">Up / Down</span>
                      <span className="text-xs text-white/45">{offsetY}%</span>
                    </div>
                    <input
                      type="range"
                      min="-100"
                      max="100"
                      step="1"
                      value={offsetY}
                      onChange={(event) =>
                        onCropSettingsChange({
                          ...cropSettings,
                          offsetY: Number(event.target.value),
                        })
                      }
                      className="accent-white"
                    />
                  </label>
                </div>
              )}

              <div className="mt-5 flex flex-wrap gap-2">
                <button
                  onClick={handleApplyCrop}
                  disabled={saving || !previewMetrics}
                  className="rounded-full bg-[#f3f3f3] px-5 py-3 text-sm font-semibold transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                  style={{ color: '#0a0a0a' }}
                >
                  {saving ? 'Applying Crop...' : cropEnabled ? 'Apply Crop' : 'Use Original Cover'}
                </button>
                <button
                  onClick={handleResetCrop}
                  className="rounded-full border border-white/12 bg-transparent px-5 py-3 text-sm font-medium text-white transition hover:border-white/24 hover:bg-white/4"
                >
                  Reset
                </button>
                {currentIsEdited && (
                  <button
                    onClick={onResetToSource}
                    className="rounded-full border border-white/12 bg-transparent px-5 py-3 text-sm font-medium text-white transition hover:border-white/24 hover:bg-white/4"
                  >
                    Use Original Cover
                  </button>
                )}
              </div>
            </div>

            {(saving || error) && (
              <div className={`rounded-3xl border p-4 ${error ? 'border-red-100 bg-red-50' : 'border-white/8 bg-white/[0.03]'}`}>
                <p className={`text-sm ${error ? 'text-red-700' : 'text-white/70'}`}>
                  {error || 'Applying crop...'}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </MotionSection>
  )
}

export default CoverCropPanel

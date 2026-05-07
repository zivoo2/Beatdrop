import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { deletePreset, savePreset } from '../utils/presetUtils'

const EMPTY_FORM = {
  id: '',
  name: '',
  titleTemplate: '{title} | {bpm} BPM | {key}',
  descriptionTemplate: 'Produced by me in {month}/{year}. BPM: {bpm}. Key: {key}.',
  tags: 'type beat,beatdrop',
  visibility: 'private',
}

function PremiumStar() {
  return <span aria-hidden="true" className="inline-block text-[11px] leading-none text-[#d4b15a]">★</span>
}

function PresetsPanel({
  presets = [],
  setPresets,
  selectedPresetId = '',
  onSelectedPresetChange,
  onApplyPreset,
  locked = false,
  proActive = false,
}) {
  const MotionSection = motion.section
  const [isOpen, setIsOpen] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const panelClass = proActive
    ? 'rounded-[28px] border border-[#d4b15a]/20 bg-[linear-gradient(180deg,rgba(212,177,90,0.06)_0%,#111111_20%)] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.36),0_0_34px_rgba(212,177,90,0.09)]'
    : 'rounded-[28px] border border-white/8 bg-[#111111] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.36)]'

  const selectedPreset = useMemo(
    () => presets.find((preset) => preset.id === selectedPresetId) || null,
    [presets, selectedPresetId],
  )

  const handleSave = () => {
    if (!form.name.trim()) return
    const updated = savePreset(form)
    const savedPresetId = form.id || updated[updated.length - 1]?.id || ''

    setPresets(updated)
    onSelectedPresetChange?.(savedPresetId)

    const savedPreset = updated.find((preset) => preset.id === savedPresetId)
    if (savedPreset) {
      setForm(savedPreset)
    }
  }

  const handleEditLoad = () => {
    if (!selectedPreset) return
    setForm(selectedPreset)
  }

  const handleDelete = () => {
    if (!selectedPreset) return
    const updated = deletePreset(selectedPreset.id)
    setPresets(updated)
    onSelectedPresetChange?.('')
    setForm(EMPTY_FORM)
  }

  return (
    <MotionSection
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={panelClass}
    >
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex w-full items-center justify-between gap-4 rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4 text-left transition hover:border-white/14 hover:bg-white/[0.05]"
      >
        <div>
          <h2 className="text-xl font-semibold tracking-[-0.03em] text-white">Metadata Presets</h2>
          <p className="mt-1 text-sm leading-6 text-white/60">
            {locked
              ? 'Reusable presets are part of the paid subscription plan.'
              : 'Edit and save metadata presets.'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {locked && (
            <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white">
              Pro
            </span>
          )}
          <span
            aria-hidden="true"
            className={`text-lg leading-none text-white/55 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          >
            ^
          </span>
        </div>
      </button>

      {isOpen && (locked ? (
        <div className="mt-4 rounded-[28px] border border-white/8 bg-white/[0.03] p-5">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="flex items-center gap-2 rounded-3xl border border-white/8 bg-[#0d0d0f] p-4 text-sm text-white/80">
              <PremiumStar />
              <span>Save repeat title patterns</span>
            </div>
            <div className="flex items-center gap-2 rounded-3xl border border-white/8 bg-[#0d0d0f] p-4 text-sm text-white/80">
              <PremiumStar />
              <span>Reuse description templates</span>
            </div>
            <div className="flex items-center gap-2 rounded-3xl border border-white/8 bg-[#0d0d0f] p-4 text-sm text-white/80">
              <PremiumStar />
              <span>Apply tags and defaults faster</span>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <p className="max-w-2xl text-sm leading-7 text-white/60">
              Presets are designed for paid users managing repeat uploads. The free plan keeps the form manual, while
              the subscription saves your preferred metadata structure for the next release.
            </p>
            <a
              href="#upgrade"
              className="inline-flex items-center justify-center rounded-full bg-[#f3f3f3] px-5 py-3 text-sm font-semibold transition hover:bg-white"
              style={{ color: '#0a0a0a' }}
            >
              Compare Plans
            </a>
          </div>
        </div>
      ) : (
        <>
          <div className="mt-4 grid gap-4">
            <select
              value={selectedPresetId}
              onChange={(event) => onSelectedPresetChange?.(event.target.value)}
              className="rounded-2xl border border-white/10 bg-[#0d0d0f] px-4 py-3 text-sm text-white outline-none transition focus:border-white/24"
            >
              <option value="">Select preset to edit</option>
              {presets.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.name}
                </option>
              ))}
            </select>

            <div className="grid gap-3 md:grid-cols-2">
              <input
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                placeholder="Preset name"
                className="rounded-2xl border border-white/10 bg-[#0d0d0f] px-4 py-3 text-sm text-white outline-none transition focus:border-white/24"
              />
              <input
                value={form.tags}
                onChange={(event) => setForm((prev) => ({ ...prev, tags: event.target.value }))}
                placeholder="tag1,tag2,tag3"
                className="rounded-2xl border border-white/10 bg-[#0d0d0f] px-4 py-3 text-sm text-white outline-none transition focus:border-white/24"
              />
            </div>

            <input
              value={form.titleTemplate}
              onChange={(event) => setForm((prev) => ({ ...prev, titleTemplate: event.target.value }))}
              placeholder="Title template"
              className="rounded-2xl border border-white/10 bg-[#0d0d0f] px-4 py-3 text-sm text-white outline-none transition focus:border-white/24"
            />
            <textarea
              value={form.descriptionTemplate}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  descriptionTemplate: event.target.value,
                }))
              }
              placeholder="Description template"
              className="min-h-24 rounded-2xl border border-white/10 bg-[#0d0d0f] px-4 py-3 text-sm text-white outline-none transition focus:border-white/24"
            />
            <select
              value={form.visibility}
              onChange={(event) => setForm((prev) => ({ ...prev, visibility: event.target.value }))}
              className="rounded-2xl border border-white/10 bg-[#0d0d0f] px-4 py-3 text-sm text-white outline-none transition focus:border-white/24"
            >
              <option value="private">Private</option>
              <option value="unlisted">Unlisted</option>
              <option value="public">Public</option>
            </select>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={handleSave}
              className="rounded-full bg-[#f3f3f3] px-5 py-3 text-sm font-semibold transition hover:bg-white"
              style={{ color: '#0a0a0a' }}
            >
              Save Preset
            </button>
            <button
              onClick={handleEditLoad}
              className="rounded-full border border-white/12 bg-transparent px-5 py-3 text-sm font-medium text-white transition hover:border-white/24 hover:bg-white/4"
            >
              Load for Edit
            </button>
            <button
              onClick={() => selectedPreset && onApplyPreset(selectedPreset)}
              className="rounded-full border border-white/12 bg-transparent px-5 py-3 text-sm font-medium text-white transition hover:border-white/24 hover:bg-white/4"
            >
              Apply to Form
            </button>
            <button
              onClick={handleDelete}
              className="rounded-full border border-white/12 bg-transparent px-5 py-3 text-sm font-medium text-white/72 transition hover:border-white/24 hover:bg-white/4"
            >
              Delete Preset
            </button>
          </div>
        </>
      ))}
    </MotionSection>
  )
}

export default PresetsPanel

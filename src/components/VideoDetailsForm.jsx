import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { CATEGORY_OPTIONS, VIDEO_SIZE_OPTIONS } from '../utils/uploadOptions'
import { deletePreset, savePreset } from '../utils/presetUtils'

const SCHEDULE_STEP_MINUTES = 15
const TIME_OPTIONS = Array.from({ length: (24 * 60) / SCHEDULE_STEP_MINUTES }, (_, index) => {
  const totalMinutes = index * SCHEDULE_STEP_MINUTES
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  const value = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
  const meridiem = hours >= 12 ? 'PM' : 'AM'
  const hourLabel = hours % 12 || 12

  return {
    value,
    label: `${hourLabel}:${String(minutes).padStart(2, '0')} ${meridiem}`,
  }
})

function toDateTimeLocalValue(date) {
  const pad = (value) => String(value).padStart(2, '0')

  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
  ].join('-') + `T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function toDateInputValue(date) {
  return toDateTimeLocalValue(date).slice(0, 10)
}

function getDefaultScheduledDate() {
  const nextDate = new Date(Date.now() + 60 * 60 * 1000)
  nextDate.setSeconds(0, 0)

  const remainder = nextDate.getMinutes() % SCHEDULE_STEP_MINUTES
  if (remainder !== 0) {
    nextDate.setMinutes(nextDate.getMinutes() + (SCHEDULE_STEP_MINUTES - remainder))
  }

  return nextDate
}

function splitPublishAt(value) {
  const rawValue = String(value || '').trim()
  if (!rawValue) {
    return { date: '', time: '' }
  }

  const [date = '', time = ''] = rawValue.split('T')
  return {
    date,
    time: time.slice(0, 5),
  }
}

function combinePublishAt(dateValue, timeValue) {
  if (!dateValue || !timeValue) return ''
  return `${dateValue}T${timeValue}`
}

function formatScheduledSummary(dateValue, timeValue) {
  const combinedValue = combinePublishAt(dateValue, timeValue)
  if (!combinedValue) return ''

  const parsedDate = new Date(combinedValue)
  if (Number.isNaN(parsedDate.getTime())) return ''

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'full',
    timeStyle: 'short',
  }).format(parsedDate)
}

function TrashIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current" strokeWidth="1.8">
      <path d="M4 7h16" strokeLinecap="round" />
      <path d="M10 11v6" strokeLinecap="round" />
      <path d="M14 11v6" strokeLinecap="round" />
      <path d="M6 7l1 11a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-11" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function VideoDetailsForm({
  details,
  setDetails,
  presets = [],
  setPresets,
  selectedPresetId = '',
  onPresetSelect,
  presetLocked = false,
  scheduleLocked = false,
  proActive = false,
}) {
  const MotionSection = motion.section
  const presetCardClass = 'mt-4 rounded-3xl border border-white/8 bg-white/[0.03] p-4'
  const savePresetButtonClass = proActive
    ? 'inline-flex items-center justify-center rounded-full border border-[#d4b15a]/35 bg-transparent px-4 py-2.5 text-sm font-semibold text-[#f3d58f] transition hover:bg-[rgba(212,177,90,0.08)] disabled:cursor-not-allowed disabled:opacity-50'
    : 'inline-flex items-center justify-center rounded-full bg-[#f3f3f3] px-4 py-2.5 text-sm font-semibold transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50'
  const scheduleCardClass = !scheduleLocked && proActive
    ? 'flex items-start gap-3 rounded-2xl border border-[#d4b15a]/35 bg-[#0d0d0f] px-4 py-3 text-sm text-white'
    : 'flex items-start gap-3 rounded-2xl border border-white/10 bg-[#0d0d0f] px-4 py-3 text-sm text-white'
  const schedulePanelClass = !scheduleLocked && proActive
    ? 'grid gap-2 rounded-2xl border border-[#d4b15a]/35 bg-[#0d0d0f] px-4 py-3'
    : 'grid gap-2 rounded-2xl border border-white/10 bg-[#0d0d0f] px-4 py-3'
  const [isSavingPreset, setIsSavingPreset] = useState(false)
  const [presetName, setPresetName] = useState('')
  const [presetMode, setPresetMode] = useState('create')

  const updateField = (key, value) => {
    setDetails((prev) => ({ ...prev, [key]: value }))
  }

  const toggleField = (key) => (event) => {
    updateField(key, event.target.checked)
  }

  const handleScheduleToggle = (event) => {
    const checked = event.target.checked
    const suggestedPublishAt = toDateTimeLocalValue(getDefaultScheduledDate())

    setDetails((prev) => ({
      ...prev,
      schedulePublish: checked,
      visibility: checked ? 'private' : prev.visibility,
      publishAt: checked ? prev.publishAt || suggestedPublishAt : prev.publishAt,
    }))
  }

  const schedulingEnabled = Boolean(details.schedulePublish)
  const schedulingAvailable = !scheduleLocked
  const localTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'your local timezone'
  const defaultScheduledPublishAt = toDateTimeLocalValue(getDefaultScheduledDate())
  const defaultScheduleParts = splitPublishAt(defaultScheduledPublishAt)
  const { date: publishDateValue, time: publishTimeValue } = splitPublishAt(details.publishAt)
  const selectedDateValue = publishDateValue || defaultScheduleParts.date
  const selectedTimeValue = publishTimeValue || defaultScheduleParts.time
  const minPublishDate = toDateInputValue(new Date())
  const scheduledSummary = formatScheduledSummary(selectedDateValue, selectedTimeValue)
  const canSavePreset = Boolean(details.description.trim()) && !presetLocked
  const selectedPreset = useMemo(
    () => presets.find((preset) => preset.id === selectedPresetId) || null,
    [presets, selectedPresetId],
  )

  const handlePublishDateChange = (event) => {
    const nextDateValue = event.target.value
    updateField('publishAt', combinePublishAt(nextDateValue, selectedTimeValue))
  }

  const handlePublishTimeChange = (event) => {
    const nextTimeValue = event.target.value
    updateField('publishAt', combinePublishAt(selectedDateValue, nextTimeValue))
  }

  const handlePresetSave = () => {
    const nextName = presetName.trim() || details.title.trim() || 'Untitled preset'
    const updatedPresets = savePreset({
      id: presetMode === 'edit' ? selectedPreset?.id || '' : '',
      name: nextName,
      titleTemplate: details.title,
      descriptionTemplate: details.description,
      tags: details.tags,
      visibility: details.visibility,
    })
    const savedPresetId = presetMode === 'edit'
      ? selectedPreset?.id || ''
      : updatedPresets[updatedPresets.length - 1]?.id || ''

    setPresets?.(updatedPresets)
    onPresetSelect?.(savedPresetId)
    setPresetName(nextName)
    setIsSavingPreset(false)
    setPresetMode('create')
  }

  const handlePresetDelete = (preset) => {
    if (!preset) return
    const shouldDelete = window.confirm(`Delete preset "${preset.name}"?`)
    if (!shouldDelete) return

    const updatedPresets = deletePreset(preset.id)
    setPresets?.(updatedPresets)

    if (selectedPresetId === preset.id) {
      onPresetSelect?.('')
      setPresetName('')
    }
  }

  const openCreatePreset = () => {
    setPresetMode('create')
    setPresetName('')
    setIsSavingPreset(true)
  }

  const openEditPreset = () => {
    if (!selectedPreset) return
    setPresetMode('edit')
    setPresetName(selectedPreset.name || '')
    setIsSavingPreset(true)
  }

  return (
    <MotionSection
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-[28px] border border-white/8 bg-[#111111] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.36)]"
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-[-0.03em] text-white">Video Details</h2>
          <p className="mt-1 text-sm leading-6 text-white/60">These values are sent directly to YouTube.</p>
        </div>
      </div>

      <div className={presetCardClass}>
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-white/45">Metadata</p>
          <p className="mt-2 text-sm leading-6 text-white/60">
            Fill out your title, description, and tags here, then save the setup as a reusable preset when you want.
          </p>
        </div>

        <div className="mt-4 grid gap-3">
          <input
            value={details.title}
            onChange={(event) => updateField('title', event.target.value)}
            placeholder="Video title"
            className="rounded-2xl border border-white/10 bg-[#0d0d0f] px-4 py-3 text-sm text-white outline-none transition focus:border-white/24"
          />
          <textarea
            value={details.description}
            onChange={(event) => updateField('description', event.target.value)}
            placeholder="Video description"
            className="min-h-28 rounded-2xl border border-white/10 bg-[#0d0d0f] px-4 py-3 text-sm text-white outline-none transition focus:border-white/24"
          />
          <input
            value={details.tags}
            onChange={(event) => updateField('tags', event.target.value)}
            placeholder="Comma-separated tags"
            className="rounded-2xl border border-white/10 bg-[#0d0d0f] px-4 py-3 text-sm text-white outline-none transition focus:border-white/24"
          />
        </div>

        <div className="mt-4 border-t border-white/8 pt-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-white/45">Metadata Presets</p>
            <p className="mt-2 text-sm leading-6 text-white/60">
              {presetLocked
                ? 'Upgrade to save and reuse metadata presets directly from this form.'
                : 'Choose a saved preset below, or edit the selected one inline.'}
            </p>
          </div>

          {!presetLocked ? (
            <>
              <div className="mt-3 grid gap-3 md:grid-cols-[auto_minmax(0,1fr)_auto_auto] md:items-center">
                <button
                  type="button"
                  onClick={openCreatePreset}
                  disabled={!canSavePreset}
                  className={savePresetButtonClass}
                  style={proActive ? undefined : { color: '#0a0a0a' }}
                >
                  Save as Preset
                </button>

                <select
                  value={selectedPresetId}
                  onChange={(event) => onPresetSelect?.(event.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-[#0d0d0f] px-4 py-3 text-sm text-white outline-none transition focus:border-white/24"
                >
                  <option value="">Select a preset</option>
                  {presets.map((preset) => (
                    <option key={preset.id} value={preset.id}>
                      {preset.name}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={openEditPreset}
                  disabled={!selectedPreset}
                  className="rounded-full border border-white/12 bg-transparent px-4 py-2.5 text-sm font-medium text-white transition hover:border-white/24 hover:bg-white/4 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Edit
                </button>

                <button
                  type="button"
                  onClick={() => handlePresetDelete(selectedPreset)}
                  disabled={!selectedPreset}
                  className="inline-flex items-center justify-center rounded-full border border-white/12 bg-transparent px-3 py-2.5 text-white/72 transition hover:border-white/24 hover:bg-white/4 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label={selectedPreset ? `Delete preset ${selectedPreset.name}` : 'Delete selected preset'}
                  title={selectedPreset ? `Delete ${selectedPreset.name}` : 'Delete selected preset'}
                >
                  <TrashIcon />
                </button>
              </div>

              {isSavingPreset ? (
                <div className="mt-3 flex flex-col gap-3 rounded-2xl border border-white/10 bg-[#0d0d0f] p-4 md:flex-row md:items-center">
                  <input
                    value={presetName}
                    onChange={(event) => setPresetName(event.target.value)}
                    placeholder="Preset name"
                    className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-[#09090b] px-4 py-3 text-sm text-white outline-none transition focus:border-white/24"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handlePresetSave}
                      className="rounded-full bg-[#f3f3f3] px-4 py-2.5 text-sm font-semibold transition hover:bg-white"
                      style={{ color: '#0a0a0a' }}
                    >
                      {presetMode === 'edit' ? 'Update' : 'Save'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsSavingPreset(false)
                        setPresetName('')
                        setPresetMode('create')
                      }}
                      className="rounded-full border border-white/12 bg-transparent px-4 py-2.5 text-sm font-medium text-white transition hover:border-white/24 hover:bg-white/4"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : null}
              {!presets.length ? <p className="mt-3 text-sm text-white/45">No presets saved yet.</p> : null}
            </>
          ) : null}
        </div>
      </div>

      <div className="mt-4 grid gap-3">
        <select
          value={details.visibility}
          onChange={(event) => updateField('visibility', event.target.value)}
          disabled={schedulingEnabled}
          className="rounded-2xl border border-white/10 bg-[#0d0d0f] px-4 py-3 text-sm text-white outline-none transition focus:border-white/24 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <option value="private">Private</option>
          <option value="unlisted">Unlisted</option>
          <option value="public">Public</option>
        </select>
        {schedulingEnabled && (
          <p className="text-xs text-white/45">
            Scheduled uploads must stay private until YouTube publishes them automatically.
          </p>
        )}

        <label className={scheduleCardClass}>
          <input
            type="checkbox"
            checked={schedulingEnabled}
            onChange={handleScheduleToggle}
            disabled={scheduleLocked}
            className="mt-1 h-4 w-4 rounded border-white/20 bg-transparent"
          />
          <span>
            <span className="block font-medium text-white">
              Schedule publish
              {scheduleLocked && (
                <span className="ml-2 inline-flex rounded-full border border-[#d4b15a]/35 bg-[rgba(212,177,90,0.12)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#f3d58f]">
                  Pro
                </span>
              )}
            </span>
            <span className="mt-1 block text-white/55">
              {scheduleLocked
                ? 'Unlock with Pro'
                : 'Upload now and let YouTube publish it later from private status.'}
            </span>
          </span>
        </label>

        {schedulingEnabled && schedulingAvailable && (
          <div className={schedulePanelClass}>
            <span className="text-xs font-medium uppercase tracking-[0.18em] text-white/45">Publish Date</span>
            <div className="grid gap-3 md:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
              <label className="grid gap-2">
                <span className="text-xs text-white/45">Choose the calendar day</span>
                <input
                  type="date"
                  value={selectedDateValue}
                  min={minPublishDate}
                  onChange={handlePublishDateChange}
                  className="rounded-2xl border border-white/10 bg-[#09090b] px-4 py-3 text-sm text-white outline-none transition focus:border-white/24"
                />
              </label>

              <label className="grid gap-2">
                <span className="text-xs text-white/45">Pick a publish time</span>
                <select
                  value={selectedTimeValue}
                  onChange={handlePublishTimeChange}
                  className="rounded-2xl border border-white/10 bg-[#09090b] px-4 py-3 text-sm text-white outline-none transition focus:border-white/24"
                >
                  {TIME_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <span className="text-xs text-white/45">
              Uses {localTimeZone}. Open the calendar to choose the month and day, then pick a future time.
            </span>
            {scheduledSummary && <span className="text-xs text-white/60">Scheduled for {scheduledSummary}</span>}
          </div>
        )}

        <div className="grid gap-3 md:grid-cols-2">
          <label className="grid gap-2">
            <span className="text-xs font-medium uppercase tracking-[0.18em] text-white/45">Video Size</span>
            <select
              value={details.videoSize}
              onChange={(event) => updateField('videoSize', event.target.value)}
              className="rounded-2xl border border-white/10 bg-[#0d0d0f] px-4 py-3 text-sm text-white outline-none transition focus:border-white/24"
            >
              {VIDEO_SIZE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-2">
            <span className="text-xs font-medium uppercase tracking-[0.18em] text-white/45">Category</span>
            <select
              value={details.categoryId}
              onChange={(event) => updateField('categoryId', event.target.value)}
              className="rounded-2xl border border-white/10 bg-[#0d0d0f] px-4 py-3 text-sm text-white outline-none transition focus:border-white/24"
            >
              {CATEGORY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <label className="flex items-start gap-3 rounded-2xl border border-white/10 bg-[#0d0d0f] px-4 py-3 text-sm text-white">
            <input
              type="checkbox"
              checked={details.notifySubscribers}
              onChange={toggleField('notifySubscribers')}
              className="mt-1 h-4 w-4 rounded border-white/20 bg-transparent"
            />
            <span>
              <span className="block font-medium text-white">Notify subscribers about this upload</span>
              <span className="mt-1 block text-white/55">YouTube will send the upload to subscriber feeds when possible.</span>
            </span>
          </label>

          <label className="flex items-start gap-3 rounded-2xl border border-white/10 bg-[#0d0d0f] px-4 py-3 text-sm text-white">
            <input
              type="checkbox"
              checked={details.madeForKids}
              onChange={toggleField('madeForKids')}
              className="mt-1 h-4 w-4 rounded border-white/20 bg-transparent"
            />
            <span>
              <span className="block font-medium text-white">Made for kids?</span>
              <span className="mt-1 block text-white/55">Sets YouTube&apos;s audience flag for child-directed content.</span>
            </span>
          </label>

          <label className="flex items-start gap-3 rounded-2xl border border-white/10 bg-[#0d0d0f] px-4 py-3 text-sm text-white">
            <input
              type="checkbox"
              checked={details.embeddable}
              onChange={toggleField('embeddable')}
              className="mt-1 h-4 w-4 rounded border-white/20 bg-transparent"
            />
            <span>
              <span className="block font-medium text-white">Embeddable?</span>
              <span className="mt-1 block text-white/55">Allows the video to be embedded on external sites.</span>
            </span>
          </label>

          <label className="flex items-start gap-3 rounded-2xl border border-white/10 bg-[#0d0d0f] px-4 py-3 text-sm text-white">
            <input
              type="checkbox"
              checked={details.license === 'creativeCommon'}
              onChange={(event) => updateField('license', event.target.checked ? 'creativeCommon' : 'youtube')}
              className="mt-1 h-4 w-4 rounded border-white/20 bg-transparent"
            />
            <span>
              <span className="block font-medium text-white">Creative Commons?</span>
              <span className="mt-1 block text-white/55">Switches the upload license from standard YouTube to Creative Commons.</span>
            </span>
          </label>
        </div>
      </div>
    </MotionSection>
  )
}

export default VideoDetailsForm

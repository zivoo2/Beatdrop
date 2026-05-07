import { motion } from 'framer-motion'
import { CATEGORY_OPTIONS, VIDEO_SIZE_OPTIONS } from '../utils/uploadOptions'

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

function PremiumStar() {
  return <span aria-hidden="true" className="inline-block text-[11px] leading-none text-[#d4b15a]">â˜…</span>
}

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

function VideoDetailsForm({
  details,
  setDetails,
  presets = [],
  selectedPresetId = '',
  onPresetSelect,
  presetLocked = false,
  scheduleLocked = false,
  proActive = false,
}) {
  const MotionSection = motion.section
  const presetCardClass = proActive
    ? 'mt-4 rounded-3xl border border-[#d4b15a]/18 bg-[linear-gradient(180deg,rgba(212,177,90,0.08)_0%,rgba(255,255,255,0.03)_100%)] p-4 shadow-[0_12px_32px_rgba(212,177,90,0.08)]'
    : 'mt-4 rounded-3xl border border-white/8 bg-white/[0.03] p-4'

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

  const handlePublishDateChange = (event) => {
    const nextDateValue = event.target.value
    updateField('publishAt', combinePublishAt(nextDateValue, selectedTimeValue))
  }

  const handlePublishTimeChange = (event) => {
    const nextTimeValue = event.target.value
    updateField('publishAt', combinePublishAt(selectedDateValue, nextTimeValue))
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
        {presetLocked && (
          <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white">
            Pro
          </span>
        )}
      </div>

      <div className={presetCardClass}>
        <div className="flex items-center gap-2">
          {presetLocked && <PremiumStar />}
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-white/45">Metadata Preset</p>
        </div>
        <p className="mt-2 text-sm leading-6 text-white/60">
          {presetLocked
            ? 'Upgrade to apply saved metadata presets directly into your video details.'
            : 'Choose a preset to fill the title, description, tags, visibility, and upload defaults below.'}
        </p>
        <select
          value={selectedPresetId}
          onChange={(event) => onPresetSelect?.(event.target.value)}
          disabled={presetLocked}
          className="mt-3 w-full rounded-2xl border border-white/10 bg-[#0d0d0f] px-4 py-3 text-sm text-white outline-none transition focus:border-white/24 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <option value="">No preset selected</option>
          {presets.map((preset) => (
            <option key={preset.id} value={preset.id}>
              {preset.name}
            </option>
          ))}
        </select>
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

        <label className="flex items-start gap-3 rounded-2xl border border-white/10 bg-[#0d0d0f] px-4 py-3 text-sm text-white">
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
              {scheduleLocked && <span className="ml-2 inline-flex rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/70">Pro</span>}
            </span>
            <span className="mt-1 block text-white/55">
              {scheduleLocked
                ? 'Upgrade to BeatDrop Pro to schedule uploads from the calendar picker.'
                : 'Upload now and let YouTube publish it later from private status.'}
            </span>
          </span>
        </label>

        {schedulingEnabled && schedulingAvailable && (
          <div className="grid gap-2 rounded-2xl border border-white/10 bg-[#0d0d0f] px-4 py-3">
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

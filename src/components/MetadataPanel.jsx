import { motion } from 'framer-motion'

function FieldSpinner({ active }) {
  if (!active) return null

  return (
    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/16 border-t-white" />
  )
}

function PremiumStar() {
  return <span aria-hidden="true" className="inline-block text-[11px] leading-none text-[#d4b15a]">★</span>
}

function MetadataPanel({
  bpm,
  setBpm,
  musicalKey,
  setMusicalKey,
  bpmLoading,
  keyLoading,
  locked = false,
  proActive = false,
}) {
  const MotionSection = motion.section
  const panelClass = proActive
    ? 'rounded-[28px] border border-[#d4b15a]/20 bg-[linear-gradient(180deg,rgba(212,177,90,0.06)_0%,#111111_20%)] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.36),0_0_34px_rgba(212,177,90,0.09)]'
    : 'rounded-[28px] border border-white/8 bg-[#111111] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.36)]'
  const activeCardClass = proActive
    ? 'rounded-3xl border border-[#d4b15a]/18 bg-[linear-gradient(180deg,rgba(212,177,90,0.08)_0%,rgba(255,255,255,0.03)_100%)] p-4 shadow-[0_12px_32px_rgba(212,177,90,0.08)]'
    : 'rounded-3xl border border-white/8 bg-white/[0.03] p-4'

  return (
    <MotionSection
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={panelClass}
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-[-0.03em] text-white">Detected Metadata</h2>
          <p className="mt-1 text-sm leading-6 text-white/60">
            {locked
              ? 'Automatic BPM and key detection are available on the paid subscription.'
              : 'Auto-detected values are editable before export.'}
          </p>
        </div>
        {locked && (
          <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white">
            Pro
          </span>
        )}
      </div>

      {locked ? (
        <div className="mt-4 rounded-[28px] border border-white/8 bg-white/[0.03] p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-3xl border border-white/8 bg-[#0d0d0f] p-4">
              <div className="flex items-center gap-2">
                <PremiumStar />
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-white/45">Auto BPM</p>
              </div>
              <p className="mt-3 text-lg font-medium text-white">Unlock automatic tempo analysis</p>
            </div>
            <div className="rounded-3xl border border-white/8 bg-[#0d0d0f] p-4">
              <div className="flex items-center gap-2">
                <PremiumStar />
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-white/45">Auto Key</p>
              </div>
              <p className="mt-3 text-lg font-medium text-white">Unlock key detection for each upload</p>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <p className="max-w-2xl text-sm leading-7 text-white/60">
              The free plan keeps the upload flow manual. Upgrade when you want BeatDrop to analyze your track and fill
              in BPM and key faster.
            </p>
            <a
              href="#upgrade"
              className="inline-flex items-center justify-center rounded-full bg-[#f3f3f3] px-5 py-3 text-sm font-semibold transition hover:bg-white"
              style={{ color: '#0a0a0a' }}
            >
              View Upgrade
            </a>
          </div>
        </div>
      ) : (
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className={activeCardClass}>
            <div className="mb-2 flex items-center justify-between text-xs font-medium uppercase tracking-[0.18em] text-white/45">
              BPM
              <FieldSpinner active={bpmLoading} />
            </div>
            <input
              type="text"
              value={bpm}
              onChange={(event) => setBpm(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-[#0d0d0f] px-4 py-3 text-sm text-white outline-none transition focus:border-white/24"
              placeholder="120"
            />
          </label>

          <label className={activeCardClass}>
            <div className="mb-2 flex items-center justify-between text-xs font-medium uppercase tracking-[0.18em] text-white/45">
              Musical Key
              <FieldSpinner active={keyLoading} />
            </div>
            <input
              type="text"
              value={musicalKey}
              onChange={(event) => setMusicalKey(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-[#0d0d0f] px-4 py-3 text-sm text-white outline-none transition focus:border-white/24"
              placeholder="A Minor"
            />
          </label>
        </div>
      )}
    </MotionSection>
  )
}

export default MetadataPanel

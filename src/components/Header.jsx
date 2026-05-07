import { motion } from 'framer-motion'

function YouTubeLogo() {
  return (
    <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-[#ff3b30] shadow-[0_10px_24px_rgba(0,0,0,0.22)]">
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-6 w-6 fill-current">
        <path d="M21.6 7.2a2.9 2.9 0 0 0-2-2.04C17.84 4.7 12 4.7 12 4.7s-5.84 0-7.6.46a2.9 2.9 0 0 0-2 2.04A30.4 30.4 0 0 0 2 12a30.4 30.4 0 0 0 .4 4.8 2.9 2.9 0 0 0 2 2.04c1.76.46 7.6.46 7.6.46s5.84 0 7.6-.46a2.9 2.9 0 0 0 2-2.04A30.4 30.4 0 0 0 22 12a30.4 30.4 0 0 0-.4-4.8ZM10 15.48V8.52L16 12l-6 3.48Z" />
      </svg>
    </span>
  )
}

function Header({ token, userInfo, login, logout }) {
  const MotionSection = motion.section

  return (
    <MotionSection
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-[28px] border border-white/8 bg-[#111111] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.36)]"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <YouTubeLogo />
          <div>
          <p className="text-xs font-medium uppercase tracking-[0.24em] text-white/45">YouTube</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-white">Connect YouTube</h1>
          <p className="mt-2 text-sm leading-6 text-white/60">
            Link your YouTube account separately so BeatDrop can publish the finished upload.
          </p>
          </div>
        </div>
        {token ? (
          <div className="flex flex-col items-start gap-3 sm:items-end">
            <p className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-white">
              Connected
            </p>
            <p className="text-sm text-white/60">
              Connected as {userInfo?.name || userInfo?.email || 'YouTube account'}
            </p>
            <button
              onClick={logout}
              className="rounded-full border border-white/12 bg-transparent px-4 py-2 text-sm font-medium text-white transition hover:border-white/24 hover:bg-white/4"
            >
              Disconnect
            </button>
          </div>
        ) : (
          <button
            onClick={login}
            className="rounded-full bg-[#f3f3f3] px-5 py-3 text-sm font-semibold transition hover:bg-white"
            style={{ color: '#0a0a0a' }}
          >
            Connect YouTube
          </button>
        )}
      </div>
    </MotionSection>
  )
}

export default Header

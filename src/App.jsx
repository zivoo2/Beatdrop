import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import Header from './components/Header'
import UploadZone from './components/UploadZone'
import CoverCropPanel from './components/CoverCropPanel'
import PresetsPanel from './components/PresetsPanel'
import VideoDetailsForm from './components/VideoDetailsForm'
import ConvertUploadPanel from './components/ConvertUploadPanel'
import GoogleSignInButton from './components/GoogleSignInButton'
import { useAuth } from './hooks/useAuth'
import { useYouTubeAuth } from './hooks/useYouTubeAuth'
import { useBilling } from './hooks/useBilling'
import { useBPMDetection } from './hooks/useBPMDetection'
import { useKeyDetection } from './hooks/useKeyDetection'
import { loadPresets } from './utils/presetUtils'
import { DEFAULT_UPLOAD_DETAILS } from './utils/uploadOptions'
import { applyTemplate } from './utils/templateUtils'
import { DEFAULT_COVER_CROP } from './utils/coverCropUtils'

const WORKFLOW_STEPS = [
  'Upload audio + cover',
  'Detect BPM and key',
  'Apply a saved preset',
  'Review video details',
  'Convert and publish',
]

const FAQ_ITEMS = [
  {
    question: 'Do I need editing software before uploading?',
    answer: 'No. BeatDrop is designed to handle the release flow in-browser, from metadata prep to upload.',
  },
  {
    question: 'Can I reuse titles, tags, and descriptions?',
    answer: 'Yes. The Studio includes preset tools so repeat uploads stay fast and consistent.',
  },
  {
    question: 'Will my files stay on my machine while I work?',
    answer: 'The workflow is built around browser-based processing, so you can prepare your upload without bouncing between extra apps.',
  },
]

const FREE_PLAN_FEATURES = [
  'Upload MP3 or WAV files',
  'Add a cover image',
  'Crop and customize cover artwork',
  'Write title and description manually',
  'Connect YouTube and publish',
]

const PRO_PLAN_FEATURES = [
  'Everything in Free',
  'Auto-detected BPM',
  'Auto-detected musical key',
  'Reusable metadata presets',
  'Schedule your uploads',
]

const PRIVACY_LAST_UPDATED = 'April 7, 2026'
const TERMS_LAST_UPDATED = 'May 6, 2026'

const PRIVACY_SECTIONS = [
  {
    title: 'Overview',
    body:
      'BeatDrop is designed to keep media preparation lightweight and browser-first. This policy explains what information BeatDrop collects, how it is used, and the choices you have when you use the site, create an account, connect YouTube, or manage a subscription.',
    bullets: [],
  },
  {
    title: 'Information BeatDrop Collects',
    body: '',
    bullets: [
      'Account information: BeatDrop stores your email address, display name, a hashed password, and account timestamps when you create an account.',
      'Session information: BeatDrop stores a session token in your browser and a matching session record on the server so you can stay signed in.',
      'Billing information: when subscriptions are enabled, BeatDrop stores Stripe-related billing state such as customer ID, subscription ID, price ID, plan status, and related account email details.',
      'YouTube connection information: if you connect YouTube, BeatDrop uses Google OAuth access tokens in the browser and may request basic Google profile information so the connected account can be shown in the app.',
      'Project information: BeatDrop uses the media files, titles, descriptions, tags, thumbnails, and upload settings you provide to generate and publish YouTube uploads.',
      'Browser storage: BeatDrop stores your auth token and saved presets in local storage so your session and workflow settings can persist between visits.',
    ],
  },
  {
    title: 'How BeatDrop Uses Information',
    body: '',
    bullets: [
      'To create and manage your BeatDrop account.',
      'To verify plan status and manage Stripe checkout or billing portal flows.',
      'To prepare upload-ready videos and send video details, uploads, and thumbnails to YouTube when you request a publish action.',
      'To display connected account state and keep the product functioning reliably.',
      'To support troubleshooting, product security, and service improvements.',
    ],
  },
  {
    title: 'YouTube API Services',
    body:
      'BeatDrop uses YouTube API Services to upload videos, set thumbnails, and display connected YouTube account information. By using those features, you are also subject to Google and YouTube terms and policies.',
    bullets: [
      'BeatDrop primarily handles YouTube access tokens in the browser and sends them to the BeatDrop server only when needed to complete the upload actions you initiate.',
      'BeatDrop may send your chosen title, description, tags, visibility settings, thumbnail, and media upload data to YouTube on your behalf when you publish.',
      'You can revoke BeatDrop access from your Google account permissions page at any time.',
    ],
  },
  {
    title: 'Media Handling',
    body:
      'BeatDrop is built around browser-based processing wherever practical. Uploaded media is used to create your YouTube-ready video and thumbnail, and BeatDrop relays upload data to YouTube when you ask it to publish.',
    bullets: [
      'BeatDrop does not intentionally keep a permanent media library of your uploaded audio or cover images on the current app server.',
      'Media files may pass through browser memory, temporary request handling, or in-memory upload relay steps while conversion and YouTube publishing are in progress.',
    ],
  },
  {
    title: 'Sharing and Service Providers',
    body:
      'BeatDrop shares information only as needed to operate the service and complete the actions you request.',
    bullets: [
      'Google and YouTube: for authentication, account display, video upload, and thumbnail updates.',
      'Stripe: for subscription checkout, billing portal access, and subscription status management.',
      'Legal or security reasons: if disclosure is required to comply with law, enforce terms, or protect the service and its users.',
    ],
  },
  {
    title: 'Retention and Your Choices',
    body: '',
    bullets: [
      'Browser-stored session tokens and presets remain on your device until you log out, clear storage, or overwrite them.',
      'BeatDrop account and billing records are retained for as long as reasonably needed to operate the service, maintain subscriptions, resolve disputes, or comply with legal obligations.',
      'If you want account or stored subscription records reviewed or deleted, contact hello@beatdrop.studio.',
    ],
  },
  {
    title: 'Security',
    body:
      'BeatDrop uses reasonable measures to protect account, session, and billing state. No online service can guarantee absolute security, so you should use a strong password and review connected account permissions regularly.',
    bullets: [],
  },
  {
    title: 'Children',
    body:
      'BeatDrop is not intended for children under 13, and the service is not knowingly designed to collect personal information from children.',
    bullets: [],
  },
  {
    title: 'Changes and Contact',
    body:
      'BeatDrop may update this Privacy Policy as the product changes. Material updates will be reflected by revising the last updated date on this page.',
    bullets: ['Questions about privacy can be sent to hello@beatdrop.studio.'],
  },
]

const TERMS_SECTIONS = [
  {
    title: 'Acceptance of Terms',
    body:
      'By accessing or using BeatDrop, you agree to these Terms of Service. If you do not agree, do not use the service.',
    bullets: [],
  },
  {
    title: 'What BeatDrop Provides',
    body:
      'BeatDrop helps users prepare media, generate upload-ready video assets, manage account access, and publish content to connected third-party services such as YouTube.',
    bullets: [
      'Some features depend on third-party platforms including Google, YouTube, and Stripe.',
      'Features, pricing, and availability may change as the product evolves.',
    ],
  },
  {
    title: 'Accounts',
    body:
      'You are responsible for the accuracy of the information used to create your account and for activity that occurs under your account.',
    bullets: [
      'Keep your login credentials secure.',
      'You must use a verified and accurate email address.',
      'We may suspend or terminate access if an account is used for abuse, fraud, or unlawful activity.',
    ],
  },
  {
    title: 'User Content and Uploads',
    body:
      'You retain responsibility for the audio, images, metadata, and other content you upload or publish through BeatDrop.',
    bullets: [
      'You must have the rights and permissions needed to use and publish your content.',
      'You may not use BeatDrop to upload unlawful, infringing, deceptive, or abusive material.',
      'When you connect YouTube and request a publish action, you authorize BeatDrop to send the selected content and metadata on your behalf.',
    ],
  },
  {
    title: 'Third-Party Services',
    body:
      'BeatDrop integrates with third-party services, and your use of those services remains subject to their own terms and policies.',
    bullets: [
      'Google and YouTube features are subject to Google and YouTube terms.',
      'Billing features are subject to Stripe terms and the billing configuration associated with your account.',
    ],
  },
  {
    title: 'Payments and Subscriptions',
    body:
      'Paid features, if enabled, are billed through Stripe or another designated payment provider.',
    bullets: [
      'Subscription access may change if billing fails, is canceled, or expires.',
      'You are responsible for reviewing pricing and renewal details before subscribing.',
    ],
  },
  {
    title: 'Service Availability',
    body:
      'BeatDrop is provided on an as-is and as-available basis. We do not guarantee uninterrupted availability, error-free operation, or permanent storage of account or project data.',
    bullets: [],
  },
  {
    title: 'Limitation of Liability',
    body:
      'To the maximum extent permitted by law, BeatDrop is not liable for indirect, incidental, special, consequential, or punitive damages arising from your use of the service.',
    bullets: [],
  },
  {
    title: 'Changes and Contact',
    body:
      'We may update these Terms of Service from time to time. Continued use of BeatDrop after updates means you accept the revised terms.',
    bullets: ['Questions about these terms can be sent to hello@beatdrop.studio.'],
  },
]

const studioPanelClass =
  'rounded-[28px] border border-white/8 bg-[#111111] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.36)]'

const noiseStyle = {
  backgroundImage:
    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160' viewBox='0 0 160 160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)' opacity='0.18'/%3E%3C/svg%3E\")",
}
const PASSWORD_MIN_LENGTH = 8
const PASSWORD_UPPERCASE_REGEX = /[A-Z]/
const PASSWORD_SYMBOL_REGEX = /[^A-Za-z0-9]/

function getSignupPasswordError(password) {
  const nextPassword = String(password || '')

  if (nextPassword.length < PASSWORD_MIN_LENGTH) {
    return `Password must be at least ${PASSWORD_MIN_LENGTH} characters long.`
  }

  if (!PASSWORD_UPPERCASE_REGEX.test(nextPassword)) {
    return 'Password must include at least one capital letter.'
  }

  if (!PASSWORD_SYMBOL_REGEX.test(nextPassword)) {
    return 'Password must include at least one symbol.'
  }

  return ''
}

function getRouteFromHash(hash) {
  if (hash === '#studio') return 'studio'
  if (hash === '#upgrade') return 'upgrade'
  if (hash === '#login') return 'login'
  if (hash === '#privacy') return 'privacy'
  if (hash === '#terms') return 'terms'
  return 'landing'
}

function PremiumStar() {
  return <span aria-hidden="true" className="inline-block text-[11px] leading-none text-[#d4b15a]">★</span>
}

function BrandMark({ isPro = false, size = 'default' }) {
  const textClass = size === 'large' ? 'text-2xl md:text-3xl' : 'text-xl md:text-2xl'

  return (
    <span className="inline-flex items-center gap-2">
      <span className={`font-extrabold uppercase tracking-[0.22em] text-white ${textClass}`}>BeatDrop</span>
      {isPro && (
        <span className="rounded-full border border-[#d4b15a]/35 bg-[linear-gradient(180deg,rgba(212,177,90,0.22)_0%,rgba(212,177,90,0.08)_100%)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.24em] text-[#f3d58f] shadow-[0_0_24px_rgba(212,177,90,0.18)]">
          Pro
        </span>
      )}
    </span>
  )
}

function App() {
  const MotionMain = motion.main
  const MotionSection = motion.section
  const [route, setRoute] = useState(() => getRouteFromHash(window.location.hash))
  const [authMode, setAuthMode] = useState('login')
  const [showPassword, setShowPassword] = useState(false)
  const [authFormError, setAuthFormError] = useState('')
  const [authForm, setAuthForm] = useState({
    name: '',
    email: '',
    password: '',
  })
  const [audioFile, setAudioFile] = useState(null)
  const [sourceImageFile, setSourceImageFile] = useState(null)
  const [imageFile, setImageFile] = useState(null)
  const [coverCropSettings, setCoverCropSettings] = useState(DEFAULT_COVER_CROP)
  const [bpm, setBpm] = useState('')
  const [musicalKey, setMusicalKey] = useState('Unknown')
  const [details, setDetails] = useState(DEFAULT_UPLOAD_DETAILS)
  const [presets, setPresets] = useState(() => loadPresets())
  const [selectedPresetId, setSelectedPresetId] = useState('')

  const {
    token: accountToken,
    user: accountUser,
    loading: authLoading,
    error: authError,
    actionLoading: authActionLoading,
    isAuthenticated,
    login: loginAccount,
    signup,
    googleLogin,
    logout: logoutAccount,
  } = useAuth()
  const {
    token: youtubeToken,
    userInfo: youtubeUserInfo,
    ready: youtubeReady,
    login: loginYouTube,
    logout: logoutYouTube,
    ensureValidToken: ensureValidYouTubeToken,
  } = useYouTubeAuth()
  const {
    config: billingConfig,
    loading: billingLoading,
    error: billingError,
    actionLoading: billingActionLoading,
    isProPlan,
    refreshSubscription,
    startCheckout,
    openBillingPortal,
  } = useBilling(accountToken, accountUser)
  const { detectBPM, loading: bpmLoading } = useBPMDetection()
  const { detectKey, loading: keyLoading } = useKeyDetection()
  const checkoutState = useMemo(() => new URLSearchParams(window.location.search).get('checkout') || '', [])
  const accountPlanLabel = !isAuthenticated ? 'Log in to view plan' : billingLoading ? 'Checking...' : isProPlan ? 'BeatDrop Pro' : 'Free'
  const studioEyebrow = isProPlan ? 'BeatDrop Pro Studio' : 'Free Plan Studio'
  const studioHeading = isProPlan
    ? 'Upload, refine, and publish with the full Pro workflow in one place.'
    : 'Upload and publish the essentials without leaving the workspace.'
  const studioDescription = isProPlan
    ? 'Pro includes auto-detected metadata, reusable presets, upload scheduling, and faster publishing from the same studio.'
    : 'Free includes MP3 upload, cover upload, manual title and description entry, and YouTube publishing. Upgrade when you want auto-detected metadata, reusable presets, and upload scheduling.'
  const effectiveDetails = isProPlan
    ? details
    : { ...details, schedulePublish: false, publishAt: '' }

  useEffect(() => {
    const syncRoute = () => setRoute(getRouteFromHash(window.location.hash))
    window.addEventListener('hashchange', syncRoute)
    return () => window.removeEventListener('hashchange', syncRoute)
  }, [])

  useEffect(() => {
    if (route !== 'landing') return

    const targetId = window.location.hash.replace('#', '')
    if (!targetId || targetId === 'home') {
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }

    const frame = window.requestAnimationFrame(() => {
      document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })

    return () => window.cancelAnimationFrame(frame)
  }, [route])

  const navigateToHash = (hash) => (event) => {
    event.preventDefault()
    if (window.location.hash !== hash) {
      window.location.hash = hash
      return
    }

    setRoute(getRouteFromHash(hash))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  useEffect(() => {
    if (!audioFile || !isProPlan) return

    let cancelled = false
    const runDetection = async () => {
      const [nextBpm, nextKey] = await Promise.all([detectBPM(audioFile), detectKey(audioFile)])

      if (!cancelled) {
        if (nextBpm) {
          setBpm(String(nextBpm))
        }
        setMusicalKey(nextKey || 'Unknown')
      }
    }

    runDetection()
    return () => {
      cancelled = true
    }
  }, [audioFile, detectBPM, detectKey, isProPlan])

  useEffect(() => {
    if (checkoutState !== 'success' || !accountUser?.email) return
    refreshSubscription().catch(() => {})
  }, [accountUser, checkoutState, refreshSubscription])

  const baseTitle = useMemo(() => {
    if (!audioFile) return 'Untitled Beat'
    return audioFile.name.replace(/\.[^/.]+$/, '')
  }, [audioFile])

  const handleApplyPreset = (preset) => {
    if (!preset) return

    setSelectedPresetId(preset.id || '')
    setDetails((prev) => ({
      ...prev,
      title: applyTemplate(preset.titleTemplate, {
        title: baseTitle,
        bpm,
        key: musicalKey,
      }),
      description: applyTemplate(preset.descriptionTemplate, {
        title: baseTitle,
        bpm,
        key: musicalKey,
      }),
      tags: preset.tags || '',
      visibility: isProPlan && prev.schedulePublish ? 'private' : preset.visibility || DEFAULT_UPLOAD_DETAILS.visibility,
    }))
  }

  const handlePresetSelection = (presetId) => {
    setSelectedPresetId(presetId)

    if (!presetId) return

    const preset = presets.find((item) => item.id === presetId)
    if (preset) {
      handleApplyPreset(preset)
    }
  }

  const handleCoverImageChange = (file) => {
    setSourceImageFile(file || null)
    setImageFile(file || null)
    setCoverCropSettings(DEFAULT_COVER_CROP)
  }

  const handleAuthFieldChange = (key, value) => {
    setAuthFormError('')
    setAuthForm((prev) => ({ ...prev, [key]: value }))
  }

  const handleAuthSubmit = async (event) => {
    event.preventDefault()

    setAuthFormError('')

    try {
      if (authMode === 'signup') {
        const passwordError = getSignupPasswordError(authForm.password)
        if (passwordError) {
          setAuthFormError(passwordError)
          return
        }

        await signup(authForm)
      } else {
        await loginAccount({
          email: authForm.email,
          password: authForm.password,
        })
      }

      setAuthForm({
        name: '',
        email: '',
        password: '',
      })
      window.location.hash = '#studio'
    } catch {
      // Error state is handled by the auth hook.
    }
  }

  const handleGoogleLogin = async (credential) => {
    setAuthFormError('')

    try {
      await googleLogin({ credential })
      window.location.hash = '#studio'
    } catch {
      // Error state is handled by the auth hook.
    }
  }

  const handleUpgradePrimaryAction = async () => {
    if (!isAuthenticated) {
      window.location.hash = '#login'
      return
    }

    if (isProPlan) {
      await openBillingPortal().catch(() => {})
      return
    }

    await startCheckout().catch(() => {})
  }

  if (route === 'studio') {
    return (
      <MotionMain
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="min-h-screen bg-[#0a0a0a] text-white"
      >
        <div className="sticky top-0 z-40 border-b border-white/8 bg-[#0a0a0a]/82 backdrop-blur-xl">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 md:px-8">
            <a href="#home" className="inline-flex items-center">
              <BrandMark isPro={isProPlan} size="large" />
            </a>
            <div className="flex items-center gap-3">
              {isAuthenticated ? (
                <button
                  type="button"
                  onClick={logoutAccount}
                  className="hidden text-sm font-medium text-white/70 transition hover:text-white md:block"
                >
                  Log Out
                </button>
              ) : (
                <a
                  href="#login"
                  onClick={navigateToHash('#login')}
                  className="hidden text-sm font-medium text-white/70 transition hover:text-white md:block"
                >
                  Login
                </a>
              )}
              <a
                href="#upgrade"
                onClick={navigateToHash('#upgrade')}
                className="hidden text-sm font-medium text-white/70 transition hover:text-white md:block"
              >
                Upgrade
              </a>
              <a href="#faq" className="hidden text-sm font-medium text-white/70 transition hover:text-white md:block">
                FAQ
              </a>
              <a
                href="#privacy"
                onClick={navigateToHash('#privacy')}
                className="hidden text-sm font-medium text-white/70 transition hover:text-white md:block"
              >
                Privacy
              </a>
              <a
                href="#terms"
                onClick={navigateToHash('#terms')}
                className="hidden text-sm font-medium text-white/70 transition hover:text-white md:block"
              >
                Terms
              </a>
              <a href="#contact" className="hidden text-sm font-medium text-white/70 transition hover:text-white md:block">
                Contact
              </a>
              <a
                href="#home"
                className="rounded-full border border-white/20 bg-[#f3f3f3] px-5 py-2.5 text-sm font-semibold shadow-[inset_0_0_0_1px_rgba(0,0,0,0.08)] transition hover:bg-white"
                style={{ color: '#0a0a0a' }}
              >
                Back
              </a>
            </div>
          </div>
        </div>

        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-8 md:px-8 md:py-10">
          <MotionSection
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className={`${studioPanelClass} p-6 md:p-8`}
          >
            <div className="flex flex-col gap-4 border-b border-white/8 pb-5 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.24em] text-white/45">{studioEyebrow}</p>
                <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-white md:text-4xl">
                  {studioHeading}
                </h1>
              </div>
              <p className="max-w-2xl text-sm leading-7 text-white/60 md:text-base">{studioDescription}</p>
            </div>

            <div className="mt-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="space-y-1">
                <p className="text-sm text-white/55">
                  Account:{' '}
                  <span className="font-semibold text-white">
                    {authLoading ? 'Checking...' : accountUser?.email || 'Not logged in'}
                  </span>
                </p>
                <p className="text-sm text-white/55">
                  Current plan: <span className="font-semibold text-white">{accountPlanLabel}</span>
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                {isAuthenticated ? (
                  <button
                    onClick={logoutAccount}
                    className="inline-flex items-center justify-center rounded-full border border-white/12 bg-transparent px-5 py-3 text-sm font-semibold text-white transition hover:border-white/24 hover:bg-white/4"
                  >
                    Log Out
                  </button>
                ) : (
                  <a
                    href="#login"
                    onClick={navigateToHash('#login')}
                    className="inline-flex items-center justify-center rounded-full border border-white/12 bg-transparent px-5 py-3 text-sm font-semibold text-white transition hover:border-white/24 hover:bg-white/4"
                  >
                    Log In / Sign Up
                  </a>
                )}
                <a
                  href="#upgrade"
                  onClick={navigateToHash('#upgrade')}
                  className="inline-flex items-center justify-center rounded-full border border-white/12 bg-transparent px-5 py-3 text-sm font-semibold text-white transition hover:border-white/24 hover:bg-white/4"
                >
                  See Upgrade Options
                </a>
              </div>
            </div>
          </MotionSection>

          <div className="grid gap-4">
            <Header
              token={youtubeToken}
              userInfo={youtubeUserInfo}
              ready={youtubeReady}
              login={loginYouTube}
              logout={logoutYouTube}
            />
            {!isAuthenticated ? (
              <MotionSection
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className={studioPanelClass}
              >
                <p className="text-xs font-medium uppercase tracking-[0.24em] text-white/45">Account Required</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-white">
                  Log in before accessing the studio tools.
                </h2>
                <p className="mt-3 max-w-3xl text-sm leading-7 text-white/60">
                  Your BeatDrop account is the source of truth for Stripe billing and Pro access. After you log in,
                  the studio unlocks and your plan is verified from the account email tied to Stripe.
                </p>
                <div className="mt-5 flex flex-wrap gap-3">
                  <a
                    href="#login"
                    onClick={navigateToHash('#login')}
                    className="inline-flex items-center justify-center rounded-full bg-[#f3f3f3] px-5 py-3 text-sm font-semibold transition hover:bg-white"
                    style={{ color: '#0a0a0a' }}
                  >
                    Log In / Sign Up
                  </a>
                  <a
                    href="#upgrade"
                    onClick={navigateToHash('#upgrade')}
                    className="inline-flex items-center justify-center rounded-full border border-white/12 bg-transparent px-5 py-3 text-sm font-semibold text-white transition hover:border-white/24 hover:bg-white/4"
                  >
                    View Plans
                  </a>
                </div>
              </MotionSection>
            ) : (
              <>
                <UploadZone
                  audioFile={audioFile}
                  sourceImageFile={sourceImageFile}
                  imageFile={imageFile}
                  cropSettings={coverCropSettings}
                  isProPlan={isProPlan}
                  bpm={bpm}
                  musicalKey={musicalKey}
                  bpmLoading={bpmLoading}
                  keyLoading={keyLoading}
                  onBpmChange={setBpm}
                  onMusicalKeyChange={setMusicalKey}
                  onAudioFileChange={setAudioFile}
                  onImageFileChange={handleCoverImageChange}
                />
                {sourceImageFile && (
                  <CoverCropPanel
                    sourceImageFile={sourceImageFile}
                    imageFile={imageFile}
                    cropSettings={coverCropSettings}
                    onCropSettingsChange={setCoverCropSettings}
                    onImageFileChange={setImageFile}
                    onResetToSource={() => {
                      setCoverCropSettings(DEFAULT_COVER_CROP)
                      setImageFile(sourceImageFile)
                    }}
                  />
                )}
                <VideoDetailsForm
                  details={effectiveDetails}
                  setDetails={setDetails}
                  presets={presets}
                  selectedPresetId={selectedPresetId}
                  onPresetSelect={handlePresetSelection}
                  presetLocked={!isProPlan}
                  scheduleLocked={!isProPlan}
                  proActive={isProPlan}
                />
                <PresetsPanel
                  presets={presets}
                  setPresets={setPresets}
                  selectedPresetId={selectedPresetId}
                  onSelectedPresetChange={handlePresetSelection}
                  onApplyPreset={handleApplyPreset}
                  locked={!isProPlan}
                  proActive={isProPlan}
                />
                <ConvertUploadPanel
                  audioFile={audioFile}
                  sourceImageFile={sourceImageFile}
                  imageFile={imageFile}
                  cropSettings={coverCropSettings}
                  token={youtubeToken}
                  ensureValidToken={ensureValidYouTubeToken}
                  details={effectiveDetails}
                />
              </>
            )}
          </div>
        </div>
      </MotionMain>
    )
  }

  if (route === 'upgrade') {
    return (
      <MotionMain
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="min-h-screen bg-[#0a0a0a] text-white"
      >
        <div className="sticky top-0 z-40 border-b border-white/8 bg-[#0a0a0a]/82 backdrop-blur-xl">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 md:px-8">
            <a href="#home" className="inline-flex items-center">
              <BrandMark isPro={isProPlan} size="large" />
            </a>
            <div className="flex items-center gap-3">
              {isAuthenticated ? (
                <button
                  type="button"
                  onClick={logoutAccount}
                  className="hidden text-sm font-medium text-white/70 transition hover:text-white md:block"
                >
                  Log Out
                </button>
              ) : (
                <a
                  href="#login"
                  onClick={navigateToHash('#login')}
                  className="hidden text-sm font-medium text-white/70 transition hover:text-white md:block"
                >
                  Login
                </a>
              )}
              <a href="#faq" className="hidden text-sm font-medium text-white/70 transition hover:text-white md:block">
                FAQ
              </a>
              <a
                href="#privacy"
                onClick={navigateToHash('#privacy')}
                className="hidden text-sm font-medium text-white/70 transition hover:text-white md:block"
              >
                Privacy
              </a>
              <a href="#contact" className="hidden text-sm font-medium text-white/70 transition hover:text-white md:block">
                Contact
              </a>
              <a
                href="#studio"
                className="rounded-full border border-white/20 bg-[#f3f3f3] px-5 py-2.5 text-sm font-semibold shadow-[inset_0_0_0_1px_rgba(0,0,0,0.08)] transition hover:bg-white"
                style={{ color: '#0a0a0a' }}
              >
                Open Studio
              </a>
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden border-b border-white/6">
          <div className="absolute inset-0 bg-[#0a0a0a]" />
          <motion.div
            aria-hidden="true"
            className="absolute inset-0 opacity-70"
            animate={{ scale: [1, 1.08, 1], x: [0, 30, -20, 0], y: [0, -20, 15, 0] }}
            transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
            style={{
              background:
                'radial-gradient(circle at 20% 22%, rgba(34,197,94,0.18), transparent 32%), radial-gradient(circle at 78% 24%, rgba(251,191,36,0.16), transparent 28%), radial-gradient(circle at 52% 78%, rgba(244,114,182,0.14), transparent 34%)',
            }}
          />
          <div aria-hidden="true" className="absolute inset-0 opacity-[0.11]" style={noiseStyle} />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(10,10,10,0.18)_0%,rgba(10,10,10,0.44)_58%,rgba(10,10,10,0.84)_100%)]" />

          <div className="relative z-10 mx-auto max-w-7xl px-4 py-24 md:px-8 md:py-28">
            <div className="max-w-4xl">
              <span className="inline-flex rounded-full border border-white/12 bg-white/4 px-4 py-1.5 text-sm font-medium uppercase tracking-[0.24em] text-white/70">
                Compare plans
              </span>
              <h1 className="mt-8 text-5xl font-extrabold leading-[0.94] tracking-[-0.06em] text-white md:text-7xl">
                Upgrade to BeatDrop Pro for faster uploads, cleaner workflows, and repeatable releases.
              </h1>
              <p className="mt-7 max-w-3xl text-lg leading-9 text-white/70 md:text-xl">
                BeatDrop Pro is $9.99/month and built for producers who want to move from raw files to polished
                YouTube uploads with less manual setup every single time.
              </p>

              <div className="mt-12 flex flex-col gap-4 sm:flex-row">
                <a
                  href="#studio"
                  className="inline-flex items-center justify-center rounded-full bg-[#f3f3f3] px-7 py-4 text-base font-semibold shadow-[inset_0_0_0_1px_rgba(0,0,0,0.08)] transition hover:bg-white"
                  style={{ color: '#0a0a0a' }}
                >
                  Open Free Studio
                </a>
                <button
                  onClick={handleUpgradePrimaryAction}
                  disabled={
                    (isAuthenticated && !billingConfig.configured) ||
                    billingLoading ||
                    billingActionLoading === 'checkout' ||
                    billingActionLoading === 'portal'
                  }
                  className="inline-flex items-center justify-center rounded-full border border-white/18 bg-transparent px-7 py-4 text-base font-semibold text-white transition hover:border-white/30 hover:bg-white/4 disabled:cursor-not-allowed disabled:opacity-55"
                >
                  {!isAuthenticated
                    ? 'Sign Up / Login for Pro'
                    : isProPlan
                      ? billingActionLoading === 'portal'
                        ? 'Opening Plan Settings...'
                        : 'Manage Pro Plan'
                      : billingActionLoading === 'checkout'
                        ? 'Starting Checkout...'
                        : 'Start Pro for $9.99/mo'}
                </button>
              </div>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <div className="rounded-full border border-[#d4b15a]/25 bg-[rgba(212,177,90,0.10)] px-4 py-2 text-sm font-semibold text-[#f3d58f]">
                  $9.99/month
                </div>
                <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/72">
                  Cancel anytime
                </div>
                <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/72">
                  Keep the core upload flow free
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-4 py-8 md:px-8 md:py-10">
          <MotionSection
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.18 }}
            transition={{ duration: 0.55 }}
            className="rounded-[36px] border border-white/8 bg-[#111111] p-8 shadow-[0_24px_80px_rgba(0,0,0,0.38)] md:p-10"
          >
            <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
              <div>
                <p className="text-sm font-medium uppercase tracking-[0.24em] text-white/45">Why Upgrade</p>
                <h2 className="mt-4 text-4xl font-semibold tracking-[-0.05em] text-white md:text-5xl">
                  The paid plan is built to save time on every release.
                </h2>
                <p className="mt-4 max-w-2xl text-base leading-8 text-white/58 md:text-lg">
                  BeatDrop Pro keeps the free workflow intact and adds the automation that matters most when you are
                  publishing often: faster metadata prep, reusable presets, and upload scheduling.
                </p>

                <div className="mt-6 grid gap-3">
                  <div className="rounded-3xl border border-white/8 bg-[#0d0d0f] px-4 py-4 text-sm text-white/80">
                    Auto-detect BPM and key instead of typing them by hand.
                  </div>
                  <div className="rounded-3xl border border-white/8 bg-[#0d0d0f] px-4 py-4 text-sm text-white/80">
                    Save presets for titles, descriptions, tags, and defaults so repeat uploads stay consistent.
                  </div>
                  <div className="rounded-3xl border border-white/8 bg-[#0d0d0f] px-4 py-4 text-sm text-white/80">
                    Schedule uploads ahead of time without leaving the studio.
                  </div>
                </div>
              </div>

              <div
                className={`rounded-[32px] p-6 ${
                  isProPlan
                    ? 'border border-[#d4b15a]/22 bg-[linear-gradient(180deg,rgba(212,177,90,0.14)_0%,rgba(255,255,255,0.04)_100%)] shadow-[0_24px_80px_rgba(0,0,0,0.24),0_0_40px_rgba(212,177,90,0.10)]'
                    : 'border border-[#d4b15a]/18 bg-[linear-gradient(180deg,rgba(212,177,90,0.10)_0%,rgba(255,255,255,0.03)_100%)] shadow-[0_24px_80px_rgba(0,0,0,0.24),0_0_30px_rgba(212,177,90,0.08)]'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium uppercase tracking-[0.24em] text-[#f3d58f]">BeatDrop Pro</p>
                    <h3 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-white">$9.99/month</h3>
                  </div>
                  <span className="rounded-full border border-[#d4b15a]/25 bg-[rgba(212,177,90,0.10)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#f3d58f]">
                    {isProPlan ? 'Active' : 'Most Popular'}
                  </span>
                </div>

                <p className="mt-4 text-sm leading-7 text-white/68 md:text-base">
                  Built for producers who want faster turnaround, cleaner repeat uploads, and a more premium release
                  workflow without juggling extra tools.
                </p>

                <div className="mt-6 grid gap-3">
                  <div className="rounded-3xl border border-[#d4b15a]/16 bg-[linear-gradient(180deg,rgba(212,177,90,0.08)_0%,rgba(13,13,15,0.94)_100%)] px-4 py-3 text-sm text-white/82">
                    Faster metadata setup for every track
                  </div>
                  <div className="rounded-3xl border border-[#d4b15a]/16 bg-[linear-gradient(180deg,rgba(212,177,90,0.08)_0%,rgba(13,13,15,0.94)_100%)] px-4 py-3 text-sm text-white/82">
                    Cleaner repeat uploads with scheduling and saved defaults
                  </div>
                  <div className="rounded-3xl border border-[#d4b15a]/16 bg-[linear-gradient(180deg,rgba(212,177,90,0.08)_0%,rgba(13,13,15,0.94)_100%)] px-4 py-3 text-sm text-white/82">
                    Reusable publishing templates that cut down repeat work
                  </div>
                </div>

                <div className="mt-6 flex flex-wrap gap-2">
                  <button
                    onClick={handleUpgradePrimaryAction}
                    disabled={
                      (isAuthenticated && !billingConfig.configured) ||
                      billingLoading ||
                      billingActionLoading === 'checkout' ||
                      billingActionLoading === 'portal'
                    }
                    className="rounded-full bg-[#f3f3f3] px-5 py-3 text-sm font-semibold transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-55"
                    style={{ color: '#0a0a0a' }}
                  >
                    {!isAuthenticated
                      ? 'Sign Up / Login'
                      : isProPlan
                        ? billingActionLoading === 'portal'
                          ? 'Opening Plan Settings...'
                          : 'Manage Pro Plan'
                        : billingActionLoading === 'checkout'
                          ? 'Starting Checkout...'
                          : 'Start Pro for $9.99/mo'}
                  </button>
                  <a
                    href="#studio"
                    className="rounded-full border border-white/12 bg-transparent px-5 py-3 text-sm font-medium text-white transition hover:border-white/24 hover:bg-white/4"
                  >
                    Keep Using Free
                  </a>
                </div>

                {(checkoutState || billingError || !billingConfig.configured) && (
                  <div className={`mt-4 rounded-3xl border p-4 text-sm ${
                    checkoutState === 'success'
                      ? 'border-emerald-100 bg-emerald-50 text-emerald-700'
                      : checkoutState === 'canceled'
                        ? 'border-amber-100 bg-amber-50 text-amber-700'
                        : billingError
                          ? 'border-red-100 bg-red-50 text-red-700'
                          : 'border-white/8 bg-white/[0.03] text-white/72'
                  }`}>
                    {checkoutState === 'success' && 'Checkout completed. BeatDrop Pro access is syncing now.'}
                    {checkoutState === 'canceled' && 'Checkout was canceled before payment completed.'}
                    {!checkoutState && billingError && billingError}
                    {!checkoutState && !billingError && !billingConfig.configured && 'Upgrade checkout is temporarily unavailable.'}
                  </div>
                )}
              </div>
            </div>
          </MotionSection>

          <MotionSection
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.18 }}
            transition={{ duration: 0.55 }}
            className="mt-6 rounded-[36px] border border-white/8 bg-[#111111] p-8 shadow-[0_24px_80px_rgba(0,0,0,0.38)] md:mt-8 md:p-10"
          >
            <div className="max-w-3xl">
              <p className="text-sm font-medium uppercase tracking-[0.24em] text-white/45">Compare Plans</p>
              <h2 className="mt-2 text-4xl font-semibold tracking-[-0.05em] text-white md:text-5xl">
                Clear separation between free publishing and paid automation.
              </h2>
            </div>

            <div className="mt-10 grid gap-5 lg:grid-cols-2">
              <div className="rounded-[32px] border border-white/8 bg-white/[0.03] p-6">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium uppercase tracking-[0.24em] text-white/45">Free</p>
                    <h3 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-white">Core Upload Flow</h3>
                  </div>
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white">
                    Free
                  </span>
                </div>
                <p className="mt-4 text-sm leading-7 text-white/60 md:text-base">
                  Best for manual uploads when you want the essential BeatDrop workflow without subscription-only
                  automation.
                </p>
                <div className="mt-6 grid gap-3">
                  {FREE_PLAN_FEATURES.map((feature) => (
                    <div key={feature} className="rounded-3xl border border-white/8 bg-[#0d0d0f] px-4 py-3 text-sm text-white/80">
                      {feature}
                    </div>
                  ))}
                </div>
              </div>

              <div
                className={`rounded-[32px] p-6 ${
                  isProPlan
                    ? 'border border-[#d4b15a]/22 bg-[linear-gradient(180deg,rgba(212,177,90,0.12)_0%,rgba(255,255,255,0.04)_100%)] shadow-[0_24px_80px_rgba(0,0,0,0.24),0_0_40px_rgba(212,177,90,0.10)]'
                    : 'border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.09)_0%,rgba(255,255,255,0.04)_100%)] shadow-[0_24px_80px_rgba(0,0,0,0.24)]'
                }`}
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium uppercase tracking-[0.24em] text-white/45">Subscription</p>
                    <h3 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-white">BeatDrop Pro</h3>
                    <p className="mt-2 text-lg font-semibold text-[#f3d58f]">$9.99/month</p>
                  </div>
                  <span className="rounded-full border border-white/14 bg-white/8 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white">
                    Paid
                  </span>
                </div>
                <p className="mt-4 text-sm leading-7 text-white/60 md:text-base">
                  Built for repeat releases where metadata automation and saved presets reduce setup time on every
                  upload.
                </p>
                <div className="mt-6 grid gap-3">
                  {PRO_PLAN_FEATURES.map((feature) => (
                    <div
                      key={feature}
                      className={`flex items-center gap-2 rounded-3xl px-4 py-3 text-sm text-white/80 ${
                        isProPlan
                          ? 'border border-[#d4b15a]/16 bg-[linear-gradient(180deg,rgba(212,177,90,0.08)_0%,rgba(13,13,15,0.94)_100%)] shadow-[0_10px_28px_rgba(212,177,90,0.07)]'
                          : 'border border-white/8 bg-[#0d0d0f]'
                      }`}
                    >
                      <PremiumStar />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </MotionSection>

          <MotionSection
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.18 }}
            transition={{ duration: 0.55 }}
            className="mt-6 rounded-[36px] border border-white/8 bg-[#111111] p-8 shadow-[0_24px_80px_rgba(0,0,0,0.38)] md:mt-8 md:p-10"
          >
            <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-start">
              <div>
                <p className="text-sm font-medium uppercase tracking-[0.24em] text-white/45">What You Unlock</p>
                <h2 className="mt-4 text-4xl font-semibold tracking-[-0.05em] text-white md:text-5xl">
                  Paid features focused on metadata speed.
                </h2>
                <p className="mt-4 max-w-2xl text-base leading-8 text-white/58 md:text-lg">
                  The upgrade is intentionally narrow. It does not move the basic upload flow behind a paywall. It
                  adds the time-saving pieces that matter most for frequent publishers.
                </p>
              </div>

              <div
                className={`rounded-[28px] p-5 ${
                  isProPlan
                    ? 'border border-[#d4b15a]/20 bg-[linear-gradient(180deg,rgba(212,177,90,0.08)_0%,rgba(255,255,255,0.03)_100%)] shadow-[0_16px_40px_rgba(212,177,90,0.08)]'
                    : 'border border-white/8 bg-white/[0.03]'
                }`}
              >
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-white/45">Premium Tools</p>
                <div className="mt-4 grid gap-3">
                  <div
                    className={`rounded-3xl p-4 ${
                      isProPlan
                        ? 'border border-[#d4b15a]/16 bg-[linear-gradient(180deg,rgba(212,177,90,0.08)_0%,rgba(13,13,15,0.94)_100%)] shadow-[0_10px_28px_rgba(212,177,90,0.07)]'
                        : 'border border-white/8 bg-[#0d0d0f]'
                    }`}
                  >
                    <p className="flex items-center gap-2 text-sm font-semibold text-white">
                      <PremiumStar />
                      <span>Auto-detected metadata</span>
                    </p>
                    <p className="mt-2 text-sm leading-7 text-white/60">
                      Detect BPM and musical key automatically after you drop in an MP3.
                    </p>
                  </div>
                  <div
                    className={`rounded-3xl p-4 ${
                      isProPlan
                        ? 'border border-[#d4b15a]/16 bg-[linear-gradient(180deg,rgba(212,177,90,0.08)_0%,rgba(13,13,15,0.94)_100%)] shadow-[0_10px_28px_rgba(212,177,90,0.07)]'
                        : 'border border-white/8 bg-[#0d0d0f]'
                    }`}
                  >
                    <p className="flex items-center gap-2 text-sm font-semibold text-white">
                      <PremiumStar />
                      <span>Reusable presets</span>
                    </p>
                    <p className="mt-2 text-sm leading-7 text-white/60">
                      Save templates for repeat titles, descriptions, tags, and preferred upload defaults.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </MotionSection>
        </div>
      </MotionMain>
    )
  }

  if (route === 'login') {
    return (
      <MotionMain
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="min-h-screen bg-[#0a0a0a] text-white"
      >
        <div className="sticky top-0 z-40 border-b border-white/8 bg-[#0a0a0a]/82 backdrop-blur-xl">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 md:px-8">
            <a href="#home" className="inline-flex items-center">
              <BrandMark isPro={isProPlan} size="large" />
            </a>
            <div className="flex items-center gap-3">
              <a
                href="#upgrade"
                onClick={navigateToHash('#upgrade')}
                className="hidden text-sm font-medium text-white/70 transition hover:text-white md:block"
              >
                Upgrade
              </a>
              <a
                href="#studio"
                onClick={navigateToHash('#studio')}
                className="hidden text-sm font-medium text-white/70 transition hover:text-white md:block"
              >
                Studio
              </a>
              <a
                href="#terms"
                onClick={navigateToHash('#terms')}
                className="hidden text-sm font-medium text-white/70 transition hover:text-white md:block"
              >
                Terms
              </a>
              <a
                href="#home"
                onClick={navigateToHash('#home')}
                className="rounded-full border border-white/20 bg-[#f3f3f3] px-5 py-2.5 text-sm font-semibold shadow-[inset_0_0_0_1px_rgba(0,0,0,0.08)] transition hover:bg-white"
                style={{ color: '#0a0a0a' }}
              >
                Back
              </a>
            </div>
          </div>
        </div>

        <div className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-20 md:px-8 md:py-24">
          <MotionSection
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="rounded-[36px] border border-white/8 bg-[#111111] p-8 shadow-[0_24px_80px_rgba(0,0,0,0.38)] md:p-10"
          >
            <div className="max-w-3xl">
              <p className="text-sm font-medium uppercase tracking-[0.24em] text-white/45">Sign Up / Login</p>
              <h1 className="mt-4 text-4xl font-semibold tracking-[-0.05em] text-white md:text-5xl">
                Create your BeatDrop account.
              </h1>
              <p className="mt-4 text-base leading-8 text-white/58 md:text-lg">
                Your BeatDrop account controls studio access, Stripe billing, and whether your subscription is Free or
                Pro. You can connect YouTube separately once you are inside the studio.
              </p>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.985 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.45, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
              className="mt-8 rounded-[28px] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.05)_0%,rgba(255,255,255,0.025)_100%)] p-6 shadow-[0_16px_40px_rgba(0,0,0,0.18)]"
            >
              {isAuthenticated ? (
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-white">You are logged in</p>
                    <p className="mt-2 text-sm leading-7 text-white/60">
                      Signed in as {accountUser?.name || accountUser?.email || 'your BeatDrop account'}.
                    </p>
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <a
                      href="#studio"
                      onClick={navigateToHash('#studio')}
                      className="inline-flex items-center justify-center rounded-full bg-[#f3f3f3] px-6 py-3 text-sm font-semibold transition hover:bg-white"
                      style={{ color: '#0a0a0a' }}
                    >
                      Open Studio
                    </a>
                    <motion.button
                      onClick={logoutAccount}
                      className="rounded-full border border-white/12 bg-transparent px-6 py-3 text-sm font-medium text-white transition hover:border-white/24 hover:bg-white/4"
                      whileHover={{ y: -2 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      Log Out
                    </motion.button>
                  </div>
                </div>
              ) : (
                <div className="grid gap-6 lg:grid-cols-[0.88fr_1.12fr] lg:items-start">
                  <div>
                    <div className="inline-flex rounded-full border border-white/10 bg-white/5 p-1">
                      <button
                        onClick={() => {
                          setAuthMode('login')
                          setShowPassword(false)
                          setAuthFormError('')
                        }}
                        type="button"
                        className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                          authMode === 'login' ? 'bg-[#f3f3f3] text-[#0a0a0a]' : 'text-white/72 hover:text-white'
                        }`}
                      >
                        Log In
                      </button>
                      <button
                        onClick={() => {
                          setAuthMode('signup')
                          setShowPassword(false)
                          setAuthFormError('')
                        }}
                        type="button"
                        className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                          authMode === 'signup' ? 'bg-[#f3f3f3] text-[#0a0a0a]' : 'text-white/72 hover:text-white'
                        }`}
                      >
                        Sign Up
                      </button>
                    </div>
                    <p className="mt-5 text-sm font-semibold text-white">
                      {authMode === 'signup' ? 'Set up your account' : 'Welcome back'}
                    </p>
                    <p className="mt-2 text-sm leading-7 text-white/60">
                      {authMode === 'signup'
                        ? 'Create an account first, then connect Stripe and YouTube from the right places in the workflow.'
                        : 'Log in with your BeatDrop account to unlock the studio and load your Stripe-linked plan.'}
                    </p>
                    <div className="mt-5 space-y-3 rounded-3xl border border-white/8 bg-[#0d0d0f] p-4 text-sm text-white/72">
                      <p>Studio tools require a BeatDrop login.</p>
                      <p>Stripe checks Pro access against your account email.</p>
                      <p>YouTube publishing stays separate and can be connected inside Studio.</p>
                    </div>
                    <p className="mt-4 text-xs leading-6 text-white/45">
                      By continuing, you agree to BeatDrop&apos;s{' '}
                      <a href="#terms" onClick={navigateToHash('#terms')} className="text-white underline">
                        Terms of Service
                      </a>{' '}
                      and{' '}
                      <a href="#privacy" onClick={navigateToHash('#privacy')} className="text-white underline">
                        Privacy Policy
                      </a>
                      .
                    </p>

                    <div className="mt-5 rounded-3xl border border-white/8 bg-[#0d0d0f] p-4">
                      <p className="text-xs font-medium uppercase tracking-[0.18em] text-white/45">Google Sign-In</p>
                      <p className="mt-2 text-sm leading-7 text-white/60">
                        Use your Google account as a BeatDrop login option. We&apos;ll still create a normal BeatDrop
                        session for billing and studio access.
                      </p>
                      <div className="mt-4">
                        <GoogleSignInButton
                          mode={authMode}
                          disabled={authLoading || Boolean(authActionLoading)}
                          onCredential={handleGoogleLogin}
                          onError={(error) => {
                            setAuthFormError(error?.message || 'Google Sign-In failed.')
                          }}
                        />
                      </div>
                    </div>
                  </div>
                  <form onSubmit={handleAuthSubmit} className="grid gap-3">
                    {authMode === 'signup' && (
                      <input
                        value={authForm.name}
                        onChange={(event) => handleAuthFieldChange('name', event.target.value)}
                        placeholder="Display name"
                        className="rounded-2xl border border-white/10 bg-[#0d0d0f] px-4 py-3 text-sm text-white outline-none transition focus:border-white/24"
                      />
                    )}
                    <input
                      type="email"
                      value={authForm.email}
                      onChange={(event) => handleAuthFieldChange('email', event.target.value)}
                      placeholder="Email address"
                      className="rounded-2xl border border-white/10 bg-[#0d0d0f] px-4 py-3 text-sm text-white outline-none transition focus:border-white/24"
                    />
                    <div className="rounded-2xl border border-white/10 bg-[#0d0d0f] px-2 py-2 transition focus-within:border-white/24">
                      <div className="flex items-center gap-2">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={authForm.password}
                          onChange={(event) => handleAuthFieldChange('password', event.target.value)}
                          placeholder="Password"
                          className="w-full bg-transparent px-2 py-1 text-sm text-white outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((prev) => !prev)}
                          className="rounded-full border border-white/10 px-3 py-1.5 text-xs font-medium text-white/72 transition hover:border-white/24 hover:bg-white/4 hover:text-white"
                        >
                          {showPassword ? 'Hide' : 'Show'}
                        </button>
                      </div>
                    </div>

                    {authMode === 'signup' && (
                      <div className="rounded-2xl border border-white/8 bg-[#0d0d0f] px-4 py-3 text-sm text-white/72">
                        <p>Password requirements:</p>
                        <p className="mt-1">At least 8 characters, one capital letter, and one symbol.</p>
                      </div>
                    )}

                    {(authFormError || authError) && (
                      <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        {authFormError || authError}
                      </div>
                    )}

                    <div className="relative py-1">
                      <div className="absolute inset-x-0 top-1/2 border-t border-white/10" />
                      <span className="relative inline-flex bg-[linear-gradient(180deg,rgba(255,255,255,0.05)_0%,rgba(255,255,255,0.025)_100%)] pr-3 text-xs uppercase tracking-[0.18em] text-white/38">
                        Or continue with email
                      </span>
                    </div>

                    <motion.button
                      type="submit"
                      disabled={
                        authLoading ||
                        authActionLoading === 'login' ||
                        authActionLoading === 'signup' ||
                        authActionLoading === 'google'
                      }
                      className="inline-flex items-center justify-center rounded-full bg-[#f3f3f3] px-6 py-3 text-sm font-semibold transition-all duration-300 hover:bg-white hover:shadow-[0_12px_30px_rgba(243,243,243,0.18)] disabled:cursor-not-allowed disabled:opacity-55"
                      style={{ color: '#0a0a0a' }}
                      whileHover={{ y: -3, scale: 1.01 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      {authMode === 'signup'
                        ? authActionLoading === 'signup'
                          ? 'Creating Account...'
                          : 'Create Account'
                        : authActionLoading === 'login'
                          ? 'Logging In...'
                          : authActionLoading === 'google'
                            ? 'Signing In with Google...'
                          : 'Log In'}
                    </motion.button>
                  </form>
                </div>
              )}
            </motion.div>
          </MotionSection>
        </div>
      </MotionMain>
    )
  }

  if (route === 'terms') {
    return (
      <MotionMain
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="min-h-screen bg-[#0a0a0a] text-white"
      >
        <div className="sticky top-0 z-40 border-b border-white/8 bg-[#0a0a0a]/82 backdrop-blur-xl">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 md:px-8">
            <a href="#home" className="inline-flex items-center">
              <BrandMark isPro={isProPlan} size="large" />
            </a>
            <div className="flex items-center gap-3">
              <a
                href="#upgrade"
                onClick={navigateToHash('#upgrade')}
                className="hidden text-sm font-medium text-white/70 transition hover:text-white md:block"
              >
                Upgrade
              </a>
              <a
                href="#login"
                onClick={navigateToHash('#login')}
                className="hidden text-sm font-medium text-white/70 transition hover:text-white md:block"
              >
                Login
              </a>
              <a
                href="#studio"
                onClick={navigateToHash('#studio')}
                className="hidden text-sm font-medium text-white/70 transition hover:text-white md:block"
              >
                Studio
              </a>
              <a
                href="#privacy"
                onClick={navigateToHash('#privacy')}
                className="hidden text-sm font-medium text-white/70 transition hover:text-white md:block"
              >
                Privacy
              </a>
              <a
                href="#home"
                onClick={navigateToHash('#home')}
                className="rounded-full border border-white/20 bg-[#f3f3f3] px-5 py-2.5 text-sm font-semibold shadow-[inset_0_0_0_1px_rgba(0,0,0,0.08)] transition hover:bg-white"
                style={{ color: '#0a0a0a' }}
              >
                Back
              </a>
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden border-b border-white/6">
          <div className="absolute inset-0 bg-[#0a0a0a]" />
          <motion.div
            aria-hidden="true"
            className="absolute inset-0 opacity-70"
            animate={{ scale: [1, 1.08, 1], x: [0, 30, -20, 0], y: [0, -20, 15, 0] }}
            transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
            style={{
              background:
                'radial-gradient(circle at 18% 22%, rgba(34,197,94,0.18), transparent 30%), radial-gradient(circle at 78% 28%, rgba(245,158,11,0.16), transparent 32%), radial-gradient(circle at 50% 78%, rgba(244,114,182,0.14), transparent 34%)',
            }}
          />
          <div aria-hidden="true" className="absolute inset-0 opacity-[0.11]" style={noiseStyle} />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(10,10,10,0.20)_0%,rgba(10,10,10,0.46)_58%,rgba(10,10,10,0.82)_100%)]" />

          <div className="relative z-10 mx-auto max-w-7xl px-4 py-24 md:px-8 md:py-28">
            <div className="max-w-4xl">
              <span className="inline-flex rounded-full border border-white/12 bg-white/4 px-4 py-1.5 text-sm font-medium uppercase tracking-[0.24em] text-white/70">
                Terms of Service
              </span>
              <h1 className="mt-8 text-5xl font-extrabold leading-[0.94] tracking-[-0.06em] text-white md:text-7xl">
                The basic terms for using BeatDrop.
              </h1>
              <p className="mt-7 max-w-3xl text-lg leading-9 text-white/70 md:text-xl">
                Last updated {TERMS_LAST_UPDATED}. These terms cover account use, content responsibility,
                third-party integrations, billing, and general limits around the service.
              </p>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-5xl px-4 py-8 md:px-8 md:py-12">
          <MotionSection
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="rounded-[36px] border border-white/8 bg-[#111111] p-8 shadow-[0_24px_80px_rgba(0,0,0,0.38)] md:p-10"
          >
            <div className="grid gap-5">
              {TERMS_SECTIONS.map((section) => (
                <div key={section.title} className="rounded-[28px] border border-white/8 bg-white/[0.03] p-5 md:p-6">
                  <h2 className="text-2xl font-semibold tracking-[-0.04em] text-white">{section.title}</h2>
                  {section.body ? (
                    <p className="mt-3 text-sm leading-7 text-white/64 md:text-base">{section.body}</p>
                  ) : null}
                  {section.bullets.length > 0 ? (
                    <ul className="mt-4 grid gap-3 text-sm leading-7 text-white/72 md:text-base">
                      {section.bullets.map((item) => (
                        <li key={item} className="rounded-2xl border border-white/8 bg-[#0d0d0f] px-4 py-3">
                          {item}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-[28px] border border-[#d4b15a]/16 bg-[linear-gradient(180deg,rgba(212,177,90,0.12)_0%,rgba(212,177,90,0.03)_26%,rgba(255,255,255,0.02)_100%)] p-6 shadow-[0_18px_40px_rgba(0,0,0,0.24),0_0_26px_rgba(212,177,90,0.08)]">
              <p className="text-xs font-medium uppercase tracking-[0.24em] text-[#f3d58f]">Related Links</p>
              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <a
                  href="#privacy"
                  onClick={navigateToHash('#privacy')}
                  className="inline-flex items-center justify-center rounded-full border border-[#d4b15a]/28 bg-[rgba(212,177,90,0.10)] px-5 py-3 text-sm font-semibold text-[#f3d58f] transition hover:bg-[rgba(212,177,90,0.16)]"
                >
                  Privacy Policy
                </a>
                <a
                  href="https://policies.google.com/terms"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center rounded-full border border-[#d4b15a]/28 bg-[rgba(212,177,90,0.10)] px-5 py-3 text-sm font-semibold text-[#f3d58f] transition hover:bg-[rgba(212,177,90,0.16)]"
                >
                  Google Terms
                </a>
                <a
                  href="https://developers.google.com/youtube/terms/api-services-terms-of-service"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center rounded-full border border-[#d4b15a]/28 bg-[rgba(212,177,90,0.10)] px-5 py-3 text-sm font-semibold text-[#f3d58f] transition hover:bg-[rgba(212,177,90,0.16)]"
                >
                  YouTube API Terms
                </a>
              </div>
            </div>
          </MotionSection>
        </div>
      </MotionMain>
    )
  }

  if (route === 'privacy') {
    return (
      <MotionMain
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="min-h-screen bg-[#0a0a0a] text-white"
      >
        <div className="sticky top-0 z-40 border-b border-white/8 bg-[#0a0a0a]/82 backdrop-blur-xl">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 md:px-8">
            <a href="#home" className="inline-flex items-center">
              <BrandMark isPro={isProPlan} size="large" />
            </a>
            <div className="flex items-center gap-3">
              <a
                href="#upgrade"
                onClick={navigateToHash('#upgrade')}
                className="hidden text-sm font-medium text-white/70 transition hover:text-white md:block"
              >
                Upgrade
              </a>
              <a
                href="#login"
                onClick={navigateToHash('#login')}
                className="hidden text-sm font-medium text-white/70 transition hover:text-white md:block"
              >
                Login
              </a>
              <a
                href="#studio"
                onClick={navigateToHash('#studio')}
                className="hidden text-sm font-medium text-white/70 transition hover:text-white md:block"
              >
                Studio
              </a>
              <a
                href="#terms"
                onClick={navigateToHash('#terms')}
                className="hidden text-sm font-medium text-white/70 transition hover:text-white md:block"
              >
                Terms
              </a>
              <a
                href="#home"
                onClick={navigateToHash('#home')}
                className="rounded-full border border-white/20 bg-[#f3f3f3] px-5 py-2.5 text-sm font-semibold shadow-[inset_0_0_0_1px_rgba(0,0,0,0.08)] transition hover:bg-white"
                style={{ color: '#0a0a0a' }}
              >
                Back
              </a>
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden border-b border-white/6">
          <div className="absolute inset-0 bg-[#0a0a0a]" />
          <motion.div
            aria-hidden="true"
            className="absolute inset-0 opacity-70"
            animate={{ scale: [1, 1.08, 1], x: [0, 30, -20, 0], y: [0, -20, 15, 0] }}
            transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
            style={{
              background:
                'radial-gradient(circle at 18% 22%, rgba(34,197,94,0.18), transparent 30%), radial-gradient(circle at 78% 28%, rgba(245,158,11,0.16), transparent 32%), radial-gradient(circle at 50% 78%, rgba(244,114,182,0.14), transparent 34%)',
            }}
          />
          <div aria-hidden="true" className="absolute inset-0 opacity-[0.11]" style={noiseStyle} />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(10,10,10,0.20)_0%,rgba(10,10,10,0.46)_58%,rgba(10,10,10,0.82)_100%)]" />

          <div className="relative z-10 mx-auto max-w-7xl px-4 py-24 md:px-8 md:py-28">
            <div className="max-w-4xl">
              <span className="inline-flex rounded-full border border-white/12 bg-white/4 px-4 py-1.5 text-sm font-medium uppercase tracking-[0.24em] text-white/70">
                Privacy Policy
              </span>
              <h1 className="mt-8 text-5xl font-extrabold leading-[0.94] tracking-[-0.06em] text-white md:text-7xl">
                How BeatDrop handles account, billing, and YouTube upload data.
              </h1>
              <p className="mt-7 max-w-3xl text-lg leading-9 text-white/70 md:text-xl">
                Last updated {PRIVACY_LAST_UPDATED}. This Privacy Policy describes how BeatDrop collects, uses, and
                handles information across account access, billing, media preparation, and YouTube publishing.
              </p>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-5xl px-4 py-8 md:px-8 md:py-12">
          <MotionSection
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="rounded-[36px] border border-white/8 bg-[#111111] p-8 shadow-[0_24px_80px_rgba(0,0,0,0.38)] md:p-10"
          >
            <div className="grid gap-5">
              {PRIVACY_SECTIONS.map((section) => (
                <div key={section.title} className="rounded-[28px] border border-white/8 bg-white/[0.03] p-5 md:p-6">
                  <h2 className="text-2xl font-semibold tracking-[-0.04em] text-white">{section.title}</h2>
                  {section.body ? (
                    <p className="mt-3 text-sm leading-7 text-white/64 md:text-base">{section.body}</p>
                  ) : null}
                  {section.bullets.length > 0 ? (
                    <ul className="mt-4 grid gap-3 text-sm leading-7 text-white/72 md:text-base">
                      {section.bullets.map((item) => (
                        <li key={item} className="rounded-2xl border border-white/8 bg-[#0d0d0f] px-4 py-3">
                          {item}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-[28px] border border-[#d4b15a]/16 bg-[linear-gradient(180deg,rgba(212,177,90,0.12)_0%,rgba(212,177,90,0.03)_26%,rgba(255,255,255,0.02)_100%)] p-6 shadow-[0_18px_40px_rgba(0,0,0,0.24),0_0_26px_rgba(212,177,90,0.08)]">
              <p className="text-xs font-medium uppercase tracking-[0.24em] text-[#f3d58f]">Important Links</p>
              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <a
                  href="https://policies.google.com/privacy"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center rounded-full border border-[#d4b15a]/28 bg-[rgba(212,177,90,0.10)] px-5 py-3 text-sm font-semibold text-[#f3d58f] transition hover:bg-[rgba(212,177,90,0.16)]"
                >
                  Google Privacy Policy
                </a>
                <a
                  href="https://myaccount.google.com/permissions"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center rounded-full border border-[#d4b15a]/28 bg-[rgba(212,177,90,0.10)] px-5 py-3 text-sm font-semibold text-[#f3d58f] transition hover:bg-[rgba(212,177,90,0.16)]"
                >
                  Manage Google Access
                </a>
                <a
                  href="https://developers.google.com/youtube/terms/api-services-terms-of-service"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center rounded-full border border-[#d4b15a]/28 bg-[rgba(212,177,90,0.10)] px-5 py-3 text-sm font-semibold text-[#f3d58f] transition hover:bg-[rgba(212,177,90,0.16)]"
                >
                  YouTube API Terms
                </a>
              </div>
            </div>
          </MotionSection>
        </div>
      </MotionMain>
    )
  }

  return (
    <MotionMain
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-[#0a0a0a] text-white"
    >
      <div className="sticky top-0 z-40 border-b border-white/8 bg-[#0a0a0a]/82 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 md:px-8">
          <a href="#home" className="inline-flex items-center">
            <BrandMark isPro={isProPlan} size="large" />
          </a>
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <button
                type="button"
                onClick={logoutAccount}
                className="hidden text-sm font-medium text-white/70 transition hover:text-white md:block"
              >
                Log Out
              </button>
            ) : (
              <a
                href="#login"
                onClick={navigateToHash('#login')}
                className="hidden text-sm font-medium text-white/70 transition hover:text-white md:block"
              >
                Login
              </a>
            )}
            <a
              href="#upgrade"
              onClick={navigateToHash('#upgrade')}
              className="hidden text-sm font-medium text-white/70 transition hover:text-white md:block"
            >
              Upgrade
            </a>
            <a href="#faq" className="hidden text-sm font-medium text-white/70 transition hover:text-white md:block">
              FAQ
            </a>
              <a
                href="#privacy"
                onClick={navigateToHash('#privacy')}
                className="hidden text-sm font-medium text-white/70 transition hover:text-white md:block"
              >
                Privacy
              </a>
              <a
                href="#terms"
                onClick={navigateToHash('#terms')}
                className="hidden text-sm font-medium text-white/70 transition hover:text-white md:block"
              >
                Terms
              </a>
              <a href="#contact" className="hidden text-sm font-medium text-white/70 transition hover:text-white md:block">
                Contact
              </a>
              <a
                href="#studio"
                className="rounded-full border border-white/20 bg-[#f3f3f3] px-5 py-2.5 text-sm font-semibold shadow-[inset_0_0_0_1px_rgba(0,0,0,0.08)] transition hover:bg-white"
                style={{ color: '#0a0a0a' }}
              >
                Open Studio
              </a>
          </div>
        </div>
      </div>

      <MotionSection id="home" className="relative flex min-h-screen items-center overflow-hidden border-b border-white/6">
        <div className="absolute inset-0 bg-[#0a0a0a]" />
        <motion.div
          aria-hidden="true"
          className="absolute inset-0 opacity-70"
          animate={{ scale: [1, 1.08, 1], x: [0, 30, -20, 0], y: [0, -20, 15, 0] }}
          transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            background:
              'radial-gradient(circle at 18% 22%, rgba(34,197,94,0.18), transparent 30%), radial-gradient(circle at 78% 28%, rgba(245,158,11,0.16), transparent 32%), radial-gradient(circle at 50% 78%, rgba(244,114,182,0.14), transparent 34%)',
          }}
        />
        <div aria-hidden="true" className="absolute inset-0 opacity-[0.11]" style={noiseStyle} />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(10,10,10,0.20)_0%,rgba(10,10,10,0.46)_58%,rgba(10,10,10,0.82)_100%)]" />

        <div className="relative z-10 mx-auto w-full max-w-7xl px-4 py-24 md:px-8 md:py-32">
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
            className="max-w-5xl"
          >
            <span className="inline-flex rounded-full border border-white/12 bg-white/4 px-4 py-1.5 text-sm font-medium uppercase tracking-[0.24em] text-white/70">
              Premium upload workflow for producers
            </span>
            <h1 className="mt-8 text-6xl font-extrabold leading-[0.9] tracking-[-0.07em] text-white md:text-8xl lg:text-[7.4rem]">
              Turn your audio file into a fully customizable YouTube video.
            </h1>
            <p className="mt-7 max-w-3xl text-lg leading-9 text-white/70 md:text-xl">
              BeatDrop gives producers one focused release desk to prep metadata, convert artwork and audio into a
              publish-ready upload, and move fast without extra clutter.
            </p>

            <div className="mt-12 flex flex-col gap-4 sm:flex-row">
              <a
                href="#studio"
                className="inline-flex items-center justify-center rounded-full bg-[#f3f3f3] px-7 py-4 text-base font-semibold shadow-[inset_0_0_0_1px_rgba(0,0,0,0.08)] transition hover:bg-white"
                style={{ color: '#0a0a0a' }}
              >
                Open the Studio
              </a>
              <a
                href="#login"
                onClick={navigateToHash('#login')}
                className="inline-flex items-center justify-center rounded-full border border-white/18 bg-transparent px-7 py-4 text-base font-semibold text-white transition hover:border-white/30 hover:bg-white/4"
              >
                Sign Up / Login
              </a>
            </div>
          </motion.div>
        </div>
      </MotionSection>

      <div className="mx-auto max-w-7xl px-4 py-8 md:px-8 md:py-10">
        <MotionSection
          id="workflow"
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.22 }}
          transition={{ duration: 0.55 }}
          className="rounded-[36px] border border-white/8 bg-[#111111] p-8 shadow-[0_24px_80px_rgba(0,0,0,0.38)] md:p-10"
        >
          <div className="max-w-3xl">
            <p className="text-sm font-medium uppercase tracking-[0.24em] text-white/45">Workflow</p>
            <h2 className="mt-4 text-4xl font-semibold tracking-[-0.05em] text-white md:text-5xl">
              Five clean steps from file drop to publish.
            </h2>
            <p className="mt-4 text-base leading-8 text-white/58 md:text-lg">
              The flow stays lightweight, but every step is designed to move you closer to a polished upload.
            </p>
          </div>

          <div className="relative mt-12">
            <div className="absolute bottom-8 left-[2rem] top-8 w-px bg-white/10 md:left-[2.35rem]" />
            <div className="grid gap-10 md:gap-12">
              {WORKFLOW_STEPS.map((step, index) => (
                <div key={step} className="relative flex items-start gap-6 md:gap-8">
                  <span className="relative z-10 flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-white/10 bg-[#151515] text-3xl font-semibold tracking-[-0.05em] text-white md:h-[4.75rem] md:w-[4.75rem] md:text-4xl">
                    {index + 1}
                  </span>
                  <div className="pt-3">
                    <p className="text-xl font-medium tracking-[-0.03em] text-white md:text-2xl">{step}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </MotionSection>

        <MotionSection
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.55 }}
          className="mt-6 rounded-[36px] border border-white/8 bg-[#111111] p-8 shadow-[0_24px_80px_rgba(0,0,0,0.38)] md:mt-8 md:p-10"
        >
          <div className="max-w-3xl">
            <p className="text-sm font-medium uppercase tracking-[0.24em] text-white/45">Upgrade</p>
            <h2 className="mt-4 text-4xl font-semibold tracking-[-0.05em] text-white md:text-5xl">
              Scale up your release workflow.
            </h2>
            <p className="mt-4 text-base leading-8 text-white/58 md:text-lg">
              Explore the comparison page to see what opens up when you want a more advanced publishing setup,
              streamlined repeat uploads, and a more polished release pipeline as your catalog grows.
            </p>
            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <a
                href="#upgrade"
                onClick={navigateToHash('#upgrade')}
                className="inline-flex items-center justify-center rounded-full bg-[#f3f3f3] px-7 py-4 text-base font-semibold shadow-[inset_0_0_0_1px_rgba(0,0,0,0.08)] transition hover:bg-white"
                style={{ color: '#0a0a0a' }}
              >
                Compare Plans
              </a>
            </div>
          </div>
        </MotionSection>

        <MotionSection
          id="faq"
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.55 }}
          className="mt-6 rounded-[36px] border border-white/8 bg-[#111111] p-8 shadow-[0_24px_80px_rgba(0,0,0,0.38)] md:mt-8 md:p-10"
        >
          <div className="max-w-4xl">
            <p className="text-sm font-medium uppercase tracking-[0.24em] text-white/45">FAQ</p>
            <h2 className="mt-4 text-4xl font-semibold tracking-[-0.05em] text-white md:text-5xl">
              Frequently asked questions.
            </h2>
            <div className="mt-8 grid gap-4">
              {FAQ_ITEMS.map((item) => (
                <div key={item.question} className="rounded-[28px] border border-white/8 bg-white/[0.03] p-5">
                  <p className="text-lg font-medium tracking-[-0.03em] text-white">{item.question}</p>
                  <p className="mt-3 text-sm leading-7 text-white/60 md:text-base">{item.answer}</p>
                </div>
              ))}
            </div>
          </div>
        </MotionSection>

        <MotionSection
          id="contact"
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.55 }}
          className="mt-6 rounded-[36px] border border-white/8 bg-[#111111] p-8 shadow-[0_24px_80px_rgba(0,0,0,0.38)] md:mt-8 md:p-10"
        >
          <div className="max-w-3xl">
            <p className="text-sm font-medium uppercase tracking-[0.24em] text-white/45">Contact</p>
            <h2 className="mt-4 text-4xl font-semibold tracking-[-0.05em] text-white md:text-5xl">
              Talk to us about your release setup.
            </h2>
            <p className="mt-4 text-base leading-8 text-white/58 md:text-lg">
              Need help with BeatDrop, want to ask about upgrades, or want a more tailored workflow? Reach out and we
              can help shape the setup around your process.
            </p>
            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <a
                href="mailto:hello@beatdrop.studio"
                className="inline-flex items-center justify-center rounded-full bg-[#f3f3f3] px-7 py-4 text-base font-semibold shadow-[inset_0_0_0_1px_rgba(0,0,0,0.08)] transition hover:bg-white"
                style={{ color: '#0a0a0a' }}
              >
                hello@beatdrop.studio
              </a>
              <a
                href="#privacy"
                onClick={navigateToHash('#privacy')}
                className="inline-flex items-center justify-center rounded-full border border-white/12 bg-transparent px-7 py-4 text-base font-semibold text-white transition hover:border-white/24 hover:bg-white/4"
              >
                Privacy Policy
              </a>
              <a
                href="#terms"
                onClick={navigateToHash('#terms')}
                className="inline-flex items-center justify-center rounded-full border border-white/12 bg-transparent px-7 py-4 text-base font-semibold text-white transition hover:border-white/24 hover:bg-white/4"
              >
                Terms of Service
              </a>
            </div>
          </div>
        </MotionSection>
      </div>
    </MotionMain>
  )
}

export default App

import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import Header from './components/Header'
import UploadZone from './components/UploadZone'
import CoverCropPanel from './components/CoverCropPanel'
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

function YouTubeLogoBadge({ size = 'default' }) {
  const isLarge = size === 'large'

  return (
    <span className={`inline-flex items-center ${isLarge ? 'gap-3.5' : 'gap-3'}`}>
      <svg
        viewBox="0 0 28 20"
        aria-hidden="true"
        className={`${isLarge ? 'h-[1.75rem] w-[2.45rem]' : 'h-6 w-[2.1rem]'} shrink-0 drop-shadow-[0_10px_30px_rgba(255,0,51,0.18)]`}
      >
        <path fill="#FF0033" d="M27.3 3.1a3.4 3.4 0 0 0-2.4-2.4C22.8.1 14 .1 14 .1S5.2.1 3.1.7A3.4 3.4 0 0 0 .7 3.1C.1 5.2.1 10 .1 10s0 4.8.6 6.9a3.4 3.4 0 0 0 2.4 2.4c2.1.6 10.9.6 10.9.6s8.8 0 10.9-.6a3.4 3.4 0 0 0 2.4-2.4c.6-2.1.6-6.9.6-6.9s0-4.8-.6-6.9Z" />
        <path fill="#fff" d="M11.2 14.4 18.5 10l-7.3-4.4v8.8Z" />
      </svg>
      <span className={`${isLarge ? 'text-[1.3rem]' : 'text-base'} font-semibold tracking-[0.01em] text-white`}>
        YouTube
      </span>
    </span>
  )
}

function getAccountInitial(user) {
  const source = String(user?.name || user?.email || '').trim()
  if (!source) return 'A'

  const parts = source.split(/\s+/).filter(Boolean)
  if (parts.length > 1) {
    return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase()
  }

  return source.slice(0, 2).toUpperCase()
}

const KEYBOARD_CURVE = {
  start: { x: -10, y: 17 },
  controlA: { x: 14, y: 6 },
  controlB: { x: 47, y: 68 },
  end: { x: 110, y: 73 },
}

const HERO_WHITE_KEY_COUNT = 36
const HERO_KEYBOARD_HALF_WIDTH = 4.5
const KEYBOARD_CURVE_SAMPLE_COUNT = 180
const BLACK_KEY_AFTER_WHITE_INDEXES = new Set([0, 1, 3, 4, 5])

function getCurvePoint(t) {
  const inverse = 1 - t
  const inverseSquared = inverse * inverse
  const tSquared = t * t

  return {
    x:
      inverseSquared * inverse * KEYBOARD_CURVE.start.x +
      3 * inverseSquared * t * KEYBOARD_CURVE.controlA.x +
      3 * inverse * tSquared * KEYBOARD_CURVE.controlB.x +
      tSquared * t * KEYBOARD_CURVE.end.x,
    y:
      inverseSquared * inverse * KEYBOARD_CURVE.start.y +
      3 * inverseSquared * t * KEYBOARD_CURVE.controlA.y +
      3 * inverse * tSquared * KEYBOARD_CURVE.controlB.y +
      tSquared * t * KEYBOARD_CURVE.end.y,
  }
}

const KEYBOARD_CURVE_SAMPLES = Array.from({ length: KEYBOARD_CURVE_SAMPLE_COUNT + 1 }, (_, index) => ({
  t: index / KEYBOARD_CURVE_SAMPLE_COUNT,
  point: getCurvePoint(index / KEYBOARD_CURVE_SAMPLE_COUNT),
})).reduce((samples, sample, index) => {
  if (index === 0) {
    return [{ ...sample, distance: 0 }]
  }

  const previous = samples[index - 1]
  const distance = previous.distance + Math.hypot(sample.point.x - previous.point.x, sample.point.y - previous.point.y)

  return [...samples, { ...sample, distance }]
}, [])

const KEYBOARD_CURVE_LENGTH = KEYBOARD_CURVE_SAMPLES[KEYBOARD_CURVE_SAMPLES.length - 1].distance

function getCurveTAtDistanceRatio(ratio) {
  const targetDistance = KEYBOARD_CURVE_LENGTH * Math.min(Math.max(ratio, 0), 1)
  const nextSampleIndex = KEYBOARD_CURVE_SAMPLES.findIndex((sample) => sample.distance >= targetDistance)

  if (nextSampleIndex <= 0) return 0

  const previous = KEYBOARD_CURVE_SAMPLES[nextSampleIndex - 1]
  const next = KEYBOARD_CURVE_SAMPLES[nextSampleIndex]
  const span = next.distance - previous.distance || 1
  const localRatio = (targetDistance - previous.distance) / span

  return previous.t + (next.t - previous.t) * localRatio
}

function getCurveNormal(t) {
  const inverse = 1 - t
  const dx =
    3 * inverse * inverse * (KEYBOARD_CURVE.controlA.x - KEYBOARD_CURVE.start.x) +
    6 * inverse * t * (KEYBOARD_CURVE.controlB.x - KEYBOARD_CURVE.controlA.x) +
    3 * t * t * (KEYBOARD_CURVE.end.x - KEYBOARD_CURVE.controlB.x)
  const dy =
    3 * inverse * inverse * (KEYBOARD_CURVE.controlA.y - KEYBOARD_CURVE.start.y) +
    6 * inverse * t * (KEYBOARD_CURVE.controlB.y - KEYBOARD_CURVE.controlA.y) +
    3 * t * t * (KEYBOARD_CURVE.end.y - KEYBOARD_CURVE.controlB.y)
  const length = Math.hypot(dx, dy) || 1

  return {
    x: -dy / length,
    y: dx / length,
  }
}

function getCurveOffsetPoint(t, offset) {
  const point = getCurvePoint(t)
  const normal = getCurveNormal(t)

  return {
    x: point.x + normal.x * offset,
    y: point.y + normal.y * offset,
  }
}

function getCurvedKeyPoints(startRatio, endRatio, topOffset, bottomOffset) {
  const tStart = getCurveTAtDistanceRatio(startRatio)
  const tEnd = getCurveTAtDistanceRatio(endRatio)
  return [
    getCurveOffsetPoint(tStart, topOffset),
    getCurveOffsetPoint(tEnd, topOffset),
    getCurveOffsetPoint(tEnd, bottomOffset),
    getCurveOffsetPoint(tStart, bottomOffset),
  ]
}

function getRoundedShapePath(points, radius = 0.3) {
  const clampRadius = (pointA, pointB, pointC) => {
    const previousLength = Math.hypot(pointA.x - pointB.x, pointA.y - pointB.y)
    const nextLength = Math.hypot(pointC.x - pointB.x, pointC.y - pointB.y)

    return Math.min(radius, previousLength * 0.32, nextLength * 0.32)
  }

  const offsetPoint = (from, to, distance) => {
    const dx = to.x - from.x
    const dy = to.y - from.y
    const length = Math.hypot(dx, dy) || 1

    return {
      x: from.x + (dx / length) * distance,
      y: from.y + (dy / length) * distance,
    }
  }

  const segments = points.map((point, index) => {
    const previous = points[(index - 1 + points.length) % points.length]
    const next = points[(index + 1) % points.length]
    const localRadius = clampRadius(previous, point, next)

    return {
      start: offsetPoint(point, previous, localRadius),
      corner: point,
      end: offsetPoint(point, next, localRadius),
    }
  })

  const [first, ...rest] = segments

  return `M ${first.end.x.toFixed(2)} ${first.end.y.toFixed(2)} ${rest
    .map(
      (segment) =>
        `L ${segment.start.x.toFixed(2)} ${segment.start.y.toFixed(2)} Q ${segment.corner.x.toFixed(2)} ${segment.corner.y.toFixed(2)} ${segment.end.x.toFixed(2)} ${segment.end.y.toFixed(2)}`,
    )
    .join(' ')} L ${first.start.x.toFixed(2)} ${first.start.y.toFixed(2)} Q ${first.corner.x.toFixed(2)} ${first.corner.y.toFixed(2)} ${first.end.x.toFixed(2)} ${first.end.y.toFixed(2)} Z`
}

function getKeyboardEdgePath(offset) {
  const start = getCurveOffsetPoint(0, offset)
  const samples = Array.from({ length: 40 }, (_, index) =>
    getCurveOffsetPoint(getCurveTAtDistanceRatio((index + 1) / 40), offset),
  )

  return `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} ${samples
    .map((point) => `L ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(' ')}`
}

function getKeyboardBodyPath() {
  const top = Array.from({ length: 41 }, (_, index) =>
    getCurveOffsetPoint(getCurveTAtDistanceRatio(index / 40), -HERO_KEYBOARD_HALF_WIDTH),
  )
  const bottom = Array.from({ length: 41 }, (_, index) =>
    getCurveOffsetPoint(getCurveTAtDistanceRatio(index / 40), HERO_KEYBOARD_HALF_WIDTH),
  ).reverse()
  const [start, ...rest] = [...top, ...bottom]

  return `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} ${rest
    .map((point) => `L ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(' ')} Z`
}

function HeroMidiBackdrop() {
  const whiteKeys = Array.from({ length: HERO_WHITE_KEY_COUNT }, (_, index) => {
    const startRatio = index / HERO_WHITE_KEY_COUNT
    const endRatio = (index + 1) / HERO_WHITE_KEY_COUNT

    return {
      index,
      path: getRoundedShapePath(
        getCurvedKeyPoints(
          startRatio,
          endRatio,
          -HERO_KEYBOARD_HALF_WIDTH + 0.48,
          HERO_KEYBOARD_HALF_WIDTH - 0.48,
        ),
        0.22,
      ),
    }
  })
  const blackKeys = Array.from({ length: HERO_WHITE_KEY_COUNT - 1 }, (_, index) => index)
    .filter((index) => BLACK_KEY_AFTER_WHITE_INDEXES.has(index % 7))
    .map((index) => {
      const centerRatio = (index + 1) / HERO_WHITE_KEY_COUNT
      const halfWidthRatio = 0.24 / HERO_WHITE_KEY_COUNT

      return {
        index,
        path: getRoundedShapePath(
          getCurvedKeyPoints(
            centerRatio - halfWidthRatio,
            centerRatio + halfWidthRatio,
            -HERO_KEYBOARD_HALF_WIDTH + 0.42,
            0.7,
          ),
          0.26,
        ),
      }
    })

  return (
    <div aria-hidden="true" className="absolute inset-0 overflow-hidden opacity-50">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full">
        <defs>
          <filter id="pianoGlow">
            <feGaussianBlur stdDeviation="0.55" />
          </filter>
        </defs>

        <path
          d="M-10 17C14 6 47 68 110 73"
          fill="none"
          stroke="rgba(196,196,196,0.04)"
          strokeWidth="10.5"
          strokeLinecap="round"
          filter="url(#pianoGlow)"
        />

        <path
          d={getKeyboardBodyPath()}
          fill="none"
          stroke="rgba(198,198,198,0.14)"
          strokeWidth="0.18"
        />

        <g>
          {whiteKeys.map((key) => (
            <path
              key={`white-key-${key.index}`}
              d={key.path}
              fill="none"
              stroke="rgba(210,210,210,0.12)"
              strokeWidth="0.07"
            />
          ))}
          {blackKeys.map((key) => (
            <path
              key={`black-key-${key.index}`}
              d={key.path}
              fill="none"
              stroke="rgba(168,168,168,0.18)"
              strokeWidth="0.09"
            />
          ))}
        </g>

        <path
          d={getKeyboardEdgePath(-HERO_KEYBOARD_HALF_WIDTH)}
          fill="none"
          stroke="rgba(214,214,214,0.16)"
          strokeWidth="0.16"
        />
        <path
          d={getKeyboardEdgePath(HERO_KEYBOARD_HALF_WIDTH)}
          fill="none"
          stroke="rgba(186,186,186,0.12)"
          strokeWidth="0.14"
        />
      </svg>
    </div>
  )
}

function HeroGoldBackdrop() {
  return (
    <div aria-hidden="true" className="absolute inset-0 overflow-hidden opacity-80">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full">
        <defs>
          <filter id="goldSoftGlow">
            <feGaussianBlur stdDeviation="1.4" />
          </filter>
        </defs>

        <path
          d="M-6 20C8 10 24 11 34 20C42 27 44 38 54 42C63 46 74 41 86 46C96 50 103 61 108 74"
          fill="none"
          stroke="rgba(243,213,143,0.30)"
          strokeWidth="0.65"
          strokeLinecap="round"
          filter="url(#goldSoftGlow)"
        />
        <path
          d="M-10 27C6 18 17 19 28 28C39 37 48 49 58 53C69 57 82 50 95 55C104 58 110 66 114 78"
          fill="none"
          stroke="rgba(212,177,90,0.34)"
          strokeWidth="0.22"
          strokeLinecap="round"
        />

        <path
          d="M16 4C28 2 39 8 46 16C53 24 55 34 63 39C70 44 80 42 90 47"
          fill="none"
          stroke="rgba(212,177,90,0.20)"
          strokeWidth="0.3"
          strokeLinecap="round"
          filter="url(#goldSoftGlow)"
        />
        <path
          d="M10 66C22 58 34 57 44 63C53 68 57 78 67 82C76 86 88 83 101 90"
          fill="none"
          stroke="rgba(184,151,77,0.24)"
          strokeWidth="0.42"
          strokeLinecap="round"
        />

        <path
          d="M30 18C36 14 44 15 49 20C54 25 54 33 60 36C65 39 73 37 80 41"
          fill="none"
          stroke="rgba(243,213,143,0.15)"
          strokeWidth="0.14"
          strokeLinecap="round"
        />
        <path
          d="M40 55C48 50 57 51 64 57C71 63 73 72 81 76C87 79 95 78 103 82"
          fill="none"
          stroke="rgba(243,213,143,0.16)"
          strokeWidth="0.16"
          strokeLinecap="round"
        />
      </svg>
    </div>
  )
}

function App() {
  const MotionMain = motion.main
  const MotionSection = motion.section
  const accountMenuRef = useRef(null)
  const [route, setRoute] = useState(() => getRouteFromHash(window.location.hash))
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false)
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
    loading: youtubeLoading,
    error: youtubeError,
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
  const effectiveDetails = isProPlan
    ? details
    : { ...details, schedulePublish: false, publishAt: '' }
  const shouldHideStudioSummary = isAuthenticated && isProPlan
  const accountInitial = useMemo(() => getAccountInitial(accountUser), [accountUser])

  useEffect(() => {
    const syncRoute = () => {
      setRoute(getRouteFromHash(window.location.hash))
      setIsAccountMenuOpen(false)
    }
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
    setIsAccountMenuOpen(false)
    if (window.location.hash !== hash) {
      window.location.hash = hash
      return
    }

    setRoute(getRouteFromHash(hash))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const accountMenu = isAuthenticated ? (
    <div ref={accountMenuRef} className="relative">
      <button
        type="button"
        onClick={() => setIsAccountMenuOpen((prev) => !prev)}
        className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/12 bg-white/[0.03] text-sm font-semibold text-white transition hover:border-white/24 hover:bg-white/[0.06]"
        aria-haspopup="menu"
        aria-expanded={isAccountMenuOpen}
        aria-label="Open account menu"
      >
        {accountInitial}
      </button>

      {isAccountMenuOpen ? (
        <div className="absolute right-0 top-[calc(100%+0.75rem)] w-72 rounded-[24px] border border-white/10 bg-[#111111] p-4 shadow-[0_24px_80px_rgba(0,0,0,0.46)]">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-white/40">Account</p>
          <p className="mt-3 text-sm font-semibold text-white">
            {accountUser?.name || 'BeatDrop account'}
          </p>
          <p className="mt-1 text-sm text-white/60">
            {authLoading ? 'Checking...' : accountUser?.email || 'Not logged in'}
          </p>
          <p className="mt-3 text-sm text-white/60">
            Current plan: <span className="font-semibold text-white">{accountPlanLabel}</span>
          </p>

          <div className="mt-4 flex flex-col gap-2">
            <a
              href="#upgrade"
              onClick={(event) => {
                setIsAccountMenuOpen(false)
                navigateToHash('#upgrade')(event)
              }}
              className="inline-flex items-center justify-center rounded-full border border-white/12 bg-transparent px-4 py-2.5 text-sm font-semibold text-white transition hover:border-white/24 hover:bg-white/4"
            >
              {isProPlan ? 'Manage Plan' : 'See Upgrade Options'}
            </a>
            <button
              type="button"
              onClick={() => {
                setIsAccountMenuOpen(false)
                logoutAccount()
              }}
              className="inline-flex items-center justify-center rounded-full border border-white/12 bg-transparent px-4 py-2.5 text-sm font-semibold text-white transition hover:border-white/24 hover:bg-white/4"
            >
              Log Out
            </button>
          </div>
        </div>
      ) : null}
    </div>
  ) : null

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

  useEffect(() => {
    if (!isAccountMenuOpen) return

    const handlePointerDown = (event) => {
      if (!accountMenuRef.current?.contains(event.target)) {
        setIsAccountMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [isAccountMenuOpen])

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
              {!isAuthenticated ? (
                <a
                  href="#login"
                  onClick={navigateToHash('#login')}
                  className="hidden text-sm font-medium text-white/70 transition hover:text-white md:block"
                >
                  Login
                </a>
              ) : null}
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
              {accountMenu}
            </div>
          </div>
        </div>

        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-8 md:px-8 md:py-10">
          {!shouldHideStudioSummary ? (
            <MotionSection
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45 }}
              className={`${studioPanelClass} p-6 md:p-8`}
            >
              <div className="flex flex-col gap-4 border-b border-white/8 pb-5 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.24em] text-white/45">
                    {isProPlan ? 'BeatDrop Pro Studio' : 'Free Plan Studio'}
                  </p>
                  <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-white md:text-4xl">
                    {isProPlan
                      ? 'Upload, refine, and publish with the full Pro workflow in one place.'
                      : 'Upload and publish the essentials without leaving the workspace.'}
                  </h1>
                </div>
                <p className="max-w-2xl text-sm leading-7 text-white/60 md:text-base">
                  {isProPlan
                    ? 'Pro includes auto-detected metadata, reusable presets, upload scheduling, and faster publishing from the same studio.'
                    : 'Free includes MP3 upload, cover upload, manual title and description entry, and YouTube publishing. Upgrade when you want auto-detected metadata, reusable presets, and upload scheduling.'}
                </p>
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
          ) : null}

          <div className="grid gap-4">
            <Header
              token={youtubeToken}
              userInfo={youtubeUserInfo}
              ready={youtubeReady}
              loading={youtubeLoading}
              error={youtubeError}
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
                  setPresets={setPresets}
                  selectedPresetId={selectedPresetId}
                  onPresetSelect={handlePresetSelection}
                  presetLocked={!isProPlan}
                  scheduleLocked={!isProPlan}
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
              {!isAuthenticated ? (
                <a
                  href="#login"
                  onClick={navigateToHash('#login')}
                  className="hidden text-sm font-medium text-white/70 transition hover:text-white md:block"
                >
                  Login
                </a>
              ) : null}
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
              {accountMenu}
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
                'radial-gradient(circle at 20% 22%, rgba(212,177,90,0.16), transparent 32%), radial-gradient(circle at 78% 24%, rgba(243,213,143,0.12), transparent 28%), radial-gradient(circle at 52% 78%, rgba(184,151,77,0.14), transparent 34%)',
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
              {!isAuthenticated ? (
                <a
                  href="#login"
                  onClick={navigateToHash('#login')}
                  className="hidden text-sm font-medium text-white/70 transition hover:text-white md:block"
                >
                  Login
                </a>
              ) : null}
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
              {accountMenu}
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
              {!isAuthenticated ? (
                <a
                  href="#login"
                  onClick={navigateToHash('#login')}
                  className="hidden text-sm font-medium text-white/70 transition hover:text-white md:block"
                >
                  Login
                </a>
              ) : null}
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
              {accountMenu}
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
                'radial-gradient(circle at 18% 22%, rgba(212,177,90,0.16), transparent 30%), radial-gradient(circle at 78% 28%, rgba(243,213,143,0.12), transparent 32%), radial-gradient(circle at 50% 78%, rgba(184,151,77,0.14), transparent 34%)',
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
              {!isAuthenticated ? (
                <a
                  href="#login"
                  onClick={navigateToHash('#login')}
                  className="hidden text-sm font-medium text-white/70 transition hover:text-white md:block"
                >
                  Login
                </a>
              ) : null}
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
              {accountMenu}
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
                'radial-gradient(circle at 18% 22%, rgba(212,177,90,0.16), transparent 30%), radial-gradient(circle at 78% 28%, rgba(243,213,143,0.12), transparent 32%), radial-gradient(circle at 50% 78%, rgba(184,151,77,0.14), transparent 34%)',
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
            {!isAuthenticated ? (
              <a
                href="#login"
                onClick={navigateToHash('#login')}
                className="hidden text-sm font-medium text-white/70 transition hover:text-white md:block"
              >
                Login
              </a>
            ) : null}
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
              {accountMenu}
          </div>
        </div>
      </div>

      <MotionSection id="home" className="relative flex min-h-screen items-center overflow-hidden border-b border-white/6">
        <div className="absolute inset-0 bg-[#0a0a0a]" />
        <HeroGoldBackdrop />
        <HeroMidiBackdrop />
        <div aria-hidden="true" className="absolute inset-0 opacity-[0.11]" style={noiseStyle} />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(10,10,10,0.20)_0%,rgba(10,10,10,0.46)_58%,rgba(10,10,10,0.82)_100%)]" />

        <div className="relative z-10 mx-auto w-full max-w-7xl px-4 py-24 md:px-8 md:py-32">
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
            className="max-w-5xl"
          >
            <h1 className="mt-8 text-6xl font-extrabold leading-[0.9] tracking-[-0.07em] text-white md:text-8xl lg:text-[7.4rem]">
              Upload your beats faster with full control.
            </h1>
            <p className="mt-7 max-w-3xl text-lg leading-9 text-white/70 md:text-xl">
              Drop an MP3 and cover image. Customize and Crop. Detect the BPM and Key. Create title, description and
              tag presets. Control scheduling. Publish directly to your channel quickly.
            </p>

            <div className="mt-12 flex flex-col gap-5 sm:flex-row sm:items-center sm:gap-8">
              <a
                href="#login"
                onClick={navigateToHash('#login')}
                className="group inline-flex items-center justify-center gap-3 self-start rounded-full bg-[#f3f3f3] px-9 py-5 text-lg font-semibold shadow-[inset_0_0_0_1px_rgba(0,0,0,0.08),0_18px_50px_rgba(255,255,255,0.10)] transition duration-200 hover:-translate-y-0.5 hover:bg-white hover:shadow-[inset_0_0_0_1px_rgba(0,0,0,0.08),0_22px_60px_rgba(255,255,255,0.16)]"
                style={{ color: '#0a0a0a' }}
              >
                Open the Studio
                <span
                  aria-hidden="true"
                  className="text-xl leading-none transition duration-200 group-hover:translate-x-1"
                >
                  →
                </span>
              </a>
              <div className="self-start sm:self-auto">
                <YouTubeLogoBadge size="large" />
              </div>
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


export const VIDEO_SIZE_OPTIONS = [
  {
    value: '1920x1080',
    label: '1920x1080 (16:9)',
    width: 1920,
    height: 1080,
  },
]

export const CATEGORY_OPTIONS = [
  {
    value: '10',
    label: 'Music',
  },
]

export const LICENSE_OPTIONS = [
  {
    value: 'youtube',
    label: 'Standard YouTube License',
  },
  {
    value: 'creativeCommon',
    label: 'Creative Commons',
  },
]

export const DEFAULT_UPLOAD_DETAILS = {
  title: '',
  description: '',
  tags: '',
  visibility: 'private',
  schedulePublish: false,
  publishAt: '',
  videoSize: VIDEO_SIZE_OPTIONS[0].value,
  categoryId: CATEGORY_OPTIONS[0].value,
  notifySubscribers: true,
  madeForKids: false,
  embeddable: true,
  license: LICENSE_OPTIONS[0].value,
}

export function resolveVideoSize(value) {
  return VIDEO_SIZE_OPTIONS.find((option) => option.value === value) || VIDEO_SIZE_OPTIONS[0]
}

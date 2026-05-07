export const ACCEPTED_COVER_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp']

function fileHasExtension(file, extensions) {
  const fileName = String(file?.name || '').toLowerCase()
  return extensions.some((extension) => fileName.endsWith(extension))
}

export function isAcceptedCoverImageFile(file) {
  return Boolean(file) && (ACCEPTED_COVER_IMAGE_TYPES.includes(file.type) || fileHasExtension(file, ['.png', '.jpg', '.jpeg', '.webp']))
}

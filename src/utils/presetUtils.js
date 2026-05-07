const STORAGE_KEY = 'beatdrop_presets'

function normalizePreset(preset) {
  return {
    id: preset.id || crypto.randomUUID(),
    name: preset.name,
    titleTemplate: preset.titleTemplate || '',
    descriptionTemplate: preset.descriptionTemplate || '',
    tags: preset.tags || '',
    visibility: preset.visibility || 'private',
  }
}

export function loadPresets() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.map(normalizePreset) : []
  } catch {
    return []
  }
}

export function savePreset(preset) {
  const presets = loadPresets()
  const nextPreset = normalizePreset(preset)

  const index = presets.findIndex((item) => item.id === nextPreset.id)
  if (index >= 0) {
    presets[index] = nextPreset
  } else {
    presets.push(nextPreset)
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(presets))
  return presets
}

export function deletePreset(id) {
  const next = loadPresets().filter((preset) => preset.id !== id)
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  return next
}

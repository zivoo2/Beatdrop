export function applyTemplate(template, values) {
  const date = new Date()
  const replacements = {
    title: values.title || '',
    bpm: values.bpm || '',
    key: values.key || '',
    year: String(date.getFullYear()),
    month: String(date.getMonth() + 1).padStart(2, '0'),
  }

  return (template || '').replace(/\{(title|bpm|key|year|month)\}/g, (_, token) => replacements[token] || '')
}

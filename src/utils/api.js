export const API_BASE_URL = import.meta.env.DEV ? 'http://127.0.0.1:4242' : ''

export function getApiUrl(path) {
  return `${API_BASE_URL}${path}`
}

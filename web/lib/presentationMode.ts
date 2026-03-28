const PRESENTATION_STORAGE_KEY = 'syntax-sabotage:presentation-mode'

function readEnvFlag(): boolean {
  return (process.env.NEXT_PUBLIC_PRESENTATION_MODE ?? '').toLowerCase() === 'true'
}

export function isPresentationMode(): boolean {
  if (readEnvFlag()) {
    return true
  }

  if (typeof window === 'undefined') {
    return false
  }

  const params = new URLSearchParams(window.location.search)
  if (params.get('demo') === '0') {
    window.localStorage.removeItem(PRESENTATION_STORAGE_KEY)
    return false
  }

  if (params.get('demo') === '1') {
    window.localStorage.setItem(PRESENTATION_STORAGE_KEY, 'true')
    return true
  }

  return window.localStorage.getItem(PRESENTATION_STORAGE_KEY) === 'true'
}

export function disablePresentationModeForBrowser(): void {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.removeItem(PRESENTATION_STORAGE_KEY)
}

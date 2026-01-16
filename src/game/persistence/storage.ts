export const readStoredNumber = (key: string, fallback: number): number => {
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) {
      return fallback
    }
    const parsed = Number(raw)
    return Number.isFinite(parsed) ? parsed : fallback
  } catch {
    return fallback
  }
}

export const readStoredBool = (key: string, fallback: boolean): boolean => {
  try {
    const raw = window.localStorage.getItem(key)
    if (raw === null) {
      return fallback
    }
    return raw === 'true'
  } catch {
    return fallback
  }
}

export const readStoredString = (key: string): string | null => {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

export const storeNumber = (key: string, value: number): void => {
  try {
    window.localStorage.setItem(key, String(value))
  } catch {
    // Ignore storage errors.
  }
}

export const storeString = (key: string, value: string): void => {
  try {
    window.localStorage.setItem(key, value)
  } catch {
    // Ignore storage errors.
  }
}

export const storeBool = (key: string, value: boolean): void => {
  try {
    window.localStorage.setItem(key, String(value))
  } catch {
    // Ignore storage errors.
  }
}

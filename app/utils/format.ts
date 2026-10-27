// Formatting + presentation helpers ported from the original controller.
// These stay framework-agnostic; the store supplies the account currency.

export function esc(x: unknown): string {
  return String(x ?? '').replace(
    /[&<>"']/g,
    (m) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        m
      ] as string,
  )
}

export const money = (v: unknown, d = 2): string =>
  Number.isFinite(Number(v))
    ? Number(v).toLocaleString('en-US', {
        minimumFractionDigits: d,
        maximumFractionDigits: d,
      })
    : '—'

export const signed = (v: number): string =>
  (v >= 0 ? '+' : '−') + '$' + money(Math.abs(v))

export function accountMoney(v: number, currency = 'USD'): string {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
    }).format(v)
  } catch {
    return money(v) + ' ' + currency
  }
}

export const timefmt = (v: string | number | Date): string =>
  new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Bangkok',
  }).format(new Date(v))

export const datefmt = (v: string | number | Date): string =>
  new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Bangkok',
  }).format(new Date(v))

export const stamp = (): string => new Date().toISOString()

export const short = (id: unknown): string =>
  String(id).length > 18
    ? String(id).slice(0, 8) + '…' + String(id).slice(-4)
    : String(id)

export const uuid = (): string =>
  crypto.randomUUID?.() ||
  Array.from(crypto.getRandomValues(new Uint8Array(16)), (v) =>
    v.toString(16).padStart(2, '0'),
  ).join('')

// datetime-local value in device-local time, ported from localDate().
export function localDate(value: string | number | Date): string {
  const d = new Date(value)
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16)
}

// Tone used by the <Badge> component, ported from the original badge().
export function badgeTone(value: string): 'green' | 'red' | 'amber' {
  if (
    [
      'FILLED',
      'CLOSED',
      'UPDATED',
      'READY',
      'BUY',
      'CONNECTED',
      'PARTIALLY_CLOSED',
    ].includes(value)
  )
    return 'green'
  if (['UNKNOWN', 'REJECTED', 'INVALIDATED', 'BLOCKED'].includes(value))
    return 'red'
  return 'amber'
}

export function download(name: string, content: string, type: string): void {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const link = document.createElement('a')
  link.href = url
  link.download = name
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export const sleep = (ms: number): Promise<void> =>
  new Promise((r) => setTimeout(r, ms))

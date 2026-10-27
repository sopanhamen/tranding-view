// Candlestick SVG builder, ported verbatim from the original chartSvg() so the
// rendered markup — and therefore the visuals — stay identical. Returns an SVG
// string that callers inject with v-html (all values are app-generated).
/* eslint-disable @typescript-eslint/no-explicit-any */
import { money, timefmt, esc } from '~/utils/format'

export interface ChartOptions {
  symbol: string
  tf: string
  mode: 'demo' | 'api'
  analysis: any
  showLevels: boolean
  large?: boolean
}

function isPhone(large: boolean | undefined): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(max-width:600px)').matches && !large
}

export function buildChartSvg(bars: any[], opts: ChartOptions): string {
  const { symbol, tf, mode, analysis, showLevels, large } = opts
  if (!bars.length)
    return `<svg class="chart-svg" viewBox="0 0 900 385" role="img" aria-label="No broker candle data available"><text x="450" y="190" text-anchor="middle" style="fill:var(--muted);font-size:14px">No broker candles available. Refresh the terminal connection.</text></svg>`
  const phone = isPhone(large)
  const sliced = bars.slice(phone ? -36 : -66)
  const w = phone ? 480 : 900
  const h = 385
  const left = 10
  const right = 76
  const top = 44
  const bottom = 72
  const usable = w - left - right
  const plot = h - top - bottom
  let min = Math.min(...sliced.map((b) => b.low))
  let max = Math.max(...sliced.map((b) => b.high))
  const a = analysis?.data
  if (showLevels && mode === 'demo') {
    min = Math.min(min, a?.stop_loss ?? min) - 3
    max = Math.max(max, a?.take_profits?.[0] ?? max) + 4
  } else {
    min -= 2
    max += 2
  }
  const y = (v: number) => top + ((max - v) / (max - min)) * plot
  const step = usable / sliced.length
  let out = `<svg class="chart-svg" id="candle-chart" viewBox="0 0 ${w} ${h}" role="img" aria-labelledby="chart-title chart-desc"><title id="chart-title">${esc(symbol)} ${tf} candlestick chart</title><desc id="chart-desc">${mode === 'demo' ? 'Illustrative synthetic' : 'Broker-reported closed'} candles. Use Candle data for numerical values. Green candles close above their open; red candles close below it.</desc>`
  for (let i = 0; i < 6; i++) {
    const v = max - (i * (max - min)) / 5
    const yy = y(v)
    out += `<line x1="${left}" y1="${yy}" x2="${w - right}" y2="${yy}" stroke="#2a303a" stroke-opacity=".7"/><text x="${w - right + 12}" y="${yy + 3}">${money(v)}</text>`
  }
  for (let i = 0; i < sliced.length; i += 11) {
    const x = left + i * step + step / 2
    out += `<line x1="${x}" y1="${top - 10}" x2="${x}" y2="${h - 34}" stroke="#2a303a" stroke-opacity=".6"/><text x="${x}" y="${h - 10}" text-anchor="middle">${timefmt(sliced[i].time * 1000)}</text>`
  }
  if (showLevels && a?.entry_zone) {
    const lo = a.entry_zone[0]
    const hi = a.entry_zone[1]
    if (y(hi) > top - 20 && y(lo) < h - bottom + 20)
      out += `<rect x="${left}" y="${y(hi)}" width="${usable}" height="${Math.max(y(lo) - y(hi), 2)}" fill="#e8c47d" fill-opacity=".055"/><line x1="${left}" y1="${y(lo)}" x2="${w - right}" y2="${y(lo)}" stroke="#e8c47d" stroke-opacity=".5" stroke-dasharray="4 5"/><text x="${left + 10}" y="${y(hi) - 6}" style="fill:#c7a768;font-size:8px">ENTRY ZONE</text>`
  }
  const maxVol = Math.max(...sliced.map((b) => b.tick_volume || 1))
  sliced.forEach((b, i) => {
    const x = left + i * step + step / 2
    const up = b.close >= b.open
    const color = up ? '#6ac7a5' : '#d97681'
    const body = Math.max(1.6, Math.abs(y(b.close) - y(b.open)))
    out += `<line x1="${x}" y1="${y(b.high)}" x2="${x}" y2="${y(b.low)}" stroke="${color}" stroke-width="1.1"/><rect x="${x - step * 0.27}" y="${Math.min(y(b.open), y(b.close))}" width="${step * 0.54}" height="${body}" fill="${color}" rx=".3"/><rect x="${x - step * 0.27}" y="${h - 35 - ((b.tick_volume || 1) / maxVol) * 26}" width="${step * 0.54}" height="${((b.tick_volume || 1) / maxVol) * 26}" fill="${color}" fill-opacity=".2"/>`
  })
  if (showLevels && a) {
    for (const [value, label, color] of [
      [a.stop_loss, 'SL', '#f38e94'],
      [a.take_profits?.[0], 'TP1', '#6dd5ad'],
    ] as [number, string, string][])
      if (value && y(value) >= top - 5 && y(value) < h - bottom + 15)
        out += `<line x1="${left}" y1="${y(value)}" x2="${w - right}" y2="${y(value)}" stroke="${color}" stroke-opacity=".55" stroke-dasharray="4 5"/><rect x="${w - right - 86}" y="${y(value) - 10}" width="84" height="18" rx="3" fill="#14181e"/><text x="${w - right - 80}" y="${y(value) + 2}" style="fill:${color};font-size:8px">${label} ${money(value)}</text>`
  }
  const last = sliced.at(-1)?.close ?? 4032.18
  const yy = y(last)
  out += `<line x1="${left}" y1="${yy}" x2="${w - right}" y2="${yy}" stroke="#6dd5ad" stroke-opacity=".5" stroke-dasharray="2 4"/><rect x="${w - right + 1}" y="${yy - 10}" width="73" height="21" rx="3" fill="#6dd5ad"/><text x="${w - right + 8}" y="${yy + 4}" style="fill:#10281f;font-size:10px;font-weight:600">${money(last)}</text></svg>`
  return out
}

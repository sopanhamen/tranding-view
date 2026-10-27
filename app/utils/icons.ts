// SVG path data for the workspace icon set. Rendered by the <Icon> component.
export const icons: Record<string, string> = {
  chart: 'M3 3v18h18M7 14l4-5 4 3 5-7',
  spark: 'm12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3Z',
  plans: 'M8 5H5v16h14V5h-3M8 3h8v4H8zM8 12h8M8 16h5',
  positions: 'M4 7h16v14H4zM8 7V3h8v4M4 12h16M10 12v3h4v-3',
  activity: 'M3 12h4l3-8 4 16 3-8h4',
  plug: 'M8 3v5m8-5v5M6 8h12v3a6 6 0 0 1-12 0V8Zm6 9v4',
  code: 'm8 6-6 6 6 6m8-12 6 6-6 6M14 3l-4 18',
  chevron: 'm9 5 7 7-7 7',
  down: 'm6 9 6 6 6-6',
  refresh: 'M20 7v5h-5M4 17v-5h5M6 7a7 7 0 0 1 12-2l2 2M4 17l2 2a7 7 0 0 0 12-2',
  settings:
    'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM9 3h6l1 3 3 1 2 5-2 5-3 1-1 3H9l-1-3-3-1-2-5 2-5 3-1 1-3Z',
  bell: 'M6 9a6 6 0 0 1 12 0v6l2 3H4l2-3V9Zm4 12h4',
  clock: 'M12 8v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0',
  arrow: 'M5 12h14m-5-5 5 5-5 5',
  up: 'm6 14 6-6 6 6',
  shield: 'm12 2 8 4v6c0 5-8 10-8 10S4 17 4 12V6l8-4Zm-4 10 3 3 5-6',
  check: 'm5 12 4 4L19 6',
  info: 'M12 11v6m0-10v.1M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0',
  close: 'm6 6 12 12M6 18 18 6',
  more: 'M5 12h.01M12 12h.01M19 12h.01',
  crosshair: 'M12 2v5m0 10v5M2 12h5m10 0h5M18 12a6 6 0 1 1-12 0 6 6 0 0 1 12 0',
  trend: 'm3 17 6-6 4 4 8-10m-6 0h6v6',
  line: 'M3 12h18',
  pencil: 'm4 16-1 5 5-1L21 7l-4-4L4 16Zm10-10 4 4',
  camera: 'M4 6h4l2-3h4l2 3h4v15H4V6Zm12 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0',
  expand: 'M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5',
  download: 'M12 3v12m-5-5 5 5 5-5M4 17v4h16v-4',
  upload: 'M12 16V4m-5 5 5-5 5 5M4 16v5h16v-5',
  image: 'M3 3h18v18H3zM3 17l6-6 4 4 3-3 5 5M8 7h.01',
  search: 'M16 16l5 5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0',
  filter: 'M3 5h18l-7 8v7l-4-2v-5L3 5Z',
  server: 'M3 3h18v7H3zM3 14h18v7H3zM7 6h.01M7 17h.01',
  monitor: 'M3 3h18v14H3zM8 21h8m-4-4v4',
  database:
    'M20 6c0 2-4 3-8 3S4 8 4 6s4-3 8-3 8 1 8 3ZM4 6v12c0 2 4 3 8 3s8-1 8-3V6M4 12c0 2 4 3 8 3s8-1 8-3',
  eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Zm13 0a3 3 0 1 1-6 0 3 3 0 0 1 6 0',
  copy: 'M8 8h13v13H8zM16 8V3H3v13h5',
  menu: 'M3 6h18M3 12h18M3 18h18',
  pause: 'M8 4v16M16 4v16',
  play: 'm7 3 14 9-14 9V3Z',
  external: 'M14 3h7v7M21 3 10 14M10 3H3v18h18v-7',
  wallet: 'M3 5h16v4h3v10H3V5Zm13 7h6v4h-6v-4ZM3 5l13-3v3',
  lock: 'M6 10h12v11H6zM8 10V6a4 4 0 0 1 8 0v4',
  globe:
    'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0M3 12h18M12 3c5 5 5 13 0 18-5-5-5-13 0-18',
  history: 'M3 3v6h6M4 8a9 9 0 1 1-1 7M12 7v6l4 2',
  logout: 'M9 3H3v18h6m6-14 5 5-5 5m-7-5h12',
  bars: 'M5 3v18m-2-9h4V6H3v6Zm9-10v18m-2-4h4V9h-4v7Zm9-13v18m-2-4h4V6h-4v11',
  // Note: "layers" is intentionally absent — the original controller's empty()
  // state referenced it and fell back to the info glyph. iconPath preserves that.
}

export function iconPath(name: string): string {
  return icons[name] ?? icons.info!
}

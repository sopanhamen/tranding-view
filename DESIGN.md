---
version: alpha
name: Aurum
description: "A precise, graphite-and-gold workspace for conditional gold trading."
colors:
  background: "#0d1015"
  surface: "#14181e"
  raised: "#1a1f27"
  border: "#2a303a"
  primary: "#e8c47d"
  success: "#6dd5ad"
  danger: "#f38e94"
  text: "#edf0f5"
  muted: "#a0a9b7"
  subtle: "#737f91"
  focus: "#e8c47d"
  scrollbar-thumb: "#46505f"
  scrollbar-track: "#14181e"
  scrollbar-hover: "#69768a"
typography:
  sans:
    fontFamily: "Aptos, Segoe UI, sans-serif"
  display:
    fontFamily: "Aptos Display, Segoe UI, sans-serif"
  mono:
    fontFamily: "Cascadia Code, SFMono-Regular, Consolas, monospace"
rounded:
  DEFAULT: "10px"
  control: "6px"
  dialog: "12px"
spacing:
  panel-gap: "18px"
  page-padding: "30px"
components:
  button:
    height: "36px"
  card:
    rounded: "10px"
  dialog:
    rounded: "12px"
---

# Aurum Design System

## Overview

A personal gold-trading cockpit for Panha: analyse screenshots, understand conditional entries, track MT5 commands and manage positions. Product register, not a marketing landing page. Desktop-first, with mobile monitoring and complete mobile action access. English UI, en-US numbers and Asia/Bangkok display time; uploaded capture times use the device's local input and are transmitted as ISO timestamps.

The reference world is a precision instrument panel: muted graphite, thin structural dividers, tabular prices, restrained bullion-gold action emphasis. The signature is the gold-threaded analysis rail aligned beside an actual candlestick plot, with entry, stop and target annotations mirrored in the review. Green/red are market direction and outcome semantics, never gold substitutes. Avoid neon casino interfaces, ornamental hero sections, fabricated win rates and decorative telemetry.

Runtime token ownership is Model B: `src/styles.css` :root is canonical. This file mirrors accepted values; `scripts/check_tokens.py` checks every color against its corresponding `--name` custom property. Typography maps to --font-sans, --font-display and --font-mono. --radius owns panel geometry. Shared templates in app.js consume the same classes. `scripts/build.mjs` copies source assets unchanged to dist; dist is generated, never edited independently.

## Colors

Background, surface and raised create quiet hierarchy without arbitrary gradients. Primary is for the main analyse/review action and selected navigation. Success/danger pair color with action/status text. Muted text is the body helper baseline; subtle is limited to secondary labels. Focus uses primary with a 2px outline and 3px offset. Scrollbar tokens apply globally, including hover/active and forced-colors fallback. All broker-like data in demo mode is labeled simulated.

## Typography

Display uses Aptos Display/Segoe UI at 27px/600 for page titles. Body uses Aptos/Segoe UI, primarily 12–14px for a dense trading tool, with small technical captions. Prices and IDs use Cascadia Code/Consolas and tabular numerals. These system stacks avoid external font requests and layout shifts. UI language is English; no Japan-market, Japanese-locale or Japanese-content scope is implied.

## Layout

208px persistent sidebar, 66px topbar, natural-height main document. At desktop, chart plus lower position table are the primary working column; the 322px right rail presents analysis and execution guardrails. Never fix the shared content height to fit a table. Tables own horizontal overflow; long forms scroll with the document. At 1050px the sidebar collapses to icons; at 850px analysis stacks under the chart; at 600px navigation becomes an app drawer. Main controls and all column data remain reachable. Panel gap is 18px; content padding 30px desktop/14px phone.

## Elevation & Depth

Borders and tonal surfaces establish hierarchy. Only modal dialogs have a deep shadow. Sticky behavior is limited to navigation and desktop analysis; narrow screens use natural flow. No animated chart ticks pretending to be live.

## Shapes

10px panel radius, 6px controls, 12px dialogs. Small square level marks encode entry/SL/TP; circular gold Au marks identify the instrument. Gold hexagonal brand mark recalls the metal, without image assets.

## Components

Shared functions own pageHeading, analysisCard, positionsTable, planCard, badge, openModal, toast and form fields. Buttons use neutral outline, gold primary or separated danger intent. Hover brightens the surface; focus is an explicit outline; busy retains dimensions and disables duplicate activation. Native select and datetime-local are deliberate platform-owned variants. All authored forms use novalidate.

Dialogs use the native HTML dialog API with showModal for focus trapping and inert background; app-owned heading, cancel, confirmation, errors, Escape and focus restoration. Secrets are masked, with show/hide and memory-only lifetime. No native alert/confirm/prompt calls. Screen transitions are restrained; only an indeterminate request spinner animates, and reduced motion is respected.

Charts use deterministic synthetic candles in demo and server closed candles in API mode. The Candle data dialog supplies a numerical alternative. No estimated win rate is displayed. Orders remain queued until broker confirmation; UNKNOWN is visually distinct and never invites a retry.

## Do's and Don'ts

- Do keep the chart, analysis prices and review grounded in the same selected analysis.
- Do show account mode and demo data labels persistently.
- Do distinguish a plan, a queued command and an open position.
- Don't expose OpenAI, MT5 or Neon configuration as editable when no API exists.
- Don't create dashboards full of performance metrics that the backend cannot supply.
- Don't use color alone, fabricate loading percentages, hide scrollbars or send financial mutations optimistically.

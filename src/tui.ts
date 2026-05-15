#!/usr/bin/env node
// Operational TUI Console — structured layout, keyboard nav, detail inspection, live events
// Run: npm run tui   or   npx tsx src/tui.ts
// Requires: server running on localhost:3000

import readline from 'readline'

// ===========================================================================
// TERMINAL ABSTRACTION
// ===========================================================================
const API = 'http://localhost:3000'

// ANSI
const ESC = '\x1b'
const HIDE_CURSOR = `${ESC}[?25l`
const SHOW_CURSOR = `${ESC}[?25h`
const CLEAR = `${ESC}[2J${ESC}[H`
const BOLD = `${ESC}[1m`
const DIM = `${ESC}[2m`
const RESET = `${ESC}[0m`
const FG = (c: number) => `${ESC}[38;5;${c}m`
const BG = (c: number) => `${ESC}[48;5;${c}m`
const MOVE = (r: number, c: number) => `${ESC}[${r};${c}H`

// Palette — restrained, operational
const C = { green: 2, amber: 3, red: 1, blue: 4, cyan: 6, white: 7, gray8: 8, gray12: 12, gray16: 16, gray: 243, bg: 235, bgl: 237, border: 239 } as const

// ===========================================================================
// SCREEN BUFFER — incremental rendering, zero flicker
// ===========================================================================
class Screen {
  private prev: string[] = []
  private rows = 0; private cols = 0

  init() {
    this.rows = process.stdout.rows
    this.cols = process.stdout.columns
    process.stdout.write(HIDE_CURSOR + CLEAR)
    this.prev = []
  }

  resize() {
    this.rows = process.stdout.rows
    this.cols = process.stdout.columns
    this.prev = []
    process.stdout.write(CLEAR)
  }

  get dims() { return { rows: this.rows, cols: this.cols } }

  /** Draw pixel-perfect buffer. Only emits changed lines. */
  draw(buffer: string[]) {
    const rows = Math.min(buffer.length, this.rows)
    const out: string[] = []

    for (let r = 0; r < rows; r++) {
      const line = (buffer[r] || '').slice(0, this.cols)
      if (line !== this.prev[r]) {
        out.push(`${MOVE(r + 1, 1)}${line}`)
      }
    }

    // Clear trailing lines if previous was taller
    for (let r = rows; r < this.prev.length; r++) {
      out.push(`${MOVE(r + 1, 1)}${ESC}[K`)
    }

    this.prev = buffer.slice(0, rows).map(l => (l || '').slice(0, this.cols))
    if (out.length) process.stdout.write(out.join('') + MOVE(1, 1))
  }

  shutdown() {
    process.stdout.write(SHOW_CURSOR + CLEAR)
  }
}

// ===========================================================================
// DRAW HELPERS
// ===========================================================================
function pad(s: string, w: number, right = false): string {
  const len = [...s].length
  if (len >= w) return s.slice(0, w)
  const fill = ' '.repeat(w - len)
  return right ? fill + s : s + fill
}

function trunc(s: string, w: number): string {
  return s.length > w ? s.slice(0, w - 1) + '…' : s
}

function line(w: number, ch = '─'): string { return ch.repeat(w) }

function boxed(w: number, title: string, content: string[]): string[] {
  const top = `${BOLD} ${title} ${RESET}${DIM}${line(w - title.length - 2)}${RESET}`
  return [top, ...content]
}

// ===========================================================================
// APP STATE
// ===========================================================================
interface AppState {
  metrics: any
  diagnostics: any
  events: any[]
  tasks: any[]
  agents: any[]
  policies: any[]
  connected: boolean
  mode: string
  // Navigation
  selectedList: 'queue' | 'agents' | 'policies' | 'events'
  selectedIdx: number
  // Detail
  detailItem: any | null
  detailType: string
  // Command mode
  commandMode: boolean
  commandBuffer: string
  commandHistory: string[]
  // Messages
  lastAction: string
  lastActionTime: number
}

const state: AppState = {
  metrics: null, diagnostics: null, events: [], tasks: [], agents: [], policies: [],
  connected: false, mode: 'demo',
  selectedList: 'queue', selectedIdx: 0,
  detailItem: null, detailType: '',
  commandMode: false, commandBuffer: '', commandHistory: [],
  lastAction: '', lastActionTime: 0,
}

// ===========================================================================
// API
// ===========================================================================
let cachedToken = ''
async function api(path: string, opts?: any): Promise<any> {
  try {
    const res = await fetch(`${API}${path}`, opts)
    return await res.json()
  } catch { return null }
}
async function getToken(): Promise<string> {
  if (cachedToken) return cachedToken
  const r = await api('/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'admin@acmecorp.com', password: 'admin' }) })
  if (r?.token) { cachedToken = r.token; return r.token }
  return ''
}
async function authPost(path: string, body: any) {
  const t = await getToken()
  return api(path, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + t }, body: JSON.stringify(body) })
}

// ===========================================================================
// DATA FETCH
// ===========================================================================
async function fetchAll() {
  const [m, d, tl, ag, pol] = await Promise.all([
    api('/metrics'), api('/diagnostics'),
    api('/audit/timeline?limit=40'), api('/agents'), api('/policies'),
  ])
  const tasks = await api('/audit?limit=80')
  state.metrics = m; state.diagnostics = d
  state.events = tl?.timeline || []
  state.tasks = tasks?.data || []
  state.agents = ag?.data || []
  state.policies = pol?.data || []
  state.connected = m !== null && !m.error
  state.mode = d?.mode || 'unknown'
}

// ===========================================================================
// OPERATOR ACTIONS
// ===========================================================================
async function opRetryTask(taskId: string) {
  const agents = state.agents
  const agentId = agents.length > 0 ? agents[0].id : 'agent_demo'
  const r = await authPost('/agent/run', { agentId, taskId })
  state.lastAction = r?.id ? `Run started: ${r.id.substring(0, 12)}` : `Failed: ${r?.error?.message || 'unknown'}`
  state.lastActionTime = Date.now()
  fetchAll()
}

async function opFailRun(runId: string) {
  const t = await getToken()
  await api(`/run/${runId}/fail`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + t }, body: JSON.stringify({ error: 'Operator terminated' }) })
  state.lastAction = `Run ${runId.substring(0, 12)} marked failed`
  state.lastActionTime = Date.now()
  fetchAll()
}

async function opSeedDemos() {
  const t = await getToken()
  for (let i = 0; i < 3; i++) {
    await api('/task', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + t }, body: JSON.stringify({ payload: { description: `Demo ${i + 1}`, type: 'demo' } }) })
  }
  state.lastAction = 'Seeded 3 demo tasks'
  state.lastActionTime = Date.now()
  fetchAll()
}

function opSelectDetail(type: string, item: any) {
  state.detailType = type
  state.detailItem = item
}

async function opExecuteCommand(cmd: string) {
  const parts = cmd.trim().split(/\s+/)
  const verb = parts[0]; const arg = parts[1]

  switch (verb) {
    case 'retry': case 'r': if (arg) { await opRetryTask(arg); return '✓ retrying ' + arg } break
    case 'fail': case 'f': if (arg) { await opFailRun(arg); return '✓ failing ' + arg } break
    case 'seed': await opSeedDemos(); return '✓ seeded 3 demo tasks'
    case 'diag': case 'd': fetchAll(); return `✓ refreshed | mode: ${state.mode}`
    case 'agents': case 'a': state.selectedList = 'agents'; return '✓ agents list'
    case 'queue': case 'q': state.selectedList = 'queue'; return '✓ queue list'
    case 'events': case 'e': state.selectedList = 'events'; return '✓ events list'
    case 'policies': case 'p': state.selectedList = 'policies'; return '✓ policies list'
    case 'help': case 'h': return 'retry <id> | fail <id> | seed | diag | agents | queue | events | policies | :q'
    default: return '? unknown: ' + verb + ' (try "help")'
  }
  return ''
}

// ===========================================================================
// RENDER
// ===========================================================================
function renderHeader(s: Screen): string[] {
  const { cols } = s.dims
  const mode = state.mode.toUpperCase()
  const modeColor = state.mode === 'demo' ? C.amber : C.green
  const status = state.connected
    ? `${FG(C.green)}● ${mode}${RESET}`
    : `${FG(C.red)}● OFFLINE${RESET}`

  const left = `${FG(C.green)}PASSPORT AGENT${RESET}${DIM}  Operational Console${RESET}`
  const right = `${status}${DIM}  ${API}  ${new Date().toLocaleTimeString()}${RESET}`
  const space = cols - [...left].length - [...right.replace(/\x1b\[[0-9;]*m/g, '')].length
  return [
    `${BG(C.bg)}${pad(left + ' '.repeat(Math.max(space, 1)) + right, cols)}${RESET}`,
    `${BG(C.bgl)}${DIM}${line(cols)}${RESET}`,
  ]
}

function renderQueuePanel(s: Screen, height: number, offset: number): string[][] {
  const { cols } = s.dims
  const w = Math.floor(cols / 2) - 1
  const rows: string[] = []

  const pending = state.tasks.filter(t => t.status === 'pending' || t.status === 'queued')
  const failed = state.tasks.filter(t => t.status === 'failed')

  rows.push(`${BOLD}Queue${RESET}${DIM}  pending:${pending.length}  failed:${failed.length}${RESET}`)
  rows.push(DIM + line(w, '·') + RESET)

  const items = [...pending.slice(0, 6), ...(pending.length < 4 ? failed.slice(0, 3) : [])]
  for (let i = 0; i < Math.min(items.length, height - 3); i++) {
    const item = items[i]
    const isSelected = state.selectedList === 'queue' && state.selectedIdx === i
    const prefix = isSelected ? `${FG(C.green)}▸${RESET} ` : '  '
    const badge = item.status === 'failed'
      ? `${FG(C.red)}FAIL${RESET}`
      : `${FG(C.amber)}PEND${RESET}`
    const id = (item.taskId || item.id || '').substring(0, 10)
    const desc = (item.payload?.description || item.payload?.type || item.error || '').substring(0, w - 30)
    const bg = isSelected ? BG(C.bgl) : ''
    rows.push(`${bg}${prefix}${DIM}${id}${RESET} ${badge} ${trunc(desc, w - 30)}${bg ? RESET : ''}`)
  }
  if (items.length === 0) rows.push(`  ${DIM}no pending tasks${RESET}`)

  const result: string[] = boxed(w, 'Queue', rows)
  return result.map(r => ({ text: r, offset }))
}

function renderAgentsPanel(s: Screen, height: number, offset: number): string[][] {
  const { cols } = s.dims
  const w = Math.floor(cols / 2) - 1
  const rows: string[] = []

  rows.push(`${BOLD}Agents${RESET}${DIM}  ${state.agents.length} registered${RESET}`)
  rows.push(DIM + line(w, '·') + RESET)

  for (let i = 0; i < Math.min(state.agents.length, height - 3); i++) {
    const a = state.agents[i]
    const isSelected = state.selectedList === 'agents' && state.selectedIdx === i
    const prefix = isSelected ? `${FG(C.green)}▸${RESET} ` : '  '
    const bg = isSelected ? BG(C.bgl) : ''
    rows.push(`${bg}${prefix}${DIM}${a.id.substring(0, 12)}${RESET} ${trunc(a.name, w - 25)} ${a.status === 'active' ? `${FG(C.green)}●${RESET}` : `${FG(C.red)}●${RESET}`}${bg ? RESET : ''}`)
  }
  if (state.agents.length === 0) rows.push(`  ${DIM}no agents${RESET}`)

  return boxed(w, 'Agents', rows).map(r => ({ text: r, offset }))
}

function renderEventsPanel(s: Screen, height: number, offset: number): string[][] {
  const { cols } = s.dims
  const w = cols
  const rows: string[] = []

  rows.push(`${BOLD}Live Events${RESET}${DIM}  ${state.events.length} entries${RESET}`)
  rows.push(DIM + line(w, '·') + RESET)

  for (let i = 0; i < Math.min(state.events.length, height - 2); i++) {
    const e = state.events[i]
    const color = e.decision === 'allow' ? FG(C.green) : e.decision === 'deny' ? FG(C.red) : FG(C.amber)
    const time = new Date(e.timestamp).toLocaleTimeString()
    const tool = (e.tool || 'transition').substring(0, 20)
    const reason = (e.reason || '')
    rows.push(`${DIM}${time}${RESET} ${color}${pad(trunc(tool, 20), 20)}${RESET} ${DIM}${trunc(reason, w - 50)}${RESET}`)
  }
  if (state.events.length === 0) rows.push(`  ${DIM}no events yet — run tasks to generate${RESET}`)

  return boxed(w, 'Live Events', rows).map(r => ({ text: r, offset }))
}

function renderDetailPane(s: Screen, height: number, offset: number): string[][] {
  const { cols } = s.dims
  const w = cols
  const rows: string[] = []

  if (!state.detailItem) {
    rows.push(`${BOLD}Detail${RESET}${DIM}  select an item to inspect${RESET}`)
    rows.push(DIM + line(w, '·') + RESET)
    rows.push(`  ${DIM}Use ↑↓ to navigate, Enter to select${RESET}`)
    rows.push(`  ${DIM}Type : for commands${RESET}`)
    return boxed(w, 'Detail', rows).map(r => ({ text: r, offset }))
  }

  const item = state.detailItem
  rows.push(`${BOLD}${state.detailType}${RESET}${DIM}  ${trunc(item.id || item.taskId || item.agentId || '', 30)}${RESET}`)
  rows.push(DIM + line(w, '·') + RESET)

  const fields = Object.entries(item).filter(([k]) => !k.startsWith('_') && k !== 'timestamp' && k !== 'createdAt' && k !== 'updatedAt')
  for (const [key, value] of fields.slice(0, height - 3)) {
    const val = typeof value === 'object' ? JSON.stringify(value).substring(0, w - 30) : String(value).substring(0, w - 30)
    rows.push(`  ${FG(C.cyan)}${pad(key, 16)}${RESET} ${DIM}${trunc(val, w - 20)}${RESET}`)
  }

  return boxed(w, `Detail: ${state.detailType}`, rows).map(r => ({ text: r, offset }))
}

function renderCommandBar(s: Screen): string[] {
  const { cols } = s.dims
  const bars: string[] = []

  if (state.commandMode) {
    bars.push(`${BG(C.bgl)}${FG(C.green)} : ${state.commandBuffer}${RESET}${' '.repeat(Math.max(cols - state.commandBuffer.length - 4, 0))}`)
  } else if (state.lastAction && Date.now() - state.lastActionTime < 5000) {
    bars.push(`${BG(C.bgl)}${FG(C.amber)} ${trunc(state.lastAction, cols - 2)}${RESET}`)
  } else {
    const shortcuts = `[↑↓j/k]nav  [enter]inspect  [esc]back  [:]cmd  [s]seed  [r]retry  [q]quit`
    bars.push(`${BG(C.bgl)}${DIM} ${trunc(shortcuts, cols - 2)}${RESET}`)
  }

  return bars
}

// ===========================================================================
// MAIN RENDER
// ===========================================================================
function render(s: Screen) {
  const { rows, cols } = s.dims
  const buffer: string[] = []

  // Header (2 rows)
  buffer.push(...renderHeader(s))

  // Panel height: half the remaining space (minus 3 for events, 3 for detail, 1 for cmd)
  const availH = rows - buffer.length - 3 - 3 - 1
  const panelH = Math.max(Math.floor(availH / 2), 4)

  // Main area: queue | agents (or detail)
  let leftRows: string[] = []
  let rightRows: string[] = []

  if (state.detailItem) {
    leftRows = renderQueuePanel(s, panelH, 0).map(r => r.text)
    rightRows = renderDetailPane(s, panelH, Math.floor(cols / 2)).map(r => r.text)
  } else {
    switch (state.selectedList) {
      case 'agents': case 'policies':
        leftRows = renderAgentsPanel(s, panelH, 0).map(r => r.text)
        rightRows = renderDetailPane(s, panelH, Math.floor(cols / 2)).map(r => r.text)
        break
      default:
        leftRows = renderQueuePanel(s, panelH, 0).map(r => r.text)
        rightRows = renderAgentsPanel(s, panelH, Math.floor(cols / 2)).map(r => r.text)
    }
  }

  // Merge left/right side by side
  const lw = Math.floor(cols / 2)
  const combined = Math.max(leftRows.length, rightRows.length)
  for (let i = 0; i < combined; i++) {
    const l = leftRows[i] || ''
    const r = rightRows[i] || ''
    buffer.push(pad(l, lw) + r)
  }

  // Events panel
  buffer.push(...renderEventsPanel(s, 3, 0).map(r => r.text))

  // Detail if item selected
  if (state.detailItem) {
    buffer.push(...renderDetailPane(s, 3, 0).map(r => r.text))
  }

  // Command bar
  buffer.push(...renderCommandBar(s))

  // Fill remaining
  while (buffer.length < rows) buffer.push('')

  s.draw(buffer)
}

// ===========================================================================
// KEYBOARD HANDLER
// ===========================================================================
function getList(): any[] {
  switch (state.selectedList) {
    case 'agents': return state.agents
    case 'policies': return state.policies
    case 'events': return state.events
    default: {
      const pending = state.tasks.filter(t => t.status === 'pending' || t.status === 'queued')
      return pending.length > 0 ? pending : state.tasks
    }
  }
}

function handleCommand(cmd: string) {
  opExecuteCommand(cmd).then(msg => {
    if (msg) { state.lastAction = msg; state.lastActionTime = Date.now() }
    if (state.lastAction.includes('✓')) {
      state.detailItem = null; state.detailType = ''
    }
  })
}

function setupKeyboard(s: Screen) {
  readline.emitKeypressEvents(process.stdin)
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(true)
    process.stdin.on('keypress', async (_str, key: any) => {
      // Command mode
      if (state.commandMode) {
        if (key.name === 'escape') { state.commandMode = false; state.commandBuffer = ''; return }
        if (key.name === 'return' || key.name === 'enter') {
          state.commandHistory.push(state.commandBuffer)
          handleCommand(state.commandBuffer)
          state.commandMode = false; state.commandBuffer = ''
          return
        }
        if (key.name === 'backspace') { state.commandBuffer = state.commandBuffer.slice(0, -1); return }
        if (key.sequence && key.sequence.length === 1) { state.commandBuffer += key.sequence; return }
        return
      }

      // Normal mode
      if (key.ctrl && key.name === 'c') { s.shutdown(); console.log('Stopped.'); process.exit(0) }

      switch (key.name) {
        case 'q': s.shutdown(); console.log('Stopped.'); process.exit(0)
        case ':': state.commandMode = true; state.commandBuffer = ''; break
        case 'j': case 'down': {
          const list = getList()
          state.selectedIdx = Math.min(state.selectedIdx + 1, list.length - 1)
          state.detailItem = null; state.detailType = ''
          break
        }
        case 'k': case 'up': {
          state.selectedIdx = Math.max(state.selectedIdx - 1, 0)
          state.detailItem = null; state.detailType = ''
          break
        }
        case 'return': case 'enter': {
          const list = getList()
          if (list[state.selectedIdx]) {
            const item = list[state.selectedIdx]
            const type = state.selectedList === 'agents' ? 'agent' : state.selectedList === 'events' ? 'event' : 'task'
            opSelectDetail(type, item)
          }
          break
        }
        case 'escape': state.detailItem = null; state.detailType = ''; break
        case 'r': {
          const list = getList()
          if (list[state.selectedIdx]) {
            const item = list[state.selectedIdx]
            await opRetryTask(item.taskId || item.id)
          }
          break
        }
        case 's': await opSeedDemos(); break
        case 'tab': {
          const lists: Array<'queue'|'agents'|'policies'|'events'> = ['queue', 'agents', 'policies', 'events']
          const idx = lists.indexOf(state.selectedList)
          state.selectedList = lists[(idx + 1) % lists.length]
          state.selectedIdx = 0
          state.detailItem = null; state.detailType = ''
          break
        }
        case 'd': {
          if (state.detailItem) {
            state.detailItem = null; state.detailType = ''
          } else {
            const list = getList()
            if (list[state.selectedIdx]) opSelectDetail(state.selectedList, list[state.selectedIdx])
          }
          break
        }
      }
    })
  }
}

// ===========================================================================
// MAIN
// ===========================================================================
async function main() {
  const s = new Screen()
  s.init()

  // Resize handler
  process.stdout.on('resize', () => { s.resize(); render(s) })

  // Keyboard
  setupKeyboard(s)

  // Render loop
  setInterval(() => render(s), 250)
  await fetchAll()
  render(s)
}

main().catch(err => { console.error('Fatal:', err.message); process.exit(1) })

process.on('SIGINT', () => { process.stdout.write(SHOW_CURSOR + CLEAR); console.log('Stopped.'); process.exit(0) })

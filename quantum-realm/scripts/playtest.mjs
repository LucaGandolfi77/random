// Headless playtest: runs each scene's real update loop in Node against a
// no-op canvas, driving a controller at 60Hz with no wall-clock limit.
// `npm run playtest`
import './build-playtest.mjs'
const { SCENES, ANOMALIES, makeRun, recursionPressure } = await import(
  `./playtest-entry.js?${Date.now()}`
)

/* --------------------------------------------------------- canvas mocking */

const gradient = () => ({ addColorStop: () => {} })
const makeCtx = () => {
  const noop = () => {}
  const ctx = {
    canvas: { width: 900, height: 562 },
    fillStyle: '#000',
    strokeStyle: '#000',
    lineWidth: 1,
    globalAlpha: 1,
    globalCompositeOperation: 'source-over',
    font: '',
    textAlign: 'left',
    textBaseline: 'top',
    shadowColor: '',
    shadowBlur: 0,
    lineCap: 'butt',
    lineJoin: 'miter',
    filter: 'none',
    imageSmoothingEnabled: true,
    createLinearGradient: gradient,
    createRadialGradient: gradient,
    createPattern: () => null,
    measureText: (t) => ({ width: t.length * 7 }),
    getImageData: (x, y, w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }),
    createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }),
  }
  for (const m of [
    'save', 'restore', 'beginPath', 'closePath', 'moveTo', 'lineTo', 'quadraticCurveTo',
    'bezierCurveTo', 'arc', 'arcTo', 'ellipse', 'rect', 'roundRect', 'fill', 'stroke',
    'fillRect', 'strokeRect', 'clearRect', 'clip', 'setLineDash', 'setTransform',
    'resetTransform', 'translate', 'scale', 'rotate', 'fillText', 'strokeText',
    'putImageData', 'drawImage', 'setTransform',
  ]) ctx[m] = noop
  return ctx
}

const makeCanvas = () => {
  const c = { width: 900, height: 562, style: {}, classList: { add() {}, remove() {} } }
  c.getContext = () => makeCtx()
  c.getBoundingClientRect = () => ({ left: 0, top: 0, width: 900, height: 562 })
  return c
}

globalThis.document = { createElement: () => makeCanvas() }
globalThis.window = { innerWidth: 900, innerHeight: 562, matchMedia: () => ({ matches: false }) }

/* -------------------------------------------------------------- telemetry */

const noop = () => {}
const audio = new Proxy(
  { setIntensity: noop, setMuted: noop, setVolume: noop, startAmbient: noop, dispose: noop },
  { get: (t, k) => (k in t ? t[k] : noop) },
)

/* -------------------------------------------------------------- controllers */

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v)

const controllers = {
  flux(st, run) {
    if (st.nextOrbX < 0) return { right: true }
    const dir = st.nextOrbX > st.x ? 'right' : 'left'
    const keys = { [dir]: true }
    // with certain shutters you must spread instead of smashing
    if (st.canSmash === 0 && st.nextShutterX > 0 && Math.abs(st.nextShutterX - st.x) < 90) {
      return { ...keys, alt: !st.waved }
    }
    if (!st.onGround) return keys
    const cdx = Math.abs(st.nextCrateX - st.x)
    if (st.nextCrateX > 0 && cdx < 100) return { ...keys, jump: true }
    const t = Math.abs(st.nextOrbX - st.x) / 250
    if (t < 1.0) {
      const g = run?.anomalies.includes('thin_air') ? 900 : 1500
      const v = run?.anomalies.includes('thin_air') ? 780 : 780
      const h = v * t - (g / 2) * t * t
      if (Math.abs(h - Math.abs(st.nextOrbY - st.y)) < 46) return { ...keys, jump: true }
    }
    return keys
  },
  tunnel(st) {
    if (st.need > 0 && st.wallDx < 130) {
      return st.charge < st.need + 0.18 ? { alt: true } : { right: true }
    }
    return { right: true }
  },
  interference(st) {
    if (st.amp > 0.3) return { right: true, up: true }
    if (st.amp > 0.22) return { right: true }
    return { right: true, alt: true }
  },
  entanglement(st) {
    if (st.leftPlate && st.rightPlate) return {}
    return st.ax < 800 ? { right: true } : {}
  },
  uncertainty(st) {
    return st.charge > 0.85 ? { right: true } : { right: true, alt: true }
  },
  collapser(st) {
    if (st.phase >= 1) return { up: true, jump: true }
    if (st.x > 1035) return st.charge < 0.97 ? { alt: true } : { right: true }
    if (st.charge > 0.4) return st.inBeam ? {} : { right: true }
    const wantUp = st.y <= 260
    return wantUp ? { right: true, up: true } : { right: true, down: true }
  },
}

/* ------------------------------------------------------------------ runner */

const W = 900
const H = 562
const DT = 1 / 60
const MAX_SECONDS = 240

const makeInput = () => ({
  left: false,
  right: false,
  up: false,
  down: false,
  jump: false,
  alt: false,
  jumpPressed: false,
  altPressed: false,
  pointer: null,
  pointerDown: false,
  pointerPressed: false,
  touch: false,
  anyPressed: false,
})

// the anomaly maths, checked head on before anything is simulated
{
  const mul = makeRun(['certain_walls'], 0).scoreMul
  const noTake = makeRun([], 0).scoreMul
  const both = makeRun(['thin_air', 'heavy_water'], 3).scoreMul
  console.log(`anomaly x1.45          -> ${mul === 1.45 ? 'ok' : 'FAIL'} (${mul})`)
  console.log(`declining all three    -> ${noTake === 1 ? 'ok' : 'FAIL'} (${noTake})`)
  console.log(`two anomalies + rec 3  -> ${both === 1.3 * 1.3 * 2.5 ? 'ok' : 'FAIL'} (${both})`)
  console.log(
    `recursion pressure 0/1/5 -> ${
      [0, 1, 5].every((r) => Math.abs(recursionPressure(makeRun([], r)) - (1 + r * 0.22)) < 1e-9)
        ? 'ok'
        : 'FAIL'
    }`,
  )
  console.log(
    `every region has 3+ anomalies -> ${
      Object.keys(SCENES).every((id) => ANOMALIES.filter((a) => a.region === id).length >= 3)
        ? 'ok'
        : 'FAIL'
    }`,
  )
}

const names = process.argv.slice(2).length
  ? process.argv.slice(2)
  : Object.keys(SCENES)

const RUNS = []
for (const id of names) {
  RUNS.push({ id, anomalies: [] })
  for (const a of ANOMALIES.filter((x) => x.region === id)) {
    RUNS.push({ id, anomalies: [a.id] })
  }
}

let failures = 0
for (const { id, anomalies } of RUNS) {
  const scene = SCENES[id]
  if (!scene) {
    console.log(`??    ${id}: no such scene`)
    failures++
    continue
  }
  const input = makeInput()
  const ctx = makeCtx()
  const state = scene.create({
    ctx,
    width: W,
    height: H,
    time: 0,
    dt: 0,
    input,
    audio,
    setProgress: () => {},
    addScore: () => {},
    onWin: (ending) => run.end(ending),
    onLose: () => run.end(false),
    toast: () => {},
    observation: 0,
    touch: false,
      toastActive: false,
      run: makeRun(anomalies, 0),
      pressure: recursionPressure(makeRun(anomalies, 0)),
      calm: false,
  })

  const run = { result: null, end(v) { this.result = v ?? 'win' } }
  const bot = controllers[id]
  let prev = { ...input }
  const steps = Math.round(MAX_SECONDS / DT)
  for (let i = 0; i < steps && !run.result; i++) {
    const want = bot(state.peek ? state.peek() : {})
    input.left = !!want.left
    input.right = !!want.right
    input.up = !!want.up
    input.down = !!want.down
    input.jumpPressed = !!want.jump && !prev.jump
    input.altPressed = !!want.alt && !prev.alt
    input.jump = !!want.jump
    input.alt = !!want.alt
    prev = { ...input }
    if (process.env.PT_TRACE && i % 60 === 0) {
      console.log(`   t=${(i * DT).toFixed(0)}s`, JSON.stringify(state.peek ? state.peek() : {}).slice(0, 130))
    }
    state.update({
      ctx,
      width: W,
      height: H,
      time: i * DT,
      dt: DT,
      input,
      audio,
      setProgress: () => {},
      addScore: () => {},
      onWin: (ending) => run.end(ending ?? 'win'),
      onLose: () => run.end(false),
      toast: () => {},
      observation: 0,
      touch: false,
    })
  }
  const label = anomalies.length ? `${id}+${anomalies[0]}` : id
  if (run.result === false) {
    const p = state.peek ? state.peek() : {}
    console.log(`LOSE  ${label}  ${JSON.stringify(p).slice(0, 130)}`)
    failures++
  } else if (run.result) {
    console.log(`WIN   ${label}`)
  } else {
    const p = state.peek ? state.peek() : {}
    console.log(`STALL ${label}  ${JSON.stringify(p).slice(0, 130)}`)
    failures++
  }
}

void clamp
process.exit(failures ? 1 : 0)

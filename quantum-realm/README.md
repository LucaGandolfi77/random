# QBIT — Adventures in the Uncertainty

A puzzle-platformer PWA set inside a quantum computer. You are a thing that has not
decided what it is. Six regions of the Lattice will decide for you if you let them.

Each region is a playable statement of one quantum law. You do not read the law, you
fall into it:

| Region | Law | What you actually do |
| --- | --- | --- |
| The Flux Fields | Wave–particle duality | Hold PHASE to spread into a wave and slip through shutter slats; release to snap into a particle and smash stone |
| The Barrier Reef | Quantum tunnelling | Stand still and thin out until the barrier's tunnelling probability `T ≈ e^{−2κL}` says yes |
| The Interference Marsh | Superposition & interference | Ride constructive crests; invert your own phase to walk on the dark side; nodes dissolve you |
| The Entanglement Vines | Spooky action at a distance | A rigid 200-unit tether with no signal in it. Seat both ends on the plates while the Astronomer looks elsewhere |
| The Uncertainty Bazaar | Heisenberg's principle | Charge momentum to blur yourself; blurry stalls stop being real, solid ones stay put. `Δx·Δp` is displayed live and is not adjustable |
| The Collapser | The measurement problem | Cross the hall between observation beams, phase the shield, and decide what to put in the loop inside its eye |

Before every region the Lattice offers you **three anomalies**: one way for that
region to be misbehaving. Take one and the physics really change — *Certain Walls*
makes shutter slats unsmashable, *Static Lens* means the Astronomer never quite
looks away, *Phase Echo* inverts what inverting does, *Redacted* disconnects the
measurement gauge on the Collapser's HUD so you have to watch beams with your own
eyes, *Thick Reef* widens every barrier by 40%. Each pays a real score multiplier;
declining all three pays 1.00, and the Recursion bonus stacks on top of whichever
you chose. Twenty-one of them, at least three per region. The playtest harness runs
all twenty-seven region/anomaly combinations and asserts that every one is still
clearable.

There are two endings. One of them is the good one. Neither of them is the fun one.
Clear the whole Lattice and it will invite you to read it again: each full clear
adds a **Recursion**, which scales every clock in the game and the score.

## Running it

```sh
npm install
npm run dev        # http://localhost:5173
npm run build      # static bundle in dist/, with a service worker
npm run preview
```

## Verifying it

```sh
npm test           # typecheck + lint + playtest + controls audit
npm run playtest   # every region, with and without each of its anomalies
npm run controls   # every switch, slider and button, checked for a real effect
npm run smoke      # builds, boots Chrome, walks every screen and region
```

`npm run controls` exists because a settings screen full of switches that only
*look* like they work is worse than no settings screen at all. It drives the real
UI in Chrome and asserts observable consequences: the touch pad appears and
disappears with its setting, *Reduce motion* measurably halves the canvas backing
store, *Skip the briefing* really skips, *Copy the record* still works when the
async clipboard API is missing (which is every self-hosted copy on a plain http
address), and reset really resets.

`playtest` is the interesting one. It bundles the real scene modules with esbuild,
runs their actual `update` loops against a no-op canvas in Node, and drives each
region with a scripted controller at a true 60Hz — no rendering, no wall clock, so
a level that is impossible for the bot is impossible for a reason. Every region
exposes a small `peek()` of telemetry so the controller can steer. It has earned
its keep: it is what proved the first draft of the Entanglement Vines was
geometrically unwinnable, and that the first draft of the Barrier Reef leaked the
player through a wall exactly touching it.

`smoke` needs Google Chrome; it fails on any console error or unhandled exception
while clicking through the title, map, region briefing, codex, settings, all six
regions and the result modal. It also hammers four viewport sizes mid-game to catch
listener leaks on resize, and writes screenshots to `shots/`.

## How it is built

- **React 19 + TypeScript + Vite.** The UI shell is React; the game loop is not.
- **One canvas, one loop, one `Scene` interface.** Each region is a factory that
  returns `{ update(ctx), render(ctx), peek?() }`. `GameView` owns the only
  `requestAnimationFrame` in the codebase.
- **WebGL backdrop.** `FoamBackdrop` is a raw GLSL fragment shader: domain-warped
  fBm with three superposed emitters, so the menu background is literally the same
  interference the third region is about. It renders at 55% resolution and falls
  back to a CSS gradient if WebGL is unavailable.
- **Six chord banks, one pad.** Each region gets its own mode and filter
  character — the Reef is braced fifths, the Bazaar grinds a tritone against a
  semitone — re-voiced by a slow LFO, with the pad's brightness driven by
  gameplay intensity.
- **No art assets.** Every sprite is signed-distance-field geometry, every glow is
  a radial gradient, the app icons are generated by `scripts/gen-icons.mjs` with a
  hand-rolled PNG encoder (zlib is the only dependency), and all audio is
  synthesised at runtime by `game/audio.ts` — a generative pad that re-voices
  itself every nine seconds, plus a small SFMono synth.
- **One rAF, one canvas.** The loop clamps `dt` to `[0, 1/20]` and refuses to let
  it go negative: the rAF timestamp is the time the frame *began*, which can
  predate the `performance.now()` you recorded when setting up, and a negative
  step teleports a platformer body straight through the floor.
- **Physics where it matters, fiction where it helps.** The interference field is a
  real superposition amplitude. The Heisenberg readout holds `Δx·Δp` at a constant
  and grows position blur with momentum, exactly as the principle insists. The
  entanglement tether is a real distance constraint, solved instantly, with no
  signal — which is the joke.
- **PWA.** `vite-plugin-pwa` with a generated manifest and maskable icons; the save
  file lives in `localStorage` and nothing is sent anywhere.

## Controls

`← →` move · `SPACE` jump / act · `SHIFT` or `X` hold for PHASE · `ESC` pause

Staying unobserved pays. Every region reports how observed you are, and the loop
cashes it: four seconds unobserved is a bonus, eight is better, and the chip in
the corner tells you which.

On touch devices an on-screen pad appears automatically. It can be forced on or off
in Settings, along with volume, reduced motion, and a dialogue skip.

## Honesty about the physics

It is a game. The wavefunctions are decorative, the probabilities are tuned by hand
until they felt good, and two of the regions take liberties that would horrify a
physicist. Where the game does tell the truth — that tunnelling probability collapses
exponentially with barrier thickness, that knowing where you are means not knowing
where you are going — the level is built so you cannot cheat past the lesson.

## Licence

MIT — see [LICENSE](./LICENSE). Take it, fork it, teach your own physics to it.

import { useEffect, useMemo, useState } from 'react'
import { CODEX, DIALOGUE, ENDING, NPCS, RANKINGS, SECTORS } from '../game/content'
import { draftAnomalies, makeRun, recursionPressure, safeMultiplier } from '../game/anomalies'
import type { Anomaly } from '../game/anomalies'
import { audio } from '../game/audio'
import { useGame } from '../game/store'
import { GameView } from './GameView'
import { TouchControls } from './TouchControls'
import type { Ending, SceneId } from '../game/types'

const Stars = ({ n }: { n: number }) => (
  <span className="stars" aria-label={`${n} of 3 stars`}>
    {[0, 1, 2].map((i) => (
      <i key={i} className={i < n ? 'star star--on' : 'star'} />
    ))}
  </span>
)

const rank = (id: SceneId, score: number) =>
  RANKINGS[id].find((r) => score >= r.min)?.label ?? '—'

const formatTime = (s: number) => {
  const m = Math.floor(s / 60)
  return m < 60 ? `${m}m ${Math.floor(s % 60)}s` : `${Math.floor(m / 60)}h ${m % 60}m`
}

/** A short, human-pasteable summary of the run. */
const copySave = () => {
  const g = useGame.getState()
  return [
    'QBIT — Adventures in the Uncertainty',
    `regions ${g.cleared.length}/${SECTORS.length} · laws ${g.laws.length}/${CODEX.length} · recursion ${g.recursion}`,
    `clears ${g.stats.clears} · collapses ${g.stats.collapses} · anomalies ${g.stats.anomalies}`,
    `time ${formatTime(g.seconds)}`,
  ].join('\n')
}

/* ------------------------------------------------------------------ title */

export function TitleScreen() {
  const setScreen = useGame((s) => s.setScreen)
  const cleared = useGame((s) => s.cleared)
  const [pulse, setPulse] = useState(0)

  useEffect(() => {
    const id = window.setInterval(() => setPulse((p) => (p + 1) % 4), 1600)
    return () => window.clearInterval(id)
  }, [])

  return (
    <div className="screen screen--title">
      <div className="title">
        <h1 className="title__logo">
          <span className="title__q">Q</span>BIT
        </h1>
        <p className="title__sub">Adventures in the Uncertainty</p>
        <p className="title__tag">
          You are a thing that has not decided what it is. Six regions of the Lattice will
          decide for you if you let them.
        </p>
        <div className="title__menu">
          <button className="btn btn--primary" type="button" onClick={() => setScreen('map')}>
            {cleared.length ? 'Resume' : 'Begin'}
          </button>
          <button className="btn" type="button" onClick={() => setScreen('codex')}>
            The Codex
          </button>
          <button className="btn" type="button" onClick={() => setScreen('settings')}>
            Settings
          </button>
        </div>
        <p className="title__foot">
          {[
            'a wave is also a marble',
            'nothing is solid until you insist',
            'the machine is old and very sure',
            'three ways to be wrong, pick one',
            'do not be measured',
          ][pulse]}
        </p>
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------- map */

export function MapScreen() {
  const setScreen = useGame((s) => s.setScreen)
  const start = useGame((s) => s.start)
  const stars = useGame((s) => s.stars)
  const best = useGame((s) => s.best)
  const cleared = useGame((s) => s.cleared)
  const laws = useGame((s) => s.laws)
  const recursion = useGame((s) => s.recursion)

  return (
    <div className="screen screen--map">
      {recursion > 0 && (
        <div className="recursion">
          <strong>Recursion {recursion}.</strong> Everything is a little less forgiving and
          worth considerably more. The Collapser has started re-reading its own notes.
        </div>
      )}
      <header className="topbar">
        <button className="btn btn--ghost" type="button" onClick={() => setScreen('title')}>
          ← Lattice
        </button>
        <div className="topbar__mid">
          <span className="chip">{cleared.length}/{SECTORS.length} regions</span>
          <span className="chip">{laws.length} laws</span>
        </div>
        <div className="topbar__right">
          <button className="btn btn--ghost" type="button" onClick={() => setScreen('codex')}>
            Codex
          </button>
          <button className="btn btn--ghost" type="button" onClick={() => setScreen('settings')}>
            ⚙
          </button>
        </div>
      </header>

      <div className="map">
        {SECTORS.map((sector) => {
          const locked = sector.requires ? !cleared.includes(sector.requires) : false
          const done = cleared.includes(sector.id)
          return (
            <button
              key={sector.id}
              className={`card${locked ? ' card--locked' : ''}${done ? ' card--done' : ''}`}
              type="button"
              disabled={locked}
              onClick={() => {
                audio.unlock()
                audio.blip(700)
                start(sector.id)
              }}
              style={
                {
                  '--c': sector.color,
                  '--a': sector.accent,
                } as React.CSSProperties
              }
            >
              <div className="card__index">{String(sector.index).padStart(2, '0')}</div>
              <div className="card__body">
                <h2 className="card__name">{locked ? '???' : sector.name}</h2>
                <p className="card__law">{locked ? 'Region sealed' : sector.law}</p>
                <p className="card__blurb">{locked ? 'Clear the previous region to open a door.' : sector.blurb}</p>
              </div>
              <div className="card__meta">
                <Stars n={stars[sector.id] ?? 0} />
                {best[sector.id] ? (
                  <span className="card__best">
                    {best[sector.id]} · {rank(sector.id, best[sector.id] ?? 0)} · replayable
                    with an anomaly
                  </span>
                ) : (
                  <span className="card__best card__best--dim">unvisited</span>
                )}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ codex */

export function CodexScreen() {
  const setScreen = useGame((s) => s.setScreen)
  const laws = useGame((s) => s.laws)
  const [open, setOpen] = useState<string | null>(null)

  return (
    <div className="screen screen--codex">
      <header className="topbar">
        <button className="btn btn--ghost" type="button" onClick={() => setScreen('map')}>
          ← Map
        </button>
        <div className="topbar__mid">
          <h1 className="codex__title">The Codex</h1>
        </div>
        <div className="topbar__right" />
      </header>
      <div className="codex">
        {CODEX.map((entry) => {
          const known = laws.includes(entry.id)
          return (
            <article key={entry.id} className={`codex__entry${known ? '' : ' codex__entry--locked'}`}>
              <button
                className="codex__head"
                type="button"
                disabled={!known}
                onClick={() => setOpen(open === entry.id ? null : entry.id)}
              >
                <h2>{known ? entry.law : 'Undiscovered law'}</h2>
                <code>{known ? entry.formula : 'ψ ─── ?'}</code>
              </button>
              {known && open === entry.id && (
                <div className="codex__body">
                  <p>{entry.plain}</p>
                  <p className="codex__weird">{entry.weird}</p>
                </div>
              )}
              {known && open !== entry.id && <p className="codex__tease">tap to read</p>}
            </article>
          )
        })}
      </div>
      <p className="codex__foot">
        {laws.length === 0
          ? 'Nothing recorded yet. The Lattice does not hand out laws; it drops them on you.'
          : `${laws.length} of ${CODEX.length} recorded. A law is only yours once you have been on the wrong side of it.`}
      </p>
    </div>
  )
}

/* --------------------------------------------------------------- settings */

export function SettingsScreen() {
  const setScreen = useGame((s) => s.setScreen)
  const muted = useGame((s) => s.muted)
  const toggleMute = useGame((s) => s.toggleMute)
  const volume = useGame((s) => s.volume)
  const setVolume = useGame((s) => s.setVolume)
  const showTouch = useGame((s) => s.showTouch)
  const setShowTouch = useGame((s) => s.setShowTouch)
  const reduceMotion = useGame((s) => s.reduceMotion)
  const setReduceMotion = useGame((s) => s.setReduceMotion)
  const skipIntro = useGame((s) => s.skipIntro)
  const setSkipIntro = useGame((s) => s.setSkipIntro)
  const photosensitive = useGame((s) => s.photosensitive)
  const setPhotosensitive = useGame((s) => s.setPhotosensitive)
  const reset = useGame((s) => s.reset)
  const cleared = useGame((s) => s.cleared)
  const laws = useGame((s) => s.laws)
  const recursion = useGame((s) => s.recursion)
  const stats = useGame((s) => s.stats)
  const seconds = useGame((s) => s.seconds)
  const best = useGame((s) => s.best)
  const [confirm, setConfirm] = useState(false)
  const [copied, setCopied] = useState(false)

  /**
   * navigator.clipboard is undefined outside a secure context, which is exactly
   * what a phone on the same wifi as a self-hosted copy of this will be.
   */
  const copyRecord = () => {
    const text = copySave()
    const legacy = () => {
      const ta = document.createElement('textarea')
      ta.value = text
      ta.setAttribute('readonly', '')
      ta.style.cssText = 'position:fixed;top:-1000px;opacity:0'
      document.body.appendChild(ta)
      ta.select()
      const done = document.execCommand?.('copy') ?? false
      ta.remove()
      return done
    }
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).catch(legacy)
    } else {
      legacy()
    }
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1800)
  }
  const bestOverall = Math.max(0, ...Object.values(best).map((v) => v ?? 0))

  return (
    <div className="screen screen--settings">
      <header className="topbar">
        <button className="btn btn--ghost" type="button" onClick={() => setScreen('map')}>
          ← Map
        </button>
        <div className="topbar__mid">
          <h1 className="codex__title">Settings</h1>
        </div>
        <div className="topbar__right" />
      </header>

      <div className="settings">
        <label className="row">
          <span>Mute</span>
          <input type="checkbox" checked={muted} onChange={toggleMute} />
        </label>
        <label className="row">
          <span>Volume</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={volume}
            onChange={(e) => {
              setVolume(Number(e.target.value))
              audio.setVolume(Number(e.target.value))
            }}
          />
        </label>
        <label className="row">
          <span>Touch controls</span>
          <select
            value={showTouch === null ? 'auto' : showTouch ? 'on' : 'off'}
            onChange={(e) =>
              setShowTouch(e.target.value === 'auto' ? null : e.target.value === 'on')
            }
          >
            <option value="auto">Auto</option>
            <option value="on">Always on</option>
            <option value="off">Off</option>
          </select>
        </label>
        <label className="row">
          <span>Reduce motion</span>
          <input
            type="checkbox"
            checked={reduceMotion}
            onChange={(e) => setReduceMotion(e.target.checked)}
          />
        </label>
        <label className="row">
          <span>Reduce flashes</span>
          <input
            type="checkbox"
            checked={photosensitive}
            onChange={(e) => setPhotosensitive(e.target.checked)}
          />
        </label>
        <p className="settings__hint">
          Reduce motion also halves the resolution of the world and calms the backdrop shader.
          Reduce flashes switches off the screen shake and the white-out when something measures
          you. Either one on means both on.
        </p>
        <label className="row">
          <span>Skip the briefing</span>
          <input
            type="checkbox"
            checked={skipIntro}
            onChange={(e) => setSkipIntro(e.target.checked)}
          />
        </label>

        <div className="row row--danger">
          <span>Erase the record</span>
          {confirm ? (
            <>
              <button
                className="btn btn--danger"
                type="button"
                onClick={() => {
                  reset()
                  setConfirm(false)
                  setScreen('title')
                }}
              >
                Yes, unmake everything
              </button>
              <button className="btn btn--ghost" type="button" onClick={() => setConfirm(false)}>
                No
              </button>
            </>
          ) : (
            <button className="btn btn--ghost" type="button" onClick={() => setConfirm(true)}>
              Reset progress
            </button>
          )}
        </div>

        <section className="chart">
          <h2 className="chart__title">The record of the Lattice</h2>
          <dl className="chart__grid">
            {[
              ['Regions read', `${cleared.length} / ${SECTORS.length}`],
              ['Laws recorded', `${laws.length} / ${CODEX.length}`],
              ['Recursions', String(recursion)],
              ['Times it held', String(stats.clears)],
              ['Times it collapsed', String(stats.collapses)],
              ['Anomalies taken', String(stats.anomalies)],
              ['Time in the Lattice', formatTime(seconds)],
              ['Best single reading', String(bestOverall)],
            ].map(([k, v]) => (
              <div key={k} className="chart__cell">
                <dt>{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
          <div className="chart__actions">
            <button className="btn btn--ghost" type="button" onClick={copyRecord}>
              {copied ? 'Copied' : 'Copy the record'}
            </button>
            <button className="btn btn--ghost" type="button" onClick={() => setScreen('title')}>
              Back to the title
            </button>
          </div>
        </section>

        <p className="settings__note">
          QBIT is a physics toy that happens to be a game. It is wrong about several things on
          purpose, and the parts it is right about are worth the walk.
        </p>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------- play */

type Phase = 'intro' | 'draft' | 'playing' | 'paused' | 'result'

interface Outcome {
  won: boolean
  score: number
  ending?: Ending
}

interface Result extends Outcome {
  stars: number
}

export function PlayScreen() {
  const id = useGame((s) => s.active) as SceneId | null
  const setScreen = useGame((s) => s.setScreen)
  const skipIntro = useGame((s) => s.skipIntro)

  if (!id || !SECTORS.some((s) => s.id === id)) {
    return (
      <div className="screen">
        <button className="btn" type="button" onClick={() => setScreen('map')}>
          Back
        </button>
      </div>
    )
  }

  // Remounting on sector change resets the run without an effect.
  return <PlayRun key={`${id}:${skipIntro}`} id={id} skipIntro={skipIntro} />
}

function PlayRun({ id, skipIntro }: { id: SceneId; skipIntro: boolean }) {
  const setScreen = useGame((s) => s.setScreen)
  const finish = useGame((s) => s.finish)
  const recordEnding = useGame((s) => s.recordEnding)
  const best = useGame((s) => s.best)
  const cleared = useGame((s) => s.cleared)
  const recursion = useGame((s) => s.recursion)
  const setRecursion = useGame((s) => s.setRecursion)
  const photosensitive = useGame((s) => s.photosensitive)
  const addStat = useGame((s) => s.addStat)

  // the draft is seeded once per region per Recursion level, so a rerun of the
  // same attempt offers the same three anomalies
  const [seed] = useState(() => Math.floor(Math.random() * 0xffffffff))
  const [anomalies, setAnomalies] = useState<Anomaly[]>([])
  const [phase, setPhase] = useState<Phase>(skipIntro ? 'draft' : 'intro')
  const [runId, setRunId] = useState(0)
  const [line, setLine] = useState(0)
  const [result, setResult] = useState<Result | null>(null)

  const sector = SECTORS.find((s) => s.id === id)!
  const offer = useMemo(() => draftAnomalies(id, seed), [id, seed])
  const run = useMemo(
    () => makeRun(anomalies.map((a) => a.id), recursion),
    [anomalies, recursion],
  )
  const pressure = recursionPressure(run)

  const start = () => {
    audio.unlock()
    setPhase('playing')
  }

  const onResult = ({ won, score, ending }: Outcome) => {
    const stars = won ? sector.grade(score) : 0
    if (won) {
      finish(id, score, stars)
      addStat('clears')
      if (ending) {
        recordEnding(ending)
        // a full reading of the Lattice invites you to read it again, harder
        if (cleared.length === SECTORS.length) setRecursion(recursion + 1)
      }
    } else {
      addStat('collapses')
    }
    setResult({ won, score, stars, ending })
    setPhase('result')
  }

  const take = (a: Anomaly | null) => {
    if (a) addStat('anomalies')
    setAnomalies(a ? [a] : [])
    start()
  }

  const retry = () => {
    setRunId((r) => r + 1)
    setPhase('playing')
  }

  const dialogue = DIALOGUE[id]
  const isFinale = id === 'collapser'

  return (
    <div className="screen screen--play">
      {(phase === 'playing' || phase === 'paused' || phase === 'result') && (
        <>
          <div className="playbar">
            <button
              className="btn btn--ghost"
              type="button"
              onClick={() => setScreen('map')}
            >
              ← Map
            </button>
            <div className="playbar__title">
              {sector.name}
              {anomalies.length > 0 && (
                <span className="playbar__anomaly"> · {anomalies[0].name}</span>
              )}
              {recursion > 0 && <span className="playbar__anomaly"> · recursion {recursion}</span>}
            </div>
            <button className="btn btn--ghost" type="button" onClick={() => setPhase('paused')}>
              ⏸
            </button>
          </div>
          <GameView
            sceneId={id}
            runId={runId}
            run={run}
            pressure={pressure}
            paused={phase !== 'playing'}
            photosensitive={photosensitive}
            onResult={onResult}
            onQuit={() => setPhase('paused')}
          />
          {phase === 'playing' && <TouchControls />}
        </>
      )}

      {phase === 'intro' && (
        <div className="modal">
          <div className="modal__card modal__card--wide">
            <p className="modal__kicker">Region {String(sector.index).padStart(2, '0')}</p>
            <h1 className="modal__title">{sector.name}</h1>
            <p className="modal__law">{sector.law}</p>

            <p className="modal__body">{sector.blurb}</p>

            <div className="dialogue">
              <p
                className="dialogue__who"
                style={{ color: NPCS.find((n) => n.name === dialogue[0].speaker)?.color }}
              >
                {dialogue[0].speaker}
              </p>
              <p className="dialogue__line">{dialogue[0].lines[line]}</p>
              <div className="dialogue__nav">
                <button
                  className="btn btn--ghost"
                  type="button"
                  disabled={line === 0}
                  onClick={() => setLine((l) => Math.max(0, l - 1))}
                >
                  ←
                </button>
                <span className="dialogue__count">
                  {line + 1}/{dialogue[0].lines.length}
                </span>
                <button
                  className="btn btn--ghost"
                  type="button"
                  disabled={line === dialogue[0].lines.length - 1}
                  onClick={() => setLine((l) => l + 1)}
                >
                  →
                </button>
              </div>
            </div>

            <ul className="controls">
              {[
                '← →  move',
                'SPACE  jump / act',
                'HOLD SHIFT (PHASE)  spread out, get thin, invert',
                'ESC  back to the map',
              ].map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>

            <div className="modal__actions">
              <button className="btn btn--ghost" type="button" onClick={() => setScreen('map')}>
                Not yet
              </button>
              <button className="btn btn--primary" type="button" onClick={() => setPhase('draft')}>
                See how it will misbehave →
              </button>
            </div>
          </div>
        </div>
      )}

      {phase === 'draft' && (
        <div className="modal">
          <div className="modal__card modal__card--wide">
            <p className="modal__kicker">Anomaly draft</p>
            <h1 className="modal__title">How will this region misbehave?</h1>
            <p className="modal__body">
              The Lattice is not required to be consistent. Take one of these and the physics
              really do change — the score pays for the trouble. Decline all three and the
              region is worth {Math.round(safeMultiplier(recursion) * 100)}%.
              {recursion > 0 && ' Something else is also wrong with the machine. Nobody will say what.'}
            </p>

            <div className="draft">
              {offer.map((a) => (
                <button key={a.id} className="draft__card" type="button" onClick={() => take(a)}>
                  <span className="draft__name">{a.name}</span>
                  <span className="draft__brief">{a.brief}</span>
                  <span className="draft__cost">{a.cost}</span>
                  <span className="draft__mul">×{a.scoreMul.toFixed(2)} score</span>
                </button>
              ))}
              <button className="draft__card draft__card--safe" type="button" onClick={() => take(null)}>
                <span className="draft__name">Nothing, thank you</span>
                <span className="draft__brief">
                  The region behaves itself. You keep every mote and every barrier.
                </span>
                <span className="draft__cost">The Lattice is disappointed in you.</span>
                <span className="draft__mul">×{safeMultiplier(recursion).toFixed(2)} score</span>
              </button>
            </div>

            <div className="modal__actions">
              <button className="btn btn--ghost" type="button" onClick={() => setPhase('intro')}>
                ← Back
              </button>
            </div>
          </div>
        </div>
      )}

      {phase === 'paused' && (
        <div className="modal">
          <div className="modal__card">
            <p className="modal__kicker">Held</p>
            <h1 className="modal__title">The Lattice waits.</h1>
            <p className="modal__body">
              {sector.name}
              {anomalies.length > 0 ? ` · ${anomalies[0].name}` : ''}
              {recursion > 0 ? ` · recursion ${recursion}` : ''}
            </p>
            {anomalies.length > 0 && (
              <p className="modal__flavour">{anomalies[0].brief}</p>
            )}
            <div className="modal__actions">
              <button className="btn btn--ghost" type="button" onClick={() => setScreen('map')}>
                Leave the region
              </button>
              <button className="btn btn--ghost" type="button" onClick={retry}>
                Start over
              </button>
              <button className="btn btn--primary" type="button" onClick={() => setPhase('playing')}>
                Resume
              </button>
            </div>
          </div>
        </div>
      )}

      {phase === 'result' && result && (
        <div className="modal">
          <div className="modal__card">
            <p className="modal__kicker">{result.won ? 'Region stable' : 'Region collapsed'}</p>
            <h1 className="modal__title">{result.won ? sector.law : 'A definite nothing'}</h1>
            {result.won ? (
              <>
                <Stars n={result.stars} />
                <p className="modal__body">
                  Score <strong>{result.score}</strong> · {rank(id, result.score)} · best{' '}
                  {best[id] ?? 0}
                </p>
                <p className="modal__flavour">
                  {isFinale
                    ? result.ending === 'bad'
                      ? ENDING.bad.body
                      : ENDING.good.body
                    : CODEX.find((c) => c.id === sector.lawId)?.weird}
                </p>
              </>
            ) : (
              <p className="modal__body">
                The Lattice settled on an answer without you. Score {result.score} — the answer
                was not a particularly good one.
              </p>
            )}
            <div className="modal__actions">
              <button className="btn btn--ghost" type="button" onClick={() => setPhase('draft')}>
                Try another way
              </button>
              <button className="btn btn--primary" type="button" onClick={() => setScreen('map')}>
                {cleared.length === SECTORS.length ? 'The Lattice' : 'Next region'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { SECTORS } from './content'
import type { SceneId } from './types'

export type Screen = 'title' | 'map' | 'codex' | 'settings' | 'play'

export interface Progress {
  /** Best stars (0-3) per sector. */
  stars: Partial<Record<SceneId, number>>
  best: Partial<Record<SceneId, number>>
  cleared: SceneId[]
  laws: string[]
  endings: ('good' | 'bad')[]
  /** Total time played, seconds. */
  seconds: number
  /** How many times the whole Lattice has been read. 0 on the first pass. */
  recursion: number
  stats: { clears: number; collapses: number; anomalies: number; motes: number }
}

interface GameState extends Progress {
  screen: Screen
  /** Sector currently loaded into the play screen, or null. */
  active: SceneId | null
  muted: boolean
  volume: number
  showTouch: boolean | null
  reduceMotion: boolean
  skipIntro: boolean
  photosensitive: boolean
  setScreen: (s: Screen) => void
  start: (id: SceneId) => void
  finish: (id: SceneId, score: number, stars: number) => void
  addSeconds: (s: number) => void
  recordEnding: (e: 'good' | 'bad') => void
  setRecursion: (n: number) => void
  addStat: (key: keyof GameState['stats'], n?: number) => void
  toggleMute: () => void
  setVolume: (v: number) => void
  setShowTouch: (v: boolean | null) => void
  setReduceMotion: (v: boolean) => void
  setSkipIntro: (v: boolean) => void
  setPhotosensitive: (v: boolean) => void
  reset: () => void
}

const initial: Progress = {
  stars: {},
  best: {},
  cleared: [],
  laws: [],
  endings: [],
  seconds: 0,
  recursion: 0,
  stats: { clears: 0, collapses: 0, anomalies: 0, motes: 0 },
}

export const useGame = create<GameState>()(
  persist(
    (set) => ({
      ...initial,
      screen: 'title',
      active: null,
      muted: false,
      volume: 0.7,
      showTouch: null,
      reduceMotion: false,
      skipIntro: false,
      photosensitive: false,

      setScreen: (screen) => set({ screen }),
      start: (id) => set({ screen: 'play', active: id }),

      finish: (id, score, stars) =>
        set((s) => {
          const prevBest = s.best[id] ?? 0
          const prevStars = s.stars[id] ?? 0
          const lawId = SECTORS.find((x) => x.id === id)?.lawId
          const laws = lawId && !s.laws.includes(lawId) ? [...s.laws, lawId] : s.laws
          const cleared = s.cleared.includes(id) ? s.cleared : [...s.cleared, id]
          return {
            best: { ...s.best, [id]: Math.max(prevBest, score) },
            stars: { ...s.stars, [id]: Math.max(prevStars, stars) },
            cleared,
            laws,
          }
        }),

      addSeconds: (sec) => set((s) => ({ seconds: s.seconds + sec })),
      setRecursion: (recursion) => set({ recursion }),
      addStat: (key, n = 1) =>
        set((s) => ({ stats: { ...s.stats, [key]: s.stats[key] + n } })),
      recordEnding: (e) =>
        set((s) => (s.endings.includes(e) ? {} : { endings: [...s.endings, e] })),

      toggleMute: () => set((s) => ({ muted: !s.muted })),
      setVolume: (volume) => set({ volume }),
      setShowTouch: (showTouch) => set({ showTouch }),
      setReduceMotion: (reduceMotion) => set({ reduceMotion }),
      setSkipIntro: (skipIntro) => set({ skipIntro }),
      setPhotosensitive: (photosensitive) => set({ photosensitive }),
      reset: () => {
        set({ ...initial })
        try {
          localStorage.removeItem('qbit-save')
        } catch {
          /* storage unavailable */
        }
      },
    }),
    {
      name: 'qbit-save',
      partialize: (s) => ({
        stars: s.stars,
        best: s.best,
        cleared: s.cleared,
        laws: s.laws,
        endings: s.endings,
        seconds: s.seconds,
        recursion: s.recursion,
        stats: s.stats,
        muted: s.muted,
        volume: s.volume,
        showTouch: s.showTouch,
        reduceMotion: s.reduceMotion,
        skipIntro: s.skipIntro,
        photosensitive: s.photosensitive,
      }),
      version: 1,
    },
  ),
)

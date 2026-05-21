import clsx from 'clsx'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { BadgePill, GlassPanel } from './ui.jsx'

export function SplashScreen() {
  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.45 } }}
      className="fixed inset-0 z-[70] grid place-items-center bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.12),transparent_34%),rgba(9,9,20,0.84)] px-6 backdrop-blur-2xl"
    >
      <div className="relative flex flex-col items-center text-center">
        <motion.div
          className="mb-6 grid h-28 w-28 place-items-center rounded-[34px] border border-white/20 bg-[linear-gradient(135deg,rgba(255,111,54,0.82),rgba(16,224,198,0.78),rgba(255,70,184,0.78))] shadow-[0_30px_90px_rgba(0,0,0,0.35)]"
          animate={{ scale: [0.96, 1.04, 0.98], rotate: [0, 6, 0] }}
          transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
        >
          <span className="font-display text-4xl font-bold tracking-[-0.08em] text-white">W</span>
        </motion.div>
        <p className="text-[0.74rem] font-bold uppercase tracking-[0.32em] text-white/60">WURSTVERSE</p>
        <h2 className="mt-2 font-display text-3xl font-bold tracking-[-0.06em] text-white">
          Loading premium sausage lore
        </h2>
        <p className="mt-2 max-w-[18rem] text-sm text-white/72">
          Syncing DNA quizzes, horoscope static, and highly questionable condiment futures.
        </p>
        <div className="mt-6 h-1.5 w-52 overflow-hidden rounded-full bg-white/12">
          <motion.div
            className="h-full rounded-full bg-[linear-gradient(90deg,#ff6f36,#10e0c6,#ff46b8)]"
            initial={{ x: '-100%' }}
            animate={{ x: '0%' }}
            transition={{ duration: 1.6, ease: 'easeOut' }}
          />
        </div>
      </div>
    </motion.div>
  )
}

export function OnboardingFlow({ slides, onComplete }) {
  const [step, setStep] = useState(0)
  const slide = slides[step]
  const lastStep = step === slides.length - 1

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] bg-[rgba(7,7,17,0.7)] px-4 py-[max(1rem,env(safe-area-inset-top))] backdrop-blur-2xl"
    >
      <div className="mx-auto flex h-full w-full max-w-[430px] items-end">
        <GlassPanel className="w-full rounded-[34px] p-5">
          <BadgePill tone="cool">{slide.eyebrow}</BadgePill>
          <AnimatePresence mode="wait">
            <motion.div
              key={slide.title}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
              className="mt-4"
            >
              <div className="mb-5 flex items-center justify-between">
                <div className="flex gap-2">
                  {slides.map((item, index) => (
                    <span
                      key={item.title}
                      className={clsx(
                        'h-1.5 rounded-full transition-all duration-300',
                        index === step ? 'w-10 bg-[var(--text)]' : 'w-4 bg-white/10',
                      )}
                    />
                  ))}
                </div>
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[rgba(255,255,255,0.08)] text-[var(--accent-2)]">
                  <Sparkles className="h-5 w-5" />
                </span>
              </div>
              <h2 className="font-display text-[2rem] font-bold leading-[0.95] tracking-[-0.06em] text-[var(--text)]">
                {slide.title}
              </h2>
              <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{slide.body}</p>
              <div className="mt-5 rounded-[26px] border border-white/10 bg-[linear-gradient(145deg,rgba(255,111,54,0.18),rgba(16,224,198,0.12),rgba(255,70,184,0.12))] p-4">
                <p className="text-[0.7rem] font-bold uppercase tracking-[0.28em] text-[var(--muted)]">Featured ritual</p>
                <p className="mt-2 font-display text-xl font-bold tracking-[-0.04em] text-[var(--text)]">{slide.accent}</p>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  Swipe, tap, and vibe through a mobile-first loop designed for fast dopamine and slower laughter.
                </p>
              </div>
            </motion.div>
          </AnimatePresence>

          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={() => setStep(lastStep ? step : Math.min(step + 1, slides.length - 1))}
              className="inline-flex flex-1 items-center justify-center rounded-[24px] bg-[var(--text)] px-4 py-3.5 font-semibold text-[var(--bg)] transition-transform duration-200 active:scale-[0.98]"
            >
              {lastStep ? 'Ready to grill' : 'Next scene'}
              <ArrowRight className="ml-2 h-4 w-4" />
            </button>
            {lastStep ? (
              <button
                type="button"
                onClick={onComplete}
                className="inline-flex items-center justify-center rounded-[24px] border border-white/12 bg-white/8 px-5 py-3.5 font-semibold text-[var(--text)] transition-transform duration-200 active:scale-[0.98]"
              >
                Enter
              </button>
            ) : null}
          </div>
        </GlassPanel>
      </div>
    </motion.div>
  )
}

export function BottomNav({ tabs, activeTab, onSelect }) {
  return (
    <div className="tab-bar">
      <div className="glass-panel relative flex items-center justify-between rounded-[32px] px-2 py-2">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = tab.id === activeTab

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onSelect(tab.id)}
              className="relative flex flex-1 flex-col items-center justify-center gap-1 rounded-[24px] px-2 py-2 text-center"
            >
              {isActive ? (
                <motion.span
                  layoutId="tab-pill"
                  className="absolute inset-0 rounded-[24px] bg-[linear-gradient(135deg,rgba(255,111,54,0.22),rgba(16,224,198,0.18),rgba(255,70,184,0.18))]"
                  transition={{ type: 'spring', stiffness: 360, damping: 30 }}
                />
              ) : null}
              <span className="relative z-10 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/8">
                <Icon className={clsx('h-4.5 w-4.5', isActive ? 'text-[var(--text)]' : 'text-[var(--muted)]')} />
              </span>
              <span
                className={clsx(
                  'relative z-10 text-[0.66rem] font-bold uppercase tracking-[0.18em]',
                  isActive ? 'text-[var(--text)]' : 'text-[var(--muted)]',
                )}
              >
                {tab.label}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
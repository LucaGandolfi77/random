import clsx from 'clsx'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowUpRight,
  BadgeCheck,
  Bookmark,
  ChevronDown,
  ChevronUp,
  Flame,
  Heart,
  MessageCircle,
  Play,
  Share2,
  SlidersHorizontal,
  Sparkles,
  Star,
  Trophy,
  Zap,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import {
  getPersonalityById,
} from '../data/mockData.js'
import {
  BadgePill,
  GlassPanel,
  ProgressRing,
  SausageAvatar,
  SectionHeading,
  SkeletonCard,
} from './ui.jsx'

function ReactionCluster({ cardId, reactions, counts, onReact }) {
  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {reactions.map((reaction) => (
        <button
          key={`${cardId}-${reaction}`}
          type="button"
          onClick={() => onReact(cardId, reaction)}
          className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/8 px-3 py-2 text-xs font-semibold text-[var(--text)] transition-transform duration-200 active:scale-[0.98]"
        >
          <span>{reaction}</span>
          <span className="text-[var(--muted)]">{counts?.[reaction] ?? 0}</span>
        </button>
      ))}
    </div>
  )
}

export function FeedSection({
  loading,
  resultPersonality,
  feedCards,
  pollValue,
  reactions,
  onPollVote,
  onReact,
  dailyHoroscope,
  leaderboard,
  onVoteLeaderboard,
}) {
  return (
    <section className="space-y-4">
      <GlassPanel
        className="rounded-[32px] p-5"
        style={{
          background:
            'linear-gradient(155deg, rgba(255,111,54,0.26), rgba(16,224,198,0.16) 54%, rgba(255,70,184,0.16))',
        }}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="max-w-[16rem]">
            <BadgePill tone="hot">WurstFeed live</BadgePill>
            <h2 className="mt-3 font-display text-[2rem] font-bold leading-[0.94] tracking-[-0.06em] text-[var(--text)]">
              Today your sausage aura is dangerously shareable.
            </h2>
            <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
              Scroll hot memes, fake headlines, and luxury absurdity curated for people whose emotional support object is a neon grill.
            </p>
          </div>
          <SausageAvatar personality={resultPersonality} size="lg" />
        </div>
        <div className="mt-5 grid grid-cols-3 gap-2 text-center text-[0.68rem] font-bold uppercase tracking-[0.18em] text-[var(--muted)]">
          <div className="rounded-[22px] border border-white/12 bg-white/8 px-2 py-3">
            <p className="font-display text-xl text-[var(--text)]">96%</p>
            feed hunger
          </div>
          <div className="rounded-[22px] border border-white/12 bg-white/8 px-2 py-3">
            <p className="font-display text-xl text-[var(--text)]">28k</p>
            active buns
          </div>
          <div className="rounded-[22px] border border-white/12 bg-white/8 px-2 py-3">
            <p className="font-display text-xl text-[var(--text)]">4.9</p>
            grill rating
          </div>
        </div>
      </GlassPanel>

      <SectionHeading
        eyebrow="Home Feed"
        title="WurstFeed"
        blurb="TikTok-scroll energy, but entirely committed to sausage mythology."
      />

      {loading ? (
        <div className="space-y-4">
          <SkeletonCard className="h-52" />
          <SkeletonCard className="h-44" />
          <SkeletonCard className="h-48" />
        </div>
      ) : (
        feedCards.map((card, index) => (
          <motion.div
            key={card.id}
            initial={{ opacity: 0, y: 26 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ delay: index * 0.06, duration: 0.42 }}
          >
            <GlassPanel
              className="rounded-[30px] p-5"
              style={{
                background: `linear-gradient(145deg, ${card.palette[0]}33, ${card.palette[1]}2a 58%, ${card.palette[2]}22)`,
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <BadgePill tone={card.type === 'poll' ? 'cool' : 'pink'}>{card.label}</BadgePill>
                  <h3 className="mt-3 font-display text-[1.55rem] font-bold leading-[1] tracking-[-0.04em] text-[var(--text)]">
                    {card.title}
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{card.body}</p>
                </div>
                <span className="rounded-full border border-white/12 bg-white/8 px-3 py-2 text-[0.68rem] font-bold uppercase tracking-[0.18em] text-[var(--muted)]">
                  {card.type}
                </span>
              </div>

              {card.type === 'poll' ? (
                <div className="mt-4 space-y-2">
                  {card.options.map((optionId) => {
                    const personality = getPersonalityById(optionId)
                    const active = optionId === pollValue

                    return (
                      <button
                        key={optionId}
                        type="button"
                        onClick={() => onPollVote(optionId)}
                        className={clsx(
                          'flex w-full items-center justify-between rounded-[22px] border px-4 py-3 text-left transition-transform duration-200 active:scale-[0.99]',
                          active
                            ? 'border-white/30 bg-white/14'
                            : 'border-white/10 bg-white/6',
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <SausageAvatar personality={personality} size="sm" />
                          <div>
                            <p className="font-semibold text-[var(--text)]">{personality.name}</p>
                            <p className="text-xs text-[var(--muted)]">{personality.subtitle}</p>
                          </div>
                        </div>
                        <ArrowUpRight className="h-4 w-4 text-[var(--muted)]" />
                      </button>
                    )
                  })}
                </div>
              ) : (
                <>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {card.stats.map((stat) => (
                      <span
                        key={stat}
                        className="rounded-full border border-white/12 bg-white/8 px-3 py-2 text-[0.68rem] font-bold uppercase tracking-[0.18em] text-[var(--muted)]"
                      >
                        {stat}
                      </span>
                    ))}
                  </div>
                  <ReactionCluster
                    cardId={card.id}
                    reactions={card.reactions}
                    counts={reactions[card.id]}
                    onReact={onReact}
                  />
                </>
              )}
            </GlassPanel>
          </motion.div>
        ))
      )}

      <GlassPanel className="rounded-[30px] p-5">
        <SectionHeading
          eyebrow="Sausage Horoscope"
          title={dailyHoroscope.title}
          blurb={dailyHoroscope.guidance}
          action={<BadgePill tone="cool">{dailyHoroscope.sign}</BadgePill>}
        />
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-[24px] border border-white/12 bg-white/8 p-4">
            <p className="text-[0.68rem] font-bold uppercase tracking-[0.24em] text-[var(--muted)]">Luck level</p>
            <p className="mt-2 font-display text-4xl font-bold tracking-[-0.06em]">{dailyHoroscope.luck}</p>
            <p className="mt-1 text-sm text-[var(--muted)]">Mercury is in bratwurst and your texts look suspiciously expensive.</p>
          </div>
          <div className="rounded-[24px] border border-white/12 bg-white/8 p-4">
            <p className="text-[0.68rem] font-bold uppercase tracking-[0.24em] text-[var(--muted)]">Grill destiny</p>
            <p className="mt-2 font-display text-4xl font-bold tracking-[-0.06em]">{dailyHoroscope.destiny}</p>
            <p className="mt-1 text-sm text-[var(--muted)]">Cursed condiment warning: {dailyHoroscope.warning}</p>
          </div>
        </div>
      </GlassPanel>

      <GlassPanel className="rounded-[30px] p-5">
        <SectionHeading
          eyebrow="Great Ranking"
          title="The hottest sausages right now"
          blurb="Community votes, chaos scores, and emotionally unavailable glamour."
          action={<BadgePill tone="hot">live chart</BadgePill>}
        />
        <div className="space-y-3">
          {leaderboard.map((entry, index) => (
            <div
              key={entry.id}
              className="flex items-center justify-between rounded-[22px] border border-white/10 bg-white/6 px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-white/10 text-sm font-bold text-[var(--text)]">
                  {index + 1}
                </span>
                <div>
                  <p className="font-semibold text-[var(--text)]">{entry.name}</p>
                  <p className="text-xs text-[var(--muted)]">{entry.badge}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="rounded-full border border-white/12 bg-white/8 px-3 py-2 text-xs font-bold uppercase tracking-[0.18em] text-[var(--muted)]">
                  {entry.score}
                </span>
                <button
                  type="button"
                  onClick={() => onVoteLeaderboard(entry.id)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 transition-transform duration-200 active:scale-95"
                  aria-label={`Vote ${entry.name}`}
                >
                  <Trophy className="h-4 w-4 text-[var(--accent)]" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </GlassPanel>
    </section>
  )
}

export function QuizSection({
  loading,
  personalities,
  quizQuestions,
  quizState,
  resultPersonality,
  onAnswer,
  onRestart,
  onShare,
  onExport,
  storyCardRef,
  isStoryAssetBusy,
  compatibilityPrefs,
  onCompatibilityChange,
  compatibility,
}) {
  const currentQuestionIndex = Math.min(quizState.answers.length, quizQuestions.length - 1)
  const currentQuestion = quizQuestions[currentQuestionIndex]
  const quizComplete = quizState.answers.length === quizQuestions.length && quizState.resultId

  if (loading) {
    return (
      <section className="space-y-4">
        <SkeletonCard className="h-[28rem]" />
        <SkeletonCard className="h-[24rem]" />
      </section>
    )
  }

  return (
    <section className="space-y-4">
      <SectionHeading
        eyebrow="Personality test"
        title="Which Wurstel Are You?"
        blurb="Multi-step DNA theatre with emotional color shifts and premium nonsense."
      />

      {!quizComplete ? (
        <GlassPanel
          className="rounded-[32px] p-5"
          style={{
            background: `linear-gradient(145deg, ${currentQuestion.palette[0]}33, ${currentQuestion.palette[1]}2a)`,
          }}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <BadgePill tone="pink">
                DNA step {currentQuestionIndex + 1}/{quizQuestions.length}
              </BadgePill>
              <h3 className="mt-3 font-display text-[1.9rem] font-bold leading-[0.95] tracking-[-0.05em] text-[var(--text)]">
                {currentQuestion.prompt}
              </h3>
              <p className="mt-2 text-sm text-[var(--muted)]">{currentQuestion.mood}</p>
            </div>
            <div className="equalizer flex h-14 items-end gap-1">
              {Array.from({ length: 6 }).map((_, index) => (
                <span
                  key={`bar-${index}`}
                  className="block w-1.5 origin-bottom rounded-full bg-[var(--accent-2)]"
                  style={{ height: `${14 + index * 7}px` }}
                />
              ))}
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {currentQuestion.answers.map((answer) => (
              <motion.button
                key={answer.key}
                type="button"
                onClick={() => onAnswer(currentQuestion.id, answer)}
                whileHover={{ y: -2, scale: 1.01 }}
                whileTap={{ scale: 0.985 }}
                className="w-full rounded-[26px] border border-white/12 bg-white/8 px-4 py-4 text-left transition-transform duration-200 active:scale-[0.99]"
              >
                <p className="font-semibold text-[var(--text)]">{answer.label}</p>
                <p className="mt-1 text-sm text-[var(--muted)]">{answer.vibe}</p>
              </motion.button>
            ))}
          </div>

          <div className="mt-5 flex gap-2 overflow-x-auto no-scrollbar">
            {personalities.slice(0, 5).map((personality) => (
              <div key={personality.id} className="shrink-0 rounded-[24px] border border-white/10 bg-white/6 p-3 text-center">
                <SausageAvatar personality={personality} size="sm" />
                <p className="mt-2 text-[0.68rem] font-bold uppercase tracking-[0.18em] text-[var(--muted)]">
                  {personality.name}
                </p>
              </div>
            ))}
          </div>
        </GlassPanel>
      ) : (
        <>
          <motion.div
            ref={storyCardRef}
            className="story-card"
            initial={{ opacity: 0, scale: 0.96, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.42, ease: 'easeOut' }}
          >
            <GlassPanel
              className="h-full rounded-[34px] p-6"
              style={{
                background: `radial-gradient(circle at top, ${resultPersonality.aura}55, transparent 32%), linear-gradient(180deg, ${resultPersonality.palette[0]}, ${resultPersonality.palette[1]} 62%, ${resultPersonality.palette[2]})`,
              }}
            >
              <div className="flex h-full flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <BadgePill tone="cool">Viral reveal</BadgePill>
                    <span className="rounded-full border border-white/16 bg-white/10 px-3 py-2 text-[0.68rem] font-bold uppercase tracking-[0.18em] text-white/72">
                      share-ready
                    </span>
                  </div>
                  <p className="mt-3 text-[0.74rem] font-bold uppercase tracking-[0.28em] text-white/72">You are</p>
                  <h3 className="mt-2 font-display text-[2.5rem] font-bold leading-[0.92] tracking-[-0.07em] text-white">
                    {resultPersonality.name}
                  </h3>
                  <p className="mt-3 max-w-[18rem] text-sm leading-6 text-white/72">{resultPersonality.subtitle}</p>
                </div>

                <motion.div
                  className="my-6 flex justify-center"
                  animate={{ y: [0, -6, 0], scale: [1, 1.02, 1] }}
                  transition={{ duration: 4.8, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <SausageAvatar personality={resultPersonality} size="lg" />
                </motion.div>

                <div className="grid grid-cols-2 gap-3 text-sm text-white/78">
                  <div className="rounded-[24px] bg-white/10 p-3">
                    <p className="text-[0.66rem] font-bold uppercase tracking-[0.22em] text-white/56">Traits</p>
                    <p className="mt-2">{resultPersonality.traits.join(' / ')}</p>
                  </div>
                  <div className="rounded-[24px] bg-white/10 p-3">
                    <p className="text-[0.66rem] font-bold uppercase tracking-[0.22em] text-white/56">Soundtrack</p>
                    <p className="mt-2">{resultPersonality.music}</p>
                  </div>
                  <div className="rounded-[24px] bg-white/10 p-3">
                    <p className="text-[0.66rem] font-bold uppercase tracking-[0.22em] text-white/56">Compatibility</p>
                    <p className="mt-2">Meme voltage {resultPersonality.metrics.meme}%</p>
                  </div>
                  <div className="rounded-[24px] bg-white/10 p-3">
                    <p className="text-[0.66rem] font-bold uppercase tracking-[0.22em] text-white/56">Grill aura</p>
                    <p className="mt-2">Char index {resultPersonality.metrics.grill}%</p>
                  </div>
                  <div className="col-span-2 rounded-[24px] bg-white/10 p-3">
                    <p className="text-[0.66rem] font-bold uppercase tracking-[0.22em] text-white/56">Life philosophy</p>
                    <p className="mt-2">{resultPersonality.philosophy}</p>
                  </div>
                </div>
              </div>
            </GlassPanel>
          </motion.div>

          <div className="grid grid-cols-2 gap-3">
            <motion.button
              type="button"
              onClick={onShare}
              whileTap={{ scale: 0.98 }}
              className="inline-flex items-center justify-center rounded-[24px] bg-[var(--text)] px-4 py-3 font-semibold text-[var(--bg)] transition-transform duration-200"
              disabled={isStoryAssetBusy}
            >
              <Share2 className="mr-2 h-4 w-4" />
              {isStoryAssetBusy ? 'Rendering...' : 'Share card'}
            </motion.button>
            <motion.button
              type="button"
              onClick={onExport}
              whileTap={{ scale: 0.98 }}
              className="inline-flex items-center justify-center rounded-[24px] border border-white/12 bg-white/8 px-4 py-3 font-semibold text-[var(--text)] transition-transform duration-200"
              disabled={isStoryAssetBusy}
            >
              <Bookmark className="mr-2 h-4 w-4" />
              Export PNG
            </motion.button>
            <motion.button
              type="button"
              onClick={onRestart}
              whileTap={{ scale: 0.98 }}
              className="col-span-2 inline-flex items-center justify-center rounded-[24px] border border-white/18 bg-white/10 px-4 py-3 font-semibold text-[var(--text)] transition-transform duration-200"
            >
              Retake DNA
            </motion.button>
          </div>

          <GlassPanel className="rounded-[32px] p-5">
            <SectionHeading
              eyebrow="Sausage Compatibility"
              title="Dual aura simulator"
              blurb="Romance, friendship, chaos, and meme survivability under adjustable pressure."
              action={<BadgePill tone="hot">live engine</BadgePill>}
            />

            <div className="grid gap-3">
              <div className="grid grid-cols-2 gap-3">
                <label className="rounded-[24px] border border-white/10 bg-white/6 p-3">
                  <span className="mb-2 block text-[0.66rem] font-bold uppercase tracking-[0.22em] text-[var(--muted)]">Left aura</span>
                  <select
                    value={compatibilityPrefs.leftId}
                    onChange={(event) => onCompatibilityChange((current) => ({ ...current, leftId: event.target.value }))}
                    className="w-full rounded-[18px] border border-white/10 bg-[rgba(255,255,255,0.08)] px-3 py-3 outline-none"
                  >
                    {personalities.map((personality) => (
                      <option key={personality.id} value={personality.id}>
                        {personality.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="rounded-[24px] border border-white/10 bg-white/6 p-3">
                  <span className="mb-2 block text-[0.66rem] font-bold uppercase tracking-[0.22em] text-[var(--muted)]">Right aura</span>
                  <select
                    value={compatibilityPrefs.rightId}
                    onChange={(event) => onCompatibilityChange((current) => ({ ...current, rightId: event.target.value }))}
                    className="w-full rounded-[18px] border border-white/10 bg-[rgba(255,255,255,0.08)] px-3 py-3 outline-none"
                  >
                    {personalities.map((personality) => (
                      <option key={personality.id} value={personality.id}>
                        {personality.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="grid gap-3 rounded-[24px] border border-white/10 bg-white/6 p-4">
                <label>
                  <div className="mb-2 flex items-center justify-between text-[0.72rem] font-bold uppercase tracking-[0.18em] text-[var(--muted)]">
                    <span>Chaos pressure</span>
                    <span>{compatibilityPrefs.spice}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={compatibilityPrefs.spice}
                    onChange={(event) => onCompatibilityChange((current) => ({ ...current, spice: Number(event.target.value) }))}
                    className="w-full accent-[var(--accent)]"
                  />
                </label>
                <label>
                  <div className="mb-2 flex items-center justify-between text-[0.72rem] font-bold uppercase tracking-[0.18em] text-[var(--muted)]">
                    <span>Emotional grilling index</span>
                    <span>{compatibilityPrefs.trust}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={compatibilityPrefs.trust}
                    onChange={(event) => onCompatibilityChange((current) => ({ ...current, trust: Number(event.target.value) }))}
                    className="w-full accent-[var(--accent-2)]"
                  />
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <ProgressRing label="romantic" value={compatibility.romantic} tone="#ff6f56" />
                <ProgressRing label="friendship" value={compatibility.friendship} tone="#10e0c6" />
                <ProgressRing label="chaos" value={compatibility.chaos} tone="#ff46b8" />
                <ProgressRing label="grill index" value={compatibility.grill} tone="#ffb653" />
                <div className="col-span-2">
                  <ProgressRing label="meme sync" value={compatibility.meme} tone="#7f5fff" />
                </div>
              </div>

              <div className="rounded-[24px] border border-white/10 bg-white/6 p-4">
                <p className="text-[0.66rem] font-bold uppercase tracking-[0.22em] text-[var(--muted)]">Compatibility reading</p>
                <p className="mt-2 text-sm leading-6 text-[var(--text)]">{compatibility.summary}</p>
              </div>
            </div>
          </GlassPanel>
        </>
      )}
    </section>
  )
}

export function TokSection({ loading, clips }) {
  const [activeClipIndex, setActiveClipIndex] = useState(0)
  const [engagement, setEngagement] = useState(() =>
    Object.fromEntries(
      clips.map((clip) => [
        clip.id,
        {
          likes: 0,
          comments: 0,
          shares: 0,
          saves: 0,
        },
      ]),
    ),
  )

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'ArrowDown') {
        setActiveClipIndex((current) => (current + 1) % clips.length)
      }

      if (event.key === 'ArrowUp') {
        setActiveClipIndex((current) => (current - 1 + clips.length) % clips.length)
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [clips.length])

  const shiftClip = (direction) => {
    setActiveClipIndex((current) => (current + direction + clips.length) % clips.length)
  }

  const registerAction = (clipId, metric) => {
    setEngagement((current) => ({
      ...current,
      [clipId]: {
        ...current[clipId],
        [metric]: (current[clipId]?.[metric] ?? 0) + 1,
      },
    }))
  }

  const activeClip = clips[activeClipIndex]

  return (
    <section className="space-y-4 soft-scroll">
      <SectionHeading
        eyebrow="WurstTok"
        title="Vertical loops for the sausage-obsessed"
        blurb="Fake influencers, cinematic closeups, and comments floating in the grease-scented ether."
      />

      {loading ? (
        <div className="space-y-4">
          <SkeletonCard className="h-[28rem]" />
          <SkeletonCard className="h-[28rem]" />
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between gap-3 rounded-[24px] border border-white/10 bg-white/6 px-4 py-3">
            <div>
              <p className="text-[0.68rem] font-bold uppercase tracking-[0.24em] text-[var(--muted)]">Gesture mode</p>
              <p className="mt-1 text-sm text-[var(--text)]">Swipe up for next clip, down for the previous loop.</p>
            </div>
            <div className="flex items-center gap-2">
              <motion.button
                type="button"
                whileTap={{ scale: 0.94 }}
                onClick={() => shiftClip(-1)}
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/8"
                aria-label="Previous clip"
              >
                <ChevronUp className="h-4 w-4 text-[var(--text)]" />
              </motion.button>
              <motion.button
                type="button"
                whileTap={{ scale: 0.94 }}
                onClick={() => shiftClip(1)}
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/8"
                aria-label="Next clip"
              >
                <ChevronDown className="h-4 w-4 text-[var(--text)]" />
              </motion.button>
            </div>
          </div>

          <div className="flex justify-center gap-2">
            {clips.map((clip, index) => (
              <button
                key={clip.id}
                type="button"
                onClick={() => setActiveClipIndex(index)}
                className={clsx(
                  'h-1.5 rounded-full transition-all duration-300',
                  index === activeClipIndex ? 'w-10 bg-[var(--text)]' : 'w-4 bg-white/10',
                )}
                aria-label={`Show clip ${index + 1}`}
              />
            ))}
          </div>

          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={activeClip.id}
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              onDragEnd={(_, info) => {
                if (info.offset.y <= -90) {
                  shiftClip(1)
                }

                if (info.offset.y >= 90) {
                  shiftClip(-1)
                }
              }}
              initial={{ opacity: 0, scale: 0.96, y: 120, filter: 'blur(10px)' }}
              animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, scale: 0.95, y: -120, filter: 'blur(10px)' }}
              transition={{ duration: 0.42, ease: 'easeOut' }}
            >
              <GlassPanel
                className="relative h-[34rem] rounded-[34px] p-0"
                style={{
                  background: `linear-gradient(180deg, ${activeClip.palette[0]}, ${activeClip.palette[1]} 55%, ${activeClip.palette[2]})`,
                }}
              >
                <motion.div
                  className="absolute inset-0 opacity-60"
                  animate={{ scale: [1, 1.08, 1], rotate: [0, 2, 0] }}
                  transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
                  style={{
                    background:
                      'radial-gradient(circle at 50% 24%, rgba(255,255,255,0.28), transparent 28%), radial-gradient(circle at 68% 72%, rgba(255,255,255,0.12), transparent 24%)',
                  }}
                />

                <div className="relative z-10 flex h-full flex-col justify-between p-5 text-white">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <BadgePill className="bg-white/12 text-white">Live loop</BadgePill>
                      <p className="mt-3 text-[0.68rem] font-bold uppercase tracking-[0.24em] text-white/66">
                        Clip {activeClipIndex + 1}/{clips.length}
                      </p>
                    </div>
                    <div className="space-y-2 text-right">
                      <span className="ml-auto inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/12">
                        <Play className="h-5 w-5 fill-current" />
                      </span>
                      <div className="space-y-2 text-right text-[0.66rem] font-bold uppercase tracking-[0.18em] text-white/68">
                        <p>{activeClip.metrics.loops} loops</p>
                        <p>{activeClip.metrics.likes} likes</p>
                        <p>{activeClip.metrics.comments} comments</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="relative h-56 rounded-[28px] border border-white/10 bg-white/6 shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]">
                      <motion.div
                        className="absolute inset-4 rounded-[24px] border border-white/10"
                        animate={{ scale: [1, 1.03, 1], y: [0, -6, 0] }}
                        transition={{ duration: 4.6, repeat: Infinity, ease: 'easeInOut' }}
                        style={{
                          background:
                            'radial-gradient(circle at top, rgba(255,255,255,0.24), transparent 40%), linear-gradient(145deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02))',
                        }}
                      />
                      <motion.div
                        className="absolute left-1/2 top-1/2 h-40 w-24 -translate-x-1/2 -translate-y-1/2 rounded-[999px]"
                        animate={{ rotate: [-2, 2, -2], y: [0, -5, 0] }}
                        transition={{ duration: 3.6, repeat: Infinity, ease: 'easeInOut' }}
                        style={{
                          background: 'linear-gradient(180deg, #f6c18e, #b45a30)',
                          boxShadow: '0 24px 50px rgba(0,0,0,0.28)',
                        }}
                      />
                      {activeClip.comments.map((comment, index) => (
                        <motion.div
                          key={`${activeClip.id}-${comment}`}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.08 }}
                          className={clsx(
                            'absolute max-w-[11rem] rounded-full border border-white/12 bg-[rgba(255,255,255,0.14)] px-3 py-2 text-xs font-semibold text-white/86 backdrop-blur-md',
                            index === 0 && 'left-3 top-4',
                            index === 1 && 'right-4 top-16',
                            index === 2 && 'left-5 bottom-5',
                          )}
                        >
                          {comment}
                        </motion.div>
                      ))}
                    </div>

                    <div className="mt-5 flex items-end justify-between gap-4">
                      <div>
                        <h3 className="font-display text-[1.75rem] font-bold leading-[0.96] tracking-[-0.05em] text-white">
                          {activeClip.title}
                        </h3>
                        <p className="mt-3 text-sm leading-6 text-white/72">{activeClip.caption}</p>
                      </div>
                      <div className="flex shrink-0 flex-col gap-2">
                        <TokActionButton
                          icon={Heart}
                          label="Like"
                          value={engagement[activeClip.id]?.likes ?? 0}
                          onClick={() => registerAction(activeClip.id, 'likes')}
                        />
                        <TokActionButton
                          icon={MessageCircle}
                          label="Comment"
                          value={engagement[activeClip.id]?.comments ?? 0}
                          onClick={() => registerAction(activeClip.id, 'comments')}
                        />
                        <TokActionButton
                          icon={Share2}
                          label="Share"
                          value={engagement[activeClip.id]?.shares ?? 0}
                          onClick={() => registerAction(activeClip.id, 'shares')}
                        />
                        <TokActionButton
                          icon={Bookmark}
                          label="Save"
                          value={engagement[activeClip.id]?.saves ?? 0}
                          onClick={() => registerAction(activeClip.id, 'saves')}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </GlassPanel>
            </motion.div>
          </AnimatePresence>
        </>
      )}
    </section>
  )
}

export function LabSection({
  loading,
  builder,
  builderOptions,
  identitySummary,
  onBuilderChange,
  onSaveIdentity,
  personalities,
  recipes,
}) {
  const selectedPersonality = getPersonalityById(builder.baseId)

  if (loading) {
    return (
      <section className="space-y-4">
        <SkeletonCard className="h-[30rem]" />
        <SkeletonCard className="h-[24rem]" />
      </section>
    )
  }

  return (
    <section className="space-y-4">
      <SectionHeading
        eyebrow="Builder + Recipe Lab"
        title="Craft your collectible wurstel identity"
        blurb="Choose the type, aura, accessories, and soundtrack. Then browse luxury chaos recipes."
      />

      <GlassPanel className="rounded-[32px] p-5">
        <div className="grid gap-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <BadgePill tone="cool">Build your own wurstel</BadgePill>
              <h3 className="mt-3 font-display text-[1.8rem] font-bold leading-[0.96] tracking-[-0.05em] text-[var(--text)]">
                Your avatar is one good topping away from becoming canon.
              </h3>
            </div>
            <SausageAvatar personality={selectedPersonality} size="lg" />
          </div>

          <label className="rounded-[24px] border border-white/10 bg-white/6 p-3">
            <span className="mb-2 block text-[0.66rem] font-bold uppercase tracking-[0.22em] text-[var(--muted)]">Sausage type</span>
            <select
              value={builder.baseId}
              onChange={(event) => onBuilderChange('baseId', event.target.value)}
              className="w-full rounded-[18px] border border-white/10 bg-[rgba(255,255,255,0.08)] px-3 py-3 outline-none"
            >
              {personalities.map((personality) => (
                <option key={personality.id} value={personality.id}>
                  {personality.name}
                </option>
              ))}
            </select>
          </label>

          <div className="grid grid-cols-2 gap-3">
            <SelectField label="Topping" value={builder.topping} options={builderOptions.toppings} onChange={(value) => onBuilderChange('topping', value)} />
            <SelectField label="Aura" value={builder.aura} options={builderOptions.auras} onChange={(value) => onBuilderChange('aura', value)} />
            <SelectField label="Grill level" value={builder.grill} options={builderOptions.grillLevels} onChange={(value) => onBuilderChange('grill', value)} />
            <SelectField label="Accessory" value={builder.accessory} options={builderOptions.accessories} onChange={(value) => onBuilderChange('accessory', value)} />
            <SelectField label="Soundtrack" value={builder.soundtrack} options={builderOptions.soundtracks} onChange={(value) => onBuilderChange('soundtrack', value)} />
            <SelectField label="Condiment" value={builder.condiment} options={builderOptions.condiments} onChange={(value) => onBuilderChange('condiment', value)} />
          </div>

          <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(145deg,rgba(255,111,54,0.14),rgba(16,224,198,0.1),rgba(255,70,184,0.12))] p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[0.66rem] font-bold uppercase tracking-[0.22em] text-[var(--muted)]">AI generated identity</p>
                <p className="mt-2 text-sm leading-6 text-[var(--text)]">{identitySummary}</p>
              </div>
              <button
                type="button"
                onClick={onSaveIdentity}
                className="inline-flex items-center justify-center rounded-[22px] bg-[var(--text)] px-4 py-3 font-semibold text-[var(--bg)] transition-transform duration-200 active:scale-[0.98]"
              >
                Save to profile
              </button>
            </div>
          </div>
        </div>
      </GlassPanel>

      <GlassPanel className="rounded-[32px] p-5">
        <SectionHeading
          eyebrow="Recipe Lab"
          title="Luxury, street, and emotionally unstable plates"
          blurb="AI-generated recipe cards for every premium sausage mood swing."
          action={<BadgePill tone="pink">cinematic cards</BadgePill>}
        />
        <div className="space-y-3">
          {recipes.map((recipe) => (
            <div key={recipe.id} className="overflow-hidden rounded-[28px] border border-white/10 bg-white/6">
              <div
                className="h-32"
                style={{
                  background: `radial-gradient(circle at top, rgba(255,255,255,0.2), transparent 30%), linear-gradient(135deg, ${recipe.palette[0]}, ${recipe.palette[1]}, ${recipe.palette[2]})`,
                }}
              />
              <div className="p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="font-display text-[1.35rem] font-bold tracking-[-0.04em] text-[var(--text)]">{recipe.title}</h3>
                    <p className="text-sm text-[var(--muted)]">{recipe.mood}</p>
                  </div>
                  <span className="rounded-full border border-white/12 bg-white/8 px-3 py-2 text-[0.68rem] font-bold uppercase tracking-[0.18em] text-[var(--muted)]">
                    {recipe.time}
                  </span>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {recipe.ingredients.map((ingredient) => (
                    <span
                      key={ingredient}
                      className="rounded-full border border-white/10 bg-white/8 px-3 py-2 text-xs font-semibold text-[var(--text)]"
                    >
                      {ingredient}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </GlassPanel>
    </section>
  )
}

function SelectField({ label, value, options, onChange }) {
  return (
    <label className="rounded-[24px] border border-white/10 bg-white/6 p-3">
      <span className="mb-2 block text-[0.66rem] font-bold uppercase tracking-[0.22em] text-[var(--muted)]">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-[18px] border border-white/10 bg-[rgba(255,255,255,0.08)] px-3 py-3 outline-none"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  )
}

export function ProfileSection({ personality, identitySummary, streak, quests, isOnline, onShare, builder }) {
  const auraScore = Math.round((personality.metrics.meme + personality.metrics.grill + streak * 2) / 3)
  const badges = [
    { id: 'badge-1', label: 'Aura Hoarder', icon: Sparkles },
    { id: 'badge-2', label: 'Grill Saint', icon: Flame },
    { id: 'badge-3', label: 'Verified Wurst', icon: BadgeCheck },
    { id: 'badge-4', label: 'Lore Addict', icon: Star },
  ]

  return (
    <section className="space-y-4">
      <GlassPanel className="rounded-[34px] p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <BadgePill tone="cool">Profile and social layer</BadgePill>
            <h2 className="mt-3 font-display text-[2rem] font-bold leading-[0.95] tracking-[-0.06em] text-[var(--text)]">
              {personality.name}
            </h2>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{identitySummary}</p>
          </div>
          <SausageAvatar personality={personality} size="lg" />
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <MetricTile label="Aura score" value={auraScore} icon={Zap} />
          <MetricTile label="Grill reputation" value={personality.metrics.grill} icon={Flame} />
          <MetricTile label="Mood spectrum" value={personality.metrics.meme} icon={Heart} />
          <MetricTile label="Streak" value={streak} icon={BadgeCheck} />
        </div>

        <div className="mt-5 flex gap-3">
          <button
            type="button"
            onClick={onShare}
            className="inline-flex flex-1 items-center justify-center rounded-[24px] bg-[var(--text)] px-4 py-3 font-semibold text-[var(--bg)] transition-transform duration-200 active:scale-[0.98]"
          >
            <Share2 className="mr-2 h-4 w-4" />
            Share profile card
          </button>
          <div className="rounded-[24px] border border-white/12 bg-white/8 px-4 py-3 text-sm font-semibold text-[var(--muted)]">
            {isOnline ? 'syncing social aura' : 'offline vault mode'}
          </div>
        </div>
      </GlassPanel>

      <GlassPanel className="rounded-[30px] p-5">
        <SectionHeading
          eyebrow="Badges"
          title="Collection status"
          blurb={`Favorite condiment: ${builder.condiment}. Current accessory: ${builder.accessory}.`}
        />
        <div className="grid grid-cols-2 gap-3">
          {badges.map((badge) => {
            const Icon = badge.icon

            return (
              <div key={badge.id} className="rounded-[24px] border border-white/10 bg-white/6 p-4">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-[var(--accent-2)]">
                  <Icon className="h-4 w-4" />
                </span>
                <p className="mt-3 font-semibold text-[var(--text)]">{badge.label}</p>
                <p className="mt-1 text-sm text-[var(--muted)]">Unlocked for stylishly unserious wurstel behavior.</p>
              </div>
            )
          })}
        </div>
      </GlassPanel>

      <GlassPanel className="rounded-[30px] p-5">
        <SectionHeading
          eyebrow="Daily quests"
          title="Tiny missions with premium rewards"
          blurb="Complete loops, unlockables, and suspicious amounts of social validation."
          action={<BadgePill tone="pink">{quests.length} active</BadgePill>}
        />
        <div className="space-y-3">
          {quests.map((quest) => (
            <div key={quest.id} className="flex items-center justify-between rounded-[24px] border border-white/10 bg-white/6 px-4 py-3">
              <div>
                <p className="font-semibold text-[var(--text)]">{quest.title}</p>
                <p className="text-xs text-[var(--muted)]">Reward: {quest.reward}</p>
              </div>
              <button
                type="button"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10"
                aria-label={`Track ${quest.title}`}
              >
                <SlidersHorizontal className="h-4 w-4 text-[var(--accent)]" />
              </button>
            </div>
          ))}
        </div>
      </GlassPanel>

      <GlassPanel className="rounded-[30px] p-5">
        <SectionHeading
          eyebrow="Social pulse"
          title="Community signals"
          blurb="The timeline keeps talking about sausages and somehow this is your fault."
        />
        <div className="grid grid-cols-3 gap-3">
          <PulseTile icon={Heart} label="Saves" value="18.2K" />
          <PulseTile icon={MessageCircle} label="Comments" value="4.7K" />
          <PulseTile icon={Share2} label="Shares" value="9.3K" />
        </div>
      </GlassPanel>
    </section>
  )
}

function MetricTile({ label, value, icon: Icon }) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-white/6 p-4">
      <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-[var(--accent)]">
        <Icon className="h-4 w-4" />
      </span>
      <p className="mt-3 font-display text-3xl font-bold tracking-[-0.05em] text-[var(--text)]">{value}</p>
      <p className="mt-1 text-xs font-bold uppercase tracking-[0.18em] text-[var(--muted)]">{label}</p>
    </div>
  )
}

function PulseTile({ icon: Icon, label, value }) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-white/6 p-4 text-center">
      <span className="mx-auto inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-[var(--accent-2)]">
        <Icon className="h-4 w-4" />
      </span>
      <p className="mt-3 font-display text-2xl font-bold tracking-[-0.05em] text-[var(--text)]">{value}</p>
      <p className="mt-1 text-[0.68rem] font-bold uppercase tracking-[0.18em] text-[var(--muted)]">{label}</p>
    </div>
  )
}

function TokActionButton({ icon: Icon, label, value, onClick }) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.92 }}
      onClick={onClick}
      className="inline-flex flex-col items-center gap-1 rounded-[22px] border border-white/10 bg-white/10 px-3 py-2 text-white shadow-[0_18px_40px_rgba(0,0,0,0.18)]"
      aria-label={label}
    >
      <Icon className="h-4 w-4" />
      <span className="text-[0.62rem] font-bold uppercase tracking-[0.18em] text-white/68">{label}</span>
      <span className="font-display text-sm font-bold tracking-[-0.04em] text-white">{value}</span>
    </motion.button>
  )
}
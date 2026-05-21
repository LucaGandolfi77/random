import { AnimatePresence, motion } from 'framer-motion'
import { toBlob, toPng } from 'html-to-image'
import {
  Clapperboard,
  Dna,
  Download,
  FlaskConical,
  Flame,
  House,
  MoonStar,
  SunMedium,
  UserRound,
  WifiOff,
} from 'lucide-react'
import {
  startTransition,
  useDeferredValue,
  useEffect,
  useRef,
  useState,
} from 'react'
import { AnimatedBackground } from './components/AnimatedBackground.jsx'
import { BottomNav, OnboardingFlow, SplashScreen } from './components/overlays.jsx'
import {
  FeedSection,
  LabSection,
  ProfileSection,
  QuizSection,
  TokSection,
} from './components/sections.jsx'
import {
  buildIdentitySummary,
  builderOptions,
  calculateQuizResult,
  computeCompatibility,
  feedCards,
  getDailyHoroscope,
  getPersonalityById,
  onboardingSlides,
  personalities,
  quizQuestions,
  recipes,
  tokClips,
  weeklyQuests,
  leaderboard as baseLeaderboard,
} from './data/mockData.js'
import { useLocalStorage } from './hooks/useLocalStorage.js'

const tabs = [
  { id: 'feed', label: 'Feed', icon: House },
  { id: 'quiz', label: 'DNA', icon: Dna },
  { id: 'tok', label: 'Tok', icon: Clapperboard },
  { id: 'lab', label: 'Lab', icon: FlaskConical },
  { id: 'profile', label: 'Me', icon: UserRound },
]

const defaultBuilder = {
  baseId: 'cyber-bratwurst',
  topping: builderOptions.toppings[0],
  aura: builderOptions.auras[0],
  grill: builderOptions.grillLevels[1],
  accessory: builderOptions.accessories[0],
  soundtrack: builderOptions.soundtracks[0],
  condiment: builderOptions.condiments[0],
}

const defaultCompatibility = {
  leftId: 'cyber-bratwurst',
  rightId: 'chaos-frankfurter',
  spice: 74,
  trust: 62,
}

const defaultInteractions = {
  poll: 'chaos-frankfurter',
  reactions: {},
  leaderboardVotes: {},
  streak: 9,
}

function App() {
  const [theme, setTheme] = useLocalStorage('wurstverse-theme', () => {
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'night'
    }

    return 'day'
  })
  const [activeTab, setActiveTab] = useLocalStorage('wurstverse-active-tab', 'feed')
  const [builder, setBuilder] = useLocalStorage('wurstverse-builder', defaultBuilder)
  const [quizState, setQuizState] = useLocalStorage('wurstverse-quiz', {
    answers: [],
    resultId: null,
  })
  const [compatibilityPrefs, setCompatibilityPrefs] = useLocalStorage(
    'wurstverse-compatibility',
    defaultCompatibility,
  )
  const [interactions, setInteractions] = useLocalStorage(
    'wurstverse-interactions',
    defaultInteractions,
  )
  const [onboardingSeen, setOnboardingSeen] = useLocalStorage('wurstverse-onboarding', false)
  const [showSplash, setShowSplash] = useState(true)
  const [contentReady, setContentReady] = useState(false)
  const [storyAssetBusy, setStoryAssetBusy] = useState(false)
  const [toast, setToast] = useState('')
  const [installPrompt, setInstallPrompt] = useState(null)
  const [isOnline, setIsOnline] = useState(() => {
    if (typeof navigator === 'undefined') {
      return true
    }

    return navigator.onLine
  })
  const touchOrigin = useRef({ x: 0, y: 0 })
  const storyCardRef = useRef(null)
  const deferredTab = useDeferredValue(activeTab)

  const resultPersonality = getPersonalityById(quizState.resultId || builder.baseId)
  const compatibility = computeCompatibility(
    compatibilityPrefs.leftId,
    compatibilityPrefs.rightId,
    compatibilityPrefs,
  )
  const identitySummary = buildIdentitySummary(builder)
  const dailyHoroscope = getDailyHoroscope(new Date())
  const leaderboard = [...baseLeaderboard]
    .map((entry) => ({
      ...entry,
      score: entry.score + (interactions.leaderboardVotes[entry.id] ?? 0) * 4,
    }))
    .sort((left, right) => right.score - left.score)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  useEffect(() => {
    const splashTimer = window.setTimeout(() => setShowSplash(false), 1800)
    const contentTimer = window.setTimeout(() => setContentReady(true), 2350)

    return () => {
      window.clearTimeout(splashTimer)
      window.clearTimeout(contentTimer)
    }
  }, [])

  useEffect(() => {
    const handleOnlineState = () => setIsOnline(navigator.onLine)

    window.addEventListener('online', handleOnlineState)
    window.addEventListener('offline', handleOnlineState)

    return () => {
      window.removeEventListener('online', handleOnlineState)
      window.removeEventListener('offline', handleOnlineState)
    }
  }, [])

  useEffect(() => {
    const handleBeforeInstallPrompt = (event) => {
      event.preventDefault()
      setInstallPrompt(event)
    }

    const handleInstalled = () => {
      setInstallPrompt(null)
      setToast('WURSTVERSE installed. Your grill reputation just went native.')
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleInstalled)
    }
  }, [])

  useEffect(() => {
    if (!quizState.resultId) {
      return
    }

    setCompatibilityPrefs((current) => {
      if (current.leftId === quizState.resultId) {
        return current
      }

      return {
        ...current,
        leftId: quizState.resultId,
      }
    })
  }, [quizState.resultId, setCompatibilityPrefs])

  useEffect(() => {
    if (!toast) {
      return undefined
    }

    const timeout = window.setTimeout(() => setToast(''), 2200)
    return () => window.clearTimeout(timeout)
  }, [toast])

  const pulseHaptic = () => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(8)
    }
  }

  const goToTab = (tabId) => {
    pulseHaptic()
    startTransition(() => setActiveTab(tabId))
  }

  const shiftTab = (direction) => {
    const currentIndex = tabs.findIndex((tab) => tab.id === activeTab)
    const nextIndex = (currentIndex + direction + tabs.length) % tabs.length
    goToTab(tabs[nextIndex].id)
  }

  const handleTouchStart = (event) => {
    const touch = event.changedTouches[0]
    touchOrigin.current = { x: touch.clientX, y: touch.clientY }
  }

  const handleTouchEnd = (event) => {
    const touch = event.changedTouches[0]
    const deltaX = touch.clientX - touchOrigin.current.x
    const deltaY = touch.clientY - touchOrigin.current.y

    if (Math.abs(deltaX) < 64 || Math.abs(deltaX) < Math.abs(deltaY) * 1.2) {
      return
    }

    shiftTab(deltaX > 0 ? -1 : 1)
  }

  const handleAnswer = (questionId, answer) => {
    pulseHaptic()

    const nextAnswers = [
      ...quizState.answers.filter((entry) => entry.questionId !== questionId),
      {
        questionId,
        answerKey: answer.key,
        impact: answer.impact,
      },
    ]

    const nextResultId = nextAnswers.length === quizQuestions.length
      ? calculateQuizResult(nextAnswers)
      : null

    startTransition(() => {
      setQuizState({
        answers: nextAnswers,
        resultId: nextResultId,
      })
    })

    if (nextResultId) {
      setToast(`DNA revealed: ${getPersonalityById(nextResultId).name}`)
    }
  }

  const handleRestartQuiz = () => {
    pulseHaptic()
    setQuizState({ answers: [], resultId: null })
    setToast('DNA test reset. Your aura is once again suspiciously flexible.')
  }

  const renderStoryBlob = async () => {
    if (!storyCardRef.current) {
      return null
    }

    return toBlob(storyCardRef.current, {
      cacheBust: true,
      pixelRatio: 2,
      backgroundColor: theme === 'night' ? '#090914' : '#fff5ee',
    })
  }

  const handleShareResult = async () => {
    pulseHaptic()

    const shareText = `I am ${resultPersonality.name} in WURSTVERSE. ${resultPersonality.philosophy}`

    setStoryAssetBusy(true)

    try {
      const storyBlob = await renderStoryBlob()

      if (storyBlob && navigator.share) {
        const storyFile = new File([storyBlob], 'wurstverse-dna-card.png', { type: 'image/png' })

        if (navigator.canShare?.({ files: [storyFile] })) {
          await navigator.share({
            title: 'My WURSTVERSE DNA',
            text: shareText,
            files: [storyFile],
          })
          setToast('Story card launched into the timeline with full visual chaos.')
          return
        }
      }

      if (navigator.share) {
        await navigator.share({
          title: 'My WURSTVERSE DNA',
          text: shareText,
          url: window.location.href,
        })
        setToast('Story card launched into the timeline.')
        return
      }

      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareText)
        setToast('Story card copied. Paste it where chaos deserves it.')
        return
      }

      setToast('Share is limited here. Export the card and post it manually.')
    } catch (error) {
      if (error?.name === 'AbortError') {
        return
      }

      setToast('Share ritual failed. Export the card and post it manually.')
    } finally {
      setStoryAssetBusy(false)
    }
  }

  const handleExportResult = async () => {
    pulseHaptic()

    if (!storyCardRef.current) {
      setToast('Open your DNA reveal to export the visual story card.')
      return
    }

    setStoryAssetBusy(true)

    try {
      const dataUrl = await toPng(storyCardRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: theme === 'night' ? '#090914' : '#fff5ee',
      })

      const downloadLink = document.createElement('a')
      downloadLink.href = dataUrl
      downloadLink.download = `${resultPersonality.id}-story-card.png`
      downloadLink.click()
      setToast('Story card exported as PNG.')
    } catch {
      setToast('Export failed. Try the native share flow instead.')
    } finally {
      setStoryAssetBusy(false)
    }
  }

  const handleBuilderChange = (field, value) => {
    pulseHaptic()
    setBuilder((current) => ({
      ...current,
      [field]: value,
    }))
  }

  const handleSaveIdentity = () => {
    pulseHaptic()
    setToast('Collectible identity saved to your profile vault.')
  }

  const handleReaction = (cardId, reaction) => {
    pulseHaptic()

    setInteractions((current) => ({
      ...current,
      reactions: {
        ...current.reactions,
        [cardId]: {
          ...current.reactions[cardId],
          [reaction]: (current.reactions[cardId]?.[reaction] ?? 0) + 1,
        },
      },
    }))
  }

  const handlePollVote = (personalityId) => {
    pulseHaptic()

    setInteractions((current) => ({
      ...current,
      poll: personalityId,
      streak: current.streak + 1,
    }))
    setToast('Poll vote transmitted to the sausage cloud.')
  }

  const handleLeaderboardVote = (personalityId) => {
    pulseHaptic()

    setInteractions((current) => ({
      ...current,
      leaderboardVotes: {
        ...current.leaderboardVotes,
        [personalityId]: (current.leaderboardVotes[personalityId] ?? 0) + 1,
      },
    }))
  }

  const handleInstall = async () => {
    pulseHaptic()

    if (!installPrompt) {
      setToast('On iPhone, use Share and Add to Home Screen for the full WURSTVERSE ritual.')
      return
    }

    installPrompt.prompt()
    const { outcome } = await installPrompt.userChoice

    if (outcome === 'accepted') {
      setToast('WURSTVERSE is heading to your home screen.')
    }

    setInstallPrompt(null)
  }

  const renderTab = () => {
    if (deferredTab === 'feed') {
      return (
        <FeedSection
          loading={!contentReady}
          resultPersonality={resultPersonality}
          feedCards={feedCards}
          pollValue={interactions.poll}
          reactions={interactions.reactions}
          onPollVote={handlePollVote}
          onReact={handleReaction}
          dailyHoroscope={dailyHoroscope}
          leaderboard={leaderboard}
          onVoteLeaderboard={handleLeaderboardVote}
        />
      )
    }

    if (deferredTab === 'quiz') {
      return (
        <QuizSection
          loading={!contentReady}
          personalities={personalities}
          quizQuestions={quizQuestions}
          quizState={quizState}
          resultPersonality={resultPersonality}
          onAnswer={handleAnswer}
          onRestart={handleRestartQuiz}
          onShare={handleShareResult}
          onExport={handleExportResult}
          storyCardRef={storyCardRef}
          isStoryAssetBusy={storyAssetBusy}
          compatibilityPrefs={compatibilityPrefs}
          onCompatibilityChange={setCompatibilityPrefs}
          compatibility={compatibility}
        />
      )
    }

    if (deferredTab === 'tok') {
      return <TokSection loading={!contentReady} clips={tokClips} />
    }

    if (deferredTab === 'lab') {
      return (
        <LabSection
          loading={!contentReady}
          builder={builder}
          builderOptions={builderOptions}
          identitySummary={identitySummary}
          onBuilderChange={handleBuilderChange}
          onSaveIdentity={handleSaveIdentity}
          personalities={personalities}
          recipes={recipes}
        />
      )
    }

    return (
      <ProfileSection
        personality={resultPersonality}
        identitySummary={identitySummary}
        streak={interactions.streak}
        quests={weeklyQuests}
        isOnline={isOnline}
        onShare={handleShareResult}
        builder={builder}
      />
    )
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[var(--bg)] text-[var(--text)]">
      <AnimatedBackground activeTab={deferredTab} theme={theme} />

      <div className="app-shell relative">
        <AnimatePresence>{showSplash ? <SplashScreen key="splash" /> : null}</AnimatePresence>

        <header className="sticky top-[calc(env(safe-area-inset-top)+0.25rem)] z-30 mb-4 flex items-start justify-between gap-3 rounded-[28px] border border-white/25 bg-[rgba(255,255,255,0.08)] px-4 py-3 backdrop-blur-2xl">
          <div>
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.32em] text-[var(--muted)]">
              Wurstverse beta
            </p>
            <h1 className="font-display text-[1.55rem] font-bold tracking-[-0.04em]">
              Viral sausage culture, rendered glossy.
            </h1>
            <div className="mt-2 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/8 px-3 py-1 text-[0.72rem] font-semibold text-[var(--muted)]">
                <Flame className="h-3.5 w-3.5 text-[var(--accent)]" />
                {interactions.streak} day grill streak
              </span>
              {!isOnline ? (
                <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/8 px-3 py-1 text-[0.72rem] font-semibold text-[var(--muted)]">
                  <WifiOff className="h-3.5 w-3.5 text-[var(--accent-2)]" />
                  offline vault ready
                </span>
              ) : null}
            </div>
          </div>

          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={handleInstall}
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-white/10 text-[var(--text)] shadow-[0_18px_40px_rgba(0,0,0,0.16)] transition-transform duration-200 active:scale-95"
              aria-label="Install WURSTVERSE"
            >
              <Download className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => setTheme(theme === 'night' ? 'day' : 'night')}
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-white/10 text-[var(--text)] shadow-[0_18px_40px_rgba(0,0,0,0.16)] transition-transform duration-200 active:scale-95"
              aria-label="Toggle theme"
            >
              {theme === 'night' ? <SunMedium className="h-5 w-5" /> : <MoonStar className="h-5 w-5" />}
            </button>
          </div>
        </header>

        <p className="mb-3 text-center text-[0.72rem] font-semibold uppercase tracking-[0.28em] text-[var(--muted)]">
          Swipe sideways to switch zones
        </p>

        <AnimatePresence mode="wait" initial={false}>
          <motion.main
            key={deferredTab}
            initial={{ opacity: 0, y: 14, filter: 'blur(12px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -10, filter: 'blur(10px)' }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            className="pb-28"
          >
            {renderTab()}
          </motion.main>
        </AnimatePresence>

        <AnimatePresence>
          {!onboardingSeen ? (
            <OnboardingFlow key="onboarding" slides={onboardingSlides} onComplete={() => setOnboardingSeen(true)} />
          ) : null}
        </AnimatePresence>

        <BottomNav tabs={tabs} activeTab={activeTab} onSelect={goToTab} />

        <AnimatePresence>
          {toast ? (
            <motion.div
              key="toast"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 18 }}
              className="pointer-events-none fixed bottom-[calc(6.4rem+env(safe-area-inset-bottom))] left-1/2 z-40 w-[min(22rem,calc(100vw-2rem))] -translate-x-1/2 rounded-full border border-white/20 bg-[rgba(9,9,20,0.82)] px-4 py-3 text-center text-sm font-semibold text-white shadow-[0_20px_50px_rgba(0,0,0,0.28)] backdrop-blur-2xl"
            >
              {toast}
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  )
}

export default App

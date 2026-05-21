import { motion } from 'framer-motion'

const tabAccents = {
  feed: ['#ff8f58', '#ff4fb6'],
  quiz: ['#10e0c6', '#7f5fff'],
  tok: ['#ff6f56', '#ff9f58'],
  lab: ['#39f0da', '#6db2ff'],
  profile: ['#d7b0ff', '#ff6f56'],
}

export function AnimatedBackground({ activeTab, theme }) {
  const colors = tabAccents[activeTab] ?? tabAccents.feed

  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden">
      <motion.div
        className="absolute left-[-12%] top-[8%] h-56 w-56 rounded-full blur-[90px]"
        animate={{ x: [0, 38, 0], y: [0, 22, 0], scale: [1, 1.08, 1] }}
        transition={{ duration: 13, repeat: Infinity, ease: 'easeInOut' }}
        style={{ background: colors[0], opacity: theme === 'night' ? 0.28 : 0.22 }}
      />
      <motion.div
        className="absolute right-[-8%] top-[24%] h-72 w-72 rounded-full blur-[110px]"
        animate={{ x: [0, -26, 0], y: [0, 46, 0], scale: [1.02, 0.96, 1.02] }}
        transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut' }}
        style={{ background: colors[1], opacity: theme === 'night' ? 0.22 : 0.16 }}
      />
      <motion.div
        className="absolute bottom-[12%] left-[18%] h-64 w-64 rounded-full blur-[120px]"
        animate={{ x: [0, -18, 0], y: [0, -28, 0], scale: [0.96, 1.05, 0.96] }}
        transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
        style={{ background: '#ffffff', opacity: theme === 'night' ? 0.05 : 0.12 }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,transparent_58%,rgba(0,0,0,0.1)_100%)]" />
    </div>
  )
}
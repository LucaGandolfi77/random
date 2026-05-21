import clsx from 'clsx'
import { motion } from 'framer-motion'

const toneClasses = {
  hot: 'bg-[rgba(255,111,54,0.14)] text-[var(--accent)]',
  cool: 'bg-[rgba(16,224,198,0.14)] text-[var(--accent-2)]',
  pink: 'bg-[rgba(255,70,184,0.14)] text-[var(--accent-3)]',
  neutral: 'bg-white/10 text-[var(--text)]',
}

const sizeClasses = {
  sm: 'h-20 w-20 rounded-[24px]',
  md: 'h-24 w-24 rounded-[28px]',
  lg: 'h-32 w-32 rounded-[34px]',
}

export function GlassPanel({ children, className, style }) {
  return (
    <div className={clsx('glass-panel rounded-[28px] p-4', className)} style={style}>
      <div className="relative z-10">{children}</div>
    </div>
  )
}

export function BadgePill({ children, tone = 'neutral', className }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full px-3 py-1 text-[0.7rem] font-bold uppercase tracking-[0.22em]',
        toneClasses[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}

export function SectionHeading({ eyebrow, title, blurb, action }) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div>
        <p className="text-[0.68rem] font-bold uppercase tracking-[0.28em] text-[var(--muted)]">{eyebrow}</p>
        <h2 className="font-display text-[1.35rem] font-bold tracking-[-0.04em] text-[var(--text)]">{title}</h2>
        {blurb ? <p className="mt-1 max-w-[32ch] text-sm text-[var(--muted)]">{blurb}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  )
}

export function SausageAvatar({ personality, size = 'md' }) {
  return (
    <div className={clsx('relative isolate overflow-hidden border border-white/15 bg-white/5 shadow-[0_20px_45px_rgba(0,0,0,0.18)]', sizeClasses[size])}>
      <motion.div
        className="absolute inset-0"
        animate={{ scale: [1, 1.06, 1], rotate: [0, 5, 0] }}
        transition={{ duration: 7.2, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          background: `radial-gradient(circle at 50% 24%, ${personality.glow}66, transparent 52%), linear-gradient(135deg, ${personality.palette[0]}, ${personality.palette[1]})`,
        }}
      />
      <motion.div
        className="absolute inset-[18%] rounded-full blur-2xl"
        animate={{ scale: [0.94, 1.08, 0.94], opacity: [0.65, 0.95, 0.65] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
        style={{ background: personality.aura }}
      />
      <motion.div
        className="absolute left-1/2 top-1/2 h-[58%] w-[42%] -translate-x-1/2 -translate-y-1/2 rounded-[999px]"
        animate={{ y: [0, -4, 0], rotate: [-2, 2, -2] }}
        transition={{ duration: 4.8, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          background: `linear-gradient(180deg, ${personality.body[0]}, ${personality.body[1]})`,
          boxShadow: `0 18px 40px ${personality.aura}55`,
        }}
      >
        <span className="absolute left-[18%] top-[22%] h-1.5 w-[64%] rounded-full bg-[rgba(87,36,20,0.28)]" />
        <span className="absolute left-[18%] top-[46%] h-1.5 w-[64%] rounded-full bg-[rgba(87,36,20,0.28)]" />
        <span className="absolute left-[18%] top-[68%] h-1.5 w-[64%] rounded-full bg-[rgba(87,36,20,0.28)]" />
      </motion.div>
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-[rgba(255,255,255,0.14)] px-2 py-1 text-[0.58rem] font-bold uppercase tracking-[0.18em] text-white backdrop-blur-md">
        {personality.name.split(' ')[0]}
      </div>
    </div>
  )
}

export function ProgressRing({ label, value, tone = '#ff6f36' }) {
  const radius = 36
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (value / 100) * circumference

  return (
    <div className="glass-panel rounded-[24px] p-3 text-center">
      <div className="relative mx-auto h-24 w-24">
        <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
          <circle cx="50" cy="50" r={radius} stroke="rgba(255,255,255,0.12)" strokeWidth="8" fill="transparent" />
          <circle
            cx="50"
            cy="50"
            r={radius}
            stroke={tone}
            strokeWidth="8"
            fill="transparent"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
          />
        </svg>
        <div className="absolute inset-0 grid place-items-center">
          <span className="font-display text-lg font-bold tracking-[-0.04em]">{value}</span>
        </div>
      </div>
      <p className="mt-2 text-[0.72rem] font-bold uppercase tracking-[0.22em] text-[var(--muted)]">{label}</p>
    </div>
  )
}

export function SkeletonCard({ className }) {
  return (
    <div className={clsx('glass-panel rounded-[28px] p-4', className)}>
      <div className="relative overflow-hidden rounded-[22px] bg-white/5 p-4">
        <motion.div
          className="absolute inset-y-0 left-[-30%] w-[50%] bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.16),transparent)]"
          animate={{ x: ['-40%', '240%'] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'linear' }}
        />
        <div className="space-y-3">
          <div className="h-3 w-20 rounded-full bg-white/10" />
          <div className="h-6 w-40 rounded-full bg-white/10" />
          <div className="h-3 w-full rounded-full bg-white/10" />
          <div className="h-3 w-3/4 rounded-full bg-white/10" />
        </div>
      </div>
    </div>
  )
}
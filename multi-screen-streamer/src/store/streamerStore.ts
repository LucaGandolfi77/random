import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

export type ControlMode = 'unified' | 'split' | 'focus' | 'presenter'
export type GridMode = '1x1' | '2x2' | '3x3' | 'custom'

interface Viewport {
  id: string
  x: number
  y: number
  width: number
  height: number
  zoom: number
  isActive: boolean
}

interface StreamerState {
  mode: 'control' | 'stream'
  controlMode: ControlMode
  gridMode: GridMode
  viewports: Viewport[]
  isStreaming: boolean
  roomId: string | null
  connectionQuality: 'excellent' | 'good' | 'poor' | 'disconnected'
  latency: number
  initialize: () => void
  setMode: (mode: 'control' | 'stream') => void
  setControlMode: (mode: ControlMode) => void
  setGridMode: (mode: GridMode) => void
  toggleStreaming: () => void
  updateLatency: (latency: number) => void
}

export const useStreamerStore = create<StreamerState>()(
  devtools(
    (set) => ({
      mode: 'control',
      controlMode: 'unified',
      gridMode: '2x2',
      viewports: [],
      isStreaming: false,
      roomId: null,
      connectionQuality: 'disconnected',
      latency: 0,

      initialize: () => {
        const urlParams = new URLSearchParams(window.location.search)
        const roomId = urlParams.get('room') || Math.random().toString(36).substring(7)
        const mode = urlParams.get('mode') === 'stream' ? 'stream' : 'control'
        
        set({ roomId, mode })
      },

      setMode: (mode) => set({ mode }),
      setControlMode: (controlMode) => set({ controlMode }),
      setGridMode: (gridMode) => set({ gridMode }),
      toggleStreaming: () => set((state) => ({ isStreaming: !state.isStreaming })),
      updateLatency: (latency) => set({ latency })
    }),
    { name: 'streamer-store' }
  )
)
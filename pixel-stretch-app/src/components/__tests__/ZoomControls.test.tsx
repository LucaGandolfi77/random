import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ZoomControls } from '../ZoomControls'
import { useLayerStore } from '../../store/layerStore'

describe('ZoomControls', () => {
  beforeEach(() => {
    useLayerStore.setState({ zoom: 1, panOffset: { x: 0, y: 0 } })
  })

  it('renders zoom percentage', () => {
    render(<ZoomControls />)
    expect(screen.getByText('100%')).toBeInTheDocument()
  })

  it('zoomIn increases percentage', async () => {
    const user = userEvent.setup()
    render(<ZoomControls />)
    const plusBtn = screen.getByTitle('Zoom in (+)')
    await user.click(plusBtn)
    expect(screen.getByText('125%')).toBeInTheDocument()
  })

  it('zoomOut decreases percentage', async () => {
    const user = userEvent.setup()
    render(<ZoomControls />)
    const minusBtn = screen.getByTitle('Zoom out (-)')
    await user.click(minusBtn)
    expect(screen.getByText('75%')).toBeInTheDocument()
  })

  it('reset button resets to 100%', async () => {
    const user = userEvent.setup()
    useLayerStore.setState({ zoom: 3 })
    render(<ZoomControls />)
    expect(screen.getByText('300%')).toBeInTheDocument()
    const resetBtn = screen.getByTitle('Adatta alla vista (Ctrl+0)')
    await user.click(resetBtn)
    expect(screen.getByText('100%')).toBeInTheDocument()
  })

  it('shows separator', () => {
    const { container } = render(<ZoomControls />)
    expect(container.querySelector('.zoom-separator')).toBeInTheDocument()
  })
})

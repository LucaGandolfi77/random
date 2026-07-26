import { TopBar } from './TopBar'
import { ToolBar } from './ToolBar'
import { CanvasStage } from './CanvasStage'
import { LayersPanel } from './LayersPanel'
import { PropertiesPanel } from './PropertiesPanel'
import { ProgressOverlay } from './ProgressOverlay'

export default function App() {
  return (
    <div className="app">
      <TopBar />
      <div className="main-area">
        <ToolBar />
        <CanvasStage />
        <div className="right-panels">
          <LayersPanel />
          <PropertiesPanel />
        </div>
      </div>
      <ProgressOverlay />
    </div>
  )
}

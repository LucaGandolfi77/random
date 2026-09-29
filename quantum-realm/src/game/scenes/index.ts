import type { Scene, SceneId } from '../types'
import { collapserScene } from './collapser'
import { entanglementScene } from './entanglement'
import { fluxScene } from './flux'
import { interferenceScene } from './interference'
import { tunnelScene } from './tunnel'
import { uncertaintyScene } from './uncertainty'

export const SCENES: Record<SceneId, Scene> = {
  flux: fluxScene,
  tunnel: tunnelScene,
  interference: interferenceScene,
  entanglement: entanglementScene,
  uncertainty: uncertaintyScene,
  collapser: collapserScene,
}

export const getScene = (id: SceneId) => SCENES[id]

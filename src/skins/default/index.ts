import type { SkinModule } from '../../types/skin'
import { meta } from './meta'
import { Root } from './Root'

const skin: SkinModule = { ...meta, components: { Root } }

export default skin

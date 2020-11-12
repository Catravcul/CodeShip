import {GltfLoader} from './utils/GltfLoader'
import {StandardPE} from './propulsion_engines/StandardPE'

export class Spaceship {
    spaceship
    wingLeft = new StandardPE()
    fuselage

    constructor(p_spaceship, p_fuselagePath = '3d/Magnate.glb') {
        this.spaceship = p_spaceship
        this.wingLeft.renderOnGroup(this.spaceship)
        GltfLoader.loadAsChild(this.spaceship, p_fuselagePath, [this,'fuselage'])
    }

}
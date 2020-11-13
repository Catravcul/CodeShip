import {GltfLoader} from './utils/GltfLoader'
import {StandardPE} from './propulsion_engines/StandardPE'
import {StandardF} from './fuselage/StandardF'

export class Spaceship {
    spaceship
    wingLeft = new StandardPE()
    fuselage = new StandardF()

    constructor(p_spaceship, p_fuselagePath = '3d/Magnate.glb') {
        this.spaceship = p_spaceship
        this.wingLeft.renderOnGroup(this.spaceship)
        this.fuselage.renderOnGroup(this.spaceship)
    }

}
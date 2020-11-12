import {GltfLoader} from './utils/GltfLoader'

export class Spaceship {
    spaceship
    wingLeft
    fuselage
    
    constructor(p_spaceship, p_fuselagePath = '3d/Magnate.glb') {
        this.spaceship = p_spaceship
        GltfLoader.loadAsChild(this.spaceship, p_fuselagePath, [this,'fuselage'])
    }

}
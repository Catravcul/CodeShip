import {GltfLoader} from './utils/GltfLoader'

export class Spaceship {
    spaceship
    fuselage = {}
    wingLeft
    constructor(p_spaceship, p_fuselagePath = '3d/Magnate.glb') {
        this.spaceship = p_spaceship
        GltfLoader.loadAsChild(this.spaceship, p_fuselagePath, this.fuselage, GltfLoader.loader, this)
    }

}
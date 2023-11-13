import { GltfLoader } from '../utils/GltfLoader'
import { Camera } from '../Camera/Camera'
import { Cristal } from '../materials/Cristal'

/**
 * its purpose is to store properties of an spaceship component (fuselage, propulsionEngines...) and render them inside the spaceship scene
 */
export class ThreeModel {
    GltfLoader = GltfLoader
    static camera = Camera
    cristal = new Cristal
    lifePoints
    color
    /**
     * @type {THREE.Scene}
     */
    scene

    renderOnGroup(group, loadAsChild = this.GltfLoader.loadAsChild){
        loadAsChild(group, this.glbPath, [this,'scene'], this.middlewares)
    }
}
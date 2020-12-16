import { GltfLoader } from '../utils/GltfLoader'
import { Cristal } from '../materials/Cristal'

export class ThreeModel {
    GltfLoader = GltfLoader
    cristal = new Cristal
    lifePoints
    color
    scene

    renderOnGroup(group, loadAsChild = this.GltfLoader.loadAsChild){
        loadAsChild(group, this.glbPath, [this,'scene'], this.middlewares)
    }
}
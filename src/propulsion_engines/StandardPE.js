import {GltfLoader} from '../utils/GltfLoader'

export class StandardPE{
    glbPath = '3d/propulsion_engine/StandardPE.glb'
    lifePoints
    color
    scene

    constructor(p_color = 'grey', p_lifePoints = 100) {
        this.lifePoints = p_lifePoints
        this.color = p_color
    }

    renderOnGroup(group, loadAsChild = GltfLoader.loadAsChild){
        loadAsChild(group, this.glbPath, [this,'scene'])
    }
}
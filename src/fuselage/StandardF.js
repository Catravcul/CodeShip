import {GltfLoader} from '../utils/GltfLoader'

export class StandardF{
    glbPath = '3d/fusilage/Fusilage.glb'
    lifePoints
    color
    scene

    constructor(p_color = 'grey', p_lifePoints = 300) {
        this.lifePoints = p_lifePoints
        this.color = p_color
    }

    renderOnGroup(group, loadAsChild = GltfLoader.loadAsChild){
        loadAsChild(group, this.glbPath, [this,'scene'])
    }
}
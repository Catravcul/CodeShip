import {GltfLoader} from '../utils/GltfLoader'

export class StandardF{
    glbPath = '3d/fuselage/StandardF.glb'
    positionPE = {x:0, y:0, z:0}
    positionDW = {x:0, y:0, z:0}
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
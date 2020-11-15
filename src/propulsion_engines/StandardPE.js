import {GltfLoader} from '../utils/GltfLoader'

export class StandardPE {
    glbPath = '3d/propulsion_engine/StandardPE.glb'
    position
    lifePoints
    color
    scene
    
    middlewares = {
        alignSelf(instance, scene) {
            for (let axis in instance.position) {
                const distance = instance.position[axis]
                scene['translate' + axis.toUpperCase()](distance)
            }
        }
    }

    constructor(p_position, p_color = 'grey', p_lifePoints = 100) {
        this.position = p_position
        this.lifePoints = p_lifePoints
        this.color = p_color
    }

    renderOnGroup(group, loadAsChild = GltfLoader.loadAsChild) {
        loadAsChild.call(this, group, this.glbPath, [this,'scene'], this.middlewares)
    }

}
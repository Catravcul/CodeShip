import { ThreeModel } from '../ThreeModel'

export class StandardF extends ThreeModel {
    glbPath = '3d/fuselage/StandardF.glb'
    positionPE = {x:0, y:0.5, z:-5.05}
    positionDW = {x:0, y:0, z:0}
    middlewares = {
        setCristals(instance, scene) {
            scene.children[0].material = instance.cristal.material
        }
    }

    constructor(p_color = 'grey', p_lifePoints = 300) {
        super()
        this.lifePoints = p_lifePoints
        this.color = p_color
    }
}
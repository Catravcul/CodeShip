import { ThreeModel } from '../ThreeModel'

export class BirdF extends ThreeModel {
    glbPath = '3d/fuselage/BirdF.glb'
    positionPE = {x:0, y:-0.3, z:-2}
    rotationPE = {x:-0, y:0, z:0}
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
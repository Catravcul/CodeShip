import { ThreeModel } from '../ThreeModel.js'

export class BirdF extends ThreeModel {
    energy = 1
    glbPath = '3d/fuselage/BirdF.glb'
    positionPE = {x:0, y:-0.3, z:-1.5}
    rotationPE = {x:-0, y:0, z:0}
    positionTO = [
        {x:0.1, y:-3.3, z:-2.1},
        {x:-0.1, y:-3.3, z:-2.1},
        {x:0, y:-1.7, z:-1.7},
        {x:0, y:-1.6, z:-0.7},
        {x:0, y:-1.73, z:2.6}
    ]
    scaleTO = 0.3
    rotationTO = [
        {x:0.3, y:-0.2, z:0.25},
        {x:0.3, y:0.2, z:-0.25},
        {x:-0.3, y:0, z:0},
        {x:-0.3, y:0, z:0},
        {x:-0.3, y:0, z:0}
    ]
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
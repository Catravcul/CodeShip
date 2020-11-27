import { ThreeModel } from '../ThreeModel.js'

export class BirdF extends ThreeModel {
    glbPath = '3d/fuselage/BirdF.glb'
    positionPE = {x:0, y:-0.3, z:-2}
    rotationPE = {x:-0, y:0, z:0}
    positionTO = [
        {x:0.8, y:-2.3, z:-3.85},
        {x:-0.8, y:-2.3, z:-3.85},
        {x:0, y:-2.2, z:-2.3},
        {x:0, y:-2.2, z:-1.3},
        {x:0, y:-1.6, z:3.3}
    ]
    scaleTO = 0.4
    rotationTO = [
        {x:-0.05, y:0, z:0.25},
        {x:-0.05, y:0, z:-0.25},
        {x:-0.2, y:0, z:0},
        {x:-0.2, y:0, z:0},
        {x:0.16, y:0, z:0}
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
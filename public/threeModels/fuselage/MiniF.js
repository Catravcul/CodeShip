import { ThreeModel } from '../ThreeModel.js'

export class MiniF extends ThreeModel {
    glbPath = '3d/fuselage/MiniF.glb'
    positionPE = {x:0, y:-0.3, z:-8.4}
    rotationPE = {x:-0.1, y:0, z:0}
    positionTO = [
        {x:1.2, y:-2.1, z:-3.85},
        {x:-1.2, y:-2.1, z:-3.85},
        {x:1.2, y:-2, z:-1.5},
        {x:-1.2, y:-2, z:-1.5},
        {x:0, y:-2.6, z:4.5}
    ]
    rotationTO = [
        {x:-0.05, y:0, z:0.25},
        {x:-0.05, y:0, z:-0.25},
        {x:-0.05, y:0, z:0.25},
        {x:-0.05, y:0, z:-0.25},
        {x:-0.2, y:0, z:0}
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
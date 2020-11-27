import { ThreeModel } from '../ThreeModel.js'

export class StandardF extends ThreeModel {
    glbPath = '3d/fuselage/StandardF.glb'
    positionPE = {x:0, y:0.5, z:-5.05}
    rotationPE = {x:-0.1, y:0, z:0}
    positionDW = {x:0, y:0, z:0}
    positionTO = [
        {x:1.2, y:-1, z:-3.85},
        {x:-1.2, y:-1, z:-3.85},
        {x:1.2, y:-1, z:-1.5},
        {x:-1.2, y:-1, z:-1.5},
        {x:1.2, y:-1, z:4.5},
        {x:-1.2, y:-1, z:4.5}
    ]
    rotationTO = [
        {x:0.01, y:0, z:0.25},
        {x:0.01, y:0, z:-0.25},
        {x:-0.01, y:0, z:0.25},
        {x:-0.01, y:0, z:-0.25},
        {x:-0.01, y:0, z:0.25},
        {x:-0.01, y:0, z:-0.25}
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
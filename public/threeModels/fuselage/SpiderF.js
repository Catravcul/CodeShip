import { ThreeModel } from '../ThreeModel.js'

export class SpiderF extends ThreeModel {
    glbPath = '3d/fuselage/SpiderF.glb'
    positionPE = {x:0, y:0.3, z:-5.2}
    rotationPE = {x:-0, y:-0, z:-0}
    positionDW = {x:0, y:0, z:0}
    scaleTO = 0.8
    positionTO = [
        {x:0, y:-1.8, z:-3},
        {x:0, y:-1.7, z:-0.8},
        {x:0, y:-1.7, z:1.5},
        {x:0, y:-1.95, z:3.8}
    ]
    rotationTO = [
        {x:0.09, y:0, z:0},
        {x:0, y:0, z:0},
        {x:-0, y:0, z:0},
        {x:-0.1, y:0, z:0}
    ]
    middlewares = {
        setCristals(instance, scene) {
            // scene.children[0].material = instance.cristal.material
        }
    }

    constructor(p_color = 'grey', p_lifePoints = 300) {
        super()
        this.lifePoints = p_lifePoints
        this.color = p_color
    }
}
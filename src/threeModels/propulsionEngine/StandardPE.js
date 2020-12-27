import { PropulsionEngine } from './PropulsionEngine'

export class StandardPE extends PropulsionEngine {
    glbPath = PropulsionEngine.folderPath + 'StandardPE.glb'
    potential = 2
    energy = 2

    constructor(p_position, p_rotation, p_color = 'grey', p_lifePoints = 100) {
        super()
        this.position = p_position
        this.rotation = p_rotation
        this.lifePoints = p_lifePoints
        this.color = p_color
    }

}
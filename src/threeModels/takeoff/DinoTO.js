import { Takeoff } from './Takeoff'

export class DinoTO extends Takeoff {
    glbPath = '3d/takeoff/DinoTO.glb'

    constructor(p_positions, p_rotations, p_scale, p_color = 'grey', p_lifePoints = 100) {
        super()
        this.positions = p_positions
        this.rotations = p_rotations
        this.scale = p_scale
        this.lifePoints = p_lifePoints
        this.color = p_color
    }

}
import { ThreeModel } from '../ThreeModel'

export class PropulsionEngine extends ThreeModel {
    static folderPath = '3d/propulsion_engine/'
    position
    rotation
    middlewares = {
        alignSelf(instance, scene) {
            for (let axis in instance.position) {
                const distance = instance.position[axis]
                scene['translate' + axis.toUpperCase()](distance)
            }
            for (let axis in instance.rotation) {
                const grades = instance.rotation[axis]
                scene['rotate' + axis.toUpperCase()](grades)
            }
        }
    }

    /**
     * Move spaceship forward
     * @param {scene} spaceship
     * @param {int} speed
     */
    run(spaceship, speed) {
        speed *= 0.1
        if (speed <= this.energy) {
            this.energy -= speed
            spaceship.translateZ(speed)
        }
        console.log(speed)
    }

    
    charge(energy) {
        if (this.energy !== this.potential) {
            this.energy += energy * 0.1
        }
        console.log(this.energy)
    }
}
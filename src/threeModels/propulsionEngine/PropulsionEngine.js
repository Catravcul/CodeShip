import { ThreeModel } from '../ThreeModel'

export class PropulsionEngine extends ThreeModel {
    static folderPath = '3d/propulsion_engine/'
    runInterval
    chargeInterval
    speed = 1
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
     * Reset movement interval runInterval
     * @param {scene} spaceship
     * @param {int} speed
     */
    run(spaceship, speed = this.speed) {
        clearInterval(this.runInterval)
        if (speed <= this.energy) {
            this.runInterval = setInterval(() => this.accelerate(spaceship, speed), 50)
        }
    }

    /**
     * Move spaceship
     * @param {scene} spaceship 
     * @param {int} speed 
     */
    accelerate(spaceship, speed = this.speed) {
        spaceship.translateZ(speed)
        speed *= 0.1
        if (speed > this.energy) {
            clearInterval(this.runInterval)
        }
        this.energy -= speed
    }

    /**
     * clear interval runInterval
     */
    stop() {
        clearInterval(this.runInterval)
    }
    
    /**
     * Reset charge interval chargeInterval
     * @param {int} energy
     */
    charge(energy) {
        clearInterval(this.chargeInterval)
        this.chargeInterval = setInterval(() => this.restore(energy), 500)
    }
    
    /**
     * Restore spaceship energy
     * @param {int} energy 
     */
    restore(energy) {
        this.energy += energy
        if (this.energy > this.potential) {
            clearInterval(this.chargeInterval)
            this.energy = this.potential
        }
    }
}
import { ThreeModel } from '../ThreeModel'

export class PropulsionEngine extends ThreeModel {
    static folderPath = '3d/propulsion_engine/'
    runInterval
    chargeInterval
    spinInterval
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
     * Reset movement interval runInterval, take callback for the setInterval func
     * @param {scene} spaceship
     * @param {int} speed
     */
    runForward (spaceship, speed = this.speed) {
        spaceship.translateZ(speed)
    }
    runBackward (spaceship, speed = this.speed) {
        spaceship.translateZ(speed * -1)
    }
    
    /**
     * Spin spaceship
     * @param {scene} spaceship 
     * @param {object} angles
     */
    spin(spaceship, {x=0, y=0, z=0}) {
        spaceship.rotateX(x)
        spaceship.rotateY(y)
        spaceship.rotateZ(z)
    }

    /**
     * clear interval spinInterval
     */
    stand() {
        clearInterval(this.spinInterval)
    }

    /**
     * clear interval runInterval
     */
    stop() {
        clearInterval(this.runInterval)
    }
    
    /**
     * Reset charge interval chargeInterval, take callback for the setInterval func
     * @param {int} energy
     * @param {function} callback
     */
    charge(energy, callback=() => {}) {
        clearInterval(this.chargeInterval)
        this.chargeInterval = setInterval(() => this.restore(energy, callback), 500)
    }
    
    /**
     * Restore spaceship energy, use callback with this.energy & this.potential as args
     * @param {int} energy 
     * @param {function} callback
     */
    restore(energy, callback=() => {}) {
        this.energy += energy
        callback(this.energy, this.potential)
        if (this.energy > this.potential) {
            clearInterval(this.chargeInterval)
            this.energy = this.potential
        }
    }
}
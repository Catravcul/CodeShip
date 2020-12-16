import { ThreeModel } from '../ThreeModel'

export class PropulsionEngine extends ThreeModel {
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
}
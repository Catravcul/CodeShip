import { ThreeModel } from '../ThreeModel'

export class PropulsionEngine extends ThreeModel {
    middlewares = {
        alignSelf(instance, scene) {
            for (let axis in instance.position) {
                const distance = instance.position[axis]
                scene['translate' + axis.toUpperCase()](distance)
            }
        }
    }
}
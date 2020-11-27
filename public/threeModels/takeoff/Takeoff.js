import { ThreeModel } from '../ThreeModel.js'

export class Takeoff extends ThreeModel {
    positions
    rotations
    scale
    middlewares = {
        alignSelf(instance, scene) {
            const scale = instance.scale || 1
            scene.scale.x = scale
            scene.scale.y = scale
            scene.scale.z = scale
            for (let index in instance.positions) {
                const newScene = scene.clone()
                scene.parent.add(newScene)
                for (let axis in instance.positions[index]) {
                    const distance = instance.positions[index][axis]
                    const grades = instance.rotations[index][axis]
                    axis = axis.toUpperCase()
                    newScene['translate' + axis](distance)
                    newScene['rotate' + axis](grades)
                }
            }
        }
    }
}
import { GltfLoader } from '../utils/GltfLoader.js'

export class Environment {
    asteroids = ['3d/asteroids/Cloud.glb', '3d/asteroids/Fossil.glb', '3d/asteroids/Layer.glb', 
    '3d/asteroids/Poligon.glb', '3d/asteroids/Stone.glb']
    scene
    distanceArrays = [
        [ 10, -10, -50, -100, 50, 100, -160, -220, 160, 220, -300, 300],  
        [10, -10, -30, -40],
        [ 10, -10, -50, 50, 100, -100, -160, 230, -210, 300, 400, 510]
    ]
    middlewares = {
        alignWithOthers(instance, scene) {
            const axis = ['X', 'Y', 'Z']
            const lengths = [11, 3, 11]
            instance.distanceArrays.forEach((distances, index) => {
                const distance = distances[(Math.random() * lengths[index]).toFixed(0)]
                scene['translate' + axis[index]](distance)
            })
        }
    }

    constructor(p_scene) {
        this.scene = p_scene
        let quantity = 40
        while(quantity > 0) {
            quantity--
            let num = (Math.random()*4).toFixed(0)
            GltfLoader.loadAsChild(this.scene, this.asteroids[num], [this,'asteroid'], this.middlewares)
        }
    }

}
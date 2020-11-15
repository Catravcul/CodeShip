import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader';

export class GltfLoader{
    static loader = new GLTFLoader()

    /**
     * Gives a 3d object already in scene a new child (3d object) which is loaded with GLTF
     * @param {THREE.Group} p_parent - 3d object in scene
     * @param {string} p_childPath - path of the .glb file
     * @param {p_instance} p_instance - instance which propery is going to store rendered 3d model
     * @param {string} property - property name
     */
    static loadAsChild(p_parent, p_childPath, [p_instance, p_property] = [{},'fail'], middlewares = {}, loader = GltfLoader.loader) {
        loader.load( p_childPath, function ( {scene} ) {
            p_instance[p_property] = scene
            for (const key in middlewares) {
                middlewares[key](p_instance, scene)
            }
            p_parent.add(scene)
        }, undefined, function ( error ) {
            console.error( error );
        } );
    }
}
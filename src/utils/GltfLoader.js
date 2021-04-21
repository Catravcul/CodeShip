import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader';

export class GltfLoader{
    static loader = new GLTFLoader()

    /**
     * 
     * Gives a 3d object already in scene a new child (3d object) which is loaded with GLTF
     * @param {THREE.Group} p_parent - 3d object in scene
     * @param {string} p_childPath - path of the .glb file
     * @param {array} param2 - two elements array [object, string] 
     * @param {object} middlewares - group of functions to execute with loaded 3d model scene as param
     * @param {GltfLoader} loader - by default uses THREE GltfLoader
     */
    static loadAsChild(p_parent, p_childPath, [p_instance, p_property] = [{},'fail'], middlewares = {}, loader = GltfLoader.loader) {
        loader.load( p_childPath, function ( {scene} ) {
            p_instance[p_property] = scene
            p_parent.add(scene)
            for (const key in middlewares) {
                middlewares[key](p_instance, scene)
            }
        }, undefined, function ( error ) {
            console.error( error );
        } );
    }

    /**
     * 
     * @param {string} p_path - path of .glb file
     * @param {array} p_array - array where loaded THREE scene would be stored
     * @param {function} callback - function to be called with loaded THREE scene as param
     * @param {GltfLoader} loader - by default uses THREE GltfLoader
     */
    static loadInArray(p_path, p_array, callback = () => {}, loader = GltfLoader.loader) {
        loader.load(p_path, function ( {scene} ) {
            p_array.push(scene)
            callback()
        })
    }
}
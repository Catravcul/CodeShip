import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader';

export class GltfLoader{
    static loader = new GLTFLoader()

    /**
     * Gives a 3d object already in scene a new child (3d object) which is loaded with GLTF
     * @param {THREE.Group} p_parent - 3d object in scene
     * @param {string} p_childPath - path of the .glb file
     * @param {object} p_reference - object reference to store scene of child loaded
     */
    static loadAsChild(p_parent, p_childPath, p_reference = {}, loader = GltfLoader.loader) {   
        let reference = p_reference
        loader.load( p_childPath, function ( {scene} ) {
            reference.scene = scene
            p_parent.add(scene)
        }, undefined, function ( error ) {
            console.error( error );
        } );
    }
}
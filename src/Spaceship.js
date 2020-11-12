import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader';

export class Spaceship{
    loader = new GLTFLoader()
    spaceship
    fuselage = {}
    wingLeft
    constructor(p_spaceship, p_fuselage = '3d/Magnate.glb'){
        this.spaceship = p_spaceship
        this.setFuselage(p_spaceship, p_fuselage)
    }

    /**
     * Gives a 3d object already in scene a new child (3d object)
     * @param {THREE.Group} p_spaceship - 3d object in scene
     * @param {string} p_fuselage - path of the .glb file
     */
    setFuselage(p_spaceship, p_fuselage){   
        let fuselage = this.fuselage
        this.loader.load( p_fuselage, function ( gltf ) {
            fuselage.gltf=gltf
            p_spaceship.add(gltf.scene)
        }, undefined, function ( error ) {
            console.error( error );
        } );
    }

}
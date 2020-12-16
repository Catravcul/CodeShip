import React, { Component } from "react";
import ReactDOM from "react-dom";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls"
import { Environment } from './threeModels/Environment'


export class Game extends Component {

    /**
     * Render scene and spaceship in default way
     */
    componentDidMount() {

        // BASIC THREE.JS THINGS: SCENE, CAMERA, RENDERER
        // Three.js Creating a scene tutorial
        // https://threejs.org/docs/index.html#manual/en/introduction/Creating-a-scene
        var scene = new THREE.Scene();
        var camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        camera.position.z = 13;
        camera.position.y = 5;
        scene.rotateY(5.3);

        var renderer = new THREE.WebGLRenderer();
        renderer.setSize(window.innerWidth, window.innerHeight);


        const path = "./img/";
        const format = '.jpg';
        const urls = [
          path + 'spaceBox' + format, path + 'spaceBox' + format,
          path + 'spaceBox' + format, path + 'spaceBox' + format,
          path + 'spaceBox' + format, path + 'spaceBox' + format
        ];
  
        const textureCube = new THREE.CubeTextureLoader().load( urls );
        scene.background = textureCube;
        const environment = new Environment(scene)

        // MOUNT INSIDE OF REACT
        this.mount.appendChild(renderer.domElement); // mount a scene inside of React using a ref



        // CAMERA CONTROLS
        // https://threejs.org/docs/index.html#examples/controls/OrbitControls
        this.controls = new OrbitControls(camera, renderer.domElement);



        // ADD LIGHTS
        var lights = [];
        lights[ 0 ] = new THREE.PointLight( 0xffffff, 1, 0 );
        lights[ 1 ] = new THREE.PointLight( 0xffffff, 1, 0 );
        lights[ 2 ] = new THREE.PointLight( 0xffffff, 1, 0 );

        lights[ 0 ].position.set( 0, 200, 0 );
        lights[ 1 ].position.set( 100, 200, 100 );
        lights[ 2 ].position.set( - 100, - 200, - 100 );

        scene.add( lights[ 0 ] );
        scene.add( lights[ 1 ] );
        scene.add( lights[ 2 ] );



        // SCALE ON RESIZE

        // Check "How can scene scale be preserved on resize?" section of Three.js FAQ
        // https://threejs.org/docs/index.html#manual/en/introduction/FAQ

        // code below is taken from Three.js fiddle
        // http://jsfiddle.net/Q4Jpu/

        // remember these initial values
        var tanFOV = Math.tan( ( ( Math.PI / 180 ) * camera.fov / 2 ) );
        var windowHeight = window.innerHeight;

        window.addEventListener( 'resize', onWindowResize, false );

        function onWindowResize( event ) {

            camera.aspect = window.innerWidth / window.innerHeight;

            // adjust the FOV
            camera.fov = ( 360 / Math.PI ) * Math.atan( tanFOV * ( window.innerHeight / windowHeight ) );

            camera.updateProjectionMatrix();
            camera.lookAt( scene.position );

            renderer.setSize( window.innerWidth, window.innerHeight );
            renderer.render( scene, camera );

        }

        console.log(scene);

        const spaceship = new THREE.Group();
        import('./threeModels/Spaceship').then(({Spaceship}) => {
            const spaceshipInstance = new Spaceship(spaceship)
            console.log(spaceshipInstance)
            scene.add(spaceship)
        })

        import('./threeModels/Environment').then(({Environment}) => {
            const environment = new Environment(scene)
        })

        var animate = function () {
            requestAnimationFrame( animate );
            // spaceship.translateZ(0.5)
            renderer.render( scene, camera );
        };
    
        animate();
            
    }
    render() {
        return <div ref={ref => (this.mount = ref)} />;
    }
}

const rootElement = document.getElementById("root");
ReactDOM.render(<Game />, rootElement);
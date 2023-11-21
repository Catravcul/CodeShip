import { Group, Scene } from 'three'

import { Component } from 'react'
import { getConfig } from '../utils/config'
import { Spaceship } from '../threeModels/Spaceship'

export class Config extends Component {
    static config = getConfig()
    /**
     * This property is the default value for telling the spaceshipInstance (spaceship builder), which parts to arrange in the scene to create the spaceship
     */
    static components = {fuselage: 'StandardF', propulsionEngine: 'StandardPE', takeoff: 'StandardTO'}
    /**
     * Scene expected to contain the spaceship parts arranged
     */
    static ship = new Group()
    /**
     * Object responsable of the spaceship creation, it contains the parts of it
     */
    static shipInstance = new Spaceship(Config.ship)
    /**
     * @type {function} expected to update the camera position to follow the object passed as parameter
     */
    static updateCamera
    /**
     * Base scene which stores all the threejs 3d elements
     * @type {Scene}
     */
    static scene
}
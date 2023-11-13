import * as Components from './Components'
import { ThreeModel } from './ThreeModel'

/**
 * 3D spaceship builder, it contains the scene, parts of the ship, and methods to render the spaceship or change a part.
 */
export class Spaceship {
    spaceship
    /**
     * this field is stablished by the renderComponents
    //  * @type {ThreeModel}
     */
    fuselage
    /**
     * this field is stablished by the renderComponents
    //  * @type {ThreeModel}
     */
    takeoff
    /**
     * this field is stablished by the renderComponents
    //  * @type {ThreeModel}
     */
    propulsionEngine

    components = {fuselage: 'StandardF', takeoff: 'StandardTO', propulsionEngine: 'StandardPE'}

    /**
     * It takes a scene as parameter to later on, arrange the parts of the ship together, inside of it.
     * @param {THREE.Scene} p_spaceship 
     * @returns Spaceship
     */
    constructor(p_spaceship) {
        this.spaceship = p_spaceship
    }

    /**
     * Clears the scene to render it with the spaceship elements, the elements instances are saved in their respective fields
     */
    renderComponents() {
        this.spaceship.clear()
        this.fuselage = new Components[this.components.fuselage]()
        this.takeoff = new Components[this.components.takeoff](this.fuselage.positionTO, this.fuselage.rotationTO, this.fuselage.scaleTO)
        this.propulsionEngine = new Components[this.components.propulsionEngine](this.fuselage.positionPE, this.fuselage.rotationPE)
        this.fuselage.renderOnGroup(this.spaceship)
        this.takeoff.renderOnGroup(this.spaceship)
        this.propulsionEngine.renderOnGroup(this.spaceship)
    }

    setComponent(component, value) {
        this.components[component] = value
        this.renderComponents()
    }
}
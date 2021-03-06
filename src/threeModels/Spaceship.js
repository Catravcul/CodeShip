import * as Components from './Components'

export class Spaceship {
    spaceship
    fuselage
    takeoff
    propulsionEngine

    components = {fuselage: 'StandardF', takeoff: 'StandardTO', propulsionEngine: 'StandardPE'}

    constructor(p_spaceship) {
        this.spaceship = p_spaceship
    }

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
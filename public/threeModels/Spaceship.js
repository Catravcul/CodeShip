import * as Components from './Components.js'

export class Spaceship {
    spaceship
    fuselage = new Components.BirdF()
    takeoff = new Components.StandardTO(this.fuselage.positionTO, this.fuselage.rotationTO, this.fuselage.scaleTO)
    propulsionEngine = new Components.BirdPE(this.fuselage.positionPE, this.fuselage.rotationPE)

    constructor(p_spaceship) {
        this.spaceship = p_spaceship
        this.fuselage.renderOnGroup(this.spaceship)
        this.takeoff.renderOnGroup(this.spaceship)
        this.propulsionEngine.renderOnGroup(this.spaceship)
    }

}
import * as Components from './Components.js'

export class Spaceship {
    spaceship
    fuselage = new Components.BirdF()
    wingLeft = new Components.BirdPE(this.fuselage.positionPE, this.fuselage.rotationPE)

    constructor(p_spaceship) {
        this.spaceship = p_spaceship
        this.wingLeft.renderOnGroup(this.spaceship)
        this.fuselage.renderOnGroup(this.spaceship)
    }

}
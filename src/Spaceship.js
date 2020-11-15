import {StandardPE} from './propulsion_engines/StandardPE'
import {StandardF} from './fuselage/StandardF'

export class Spaceship {
    spaceship
    fuselage = new StandardF()
    wingLeft = new StandardPE(this.fuselage.positionPE)

    constructor(p_spaceship) {
        this.spaceship = p_spaceship
        this.wingLeft.renderOnGroup(this.spaceship)
        this.fuselage.renderOnGroup(this.spaceship)
    }

}
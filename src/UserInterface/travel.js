import { Config } from '../Config'
import './travel.css'

export class Nav extends Config {

    exit = () => {
        this.props.shipTravel()
    }

    move = amount => {
        Config.shipInstance.propulsionEngine.run(Config.shipInstance.spaceship)
        Config.shipInstance.propulsionEngine.charge(Config.shipInstance.fuselage.energy)
    }

    render() {
        return(
            <>
            <button className={"btn " + (this.props.travel ? '' : 'hidden')} onClick = {this.exit}>
            <img src="/img/travel.svg" alt="cancel" width="50px"/>
            </button>
            <button className={"btn " + (this.props.travel ? '' : 'hidden')} onClick = {this.move}>
            <img src="/img/launch.svg" alt="move" width="50px"/>
            </button>
            </>
        )
    }
}

export class Interface extends Config {

    
}
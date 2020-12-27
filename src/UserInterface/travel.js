import { Config } from '../Config'

export class Nav extends Config {

    exit = () => {
        this.props.shipTravel()
    }

    move = amount => {
        Config.shipInstance.propulsionEngine.run(Config.shipInstance.spaceship, 2)
        Config.shipInstance.propulsionEngine.charge(Config.shipInstance.fuselage.energy)
    }

    render() {
        return(
            <>
            <button className={"btn " + (this.props.travel ? '' : 'hidden')} onClick = {this.exit}>
            <img src="/img/cancel.svg" alt="cancel" width="50px"/>
            </button>
            <button className={"btn " + (this.props.travel ? '' : 'hidden')} onClick = {this.move}>
            <img src="/img/cancel.svg" alt="move" width="50px"/>
            </button>
            </>
        )
    }
}

export class Interface extends Config {
}
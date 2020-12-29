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

    changeSpeed = e => {
        Config.shipInstance.propulsionEngine.speed = e.currentTarget.value
        console.log(Config.shipInstance.propulsionEngine.speed)
    }

    render() {
        const speeds = []
        if (Config.shipInstance.propulsionEngine) {
            let speed = 0
            while (Config.shipInstance.propulsionEngine.potential > speed) {
                speed++
                speeds.push(speed)
            }
        }
        return(
            <nav className={"absolute bottom right speeds" + (this.props.travel ? '' : ' hidden')}>
                {speeds.map(speed => (
                    <input type="button" className="btn num" value={speed} onClick={this.changeSpeed}/>
                ))}
            </nav>
        )
    }
}
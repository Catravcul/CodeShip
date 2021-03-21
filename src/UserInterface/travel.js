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

    stop = () => {
        Config.shipInstance.propulsionEngine.stop()
    }

    render() {
        return(
            <>
            <button className={"btn " + (this.props.travel ? '' : 'hidden')} onClick = {this.stop}>
            <img src="/img/orbit.svg" alt="stop" width="50px"/>
            </button>
            <button className={"btn " + (this.props.travel ? '' : 'hidden')} onClick = {this.move}>
            <img src="/img/launch.svg" alt="move" width="50px"/>
            </button>
            <button className={"btn " + (this.props.travel ? '' : 'hidden')} onClick = {this.exit}>
            <img src="/img/travel.svg" alt="cancel" width="50px"/>
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
            // <nav className={"absolute bottom right speeds" + (this.props.travel ? '' : ' hidden')}>
            //     {speeds.map(speed => (
            //         <input type="button" className="btn num" value={speed} onClick={this.changeSpeed}/>
            //     ))}
            // </nav>
            <nav className="absolute bottom right">
                <input className="min-size-80-px size-8-vw rotate-90-deg" type="range" min="0" max="45"></input>
                <div className="flex-row">
                    <input className="min-size-80-px size-8-vw" type="range" min="0" max="45"></input>
                    <div className="m-auto">
                        <div className="min-w-80-px w-8-vw flex-row justify-content-space-around">
                            <label>X: </label><input type="number" max="45" className="min-w-30-px w-1-vw"/>
                        </div>
                        <div className="min-w-80-px w-8-vw flex-row justify-content-space-around">
                            <label>Y: </label><input type="number" max="45" className="min-w-30-px w-1-vw"/>
                        </div>
                    </div>
                    <input className="min-size-80-px size-8-vw rotate-180-deg" type="range" min="0" max="45"></input>
                </div>
                <input className="min-size-80-px size-8-vw rotate-270-deg" type="range" min="0" max="45"></input>
            </nav>
        )
    }
}
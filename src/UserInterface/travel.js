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
                <div className="min-size-80-px size-8-vw inline-block relative">
                    <input className="w-100 absolute top-30 left rotate-90-deg glass-slider slider-thumb-turn-up" type="range" min="0" max="45"></input>
                </div>
                <div className="flex-row">
                    <div className="min-size-80-px size-8-vw inline-block relative">
                        <input className="w-100 absolute-vertical-center right-10 glass-slider slider-thumb-turn-left" type="range" min="0" max="45"></input>
                    </div>
                    <div className="m-auto color-white-and-black z-index-1">
                        <div className="min-w-80-px w-8-vw flex-row justify-content-space-around">
                            <label>X: </label><input type="number" min="-45" max="45" className="min-w-30-px w-1-vw"/>
                        </div>
                        <div className="min-w-80-px w-8-vw flex-row justify-content-space-around">
                            <label>Y: </label><input type="number" min="-45" max="45" className="min-w-30-px w-1-vw"/>
                        </div>
                    </div>
                    <div className="min-size-80-px size-8-vw b-rad-30 absolute left-50 translateX-less-50 glass-panel"></div>
                    <div className="min-size-80-px size-8-vw inline-block relative">
                        <input className="w-100 absolute-vertical-center-flipped left-10 glass-slider slider-thumb-turn-right" type="range" min="0" max="45"></input>
                    </div>
                </div>
                <div className="min-size-80-px size-8-vw inline-block relative">
                    <input className="w-100 absolute bottom-30 left rotate-270-deg glass-slider slider-thumb-turn-down" type="range" min="0" max="45"></input>
                </div>
            </nav>
        )
    }
}
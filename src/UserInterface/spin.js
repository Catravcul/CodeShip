
import React from 'react'
import {Config} from '../Config'

export class Spin extends Config {

    spinInterval = React.createRef(null)

    keydownHandler = e => {
        switch (e.key) {
            case 'i' : Config.shipInstance.propulsionEngine.spin(Config.shipInstance.spaceship, {x: -0.08, y:0, z:0}); break;
            case 'j' : Config.shipInstance.propulsionEngine.spin(Config.shipInstance.spaceship, {x:0, y: 0.08, z:0}); break;
            case 'k' : Config.shipInstance.propulsionEngine.spin(Config.shipInstance.spaceship, {x: 0.08 , y:0, z:0}); break;
            case 'l' : Config.shipInstance.propulsionEngine.spin(Config.shipInstance.spaceship, {x: 0, y: -0.08, z:0}); break;
            default: break;
        }
    }

    componentDidMount () {
        document.addEventListener("keydown", this.keydownHandler)
    }
    componentWillUnmount () {
        document.removeEventListener("keydown", this.keydownHandler)
    }
    
    spin = ({x, y, z}) => {
        this.spinInterval.current = setInterval(() => Config.shipInstance.propulsionEngine.spin(Config.shipInstance.spaceship, {x ,y ,z}), 12)
    }
    stopSpin = () => {
        clearInterval(this.spinInterval.current)
    }
    
    render() {
        return(
            <nav className="absolute bottom right">
                <div className="min-size-80-px size-8-vw inline-block relative color-white-and-black">
                    <button className="absolute bottom glass-panel" onMouseDown={() => this.spin({x: -0.02, y:0, z:0})} onMouseUp={this.stopSpin}>i</button>
                </div>
                <div className="flex-row">
                    <div className="min-size-80-px size-8-vw inline-block relative color-white-and-black">
                        <button className="absolute-vertical-center right-10 glass-panel" onMouseDown={() => this.spin({x:0, y: 0.02, z:0})} onMouseUp={this.stopSpin}>j</button>
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
                    <div className="min-size-80-px size-8-vw inline-block relative color-white-and-black">
                        <button className="absolute-vertical-center left-10 glass-panel" onMouseDown={() => this.spin({x: 0, y: -0.02, z:0})} onMouseUp={this.stopSpin}>l</button>
                    </div>
                </div>
                <div className="min-size-80-px size-8-vw inline-block relative color-white-and-black">
                    <button className="absolute top glass-panel" onMouseDown={() => this.spin({x: 0.02 , y:0, z:0})} onMouseUp={this.stopSpin}>k</button>
                </div>
            </nav>
        )
    }
}

import React from 'react'
import {Config} from '../Config'

export class Spin extends Config {

    spinInterval = React.createRef(null)
    
    spin = ({x, y, z}) => {
        this.spinInterval.current = setInterval(() => Config.shipInstance.propulsionEngine.spin(Config.shipInstance.spaceship, {x ,y ,z}), 8)
    }
    stopSpin = () => {
        clearInterval(this.spinInterval.current)
    }
    
    render() {
        return(
            <nav className="absolute bottom right">
                <div className="min-size-80-px size-8-vw inline-block relative color-white-and-black">
                    <button className="absolute bottom glass-panel" onMouseDown={() => this.spin({x: -0.01, y:0, z:0})} onMouseUp={this.stopSpin}>&uarr;</button>
                </div>
                <div className="flex-row">
                    <div className="min-size-80-px size-8-vw inline-block relative color-white-and-black">
                        <button className="absolute-vertical-center right-10 glass-panel" onMouseDown={() => this.spin({x:0, y: 0.01, z:0})} onMouseUp={this.stopSpin}>&larr;</button>
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
                        <button className="absolute-vertical-center left-10 glass-panel" onMouseDown={() => this.spin({x: 0, y: -0.01, z:0})} onMouseUp={this.stopSpin}>&rarr;</button>
                    </div>
                </div>
                <div className="min-size-80-px size-8-vw inline-block relative color-white-and-black">
                    <button className="absolute top glass-panel" onMouseDown={() => this.spin({x: 0.01 , y:0, z:0})} onMouseUp={this.stopSpin}>&darr;</button>
                </div>
            </nav>
        )
    }
}
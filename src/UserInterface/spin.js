import {Config} from '../Config'

export class Spin extends Config {
    
    spin = ({x, y, z}) => {
        Config.shipInstance.propulsionEngine.spin(Config.shipInstance.spaceship, {x ,y ,z})
    }
    
    render() {
        return(
            <nav className="absolute bottom right">
                <div className="min-size-80-px size-8-vw inline-block relative">
                    <input className="w-100 absolute top-30 left rotate-90-deg glass-slider slider-thumb-turn-up" type="range" onChange={e => this.spin({x:(-0.01 * e.currentTarget.value), y:0, z:0})} min="0" max="45"></input>
                </div>
                <div className="flex-row">
                    <div className="min-size-80-px size-8-vw inline-block relative">
                        <input className="w-100 absolute-vertical-center right-10 glass-slider slider-thumb-turn-left" type="range" onChange={e => this.spin({x:0, y:(-0.01 * e.currentTarget.value), z:0})} min="0" max="45"></input>
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
                        <input className="w-100 absolute-vertical-center-flipped left-10 glass-slider slider-thumb-turn-right" type="range" onChange={e => this.spin({x:0, y:(0.01 * e.currentTarget.value), z:0})} min="0" max="45"></input>
                    </div>
                </div>
                <div className="min-size-80-px size-8-vw inline-block relative">
                    <input className="w-100 absolute bottom-30 left rotate-270-deg glass-slider slider-thumb-turn-down" type="range" onChange={e => this.spin({x:(0.01 * e.currentTarget.value), y:0, z:0})} min="0" max="45"></input>
                </div>
            </nav>
        )
    }
}
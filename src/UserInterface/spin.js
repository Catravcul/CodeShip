
import React from 'react'
import {Config} from '../Config'
import GameLoop from '../Game/loop'

export class Spin extends Config {

    spinningId = React.createRef(0)

    isSpinning = {
        left: false,
        right: false,
        up: false,
        down: false
    }
    spinUp = () => this.isSpinning.up = true
    spinLeft = () => this.isSpinning.left = true
    spinDown = () => this.isSpinning.down = true
    spinRight = () => this.isSpinning.right = true

    stopSpinUp = () => this.isSpinning.up = false
    stopSpinLeft = () => this.isSpinning.left = false
    stopSpinDown = () => this.isSpinning.down = false
    stopSpinRight = () => this.isSpinning.right = false
    
    keydownHandler = e => {
        switch (e.key) {
            case 'i' : this.spinUp() ; break;
            case 'j' : this.spinLeft() ; break;
            case 'k' : this.spinDown() ; break;
            case 'l' : this.spinRight() ; break;
            default: break;
        }
    }
    keyupHandler = e => {
        switch (e.key) {
            case 'i' : this.stopSpinUp() ; break;
            case 'j' : this.stopSpinLeft() ; break;
            case 'k' : this.stopSpinDown() ; break;
            case 'l' : this.stopSpinRight() ; break;
            default: break;
        }
    }

    spinning = () => {
        this.isSpinning.up && Config.shipInstance.propulsionEngine.spin(Config.shipInstance.spaceship, {x: -0.03, y:0, z:0})
        this.isSpinning.left && Config.shipInstance.propulsionEngine.spin(Config.shipInstance.spaceship, {x:0, y: 0.03, z:0})
        this.isSpinning.down && Config.shipInstance.propulsionEngine.spin(Config.shipInstance.spaceship, {x: 0.03 , y:0, z:0})
        this.isSpinning.right && Config.shipInstance.propulsionEngine.spin(Config.shipInstance.spaceship, {x: 0, y: -0.03, z:0})
    }

    componentDidMount () {
        this.spinningId.current = GameLoop.addAction(this.spinning)
        document.addEventListener("keydown", this.keydownHandler)
        document.addEventListener("keyup", this.keyupHandler)
    }
    componentWillUnmount () {
        GameLoop.removeAction(this.spinningId.current)
        document.removeEventListener("keydown", this.keydownHandler)
        document.removeEventListener("keyup", this.keyupHandler)
    }
    
    render() {
        return(
            <nav className="absolute bottom right">
                <div className="min-size-80-px size-8-vw inline-block relative color-white-and-black">
                    <button className="absolute bottom glass-panel" onMouseDown={this.spinUp} onMouseUp={this.stopSpinUp}>i</button>
                </div>
                <div className="flex-row">
                    <div className="min-size-80-px size-8-vw inline-block relative color-white-and-black">
                        <button className="absolute-vertical-center right-10 glass-panel" onMouseDown={this.spinLeft} onMouseUp={this.stopSpinLeft}>j</button>
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
                        <button className="absolute-vertical-center left-10 glass-panel" onMouseDown={this.spinRight} onMouseUp={this.stopSpinRight}>l</button>
                    </div>
                </div>
                <div className="min-size-80-px size-8-vw inline-block relative color-white-and-black">
                    <button className="absolute top glass-panel" onMouseDown={this.spinDown} onMouseUp={this.stopSpinDown}>k</button>
                </div>
            </nav>
        )
    }
}
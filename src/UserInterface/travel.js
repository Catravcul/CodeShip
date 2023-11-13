import React from 'react'

import { Config } from '../Config'
import './travel.css'

import {Status} from './status'
import {Spin} from './spin'

export class Nav extends Config {

    runInterval = React.createRef(null)

    exit = () => {
        this.props.shipTravel()
    }

    move = () => {
        this.runInterval.current = setInterval( () => {
            Config.shipInstance.propulsionEngine.runForward(Config.shipInstance.spaceship)
            Config.updateCamera(Config.shipInstance.propulsionEngine.scene)
        }, 8)
    }

    stop = () => {
        // Config.shipInstance.propulsionEngine.stop()
        clearInterval(this.runInterval.current)
    }

    render() {
        return(
            <>
            <button className={"btn " + (this.props.travel ? '' : 'hidden')} onClick = {this.stop}>
            <img src="/img/orbit.svg" alt="stop" width="50px"/>
            </button>
            <button className={"btn " + (this.props.travel ? '' : 'hidden')} onMouseDown = {this.move} onMouseUp = {this.stop}>
            <img src="/img/launch.svg" alt="move" width="50px"/>
            </button>
            <button className={"btn " + (this.props.travel ? '' : 'hidden')} onClick = {this.props.toggleNav}>
            <img src="/img/spin.svg" alt="cancel" width="50px"/>
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
        const nav = !this.props.travel ? <Status energyPercent={this.props.energyPercent} /> : this.props.showSpinNav ? 
            <nav className="absolute bottom right speeds">
                {speeds.map(speed => (
                    <input type="button" className="btn num" value={speed} onClick={this.changeSpeed}/>
                ))}
            </nav> : <Spin />
        return(
            <>
            {nav}
            </>
        )
    }
}
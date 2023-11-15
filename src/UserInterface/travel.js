import React from 'react'

import Avatar from '@mui/material/Avatar';
import IconButton from '@mui/material/IconButton';

import { Config } from '../Config'
import './travel.css'

import {Status} from './status'
import {Spin} from './spin'
import GameLoop from '../Game/loop'

export class Nav extends Config {

    /**
     * it is espected to store the action id from the game loop to remove it in willunmount
     */
    accelerate = {
        actionId: -1,
        actualSpeed: 0,
        isActive: false,
        isCurbing: false
    }

    exit = () => {
        this.props.shipTravel()
    }

    move = () => {
        let {isActive, actualSpeed, isCurbing} = this.accelerate
        if (isCurbing) {
            if (actualSpeed > 0) actualSpeed -= 0.01
            else actualSpeed = 0
        }
        else if (isActive) {
            if (actualSpeed < Config.shipInstance.propulsionEngine.speed) actualSpeed += 0.01
        }
        else if (actualSpeed > 0) actualSpeed -= 0.001

        if (actualSpeed > 0) Config.updateCamera(Config.shipInstance.propulsionEngine.scene)
        Config.shipInstance.propulsionEngine.runForward(Config.shipInstance.spaceship, actualSpeed)
        this.accelerate.actualSpeed = actualSpeed
    }

    /**
     * 
     * @param {KeyboardEvent} e 
     */
    keydownHandler = e => {
        switch (e.key) {
            case "w": this.activate(); break;
            case "s": this.curb(); break;
        }
    }
    /**
     * 
     * @param {KeyboardEvent} e 
     */
    keyupHandler = e => {
        switch (e.key) {
            case "w": this.deactivate(); break;
            case "s": this.notCurb(); break;
        }
    }

    componentDidMount () {
        const waitPropulsionEngine = () => {
            if (Config.shipInstance.propulsionEngine) {
                document.addEventListener("keydown", this.keydownHandler)
                document.addEventListener("keyup", this.keyupHandler)
                this.accelerate.actionId = GameLoop.addAction(this.move)
            } else setTimeout(waitPropulsionEngine, 100)
        }
        waitPropulsionEngine()
    }
    componentWillUnmount() {
        document.removeChild("keydown", this.keydownHandler)
        document.removeChild("keyup", this.keyupHandler)
        GameLoop.removeAction(this.accelerate.actionId)
    }

    activate = () => this.accelerate.isActive = true
    deactivate = () => this.accelerate.isActive = false

    curb = () => {
        this.accelerate.isCurbing = true
    }
    notCurb = () => {
        this.accelerate.isCurbing = false
    }

    render() {
        return(
            <>
            { this.props.travel ? <>
                <IconButton aria-label="w" color="secondary" onPointerDown = {this.activate} onPointerUp = {this.deactivate}>
                    <Avatar>w</Avatar>
                </IconButton>
                <IconButton aria-label="s" color="secondary" onPointerDown = {this.curb} onPointerUp={this.notCurb}>
                    <Avatar>s</Avatar>
                </IconButton>
            </> : ''
            }
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
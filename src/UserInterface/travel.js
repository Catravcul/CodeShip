import React from 'react'

import Avatar from '@mui/material/Avatar';
import IconButton from '@mui/material/IconButton';
import Pagination from '@mui/material/Pagination';

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
            case "d": this.props.toggleNav(); break;
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
                    <Avatar sx={{ bgcolor: "secondary.light" }}>w</Avatar>
                </IconButton>
                <IconButton aria-label="s" color="secondary" onPointerDown = {this.curb} onPointerUp={this.notCurb}>
                    <Avatar sx={{ bgcolor: "secondary.light" }}>s</Avatar>
                </IconButton>
                <IconButton aria-label="i" color="primary" onClick = {this.props.toggleNav}>
                    <Avatar sx={{ bgcolor: "primary.main" }}>d</Avatar>
                </IconButton>
            </> : ''
            }
            <button className={"btn " + (this.props.travel ? '' : 'hidden')} onClick = {this.exit}>
            <img src="/img/travel.svg" alt="cancel" width="50px"/>
            </button>
            </>
        )
    }
}

export class Interface extends Config {

    keys = ['j', 'k', 'l', 'ñ', 'u', 'i', 'o', 'p']
    speeds = []
    /**
     * 
     * @param {KeyboardEvent} e event with the character received from the keyboard to change the speed
     */
    keyHandler = ({ key: pKey}) => {
        const { speed = -1 } = this.speeds.find(obj => obj.key == pKey) ?? {}
        if (speed != -1) this.changeSpeed(speed)
    }

    /**
     * 
     * @param {number} pSpeed it is espected to be a number less or equal to the potential of the propulsion engine
     */
    changeSpeed = pSpeed => {
        Config.shipInstance.propulsionEngine.speed = pSpeed
    }

    waitPropulsionEngine = () => {
        if (Config.shipInstance.propulsionEngine) {
            const { potential: maxSpeed } = Config.shipInstance.propulsionEngine
            this.speeds = Array.from({ ...this.keys, length: maxSpeed }, (key, i) => ({ key, speed: (i + 1) }))
            document.addEventListener('keypress', this.keyHandler)
        } else setTimeout(this.waitPropulsionEngine, 100)
    }
    componentDidMount () {
        if (!this.props.showSpinNav) this.waitPropulsionEngine()
    }
    componentDidUpdate (prevProps) {
        if (this.props.showSpinNav != prevProps.showSpinNav) {
            if (!this.props.showSpinNav) this.waitPropulsionEngine()
            else document.removeEventListener('keypress', this.keyHandler)
        }
    }
    componentWillUnmount () {
        if (!this.props.showSpinNav) document.removeEventListener('keypress', this.keyHandler)
    }


    render () {

        const nav = !this.props.travel ? <Status energyPercent={this.props.energyPercent} /> : !this.props.showSpinNav ? 
            <nav className="absolute bottom right speeds">
                <Pagination 
                    boundaryCount={this.speeds.length}
                    size='large'
                    className='speeds' 
                    sx={{ '&.speeds li': { margin: '0 3px', borderRadius: '100%', backgroundColor: 'white', 'button': { margin: '0' } } }} 
                    count={this.speeds.length} 
                    color="info" 
                    hideNextButton={ true } 
                    hidePrevButton={ true }  
                    onChange={ (e, speed) => this.changeSpeed(speed) }
                />
            </nav> : <Spin />
        return(
            <>
            {nav}
            </>
        )
    }
}
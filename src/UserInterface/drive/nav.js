import React from 'react'

import Avatar from '@mui/material/Avatar';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';

import { Config } from '../../Config'

import GameLoop from '../../Game/loop'

export default class Nav extends Config {

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
            case "f": this.activate(); break;
            case "d": this.curb(); break;
            case "a": this.exit(); break;
        }
    }
    /**
     * 
     * @param {KeyboardEvent} e 
     */
    keyupHandler = e => {
        switch (e.key) {
            case "f": this.deactivate(); break;
            case "d": this.notCurb(); break;
            case "s": this.props.toggleNav(); break;
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
        document.removeEventListener("keydown", this.keydownHandler)
        document.removeEventListener("keyup", this.keyupHandler)
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
                
                <Tooltip title="accelerate" placement='right'>
                    <IconButton aria-label="f keyboard" color="secondary" onPointerDown = {this.activate} onPointerUp = {this.deactivate}>
                        <Avatar sx={{ bgcolor: "secondary.light" }}>f</Avatar>
                    </IconButton>
                </Tooltip>
                
                <Tooltip title="stop" placement='right'>
                    <IconButton aria-label="d keyboard" color="secondary" onPointerDown = {this.curb} onPointerUp={this.notCurb}>
                        <Avatar sx={{ bgcolor: "secondary.light" }}>d</Avatar>
                    </IconButton>
                </Tooltip>
                
                <Tooltip title="speeds/spins" placement='right'>
                    <IconButton aria-label="s keyboard" color="primary" onClick = {this.props.toggleNav}>
                        <Avatar sx={{ bgcolor: "primary.main" }}>s</Avatar>
                    </IconButton>
                </Tooltip>
                
                <Tooltip title="exit drive" placement='right'>
                    <IconButton aria-label="a keyboard" color="warning"  onClick = {this.exit}>
                        <Avatar sx={{ bgcolor: "warning.main" }}>a</Avatar>
                    </IconButton>
                </Tooltip>

            </>

        )
    }
}
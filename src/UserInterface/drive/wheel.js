import React from 'react'

import Grid from '@mui/material/Grid';
import Avatar from '@mui/material/Avatar';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';

import {Config} from '../../Config'
import GameLoop from '../../Game/loop'

export default class Wheel extends Config {

    /**
     * it is espected to store the action id from the game loop to remove it in willunmount
     */
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
    
    /**
     * 
     * @param {KeyboardEvent} e 
     */
    keydownHandler = e => {
        switch (e.key) {
            case 'i' : this.spinUp() ; break;
            case 'j' : this.spinLeft() ; break;
            case 'k' : this.spinDown() ; break;
            case 'l' : this.spinRight() ; break;
            default: break;
        }
    }
    /**
     * 
     * @param {KeyboardEvent} e 
     */
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

    removeKeyListeners = () => {
        document.removeEventListener("keydown", this.keydownHandler)
        document.removeEventListener("keyup", this.keyupHandler)
    }
    addKeyListeners = () => {
        document.addEventListener("keydown", this.keydownHandler)
        document.addEventListener("keyup", this.keyupHandler)
    }
    componentDidMount () {
        this.spinningId.current = GameLoop.addAction(this.spinning)
        if (!this.props.showLogin) this.addKeyListeners()
    }
    componentDidUpdate (prevProps) {
        if (prevProps.showLogin != this.props.showLogin) {
            if (this.props.showLogin) this.removeKeyListeners()
            else this.addKeyListeners()
        } 
    }
    componentWillUnmount () {
        GameLoop.removeAction(this.spinningId.current)
        this.removeKeyListeners()
    }
    render() {
        return(
            <Grid container sx={{ position:"absolute", bottom: "20px", right: "10px", width: "160px", height: "140px" }}>
                <Grid item xs={12} sx={{ display: "flex", justifyContent: "center" }}>
                    <Tooltip title="turn up" placement="left">
                        <IconButton aria-label="i" color="secondary" onPointerDown={this.spinUp} onPointerUp={this.stopSpinUp}>
                            <Avatar sx={{ bgcolor: "secondary.light" }}>i</Avatar>
                        </IconButton>
                    </Tooltip>
                </Grid>
                <Grid item xs={4} sx={{ display: "flex", justifyContent: "center" }}>
                    <Tooltip title="turn left" placement="left">
                        <IconButton aria-label="j" color="secondary" onPointerDown={this.spinLeft} onPointerUp={this.stopSpinLeft}>
                            <Avatar sx={{ bgcolor: "secondary.light" }}>j</Avatar>
                        </IconButton>
                    </Tooltip>
                </Grid>
                <Grid item xs={4} sx={{ display: "flex", justifyContent: "center" }}>
                </Grid>
                <Grid item xs={4} sx={{ display: "flex", justifyContent: "center" }}>
                    <Tooltip title="turn right" placement="left">
                        <IconButton aria-label="l" color="secondary" onPointerDown={this.spinRight} onPointerUp={this.stopSpinRight}>
                            <Avatar sx={{ bgcolor: "secondary.light" }}>l</Avatar>
                        </IconButton>
                    </Tooltip>
                </Grid>
                <Grid item xs={12} sx={{ display: "flex", justifyContent: "center" }}>
                    <Tooltip title="turn down" placement="left">
                        <IconButton aria-label="k" color="secondary" onPointerDown={this.spinDown} onPointerUp={this.stopSpinDown}>
                            <Avatar sx={{ bgcolor: "secondary.light" }}>k</Avatar>
                        </IconButton>
                    </Tooltip>
                </Grid>
            </Grid>
        )
    }
}
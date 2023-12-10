import React from 'react'

import { Config } from '../../Game/Config'

import GameLoop from '../../Game/loop'
import ButtonLabeled from '../components/ButtonLabeled';

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
            case "a": this.exit(); break;
        }
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
        const waitPropulsionEngine = () => {
            if (Config.shipInstance.propulsionEngine) {
                this.addKeyListeners()
                this.accelerate.actionId = GameLoop.addAction(this.move)
            } else setTimeout(waitPropulsionEngine, 100)
        }
        waitPropulsionEngine()
    }
    componentDidUpdate (prevProps) {
        if (prevProps.showLogin != this.props.showLogin) {
            if (this.props.showLogin) this.removeKeyListeners()
            else this.addKeyListeners()
        } 
    }
    componentWillUnmount() {
        this.removeKeyListeners()
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

    buttonsLabeled = [
        { 
            label:{title: "accelerate", placement: 'right'},
            button:{content: 'f', bgColor: 'secondary.main', onPointerDown: this.activate, onPointerUp: this.deactivate}
        },
        { 
            label:{title: "decelerate", placement: 'right'},
            button:{content: 'd', bgColor: 'secondary.main', onPointerDown: this.curb, onPointerUp: this.notCurb}
        },
        { 
            label:{title: "directions - speeds", placement: 'right'},
            button:{content: 's', bgColor: 'primary.main', onClick: this.props.toggleNav}
        },
        { 
            label:{title: "exit drive", placement: 'right'},
            button:{content: 'a', bgColor: 'warning.main', onClick: this.exit}
        }
    ]

    render() {

        return(
            <>

                { this.buttonsLabeled.map( (buttonLabeled, i) => <ButtonLabeled {...buttonLabeled} key={buttonLabeled.button.content + i} />) }

            </>

        )
    }
}
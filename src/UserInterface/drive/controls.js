import React from 'react'

import Tooltip from '@mui/material/Tooltip';
import Pagination from '@mui/material/Pagination';
import PaginationItem from '@mui/material/PaginationItem';

import { Config } from '../../Config'
import './travel.css'

import {Status} from './status'
import Wheel from './wheel'

export default class Controls extends Config {

    keys = ['j', 'k', 'l', 'ñ', 'u', 'i', 'o', 'p']
    /**
     * @type {{key: string, speed: number}[]}
     */
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
    componentDidUpdate (prevProps) {
        if (prevProps.showLogin != this.props.showLogin && this.props.showLogin) document.removeEventListener('keypress', this.keyHandler)
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
        if (this.props.showSpinNav != prevProps.showSpinNav || prevProps.showLogin != this.props.showLogin) {
            if (!this.props.showSpinNav && !this.props.showLogin) this.waitPropulsionEngine()
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
                    renderItem={ item => (
                        <Tooltip title={ "speed " + item.page}>
                            <PaginationItem {...item} page={ this.speeds.find(s => s.speed == item.page).key }/>
                        </Tooltip>
                      )}
                    onChange={ (e, page) => this.changeSpeed(page) }
                />
            </nav> : <Wheel showLogin={ this.props.showLogin }/>

        return(
            <>
                {nav}
            </>
        )
    }
}
import Tooltip from '@mui/material/Tooltip';
import Avatar from '@mui/material/Avatar';
import IconButton from '@mui/material/IconButton';

import { Config } from '../Game/Config'
import * as Modify from './modify'
import Drive from './drive'
import { SessionContext } from './sessionContext'

export class Nav extends Config {

    state = {
        energyPercent: 100,
        modify: false,
        travel: false,
        showSpinNav: false
    }

    shipModify = () => {
        this.setState({modify: this.state.modify === true ? false : true})
    }

    shipTravel = () => {
        this.setState({travel: this.state.travel === true ? false : true})
    }

    toggleNav = () => {
        const newVal = this.state.showSpinNav ? false : true
        this.setState({showSpinNav : newVal})
    }
    
    changeEnergy = (energy, potential) => {
        this.setState({energyPercent: ((energy*100)/potential)})
    }

    openHome = () => {
        window.open(Config.config.codeshipNet.urlBase).focus()
        window.addEventListener('message', e => {
            if (e.origin === Config.config.codeshipNet.urlBase) {
                if (this.context.token) {
                    if(e.data === this.context.postMessageS)
                    e.source.postMessage(this.context.token, Config.config.codeshipNet.urlBase)
                    window.removeEventListener('message')
                }
            }
        })
    }
    /**
     * 
     * @param {KeyboardEvent} e 
     */
    keyHandler = e => {
        switch (e.key) {
            case "f": this.shipModify(); break;
            case "d": this.shipTravel(); break;
            case "s": this.openHome(); break;
        }
    }
    componentDidMount () {
        if (!this.props.showLogin) document.addEventListener('keypress', this.keyHandler)
    }
    componentDidUpdate (prevProps, prevState) {
        if (prevState.travel != this.state.travel || prevState.modify != this.state.modify || prevState.showLogin != this.props.showLogin) {
            if (this.state.travel || this.state.modify || this.props.showLogin) document.removeEventListener('keypress', this.keyHandler)
            else document.addEventListener('keypress', this.keyHandler)
        }
    }

    render() {
        return(  
        <div>
            <nav className="absolute bottom flex-col" >
                { this.state.modify ? <Modify.Nav shipModify={ this.shipModify } modify={ this.state.modify } showLogin={ this.props.showLogin }/> : "" }
                { this.state.travel ? <Drive.Nav toggleNav={ this.toggleNav } shipTravel={ this.shipTravel } showLogin={ this.props.showLogin }/> : "" }
                { !this.state.travel && !this.state.modify ?
                <>
                    <Tooltip title="customize" placement='right'>
                        <IconButton aria-label="f" color="warning" onClick = { this.shipModify }>
                            <Avatar sx={{ bgcolor: "warning.light" }}>f</Avatar>
                        </IconButton>
                    </Tooltip>
                    
                    <Tooltip title="drive" placement='right'>
                        <IconButton aria-label="d" color="warning" onClick = { this.shipTravel }>
                            <Avatar sx={{ bgcolor: "warning.light" }}>d</Avatar>
                        </IconButton>
                    </Tooltip>
                    
                    <Tooltip title="open net" placement='right'>
                        <IconButton aria-label="s" color="error" onClick = { this.openHome }>
                            <Avatar sx={{ bgcolor: "error.main" }}>s</Avatar>
                        </IconButton>
                    </Tooltip>
                </> : ''
                }
            </nav>
            <Drive.Controls travel={ this.state.travel } showSpinNav={ this.state.showSpinNav } energyPercent={ this.state.energyPercent } showLogin={ this.props.showLogin }/>
            <Modify.Interface modify={ this.state.modify } showLogin={ this.props.showLogin }/>
        </div>
        )
    }
}

Nav.contextType = SessionContext
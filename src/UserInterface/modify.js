import Avatar from '@mui/material/Avatar';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';


import { Config } from '../Config'
import { SessionContext } from './sessionContext'
import { Carrousel } from './carrousel'
import './modify.css'

export class Interface extends Config {
    
    state = {
        shipClass: '',
        customClass: ''
    }

    componentDidMount() {
        fetch(Config.config.codeshipApi.urlBase + '/spaceship.txt', {method: 'GET'})
        .then(res => res.text()).then( data => this.setState({customClass: data}, this.setState({shipClass: data})))
    }

    selectComponent = (component) => {
        Config.shipInstance.setComponent(component.type, component.title)
        const {fuselage, propulsionEngine, takeoff} = Config.shipInstance.components
        this.setState({
            customClass: this.state.shipClass.replace(/Components.F|Components.TO|Components.PE/g, str => {
                const newStr = 'Components.' + (str === 'Components.F' ? fuselage : 
                str === 'Components.TO' ? takeoff : propulsionEngine)
                return newStr
            })
        })
    }

    render() {
        return  <div id="spaceship-class" className={ "customize-s screen " + (this.props.modify ? '' : 'hidden') }>
                    <textarea value = { this.state.customClass } className = "absolute ship-class" disabled ></textarea>
                    <Carrousel selectComponent={this.selectComponent}/>
                </div>
    }
}



export class Nav extends Config {

    cancel = () => {
        Config.shipInstance.components = Object.assign({}, Config.components)
        Config.shipInstance.renderComponents()
    }

    apply = () => {
        if(this.context.session) {
            fetch(Config.config.codeshipApi.urlBase + '/spaceship', {
                method: 'PATCH',
                body: JSON.stringify({config: Config.shipInstance.components}),
                headers: {'x-access-token': this.context.token, 'Content-Type': 'application/json'}
            }).then(res => res.json()).then(({spaceship}) => Config.components = Object.assign({}, spaceship.config))
        } else {
            alert('where would customization be saved without an account ?')
        }
    }

    /**
     * 
     * @param {KeyboardEvent} e 
     */
    keyHandler = e => {
        switch (e.key) {
            case "f": this.apply(); break;
            case "d": this.cancel(); break;
            case "s": this.props.shipModify(); break;
        }
    }
    componentDidMount () {
        if (!this.props.showLogin) document.addEventListener('keypress', this.keyHandler)
    }
    componentDidUpdate (prevProps) {
        if (prevProps.showLogin != this.props.showLogin) {
            if (this.props.showLogin) document.removeEventListener('keypress', this.keyHandler)
            else document.addEventListener('keypress', this.keyHandler)
        } 
    }
    componentWillUnmount () {
        document.removeEventListener('keypress', this.keyHandler)
    }

    render () {
        return (
            <>
            <Tooltip title="save customization" placement='right'>
                <IconButton aria-label="f keyboard" color="success"  onClick = { this.apply }>
                    <Avatar sx={{ bgcolor: "success.light" }}>f</Avatar>
                </IconButton>
            </Tooltip>
            
            <Tooltip title="reset customization" placement='right'>
                <IconButton aria-label="d keyboard" color="error" onClick = { this.cancel }>
                    <Avatar sx={{ bgcolor: "error.light" }}>d</Avatar>
                </IconButton>
            </Tooltip>

            <Tooltip title="exit customization" placement='right'>
                <IconButton aria-label="s keyboard" color="warning" onClick = { this.props.shipModify }>
                    <Avatar sx={{ bgcolor: "warning.light" }}>s</Avatar>
                </IconButton>
            </Tooltip>
            </>
        )
    }
}

Nav.contextType = SessionContext
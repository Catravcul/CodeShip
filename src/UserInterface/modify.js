
import { Config } from '../Game/Config'
import { SessionContext } from './context'
import { Carrousel } from './carrousel'
import './modify.css'

import ButtonLabeled from './components/ButtonLabeled';

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
            case "d": this.apply(); break;
            case "s": this.cancel(); break;
            case "a": this.props.shipModify(); break;
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

    buttonsLabeled = [
        { 
            label:{title: "save modification", placement: 'right'},
            button:{content: 'd', bgColor: 'success.light', onClick: this.apply}
        },
        { 
            label:{title: "reset modification", placement: 'right'},
            button:{content: 's', bgColor: 'error.light', onClick: this.cancel}
        },
        { 
            label:{title: "exit modification", placement: 'right'},
            button:{content: 'a', bgColor: 'warning.light', onClick: this.props.shipModify}
        }
    ]

    render () {
        return (
            <>
                { this.buttonsLabeled.map( (buttonLabeled, i) => <ButtonLabeled {...buttonLabeled} key={buttonLabeled.button.content + i} />) }
            </>
        )
    }
}

Nav.contextType = SessionContext
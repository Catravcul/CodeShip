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
        Config.shipInstance.components = Object.assign([], Config.components)
        Config.shipInstance.renderComponents()
        this.props.shipModify()
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
        this.props.shipModify()
    }

    render(){
        return(
            <>
            <button className={"btn " + (this.props.modify ? '' : 'hidden')} onClick = {this.cancel}>
            <img src="/img/cancel.svg" alt="cancel" width="50px"/>
            </button>
            <button className={"btn " + (this.props.modify ? '' : 'hidden')} onClick = {this.apply}>
                <img src="/img/apply.svg" alt="apply" width="50px"/>
            </button>
            </>
        )
    }
}

Nav.contextType = SessionContext
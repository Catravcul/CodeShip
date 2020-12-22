import { Config } from '../Config'
import { Carrousel } from './carrousel'
import './customize.css'

export class Customize extends Config {
    state = {
        shipClass: '',
        customClass: ''
    }

    componentDidMount() {
        fetch(Config.config.codeshipApi.urlBase + 'spaceship.txt', {method: 'GET'})
        .then(res => res.text()).then( data => this.setState({customClass: data}, this.setState({shipClass: data})))
    }

    selectComponent = (component) => {
        const word = 'Components.' + (component.type === 'fuselage' ? 'F' : component.type === 'takeoff' ? 'TO' : 'PE')
        Config.shipInstance.setComponent(component.type, component.title)
        this.setState({customClass: this.state.shipClass.replace(word, 'Components.' + component.title)})
    }

    render() {
        return  <div id="spaceship-class" className={ "customize-s screen " + (this.props.customize ? '' : 'hidden') }>
                    <textarea value = { this.state.customClass } className = "absolute ship-class" disabled ></textarea>
                    <Carrousel session={this.props.session} products={this.props.products} selectComponent={this.selectComponent}/>
                </div>
    }
}
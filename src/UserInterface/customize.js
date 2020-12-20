import { Config } from '../Config'
import { Carrousel } from './carrousel'
import './customize.css'

export class Customize extends Config {
    state = {
        shipClass: ''
    }

    componentDidMount() {
        fetch(this.config.codeshipApi.urlBase + 'spaceship.txt', {method: 'GET'})
        .then(res => res.text()).then( data => this.setState({shipClass: data}))
    }

    render() {
        return  <div id="spaceship-class" className={ "customize-s screen " + (this.props.customize ? '' : 'hidden') }>
                    <textarea value = { this.state.shipClass } className = "absolute ship-class" disabled ></textarea>
                    <Carrousel session={this.props.session} products={this.props.products}/>
                </div>
    }
}
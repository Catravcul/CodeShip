import { Config } from '../Config'
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
        return  <div id="spaceship-class" className={ "customize-s screen " + this.props.spaceshipVisibility }>
                    <textarea value = { this.state.shipClass } className = "absolute ship-class" disabled ></textarea>
                    <button id = "apply" onClick = { this.uploadSpaceshipClassText }>
                        <img src="/img/apply.svg" alt="shop" width="20px"/>
                    </button>
                </div>
    }
}
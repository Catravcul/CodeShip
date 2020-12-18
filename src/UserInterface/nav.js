import { Component } from 'react'
import { Customize } from './customize'

export class Nav extends Component {

    state = {
            spaceshipVisibility: 'hidden'
    }

    customizeSpaceship = () => {
        this.setState({spaceshipVisibility: this.state.spaceshipVisibility == 'hidden'? 'visible' : 'hidden'})
    }

    render() {
        return  <div><nav className="absolute top" >
                    <button id="customize" onClick = {this.customizeSpaceship}>
                        <img src="/img/customize.svg" alt="customize" width="20px"/>
                    </button>
                    <button id="navigate">
                        <img src="/img/navigate.svg" alt="navigate" width="20px"/>
                    </button>
                    <button id="shop">
                        <img src="/img/shop.svg" alt="shop" width="20px"/>
                    </button>
                </nav><Customize spaceshipVisibility={this.state.spaceshipVisibility} /></div>
    }
}
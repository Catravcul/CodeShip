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
        return  <div>
                    <nav className="absolute bottom flex-col" >
                        <button id="customize" className="btn" onClick = {this.customizeSpaceship}>
                            <img src="/img/customize.svg" alt="customize" width="50px"/>
                        </button>
                        <button id="navigate" className="btn">
                            <img src="/img/navigate.svg" alt="navigate" width="50px"/>
                        </button>
                        <button id="shop" className="btn">
                            <img src="/img/shop.svg" alt="shop" width="50px"/>
                        </button>
                    </nav>
                    <Customize spaceshipVisibility={this.state.spaceshipVisibility} session={this.props.session} products={this.props.products}/>
                </div>
    }
}
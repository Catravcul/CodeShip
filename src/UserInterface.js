import { Component } from 'react'
import './resources/css/UserInterface.css'
export class UserInterface extends Component {

    componentDidMount() {
    }

    /**
     * RENDER USER INTERFACE
     */
    render() {
        return <div id="user-interface" >
            <nav className="absolute top" >
                <button id="customize"><img src="/img/customize.svg" alt="customize" width="20px"/></button>
                <button id="navigate"><img src="/img/navigate.svg" alt="navigate" width="20px"/></button>
                <button id="shop"><img src="/img/shop.svg" alt="shop" width="20px"/></button>
            </nav>
            <div id="spaceship-class" className="absolute middle hidden">
                <textarea></textarea>
            </div>
        </div>
    }

}
import { Component } from 'react'
import './resources/css/UserInterface.css'
export class UserInterface extends Component {

    constructor(props) {
        super(props)
        this.state = {
            spaceshipVisibility : 'hidden'
        }
    }
    
    componentDidMount() {
        fetch('http://localhost:300/spaceship/class', {
            method : 'POST'
        }).then( response => response.json()).then( data => {
            if( data.error === undefined ) {
                this.setState( { spaceshipClassText : data.fileText } )
            }
        })
    }

    customizeSpaceship = () => {
        this.setState({spaceshipVisibility : this.state.spaceshipVisibility == 'hidden'? 'visible' : 'hidden'})
    }

    changeSpaceshipClassText = ( e ) => {
        this.setState( { spaceshipClassText : e.currentTarget.value } )
    }

    uploadSpaceshipClassText = () => {
        const body = { fileText: this.state.spaceshipClassText }
        fetch( 'http://localhost:300/spaceship/class', {
            method : 'PUT',
            body : JSON.stringify( body ),
            headers : { 'Content-Type' : 'application/json' }
        } ).then( response => response.json() ).then( window.location.reload() )
    }

    /**
     * RENDER USER INTERFACE
     */
    render() {
        return <div id="user-interface" >
            <nav className="absolute top" >
                <button id="customize" onClick = {this.customizeSpaceship}>
                    <img src="/img/customize.svg" alt="customize" width="20px"/>
                </button>
                <button id="navigate">
                    <img src="/img/navigate.svg" alt="navigate" width="20px"/>
                </button>
                <button id="shop">
                    <img src="/img/shop.svg" alt="shop" width="20px"/>
                </button>
            </nav>
            <div id="spaceship-class" className={ "absolute middle " + this.state.spaceshipVisibility }>
                <textarea value = { this.state.spaceshipClassText } className = "screen-80" spellCheck = "false" onChange = { this.changeSpaceshipClassText }></textarea>
                <button id = "apply" onClick = { this.uploadSpaceshipClassText }>
                    <img src="/img/apply.svg" alt="shop" width="20px"/>
                </button>
            </div>
        </div>
    }

}
import { Component } from 'react'
import './resources/css/UserInterface.css'
export class UserInterface extends Component {

    constructor(props) {
        super(props)
        this.state = {
            spaceshipVisibility : 'hidden',
            token: '',
            session: {},
            products: []
        }
    }
    
    componentDidMount() {
        fetch('http://127.0.0.1:5000/spaceship.txt', {method: 'GET'})
        .then(res => res.text()).then( data => this.setState({spaceshipClassText: data}))
        this.setState({token: sessionStorage.getItem('codeship-token')}, this.updateSession)
        this.getProducts()
    }

    updateSession() {
        fetch('http://127.0.0.1:5000/user', {method: 'GET', headers: {'x-access-token': this.state.token}})
        .then(res => res.json()).then(({user}) => this.setState({session: user}))
    }

    getProducts() {
        fetch('http://127.0.0.1:5000/public/product', {method: 'GET'})
        .then(res => res.json()).then(({products}) => this.setState({products: products}))
    }

    customizeSpaceship = () => {
        this.setState({spaceshipVisibility : this.state.spaceshipVisibility == 'hidden'? 'visible' : 'hidden'})
    }

    changeSpaceshipClassText = ( e ) => {
        this.setState( { spaceshipClassText : e.currentTarget.value } )
    }

    uploadSpaceshipClassText = () => {
        const body = { fileText: this.state.spaceshipClassText }
        fetch( 'http://localhost:3000/spaceship/class', {
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
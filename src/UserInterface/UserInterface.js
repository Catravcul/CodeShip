import { Component } from 'react'
import './UserInterface.css'
import { Nav } from './nav'

export class UserInterface extends Component {

    state = {
        token: '',
        session: {},
        products: []
    }
        
    componentDidMount() {
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
        return  <div id="user-interface" >
                    <Nav />
                </div>
    }

}
import { Config } from '../Config'
import './UserInterface.css'
import { Nav } from './nav'

export class UserInterface extends Config {

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
        fetch(this.config.codeshipApi.urlBase + 'user', {method: 'GET', headers: {'x-access-token': this.state.token}})
        .then(res => res.json()).then(({user}) => this.setState({session: user}))
    }

    getProducts() {
        fetch(this.config.codeshipApi.urlBase + 'public/product', {method: 'GET'})
        .then(res => res.json()).then(({products}) => this.setState({products: products}))
    }

    /**
     * RENDER USER INTERFACE
     */
    render() {
        return  <div id="user-interface" >
                    <Nav session={this.state.session} products={this.state.products}/>
                </div>
    }

}
import { Config } from '../Config'
import './UserInterface.css'
import { SessionContext } from './sessionContext'
import { Nav } from './nav'
import { Login } from './login'

export class UserInterface extends Config {

    state = {
        token: '',
        session: {},
        products: [],
        login: ''
    }
        
    componentDidMount() {
        this.updateToken()
        this.getProducts()
    }

    updateToken = () => {
        this.setState({token: sessionStorage.getItem('codeship-token')}, this.updateSession)
    }
    
    updateSession() {
        this.fetchGet('user', ({user}) => this.setState({session: user}, this.loadShip))
    }

    loadShip() {
        if(this.state.session){
            this.fetchGet('spaceship', ({spaceship}) => {
                if(spaceship.config.fuselage){
                    Config.components = Object.assign({},spaceship.config)
                    Config.shipInstance.components = spaceship.config
                }
                Config.shipInstance.renderComponents()
            })
            this.setState({login: ''})
        } else {
            this.setState({login: <Login updateToken={this.updateToken}/>})
            Config.shipInstance.renderComponents()
        }
    }

    fetchGet(entity, callback) {
        fetch(Config.config.codeshipApi.urlBase + entity, {
            method: 'GET',
            cache: 'no-store',
            headers: {'x-access-token': this.state.token}
        }).then(res => res.json()).then(callback)
    }

    getProducts() {
        fetch(Config.config.codeshipApi.urlBase + 'public/product', {method: 'GET'})
        .then(res => res.json()).then(({products}) => this.setState({products: products}))
    }

    /**
     * RENDER USER INTERFACE
     */
    render() {
        return  <SessionContext.Provider value={{
            postMessageS:'123',
            session: this.state.session,
            products: this.state.products,
            token: this.state.token
            }}>
                    <div id="user-interface" >
                        {this.state.login}
                        <Nav session={this.state.session} products={this.state.products} token={this.state.token} />
                    </div>
                </SessionContext.Provider>
    }

}
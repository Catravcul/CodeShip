import { Config } from '../Game/Config'
import './UserInterface.css'
import { SessionContext } from './sessionContext'
import { Nav } from './nav'
import { Login } from './login'

export class UserInterface extends Config {

    state = {
        token: '',
        session: {},
        products: [],
        showLogin: false
    }
        
    componentDidMount() {
        this.updateToken()
        this.getProducts()
    }

    updateToken = () => {
        this.setState({token: sessionStorage.getItem('codeship-token')}, this.updateSession)
    }
    
    updateSession() {
        this.fetchGet('/user', {
            success: ({user}) => this.setState({session: user}, this.loadShip),
            error: () => {
                this.state.session = undefined
                this.loadShip()
            }
        })
    }

    loadShip = () => {

        const onSuccess = ({spaceship}) => {
            if(spaceship.config.fuselage){
                Config.components = Object.assign({},spaceship.config)
                Config.shipInstance.components = spaceship.config
            }
            Config.shipInstance.renderComponents()
        }

        if(this.state.session){
            this.fetchGet('/spaceship', {success: onSuccess})
            this.hideLog()
        } else {
            this.showLog()
            Config.shipInstance.renderComponents()
        }
    }

    hideLog = () => {
        this.setState({showLogin: false})
    }
    showLog = () => {
        this.setState({showLogin: true})
    }
    toggleLog = () => {
        if (this.state.showLogin) {
            this.hideLog()
        } else {
            this.setState({showLogin: true})
        }
    }

    /**
     * 
     * @param {string} entity name to add to the base root codeshipApi e.g. /spaceship
     * @param { {success: function, error: function, complete: function} } param1 
     */
    fetchGet = (entity, {success, error, complete}) => {
        fetch(Config.config.codeshipApi.urlBase + entity, {
            method: 'GET',
            cache: 'no-store',
            headers: {'x-access-token': this.state.token}
        }).then(res => res.json()).then(success).catch(error).finally(complete)
    }

    getProducts() {
        fetch(Config.config.codeshipApi.urlBase + '/public/product', {method: 'GET'})
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
                    <Login updateToken={this.updateToken} hideLog={this.hideLog} showLogin={this.state.showLogin}/>
                    <button className="btn top right absolute" onClick = {this.toggleLog}>
                        <img src="/img/login.svg" alt="login" width="50px"/>
                    </button>
                    <Nav session={this.state.session} products={this.state.products} token={this.state.token} showLogin={this.state.showLogin}/>
                </div>
            </SessionContext.Provider>
    }

}
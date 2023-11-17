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
        isLogin: false
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
        if(this.state.session){
            this.fetchGet('/spaceship', ({spaceship}) => {
                if(spaceship.config.fuselage){
                    Config.components = Object.assign({},spaceship.config)
                    Config.shipInstance.components = spaceship.config
                }
                Config.shipInstance.renderComponents()
            })
            this.hideLog()
        } else {
            this.showLog()
            Config.shipInstance.renderComponents()
        }
    }

    hideLog = () => {
        this.setState({isLogin: false})
    }
    showLog = () => {
        this.setState({isLogin: true})
    }
    toggleLog = () => {
        if (this.state.isLogin) {
            this.hideLog()
        } else {
            this.setState({isLogin: true})
        }
    }

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
                        <Login updateToken={this.updateToken} hideLog={this.hideLog} isLogin={this.state.isLogin}/>
                        <button className="btn top right absolute" onClick = {this.toggleLog}>
                            <img src="/img/login.svg" alt="login" width="50px"/>
                        </button>
                        <Nav session={this.state.session} products={this.state.products} token={this.state.token} />
                    </div>
                </SessionContext.Provider>
    }

}
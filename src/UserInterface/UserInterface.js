import React from 'react'

import { Config } from '../Game/Config'
import './UserInterface.css'
import { SessionContext, UserInterfaceContext } from './context'
import { Nav } from './nav'
import { Login } from './login'
import TopNav from './topNav'
import { Menu } from './menu'



export class UserInterface extends Config {
    
    componentDidMount () {

        this.updateToken()
        this.getProducts()

        const propsTopNav = {
            rightButtons: [
                {
                    label:{ title:'menu', placement:'bottom' }, 
                    button:{ content:'o', bgColor:'warning.main', onClick:this.toggleShowMenu }
                },
                {
                    label:{ title:'login', placement:'bottom' }, 
                    button:{ content:'p', bgColor:'warning.main', onClick:this.toggleLog }
                }
            ],
            leftButtons: [
                {
                    label:{ title:'quest', placement:'bottom' }, 
                    button:{ content:'q', bgColor:'secondary.main', onClick:this.props.toggleShowQuest }
                }
            ],
            upKeys: [
                { key:'p', handler:this.toggleLog },
                { key:'o', handler:this.toggleShowMenu },
                { key:'q', handler:this.props.toggleShowQuest },
    
            ]
        
        }
        this.setState({...this.state, propsTopNav })
    }

    state = {
        token: '',
        session: {},
        products: [],
        showLogin: false,
        showLabels: true,
        showMenu: false,
        propsTopNav: { }
    }

    toggleShowLabels = () => {this.setState({...this.state, showLabels:!this.state.showLabels}); console.log(this.state.showLabels)}
    toggleShowMenu = () => this.setState({...this.state, showMenu:!this.state.showMenu})

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
    

    componentDidUpdate () {
        const button = {
            label:{ title:'code', placement:'bottom' }, 
            button:{ content:'w', bgColor:'success.main', onClick:this.props.toggleShowCode }
        }
        const propsTopNav = {...this.state.propsTopNav}
        
        if (this.props.isCodePos) {
            const idx = propsTopNav.leftButtons.findIndex(b => b.button.content == button.button.content)
            if (idx < 0) {
                propsTopNav.leftButtons.push(button)
                propsTopNav.upKeys.push( { key:'w', handler:() => {this.props.toggleShowCode();console.log('w');} } )
                this.setState({...this.state, propsTopNav})
            }
        } else {
            const buttonIdx = propsTopNav.leftButtons.findIndex(b => b.button.content == button.button.content)
            const keyIdx = propsTopNav.upKeys.findIndex(k => k.key == 'w')
            if (buttonIdx >= 0) {
                propsTopNav.leftButtons.splice(buttonIdx, 1)
                propsTopNav.upKeys.splice(keyIdx, 1)
                this.setState({...this.state, propsTopNav})
            }
        }
    }

    render() {
        return  (
            <SessionContext.Provider value={{
            postMessageS:'123',
            session: this.state.session,
            products: this.state.products,
            token: this.state.token
            }}> <UserInterfaceContext.Provider value={{ showLabels:this.state.showLabels, toggleShowLabels:this.toggleShowLabels }}>
                <div id="user-interface" >
                    { this.state.showLogin ? '' : <TopNav {...this.state.propsTopNav}/> }
                    <Nav session={this.state.session} products={this.state.products} token={this.state.token} showLogin={this.state.showLogin}/>
                    <Login updateToken={this.updateToken} hideLog={this.hideLog} showLogin={this.state.showLogin}/>
                    <Menu showMenu={this.state.showMenu} toggleShowMenu={this.toggleShowMenu}/>
                </div>
                </UserInterfaceContext.Provider>
            </SessionContext.Provider>
        )
    }

}
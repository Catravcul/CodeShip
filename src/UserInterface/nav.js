import { Config } from '../Config'
import { Customize } from './customize'
import { SessionContext } from './sessionContext'

export class Nav extends Config {

    state = {
            customize: false
    }

    customizeShip = () => {
        this.setState({customize: this.state.customize == true ? false : true})
    }

    cancelCustomize = () => {
        Config.shipInstance.components = Object.assign([], Config.components)
        Config.shipInstance.renderComponents()
        this.customizeShip()
    }

    applyCustomize = () => {
        if(this.context.session) {
            fetch(Config.config.codeshipApi.urlBase + 'spaceship', {
                method: 'PATCH',
                body: JSON.stringify({config: Config.shipInstance.components}),
                headers: {'x-access-token': this.context.token, 'Content-Type': 'application/json'}
            }).then(res => res.json()).then(({spaceship}) => Config.components = Object.assign({}, spaceship.config))
        } else {
            alert('where would customization be saved without an account ?')
        }
        this.customizeShip()
    }

    selectComponent = () => {
        const homePage = window.open('http://localhost:3000').focus()
        window.addEventListener('message', e => {
            console.log(e)
            if (e.origin === 'http://localhost:3000') {
                if (this.context.token) {
                    if(e.data === this.context.postMessageS)
                    e.source.postMessage(this.context.token, 'http://localhost:3000')
                }
            }
        })
    }

    render() {
        return  <div>
                    <nav className="absolute bottom flex-col" >
                        <button className={"btn " + (this.state.customize ? '' : 'hidden')} onClick = {this.cancelCustomize}>
                            <img src="/img/cancel.svg" alt="cancel" width="50px"/>
                        </button>
                        <button className={"btn " + (this.state.customize ? '' : 'hidden')} onClick = {this.applyCustomize}>
                            <img src="/img/apply.svg" alt="apply" width="50px"/>
                        </button>
                        <button className={"btn " + (this.state.customize ? 'hidden' : '')} onClick = {this.customizeShip}>
                            <img src="/img/customize.svg" alt="customize" width="50px"/>
                        </button>
                        <button className={"btn " + (this.state.customize ? 'hidden' : '')}>
                            <img src="/img/navigate.svg" alt="navigate" width="50px"/>
                        </button>
                        <button className={"btn " + (this.state.customize ? 'hidden' : '')} onClick = {this.selectComponent}>
                            <img src="/img/home.svg" alt="home" width="50px"/>
                        </button>
                    </nav>
                    <Customize customize={this.state.customize}/>
                </div>
    }
}

Nav.contextType = SessionContext
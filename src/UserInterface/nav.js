import { Config } from '../Config'
import * as Mofify from './modify'
import * as Travel from './travel'
import { SessionContext } from './sessionContext'

export class Nav extends Config {

    state = {
            modify: false,
            travel: false
    }

    shipModify = () => {
        this.setState({modify: this.state.modify === true ? false : true})
    }

    shipTravel = () => {
        this.setState({travel: this.state.travel === true ? false : true})
    }

    openHome = () => {
        window.open(Config.config.codeshipNet.urlBase).focus()
        window.addEventListener('message', e => {
            if (e.origin === Config.config.codeshipNet.urlBase) {
                if (this.context.token) {
                    if(e.data === this.context.postMessageS)
                    e.source.postMessage(this.context.token, Config.config.codeshipNet.urlBase)
                    window.removeEventListener('message')
                }
            }
        })
    }

    render() {
        return  <div>
                    <nav className="absolute bottom flex-col" >
                        <Mofify.Nav shipModify={this.shipModify} modify={this.state.modify}/>
                        <Travel.Nav shipTravel={this.shipTravel} travel={this.state.travel}/>
                        <button className={"btn " + (this.state.modify || this.state.travel ? 'hidden' : '')} onClick = {this.shipModify}>
                            <img src="/img/modify.svg" alt="modify" width="50px"/>
                        </button>
                        <button className={"btn " + (this.state.modify || this.state.travel ? 'hidden' : '')} onClick = {this.shipTravel}>
                            <img src="/img/travel.svg" alt="travel" width="50px"/>
                        </button>
                        <button className={"btn " + (this.state.modify || this.state.travel ? 'hidden' : '')} onClick = {this.openHome}>
                            <img src="/img/home.svg" alt="home" width="50px"/>
                        </button>
                    </nav>
                    <Travel.Interface travel={this.state.travel}/>
                    <Mofify.Interface modify={this.state.modify}/>
                </div>
    }
}

Nav.contextType = SessionContext
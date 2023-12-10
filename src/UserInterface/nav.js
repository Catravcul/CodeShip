
import { Config } from '../Game/Config'
import * as Modify from './modify'
import Drive from './drive'
import { SessionContext } from './context'
import ButtonLabeled from './components/ButtonLabeled';

export class Nav extends Config {

    state = {
        energyPercent: 100,
        modify: false,
        travel: false,
        showSpinNav: false
    }

    shipModify = () => {
        this.setState({modify: this.state.modify === true ? false : true})
    }

    shipTravel = () => {
        this.setState({travel: this.state.travel === true ? false : true})
    }

    toggleNav = () => {
        const newVal = this.state.showSpinNav ? false : true
        this.setState({showSpinNav : newVal})
    }
    
    changeEnergy = (energy, potential) => {
        this.setState({energyPercent: ((energy*100)/potential)})
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
    /**
     * 
     * @param {KeyboardEvent} e 
     */
    keyHandler = e => {
        switch (e.key) {
            case "d": this.shipModify(); break;
            case "s": this.shipTravel(); break;
            case "a": this.openHome(); break;
        }
    }
    componentDidMount () {
        if (!this.props.showLogin) document.addEventListener('keypress', this.keyHandler)
    }
    componentDidUpdate (prevProps, prevState) {
        if (prevState.travel != this.state.travel || prevState.modify != this.state.modify || prevState.showLogin != this.props.showLogin) {
            if (this.state.travel || this.state.modify || this.props.showLogin) document.removeEventListener('keypress', this.keyHandler)
            else document.addEventListener('keypress', this.keyHandler)
        }
    }

    buttonsLabeled = [
        { 
            label:{title:"modify ship", placement:'right'},
            button:{content:'d', bgColor:'warning.main', onClick:this.shipModify}
        },
        { 
            label:{title:"drive ship", placement:'right'},
            button:{content:'s', bgColor:'warning.main', onClick:this.shipTravel}
        },
        { 
            label:{title:"open home", placement:'right'},
            button:{content:'a', bgColor:'error.main', onClick:this.openHome}
        }
    ]

    render() {
        return(  
        <div>
            <nav className="absolute bottom flex-col" >
                { this.state.modify ? <Modify.Nav shipModify={ this.shipModify } modify={ this.state.modify } showLogin={ this.props.showLogin }/> : "" }
                { this.state.travel ? <Drive.Nav toggleNav={ this.toggleNav } shipTravel={ this.shipTravel } showLogin={ this.props.showLogin }/> : "" }
                { !this.state.travel && !this.state.modify ?
                <>
                    { this.buttonsLabeled.map( (buttonLabeled, i) => <ButtonLabeled {...buttonLabeled} key={buttonLabeled.button.content + i} />) }
                </> : ''
                }
            </nav>
            <Drive.Controls travel={ this.state.travel } showSpinNav={ this.state.showSpinNav } energyPercent={ this.state.energyPercent } showLogin={ this.props.showLogin }/>
            <Modify.Interface modify={ this.state.modify } showLogin={ this.props.showLogin }/>
        </div>
        )
    }
}

Nav.contextType = SessionContext
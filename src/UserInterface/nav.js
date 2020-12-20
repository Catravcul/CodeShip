import { Config } from '../Config'
import { Customize } from './customize'

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

    render() {
        return  <div>
                    <nav className="absolute bottom flex-col" >
                        <button className={"btn " + (this.state.customize ? '' : 'hidden')} onClick = {this.cancelCustomize}>
                            <img src="/img/cancel.svg" alt="cancel" width="50px"/>
                        </button>
                        <button className={"btn " + (this.state.customize ? '' : 'hidden')} >
                            <img src="/img/apply.svg" alt="apply" width="50px"/>
                        </button>
                        <button className={"btn " + (this.state.customize ? 'hidden' : '')} onClick = {this.customizeShip}>
                            <img src="/img/customize.svg" alt="customize" width="50px"/>
                        </button>
                        <button className={"btn " + (this.state.customize ? 'hidden' : '')}>
                            <img src="/img/navigate.svg" alt="navigate" width="50px"/>
                        </button>
                        <button className={"btn " + (this.state.customize ? 'hidden' : '')}>
                            <img src="/img/shop.svg" alt="shop" width="50px"/>
                        </button>
                    </nav>
                    <Customize customize={this.state.customize} session={this.props.session} products={this.props.products}/>
                </div>
    }
}
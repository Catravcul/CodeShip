import { Config } from '../Config'

export class Nav extends Config {

    exit = () => {
        this.props.shipTravel()
    }
    render() {
        return(
            <>
            <button className={"btn " + (this.props.travel ? '' : 'hidden')} onClick = {this.exit}>
            <img src="/img/cancel.svg" alt="cancel" width="50px"/>
            </button>
            </>
        )
    }
}
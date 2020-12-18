import { Component } from 'react'

export class Customize extends Component {
    state = {
        spaceshipClassText: ''
    }

    componentDidMount() {
        fetch('http://127.0.0.1:5000/spaceship.txt', {method: 'GET'})
        .then(res => res.text()).then( data => this.setState({spaceshipClassText: data}))
    }

    changeSpaceshipClassText = ( e ) => {
        this.setState( { spaceshipClassText: e.currentTarget.value } )
    }

    render() {
        return  <div id="spaceship-class" className={ "absolute middle " + this.props.spaceshipVisibility }>
                    <textarea value = { this.state.spaceshipClassText } className = "screen-80" spellCheck = "false" onChange = { this.changeSpaceshipClassText }></textarea>
                    <button id = "apply" onClick = { this.uploadSpaceshipClassText }>
                        <img src="/img/apply.svg" alt="shop" width="20px"/>
                    </button>
                </div>
    }
}
import { Config } from '../Config'
import { SessionContext } from './sessionContext'

export class Login extends Config {

    state = {
        hidden: '',
        username: '',
        password: ''
    }

    componentDidMount() {
        if (window.opener) {
            window.addEventListener("message", (e) => {
                if (e.origin === "http://localhost:3000") {
                    const tokenSession = e.data;
                    sessionStorage.setItem("codeship-token", tokenSession);
                    this.props.updateToken(tokenSession);
                }
            })
            window.opener.postMessage("123", "http://localhost:3000");
            window.opener = null;
        }
    }

    hide = () => {
        this.setState({hidden: 'hidden'})
    }

    login = () => {
        fetch(Config.config.codeshipApi.urlBase + 'public/user', {
            method: 'POST',
            body: JSON.stringify({username: this.state.username, password: this.state.password}),
            headers: {'Content-Type': 'application/json'}
        }).then(res => res.json()).then(({token}) => {
            sessionStorage.setItem('codeship-token', token)
            this.props.updateToken({token: token})
        })
    }

    changeText = (e, prop) => {
        let state = {}
        state[prop] = e.currentTarget.value
        this.setState(state)
    }

    render() {
        return <section className={"login-s " + this.state.hidden}>
            <div className="absolute screen top" onClick={this.hide}></div>
            <div className="absolute middle bg-gray">
                <h1>Login</h1>
                <p>Login to save progress!</p>
                <fieldset>
                    <input value={this.state.username} onChange={e => this.changeText(e, 'username')}  type="text"  placeholder="username"/>
                </fieldset>
                <fieldset>
                    <input value={this.state.password} onChange={e => this.changeText(e, 'password')}  type="password"  placeholder="password"/>
                </fieldset>
                <fieldset>
                    <button onClick={this.login}>LOGIN</button>
                </fieldset>
                <div>Icons made by <a href="https://icon54.com/" title="Pixel perfect">Pixel perfect</a> from <a href="https://www.flaticon.com/" title="Flaticon">www.flaticon.com</a></div>
            </div>
        </section>
    }
}

Login.contextType = SessionContext
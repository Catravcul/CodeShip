import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import Slide from '@mui/material/Slide';

import { Config } from '../Config'
import { SessionContext } from './sessionContext'

export class Login extends Config {

    state = {
        username: 'videnacry',
        password: '123456',

    }

    componentDidMount() {
        if (window.opener) {
            const getToken = (e) => {
                if (e.origin === Config.config.codeshipNet.urlBase) {
                    const tokenSession = e.data;
                    sessionStorage.setItem("codeship-token", tokenSession)
                    this.props.updateToken(tokenSession)
                    window.removeEventListener('message', getToken)
                }
            }
            window.addEventListener("message", getToken)
            window.opener.postMessage("123", Config.config.codeshipNet.urlBase);
            window.opener = null;
        }
    }

    login = () => {
        fetch(Config.config.codeshipApi.urlBase + '/public/user', {
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
        return <Slide in={this.props.isLogin} direction='left' unmountOnExit><section className="absolute screen top" onClick={this.props.hideLog}>
            <div className="absolute middle bg-white b-rad-10-px" style={{ width: "360px", maxWidth: "90%" }}>
                <IconButton aria-label="close" color="error" sx={{ position: 'absolute', right: 0, marginRight: 1 }}  onClick={this.props.hideLog}>&times;</IconButton>
                <h1>codeship-net</h1>
                <div>
                    <TextField
                    label="Username"
                    value={this.state.username}
                    onChange={e => this.changeText(e, 'username')}
                    sx={{ m: 1 }}
                    />
                </div>
                <div>
                    <TextField
                    type="password"
                    label="Password"
                    value={this.state.password}
                    onChange={e => this.changeText(e, 'password')}
                    sx={{ m: 1 }}
                    />
                </div>
                <Button fullWidth size='small' variant="contained" onClick={this.login} sx={{ my: 1 }}>LOGIN</Button>
                <div>Icons made by <a href="https://icon54.com/" title="Pixel perfect">Pixel perfect</a> from <a href="https://www.flaticon.com/" title="Flaticon">www.flaticon.com</a></div>
            </div>
        </section></Slide>
    }
}

Login.contextType = SessionContext
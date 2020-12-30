import { createContext } from 'react'

export const SessionContext = createContext({
    postMessageS: '',
    session: {},
    updateToken: () => {},
    token: '',
    products: []
})
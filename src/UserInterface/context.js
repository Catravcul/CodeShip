import { createContext } from 'react'

export const SessionContext = createContext({
    postMessageS: '',
    session: {},
    token: '',
    products: []
})

export const UserInterfaceContext = createContext({ 
    buttonsLabeled: { open: true } 
})
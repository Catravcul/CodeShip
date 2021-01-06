const mode = 'PROD'

const development = {
    codeshipApi: {
        urlBase: 'http://127.0.0.1:5000'
    }, 
    codeshipNet: {
        urlBase: 'http://127.0.0.1:3000'
    },
    codeshipFS: {
        urlBase: 'http://127.0.0.1:7000'
    }
}
const test = {
    codeshipApi: {
        urlBase: 'http://127.0.0.1:5000'
    }, 
    codeshipNet: {
        urlBase: 'http://127.0.0.1:3000'
    },
    codeshipFS: {
        urlBase: 'http://127.0.0.1:7000'
    }
}
const production = {
    codeshipApi: {
        urlBase: 'https://codeship-api.herokuapp.com'
    }, 
    codeshipNet: {
        urlBase: 'https://codeship-net.herokuapp.com'
    },
    codeshipFS: {
        urlBase: 'https://codeship-fs.herokuapp.com'
    }
}
    
export function getConfig() {
    switch(mode) {
    case "DEV" :
    return development;
    case "TEST" :
    return test;
    default :
    return production;
}}
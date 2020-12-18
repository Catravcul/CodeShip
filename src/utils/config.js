const mode = 'DEV'

const development = {
    codeshipApi: {
    urlBase : 'http://127.0.0.1:5000/'
    }}
    const test = {
    codeshipApi: {
    urlBase : 'http://127.0.0.1:5000/'
    }}
    const production = {
    codeshipApi: {
    urlBase : 'https://codeship-api.herokuapp.com/'
}}
    
export function getConfig() {
    switch(mode) {
    case "DEV" :
    return development;
    case "TEST" :
    return test;
    default :
    return production;
}}
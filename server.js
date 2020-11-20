const fs = require( 'fs/promises' )
const path = require( 'path' )
const body_parser = require( 'body-parser' )
const express = require( 'express' )

const app = express( )

app.use( body_parser.urlencoded( { extended : false } ) )
app.use( body_parser.json() )
app.use( express.static( path.join( __dirname, 'build' ) ) );
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', 'http://localhost:3000')
    res.header('Access-Control-Allow-Headers', 'Content-Type')
    if(req.method === 'OPTIONS'){
        res.header('Access-Control-Allow-Methods', 'PUT, GET, POST, DELETE, PATCH')
        res.status(200).json({})
    }
    next()
})

app.get( '/*', ( req, res ) => { 
  res.sendFile( path.join( __dirname + '/build/index.html' ) ) 
} );
app.post( '/spaceship/class', ( req, res ) => { 
    const response = {}
    fs.readFile( 'src/threeModels/Spaceship.js', { encoding : 'utf-8' })
    .then( ( data ) => {
        response.fileText = data
        res.status( 200 ).json( response )
    } )
    .catch( ( err ) => {
        response.error = err
        res.status( 500 ).json( response )
    } )
} );
app.put( '/spaceship/class', ( req, res ) => {
    fs.writeFile( 'src/threeModels/Spaceship.js', req.body.fileText )
    .then( () => {
        response.message = 'well done'
        res.status( 200 ).json( response )
    } )
    .catch( err => {
        const response = {
            error : err
        }
        res.status( 500 ).json( response )
    } )
} )

app.listen( 300 )
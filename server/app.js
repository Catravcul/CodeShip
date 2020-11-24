import { readFile, writeFile } from 'fs/promises'
// const Spaceship = require( './src/threeModels/Spaceship' )
import { join } from 'path'
import bodyParser from 'body-parser'
import express from 'express'

const app = express( )

app.use( bodyParser.urlencoded( { extended : false } ) )
app.use( bodyParser.json() )
app.use( express.static( join( process.cwd(), 'build' ) ) );
app.use( express.static( '7' ) );
// app.use( (req, res, next) => {
//     res.header('Access-Control-Allow-Origin', '*')
//     res.header('Access-Control-Allow-Headers', 'Content-Type')
//     if(req.method === 'OPTIONS'){
//         res.header('Access-Control-Allow-Methods', 'PUT, GET, POST, DELETE, PATCH')
//         res.status(200).json({})
//     }
//     next()
// })
app.get( '/*', ( req, res ) => {
  res.sendFile( join( process.cwd(), '/build/index.html' ) )
} );
app.post( '/spaceship/class', ( req, res ) => {
    const response = {}
    readFile( 'build/threeModels/Spaceship.js', { encoding : 'utf-8' })
    .then( ( data ) => {
        response.fileText = data
        res.status( 200 ).json( response )
    } )
    .catch( ( err ) => {
        response.error = err
        res.status( 500 ).json( response )
    } )
} );
app.put( '/spaceship/class', async ( req, res ) => {
    const response = {}
    await writeFile( 'build/threeModels/Spaceship.js', req.body.fileText )
    .then( () => {
        response.message = 'well done'
        res.status( 200 ).json( response )
    } )
} )

app.listen( 300 )
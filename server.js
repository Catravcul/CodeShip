const fs = require( 'fs' )
const path = require( 'path' )
const express = require( 'express' )

const app = express( )

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
    fs.readFile( 'src/threeModels/Spaceship.js', { encoding : 'utf-8' }, ( err, data ) => {
        const response = {
            fileText : data,
            error : err
        }
        console.log( typeof data)
        res.status( 200 ).json( response )
    } )
  } );

app.listen( 300 )
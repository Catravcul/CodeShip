import { Component } from 'react'
import { getConfig } from './utils/config'
import { Group } from 'three'
import { Spaceship } from './threeModels/Spaceship'

export class Config extends Component {
    static config = getConfig()
    static components = {fuselage: 'StandardF', propulsionEngine: 'StandardPE', takeoff: 'StandardTO'}
    static ship = new Group()
    static shipInstance = new Spaceship(Config.ship)
}
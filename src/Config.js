import { Component } from 'react'
import { getConfig } from './utils/config'

export class Config extends Component {
    config = getConfig()
}
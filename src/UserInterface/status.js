import { Config } from '../Config'

export class Status extends Config {
    state = {energy : 10}

    changeEnergy = (energyPercent) => this.setState({energy: (energyPercent/10)})

    radialColors = ['white', 'cyan', 'blue', 'lime', 'yellow', 'red', 'magenta', 'purple', 'brown', 'black']
    radialGradient = 'radial-gradient(circle at left, ' + this.radialColors.slice(0, this.state.energy).join(',') + ')'
    barStyle = {backgroundImage: this.radialGradient}
    barClass = 'px-20-px py-3-px m-3-px b-rad-3-px bg-gray color-white-and-black '
    render() {
        return(
            <>
            <ul className='absolute bottom right list-style-none'>
                <li className={this.barClass} style={this.barStyle}>Energy 100%</li>
            </ul>
            </>
        )
    }
}
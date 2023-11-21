import {Config} from '../../Game/Config'

const radialColors = ['white', 'cyan', 'blue', 'lime', 'yellow', 'red', 'magenta', 'purple', 'brown', 'black']
const barClass = 'px-20-px py-3-px m-3-px b-rad-10-px bg-gray color-white-and-black '

export class Status extends Config {
    render() {
        const energy = this.props.energyPercent/10
        const radialGradient = 'radial-gradient(circle at left, ' + radialColors.slice(0, energy).join(',') + ', transparent ' + this.props.energyPercent + '%)'
        const barStyle = {backgroundImage: radialGradient}
        return(
            <>
            <ul className='absolute bottom right list-style-none'>
                <li className={barClass} style={barStyle}>Energy {Math.round(this.props.energyPercent)}%</li>
            </ul>
            </>
        )
    }
}
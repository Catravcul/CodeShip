import { Config } from '../Config'

export class Status extends Config {
    render() {
        const energy = this.props.energyPercent/10
        const radialColors = ['white', 'cyan', 'blue', 'lime', 'yellow', 'red', 'magenta', 'purple', 'brown', 'black']
        const radialGradient = 'radial-gradient(circle at left, ' + radialColors.slice(0, energy).join(',') + ', transparent ' + this.props.energyPercent + '%)'
        const barStyle = {backgroundImage: radialGradient}
        const barClass = 'px-20-px py-3-px m-3-px b-rad-3-px bg-gray color-white-and-black '
        return(
            <>
            <ul className='absolute bottom right list-style-none'>
                <li className={barClass} style={barStyle}>Energy 100%</li>
            </ul>
            </>
        )
    }
}
import { Config } from '../Config'

export class Status extends Config {
    radialColors = ['white', 'cyan', 'blue', 'lime', 'yellow', 'red', 'magenta', 'purple', 'brown', 'black']
    radialGradient = 'radial-gradient(circle at left, ' + this.radialColors.join(',') + ')'
    barStyle = {backgroundImage: this.radialGradient}
    barClass = 'px-20-px py-3-px m-3-px b-rad-3-px bg-gray color-white-and-black '
    render() {
        return(
            <>
            <ul className={'absolute bottom right list-style-none ' + (this.props.status ? '' : 'hidden')}>
                <li className={this.barClass} style={this.barStyle}>Energy 100%</li>
            </ul>
            </>
        )
    }
}
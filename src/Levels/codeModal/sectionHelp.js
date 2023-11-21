import {useCallback} from 'react'
import './sectionHelp.css'

export const Button = ({helpSection}) => {
    const toggleHelpSection = useCallback(({currentTarget: {classList: btnClassList}}) => {
        btnClassList.toggle('selected')
        const {current: {classList}} = helpSection
        if (classList.contains('show')) {
            classList.replace('show', 'hide')
        } else if (classList.contains('hide')) {
            classList.replace('hide', 'show')
        } else {
            classList.add('show')
        }
    }, [])
    return(
        <button onClick={toggleHelpSection} className='help'>?</button>
    )
}

export const Section = ({helpSection}) => {
    
    return(
        <div className='help-s' ref={ref => helpSection.current = ref}>
            /*
            <ul>
                <h3>Help</h3>
                <li>Drag.- click the code fragment, then move the mouse to the slot, it most be inside to work.</li>
            </ul>
            */
        </div>
    )
}
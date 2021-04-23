import {useCallback, useRef, memo} from 'react'
import './codeModal.css'

export const Structure = memo(({props : {codeObject, dragMouse, dragTouch, toggleModal}}) => {
    const helpSection = useRef(null)

    const codeSlotElement = useCallback((fragment, index) => {
        const elementSize = (55/codeObject.code.length) + 'vw'
        const style = {width: elementSize, height: elementSize}
        return <div className='code-slot' id={'answer' + index} style={style}></div>
    }, [codeObject])

    const codeFragmentElement = useCallback((fragment, index) => {
        const elementSize = (45/codeObject.code.length) + 'vw'
        const top =  ((index + 0.1) * (100 / codeObject.code.length)) + '%'
        const left =  ((index + 0.1) * (100 / codeObject.code.length)) + '%'
        const style = {top, left, width: elementSize, height: elementSize}
        return <code className='code-fragment' onMouseDown={dragMouse} onTouchStart={dragTouch} style={style} id={'codeFragment' + index}>{fragment}</code>
    }, [codeObject])

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
    return (
        <article className='b-rad-10-px absolute color-white code-modal-c'>
            <header>
                <nav>
                    <div className='mode'>
                        <button onClick={e => e.currentTarget.classList.toggle('selected')}>click</button>
                        <button onClick={e => e.currentTarget.classList.toggle('selected')}>drag</button>
                    </div>
                    <button onClick={toggleHelpSection} className='help'>?</button>
                </nav>
                <button className='close' onClick={toggleModal}>x</button>
            </header>
            <div className='help-s' ref={ref => helpSection.current = ref}>
                /*
                <ul>
                    <h3>Help</h3>
                    <li>Click.- click on the code snippet you want to fill the first available space with</li>
                    <li>Drag.- click the code fragment, then move (not fast) the mouse to the slot, click it again so it does not move</li>
                </ul>
                */
            </div>
            <div className='code-s'>
                {codeObject.code.map(codeSlotElement)}
                {codeObject.code.map(codeFragmentElement)}
            </div>
        </article>
    )
})
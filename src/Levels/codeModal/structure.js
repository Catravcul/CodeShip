import {useCallback, useRef, memo} from 'react'
import {dragMouse, dragTouch} from './drag'
import {ExecButton} from './execButton'

import * as Help from './helpSection'
import './codeModal.css'
import './codeSlotSnippet.css'

export const Structure = memo(({props: {
    codeObject, toggleModal, codeSlots: {current: slots}, codeSnippets: {current: snippets}
}}) => {
    const helpSection = useRef(null)

    const codeSlotElement = useCallback((fragment, index) => {
        const elementSize = (60/codeObject.code.length) + 'vw'
        const style = {width: elementSize, height: elementSize}
        return <div className='code-slot' id={'answer' + index} style={style} ref={ref => slots[index] = ref}></div>
    }, [codeObject])

    const codeFragmentElement = useCallback((fragment, index) => {
        const elementSize = (50/codeObject.code.length) + 'vw'
        const top =  ((index + 0.1) * (100 / codeObject.code.length)) + '%'
        const left =  ((index + 0.1) * (100 / codeObject.code.length)) + '%'
        const style = {top, left, width: elementSize, height: elementSize}
        let href
        return (
            <code 
                ref={ref => {
                    href = ref
                    snippets[index] = ref
                }}
                className='code-fragment'
                onMouseDown={dragMouse}
                onTouchStart={e => dragTouch(e, href)}
                style={style} id={'codeFragment' + index}
            >
                {fragment}
            </code>
        )
    }, [codeObject])

    return (
        <article className='b-rad-10-px absolute color-white code-modal-c'>
            <header>
                <nav>
                    <div className='mode'>
                        <button onClick={e => e.currentTarget.classList.toggle('selected')}>click</button>
                        <button onClick={e => e.currentTarget.classList.toggle('selected')}>drag</button>
                    </div>
                    <Help.Button helpSection={helpSection}/>
                </nav>
                <button className='close' onClick={toggleModal}>x</button>
            </header>
            <Help.Section helpSection={helpSection}/>
            <div className='code-s'>
                {codeObject.code.map(codeSlotElement)}
                {codeObject.code.map(codeFragmentElement)}
            </div>
            <footer>
                <ExecButton snippets={snippets} slots={slots}/>
            </footer>
        </article>
    )
})
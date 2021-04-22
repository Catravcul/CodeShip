import {useState, useCallback, useRef, memo} from 'react'
import './codeModal.css'

export const CodeModal = memo(({codeObject}) => {
    
    const [showModal, setShowModal] = useState(false)
    const toggleModal = useCallback(() => setShowModal(prevState => prevState ? false : true), [])

    const dragTouch = useCallback(({targetTouches}) => {
        const {clientX, clientY, target} = targetTouches[0]
        const currentTarget = target.tagName === 'SPAN' ? target.parentElement : target
        const init = {x: clientX, y: clientY}
        const moveElement = ({targetTouches}) => {
            const {clientX, clientY, target} = targetTouches[0]
            const currentTarget = target.tagName === 'SPAN' ? target.parentElement : target
            const current = {x: clientX - init.x, y: clientY - init.y}
            currentTarget.style.top = currentTarget.offsetTop + current.y + 'px'
            currentTarget.style.left = currentTarget.offsetLeft + current.x + 'px'
            init.x = clientX 
            init.y = clientY
        }
        currentTarget.ontouchmove = moveElement
        currentTarget.ontouchend = () => {
            currentTarget.ontouchmove = null
            currentTarget.ontouchend = null
        }
    }, [])
    
    const dragMouse = useCallback(({clientX, clientY, currentTarget}) => {
        const init = {x: clientX, y: clientY}
        const moveElement = ({clientX, clientY, currentTarget}) => {
            const current = {x: clientX - init.x, y: clientY - init.y}
            currentTarget.style.top = currentTarget.offsetTop + current.y + 'px'
            currentTarget.style.left = currentTarget.offsetLeft + current.x + 'px'
            init.x= clientX 
            init.y= clientY
        }
        currentTarget.onmousemove = moveElement
        currentTarget.onmouseup = () => {
            currentTarget.onmousemove = null
            currentTarget.onmouseup = null
        }
    }, [])

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

    const getModal = useCallback(() =>
        <article className='b-rad-10-px absolute color-white code-modal-c'>
            <header>
                <nav>
                    <div className='mode'>
                        <button onClick={e => e.currentTarget.classList.toggle('selected')}>click</button>
                        <button onClick={e => e.currentTarget.classList.toggle('selected')}>drag</button>
                    </div>
                    <div className='help'>
                        <button>?</button>
                    </div>
                </nav>
                <button className='close' onClick={toggleModal}>x</button>
            </header>
            <div className='help-s'>
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
    , [codeObject])

    return(
        <>
        <button onClick={toggleModal}>Code</button>
        {showModal && codeObject ? getModal() : <></>}
        </>
    )
})
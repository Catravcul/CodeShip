import {useState, useCallback, useMemo, memo} from 'react'
import {Structure} from './structure'

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

    const props = useMemo(() => {
        return {
            codeObject, dragMouse, dragTouch, toggleModal
        }
    }, [codeObject])

    return(
        <>
        <button onClick={toggleModal}>Code</button>
        {showModal && codeObject ? <Structure props={props}/> : <></>}
        </>
    )
})
/**
 * Drag html element with touch
 * @param {object} e html element event
 * @param {object} target html element that is going to be moved
 */
export const dragTouch = ({targetTouches}, target) => {
    const {clientX, clientY} = targetTouches[0]
    const init = {x: clientX, y: clientY}
    const moveElement = ({targetTouches}) => {
        const {clientX, clientY} = targetTouches[0]
        const current = {x: clientX - init.x, y: clientY - init.y}
        target.style.top = target.offsetTop + current.y + 'px'
        target.style.left = target.offsetLeft + current.x + 'px'
        init.x = clientX 
        init.y = clientY
    }
    target.ontouchmove = moveElement
    target.ontouchend = () => {
        target.ontouchmove = null
        target.ontouchend = null
    }
}

/**
 * Drag html element with mouse
 * @param {object} e html element event 
 */
export const dragMouse = ({clientX, clientY, currentTarget: target}) => {
    const init = {x: clientX, y: clientY}
    const moveElement = ({clientX, clientY}) => {
        const current = {x: clientX - init.x, y: clientY - init.y}
        target.style.top = target.offsetTop + current.y + 'px'
        target.style.left = target.offsetLeft + current.x + 'px'
        init.x= clientX 
        init.y= clientY
    }
    target.onmousemove = moveElement
    target.onmouseup = () => {
        target.onmousemove = null
        target.onmouseup = null
    }
}
import {useCallback, useRef, memo} from 'react'
import {checkFit} from './checkFit'
import './buttonExec.css'
import winImg from './win.svg'

export const ButtonExec = memo(({props: {
    codeSlots: slots, codeSnippets: snippets, orbits, nextCodeObj
}}) => {
    const outcomeEl = useRef(null)
    const executeCode = useCallback(() => {
        let win = true
        slots.map((slot, index) => {
            slot.className = 'code-slot'
            if (checkFit(slot, snippets[index], 25)) {
                slot.classList.add('succeed')
            } else {
                slot.classList.add('fail')
                win = false
            }
        })
        if (win) {
            orbits.map(orbit => orbit.classList.add('spin'))
            slots.map(slot => {
                snippets.map(snippet => snippet.classList.add('hide'))
                slot.children[0].classList.remove('hide')
                slot.classList.add('match')
            })
            outcomeEl.current.classList.add('win')
            nextCodeObj()
        }
    })
    return(
        <>
            <div className='outcome' ref={ref => outcomeEl.current = ref}>
                <img src={winImg}/>
            </div>
            <div className='btn-exec' onClick={executeCode}>
                <button/>
                {[1, 0, 0, 1].map( (digit, idx) =>
                    <i key={"digit" + idx}>{digit}</i>
                )}
                <span>Execute</span>
            </div>
        </>
    )
})
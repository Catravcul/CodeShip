import {useCallback, memo} from 'react'
import {checkFit} from './checkFit'

export const ExecButton = memo(({slots, snippets, orbits}) => {
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
        }
    }, [slots, snippets])
    return(
        <button onClick={executeCode}>Execute code</button>
    )
})
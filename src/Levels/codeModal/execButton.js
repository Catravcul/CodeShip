import {useCallback, memo} from 'react'
import {checkFit} from './checkFit'

export const ExecButton = memo(({slots, snippets}) => {
    const executeCode = useCallback(() => {
        slots.map((slot, index) => {
            slot.className = 'code-slot'
            if (checkFit(slot, snippets[index], 25)) {
                slot.classList.add('succeed')
            } else {
                slot.classList.add('fail')
            }
        })
    }, [slots, snippets])
    return(
        <button onClick={executeCode}>Execute code</button>
    )
})
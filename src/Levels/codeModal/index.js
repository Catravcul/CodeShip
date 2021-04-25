import {useState, useCallback, useMemo, useRef, memo} from 'react'
import {Structure} from './structure'

export const CodeModal = memo(({codeObject}) => {
    
    const [showModal, setShowModal] = useState(false)
    const toggleModal = useCallback(() => setShowModal(prevState => prevState ? false : true), [])
    const codeSlots = useRef([])
    const codeSnippets = useRef([])

    const props = useMemo(() => {
        return {
            codeObject, toggleModal, codeSlots, codeSnippets
        }
    }, [codeObject])

    return(
        <>
        <button onClick={toggleModal}>Code</button>
        {showModal && codeObject ? <Structure props={props}/> : <></>}
        </>
    )
})
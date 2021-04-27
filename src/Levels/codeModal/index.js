import {useState, useCallback, useMemo, useRef, memo} from 'react'
import {SectionCode} from './sectionCode'
import {ButtonExec} from './buttonExec'
import * as Help from './sectionHelp'
import './index.css'

export const CodeModal = memo(({codeObject}) => {
    
    const [showModal, setShowModal] = useState(false)
    const toggleModal = useCallback(() => setShowModal(prevState => prevState ? false : true), [])
    const helpSection = useRef(null)
    const {current: codeSlots} = useRef([])
    const {current: codeSnippets} = useRef([])
    const {current: orbits} = useRef([])

    const codeProps = useMemo(() => {
        return {
            codeObject, codeSlots, codeSnippets, orbits
        }
    }, [codeObject])

    const execProps = useMemo(() => {
        return {
            orbits, codeSlots, codeSnippets
        }
    }, [codeObject])

    const structure = useCallback(() => 

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
            <SectionCode props={codeProps}/>
            <footer>
                <ButtonExec props={execProps}/>
            </footer>
        </article>

    ,[codeObject])
    return(
        <>
        <button onClick={toggleModal}>Code</button>
        {showModal && codeObject ? structure() : null}
        </>
    )
})
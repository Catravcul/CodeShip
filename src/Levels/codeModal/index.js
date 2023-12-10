import {useMemo, useRef, memo, useContext} from 'react'
import {SectionCode} from './sectionCode'
import {ButtonExec} from './buttonExec'
import * as Help from './sectionHelp'
import Slide from '@mui/material/Slide'

import './index.css'
import { LevelsContext } from '../context'

export const CodeModal = memo(({codeObj, nextCodeObj}) => {
    const { showCode, toggleShowCode } = useContext(LevelsContext)

    const helpSection = useRef(null)
    const {current: codeSlots} = useRef([])
    const {current: codeSnippets} = useRef([])
    const {current: orbits} = useRef([])

    const codeProps = useMemo(() => ({ codeObj, codeSlots, codeSnippets, orbits }), [codeObj])

    const execProps = useMemo(() => ({ orbits, codeSlots, codeSnippets, nextCodeObj }), [nextCodeObj])
    

    return (
        
        <Slide in={showCode} direction='right' unmountOnExit>
            
        <div className='absolute screen top' onClick={toggleShowCode}>
            <article className='b-rad-10-px absolute color-white code-modal-c' onClick={e => e.stopPropagation()}>
                <header>
                    <nav>
                        <div className='mode'>
                            <button onClick={e => e.currentTarget.classList.toggle('selected')}>click</button>
                            <button onClick={e => e.currentTarget.classList.toggle('selected')}>drag</button>
                        </div>
                        <Help.Button helpSection={helpSection}/>
                    </nav>
                    <button className='close' onClick={toggleShowCode}>x</button>
                </header>
                <Help.Section helpSection={helpSection}/>
                <SectionCode props={codeProps}/>
                <footer>
                    <ButtonExec props={execProps}/>
                </footer>
            </article>
            </div>
        </Slide>
    )
})
import {useState, useCallback, useMemo, useRef, memo} from 'react'
import {SectionCode} from './sectionCode'
import {ButtonExec} from './buttonExec'
import * as Help from './sectionHelp'
import Tooltip from '@mui/material/Tooltip'
import Avatar from '@mui/material/Avatar'
import IconButton from '@mui/material/IconButton'
import Slide from '@mui/material/Slide'

import './index.css'

export const CodeModal = memo(({codeObj, nextCodeObj}) => {
    const [isModalVisible, setIsModalVisible] = useState(false)
    const toggleIsModalVisible = () => setIsModalVisible(old => !old)

    const helpSection = useRef(null)
    const {current: codeSlots} = useRef([])
    const {current: codeSnippets} = useRef([])
    const {current: orbits} = useRef([])

    const codeProps = useMemo(() => ({ codeObj, codeSlots, codeSnippets, orbits }), [codeObj])

    const execProps = useMemo(() => ({ orbits, codeSlots, codeSnippets, nextCodeObj }), [nextCodeObj])
    

    return(
        <>
        <Tooltip title="show code modal" placement='right'>
            <IconButton aria-label="<>" color="success"  onClick={ toggleIsModalVisible }>
                <Avatar sx={{ bgcolor: "success.light" }} variant='rounded'>{'<>'}</Avatar>
            </IconButton>
        </Tooltip>
        
        <Slide in={isModalVisible} direction='right' unmountOnExit>
            
        <div className='absolute screen top' onClick={() => setIsModalVisible(false)}>
            <article className='b-rad-10-px absolute color-white code-modal-c' onClick={e => e.stopPropagation()}>
                <header>
                    <nav>
                        <div className='mode'>
                            <button onClick={e => e.currentTarget.classList.toggle('selected')}>click</button>
                            <button onClick={e => e.currentTarget.classList.toggle('selected')}>drag</button>
                        </div>
                        <Help.Button helpSection={helpSection}/>
                    </nav>
                    <button className='close' onClick={() => setIsModalVisible(false)}>x</button>
                </header>
                <Help.Section helpSection={helpSection}/>
                <SectionCode props={codeProps}/>
                <footer>
                    <ButtonExec props={execProps}/>
                </footer>
            </article>
            </div>
        </Slide>
        </>
    )
})
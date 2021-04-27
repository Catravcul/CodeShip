import {useCallback, useRef, memo} from 'react'
import {dragMouse, dragTouch} from './drag'
import './sectionCode.css'

export const SectionCode = memo(({props: {
    codeObject, codeSlots: slots, codeSnippets: snippets, orbits: orbits
}}) => {

    const getSlotElement = useCallback((fragment, index) => {
        const slotSize = (60/codeObject.code.length) + 'vw'
        const snippetSize = (50/codeObject.code.length) + 'vw'
        const slotStyle = {width: slotSize, height: slotSize}
        const snippetStyle = {width: snippetSize, height: snippetSize}
        
        return (
            <div className='code-slot' id={'answer' + index} style={slotStyle} ref={ref => slots[index] = ref}>
                <code className='code-fragment hide' style={snippetStyle} id={'codeAnswer' + index} >
                    {fragment}
                </code>
            </div>
        )
    }, [codeObject])

    const fillSlotsLine = useCallback((slotIndices, fillIndices, className = 'space-25', fragments = codeObject.code, createSlot = getSlotElement) => {
        const line = []
        slotIndices.map(index => {
            line[index] = createSlot(fragments[index], index)
        })
        fillIndices.map(index => {
            line[index] = <div className={className}></div>
        })
        return line
    }, [])

    const getSnippetElement = useCallback((fragment, index) => {
        const length = codeObject.code.length
        const elementSize = (50 / length) + 'vw'
        const top =  ((index + 0.1) * (100 / length)) + '%'
        const left =  index % 2 ? ((index - 0.9) * (100 / length)) + '%' : ((index + 1) * (100 / length)) + '%'
        const style = {top, left, width: elementSize, height: elementSize}
        let href
        return (
            <code 
                ref={ref => {
                    href = ref
                    snippets[index] = ref
                }}
                className='code-fragment'
                onMouseDown={dragMouse}
                onTouchStart={e => dragTouch(e, href)}
                style={style} id={'codeFragment' + index}
            >
                {fragment}
            </code>
        )
    }, [codeObject])

    return (
        <div className='code-s'>
            <div className='line'>
                <div style={{position: 'absolute', width: '100%'}}>
                    {fillSlotsLine([1], [0,2,3])}
                </div>
                <div ref={ref => orbits[0]=ref} className='first-orbit'>
                    {fillSlotsLine([0, 2], [1], 'space-33')}
                </div>
                <div ref={ref => orbits[1]=ref} className='second-orbit'>
                    {fillSlotsLine([3], [0,1,2])}
                </div>
            </div>
            {codeObject.code.map(getSnippetElement)}
        </div>
    )
})
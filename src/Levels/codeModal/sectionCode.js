import {useCallback, useRef, memo, useEffect} from 'react'
import {createDraggable, createDropzone} from './drag'
import './sectionCode.css'

export const SectionCode = memo(({props: {
    codeObj, codeSlots: slots, codeSnippets: snippets, orbits: orbits
}}) => {
    const refRemoveEvents = useRef([])
    const getSlotElement = useCallback((fragment, index) => {
        const slotSize = (60/codeObj.code.length) + 'vw'
        const snippetSize = (50/codeObj.code.length) + 'vw'
        const slotStyle = {width: slotSize, height: slotSize}
        const snippetStyle = {width: snippetSize, height: snippetSize}
        
        return (
            <div className='code-slot' key={'answer' + index} id={'answer' + index} style={slotStyle}
                ref={ref => {
                    slots[index] = ref
                    refRemoveEvents.current.push(createDropzone(ref))
                }}
            >
                <code className='code-fragment hide' style={snippetStyle} id={'codeAnswer' + index} >
                    {fragment}
                </code>
            </div>
        )
    }, [codeObj])

    const fillSlotsLine = useCallback((slotIndices, fillIndices, className = 'space-25', fragments = codeObj.code, createSlot = getSlotElement) => {
        const line = []
        slotIndices.map(index => {
            line[index] = createSlot(fragments[index], index)
        })
        fillIndices.map(index => {
            line[index] = <div key={index + className} className={className}></div>
        })
        return line
    }, [])

    const getSnippetElement = useCallback((fragment, index) => {
        const length = codeObj.code.length
        const elementSize = (50 / length) + 'vw'
        const top =  ((index + 0.1) * (100 / length)) + '%'
        const left =  index % 2 ? ((index - 0.9) * (100 / length)) + '%' : ((index + 1) * (100 / length)) + '%'
        const style = {top, left, width: elementSize, height: elementSize, textAlign: 'center'}
        return (
            <code 
                key={index + fragment}
                ref={ref => {
                    snippets[index] = ref
                    refRemoveEvents.current.push(createDraggable(ref))
                }}
                className='code-fragment'
                style={style} id={'codeFragment' + index}
            >
                {fragment}
            </code>
        )
    }, [codeObj])

    useEffect( () => {
        const clean = () => refRemoveEvents.current.forEach( remover => remover() )
        return clean
    }, [])

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
            {codeObj.code.map(getSnippetElement)}
        </div>
    )
})
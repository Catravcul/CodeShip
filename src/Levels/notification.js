import {useState, useCallback, useRef, memo} from 'react'

export const Notification = memo(({title, text}) => {
    
    const [count, setCount] = useState(0)
    const [showModal, setShowModal] = useState(true)
    const renders = useRef(0)
    const toggleModal = useCallback(() => setShowModal(prevState => prevState ? false : true), [])
    const getModal = useCallback(() =>
        <article className='absolute'>
            <header>
                <button onClick={toggleModal}>x</button>
            </header>
            <h1 style={{color:'white'}}>{title + renders.current}</h1>
            <p>{text}</p>
            <button onClick={()=>setCount(count+1)}>count {count}</button>
        </article>
    , [])
    
    return(
        <>
        <button onClick={toggleModal}>Quest</button>
        {showModal ? getModal() : <></>}
        </>
    )
})
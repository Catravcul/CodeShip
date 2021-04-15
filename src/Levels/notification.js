import {useState, useCallback, useRef, memo} from 'react'
import './notification.css'

export const Notification = memo(({quest}) => {
    
    const [showModal, setShowModal] = useState(false)
    const [languaje, setLanguaje] = useState('english')
    const toggleModal = useCallback(() => setShowModal(prevState => prevState ? false : true), [])
    const changeLanguaje = useCallback(lang => setLanguaje(() => lang), [])
    const getModal = useCallback(() =>
        <article className='w-60-vw h-70-vh max-w-400-px max-h-550-px b-rad-10-px absolute middle color-white notification-c'>
            <header>
                <button className='close' onClick={toggleModal}>x</button>
            </header>
            <h1>{quest[languaje].title}</h1>
            <img src={quest.img} width='100%'/>
            <nav className='w-100 flex-row p-unset justify-content-center'>
                <ul className='languaje-select flex-row p-unset list-style-none py-3-px'>
                    <li>
                        <button className={'px-20-px py-3-px ' + (languaje == 'spanish' ? 'selected' : '')} onClick={() => changeLanguaje('spanish')}>Spanish</button>
                    </li>
                    <li>
                        <button className={'px-20-px py-3-px ' + (languaje == 'english' ? 'selected' : '')} onClick={() => changeLanguaje('english')}>English</button>
                    </li>
                </ul>
            </nav>
            <h5>{quest[languaje].phrase}</h5>
            <p>{quest[languaje].intro}</p>
            <h2>Steps</h2>
            <ol>
                {quest[languaje].steps.map(step => <li>{step}</li>)}
            </ol>
            <h3>Examples</h3>
            <ul>
                {quest[languaje].code.map(code => <li><code>{code}</code></li>)}
            </ul>
        </article>
    , [languaje])
    return(
        <>
        <button onClick={toggleModal}>Quest</button>
        {showModal ? getModal() : <></>}
        </>
    )
})
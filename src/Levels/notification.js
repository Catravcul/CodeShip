import {useState, useCallback, memo} from 'react'
import './notification.css'

export const propsType = {text:"", texts:[""], setTextIdx:()=>{}, img:""}
export const Notification = memo((props = propsType) => {
    
    const [showModal, setShowModal] = useState(false)
    const [languaje, setLanguaje] = useState('english')
    const toggleModal = useCallback(() => setShowModal(prevState => prevState ? false : true), [])
    const changeLanguaje = useCallback(lang => setLanguaje(() => lang), [])
    const toggleImage = useCallback(() => {
        document.getElementById('notification-img').classList.toggle('hide')
    },[])

    const getModal = useCallback(() =>
        <article className='h-70-vh max-w-400-px max-h-550-px b-rad-10-px absolute middle color-white notification-c'>
            <header>
                <button className='close' onClick={toggleModal}>x</button>
            </header>
            <h1>Texts</h1>
            <img src={ props.img } width='100%' alt='Screenshot as example' onClick={toggleImage}/>
            <nav className='w-100 flex-row p-unset justify-content-center'>
                <ul className='languaje-select flex-row p-unset list-style-none py-3-px'>
                    <li>
                        <button className={'px-20-px py-3-px ' + (languaje === 'spanish' ? 'selected' : '')} onClick={() => changeLanguaje('spanish')}>
                            Spanish
                        </button>
                    </li>
                    <li>
                        <button className={'px-20-px py-3-px ' + (languaje === 'english' ? 'selected' : '')} onClick={() => changeLanguaje('english')}>
                            English
                        </button>
                    </li>
                </ul>
            </nav>
            <h5>{ props.text[languaje].phrase }</h5>
            <p>{ props.text[languaje].intro }</p>
            <h2>Steps</h2>
            <ol>
                {props.text[languaje].steps.map((step, index) => <li id={'questStep' + index} key={'questStep' + index}>{step}</li>)}
            </ol>
            <h3>Examples</h3>
            <ul>
                {props.text[languaje].code.map((code, index) => <li id={'codeExample' + index} key={'codeExample' + index}><code>{code}</code></li>)}
            </ul>
            <nav className='w-100 flex-row p-unset justify-content-center'>
                <ul className='languaje-select flex-row p-unset list-style-none py-3-px'>
                {props.texts.map( (text, idx) =>
                    <li id={text.title + idx + 'questIntro'} key={text.title + idx + 'questIntro'}>
                        <button className={`px-20-px py-3-px ${(text[languaje].title === props.text[languaje].title ? 'selected' : '')}`} onClick={() => props.setTextIdx(idx)}>
                            {text[languaje].title}
                        </button>
                    </li>
                )}
                </ul>
            </nav>
        </article>
    , [languaje, props])
    return(
        <>
        <div id='notification-img' className='absolute left top quest-img big-img hide' style={{backgroundImage: `url(${props.img})`}} onClick={toggleImage}></div>
        <button onClick={toggleModal}>Quest</button>
        {showModal ? getModal() : <></>}
        </>
    )
})
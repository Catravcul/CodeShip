import { memo, useState, useCallback, useEffect, useRef } from 'react'
import { codeObjs as typeQuests, text as typeText } from './type'
import { codeObjs as numberQuests, text as numberText } from './number'
import { CodeModal } from '../codeModal'
import exampleSrc from './type.jpg'
import Trace from "./trace";


const quests = [typeQuests, numberQuests]
const texts = [typeText, numberText]

export const Variables = memo(({ Notification, levelUp, scene }) => {
    const [isModalActive, setIsModalActive] = useState(false)
    
    const [questIdx, setQuestIdx] = useState(0)
    const [codeObjIdx, setCodeObjIdx] = useState(0)

    const [textIdx, setTextIdx] = useState(0)

    const nextQuest = useCallback( () => {
        if (questIdx < (quests.length - 1)) setQuestIdx( prev => (prev + 1)) 
        else alert('there isn\'t more quests yet')
    }, [questIdx, setQuestIdx])

    const nextCodeObj = useCallback( () => {
        if (codeObjIdx < (quests[questIdx].length - 1)) setCodeObjIdx(prev => (prev + 1))
        else {
            setCodeObjIdx(0)
            nextQuest()
        }
     } , [codeObjIdx, setCodeObjIdx, nextQuest])
     

    return(
        <>
        <Trace pSetIsModalActive={setIsModalActive} pIsModalActive={isModalActive} pCodeObjIdx={codeObjIdx} pQuestIdx={questIdx}/>
        <Notification text={texts[textIdx]} img={exampleSrc} texts={texts} setTextIdx={setTextIdx}/>
        {isModalActive && <CodeModal codeObj={quests[questIdx][codeObjIdx]} nextCodeObj={nextCodeObj}/>}
        </>
    )
})
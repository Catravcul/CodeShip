import { memo, useState, useCallback, useEffect } from 'react'

import { quest as textQuest } from './text'
import { quest as numberQuest } from './number'
import { CodeModal } from '../codeModal'

import Trace from "./trace";


const quests = [ numberQuest, textQuest ]

export const Variables = memo(({ levelUp, scene, setQuest, toggleIsCodePos }) => {

    const [isModalActive, setIsModalActive] = useState(false)
    const toggleIsModalActive = () => {toggleIsCodePos(); setIsModalActive(old => !old)}
    
    const [questIdx, setQuestIdx] = useState(0)
    const [codeObjIdx, setCodeObjIdx] = useState(0)

    const nextQuest = useCallback( () => {
        if (questIdx < (quests.length - 1)) setQuestIdx( prev => (prev + 1)) 
        else alert('there aren\'t more quests yet :\'c')
    }, [questIdx, setQuestIdx])

    const nextCodeObj = useCallback( () => {
        if (codeObjIdx < (quests[questIdx].length - 1)) setCodeObjIdx(prev => (prev + 1))
        else {
            setCodeObjIdx(0)
            nextQuest()
        }
     } , [codeObjIdx, setCodeObjIdx, nextQuest])

    useEffect(() => {
        setQuest(quests[questIdx])
    }, [questIdx])
     

    return(
        <>
        <Trace pToggleIsCodePos={toggleIsModalActive} pIsModalActive={isModalActive} pCodeObjIdx={codeObjIdx} pQuestIdx={questIdx}/>
        <CodeModal codeObj={quests[questIdx].codeObjs[codeObjIdx]} nextCodeObj={nextCodeObj}/>
        </>
    )
})
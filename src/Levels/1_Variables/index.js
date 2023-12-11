import { memo, useState, useCallback, useEffect, useContext } from 'react'

import { LevelsContext } from '../context';

import { quest as textQuest } from './text'
import { quest as numberQuest } from './number'
import { quest as booleanQuest } from './boolean'
import { CodeModal } from '../codeModal'

import Trace from "./trace";


const quests = [ numberQuest, textQuest, booleanQuest ]

export const Variables = memo(({ levelUp, scene, setQuest }) => {
    const { isCodePos, toggleIsCodePos, toggleShowQuest, showQuest } = useContext(LevelsContext)
    
    const [questIdx, setQuestIdx] = useState(0)
    const [codeObjIdx, setCodeObjIdx] = useState(0)

    const nextQuest = useCallback( () => {
        if (questIdx < (quests.length - 1)) {
            setQuestIdx( prev => (prev + 1))
            if (!showQuest) toggleShowQuest()
        }
        else alert('there aren\'t more quests yet :\'c')
    }, [questIdx, setQuestIdx])

    const nextCodeObj = useCallback( () => {
        if (codeObjIdx < (quests[questIdx].codeObjs.length - 1)) setCodeObjIdx(prev => (prev + 1))
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
        <Trace pToggleIsCodePos={toggleIsCodePos} pIsModalActive={isCodePos} pCodeObjIdx={codeObjIdx} pQuestIdx={questIdx}/>
        <CodeModal codeObj={quests[questIdx].codeObjs[codeObjIdx]} nextCodeObj={nextCodeObj}/>
        </>
    )
})
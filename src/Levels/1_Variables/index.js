import { memo, useState, useCallback } from 'react'
import * as typeQuest from './type'
import * as numberQuest from './number'
import {CodeModal} from '../codeModal'
import exampleSrc from './type.jpg'


const quests = [typeQuest, numberQuest]

export const Variables = memo(({Notification, levelUp, scene}) => {
    const [actualQuestIdx, setActualQuestIdx] = useState(0)
    const [codeObjIdx, setCodeObjIdx] = useState(0)

    const [showingIntroIdx, setShowingIntroIdx] = useState(0)
    
    const getQuestsLi = useCallback(() => 
        quests.map( ({intro}, idx) =>
            <li id={intro.title + idx + 'questIntro'} key={intro.title + idx + 'questIntro'}>
                <button className={`px-20-px py-3-px ${(intro.english.title === quests[showingIntroIdx].intro.english.title ? 'selected' : '')}`} onClick={() => setShowingIntroIdx(idx)}>
                    {intro.english.title}
                </button>
            </li>
        )
    ,[showingIntroIdx])


    const nextQuest = useCallback( () => {
        if (actualQuestIdx < (quests.length - 1)) setActualQuestIdx( prev => (prev + 1)) 
        else alert('there isn\'t more quests yet')
    }, [actualQuestIdx, setActualQuestIdx])

    const nextCodeObj = useCallback( () => {
        if (codeObjIdx < (quests[actualQuestIdx].codeObjs.length - 1)) setCodeObjIdx(prev => (prev + 1))
        else {
            setCodeObjIdx(0)
            nextQuest()
        }
     } , [codeObjIdx, setCodeObjIdx, nextQuest])

    return(
        <>
        <Notification quest={quests[showingIntroIdx].intro} getQuestsLi={getQuestsLi} img={exampleSrc}/>
        <CodeModal codeObject={quests[actualQuestIdx].codeObjs[codeObjIdx]} nextScene={nextCodeObj}/>
        </>
    )
})
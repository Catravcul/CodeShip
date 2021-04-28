import {memo, useMemo, useCallback, useRef, useState, useEffect, useLayoutEffect} from 'react'
import {GltfLoader} from '../../utils/GltfLoader'
import * as type from './type'
import * as number from './number'
import {CodeModal} from '../codeModal'

export const Variables = memo(({Notification, levelUp, scene}) => {
    const quests = useRef({type, number})
    const [quest, setQuest] = useState('type')
    const questsName = useRef(['type', 'number'])
    const changeQuest = useCallback(levelName => {setQuest(() => levelName)}, [])

    const [indexScene, setIndexScene] = useState(-1)
    const codeObjects = useRef([])
    const threeScenes = useRef([])
    const codeObject = useMemo(() => codeObjects.current[indexScene], [indexScene])

    const actualQuest = quests.current[quest]
    const oldScene = threeScenes.current[indexScene]
    useEffect(() => {
        scene.remove(oldScene)
        codeObjects.current.length = 0
        threeScenes.current.length = 0
        setIndexScene(() => -1)
        actualQuest.codeObjects.map(codeObj => {
            GltfLoader.loadInArray(codeObj.modelFile, threeScenes.current, () => codeObjects.current.push(codeObj))
        })
        const startSublevel = () => setTimeout(() => {
            if (codeObjects.current.length > 0 && scene) {
                setIndexScene(() => {
                    scene.add(threeScenes.current[0])
                    threeScenes.current[0].translateZ(50)
                    threeScenes.current[0].translateX(50)
                    return 0
                })
            } else {
                startSublevel()
            }
        }, 5000)
        startSublevel()
        return scene.remove(oldScene)
    }, [quest])
    
    const getQuestsLi = useCallback(() => 
        questsName.current.map( questName =>
            <li id={questName}>
                <button className={`px-20-px py-3-px ${(questName === quest ? 'selected' : '')}`} onClick={() => changeQuest(questName)}>
                    {questName}
                </button>
            </li>
        )
    ,[quest])
    return(
        <>
        <Notification quest={actualQuest.quest} questSelected={quest} getQuestsLi={getQuestsLi}/>
        <CodeModal codeObject={codeObject}/>
        </>
    )
})
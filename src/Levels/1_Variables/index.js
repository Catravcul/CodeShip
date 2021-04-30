import {memo, useMemo, useCallback, useRef, useState, useReducer, useEffect} from 'react'
import {GltfLoader} from '../../utils/GltfLoader'
import * as type from './type'
import * as number from './number'
import {CodeModal} from '../codeModal'

const quests = {type, number}
const questsName = ['type', 'number']
const initialQuest = {
    name: 'type', sceneIndex: -1, nombre:'name'
}
const changeQuest = (state, action) => {
    switch (action.type) {
        case 'changeName': return {...state, name: action.name}
        case 'changeSceneIndex': return {...state, sceneIndex: action.index}
        default : return state
    }
}

export const Variables = memo(({Notification, levelUp, scene}) => {
    const [questState, dispatchQuest] = useReducer(changeQuest, initialQuest)
    const codeObjects = useRef([])
    const threeScenes = useRef([])
    const codeObject = useMemo(() => codeObjects.current[questState.sceneIndex], [questState.sceneIndex])

    const changeScene = (index = questState.sceneIndex + 1) => {
        scene.remove(threeScenes.current[index - 1])
        scene.add(threeScenes.current[index])
        threeScenes.current[index].translateZ(100)
        threeScenes.current[index].translateX(100)
        dispatchQuest({type: 'changeSceneIndex', index})
    }
    
    const actualQuest = quests[questState.name]
    useEffect(() => {
        scene.remove(threeScenes.current[questState.sceneIndex])
        codeObjects.current.length = 0
        threeScenes.current.length = 0
        dispatchQuest({type: 'changeSceneIndex', index: -1})
        actualQuest.codeObjects.map(codeObj => {
            GltfLoader.loadInArray(codeObj.modelFile, threeScenes.current, () => codeObjects.current.push(codeObj))
        })
        const startSublevel = () => setTimeout(() => {
            if (codeObjects.current.length > 0 && scene) {
                dispatchQuest({type: 'changeSceneIndex', index: 0})
                scene.add(threeScenes.current[0])
                threeScenes.current[0].translateZ(50)
                threeScenes.current[0].translateX(50)
            } else {
                startSublevel()
            }
        }, 5000)
        startSublevel()
        scene.remove(threeScenes.current[questState.sceneIndex])
    }, [questState.name])
    useEffect(() => console.log(questState.sceneIndex), [questState.sceneIndex])
    const getQuestsLi = useCallback(() => 
        questsName.map( questName =>
            <li id={questName}>
                <button className={`px-20-px py-3-px ${(questName === questState.name ? 'selected' : '')}`} onClick={() => dispatchQuest({
                    type: 'changeName', name: questName
                })}>
                    {questName}
                </button>
            </li>
        )
    ,[questState.name])
    return(
        <>
        <Notification quest={actualQuest.quest} questSelected={questState.name} getQuestsLi={getQuestsLi}/>
        <CodeModal codeObject={codeObject} nextScene={() => changeScene()}/>
        </>
    )
})
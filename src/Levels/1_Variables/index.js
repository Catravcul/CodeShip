import * as THREE from "three";
import { memo, useState, useCallback, useEffect, useRef } from 'react'
import { codeObjs as typeQuests, text as typeText } from './type'
import { codeObjs as numberQuests, text as numberText } from './number'
import { CodeModal } from '../codeModal'
import exampleSrc from './type.jpg'
import GameLoop from "../../Game/loop";
import { Config } from "../../Game/Config";


const quests = [typeQuests, numberQuests]
const texts = [typeText, numberText]

export const Variables = memo(({ Notification, levelUp, scene }) => {
    const [isModalActive, setIsModalActive] = useState(false)
    const isModalActiveRef = useRef(false)
    
    const [questIdx, setQuestIdx] = useState(0)
    const [codeObjIdx, setCodeObjIdx] = useState(0)
    const questPos = useRef(new THREE.Vector3())

    const [textIdx, setTextIdx] = useState(0)
    const lineRef = useRef(new THREE.Line())

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
     


    /**
     * returns a random position with each value between 100 and 200 which could be positive or negative with the pShipWorldPosition as origin
     * @param {THREE.Vector3} pShipWorldPos
     * @returns {THREE.Vector3}
     */
    const getNewQuestPos = useCallback(( {x: pX, y: pY, z: pZ} = Config.ship.getWorldPosition(new THREE.Vector3()) ) => {
        const getRandomNum = () => {
            const num = (Math.random() * 100) + 100
            const multiplier = Math.random() > 0.5 ? 1 : -1
            return (num * multiplier)
        }
        const x = getRandomNum(), y = getRandomNum(), z = getRandomNum()
        const pos = new THREE.Vector3((x + pX) ,(y + pY) , (z + pZ))
        return pos
    }, [])
    useEffect(() => {
        const material = new THREE.LineBasicMaterial( { color: 0x0000ff } );

        const shipWorldPos = Config.ship.getWorldPosition(new THREE.Vector3())
        questPos.current = getNewQuestPos()

        const geometry = new THREE.BufferGeometry().setFromPoints( [shipWorldPos, questPos.current] );

        const line = new THREE.Line( geometry, material );
        
        scene.add( line );
        lineRef.current = line

        const actionId = GameLoop.addAction(() => {
            const shipWorldPos = Config.ship.getWorldPosition(new THREE.Vector3())
            line.geometry.setFromPoints( [(shipWorldPos), questPos.current] )
            line.geometry.computeBoundingSphere()
            if (shipWorldPos.distanceTo(questPos.current) < 30 ) {
                if (!isModalActiveRef.current) setIsModalActive(true)
            } else {
                if (isModalActiveRef.current) setIsModalActive(false)
            }
        })

        return () => GameLoop.removeAction(actionId)
    }, [])

    useEffect(() => {isModalActiveRef.current = isModalActive}, [isModalActive])

    useEffect(() => {
        const colors = ['blue', 'red', 'yellow', 'purple', 'red', 'violet', 'orange']
        const idx = Math.ceil(Math.random() * colors.length)
        lineRef.current.material.setValues({color: colors[idx]})
        questPos.current = getNewQuestPos()
    }, [codeObjIdx, questIdx])
    return(
        <>
        <Notification text={texts[textIdx]} img={exampleSrc} texts={texts} setTextIdx={setTextIdx}/>
        {isModalActive && <CodeModal codeObj={quests[questIdx][codeObjIdx]} nextCodeObj={nextCodeObj}/>}
        </>
    )
})
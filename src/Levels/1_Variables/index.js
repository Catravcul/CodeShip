import {memo, useMemo, useCallback, useRef, useState, useEffect, useLayoutEffect} from 'react'
import {GltfLoader} from '../../utils/GltfLoader'
import * as type from './type'
import * as number from './number'
import { CodeModal } from '../codeModal'

export const Variables = memo(({Notification, levelUp, scene}) => {
    const subLevels = useRef({type, number})
    const [subLevel, setSubLevel] = useState('type')
    const levelsName = useRef(['type', 'number'])
    const changeLevel = useCallback(levelName => {setSubLevel(() => levelName)}, [])

    const [indexScene, setIndexScene] = useState(-1)
    const codeObjects = useRef([])
    const threeScenes = useRef([])
    const codeObject = useMemo(() => codeObjects.current[indexScene], [indexScene])
    
    const actualSublevel = subLevels.current[subLevel]
    useEffect(() => {
        actualSublevel.codeObjects.map(codeObj => {
            GltfLoader.loadInArray(codeObj.modelFile, threeScenes.current, () => codeObjects.current.push(codeObj))
        })
        const startSublevel = () => setTimeout(() => {
            if (codeObjects.current.length > 0) {
                setIndexScene(() => {
                    scene.add(threeScenes.current[0])
                    threeScenes.current[0].translateZ(50)
                    threeScenes.current[0].translateX(50)
                    return 0
                })
            } else {
                startSublevel()
            }
        }, 10000)
        startSublevel()
    }, [])
    useLayoutEffect(() => {
        scene.add(threeScenes.current[indexScene])
    }, [indexScene])
    
    return(
        <>
        <Notification quest={actualSublevel.quest} levelsName={levelsName} changeLevel={changeLevel} levelSelected={subLevel}/>
        <CodeModal codeObject={codeObject}/>
        </>
    )
})
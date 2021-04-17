import {memo, useCallback, useRef, useState} from 'react'
import * as type from './type'
import * as number from './number'

export const Variables = memo(({Notification, levelUp}) => {
    const subLevels = useRef({type, number})
    const [subLevel, setSubLevel] = useState('type')
    const levelsName = useRef(['type', 'number'])
    const changeLevel = useCallback(levelName => {setSubLevel(() => levelName)}, [])
    return(
        <Notification quest={subLevels.current[subLevel].quest} levelsName={levelsName} changeLevel={changeLevel} levelSelected={subLevel}/>
    )
})
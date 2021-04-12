import {useState, useCallback} from 'react'
import {Notification} from './notification'

import {Variables} from './1_Variables'

export const Levels = () => {
    const [levels, setLevels] = useState([Variables])
    const [level, setLevel] = useState(0)
    const levelUp = useCallback(() => setLevel(prevState => prevState < (levels.length-1) ? prevState + 1 : prevState))
    const Level = levels[level]

    return(
        <div className='absolute'>
            <Level Notification={Notification} levelUp={levelUp}/>
        </div>
    )

}
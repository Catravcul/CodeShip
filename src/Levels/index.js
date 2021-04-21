import {useState, useCallback} from 'react'
import {Notification} from './notification'
import {CodeModal} from './codeModal'

import {Variables} from './1_Variables'

export const Levels = ({setlevelUpdates, scene}) => {
    const [levels, setLevels] = useState([Variables])
    const [level, setLevel] = useState(0)
    const levelUp = useCallback(() => setLevel(prevState => prevState < (levels.length-1) ? prevState + 1 : prevState))
    const Level = levels[level]

    return(
        <div className='absolute'>
            <Level Notification={Notification} CodeModal={CodeModal} levelUp={levelUp} setlevelUpdates={setlevelUpdates} scene={scene}/>
        </div>
    )

}
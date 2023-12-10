import {useState, useCallback} from 'react'
import {Notification} from './notification'
import {CodeModal} from './codeModal'

import {Variables} from './1_Variables'
import { LevelsContext, initialValue } from './context'
import Plan from './plan'

export const Levels = ({setlevelUpdates, scene, showQuest, toggleShowQuest, showCode, toggleShowCode, toggleIsCodePos}) => {
    
    const [levels, setLevels] = useState([Variables])
    const [level, setLevel] = useState(0)
    const levelUp = useCallback(() => setLevel(prevState => prevState < (levels.length-1) ? prevState + 1 : prevState))
    const Level = levels[level]

    const [questView, setQuestView] = useState(Notification)
    const [quest, setQuest] = useState(initialValue.quest)
    
    const propsLevel = {CodeModal, levelUp, setlevelUpdates, scene, setQuest, toggleIsCodePos}
    return(
        <LevelsContext.Provider value={{questView, quest, showCode, toggleShowCode}}>
            <div className='absolute top'>
                <Level {...propsLevel}/>
                <Plan showModal={showQuest} handleClose={toggleShowQuest} />
            </div>
        </LevelsContext.Provider>
    )

}
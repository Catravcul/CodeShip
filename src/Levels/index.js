import {useState, useCallback, useContext} from 'react'
import {Notification} from './notification'
import {CodeModal} from './codeModal'

import {Variables} from './1_Variables'
import { LevelsContext, initialValue } from './context'
import Plan from './plan'

import { GameModals } from '../context'

export const Levels = ({setlevelUpdates, scene}) => {
    const appContext = useContext(GameModals)
    
    const [levels, setLevels] = useState([Variables])
    const [level, setLevel] = useState(0)
    const levelUp = useCallback(() => setLevel(prevState => prevState < (levels.length-1) ? prevState + 1 : prevState))
    const Level = levels[level]

    const [questView, setQuestView] = useState(Notification)
    const [quest, setQuest] = useState(initialValue.quest)
    
    const propsLevel = {CodeModal, levelUp, setlevelUpdates, scene, setQuest}
    return(
        <LevelsContext.Provider value={{questView, quest, ...appContext}}>
            <div className='absolute top'>
                <Level {...propsLevel}/>
                <Plan />
            </div>
        </LevelsContext.Provider>
    )

}
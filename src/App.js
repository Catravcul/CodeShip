import { useCallback, useState } from 'react';

import { GameModals as Context } from './context';
import Game from './Game'
import { UserInterface } from './UserInterface/UserInterface'

import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';

import './App.css';

function App() {

  const [showQuest, setShowQuest] = useState(false)
  const toggleShowQuest = useCallback(() => setShowQuest(old => !old))

  const [showCode, setShowCode] = useState(false)
  const toggleShowCode = useCallback(() => setShowCode(old => !old))
  const [isCodePos, setIsCodePos] = useState(false)
  const toggleIsCodePos = useCallback(() => setIsCodePos(old => !old))
  
  return (
    <Context.Provider value={{showQuest, toggleShowQuest, showCode, toggleShowCode, isCodePos, toggleIsCodePos}}>
      <div className="App">
        <Game/>
        <UserInterface toggleShowQuest={toggleShowQuest} toggleShowCode={toggleShowCode} isCodePos={isCodePos}/>
      </div>
    </Context.Provider>
  );
}

export default App;

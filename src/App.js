import { useCallback, useState } from 'react';
import './App.css';
import Game from './Game'
import { UserInterface } from './UserInterface/UserInterface'

import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';

function App() {

  const [showQuest, setShowQuest] = useState(false)
  const toggleShowQuest = useCallback(() => setShowQuest(old => !old))

  const [showCode, setShowCode] = useState(false)
  const toggleShowCode = useCallback(() => setShowCode(old => !old))
  const [isCodePos, setIsCodePos] = useState(false)
  const toggleIsCodePos = useCallback(() => setIsCodePos(old => !old))
  
  return (
    <div className="App">
      <Game showQuest={showQuest} toggleShowQuest={toggleShowQuest} showCode={showCode} toggleShowCode={toggleShowCode} toggleIsCodePos={toggleIsCodePos}/>
      <UserInterface toggleShowQuest={toggleShowQuest} toggleShowCode={toggleShowCode} isCodePos={isCodePos}/>
    </div>
  );
}

export default App;

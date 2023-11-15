import './App.css';
import Game from './Game'
import { UserInterface } from './UserInterface/UserInterface'

import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';

function App() {
  return (
    <div className="App">
      <Game />
      <UserInterface />
    </div>
  );
}

export default App;

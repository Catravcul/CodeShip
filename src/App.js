import './App.css';
import { Game } from './Game'
import { Camera } from './Camera/Camera'
import { UserInterface } from './UserInterface/UserInterface'

function App() {
  return (
    <div className="App">
      <Game />
      <Camera.render />
      <UserInterface />
    </div>
  );
}

export default App;

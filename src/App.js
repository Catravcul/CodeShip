import './resources/css/App.css';
import { Game } from './Game'
import { UserInterface } from './UserInterface'
function App() {
  return (
    <div className="App">
      <Game/>
      <UserInterface/>
    </div>
  );
}

export default App;

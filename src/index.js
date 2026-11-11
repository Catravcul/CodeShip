import React from "react";
import ReactDOM from "react-dom";
import "./index.css";
import App from "./App";
import reportWebVitals from "./reportWebVitals";

import { VaultProvider } from "./context/context";
import LocalStorageRepository from "./infrastructure/local-storage.repository";
import VaultEntity from "./domain/vault.entity";
import VaultService from "./application/vault.service";
import CharacterEntity from "./domain/character.entity";
import CharacterService from "./application/character.service";
import SpaceshipEntity from "./domain/spaceship.entity";
import SpaceshipService from "./application/spaceship.service";

const localStorageRepository = new LocalStorageRepository();

const vaultEntity = new VaultEntity();
const vaultService = new VaultService(vaultEntity, localStorageRepository);

const characterEntity = new CharacterEntity();
const characterService = new CharacterService(characterEntity, localStorageRepository);

const spaceshipEntity = new SpaceshipEntity();
const spaceshipService = new SpaceshipService(spaceshipEntity, localStorageRepository);

ReactDOM.render(
	<React.StrictMode>
		<VaultProvider value={{ vaultEntity, vaultService, characterEntity, characterService }}>
			<App />
		</VaultProvider>
	</React.StrictMode>,
	document.getElementById("root"),
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals(console.log);

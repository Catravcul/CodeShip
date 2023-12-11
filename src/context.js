import { createContext } from "react";

const initialValues = {
    showQuest: false,
    toggleShowQuest () {},
    showCode: false,
    toggleShowCode () {},
    isCodePos: false,
    toggleIsCodePos () {}
}
export const GameModals = createContext(initialValues)
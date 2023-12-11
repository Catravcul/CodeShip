import {getBlueCode, getOrangeredCode, getWhiteboneCode, getLightblueCode, getCyanCode} from '../codeSpans'


export const quest = {
    codeObjs: [
        {
            code: [
                getBlueCode('let'), getLightblueCode('globalCode'), '=', getOrangeredCode("'3396815'")
            ]
        }, {
            code: [
                getBlueCode('let'), getLightblueCode('waveCode'), '=', getOrangeredCode("'8819618'")
            ]
        }, {
            code: [
                getBlueCode('let'), getLightblueCode('pulseCode'), '=', getOrangeredCode("'441319'")
            ]
        }
    ],
    title: 'Configure nano_net',
    name: 'Nevaeh',
    img: '/img/nevaeh/face_100px.webp',
    lines: [
        'Dear Doménica,',
        `The values you entered into the nano_net aren't working as we expected, probably we are missing codes, to solve this you would
        have to enter text values to the nano_net, it is like what you did with the numbers.`,
        `The only difference between entering numbers and entering text is that the text must have an especific simbol at the beggining 
        and end, here you can use the double quote ("), single quote (') and back quote(\`), e.g.`,
        <code>{getBlueCode('let')} {getLightblueCode('name')} = {getOrangeredCode('"Nevaeh"')}</code>,
        `P.S. We are sorry that you had experience a bad communication service, our experts are now investigating the source of it.`,
        `P.S. I'm so happy that you have such a caring loved ones!`
    ]
}
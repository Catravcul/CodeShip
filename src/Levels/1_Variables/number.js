import {getBlueCode, getWhiteboneCode, getLightblueCode, getCyanCode} from '../codeSpans'


export const quest = {
    codeObjs: [
        {
            code: [
                getBlueCode('let'), getLightblueCode('pulsesPerHour'), '=', getWhiteboneCode('20')
            ]
        }, {
            code: [
                getBlueCode('let'), getLightblueCode('wavesLayers'), '=', getWhiteboneCode('10')
            ]
        }, {
            code: [
                getBlueCode('let'), getLightblueCode('metersPerUnit'), '=', getWhiteboneCode('10000')
            ]
        }, {
            code: [
                getBlueCode('let'), getLightblueCode('spinsPerHour'), '=', getWhiteboneCode('60')
            ]
        }, {
            code: [
                getBlueCode('let'), getLightblueCode('ciclesPerDay'), '=', getWhiteboneCode('2')
            ]
        }
    ],
    title: 'Configure nano_net',
    name: 'Nevaeh',
    img: '/img/nevaeh/face_100px.webp',
    lines: [
        'Dear Doménica,',
        `I'm glad to know you managed to reach the right place, please do not lose contact with your loved ones, some of them are
        texting us worried about you.`,
        `Now is the perfect time to set some number values in our nano_net,
        as we told you, the nano_net is difficult to see, but don't worry, the spaceship will guide you drawing a colored line to your next
        destination, once there, the 'code' button is going to show to you next to the 'quest' button, click it to solve our issue.`,
        'The order of the commands are first a "let" then a name then an "=" and finally a number. e.g.',
        <code>{getBlueCode('let')} {getLightblueCode('yearDays')} = {getWhiteboneCode('365')}</code>,
        `I hope you are having an awesome time!`
    ]
}
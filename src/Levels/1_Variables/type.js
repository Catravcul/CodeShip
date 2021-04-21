import {getBlueCode, getOrangeredCode, getWhiteboneCode, getLightblueCode, getCyanCode} from '../codeSpans'
import example from './type.jpg'

export const codeObjects = [
    {
        modelFile: '3d/structures/ApartmentBuilding.glb',
        code: [
            getBlueCode('const'), getLightblueCode('mySchool'), '=', getLightblueCode('School_1')
        ]
    }
]

export const quest = {
    img: example,
    english: {
        title: 'Variable types',
        phrase: 'Some values seems to never change, others can change in any context while others in specific context',
        intro: 'We would store some values pending on their posibility to change in future',
        steps: [
            'Approach the spaceship to a structure until appears code button (<>), then click it!',
            'Drag and drop the code elements in correct order to create a javascript variable.'
        ],
        code: [
            <>{getBlueCode('const')}&nbsp;{getLightblueCode('goodWithOthers')}&nbsp;=&nbsp;{getBlueCode('true')}</>,
            <>{getBlueCode('let')}&nbsp;{getCyanCode('hungry')}&nbsp;=&nbsp;{getOrangeredCode('"100%"')}</>,
            <>{getBlueCode('var')}&nbsp;{getCyanCode('names')}&nbsp;=&nbsp;{getWhiteboneCode('4')}</>
        ],
        congratulate: 'Well done! it is time to pass to numbers.'
    },
    spanish: {
        title: 'Tipos de variables',
        phrase: 'Algunos valores parece que nunca cambian, otros pueden hacerlo en cualquier contexto, mientras otros en un contexto específico',
        intro: 'Vamos a guardar algunos valores dependiendo de su posibilidad de cambiar en un futuro',
        steps: [
            'Acerca la nave espacial a una edificación hasta que aparezca el botón de código (<>), luego ¡dale un clic!.',
            'Arrastra los elementos de código en el orden correcto para crear una variable de javascript.'
        ],
        code: [
            <>{getBlueCode('const')}&nbsp;{getLightblueCode('buenoConOtros')}&nbsp;=&nbsp;{getBlueCode('true')}</>,
            <>{getBlueCode('let')}&nbsp;{getCyanCode('hambriento')}&nbsp;=&nbsp;{getOrangeredCode('"100%"')}</>,
            <>{getBlueCode('var')}&nbsp;{getCyanCode('nombres')}&nbsp;=&nbsp;{getWhiteboneCode('4')}</>
        ],
        congratulate: '¡Bien hecho! es hora de pasar a los números.'
    }
}
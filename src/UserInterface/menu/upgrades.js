
const selfQualities = [
    {
        title: 'Caregiver',
        description: `Beneath the desire to care for the ever-changing environment, through the 
        multiple attempts to find the best solutions for the diversity of beings, thoughts and 
        things; you may find the power to heal.`
    },
    {
        title: 'Intellectual',
        description: `The scope of continuous and deep study, with the breadth of an open mind 
        and unleashed creativity gives an interesting shape to your goals, which may seem to 
        change, and then contain everything.`
    },
    {
        title: 'Athlete',
        description: `Through hard training, accompanied by rest, relax, goals and nutrition, 
        will awake the power of your biology, which means changes in your potential, strong pillars 
        to mark the path towards your most distant goals.`
    },
    {
        title: 'Introspective',
        description: `Contemplating your actions/compostures, as if you were outside your body, 
        observing every gesture/movement, listening to every sound/word, feel as if you were 
        directing to yourself; to gain control over your cycles.`
    }
]

const shipQualities = [
    {
        title: 'Ecological',
        description: `Perfecting the mechanisms to reduce the waste as much as possible, to reuse 
        energy and material in the creation of components useful for other purposes aligned with the 
        ecosystem and add complexity to the processes for a smaller consumption.`
    },
    {
        title: 'Powerful',
        description: `New internal features for better capabilities in long term, more potential 
        to deal with dangerous stellar objects, higher survival rate against natural satellites, 
        required for materialization of advanced upgrades.`
    },
]

const self = {
    title: 'Personal Growth',
    description: `In outer space isolation as in other physically and mentally demanding situations, 
    it is important to improve oneself as much as possible in order to continue carrying out the 
    required tasks, as well as maintain happiness, relationships, dreams, etc.`,
    img: {
        src: '/img/self_update.webp',
        alt: 'stellar jump',
        source: <>Image by <a href="https://pixabay.com/users/tombud-1908037/?utm_source=link-attribution&utm_medium=referral&utm_campaign=image&utm_content=2793428">Thomas Budach</a> from <a href="https://pixabay.com//?utm_source=link-attribution&utm_medium=referral&utm_campaign=image&utm_content=2793428">Pixabay</a></>
    },
    qualities: selfQualities
}

const ship = {
    title: 'Ship Upgrades',
    description: `The ship has built-in AI, which is expected to continue improving its own capabilities 
    by carrying out missions and manipulating stellar objects, the ship will need materials to bring 
    tangible results which you may get dealing with the stellar objects.`,
    img: {
        src: '/img/ship_update.webp',
        alt: 'space ship',
        source: <>Image by <a href="https://pixabay.com/users/geralt-9301/?utm_source=link-attribution&utm_medium=referral&utm_campaign=image&utm_content=2129001">Gerd Altmann</a> from <a href="https://pixabay.com//?utm_source=link-attribution&utm_medium=referral&utm_campaign=image&utm_content=2129001">Pixabay</a></>
    },
    qualities: shipQualities
}

const upgrades = [ ship, self ]

export default upgrades

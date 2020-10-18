const LEVEL_1 = {
    start: [0, 0],
    board: [
        "x  xxx",
        "xx   x",
        " xxx x",
        "  x  x",
        "xxxxxx",
    ],
    items: ['1f31e', '1f603', '2764', '1f3a9', '1f408'],//'😃', '❤️', '🎩', '🐈'],
    coords: [
        [3, 2],
        [3, 0],
        [1, 1],
        [0, 4],
        [5, 4]
    ],
    barriers: []
}

const LEVEL_2 = {
    start: [0, 0],
    board: [
        'x-z',
        '  | cx',
        ' c+-q',
        ' eq'
    ],
    items: ['?', '+'],
    coords: [
        [1, 3],
        [5, 1],
    ],
    barriers: []
}

const PLAYGROUND = {
    start: [4, 4],
    board: [
        'c-------z',
        '|xxxxxxx|',
        '|xxxxxxx|',
        '|xxxxxxx|',
        '|xxxxxxx|',
        '|xxxxxxx|',
        '|xxxxxxx|',
        '|xxxxxxx|',
        'e-------q',
    ],
    items: ['1f680', '1f987', '1f41b', '26c4'],
    coords: [[2,2], [6,2], [2, 6], [6,6]],
    barriers: []
}

const HIGHWAY = {
    start: [0, 0],
    board: [
        'x>>>>>>>>>xxxxxxxxxxx',
    ],
    items: ['1f31f'],
    coords: [[20,0]],
    barriers: [],
}

const MAZE = {
    start: [1, 0],
    board: [
        ' x  ',
        'xxxx',
        'xxxx',
        'xxxx',
        'xxxx',
        '  x ',
    ],
    items: ['1f31f'],
    coords: [[2, 5]],
    barriers: [
        ['h', 0, 1],
        ['h', 2, 1],
        ['h', 3, 1],
        ['h', 1, 2],
        ['h', 2, 2],
        ['h', 3, 3],
        ['h', 0, 4],
        ['h', 2, 4],
        ['h', 0, 5],
        ['h', 1, 5],
        ['h', 3, 5],

        ['v', 0, 1],
        ['v', 0, 2],
        ['v', 0, 3],
        ['v', 0, 4],
        ['v', 1, 2],
        ['v', 2, 3],
        ['v', 2, 4],
        ['v', 3, 2],
        ['v', 4, 1],
        ['v', 4, 2],
        ['v', 4, 3],
        ['v', 4, 4],
        // ['v', 0, 0],
        // ['v', 0, 1],
        // ['v', 1, 0],
        // ['v', 2, 0],
        // ['v', 2, 1],
        // ['h', 0, 0],
        // ['h', 0, 2],
        // ['h', 1, 0],
        // ['h', 1, 2],
    ]
}

const FACTORY = {
    start: [0, 0],
    board: [
        'v<<',
        'v ^',
        '>>^',
    ],
    items: [],
    coords: [],
    barriers: [
        ['v', 0, 0],
        ['v', 0, 1],
        ['v', 0, 2],
        ['v', 3, 0],
        ['v', 3, 1],
        ['v', 3, 2],
        ['v', 1, 1],
        ['v', 2, 1],
        ['h', 0, 0],
        ['h', 1, 0],
        ['h', 2, 0],
        ['h', 0, 3],
        ['h', 1, 3],
        ['h', 2, 3],
        ['h', 1, 1],
        ['h', 1, 2],
    ]

}

const CORNERS = {
    start: [2, 2],
    board: [
        ' xx ',
        'xxxx',
        'xxxx',
        ' xx ',
    ],
    items: [],
    coords: [],
    barriers: [
        ['v', 2, 0],
        ['v', 2, 3],

        ['h', 0, 2],
        ['h', 3, 2],

        ['v', 1, 0],
        ['h', 0, 1],

        ['v', 3, 0],
        ['h', 3, 1],

        ['v', 1, 3],
        ['h', 0, 3],

        ['v', 3, 3],
        ['h', 3, 3],

        ['h', 1, 0],
        ['h', 2, 0],
        ['h', 1, 4],
        ['h', 2, 4],

        ['v', 0, 1],
        ['v', 0, 2],
        ['v', 4, 1],
        ['v', 4, 2],
    ]
}

const LEVELS = {
    'easy': LEVEL_1,
    'hard': LEVEL_2,
    'playground': PLAYGROUND,
    'highway': HIGHWAY,
    'maze': MAZE,
    'factory': FACTORY,
    'corners': CORNERS
}

export { LEVELS };
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
    ]
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
    ]
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
}
const LEVELS = {
    'easy': LEVEL_1,
    'hard': LEVEL_2,
    'playground': PLAYGROUND
}

export { LEVELS };
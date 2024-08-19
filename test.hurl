# Test 1
# Please note, that we will use a different set of values when validating your submission
POST http://localhost:3000/api/start
{
    "message": "The game has started, start guessing the word",
    "gameId": "c18409cb-adac-42cb-9b9c-29942e76bdec",
    "grid": [
        [
            "",
            "",
            "",
            "",
            ""
        ],
        [
            "",
            "",
            "",
            "",
            ""
        ],
        [
            "",
            "",
            "",
            "",
            ""
        ],
        [
            "",
            "",
            "",
            "",
            ""
        ],
        [
            "",
            "",
            "",
            "",
            ""
        ],
        [
            "",
            "",
            "",
            "",
            ""
        ]
    ],
    "currentRow": 0,
    "solved": false
}
HTTP 200

# Test 2
# Please note, that we will use a different set of values when validating your submission
GET http://127.0.0.1:3000/api/guess?gameId=c18409cb-adac-42cb-9b9c-29942e76bdec&guess=again
{
    "message": "Congratulations!",
    "gameId": "d72f23a3-05e1-4b5e-998f-176fb194f711",
    "grid": [
        [
            "a",
            "g",
            "a",
            "i",
            "n"
        ],
        [
            "",
            "",
            "",
            "",
            ""
        ],
        [
            "",
            "",
            "",
            "",
            ""
        ],
        [
            "",
            "",
            "",
            "",
            ""
        ],
        [
            "",
            "",
            "",
            "",
            ""
        ],
        [
            "",
            "",
            "",
            "",
            ""
        ]
    ],
    "currentRow": 0,
    "solved": true,
    "correctLetters": [
        "a",
        "g",
        "a",
        "i",
        "n"
    ]
}
HTTP 200
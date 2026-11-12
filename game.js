// ==================================================================
//  THE FORGOTTEN PRISON
//  Everything is measured in pixels. The screen is 8 tiles wide and
//  6 tiles tall, and each tile is 64 pixels.
// ==================================================================

// ---------- 1. BASIC SETUP ----------
var TILE = 64;                    // size of one square tile
var COLS = 8;                     // number of tiles across
var ROWS = 6;                     // number of tiles down

// Find the canvas on the page and get the tool we use to draw on it
var canvas = document.getElementById("game");
var ctx = canvas.getContext("2d");
canvas.width = COLS * TILE;
canvas.height = ROWS * TILE;

// ---------- 2. THE LEVEL MAPS ----------
// Each letter is one tile:
//   #  wall          .  floor        S  start position
//   C  coin          K  key          G  guard
//   T  trap          B  boss         D or E  locked door (the exit)
var levels = [
    {
        name: "The Prison Cells",
        wallColor: "#6e655b",
        floorColor: "#3b3631",
        map: [
            "S.###..C",
            "#.#...#.",
            "#...#.#.",
            "###G#...",
            "K.C.T..D",
            "########"
        ]
    },
    {
        name: "The Underground Tunnels",
        wallColor: "#4d4237",
        floorColor: "#2f2c27",
        map: [
            "S..#..C.",
            "##.#.##.",
            "K....G..",
            "###.##.#",
            "....T.CD",
            "########"
        ]
    },
    {
        name: "The Warden’s Chamber",
        wallColor: "#3f3856",
        floorColor: "#262130",
        map: [
            "###E####",
            "#C....C#",
            "#.T.B.T#",
            "#...K..#",
            "#......#",
            "###S####"
        ]
    }
];

// ---------- 3. VARIABLES THAT CHANGE DURING THE GAME ----------
var gameState = "menu";           // "menu", "playing", "caught", "levelDone" or "won"
var numPlayers = 1;               // 1 or 2
var levelNumber = 0;              // 0 = level 1, 1 = level 2, 2 = level 3
var score = 0;
var scoreAtLevelStart = 0;        // remembered so we can reset the score on a restart
var hasKey = false;               // has a player picked up the key yet?
var frameCount = 0;               // counts how many frames have passed (60 per second)
var messageTimer = 0;             // counts down while a message is on screen

var map;                          // the map of the current level
var players = [];                 // list of players
var guards = [];                  // list of guards
var coins = [];                   // list of coins
var traps = [];                   // list of traps
var boss = null;                  // the Iron Warden (null when there is no boss)
var key = null;                   // the key
var door = null;                  // the exit door
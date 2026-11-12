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

var gameState = "menu";           
var numPlayers = 1;          
var levelNumber = 0;              
var score = 0;
var scoreAtLevelStart = 0;        
var hasKey = false;     
var frameCount = 0;          
var messageTimer = 0;           

var map;                          
var players = [];                
var guards = [];
var coins = [];            
var traps = [];             
var boss = null;          
var key = null;                
var door = null;                 
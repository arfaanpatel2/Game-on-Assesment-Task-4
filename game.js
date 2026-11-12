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

// The keys each player uses
var controls = [
    { up: "w", down: "s", left: "a", right: "d", attack: " " },
    { up: "arrowup", down: "arrowdown", left: "arrowleft", right: "arrowright", attack: "enter" }
];

// This object remembers which keyboard keys are being held down right now
var keysDown = {};

// ---------- 4. SOUND ----------
var audioCtx = null;              // created after the first key press
var soundOn = true;

// Plays one beep. pitch = how high, seconds = how long, volume = how loud
function playSound(pitch, seconds, volume) {
    if (audioCtx == null || soundOn == false) {
        return;                   // no sound available or sound is turned off
    }
    var oscillator = audioCtx.createOscillator();   // makes the beep
    var gain = audioCtx.createGain();               // controls the volume
    oscillator.type = "square";
    oscillator.frequency.value = pitch;
    gain.gain.value = volume;
    oscillator.connect(gain);
    gain.connect(audioCtx.destination);
    oscillator.start();
    oscillator.stop(audioCtx.currentTime + seconds);
}

// Sound effects (each one is just a beep or two)
function soundCoin()  { playSound(900, 0.1, 0.05); }
function soundKey()   { playSound(1200, 0.2, 0.05); }
function soundSwing() { playSound(500, 0.05, 0.04); }
function soundHit()   { playSound(300, 0.1, 0.06); }
function soundHurt()  { playSound(150, 0.3, 0.08); }
function soundLevelDone() {
    playSound(523, 0.15, 0.05);
    setTimeout(function () { playSound(784, 0.3, 0.05); }, 150);
}

// Background music: every 0.3 seconds play the next note in this list
var musicNotes = [220, 262, 330, 262, 220, 262, 330, 392];
var musicPosition = 0;
setInterval(function () {
    playSound(musicNotes[musicPosition], 0.2, 0.02);
    musicPosition = musicPosition + 1;
    if (musicPosition >= musicNotes.length) {
        musicPosition = 0;        // go back to the start of the tune
    }
}, 300);

// ---------- 5. LOADING A LEVEL ----------
// Reads the map letters and creates the player, guards, coins, etc.
function loadLevel(number) {
    levelNumber = number;
    map = levels[number].map;
    score = scoreAtLevelStart;
    hasKey = false;
    frameCount = 0;
    players = [];
    guards = [];
    coins = [];
    traps = [];
    boss = null;
    key = null;
    door = null;
    
    // Go through every row and every column of the map
    for (var row = 0; row < ROWS; row++) {
        for (var col = 0; col < COLS; col++) {
            var letter = map[row].charAt(col);
            var x = col * TILE;   // pixel position of this tile
            var y = row * TILE;
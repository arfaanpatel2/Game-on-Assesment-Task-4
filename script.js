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
        
            if (letter == "S") {
                // Make 1 or 2 players, standing side by side
                for (var i = 0; i < numPlayers; i++) {
                    players.push({
                        x: x + 3 + i * 30, y: y + 18, size: 28,
                        color: playerColors[i],
                        controls: controls[i],
                        lives: 3,
                        facingX: 0, facingY: -1,    // which way the player is looking
                        invincible: 0,              // frames of protection after being hurt
                        attackTimer: 0,             // frames the sword is out
                        attackCooldown: 0           // frames to wait before the next swing
                    });
                }
            } else if (letter == "C") {
                coins.push({ x: x + 22, y: y + 22, size: 20 });
            } else if (letter == "K") {
                // In level 3 the key stays hidden until the boss is beaten
                key = { x: x + 20, y: y + 20, size: 24, visible: (number != 2) };
            } else if (letter == "T") {
                // Only the traps in level 2 turn on and off
                traps.push({ x: x + 14, y: y + 14, size: 36, timed: (number == 1) });
            } else if (letter == "G") {
                // Look at the tiles left and right of the guard.
                // If both are walls the guard walks up and down, otherwise left and right.
                var guardSpeedX = 1.2;
                var guardSpeedY = 0;
                if (map[row].charAt(col - 1) == "#" && map[row].charAt(col + 1) == "#") {
                    guardSpeedX = 0;
                    guardSpeedY = 1.2;
                }
                guards.push({
                    x: x + 14, y: y + 14, size: 36,
                    speedX: guardSpeedX, speedY: guardSpeedY,
                    health: (number == 0) ? 1 : 2,  // level 1 guards die in 1 hit, ghosts in 2
                    isGhost: (number == 1),
                    hitCooldown: 0
                });
            } else if (letter == "B") {
                boss = { x: x + 6, y: y + 6, size: 52, health: 5, hitCooldown: 0 };
            } else if (letter == "D" || letter == "E") {
                door = { x: x + 8, y: y + 8, size: 48 };
            }
        }
    }
    gameState = "playing";
}

// Starts a brand new game with 1 or 2 players
function startGame(howManyPlayers) {
    numPlayers = howManyPlayers;
    scoreAtLevelStart = 0;
    loadLevel(0);
}

// ---------- 6. COLLISIONS AND MOVEMENT ----------
// Is this single point (px, py) inside a wall or a locked door?
function isBlocked(px, py) {
    var col = Math.floor(px / TILE);
    var row = Math.floor(py / TILE);
    if (col < 0 || row < 0 || col >= COLS || row >= ROWS) {
        return true;              // outside the map counts as a wall
    }
    var letter = map[row].charAt(col);
    if (letter == "#") {
        return true;
    }
    if ((letter == "D" || letter == "E") && hasKey == false) {
        return true;              // the door is locked until we have the key
    }
    return false;
}

// Can a square of this size stand at (x, y)? We test its four corners.
function canMoveTo(x, y, size) {
    if (isBlocked(x, y)) return false;
    if (isBlocked(x + size, y)) return false;
    if (isBlocked(x, y + size)) return false;
    if (isBlocked(x + size, y + size)) return false;
    return true;
}

// Moves something sideways and then up/down (separately so it can slide along walls).
// Returns true if it bumped into a wall.
function moveThing(thing, moveX, moveY) {
    var hitWall = false;
    if (canMoveTo(thing.x + moveX, thing.y, thing.size)) {
        thing.x = thing.x + moveX;
    } else {
        hitWall = true;
    }
    if (canMoveTo(thing.x, thing.y + moveY, thing.size)) {
        thing.y = thing.y + moveY;
    } else {
        hitWall = true;
    }
    return hitWall;
}

// Are two squares overlapping? (Every object has x, y and size.)
function touching(a, b) {
    if (a.x + a.size < b.x) return false;   // a is completely left of b
    if (a.x > b.x + b.size) return false;   // a is completely right of b
    if (a.y + a.size < b.y) return false;   // a is completely above b
    if (a.y > b.y + b.size) return false;   // a is completely below b
    return true;
}

// Timed traps have their spikes up for 1 second, then down for 1 second
function spikesAreUp(trap) {
    if (trap.timed == false) {
        return true;              // normal traps are always dangerous
    }
    return Math.floor(frameCount / 60) % 2 == 1;
}

function countAlivePlayers() {
    var count = 0;
    for (var i = 0; i < players.length; i++) {
        if (players[i].lives > 0) {
            count = count + 1;
        }
    }
    return count;
}

// ---------- 7. UPDATING THE GAME (runs 60 times a second) ----------
function updatePlayer(p) {
    // Count down the timers
    if (p.invincible > 0) p.invincible = p.invincible - 1;
    if (p.attackTimer > 0) p.attackTimer = p.attackTimer - 1;
    if (p.attackCooldown > 0) p.attackCooldown = p.attackCooldown - 1;

    // Work out which way the player wants to go
    var moveX = 0;
    var moveY = 0;
    if (keysDown[p.controls.left])  moveX = -2.5;
    if (keysDown[p.controls.right]) moveX = 2.5;
    if (keysDown[p.controls.up])    moveY = -2.5;
    if (keysDown[p.controls.down])  moveY = 2.5;

    if (moveX != 0 || moveY != 0) {
        // Remember which way we are facing (-1, 0 or 1 on each axis)
        p.facingX = Math.sign(moveX);
        p.facingY = Math.sign(moveY);
        moveThing(p, moveX, moveY);
    }

    // Swing the sword
    if (keysDown[p.controls.attack] && p.attackCooldown == 0) {
        p.attackTimer = 10;
        p.attackCooldown = 25;
        soundSwing();
    }
    if (p.attackTimer > 0) {
        swordHits(p);
    }
}

// Checks if the player's sword is hitting a guard or the boss
function swordHits(p) {
    // The sword is a square that sits in front of the player
    var sword = {
        x: p.x + p.size / 2 + p.facingX * 30 - 20,
        y: p.y + p.size / 2 + p.facingY * 30 - 20,
        size: 40
    };

    // Check every guard
    for (var i = 0; i < guards.length; i++) {
        var g = guards[i];
        // hitCooldown stops one swing from hitting the same guard many times
        if (touching(sword, g) && g.hitCooldown == 0) {
            g.health = g.health - 1;
            g.hitCooldown = 20;
            if (g.health <= 0) {
                guards.splice(i, 1);          // remove the guard from the list
                score = score + 25;
                soundHit();
                return;
            }
            soundHit();
        }
    }

    // Check the boss
    if (boss != null && touching(sword, boss) && boss.hitCooldown == 0) {
        boss.health = boss.health - 1;
        boss.hitCooldown = 20;
        soundHit();
        if (boss.health <= 0) {
            boss = null;
            score = score + 100;
            key.visible = true;               // the key appears now
        }
    }
}

// Guards walk in a straight line and turn around when they hit a wall
function updateGuard(g) {
    if (g.hitCooldown > 0) g.hitCooldown = g.hitCooldown - 1;
    var hitWall = moveThing(g, g.speedX, g.speedY);
    if (hitWall) {
        g.speedX = -g.speedX;
        g.speedY = -g.speedY;
    }
}

// The boss walks slowly towards the closest player
function updateBoss() {
    if (boss.hitCooldown > 0) boss.hitCooldown = boss.hitCooldown - 1;

    // Find the closest living player
    var closest = null;
    var closestDistance = 99999;
    for (var i = 0; i < players.length; i++) {
        if (players[i].lives > 0) {
            var dx = players[i].x - boss.x;
            var dy = players[i].y - boss.y;
            var distance = Math.sqrt(dx * dx + dy * dy);   // Pythagoras
            if (distance < closestDistance) {
                closestDistance = distance;
                closest = players[i];
            }
        }
    }

    // Step towards that player
    if (closest != null && closestDistance > 0) {
        var stepX = (closest.x - boss.x) / closestDistance * 0.9;
        var stepY = (closest.y - boss.y) / closestDistance * 0.9;
        moveThing(boss, stepX, stepY);
    }
}

// Takes one life away from a player
function hurtPlayer(p) {
    p.lives = p.lives - 1;
    p.invincible = 90;            // 1.5 seconds of protection
    soundHurt();
}

// Is the player touching anything dangerous?
function checkDamage(p) {
    if (p.invincible > 0) {
        return;                   // protected, so nothing can hurt us
    }
    for (var i = 0; i < guards.length; i++) {
        if (touching(p, guards[i])) {
            hurtPlayer(p);
            return;
        }
    }
    if (boss != null && touching(p, boss)) {
        hurtPlayer(p);
        return;
    }
    for (var j = 0; j < traps.length; j++) {
        if (spikesAreUp(traps[j]) && touching(p, traps[j])) {
            hurtPlayer(p);
            return;
        }
    }
}

// Pick up coins and the key (both players share the score)
function collectItems(p) {
    for (var i = 0; i < coins.length; i++) {
        if (touching(p, coins[i])) {
            coins.splice(i, 1);   // remove the coin
            score = score + 10;
            soundCoin();
            break;
        }
    }
    if (key != null && key.visible && touching(p, key)) {
        hasKey = true;
        key = null;
        score = score + 20;
        soundKey();
    }
}

// This function is called 60 times every second
function updateGame() {
    // While a message is showing ("Level complete!" etc.) just count down
    if (gameState == "caught" || gameState == "levelDone") {
        messageTimer = messageTimer - 1;
        if (messageTimer <= 0) {
            if (gameState == "caught") {
                loadLevel(levelNumber);           // try the same level again
            } else {
                scoreAtLevelStart = score;        // keep the score for the next level
                loadLevel(levelNumber + 1);
            }
        }
        return;
    }
    if (gameState != "playing") {
        return;
    }

    frameCount = frameCount + 1;

    // Update everything that moves
    for (var i = 0; i < players.length; i++) {
        if (players[i].lives > 0) updatePlayer(players[i]);
    }
    for (var j = 0; j < guards.length; j++) {
        updateGuard(guards[j]);
    }
    if (boss != null && countAlivePlayers() > 0) {
        updateBoss();
    }

    // Check damage and pickups for each living player
    for (var k = 0; k < players.length; k++) {
        if (players[k].lives > 0) {
            checkDamage(players[k]);
            collectItems(players[k]);
        }
    }

    // If nobody has lives left, the level restarts
    if (countAlivePlayers() == 0) {
        gameState = "caught";
        messageTimer = 100;
        return;
    }

    // If a living player reaches the open door, the level is finished
    for (var m = 0; m < players.length; m++) {
        if (players[m].lives > 0 && hasKey && touching(players[m], door)) {
            soundLevelDone();
            if (levelNumber == 2) {
                gameState = "won";
            } else {
                gameState = "levelDone";
                messageTimer = 100;
            }
            return;
        }
    }
}

// ---------- 8. DRAWING ----------
// Draws a filled circle
function drawCircle(x, y, radius, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
}

// Draws centred text on the canvas
function drawText(words, y, size, color) {
    ctx.fillStyle = color;
    ctx.font = size + "px Arial";
    ctx.textAlign = "center";
    ctx.fillText(words, canvas.width / 2, y);
}

// Draws the walls and floor
function drawMap() {
    var level = levels[levelNumber];
    for (var row = 0; row < ROWS; row++) {
        for (var col = 0; col < COLS; col++) {
            var letter = map[row].charAt(col);
            if (letter == "#") {
                ctx.fillStyle = level.wallColor;
                ctx.fillRect(col * TILE, row * TILE, TILE, TILE);
                ctx.strokeStyle = "black";       // dark outline makes the bricks visible
                ctx.strokeRect(col * TILE, row * TILE, TILE, TILE);
            } else {
                ctx.fillStyle = level.floorColor;
                ctx.fillRect(col * TILE, row * TILE, TILE, TILE);
            }
        }
    }
}

// Brown and locked, or black with a green outline when open
function drawDoor() {
    if (hasKey) {
        ctx.fillStyle = "black";
        ctx.fillRect(door.x, door.y, door.size, door.size);
        ctx.strokeStyle = "lime";
        ctx.lineWidth = 3;
        ctx.strokeRect(door.x, door.y, door.size, door.size);
    } else {
        ctx.fillStyle = "#6b4a2a";
        ctx.fillRect(door.x, door.y, door.size, door.size);
        drawCircle(door.x + 24, door.y + 24, 6, "gold");   // the lock
    }
}

// Spikes are drawn as three triangles (red for timed traps)
function drawTraps() {
    for (var i = 0; i < traps.length; i++) {
        var t = traps[i];
        ctx.fillStyle = "#26221e";
        ctx.fillRect(t.x, t.y, t.size, t.size);      // the plate
        if (spikesAreUp(t)) {
            ctx.fillStyle = t.timed ? "red" : "lightgray";
            for (var s = 0; s < 3; s++) {
                ctx.beginPath();
                ctx.moveTo(t.x + 2 + s * 11, t.y + 32);       // bottom left of spike
                ctx.lineTo(t.x + 8 + s * 11, t.y + 4);        // tip of spike
                ctx.lineTo(t.x + 14 + s * 11, t.y + 32);      // bottom right of spike
                ctx.fill();
            }
        }
    }
}

function drawItems() {
    for (var i = 0; i < coins.length; i++) {
        drawCircle(coins[i].x + 10, coins[i].y + 10, 10, "gold");
    }
    if (key != null && key.visible) {
        ctx.fillStyle = "yellow";
        ctx.fillRect(key.x, key.y + 8, key.size, 8);          // the long part of the key
        drawCircle(key.x + 4, key.y + 12, 8, "yellow");       // the round handle
    }
}

function drawPlayers() {
    for (var i = 0; i < players.length; i++) {
        var p = players[i];
        if (p.lives <= 0) continue;                           // skip players who are out
        // While protected, the player flashes (visible only some of the time)
        if (p.invincible > 0 && Math.floor(frameCount / 5) % 2 == 0) continue;

        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, p.size, p.size);               // the body
        // White dot shows which way the player is facing
        drawCircle(p.x + 14 + p.facingX * 7, p.y + 14 + p.facingY * 7, 4, "white");

        if (p.attackTimer > 0) {                              // draw the sword
            ctx.strokeStyle = "white";
            ctx.lineWidth = 5;
            ctx.beginPath();
            ctx.moveTo(p.x + 14, p.y + 14);
            ctx.lineTo(p.x + 14 + p.facingX * 45, p.y + 14 + p.facingY * 45);
            ctx.stroke();
        }
    }
}

function drawGuards() {
    for (var i = 0; i < guards.length; i++) {
        var g = guards[i];
        ctx.fillStyle = g.isGhost ? "#e8e4d4" : "#a03030";   // white ghost or red guard
        ctx.fillRect(g.x, g.y, g.size, g.size);
        ctx.fillStyle = "black";                                 // two eyes
        ctx.fillRect(g.x + 8, g.y + 10, 6, 6);
        ctx.fillRect(g.x + 22, g.y + 10, 6, 6);
    }
}

function drawBoss() {
    if (boss == null) return;
    ctx.fillStyle = "#555b6b";
    ctx.fillRect(boss.x, boss.y, boss.size, boss.size);
    ctx.fillStyle = "red";                                       // glowing red eyes
    ctx.fillRect(boss.x + 12, boss.y + 14, 10, 8);
    ctx.fillRect(boss.x + 30, boss.y + 14, 10, 8);
    // Health bar above the boss: dark red background, bright red for remaining health
    ctx.fillStyle = "#400000";
    ctx.fillRect(boss.x, boss.y - 10, boss.size, 6);
    ctx.fillStyle = "red";
    ctx.fillRect(boss.x, boss.y - 10, boss.size * boss.health / 5, 6);
}

// A dark box with a message on top of the game
function drawMessage(big, small) {
    ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    drawText(big, canvas.height / 2, 36, "gold");
    drawText(small, canvas.height / 2 + 35, 20, "white");
}

function drawMenu() {
    drawText("THE FORGOTTEN PRISON", 90, 38, "gold");
    drawText("Press 1 for ONE player", 170, 24, "white");
    drawText("Press 2 for TWO players", 205, 24, "white");
    drawText("Player 1: W A S D to move, Space to attack", 265, 17, "lightgray");
    drawText("Player 2: Arrow keys to move, Enter to attack", 295, 17, "lightgray");
    drawText("Coin +10   Key +20   Enemy +25   Boss +100", 335, 17, "lightgray");
    drawText("Each player has 3 lives. Lose them all and the level restarts.", 365, 17, "lightgray");
}

// Shows the score and lives in the line of text above the game
function updateInfoText() {
    var info = document.getElementById("info");
    if (gameState == "menu") {
        info.textContent = "";
        return;
    }
    var words = "Level " + (levelNumber + 1) + "   |   Score: " + score;
    for (var i = 0; i < players.length; i++) {
        words = words + "   |   Player " + (i + 1) + " lives: " + players[i].lives;
    }
    if (hasKey) {
        words = words + "   |   Key: yes";
    }
    info.textContent = words;
}


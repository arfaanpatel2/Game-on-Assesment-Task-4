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

var levels = [
        {
            name: "The Prison Cells",
            wallColor: "#6e655b",
            floorColor: "#3b3631",

        },
        {
            name: "The Underground Tunnels",
            wallColor: "#4d4237",
            floorColor: "#2f2c27",

        },
        {
            name: "The Warden’s Chamber",
            wallColor: "#3f3856",
            floorColor: "#262130",

        }
    ];
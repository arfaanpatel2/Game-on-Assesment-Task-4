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
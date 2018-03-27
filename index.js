class GameObject {
    constructor(x, y, type, game) {
        //Set the id for jquery to look for
        this.identifier = type + "-" + x + "_" + y;
        //Set the spawn to given position
        this.spawn = [x, y];
        //Update position
        this.x = x;
        this.y = y;
        //Store the game object so we can access its functions
        this.game = game;
        this.type = type;
        //Boxes and players are moveable
        this.moveable = type === "box" || type === "player";
        //Boxes, players and walls are tangible
        this.tangible = this.moveable || type === "wall";
    }

    reset() {
        //Move back to spawn on reset
        this._doMove(this.spawn);
    }

    _allowsMove(dir, count) {
        //If it can't move and it's tangible, do not allow movement
        if (this.tangible && !this.moveable) return false;
        //If it's not tangible you can move right through it
        else if (!this.tangible) return true;
        //If its a box and the amount of objects being moved is more than two (player, box, box)
        //Do not allow movement
        else if (this.type === "box" && count > 2) return false;

        //Add to the moving objects counter
        count++;

        //Get objects in the tile we're moving to
        var targetObjects = this.game.getObjectsByPos(this.x + dir[0], this.y + dir[1]);
        //If theres nothing there, go ahead and move
        if (!targetObjects.length) {
            return true;
        } else {
            //Otherwise check each object if they allow the movement
            //Success is true until one object doesn't allow movement
            var success = true;
            for (var i = 0; i < targetObjects.length; i++) {
                success = targetObjects[i].attemptMove(dir, count) && success;
            }
            return success;
        }
    }

    _doMove(x, y) {
        //Allow for passing [x,y] as well as x, y
        if (x && !y && x.length) {
            y = x[1];
            x = x[0];
        }

        //Simply update the position and tell the game to move us
        this.x = x;
        this.y = y;
        this.game.moveElement(this.identifier, [x, y]);
    }

    attemptMove(dir, count) {
        //Count how many objects are being moved, minimum of 1 (this object)
        if (!count) count = 1;

        //Check if movement is allowed
        if (this._allowsMove(dir, count)) {
            //If this can move, do so
            if (this.moveable) this._doMove(this.x + dir[0], this.y + dir[1]);
            return true;
        } else {
            return false;
        }
    }
}

class Player extends GameObject {
    setSpawn(spawn) {
        //Update spawn
        this.spawn = spawn;
        //Respawn
        this.reset();
    }

    handleInput(keyCode) {
        switch (keyCode) {
            case 37: //Left: x-1
                this.attemptMove([-1,0]);
                break;
            case 38: //Up: y-1
                this.attemptMove([0,-1]);
                break;
            case 39: //Right: x+1
                this.attemptMove([1,0]);
                break;
            case 40: //Down: y+1
                this.attemptMove([0, 1]);
                break;
        }
    }
}


class Map {
    constructor(mapstring, game) {
        //Save for passing to objects on the map
        this.game = game;
        //Load the map
        this.loadFromString(mapstring);
    }
        
    loadFromString(mapstring) {
        //Width and height of the map
        var size = [0, 0];
        var objects = [];
        var spawns = {
            player: [1, 1],
            boxes: []
        };

        //Split on new lines
        var textRows = mapstring.split("\n");
        for (var y = 0; y < textRows.length; y++) {
            //Strings work as arrays so no need for splitting
            var textCols = textRows[y];
            //Horizontal size of map
            var xSize = 0;
            for (var x = 0; x < textCols.length; x++) {
                //Create objects depending on character and update xSize if its a legal character
                //Moveable objects get added to the spawns variable
                switch (textCols[x]) {
                    case "X":
                        objects.push(new GameObject(x, y, "wall", this.game));
                        xSize = x + 1;
                        break;
                    case "O":
                        objects.push(new GameObject(x, y, "boxspot", this.game));
                        xSize = x + 1;
                        break;
                    case "B":
                        objects.push(new GameObject(x, y, "box", this.game));
                        xSize = x + 1;
                        spawns.boxes.push([x, y]);
                        break;
                    case "8":
                        objects.push(new GameObject(x, y, "boxspot", this.game));
                        objects.push(new GameObject(x, y, "box", this.game));
                        xSize = x + 1;
                        spawns.boxes.push([x, y]);
                        break;
                    case "P":
                        spawns.player = [x, y];
                        xSize = x + 1;
                        break;
                    default:
                        break;
                }
            }
            //If xSize is bigger than we've stored, update it
            if (xSize > size[0]) size[0] = xSize;
            //If the row contained any legal characters, update vertical size
            if (xSize !== 0) size[1] = y + 1;
        }
        //Store the variables on the map
        this.objects = objects;
        this.spawns = spawns;
        this.size = size;
    }

    spawnPlayer(player) {
        //Set the spawn for the player
        player.setSpawn(this.spawns.player);
        //Add player to the map
        this.objects.push(player);
    }

    reset() {
        //Reset each object on the map
        for (var i in this.objects) {
            this.objects[i].reset();
        }
    }
}

class Game {
    constructor() {
        //Make the player
        this.player = new Player(-1, -1, "player", this);
    }
        
    setMap(map) {
        //Update current map
        this.currentMap = map;
        //Put player where he should be & update his spawn
        this.currentMap.spawnPlayer(this.player);
        //Change size of the game container
        $("#gameContainer").css({
            "width": 64 * map.size[0] + "px",
            "height": 64 * map.size[1] + "px"
        });
        //Reset game variables
        this.reset();
        //Generate the html elements for the map
        this.generateHtml();
    }

    reset() {
        //If theres a victory overlay, delete that
        $("#victoryOverlay").remove();
        //Reset player having won
        this.playerWon = false;
        //Reset map
        this.currentMap.reset();
    }

    moveElement(movingIdentifier, destinationPos) {
        //Move element into the desired position
        var destination = ".row-" + destinationPos[1] + ">.col-" + destinationPos[0];
        //Detach fist so it doesnt create a copy
        $("#" + movingIdentifier).detach().appendTo(destination);
    }
        
    getObjectsByPos(x, y) {
        //Allow for passing [x,y] as well as x, y
        if (x && !y && x.length) {
            y = x[1];
            x = x[0];
        }

        var result = [];
        var objects = this.currentMap.objects;
        //Go through objects and get the ones matching the position
        for (var i in objects) {
            var object = objects[i];
            if (object.x === x && object.y === y)
                result.push(object);
        }
        return result;
    }

    getObjectsByTypes(types) {
        var result = {};
        var objects = this.currentMap.objects;
        //Go through types and get all objects that has a matching type
        for (var t in types) {
            var type = types[t];
            for (var i in objects) {
                var object = objects[i];
                if (object.type === type) {
                    if (!result[type]) result[type] = [];
                    result[type].push(object);
                }
            }
        }
        return result;
    }

    checkWinConditions() {
        //Check if player has won by looking at boxes and boxspots
        var objects = this.getObjectsByTypes(["box", "boxspot"]);
        //Create an array of coordinates for both lists
        var boxes = objects.box.map((box) => box.x + "," + box.y);
        var spots = objects.boxspot.map((boxspot) => boxspot.x + "," + boxspot.y);
        //PlayerWon is true until a box isn't on a boxspot
        var playerWon = true;
        for (var i in boxes) {
            playerWon = spots.indexOf(boxes[i]) > -1 && playerWon;
        }
        if (playerWon) {
            this.playerWon = true;
            this.gameOver();
        }
    }

    gameOver() {
        //Make a lazy overlay saying player won
        $("#gameContainer").prepend("<div id='victoryOverlay'><h1>You win</h1></div>");
    }

    generateHtml() {
        //Create elements in a square based on map size
        var yAxis = this.currentMap.size[1];
        var xAxis = this.currentMap.size[0];
        var rows = [];

        for (var y = 0; y < yAxis; y++) {
            //Make each row and give them their row number
            rows.push("<div class='row row-" + y + "'>");
            for (var x = 0; x < xAxis; x++) {
                //Make each column and give them their column number
                rows[y] += "<div class='col col-" + x +"'>";

                //Get objects in this tile
                var objects = this.getObjectsByPos(x, y);
                for (var i in objects) {
                    //Place the objects in the column
                    rows[y] += "<div id='" + objects[i].identifier + "' class='" + objects[i].type + "'></div>";
                }
                rows[y] += "</div>";
            }
            rows[y] += "</div>";
        }

        //Replace everything with the new html
        $("#gameContainer").html(rows.join(""));
    }

    onKeydown(event) {
        if (event.keyCode >= 37 && event.keyCode <= 40) { //Arrow keys for movement
            event.preventDefault();
            //Let player handle the keys
            this.player.handleInput(event.keyCode);
            //Check if player has now won
            if (!this.playerWon) this.checkWinConditions();
        } else if (event.keyCode === 82) { //R for resetting
            event.preventDefault();
            this.reset();
        }
    }

    loadMapFromFile(path, cb) {
        //To pass into the map
        var game = this;
        //Try to use ajax
        $.get(path, function (data) {
            //Make a new map and return it
            cb(new Map(data, game));
        //Fallback into file selection
        }).fail(function (err) {
            //Make an input with type file to trigger the file select
            var input = document.createElement('input');
            input.type = 'file';
            input.onchange = function (event) {
                //Maps are text files
                if (input.files[0].type !== "text/plain") return alert("Only .txt map files.");
                //FileReader for reading the contents of the file
                var fr = new FileReader();
                //When its read, make a map and return it
                fr.onload = function () {
                    cb(new Map(fr.result, game));
                };
                //Start reading
                fr.readAsText(input.files[0]);
            };
            //Open the file selection
            input.click();
        });        
    }
}

$(document).ready(function () {
    //Make a new game
    var game = new Game();    
    window.addEventListener('keydown', function (event) {
        //Forward keypresses to the game
        game.onKeydown(event);
    }, false);

    //Available maps
    maps = [
        {
            name: "Map 1",
            path: "maps/1.txt"
        },
        {
            name: "Map 2",
            path: "maps/2.txt"
        },
        {
            name: "Map 3",
            path: "maps/3.txt"
        },
        {
            name: "Map 4",
            path: "maps/4.txt"
        }
    ];

    //Make the buttons to switch maps
    for (var i in maps) {
        var map = maps[i];
        var element = "<a class='map-select-btn'";
        element += "data-mappath='" + map.path + "'";
        element += "href ='#" + map.path + "'>";
        element += map.name;
        element += "</a>";
        $("header>nav").append(element);
    }

    //On click, change map
    $("nav>a.map-select-btn").click(function () {
        var path = $(this).data("mappath");
        //Get and load the file
        game.loadMapFromFile(path, function (map) {
            //Set it to the current map
            game.setMap(map);
        });
    });

    $("nav>a.map-select-btn")[0].click();
});
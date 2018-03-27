class GameObject {
    constructor(x, y, type, game) {
        this.identifier = type + "-" + x + "_" + y;
        this.spawn = [x, y];
        this.x = x;
        this.y = y;
        this.game = game;
        this.type = type;
        this.moveable = type === "box" || type === "player";
        this.tangible = this.moveable || type === "wall";
    }

    reset() {
        this._doMove(this.spawn);
    }

    _allowsMove(dir, count) {
        if (this.tangible && !this.moveable) return false; //Cant be moved, can collide with
        else if (!this.tangible) return true; //Cant collide, will act as empty space
        else if (this.type === "box" && count > 1) return false; //Cant push more than one box
        count++;
        
        var targetObjects = this.game.getObjectsByPos(this.x + dir[0], this.y + dir[1]);
        if (!targetObjects.length) {
            return true;
        } else {
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
        this.x = x;
        this.y = y;
        this.game.moveElement(this.identifier, [x, y]);
    }

    attemptMove(dir, count) {
        if (!count) count = 0;

        if (this._allowsMove(dir, count)) {
            if (this.moveable) this._doMove(this.x + dir[0], this.y + dir[1]);
            return true;
        } else {
            return false;
        }
    }
}

class Player extends GameObject {
    setSpawn(spawn) {
        this.spawn = spawn;
        this.reset();
    }

    handleInput(keyCode) {
        switch (keyCode) {
            case 37: //Left
                this.attemptMove([-1,0]);
                break;
            case 38: //Up
                this.attemptMove([0,-1]);
                break;
            case 39: //Right
                this.attemptMove([1,0]);
                break;
            case 40: //Down
                this.attemptMove([0, 1]);
                break;
        }
    }
}


class Map {
    constructor(mapstring, game) {
        this.game = game;
        this.loadFromString(mapstring);
    }
        
    loadFromString(mapstring) {
        var yAxis = mapstring.split("\n");
        var size = [0, yAxis.length];
        var objects = [];
        var spawns = {
            player: [1, 1],
            boxes: []
        };

        for (var y = 0; y < yAxis.length; y++) {
            var xAxis = yAxis[y];
            var xSize = 0;
            for (var x = 0; x < xAxis.length; x++) {
                switch (xAxis[x]) {
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
            if (xSize > size[0]) size[0] = xSize;
            if (xSize !== 0) size[1] = y + 1;
        }
        this.objects = objects;
        this.spawns = spawns;
        this.size = size;
    }

    spawnPlayer(player) {
        player.setSpawn(this.spawns.player);
        this.objects.push(player);
    }

    reset() {
        for (var i in this.objects) {
            this.objects[i].reset();
        }
    }
}

class Game {
    constructor() {
        this.player = new Player(-1, -1, "player", this);
    }
        
    setMap(map) {
        this.currentMap = map;
        this.currentMap.spawnPlayer(this.player);
        $("#gameContainer").css({
            "width": 64 * map.size[0] + "px",
            "height": 64 * map.size[1] + "px"
        });
        this.reset();
        this.generateHtml();
    }

    reset() {
        $("#victoryOverlay").remove();
        this.playerWon = false;
        this.currentMap.reset();
    }

    moveElement(movingIdentifier, destinationPos) {
        var destination = ".row-" + destinationPos[1] + ">.col-" + destinationPos[0];
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
        var objects = this.getObjectsByTypes(["box", "boxspot"]);
        var boxes = objects.box.map((box) => box.x + "," + box.y);
        var spots = objects.boxspot.map((boxspot) => boxspot.x + "," + boxspot.y);
        var playerWon = true;
        for (var i in boxes) {
            playerWon = spots.indexOf(boxes[i]) > -1 && playerWon;
        }
        if (playerWon && !this.playerWon) {
            this.playerWon = true;
            this.gameOver();
        }
    }

    gameOver() {
        $("#gameContainer").prepend("<div id='victoryOverlay'><h1>You win</h1></div>");
    }

    generateHtml() {
        var yAxis = this.currentMap.size[1];
        var xAxis = this.currentMap.size[0];
        var rows = [];

        for (var y = 0; y < yAxis; y++) {
            rows.push("<div class='row row-" + y + "'>");
            for (var x = 0; x < xAxis; x++) {
                rows[y] += "<div class='col col-" + x +"'>";

                var objects = this.getObjectsByPos(x, y);
                for (var i in objects) {
                    rows[y] += "<div id='" + objects[i].identifier + "' class='" + objects[i].type + "'></div>";
                }
                rows[y] += "</div>";
            }
            rows[y] += "</div>";
        }

        $("#gameContainer").html(rows.join(""));
    }

    onKeydown(event) {
        if (event.keyCode >= 37 && event.keyCode <= 40) { //Arrow keys
            event.preventDefault();
            this.player.handleInput(event.keyCode);
            this.checkWinConditions();
        } else if (event.keyCode === 82) { //R
            event.preventDefault();
            this.reset();
        }
    }

    loadMapFromFile(path, cb) {
        var game = this;
        $.get(path, function (data) {
            cb(new Map(data, game));
        });
    }
}

$(document).ready(function () {
    var game = new Game();    
    window.addEventListener('keydown', function (event) {
        game.onKeydown(event);
    }, false);

    game.loadMapFromFile("maps/1.txt", function (map) {
        game.setMap(map);
    });

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

    for (var i in maps) {
        var map = maps[i];
        var element = "<a class='map-select-btn'";
        element += "data-map='" + map.path + "'";
        element += "href ='#" + map.path + "'>";
        element += map.name;
        element += "</a>";
        $("header>nav").append(element);
    }

    $("nav>a.map-select-btn").click(function () {
        var path = $(this).data("map");
        game.loadMapFromFile(path, function (map) {
            game.setMap(map);
        });
    });
});
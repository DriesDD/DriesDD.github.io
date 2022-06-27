//----------------------------------------------//
//          SCHEMATIC OVERVIEW                  //
//______________________________________________//

/*                                                                                  
       player                                                                   
         |  gamereset() <------------------------------------------------------+  PART 1
         v  v                                                                  |
         menu button                                                           |
            v                                                                  |
           gamestart()                                                         |
             |                                                                 |
             +>wavegenerator() <---------------------------------------------+ |  PART 2
             | 	  |                                                    ^     | |
             |    |----array waveseries['asteroids','assassins',...] --+     | |
             |    |    v                                                     | |
             |    +--->array  eventlist [['message',...],['enemy',...],...]  ^ |
             |         v                                                     / |
             +>eventspawning() repeats -----------------------------------> -  |  PART 3
             |         v                                                       |
             |        enemycycle( , enemycycle()...repeats                     |
             |                        +                                        |
             +>moveplayer() repeats   |                                        |  PART 4
             |    |                   |                                        |
             |    +-> updatepos()     |                                        ^
             |               |        v                                       / 
             |               +-> loselife()--------------------------------> -  
             |                                                                  
             +>timecycle() repeats                                                PART 5
                                                                                
see https://textik.com/#c88e7e73e6589fe6 */


//----------------------------------------------//
//          PART 1: setting the scene           //
//______________________________________________//

//wrap everything in a function
(() => {
    const targetid = 'game'
    //screen width and screen height in number of tiles
    const sw = 40
    const sh = 20

    const hints = ["Hint: This game goes well with synthwave music.", "Hint: Stay away from red dots in abandoned stations.", "Hint: Use your tail like a shield to defend against asteroids.", "Hint: Survive 100 seconds on super hard or extreme to win the game.", "Hint: With some enemies it's best to move to the front so you have space to run back to.", "Hint: Surround the blob before it surrounds you.", "Hint: Assassins with a trail are nasty and fast. Hide behind your tail.", "Hint: Greed is the prime cause of death in abandoned space stations.", "Hint: Don't let moving walls close in front of you.", "Hint: Double-tap to jump 4 blocks far.", "Hint: Fast blinking blocks are good. They are powerups.", "Hint: After you take damage, you have 2 seconds of invulnerability. Get out of the situation as fast as you can."]
    //define which color classes are enemies (needed to lose a life when hitting them)
    const enemycolors = [];
    //variables
    let playerx, playery, playerdir, prevplayerdir, playerspeed,
        oldplayerx, oldplayery, xshift, tapkey,
        cycle, spawncycle, wave, bgcolor,
        gametime, interval, invincible, life, maxlife,
        score

    //event list of enemies, waves, powerups etc. populated by the generatewave function.
    eventlist = [];
    waveseries = [];
    waveindex = 0;

    //prevent the page from scrolling using the up and down keys, since those are used in game
    window.addEventListener("keydown", function (e) {
        // space and arrow keys
        if ([32, 37, 38, 39, 40].indexOf((e.key > -1) || (e.keyCode > -1))) {
            e.preventDefault();
        }
    }, false);

    //auxiliary function to wait a certain amount of milliseconds
    timeout = (ms) => {
        return new Promise(resolve => setTimeout(resolve, ms))
    }

    //auxiliary function to select elements by id
    function $(x) {
        return document.getElementById(x);
    }

    //auxiliary function to restyle a cell
    function restyle(x, y, newstyle) {
        document.getElementsByClassName('cell')[y * sw + x].classList.remove("bg-space", "bg-amber-300", "bg-amber-100", "bg-green-600", "bg-green-900", "bg-green-800", "bg-orange-900", "bg-red-800", "bg-red-600", "bg-blue-500", "bg-blue-700", "bg-orange-600", "bg-green-500", "bg-indigo-700", "bg-amber-400", "bg-gray-900");
        document.getElementsByClassName('cell')[y * sw + x].classList.add(newstyle)
    }

    //auxiliary Fisher-Yates shuffle function. Only bit of code here that I copied from the internet, as it's the proven best shuffle algorithm.
    function shuffle(array) {
        var m = array.length,
            t, i;
        while (m) {
            i = Math.floor(Math.random() * m--);
            t = array[m];
            array[m] = array[i];
            array[i] = t;
        }

        return array;
    }

    //start by creating a sh*sw table with id and style to have full width
    (function createtable() {
        let html = "<div class=\"relative\">"
        html += "<table id=\"grid\" class= \"z-40 table-fixed\">"
        for (i = 0; i < sh; i++) {
            html += "<tr class= \"\">"
            for (j = 0; j < sw; j++) {
                html += " <td class= \"cell px-4 py-4 overflow-hidden bg-space\" ></td>"
            }
            html += "</tr>"
        }
        html += "</table>"
        html += "</div>"
        $(targetid).innerHTML = html;
    })()

    //restarts goes up every new game restart. Some functions use it to check if the game restarted since their last cycle.
    let restarts = 0
    //game reset function resets the game to default values, and shows the menu
    function gamereset() {
        playerx = Math.round(sw / 3);
        playery = Math.round(sh / 2);
        oldplayerx = playerx;
        oldplayery = playery;
        playerdir = 'right';
        prevplayerdir = 'right';
        tapkey = '';
        playerspeed = 160;
        life = 5;
        maxlife = 5;
        invincible = 0;
        cycle = 0;
        xshift = 0
        spawncycle = 0;
        score = gametime / 1000
        gametime = 0;
        interval = 100;
        restarts += 1;
        wave = 1;
        bgcolor = 'bg-space'
        eventlist = [];
        waveseries = [];
        waveindex = 0;

        for (i = 0; i < sh; i++) {
            for (j = 0; j < sw; j++) {
                restyle(j, i, "bg-space")
            }

        }
        updatepos();
        loselife(0);

        $("gametime").innerText = "Paused"
        if (restarts > 1) {
            $('menutext').innerHTML = "You survived for " + score + " seconds." + "</br>" + hints[Math.floor(Math.random() * hints.length)]
            if ((difficulty > 1) && (score > 100)) {
                $('menutext').innerText = "Wow! You survived for " + score + " seconds on hard or extreme. You beat the game!"
            }
        }
        difficulty = 0;
        $('menu').classList.remove("invisible")
    }
    gamereset(1)

    //the game is then started after clicking one of the menu difficulties

    $('normal').onclick = () => {
        life = 5;
        maxlife = 5;
        difficulty = 1;
        $('difficulty').innerText = 'Difficulty: hard';
        gamestart()
    }
    $('hard').onclick = () => {
        life = 3;
        maxlife = 3;
        difficulty = 2;
        $('difficulty').innerText = 'Difficulty: super hard';
        gamestart()
    }
    $('extreme').onclick = () => {
        life = 1;
        maxlife = 1;
        difficulty = 3;
        $('difficulty').innerText = 'Difficulty: extreme';
        gamestart()
    }

    async function gamestart() {
        loselife(0);
        $('wavemsg').innerText = "Wave 1";
        wavegenerator();
        //these are repeating functions that carry on the number of game restarts with them. They don't do anything if the game is on a different number than them. This is how the function is killed when a new game has started 
        eventspawning(restarts);
        timecycle(restarts);
        $('menu').classList.add("invisible")
        //player entrance effect
        for (i = 0; i < playerx; i++) {
            restyle(i, playery, "bg-amber-300")
        }
        moveplayer(restarts);
    }

    //----------------------------------------------//
    //   PART 2: the wave generator                 //
    //______________________________________________//

    //this is the function where the waves are generated using an array of arrays (eventlist). First the order of the wave is randomly shuffled.
    //for enemy: eventtype, delay after previous,x,y,direction,speed, movement pattern, style, trail
    //for wave start: eventtype, delay after previous, background color
    //for message: eventtype, delay after previous, announcement
    //for powerup: eventtype, delay after previous, power, x, y, color1

    function wavegenerator() {
        let randy, randspeed, randsize
        //shuffles the order of the waves with more mysterious ones later on and a powerup at the end
        if (waveindex >= waveseries.length) {
            waveseries = []
            for (i = 0; i < 10; i++) {
                waveseries = waveseries.concat(shuffle(["assassins", "asteroids", "glitch"]));
                waveseries = waveseries.concat(shuffle(["blob", "walls", "station"]));
                waveseries = waveseries.concat(["health"]);
            }
        }
        switch (waveseries[waveindex]) {
            case 'assassins': {
                //Assassins   
                eventlist.push(['wave', 8000, 'bg-space']);
                eventlist.push(['message', 0, 'They sent assassins to kill you, captain snake.']);
                for (i = 0; i < 0.5 * (6 + wave + difficulty); i++) {
                    if (Math.random() > (1 / (difficulty / 2 + wave / 5))) {
                        eventlist.push(['enemy', 15000 / (3 + wave / 2 + difficulty / 2), sw + 10, Math.round(Math.random() * sh), 'left', 1200 / (2 + 2 * difficulty + wave / 2), 'snake', "bg-red-600", "bg-space"])
                    } else {
                        if (Math.random() > 0.7) {
                            eventlist.push(['enemy', 7000 / (3 + wave / 2 + difficulty / 2), sw + 10, Math.round(Math.random() * sh), 'up', 900 / (2 + 2 * difficulty + wave / 2), 'pursue', "bg-red-600", "bg-space"])
                        } else {
                            eventlist.push(['enemy', 10000 / (3 + wave / 2 + difficulty / 2), sw + 10, Math.round(Math.random() * sh), 'left', 1000 / (2 + 2 * difficulty + wave / 2), 'block', "bg-red-600", "bg-space"])
                        }
                    }
                }
                eventlist.push(['enemy', 1000, -1, 1, 'left', 500, 'none', "bg-space", "bg-space"]);
            };
            break;
        case 'asteroids': {
            //Asteroid swarm
            eventlist.push(['wave', 5000, 'bg-space']);
            eventlist.push(['message', 0, 'Snake, we are caught in an asteroid storm.']);
            for (i = 0; i < 3 * (2 + difficulty + wave); i++) {
                randy = Math.floor(Math.random() * sh);
                randspeed = 100 - difficulty * 20 + Math.floor(Math.random() * 200);
                randsize = Math.ceil(Math.random() * 3)
                eventlist.push(['enemy', 3000 / (2 + difficulty * 2 + wave), sw + 5, randy, 'left', randspeed, 'none', "bg-orange-900", "bg-space"])
                for (j = 0; j < randsize; j++) {
                    for (k = 0; k < randsize; k++) {
                        eventlist.push(['enemy', 0, sw + 5 + Math.round(randsize + j * 2 + 2 * Math.random()), Math.round(randy + k * 2 + 2 * Math.random()), 'left', randspeed, 'none', "bg-orange-900", "bg-space"]);
                    }
                }
            }
        };
        break;
        case 'glitch': {
            //the glitch
            eventlist.push(['wave', 5000, "bg-space"]);
            eventlist.push(['message', 0, 'Something seems glitchy in the fabric of spacetime.']);
            for (i = 0; i < (15 + (difficulty * 2) + wave); i++) {
                randy = Math.floor(Math.random() * sh);
                randspeed = 300 + Math.floor(Math.random() * 100);
                randsize = Math.ceil(1 + Math.random() * 5)
                eventlist.push(['enemy', 1000 / ((2 + difficulty + wave / 2) / 5), sw + 5, randy, 'left', randspeed, 'none', "bg-green-600", "bg-space"])
                for (j = 0; j < randsize * 2; j++) {
                    for (k = 0; k < randsize; k++) {
                        eventlist.push(['enemy', 0, sw + 5 - Math.round(randsize / 2) + j, randy + k, 'left', randspeed, 'none', "bg-green-600", "bg-space"]);
                    }
                }
                if (Math.random() > 0.96) {
                    randy = Math.floor(Math.random() * sh);
                    randspeed = Math.round(200 / (difficulty + wave) + (Math.random() * 200))
                    eventlist.push(['enemy', 400, sw + 1, randy, 'down', randspeed, 'none', "bg-green-600", "bg-space"]);
                    for (j = 0; j < Math.ceil(Math.random() * 50); j++) {
                        eventlist.push(['enemy', 10, sw + 1, randy + j, 'down', randspeed, 'none', "bg-green-600", "bg-space"]);
                    }
                }
            }
        };
        break;
        case 'walls': {
            //Blue walls
            eventlist.push(['wave', 4000, 'bg-space']);
            eventlist.push(['message', 0, 'Those walls... They\'re closing! We may need our double-tap ability.']);
            for (i = 0; i < (wave / 5 + difficulty); i++) {

                randy = Math.floor(Math.random() * sh);

                for (j = 0; j < (Math.ceil(Math.sqrt(1 + wave / 3 + difficulty))); j++) {
                    eventlist.push(['enemy', 10, sw + 10, (randy + j), 'up', 3000, 'none', "bg-blue-700", "bg-blue-700"])
                    eventlist.push(['enemy', 10, sw + 10, (randy - j), 'down', 3000, 'none', "bg-blue-700", "bg-blue-700"])
                    eventlist.push(['enemy', 10, sw + 9, (randy + j), 'up', 3000, 'none', "bg-blue-700", "bg-blue-700"])
                    eventlist.push(['enemy', 10, sw + 9, (randy - j), 'down', 3000, 'none', "bg-blue-700", "bg-blue-700"])
                }
                if (Math.random() * 20 < 4 + (difficulty + wave)) {
                    eventlist.push(['enemy', 50000 / (1 + wave + difficulty), sw + 5, randy + 1, 'up', 10000 / (10 + difficulty + wave), 'snake', "bg-blue-500", "bg-blue-700"])
                    eventlist.push(['enemy', 0, sw + 4, randy, 'up', 6000 / (10 + difficulty + wave), 'snake', "bg-blue-500", "bg-blue-700"])
                } else {
                    eventlist.push(['enemy', 50000 / (1 + wave + difficulty), sw + 5, randy - 1, 'down', 6000 / (10 + difficulty + wave), 'none', "bg-blue-700", "bg-blue-700"])
                    eventlist.push(['enemy', 0, sw + 4, randy, 'down', 6000 / (10 + difficulty + wave), 'none', "bg-blue-500", "bg-blue-700"])
                }
                eventlist.push(['enemy', 1500, sw + 5, (randy - j), 'still', 200, 'fade', "bg-blue-700", "bg-blue-700"])

                for (j = 0; j < (Math.ceil(Math.sqrt(1 + wave / 3 + difficulty))); j++) {
                    eventlist.push(['enemy', 5, sw + 15, (randy + j), 'up', 2400, 'none', "bg-blue-700", "bg-blue-700"])
                    eventlist.push(['enemy', 5, sw + 15, (randy - j), 'down', 2400, 'none', "bg-blue-700", "bg-blue-700"])
                    eventlist.push(['enemy', 5, sw + 14, (randy + j), 'up', 2400, 'none', "bg-blue-700", "bg-blue-700"])
                    eventlist.push(['enemy', 5, sw + 14, (randy - j), 'down', 2400, 'none', "bg-blue-700", "bg-blue-700"])
                }
                eventlist.push(['enemy', 4000, sw + 5, (randy - j), 'still', 200, 'fade', "bg-blue-700", "bg-blue-700"])
            }
            eventlist.push(['enemy', 5000, sw, (randy - j), 'up', 500, 'none', "bg-blue-700", "bg-blue-700"])
        };
        break;

        //Great blob
        case 'blob': {

            eventlist.push(['wave', 4000, 'bg-space']);
            eventlist.push(['message', 0, 'It\'s a blob... That eats snakes!']);
            for (i = 0; i < 30 + (difficulty + wave) * 10; i++) {
                eventlist.push(['enemy', 150 / (5 + difficulty + wave), sw + 5, Math.round(Math.random() * 3), 'down', (2 + Math.random()) * 3000 / (5 + difficulty + wave), 'pursue', "bg-indigo-700", "bg-indigo-700"])
                eventlist.push(['enemy', 150 / (5 + difficulty + wave), sw + 5, sh + 1 - Math.round(Math.random() * 3), 'up', (2 + Math.random()) * 3000 / (5 + difficulty + wave), 'pursue', "bg-indigo-700", "bg-indigo-700"])
            }
            eventlist.push(['enemy', 5000, sw + 10, sh + 1 - Math.round(Math.random() * 3), 'left', (2 + Math.random()) * 2000 / (5 + difficulty + wave), 'none', "bg-indigo-700", "bg-space"])
        };
        break;
        case 'station': {

            //Space station
            eventlist.push(['wave', 6000, 'bg-space']);
            eventlist.push(['message', 0, 'It\'s an abandoned space station. There might be some timecoins but sometimes also bombs.']);
            randy = Math.floor(Math.random() * sh);
            for (j = 0; j < 10; j++) {
                randy = Math.floor(Math.random() * sh);
                eventlist.push(['enemy', 2000, sw + 2, randy, 'still', 100, 'none', "bg-gray-900", "bg-space"]);
                randy = Math.floor(Math.random() * sh);
                randsize = 3 + Math.floor(Math.random() * 6);

                for (i = 0; i < randsize; i++) {
                    if (Math.random() > 0.2) {
                        eventlist.push(['enemy', 0, sw + i, randy, 'still', 100, 'none', "bg-gray-900", "bg-space"]);
                        eventlist.push(['enemy', 0, sw + i, randy + randsize, 'still', 100, 'none', "bg-gray-900", "bg-space"]);
                        eventlist.push(['enemy', 0, sw, randy + i, 'still', 100, 'none', "bg-gray-900", "bg-space"]);
                        eventlist.push(['enemy', 0, sw + randsize, randy + i, 'still', 100, 'none', "bg-gray-900", "bg-space"]);
                    }
                }
                if (randsize > 5) {
                    for (i = 0; i < difficulty; i++) {
                        eventlist.push(['powerup', 0, 'coin', sw + 2 + Math.round(Math.random() * 3), randy + 2 + Math.round(Math.random() * 3), "bg-amber-400"]);
                        eventlist.push(['powerup', 0, 'coin', sw + 2 + Math.round(Math.random() * 3), randy + 2 + Math.round(Math.random() * 3), "bg-amber-400"]);
                    }
                } else if (Math.random() < (difficulty + wave / 2) / 30) {
                    eventlist.push(['enemy', 0, sw + 1 + Math.round(Math.random() * 2), randy + 1 + Math.round(Math.random() * 2), 'left', 5000 / (3 + difficulty + wave), 'proximity', "bg-red-600", "bg-space"])
                }
            }
        };
        break;
        case 'health': {
            //health bar
            eventlist.push(['message', 5500, 'After all that, you deserve a health bar.']);
            eventlist.push(['powerup', 100, 'health', sw, 5 + Math.floor(Math.random() * sh), "bg-green-500"]);
            eventlist.push(['enemy', 3000, sw, 0, 'still', 100, 'fade', "bg-space", "bg-space"]);
        };
        break;
        }

        waveindex += 1
    }

    //----------------------------------------------//
    //   PART 3: enemy and event behavior           //
    //______________________________________________//

    //enemy spawning / event triggering
    async function eventspawning(currentgame) {
        if (currentgame == restarts) {

            //if the evenlist ran out, generate new wave
            if (eventlist.length < 10) {
                wavegenerator()
            }

            switch (eventlist[spawncycle][0]) {
                //spawn enemies
                case 'enemy': {
                    enemycycle(eventlist[spawncycle][6], eventlist[spawncycle][5], eventlist[spawncycle][7], eventlist[spawncycle][8], eventlist[spawncycle][2], eventlist[spawncycle][3], eventlist[spawncycle][4], restarts, xshift);
                };
                break;
                //new wave
            case 'wave': {
                wave += 1;
                $('wavemsg').innerText = "Wave " + String(wave);
                bgcolor = eventlist[spawncycle][2]
            };
            break;
            //message
            case 'message': {
                $('gamemsg').innerText = eventlist[spawncycle][2]
            };
            break;
            //powerup is actually a special kind of 'enemy'
            case 'powerup': {
                enemycycle(eventlist[spawncycle][2], 100, eventlist[spawncycle][5], "bg-space", eventlist[spawncycle][3], eventlist[spawncycle][4], "still", restarts, xshift)
            };
            break;
            }

            //take the first element out of the eventlist, then repeat
            eventlist.shift()

            await timeout(eventlist[spawncycle + 1][1]);
            eventspawning(currentgame)

        }
    }

    //individual enemy movement. Every cycle, the x,y position of the enemy is cleared and the new position is determined based on direction, then the enemy is redrawn
    async function enemycycle(pattern, speed, style, trace, x, y, dir, currentgame, prevxshift) {
        if (currentgame == restarts) {
            //check if in the field
            //calculate how much the entire game screen shifted since the previous enemycycle
            const relshift = (xshift - prevxshift)
            let dead = 0;
            //wrap around y edges
            if (y > (sh - 1)) {
                y -= (sh)
            }
            if (y < 0) {
                y += sh
            }
            //die when out of field
            if (x < 0) {
                dead = 1
            }
            //also die when hitting player's tail
            if ((x < sw) && (document.getElementsByClassName('cell')[y * sw + x].classList.contains("bg-amber-300") == true)) {
                dead = 1;
                restyle(x, y, "bg-amber-300")
            };

            if (dead == 0) {
                //clear previous position if it was in the view
                if ((x - relshift < sw) && (x - relshift > 0)) {
                    restyle(x - relshift, y, trace)
                };
                switch (pattern) {
                    //pattern none doesn't change the direction
                    case 'none':
                        break;
                        //pattern pursue goes in the direction of player, when very close, launches itself as an object with pattern 'none'
                    case 'pursue': {
                        if (Math.abs(playerx - x) + Math.abs(playery - y) > Math.random() * 10) {
                            if ((Math.abs(playerx - x)) > Math.min((Math.abs(playery - y - sh), (Math.abs(playery - y))))) {
                                if (x > playerx) {
                                    dir = 'left'
                                } else if (x < sw - 5) {
                                    dir = 'right'
                                } else {
                                    dir = 'still';
                                    pattern = 'fade'
                                } //last part is to prevent slow pursuits through the next wave
                            } else {
                                if (((y > playery) && ((y - playery) < sh / 2)) || ((y < playery) && ((playery - y) > sh / 2))) {
                                    dir = 'up'
                                } else(dir = 'down')
                            }
                        } else {
                            enemycycle('none', speed / 2, style, trace, x, y, dir, currentgame, prevxshift)
                            dead = 1
                        }
                    };
                    break;
                    //fade draws itself, then kills itself after one 'cycle'
                case 'fade': {
                    if (x < sw) {
                        document.getElementsByClassName('cell')[(y * sw) + x].classList.add(style);
                    }
                    await timeout(speed);
                    if ((x < sw) && (currentgame == restarts)) {
                        restyle(x, y, trace)
                    }
                    dead = 1
                };
                break;
                // snake leaves a deadly snail-like trail
                case 'snake': {
                    enemycycle('fade', speed * 3, style, trace, x, y - relshift, dir, currentgame, prevxshift);
                    if ((Math.abs(playerx - x)) > Math.min((Math.abs(playery - y - sh), (Math.abs(playery - y))))) {
                        if (x > playerx) {
                            dir = 'left'
                        } else(dir = 'right')
                    } else {
                        if (((y > playery) && ((y - playery) < sh / 2)) || ((y < playery) && ((playery - y) > sh / 2))) {
                            dir = 'up'
                        } else(dir = 'down')
                    }
                };
                break;
                // block tries to be in front of player, then dies
                case 'block': {
                    if ((Math.abs(playerx + 5 - x)) > Math.min((Math.abs(playery - y - sh), (Math.abs(playery - y))))) {
                        if (x > playerx) {
                            dir = 'left'
                        } else(dir = 'right')
                    } else {
                        if (((y > playery) && ((y - playery) < sh / 2)) || ((y < playery) && ((playery - y) > sh / 2))) {
                            dir = 'up'
                        } else(dir = 'down')
                    }
                    if ((y == playery) && (x == playerx + 5)) {
                        dead = 1;
                        enemycycle('none', speed, style, trace, x - 1, y - 1, 'still', currentgame, prevxshift);
                        enemycycle('none', speed, style, trace, x, y, 'still', currentgame, prevxshift);
                        enemycycle('none', speed, style, trace, x + 1, y - 1, 'still', currentgame, prevxshift);
                        enemycycle('none', speed, style, trace, x + 1, y + 1, 'still', currentgame, prevxshift);
                        enemycycle('none', speed, style, trace, x - 1, y + 1, 'still', currentgame, prevxshift)
                    }

                };
                break;
                // proximity follows player and explodes when near player
                case 'proximity': {
                    if ((Math.abs(playerx + 2 - x)) > Math.min((Math.abs(playery - y - sh), (Math.abs(playery - y))))) {
                        if (x > playerx) {
                            dir = 'left'
                        } else(dir = 'right')
                    } else {
                        if (((y > playery) && ((y - playery) < sh / 2)) || ((y < playery) && ((playery - y) > sh / 2))) {
                            dir = 'up'
                        } else(dir = 'down')
                    }
                    if ((Math.abs(y - playery) + Math.abs(x - playerx)) < 10) {
                        dead = 1;
                        enemycycle('none', speed, style, trace, x - 2, y - 2, 'still', currentgame, prevxshift);
                        enemycycle('none', speed, style, trace, x + 2, y - 2, 'still', currentgame, prevxshift);
                        enemycycle('none', speed, style, trace, x + 2, y + 2, 'still', currentgame, prevxshift);
                        enemycycle('none', speed, style, trace, x - 2, y + 2, 'still', currentgame, prevxshift);
                        enemycycle('none', speed, style, trace, x + 3, y, 'still', currentgame, prevxshift);
                        enemycycle('none', speed, style, trace, x - 3, y, 'still', currentgame, prevxshift);
                        enemycycle('none', speed, style, trace, x, y + 3, 'still', currentgame, prevxshift);
                        enemycycle('none', speed, style, trace, x, y - 3, 'still', currentgame, prevxshift);
                    }

                };
                break;
                }


                //move in the direction
                x -= relshift
                switch (dir) {
                    case 'right':
                        x += 1;
                        break;
                    case 'left':
                        x -= 1;
                        break;
                    case 'up':
                        y -= 1;
                        if (y < 0) {
                            y += sh
                        }
                        break;
                    case 'down':
                        y += 1;
                        if (y > (sh - 1)) {
                            y -= (sh - 1)
                        }
                        break;
                    case 'still':
                        break;
                }
                //when enemy hits the player, player loses life. powerups have other effects
                if ((x == playerx) && (y == playery)) {
                    if (pattern == 'health') {
                        loselife(-1)
                    } else if (pattern == 'coin') {
                        gametime += 3000;
                        $('gamemsg').innerText = "3 seconds added to score!";

                    } else {
                        loselife(1)
                    }
                    dead = 1
                }

                //draw enemy if they are in view, redo cycle if their x is higher than 0
                if ((x >= 0) && (dead == 0)) {
                    if ((x < sw) && (y >= 0) && (y < sh)) {
                        if (((pattern == 'health') || (pattern == 'coin')) && ((cycle % 2) < 1)) {
                            document.getElementsByClassName('cell')[(y * sw) + x].classList.add("bg-space")
                        } else {
                            document.getElementsByClassName('cell')[(y * sw) + x].classList.add(style)
                        }
                    }
                    prevxshift = xshift;
                    await timeout(speed);
                    enemycycle(pattern, speed, style, trace, x, y, dir, currentgame, prevxshift)
                }
            }
        }
    }

    //----------------------------------------------//
    //   PART 4: player behavior                    //
    //______________________________________________//

    //player movement. tapkey is used to check for doubletaps.

    document.onkeydown = () => {
        switch (event.key) {
            case 'ArrowLeft':
                if ((playerdir != 'right')) {
                    prevplayerdir = playerdir
                    playerdir = 'left'
                }
                break;
            case 'ArrowUp':
                if ((playerdir != 'down')) {
                    prevplayerdir = playerdir
                    playerdir = 'up'
                }
                break;
            case 'ArrowRight':
                if ((playerdir != 'left')) {
                    prevplayerdir = playerdir
                    playerdir = 'right'
                }
                break;
            case 'ArrowDown':
                if ((playerdir != 'up')) {
                    prevplayerdir = playerdir
                    playerdir = 'down'
                }
                break;
        }
    }

    document.onkeyup = () => {
        switch (event.key) {
            case 'ArrowLeft':
                if (playerdir != 'right') {
                    tapkey = tapkey + 'll'
                }
                break;
            case 'ArrowUp':
                if (playerdir != 'down') {
                    tapkey = tapkey + 'uu'
                }
                break;
            case 'ArrowRight':
                if (playerdir != 'left') {
                    tapkey = tapkey + 'rr'
                }
                break;
            case 'ArrowDown':
                if (playerdir != 'up') {
                    tapkey = tapkey + 'dd'
                }
                break;
        }
    }

    function collisiondetect(x, y) {
        let collision = false
        if (document.getElementsByClassName('cell')[y * sw + x].classList.contains("bg-orange-900") ||
            document.getElementsByClassName('cell')[y * sw + x].classList.contains("bg-green-600") ||
            document.getElementsByClassName('cell')[y * sw + x].classList.contains("bg-amber-300") ||
            document.getElementsByClassName('cell')[y * sw + x].classList.contains("bg-blue-500") ||
            document.getElementsByClassName('cell')[y * sw + x].classList.contains("bg-blue-700") ||
            document.getElementsByClassName('cell')[y * sw + x].classList.contains("bg-indigo-700") ||
            document.getElementsByClassName('cell')[y * sw + x].classList.contains("bg-red-600")) {
            collision = true
        }
        return collision
    }


    async function moveplayer(currentgame) {
        if (currentgame == restarts) {
            if (tapkey == 'rrr') {
                playerx += 4
            }
            if (tapkey == 'lll') {
                playerx -= 4
            }
            if (tapkey == 'uuu') {
                playery -= 4
            }
            if (tapkey == 'ddd') {
                playery += 4
            }
            tapkey = tapkey.substr(0, Math.min(4, tapkey.length - 1));

            //instead of simply moving in movedir, player will move once in prevmovedir first if movedir would be a collision...
            let movedir = prevplayerdir;
            let plannedx = playerx;
            let plannedy = playery;
            switch (playerdir) {
                case 'right':
                    plannedx += 1;
                    break;
                case 'left':
                    plannedx -= 1;
                    break;
                case 'up':
                    plannedy -= 1;
                    if (plannedy < 0) {
                        plannedy += sh
                    }
                    break;
                case 'down':
                    plannedy += 1;
                    if (plannedy >= sh) {
                        plannedy -= sh
                    }
                    break;
            }
            if (collisiondetect(plannedx, plannedy) == false){
                movedir = playerdir
            }            

            switch (movedir) {
                case 'right':
                    playerx += 1;
                    break;
                case 'left':
                    playerx -= 1;
                    break;
                case 'up':
                    playery -= 1;
                    if (playery < 0) {
                        playery += sh
                    }
                    break;
                case 'down':
                    playery += 1;
                    if (playery >= sh) {
                        playery -= sh
                    }
                    break;
            }
            //Since after moving in the previous direction you automatically switch to current direction
            prevplayerdir = playerdir

            updatepos()
            await timeout(playerspeed);
            moveplayer(currentgame)
        }
    }


    //this function redraws the position of the player and is triggered after every move
    function updatepos() {
        if (playerx != oldplayerx || playery != oldplayery) {
            //collision detection with every enemy color and tail
            if (collisiondetect(playerx, playery) == true) {
                loselife(1)
            };

            //style the table cells to the player style
            if (invincible == 1) {
                restyle(oldplayerx, oldplayery, "bg-orange-600")
            } else {
                restyle(oldplayerx, oldplayery, "bg-amber-300")
            }
            restyle(playerx, playery, "bg-amber-100")

        }

        oldplayerx = playerx;
        oldplayery = playery;

        //lose life when too far left or right
        if ((playerx) < 1) {
            playerx = 1;
            playerdir = 'right';
            updatepos();
            loselife(1);
        }

        if ((playerx) > sw - 1) {
            playerx = sw - 1;
            playerdir = 'left';
            updatepos();
            loselife(1);
        }
    }


    //called when player loses a life
    async function loselife(loss) {
        if (invincible == 0) {
            life -= Number(loss);
            life = Math.min(life, maxlife)
        }


        for (i = 0; i < 5; i++) {
            document.getElementsByClassName('healthblock')[i].setAttribute("class", "healthblock py-4 px-4 bg-gray-500")
        }
        for (i = 0; i < maxlife; i++) {
            document.getElementsByClassName('healthblock')[i].setAttribute("class", "healthblock py-4 px-4 bg-red-500")
        }
        for (i = 0; i < life; i++) {
            document.getElementsByClassName('healthblock')[i].setAttribute("class", "healthblock py-4 px-4 bg-green-500")
        }

        //reset game when lost
        if (life < 1) {
            gamereset()
        }

        //invincibility period
        if (loss > 0) {
            invincible = 1;
            await (timeout)(2000);
            invincible = 0
        }
    }

    //----------------------------------------------//
    //PART 5: panning screen and recording gametime //
    //______________________________________________//

    async function timecycle(currentgame) {
        if (currentgame == restarts) {
            cycle += 1;
            gametime += interval
            $("gametime").innerText = gametime / 1000 + " seconds"
            //move all columns to the left every cycle to pan the game field
            if ((cycle % 4) == 0) {
                for (i = 0; i < sh; i++) {
                    for (j = 0; j < sw; j++) {
                        if (j < (sw - 1)) {
                            document.getElementsByClassName('cell')[i * sw + j].setAttribute("class", document.getElementsByClassName('cell')[i * sw + j + 1].getAttribute("class"));
                        } else {
                            restyle(j, i, bgcolor)
                        }
                    }
                }
                playerx -= 1;
                oldplayerx -= 1
                xshift += 1
            }
            //pan the background image
            $('background').style = "background-image:url('../../static/img/spacesnakebg.png'); background-position:" + (-2 * cycle) + "px 0px"

            //resize the first and last column to give the illusion of panning
            for (i = 0; i < sh; i++) {
                document.getElementsByClassName('cell')[i * sw + 0].classList.remove("px-1", "px-2", "px-3", "px-4");
                document.getElementsByClassName('cell')[i * sw + 0].classList.add("px-" + String(5 - ((cycle % 4) + 1)));

                document.getElementsByClassName('cell')[i * sw + sw - 1].classList.remove("px-1", "px-2", "px-3", "px-4");
                document.getElementsByClassName('cell')[i * sw + sw - 1].classList.add("px-" + String((cycle % 4) + 1));


            }
            //repeat the function
            await timeout(interval);
            timecycle(currentgame)
        }
    };

})();
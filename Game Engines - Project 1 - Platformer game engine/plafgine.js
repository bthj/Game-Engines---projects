var Plafgine = function() {
    
    // engine globals
    var canvas = document.getElementById('canvas'),
        ctx = canvas.getContext('2d'),
        width = 320,
        height = 240,
        states = {}, // what keys are currently pressed
        step = 10, // number of pixels to move on each frame
        worldYOffset = 0,  // hack to find the ground again when tilting the camera
        animationTimeStep = 150,  // milliseconds to elapse between sprite animation frames
        liveChangeTimeStep = 2000; // time that must elapse between loss of lives
    
    canvas.width = width;
    canvas.height = height;
    
    // another set of engine globals, sepcific to the game loop
    var players = [],
        platforms = [],
        stateOfConciousness = true,
        gameLoop;
    
    
    
    /////////////// level configuration ///////////////////
    var defaultPlayerPosition = {
		x: 10,  
		y: height-90,
		width : 46,
		height : 90
    };
    var enemyPositions = [
        {
            x: 50,  
            y: height-90,
            width : 46,
            height : 90            
        }
        ,
        {
            x: 400,  
            y: height-90,
            width : 46,
            height : 90
        }
        ,
        {
            x: 650,  
            y: height-90,
            width : 46,
            height : 90
        }
    ];
    var platformDefinitions = [
        {
            x: 100,
            y: height-100,
            width: 100,
            height: 50
        }
        ,
        {
            x: 200,
            y: height-200,
            width: 100,
            height: 50
        }
        ,
        {
            x: 300,
            y: height-300,
            width: 100,
            height: 50
        }
        ,
        {
            x: 400,
            y: height-400,
            width: 100,
            height: 50
        }
    ];
    var defaultEnemyAutomation = function() {
        var move = function(that) {
            if( !that.autostep ) that.autostep = 2;
            if( !that.moves ) that.moves = 0;
            if( that.moves > 80 ) {
                that.autostep = -2;
            } else if( that.moves < -50 ) {
                that.autostep = 2;
            }
            that.moves += that.autostep;
            that.x += that.autostep;

        };
        return {
            move : move
        };
    };
    /////////////// level configuration / ends ///////////////////
    
    
    
    ///// utility functions ///
    
    var clear = function(){
        ctx.fillStyle = '#d0e7f9';
        ctx.clearRect(0, 0, width, height);
        ctx.beginPath();
        ctx.rect(0, 0, width, height);
        ctx.closePath();
        ctx.fill();
    };
    
	// cross browser event listening
	var addEventListener = function( element, event, callee ) {
		if( element.addEventListener ) {
			element.addEventListener( event, callee, false );	
		} else if( element.attachEvent ) { // IE event attachment
			element.attachEvent( event, callee );	
		}
	};
    
    // camera function
    var moveWorld = function( by ) {
        platforms.forEach(function(platform,index){
            platform.x += by.x;
            platform.y += by.y;
        });
        players.forEach(function(player,index){
            if( player.isAutomated ) {
                player.x += by.x;
                player.y += by.y;
            }
        });
        worldYOffset += by.y;
    };
    
    
    
    var Player = function(playerPosition, sprite, isAutomated, automationFunction){
        var that = this;
        that.x = ~~ playerPosition.x;
        that.y = playerPosition.y;
        that.width = playerPosition.width;
        that.height = playerPosition.height;
        that.firstColor = '#FF8C00';
		that.secondColor = '#EEEE00';
        that.id = ~~(Math.random() * 87236583);
        that.isAutomated = isAutomated;
        that.automationFunction = automationFunction;

        that.image = new Image();
        that.image.src = sprite;
        that.lastAnimChangeTime = +(new Date());
        that.lastDrawXPos= 0;
        that.lastDrawYPos = 0;
        that.spriteLeftYOffset = that.width;
        that.spriteRightYOffset = 0;
        that.spriteXOffset = 90;
        that.spriteSteps = 1;  // TODO: read from config?
        that.currentSpriteStep = 0;
        that.yOffset = 0;
        
        // player rendition
        that.firstColor;
        that.secondColor;
        that.draw = function(){
            var currentTime = +(new Date());
            var diffTime = ~~((currentTime - that.lastAnimChangeTime));
            if( diffTime >= animationTimeStep ) {
                if( that.isMoving() ) {
                    if( that.currentSpriteStep == that.spriteSteps ) {
                        that.currentSpriteStep = 0;
                    } else {
                        that.currentSpriteStep++;
                    }
                    if( that.isAutomated ) {
                        if( that.lastDrawXPos > that.x ) {
                            that.yOffset = that.spriteLeftYOffset;
                        } else {
                            that.yOffset = 0;
                        }                        
                    } else {
                        if( states.left ) {
                            that.yOffset = that.spriteLeftYOffset;
                        } else {
                            that.yOffset = 0;
                        }
                    }

                } else {
                    that.currentSpriteStep = 0;
                    yOffset = 0;
                }
                that.lastAnimChangeTime = currentTime;
                
                that.lastDrawXPos = that.x;
                that.lastDrawYPos = that.y;
            }
            try {
                
                ctx.drawImage(that.image, 0 + that.yOffset, that.height * that.currentSpriteStep, that.width, that.height, that.x, that.y, that.width, that.height);
            } catch(e) {  
            };
        };
        
        
        that.lives = 5; // TODO: read from config
        that.lastLiveChangeTime = +(new Date());
        that.decreaseLive = function() {
            var currentTime = +(new Date());
            var diffTime = ~~((currentTime - that.lastLiveChangeTime));
            if( diffTime >= liveChangeTimeStep ) {
                that.lives--;
                that.lastLiveChangeTime = currentTime;
            }
        };
        

        that.isMoving = function() {
            return that.lastDrawYPos != that.y || that.lastDrawXPos != that.x || states.left || states.right;
        };
        that.moveLeft = function() {
            if( (that.x / width) < 0.5 ) { // pan camera
                moveWorld( {'x':step, 'y':0} );
            } else {
                that.x -= step * states.stepWeight;
            }
        };
        that.moveRight = function() {
            if( ((that.x+that.width) / width) > 0.5 ) { // pan camera
                moveWorld( {'x':-step, 'y':0} );
            } else {
                that.x += step * states.stepWeight;
            }
        };
        
        that.updatePositionFromInput = function() {
            if( states.left ) {
                that.moveLeft();
            } else if( states.right ) {
                that.moveRight();
            }
            if( states.up ) {
                that.jump();
            }
        };

        
        
        /// player physics //
        that.isJumping = false;
        that.isFalling = false;
        that.jumpSpeed = 0;
        that.fallSpeed = 0;
        
        that.getFeetY = function() {
            return that.y + that.height;
        };
        that.getGroundY = function() {
            return height - that.height;
        }    
        that.jump = function() {
            if( !that.isJumping && !that.isFalling ) {
                
                that.fallSpeed = 0;
                that.isJumping = true;
                that.jumpSpeed = 20;
            }
        };
        that.checkJump = function() {
            if( that.isJumping ) {
                if( (that.y / height) < 0.5 ) { // tilt camera
                    moveWorld( {'x':0, 'y':that.jumpSpeed} );
                } else {
                    that.y -= that.jumpSpeed;
                }
                
                that.jumpSpeed--;
                if( that.jumpSpeed == 0 ) {
                    that.isJumping = false;
                    that.isFalling = true;
                    that.fallSpeed = 1;
                }
            }
        };
        that.fallStop = function() {
            that.isFalling = false;
            that.fallSpeed = 0;
        };
        that.checkFall = function() {
            if( that.isFalling ) {
                if( that.getFeetY() < height ) {
                    if( that.getFeetY() + that.fallSpeed > height ) {
                        that.y = height - that.height;
                    } else {
                        // TODO: the interplay here between the tilting camera and falling player 
                        //      needs to become less janky.
                        if( worldYOffset > 0 && (that.y / height) > 0.5 ) { // tilt camera
                            moveWorld( {'x':0, 'y':-that.fallSpeed} );
                        } else {
                            that.y += that.fallSpeed;
                        }
                    }
                    that.fallSpeed++;
                } else {
                    that.fallStop();
                }
            }
        };
        
        that.checkPhysics = function() {
            that.checkJump();
            that.checkFall();
        };
        
        that.getId = function() {
            return that.id;
        };
        
        return that;  // Player
    };
    
    
    
    var Platform = function(platformPosition) {
        var that = this;
        that.x = ~~ platformPosition.x;
        that.y = platformPosition.y;
        that.width = platformPosition.width;
        that.height = platformPosition.height;
		that.firstColor = '#FF8C00';
		that.secondColor = '#EEEE00';

        that.draw = function() {
			ctx.fillStyle = 'rgba(255, 255, 255, 1)';
			var gradient = ctx.createRadialGradient(that.x + (that.width/2), that.y + (that.height/2), 5, that.x + (that.width/2), that.y + (that.height/2), 45);
			gradient.addColorStop(0, that.firstColor);
			gradient.addColorStop(1, that.secondColor);
			ctx.fillStyle = gradient;
			ctx.fillRect(that.x, that.y, that.width, that.height);
        };
    };
    
    
    
    
	var checkCollision = function(object1, object2) { // return 'true' if colliding, 'false' if not.  
		if (!(    
			(object1.y > object2.y+object2.height) ||    // 1 hits 2 from under
			(object1.y+object1.height < object2.y) ||    // 1 hits 2 from top
			(object1.x > object2.x+object2.width) ||     // 1 hits 2 from right
			(object1.x+object1.width < object2.x)        // 1 hits 2 from left
		)){

			return true;    
		}    
		return false;    
	};
    
    var checkPlayerPlatformCollision = function(player) {
        // TODO: segment the checks, check everything for now @ n^2
        platforms.forEach(function(platform,index){
            if( checkCollision(player, platform) ) {
                if( player.isFalling ) {
                    if( player.y + player.height > platform.y ) {
                        player.y = platform.y - player.height;
                    }
                    player.fallStop();
                } else if( player.y + player.height > platform.y ) {
                    // player is below the platform, let's prevent him in going through it
                    if( states.left || (player.isAutomated && player.autostep<0) ) {
                        player.x = platform.x + platform.width;
                    } else if( states.right || (player.isAutomated && player.autostep>0) ) {
                        player.x = platform.x - player.width;
                    }
                }
            } else if( !states.up &&  player.y < player.getGroundY() && false == player.isJumping ) {
                // so the player falls when going off the edge of a platform
                // ...states.up check added because of a conflict with the repeated isFalling setting
                //      when on a platform.  TODO: smooth this stuff out.
                player.isFalling = true;
            }
        });
    }
    var checkPlayerPlayerCollision = function() {
        // TODO: segment the checks, check everyone for now   
        players.forEach(function(player1,index){
            players.forEach(function(player2,index){
                if( player1.getId() != player2.getId() ) {
                    // TODO: check if player is moving?
                    if( checkCollision(player1, player2) ) {
                        if( player1.y < player2.y && !player1.isAutomated && player1.isFalling ) {
                            // 1 comes from above and is manual, lethal for 2
                            players.splice( players.indexOf(player2), 1 ); // remove player2
                        } else if( player2.y < player1.y && !player2.isAutomated && player2.isFalling ) {
                            players.splice( players.indexOf(player1), 1 );
                        } else if( player1.isAutomated ) {
                            player2.decreaseLive();
                        } else if( player2.isAutomated ) {
                            player1.decreaseLive();
                        }
                    }
                }
            });
        });
    }
    
    var GameLoop = function() {
        clear();
        
        players.forEach(function(player,index){
            if( player.isAutomated ) {
                player.automationFunction.move(player);
            } else {
                player.updatePositionFromInput();
                if( player.lives < 1 ) {
                    GameOver();
                } else {
                    ctx.fillStyle = "Black";
                    ctx.fillText("Lives: " + player.lives, 10, height-10);
                }
            }
            checkPlayerPlatformCollision(player);
            checkPlayerPlayerCollision();
            player.checkPhysics();
            player.draw();
        });
        platforms.forEach(function(platform,index){
            platform.draw();
        });
        
        
        if( stateOfConciousness ) {
            gameLoop = setTimeout(GameLoop, 1000 / 50);
        }
        
        
    };
    
    var GameOver = function() {
        stateOfConciousness = false;
        clearTimeout(gameLoop);
        setTimeout(function(){
            clear();
            players = [];
            platforms = [];
            ctx.fillStyle = "Black";
            ctx.font = "10pt Arial";
            ctx.fillText("Game over...", width / 2 - 50, height / 2);
        }, 100);
    };

    
    
    var start = function() {
        // initialize main player
        players.push( new Player(defaultPlayerPosition, "sprite.png", false) );
        // initialize enemy players
        enemyPositions.forEach(function(enemy,index){
            var player = new Player(enemy, "sprite_red.png", true);
            player.automationFunction = new defaultEnemyAutomation();
            players.push( player );
        });
        // initialize platforms
        platformDefinitions.forEach(function(platformDef,index){
            platforms.push( new Platform(platformDef) );
        });
        
		// add the listener to the main, window object, and update the states
		addEventListener( window, 'keydown', function(event) {
			if (event.keyCode === 37) {
				states.left = true;
				states.stepWeight = 1;
			} else if (event.keyCode === 38) {
				states.up = true;
			} else if (event.keyCode === 39) {
				states.right = true;
				states.stepWeight = 1;
			} else if (event.keyCode === 40) {
				states.down = true;
			}
		} );

		// if the key will be released, change the states object
		addEventListener( window, 'keyup', function(event) {
			if (event.keyCode === 37) {
				states.left = false;// 
			} else if (event.keyCode === 38) {
				states.up = false;
			} else if (event.keyCode === 39) {
				states.right = false;
			} else if (event.keyCode === 40) {
				states.down = false;
			}
		} );
		
		addEventListener( window, 'click', function(event) {
			start();
		});
        
        
        GameLoop();
        
    };
    // let the game framework, Plafgine, return a public API visible from outside scope
    return {
        start : start
    };
};

var game = new Plafgine();
game.start();

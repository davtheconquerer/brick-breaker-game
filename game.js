// Home Menu Scene - Displays main menu and handles navigation
class HomeMenu extends Phaser.Scene {
    constructor() {
        super('HomeMenu');
		this.clickSound;
    }
	
	preload() {
		this.load.audio('click', 'assets/sounds/click.mp3'); // preload click sound
	}

    create() {
		console.log('Home Menu opening...') // for debugging
		this.clickSound = this.sound.add('click'); // adds sound to a variable
		
        this.add.text(500, 300, 'Brick Breaker', { fontSize: '48px', fill: '#fff' }).setOrigin(0.5); // title text

        // Play Button - Starts a new game
        const playButton = this.add.text(500, 400, 'Play', { fontSize: '32px', fill: '#fff' }).setOrigin(0.5).setInteractive();
        playButton.on('pointerdown', () => {
			this.clickSound.play(); // play sound
            this.scene.start('GameScene'); // starts game
        });

        // Load Game Button - Loads a saved game
        const loadButton = this.add.text(500, 500, 'Load Game', { fontSize: '32px', fill: '#fff' }).setOrigin(0.5).setInteractive();
        loadButton.on('pointerdown', () => {
			this.clickSound.play();
            this.loadGame(); // calls load game function
        });
    }

    // Handles loading game from JSON file
    loadGame() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'application/json'; // only shows json files
        input.onchange = (event) => {
            const file = event.target.files[0];
            const reader = new FileReader();
            reader.onload = (e) => {
                const gameState = JSON.parse(e.target.result); // writes json format into a variable gameState
                this.scene.start('GameScene', { loadedState: gameState }); // Load game state and play game
            };
            reader.readAsText(file);
        };
        input.click();
    }
}

// Game Scene - The main game
class GameScene extends Phaser.Scene {
    constructor() {
        super('GameScene');
		this.clickSound;
		this.bounce;
		this.hurt;
		this.scoreText;
    }

    preload() {
		console.log('Preloading Assets...'); // for debugging
        this.load.image('background_grey', 'assets/images/backgrounds/background_grey.png');
        this.load.image('paddle', 'assets/images/paddles/medium-paddle.png');
        this.load.image('large_paddle', 'assets/images/paddles/large-paddle.png');
        this.load.image('small_paddle', 'assets/images/paddles/small-paddle.png');
        this.load.image('ball', 'assets/images/balls/green-ball.png');
		this.load.image('fireball', 'assets/images/balls/red-ball.png'); // not implemented
        this.load.image('brick', 'assets/images/bricks/orange-brick.png');
        this.load.image('reinforcedBrick', 'assets/images/bricks/red-brick.png');
        this.load.image('expandPowerUp', 'assets/images/power-ups/expand.png');
        this.load.image('shrinkPowerUp', 'assets/images/power-ups/shrink.png');
        this.load.image('pauseButton', 'assets/images/ui/pause.png');
		
		this.load.audio('click', 'assets/sounds/click.mp3');
		this.load.audio('bounce', 'assets/sounds/bounce.mp3');
		this.load.audio('hurt', 'assets/sounds/lifelost.mp3');
    }

    create(data) {
		console.log('Creating game environment...'); // for debugging
		this.clickSound = this.sound.add('click');
		this.bounce = this.sound.add('bounce');
		this.hurt = this.sound.add('hurt');
		
        this.add.image(500, 500, 'background_grey'); // background
		
		// Score Setup
        this.score = 0;
        this.scoreText = this.add.text(10, 10, `Score: ${this.score}`, { fontSize: '32px', fill: '#fff' });

        // Paddle setup
        this.paddle = this.physics.add.sprite(500, 950, 'paddle').setImmovable(true);
        this.paddle.body.collideWorldBounds = true;

        // Ball setup
        this.ball = this.physics.add.sprite(Phaser.Math.Between(300,800), Phaser.Math.Between(600,700), 'ball');
        this.ball.body.setCollideWorldBounds(true); // collides with game borders
        this.ball.setBounce(1);
        this.ball.setVelocity(250, -250);

        // Bricks setup
        this.bricks = this.physics.add.staticGroup();
		
        // Loading bricks
        if (data.loadedState) {
			console.log('Loading Game...'); // for debugging
            this.loadGameState(data.loadedState);
        } else { // Creating new bricks
            for (let y = 100; y < 400; y += 40) {
                for (let x = 100; x < 1000; x += 100) {
                    let brickType = y > 200 ? 'brick' : 'reinforcedBrick';
                    let brick = this.bricks.create(x, y, brickType);
                    brick.hitsLeft = y > 200 ? 1 : 2;
                }
            }
        }

        // Enable keyboard input
        this.cursors = this.input.keyboard.createCursorKeys();
		
		// Power-ups
        this.powerUps = this.physics.add.group();

        this.physics.add.overlap(this.paddle, this.powerUps, this.collectPowerUp, null, this);

        // Collision Handling
        this.physics.add.collider(this.ball, this.paddle, this.hitPaddle, null, this);
        this.physics.add.collider(this.ball, this.bricks, this.hitBrick, null, this);

        // Pause Button
        this.pauseButton = this.add.image(950, 50, 'pauseButton').setInteractive();
        this.pauseButton.on('pointerdown', () => {
			this.clickSound.play();
            this.scene.pause();
            this.scene.launch('PauseScene', { gameScene: this });
        });

        if (data.loadedState) {
            this.loadGameState(data.loadedState);
        }
    }

    update() {
        // Paddle Movement
        this.paddle.setVelocityX(0);
        if (this.cursors.left.isDown) {
            this.paddle.setVelocityX(-300);
        } else if (this.cursors.right.isDown) {
            this.paddle.setVelocityX(300);
        }

        // Ball falls off screen
        if (this.ball.y > 950) {
			this.hurt.play();
			this.score = 0;
			this.scoreText.setText(`Score: ${this.score}`);
            this.resetBall();
        }
		
		if (this.ball.body.onWall() || this.ball.body.onCeiling() ) {
			this.bounce.play();
		}
		
		
		
		
    }

    hitPaddle(ball, paddle) {
		this.bounce.play();
        let diff = ball.x - paddle.x;
        ball.setVelocityX(diff * 5);
    }

    hitBrick(ball, brick) {
        if (--brick.hitsLeft <= 0) {
			this.bounce.play();
            brick.destroy();
            this.score += 10;
            this.scoreText.setText(`Score: ${this.score}`);
			
			// Check if all bricks are destroyed
			if (this.bricks.countActive() === 0) {
				console.log("win");
				this.winEvent(); // Call a method to handle the level completion
			}
			
            else if (Phaser.Math.Between(1, 100) <= 40) {
				this.spawnPowerUp(brick.x, brick.y);
				console.log('PowerUp Spawned');
			}
        } else {
            brick.setTint(0xaaaaaa);
        }
    }

	spawnPowerUp(x, y) {
        let powerUp = this.powerUps.create(x, y, Phaser.Math.Between(0, 1) ? 'expandPowerUp' : 'shrinkPowerUp');
        powerUp.setVelocityY(150);
    }

    collectPowerUp(paddle, powerUp) {
		this.score += 50;
        this.scoreText.setText(`Score: ${this.score}`);
        this[powerUp.texture.key === 'expandPowerUp' ? 'activateLargePaddle' : 'activateSmallPaddle']();
        powerUp.destroy();
        this.time.delayedCall(50000, this.resetPaddleSize, [], this);
    }

    activateLargePaddle() { this.paddle.setTexture('large_paddle'); }
    activateSmallPaddle() { this.paddle.setTexture('small_paddle'); }
    resetPaddleSize() { this.paddle.setTexture('paddle'); }

    resetBall() {
        this.ball.setPosition(Phaser.Math.Between(400,600), Phaser.Math.Between(600,700));
        this.ball.setVelocity(250, -250);
    }
	
	winEvent() {
		console.log("Game won!")
		this.winText = this.add.text(500, 500, `YOU WON!`, { fontSize: '48px', fill: '#008000' });
		this.time.delayedCall(30000, this.scene.stop('GameScene'), [], this);
		console.log("call")
		this.scene.start('HomeMenu');
	}
	
    // Save game to JSON file
	saveGame() {
        // adds score and brick locations to a dictionary
        const gameState = {
            score: this.score,
            bricks: this.bricks.getChildren().map(brick => ({
                x: brick.x,
                y: brick.y,
                type: brick.texture.key,
                hitsLeft: brick.hitsLeft
            }))
        };
        // uses blob to store into JSON format
        const gameStateJSON = JSON.stringify(gameState);
        const blob = new Blob([gameStateJSON], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'save.json';
        a.click();
        URL.revokeObjectURL(url);
    }
	
	// Load from parsed JSON
    loadGameState(state) {
        this.score = state.score;
        this.scoreText.setText(`Score: ${this.score}`);

        this.bricks.clear(true, true); // Remove existing bricks
        state.bricks.forEach(brickData => {
            let brick = this.bricks.create(brickData.x, brickData.y, brickData.type);
            brick.hitsLeft = brickData.hitsLeft;
        });
    }
}

// Pause Scene - Handles pause menu interactions
class PauseScene extends Phaser.Scene {
    constructor() {
        super('PauseScene');
		this.clickSound;
    }

	preload() {
		this.load.audio('click', 'assets/sounds/click.mp3');
	}

    create(data) {
		console.log('Pause Menu opening...') // for debugging
		this.clickSound = this.sound.add('click');
		
        this.gameScene = data.gameScene;
        this.add.rectangle(500, 500, 1000, 1000, 0x000000, 0.5); // darkens background for pause effect

        const resumeButton = this.add.text(500, 400, 'Resume', { fontSize: '32px', fill: '#fff' }).setOrigin(0.5).setInteractive();
        resumeButton.on('pointerdown', () => {
			this.clickSound.play();
            this.scene.resume('GameScene');
            this.scene.stop();
        });

        const quitButton = this.add.text(500, 500, 'Quit', { fontSize: '32px', fill: '#fff' }).setOrigin(0.5).setInteractive();
        quitButton.on('pointerdown', () => {
			this.clickSound.play();
            this.scene.stop('GameScene');
            this.scene.start('HomeMenu');
        });

        const saveQuitButton = this.add.text(500, 600, 'Save & Quit', { fontSize: '32px', fill: '#fff' }).setOrigin(0.5).setInteractive();
        saveQuitButton.on('pointerdown', () => {
			this.clickSound.play();
            this.saveGame();
        });
    }

    saveGame() {
		const gameState = {
			score: this.gameScene.score,
			bricks: this.gameScene.bricks.getChildren().map(brick => ({
				x: brick.x,
				y: brick.y,
				type: brick.texture.key,
				hitsLeft: brick.hitsLeft
			}))
		};

		const gameStateJSON = JSON.stringify(gameState);
		const blob = new Blob([gameStateJSON], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = 'gameState.json';
		a.click();
		URL.revokeObjectURL(url);

		this.scene.stop('GameScene');
		this.scene.start('HomeMenu');
	}
}

// Game Configuration
const config = {
    type: Phaser.AUTO,
    width: 1000,
    height: 1000,
    physics: { default: 'arcade', arcade: { debug: false } },
    scene: [HomeMenu, GameScene, PauseScene],
    parent: 'game-container'
};

// Start Phaser Game
const game = new Phaser.Game(config);

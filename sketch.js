// --- Key Runner Bros ---
// Endless runner where you press the key shown on the obstacle.

let player;
let obstacles = [];
let score = 0;
let gameState = 'playing'; // 'playing', 'gameOver', 'start'
let gameSpeed = 4;
let initialGameSpeed;
let groundY;

// --- Key Mechanic ---
let possibleKeys = 'abcdefghijklmnopqrstuvwxyz'; // Keys obstacles can require
let keyPressZoneFactor = 2.5; // How many player widths ahead the key must be pressed
let lastCorrectPressFrame = -100; // Track successful presses for feedback (used for obstacle color change)
let currentTargetObstacle = null; // The obstacle player needs to address

// --- Style ---
let marioColors;
let environmentColors;

// --- Background ---
let clouds = [];
let hills = [];

function setup() {
  createCanvas(windowWidth, windowHeight);
  groundY = height * 0.85; // Ground lower for more Mario feel
  initialGameSpeed = gameSpeed;

  // --- Color Palette ---
  marioColors = {
    red: color(255, 0, 0),
    blue: color(0, 0, 255),
    brown: color(165, 42, 42),
    skin: color(255, 218, 185),
    white: color(255),
    black: color(0), // Black added/confirmed
  };
  environmentColors = {
    sky: color(92, 148, 252),
    ground: color(222, 184, 135), // Tan ground
    pipeGreen: color(0, 128, 0),
    blockBrown: color(210, 105, 30),
    cloudWhite: color(255),
    hillGreen: color(34, 139, 34),
    keyText: color(255),
    keyBg: color(0, 0, 0, 180) // Semi-transparent black background for key
  };

  player = new Player();

  // Initialize background elements
  for (let i = 0; i < 5; i++) {
    spawnCloud();
    spawnHill();
  }

  spawnObstacle(); // Start with one obstacle
  noStroke();
  textAlign(CENTER, CENTER);
  textFont('monospace'); // Pixel-friendly font
  gameState = 'start'; // Start with instructions screen
}

function draw() {
  // --- Background ---
  background(environmentColors.sky);

  // Draw Hills (far background, slow scroll)
  fill(environmentColors.hillGreen);
  for (let i = hills.length - 1; i >= 0; i--) {
    let hill = hills[i];
    rect(hill.x, hill.y, hill.w, hill.h);
    hill.x -= gameSpeed * 0.2; // Slower scroll speed
    if (hill.x < -hill.w) {
        hills.splice(i, 1);
        spawnHill(width); // Spawn a new one off-screen right
    }
  }

  // Draw Clouds (mid background, medium scroll)
  fill(environmentColors.cloudWhite);
  for (let i = clouds.length - 1; i >= 0; i--) {
    let cloud = clouds[i];
    // Simple blocky cloud shapes
    rect(cloud.x, cloud.y, cloud.w, cloud.h);
    rect(cloud.x + cloud.w * 0.2, cloud.y - cloud.h * 0.3, cloud.w * 0.6, cloud.h * 1.6);
    rect(cloud.x - cloud.w * 0.2, cloud.y + cloud.h * 0.1, cloud.w * 0.6, cloud.h * 0.8);
    cloud.x -= gameSpeed * 0.5; // Medium scroll speed
     if (cloud.x < -cloud.w * 1.5) {
        clouds.splice(i, 1);
        spawnCloud(width); // Spawn new one off-screen right
    }
  }

  // --- Ground ---
  fill(environmentColors.ground);
  rect(0, groundY, width, height - groundY);
  // Add simple block pattern to ground
    fill(205, 133, 63); // Slightly darker brown
    for(let i = 0; i < width + 40; i+= 40){
       let xPos = (i - (frameCount * gameSpeed * 0.8) % 40);
       rect(xPos, groundY, 20, 10);
       rect(xPos + 20, groundY+10, 20, 10);
       rect(xPos, groundY+20, 20, 10);
        rect(xPos + 20, groundY+30, 20, 10);
    }

  // --- Game States ---
  if (gameState === 'start') {
      displayStartScreen();
  } else if (gameState === 'playing') {
    // --- Player ---
    player.update();
    player.show();

    // --- Obstacles ---
    currentTargetObstacle = null; // Reset target each frame
    let targetFound = false;

    for (let i = obstacles.length - 1; i >= 0; i--) {
      let obs = obstacles[i];
      obs.update();
      obs.show();

      // --- Target Identification ---
      // Find the closest *uncleared* obstacle within the "press zone"
      let activationDist = player.w * keyPressZoneFactor;
      if (!obs.cleared && obs.x < player.x + activationDist && obs.x + obs.w > player.x - player.w/2 && !targetFound) {
          currentTargetObstacle = obs;
          obs.isTarget = true; // Highlight the target obstacle
          targetFound = true;
      } else {
           obs.isTarget = false;
      }

      // --- Collision Check ---
      // If player hits an obstacle that HASN'T been cleared
      if (!obs.cleared && player.hits(obs)) {
        gameOver('collision');
      }

      // --- Remove Off-screen Obstacles ---
      if (obs.isOffscreen()) {
        if (!obs.cleared) {
            // If an obstacle scrolls off uncleared (player missed the key press window)
            gameOver('missed');
        } else {
            // Successfully cleared obstacle is off screen
            // score++; // Score incremented on successful key press now
        }
        obstacles.splice(i, 1);
      }
    }

    // --- Spawning ---
    // Spawn when the last obstacle is far enough away
    if (obstacles.length === 0 || (obstacles.length < 5 && obstacles[obstacles.length - 1].x < width - random(200, 500))) {
       if (random(1) < 0.015 * gameSpeed) { // Spawn rate increases slightly with speed
           spawnObstacle();
       }
    }

    // --- Info Display ---
    displayInfo();

    // --- Correct Key Press Visual Feedback ---
    /* // Comentado para remover a piscada verde
    if (frameCount - lastCorrectPressFrame < 15) { // Show green flash for 15 frames
       fill(0, 255, 0, 100);
       rect(0, 0, width, height);
    }
    */ // Fim do comentário


  } else if (gameState === 'gameOver') {
    // Show final state
     player.show();
     for (let obs of obstacles) {
         obs.show();
     }
    displayGameOver();
  }
}

function keyPressed() {
  // Start game from start screen
  if (gameState === 'start' && key) { // Any key to start
        startGame();
        return; // Prevent key press from affecting the first obstacle immediately
  }

  // Handle restart
  if (gameState === 'gameOver' && (key === 'r' || key === 'R')) {
    restartGame();
    return;
  }

  // Handle gameplay input
  if (gameState === 'playing' && currentTargetObstacle) {
    let pressedKey = key.toLowerCase();

    if (pressedKey === currentTargetObstacle.requiredKey) {
      // --- Correct Key ---
      score++;
      gameSpeed += 0.05; // Slightly increase speed on success
      player.triggerJump(); // Make player do a small hop
      currentTargetObstacle.cleared = true; // Mark obstacle as cleared
      currentTargetObstacle.isTarget = false; // No longer the target
      lastCorrectPressFrame = frameCount; // For obstacle color feedback
      currentTargetObstacle = null; // Clear target immediately
      // Maybe add a sound effect here
    } else {
       // --- Wrong Key ---
       if (/[a-z0-9]/.test(pressedKey)) { // Only trigger game over for actual letter/number keys
           gameOver('wrong key');
       }
    }
  }
}

// --- Helper Functions ---

function spawnObstacle() {
  obstacles.push(new Obstacle());
}

function spawnCloud(xPos = random(width * 1.5)) {
    let cloudW = random(60, 120);
    let cloudH = random(20, 40);
    let cloudY = random(height * 0.1, height * 0.4);
    clouds.push({ x: xPos, y: cloudY, w: cloudW, h: cloudH });
}

function spawnHill(xPos = random(width * 1.5)) {
    let hillW = random(150, 400);
    let hillH = random(50, groundY * 0.5);
    let hillY = groundY - hillH;
    hills.push({ x: xPos, y: hillY, w: hillW, h: hillH });
}


function displayInfo() {
  fill(marioColors.black);
  textSize(24);
  textAlign(LEFT, TOP);
  text(`SCORE: ${score}`, 20, 20);
  textAlign(RIGHT, TOP);
   text(`SPEED: ${gameSpeed.toFixed(1)}`, width - 20, 20);

  // Gameplay instruction
  textAlign(CENTER, TOP);
  fill(marioColors.black);
  textSize(18);
  text('Press the key shown on the block!', width / 2, 20);
}

function displayStartScreen() {
    fill(0, 0, 0, 150); // Dark overlay
    rect(0, 0, width, height);

    fill(marioColors.white);
    textSize(48);
    textAlign(CENTER, CENTER);
    text('Key Runner Bros Ruivo', width / 2, height / 2 - 80);

    textSize(24);
    text('Press the letter shown on the incoming obstacle!', width / 2, height / 2);
    text('Miss a key or hit the obstacle, and it\'s GAME OVER.', width / 2, height / 2 + 40);

    textSize(28);
    fill(255, 255, 0); // Yellow text
    text('Press ANY KEY to Start', width / 2, height / 2 + 100);
}


function displayGameOver() {
  fill(255, 0, 0, 150); // Red overlay
  rect(0, 0, width, height);

  fill(marioColors.white);
  textSize(60);
  textAlign(CENTER, CENTER);
  text('GAME OVER', width / 2, height / 2 - 60);

  textSize(32);
  text(`Final Score: ${score}`, width / 2, height / 2);

  textSize(24);
  text('Press [R] to Restart', width / 2, height / 2 + 60);
}

function startGame() {
    gameState = 'playing';
    // Reset score/speed here IF you want restart to go back to start screen
    // Otherwise, reset is handled in restartGame()
}

function gameOver(reason) {
  console.log("Game Over Reason:", reason); // For debugging
  gameState = 'gameOver';
  // Optional: Add effects based on reason
}

function restartGame() {
  score = 0;
  obstacles = [];
  gameSpeed = initialGameSpeed;
  player = new Player(); // Reset player state
  currentTargetObstacle = null;
  spawnObstacle();
  lastCorrectPressFrame = -100;
  frameCount = 0; // Reset frameCount if needed for animations/timers
  gameState = 'playing';
}

// Handle window resizing
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  groundY = height * 0.85;
  player.y = groundY - player.h / 2; // Adjust player Y
   player.groundLevel = groundY - player.h / 2;

   // Respawn background elements to fit new size might be simplest
    clouds = [];
    hills = [];
    for (let i = 0; i < 5; i++) {
        spawnCloud();
        spawnHill();
    }
}

// --- Classes ---

class Player {
  constructor() {
    this.w = 40; // Width
    this.h = 55; // Height
    this.x = 80;
    this.groundLevel = groundY - this.h / 2;
    this.y = this.groundLevel;
    this.vy = 0; // Vertical velocity
    this.gravity = 0.6;
    this.jumpForce = -10; // Smaller jump force for a hop
    this.isJumping = false;
    this.jumpFrames = 0; // How long the jump animation lasts
  }

  triggerJump() {
    // Only jump if on the ground
    if (this.y >= this.groundLevel - 1) {
      this.vy = this.jumpForce;
      this.isJumping = true;
      this.jumpFrames = 0;
    }
  }

  hits(obstacle) {
    // AABB collision detection
    let playerLeft = this.x - this.w / 2;
    let playerRight = this.x + this.w / 2;
    let playerTop = this.y - this.h / 2;
    let playerBottom = this.y + this.h / 2;

    let obsLeft = obstacle.x;
    let obsRight = obstacle.x + obstacle.w;
    let obsTop = obstacle.y;
    let obsBottom = obstacle.y + obstacle.h;

    return playerRight > obsLeft &&
           playerLeft < obsRight &&
           playerBottom > obsTop &&
           playerTop < obsBottom;
  }

  update() {
      // Apply gravity only if jumping
      if (this.isJumping) {
          this.y += this.vy;
          this.vy += this.gravity;
          this.jumpFrames++;

          // Land back on the ground
          if (this.y >= this.groundLevel) {
              this.y = this.groundLevel;
              this.vy = 0;
              this.isJumping = false;
          }
      } else {
           this.y = this.groundLevel; // Ensure player stays grounded if not jumping
      }
  }

  show() {
    push();
    translate(this.x, this.y);
    rectMode(CENTER);
    noStroke();

    // Simple Pixel Mario Style
    // Legs (alternate slightly for running illusion)
    let legOffset = (frameCount % 20 < 10) ? -2 : 2;
     fill(marioColors.blue); // Overalls are main body part
    if (this.isJumping) { // Legs tucked up when jumping
        rect(0, this.h * 0.2, this.w * 0.7, this.h * 0.3); // Body part of overalls
        // Feet/shoes visible below jump body
        fill(marioColors.brown); // Shoes
        rect(-this.w * 0.2, this.h * 0.35, this.w * 0.3, this.h * 0.15);
        rect( this.w * 0.2, this.h * 0.35, this.w * 0.3, this.h * 0.15);
    } else { // Legs when running
        rect(0, this.h * 0.15, this.w * 0.7, this.h * 0.4); // Body part of overalls
        fill(marioColors.brown); // Shoes
        rect(-this.w * 0.2 + legOffset, this.h * 0.4, this.w * 0.3, this.h * 0.2); // Left leg/shoe
        rect( this.w * 0.2 - legOffset, this.h * 0.4, this.w * 0.3, this.h * 0.2); // Right leg/shoe
    }


    // Torso & Head (Red Shirt/Hat)
    fill(marioColors.red);
    rect(0, -this.h * 0.15, this.w, this.h * 0.4); // Shirt

    // Arms (simplified)
    fill(marioColors.red);
    rect(-this.w*0.4, -this.h * 0.1, this.w * 0.2, this.h*0.3);
    rect( this.w*0.4, -this.h * 0.1, this.w * 0.2, this.h*0.3);
    // Hands
    fill(marioColors.skin);
     rect(-this.w*0.45, this.h * 0.1, this.w * 0.15, this.h*0.15);
     rect( this.w*0.45, this.h * 0.1, this.w * 0.15, this.h*0.15);


    // Head
    fill(marioColors.skin);
    rect(0, -this.h * 0.35, this.w * 0.6, this.h * 0.3); // Face

    // Hat (Wizard Style) - MODIFICADO
    fill(marioColors.black); // Usar preto

    // Brim (Aba) - Um retângulo um pouco mais largo
    rect(0, -this.h * 0.4, this.w * 0.9, this.h * 0.1); // y ligeiramente mais baixo que o início do cone, largura maior

    // Pointy Part (Parte Pontuda) - Um triângulo alto
    let hatBaseY = -this.h * 0.4; // Base do cone na mesma altura da aba
    let hatTipY = -this.h * 0.9; // Ponta bem mais alta
    let hatWidth = this.w * 0.7; // Largura da base do cone
    triangle(
      -hatWidth / 2, hatBaseY, // Ponto esquerdo da base
       hatWidth / 2, hatBaseY, // Ponto direito da base
       0, hatTipY             // Ponta do chapéu (centralizada)
    );


    pop();
  }
}

class Obstacle {
  constructor() {
    this.h = random(40, 80); // Height
    this.type = random(1) > 0.4 ? 'pipe' : 'block'; // Pipe or Block

    if (this.type === 'pipe') {
      this.w = 50; // Pipes are wider
      this.color = environmentColors.pipeGreen;
    } else {
      this.w = 40; // Blocks are squarer
       this.color = environmentColors.blockBrown;
    }

    this.x = width; // Start off-screen right
    this.y = groundY - this.h;
    this.requiredKey = random(possibleKeys.split('')); // Assign a random key
    this.cleared = false; // Has the correct key been pressed?
    this.isTarget = false; // Is this the current obstacle to handle?
  }

  update() {
    this.x -= gameSpeed;
  }

  isOffscreen() {
    return this.x < -this.w;
  }

  show() {
    push();
    rectMode(CORNER);

    // Draw Obstacle Body
    fill(this.color);
    if (this.type === 'pipe') {
        rect(this.x, this.y, this.w, this.h);
        // Pipe top rim
        fill(0, 100, 0); // Darker green
        rect(this.x - 5, this.y, this.w + 10, 15);
    } else { // Block
        rect(this.x, this.y, this.w, this.h);
        // Block details (rivets/lines)
         fill(160, 82, 45); // Darker brown
         rect(this.x + 5, this.y + 5, 5, 5); // Top-left rivet
         rect(this.x + this.w - 10, this.y + 5, 5, 5); // Top-right
         rect(this.x + 5, this.y + this.h - 10, 5, 5); // Bottom-left
         rect(this.x + this.w - 10, this.y + this.h - 10, 5, 5); // Bottom-right
         // Maybe a line for texture
         rect(this.x + 5, this.y + this.h / 2 - 2, this.w - 10, 4);
    }


    // --- Draw the Required Key ---
    let keyTextSize = Math.max(20, this.h * 0.4); // Scale text size with obstacle height
    textSize(keyTextSize);
    let keyYpos = this.y + this.h / 2; // Center vertically
    let keyXpos = this.x + this.w / 2; // Center horizontally

    // Draw background for key if it's the target or recently cleared
     if (this.isTarget || (this.cleared && frameCount - lastCorrectPressFrame < 15)) { // Still use lastCorrectPressFrame here for key feedback
        fill(environmentColors.keyBg);
        ellipse(keyXpos, keyYpos, keyTextSize * 1.8, keyTextSize * 1.8); // Circle background
    }
    // Change color if target
    if(this.isTarget) {
        fill(255, 255, 0); // Yellow when targeted
    } else if (this.cleared) {
        fill(0, 255, 0); // Green when cleared
    }
     else {
        fill(environmentColors.keyText); // Default white
    }

    textAlign(CENTER, CENTER);
    text(this.requiredKey.toUpperCase(), keyXpos, keyYpos); // Display key in uppercase


    pop();
  }
}

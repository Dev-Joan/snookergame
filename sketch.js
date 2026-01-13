

// Matter.js aliases for easier reference
const Engine = Matter.Engine,
  World = Matter.World,
  Bodies = Matter.Bodies,
  Body = Matter.Body;

// Physics engine and world
let engine, world;

// Table and ball parameters
let tableWidth, tableHeight, ballDiameter, pocketDiameter;

// Array to hold all balls
let balls = [];
let cueBall = null; // Special white cue ball
let isPlacingCueBall = true; // Flag to control cue ball placement
let score = 0; // Keep track of points
let gameState = "PLAY"; // Could be extended for future game states

// Pockets for the balls to fall into
let pockets = [];

// Visual effects
let trails = []; // Trails behind moving balls
let impactEffects = []; // Small bursts when balls pocketed or hit

// Map colors to points
const ballValues = { red: 1, yellow: 2, green: 3, brown: 4, blue: 5, pink: 6, black: 7, white: 0 };

// Cue stick aiming angle
let cueAngle = 0;

function setup() {
  createCanvas(1100, 700); // Canvas size for our pool table

  engine = Engine.create(); // Create Matter.js engine
  world = engine.world;
  world.gravity.y = 0; // No gravity in top-down pool simulation

  // FIX: Increase engine precision to prevent balls passing through each other
  engine.positionIterations = 10;
  engine.velocityIterations = 10;

  calculateTableDimensions(); // Dynamically set table and ball sizes
  createCushions(); // Add table cushions as static bodies
  createPockets(); // Define pocket positions

  createUI(); // Buttons for different modes and restart
  setupMode1(); // Start with default arrangement
}

// Calculate table and ball sizes based on table width
function calculateTableDimensions() {
  tableWidth = 900;
  tableHeight = tableWidth / 2;
  ballDiameter = tableWidth / 36; // Balls proportional to table
  pocketDiameter = ballDiameter * 1.5; // Slightly bigger than balls
}

// Create static cushions (walls) around table
function createCushions() {
  const t = 100; // Thickness of cushions
  const options = { isStatic: true, restitution: 0.6, friction: 0.1, slop: 0.01 };
  // Top, bottom, left, right cushions
  World.add(world, [
    Bodies.rectangle(0, -tableHeight / 2 - t / 2, tableWidth + t * 2, t, options),
    Bodies.rectangle(0, tableHeight / 2 + t / 2, tableWidth + t * 2, t, options),
    Bodies.rectangle(-tableWidth / 2 - t / 2, 0, t, tableHeight + t * 2, options),
    Bodies.rectangle(tableWidth / 2 + t / 2, 0, t, tableHeight + t * 2, options),
  ]);
}

// Define pocket positions (6 standard pockets)
function createPockets() {
  let w = tableWidth / 2;
  let h = tableHeight / 2;
  pockets = [[-w, -h], [0, -h], [w, -h], [-w, h], [0, h], [w, h]];
}

function draw() {
  background(40); // Dark background to make table pop
  Engine.update(engine); // Update physics engine

  push();
  translate(width / 2, height / 2); // Center table on canvas

  // 1. Draw table frame (wooden border)
  rectMode(CENTER);
  fill(60, 30, 10); noStroke();
  rect(0, 0, tableWidth + 40, tableHeight + 40, 15);

  // 2. Draw green felt
  fill(30, 110, 45);
  rect(0, 0, tableWidth, tableHeight, 5);

  // 3. Table markings (baulk line & semicircle)
  stroke(255, 120); strokeWeight(2);
  let baulkX = -tableWidth / 4;
  line(baulkX, -tableHeight / 2, baulkX, tableHeight / 2);
  noFill();
  arc(baulkX, 0, (tableHeight / 3) * 2, (tableHeight / 3) * 2, HALF_PI, -HALF_PI);

  // 4. Draw pockets
  fill(0); noStroke();
  pockets.forEach(p => ellipse(p[0], p[1], pocketDiameter));

  // 5. Draw trails behind moving balls
  for (let i = trails.length - 1; i >= 0; i--) {
    let t = trails[i];
    fill(t.color.levels[0], t.color.levels[1], t.color.levels[2], t.alpha);
    noStroke();
    ellipse(t.x, t.y, ballDiameter);
    t.alpha -= 5; // Fade out over time
    if (t.alpha <= 0) trails.splice(i, 1); // Remove faded trails
  }

  // 6. Update & draw all balls
  for (let i = balls.length - 1; i >= 0; i--) {
    let b = balls[i];
    let pos = b.body.position;

    // Add a trail if the ball is moving
    if (b.body.speed > 0.5) trails.push({ x: pos.x, y: pos.y, color: color(b.color), alpha: 100 });

    // FIX: Cap ball speed to avoid them "escaping" physics simulation
    let maxSpeed = 14;
    if (b.body.speed > maxSpeed) {
      let speedScale = maxSpeed / b.body.speed;
      Body.setVelocity(b.body, { 
        x: b.body.velocity.x * speedScale, 
        y: b.body.velocity.y * speedScale 
      });
    }

    b.draw(); // Call ball's draw method

    // Check if ball fell into a pocket
    let inPocket = pockets.some(p => dist(pos.x, pos.y, p[0], p[1]) < pocketDiameter / 1.8);

    // Safety check for balls escaping table
    let isOOB = (abs(pos.x) > tableWidth/2 + 20 || abs(pos.y) > tableHeight/2 + 20);

    if (inPocket || isOOB) {
      if (b === cueBall) { // Cue ball goes back to placement
        cueBall = null; 
        isPlacingCueBall = true; 
      } else {
        if (!isOOB) score += ballValues[b.color] || 1; // Add score if not out-of-bounds
        impactEffects.push({ x: pos.x, y: pos.y, radius: ballDiameter, alpha: 200 }); // Small visual effect
      }
      World.remove(world, b.body); // Remove ball from physics world
      balls.splice(i, 1); // Remove ball from array
    }
  }

  pop();

  // 7. Draw cue stick aiming at mouse
  if (!isPlacingCueBall && cueBall) {
    let bPos = cueBall.body.position;
    let mX = mouseX - width / 2;
    let mY = mouseY - height / 2;

    cueAngle = atan2(mY - bPos.y, mX - bPos.x); // Angle of cue stick

    // Dotted aiming line
    push();
    translate(width / 2, height / 2);
    stroke(255, 100);
    strokeWeight(1.5);
    drawingContext.setLineDash([5, 10]);
    line(bPos.x, bPos.y, bPos.x - cos(cueAngle) * 400, bPos.y - sin(cueAngle) * 400);
    drawingContext.setLineDash([]);
    pop();

    // Cue stick visual at mouse
    push();
    translate(mouseX, mouseY);
    rotate(cueAngle);
    let cueDistance = mouseIsPressed ? 50 : 25; // Pull back stick when holding mouse
    noStroke();
    fill(210, 180, 140); // Light wood color
    quad(cueDistance, -3, cueDistance + 280, -7, cueDistance + 280, 7, cueDistance, 3);
    fill(45, 25, 10); // Dark tip
    quad(cueDistance + 180, -5, cueDistance + 280, -7, cueDistance + 280, 7, cueDistance + 180, 5);
    fill(60, 120, 240); // Blue stripe decoration
    rect(cueDistance, -2, 5, 4);
    pop();
  }

  // 8. Impact visual effects when balls pocketed
  for (let i = impactEffects.length - 1; i >= 0; i--) {
    let e = impactEffects[i];
    noFill();
    stroke(255, 200, 0, e.alpha);
    strokeWeight(3);
    ellipse(e.x + width / 2, e.y + height / 2, e.radius);
    e.radius += 2; // Expand effect
    e.alpha -= 10; // Fade out
    if (e.alpha <= 0) impactEffects.splice(i, 1); // Remove faded effects
  }

  // 9. Draw UI (score and instructions)
  fill(255); noStroke(); textSize(24); textAlign(LEFT);
  text(`SCORE: ${score}`, 50, 50);
  if (isPlacingCueBall) {
    textAlign(CENTER); fill(255, 255, 0);
    text("PLACE CUE BALL IN THE 'D'", width / 2, 50);
  }
}

// Ball class represents each individual ball
class Ball {
  constructor(x, y, color) {
    this.body = Bodies.circle(x, y, ballDiameter / 2, {
      restitution: 0.85, friction: 0.005, frictionAir: 0.018, density: 0.01
    });
    this.color = color;
    World.add(world, this.body); // Add to physics world
  }
  draw() {
    let pos = this.body.position;
    fill(this.color); noStroke();
    ellipse(pos.x, pos.y, ballDiameter);
    fill(255, 80); ellipse(pos.x - 4, pos.y - 4, ballDiameter / 3); // Simple highlight
  }
}

// Handle cue ball placement inside baulk 'D'
function mousePressed() {
  if (!isPlacingCueBall) return;
  let relX = mouseX - width / 2;
  let relY = mouseY - height / 2;
  let baulkX = -tableWidth / 4;
  let dRadius = tableHeight / 3;
  if (relX <= baulkX && dist(relX, relY, baulkX, 0) <= dRadius) {
    cueBall = new Ball(relX, relY, 'white');
    balls.push(cueBall);
    isPlacingCueBall = false;
  }
}

// Apply force to cue ball when mouse released
function mouseReleased() {
  if (!cueBall || isPlacingCueBall) return;
  let bPos = cueBall.body.position;
  let force = {
    x: (bPos.x - (mouseX - width / 2)) * 0.0025,
    y: (bPos.y - (mouseY - height / 2)) * 0.0025
  };
  Body.applyForce(cueBall.body, bPos, force); // Shoot cue ball
  impactEffects.push({ x: bPos.x, y: bPos.y, radius: ballDiameter, alpha: 200 });
}

// Quick keyboard shortcuts to switch modes
function keyPressed() {
  if (key === '1') setupMode1();
  if (key === '2') setupMode2();
  if (key === '3') setupMode3();
}

// Clear the table of all balls and reset score
function clearTable() {
  balls.forEach(b => World.remove(world, b.body));
  balls = []; cueBall = null; isPlacingCueBall = true; score = 0;
}

// Default mode setup (simple arrangement)
function setupMode1() {
  clearTable();
  let b = ballDiameter;
  balls.push(new Ball(-tableWidth / 4, 0, 'brown'), new Ball(-tableWidth / 4, 50, 'yellow'), new Ball(-tableWidth / 4, -50, 'green'));
  balls.push(new Ball(0, 0, 'blue'), new Ball(tableWidth / 4, 0, 'pink'), new Ball(tableWidth / 2 - 60, 0, 'black'));
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c <= r; c++) balls.push(new Ball(tableWidth / 4 + 20 + r * b * 0.85, (c - r / 2) * b, 'red'));
  }
}

// Clustered balls mode (chaotic arrangement)
function setupMode2() {
  clearTable();
  const cluster = (x, y) => {
    for (let i = 0; i < 5; i++) balls.push(new Ball(x + random(-30, 30), y + random(-30, 30), 'red'));
  };
  cluster(0, 0);
  cluster(300, -120);
  cluster(300, 120);
  balls.push(new Ball(0, -100, 'blue'), new Ball(380, 0, 'black'));
}

// More structured mode (pyramid-like)
function setupMode3() {
  clearTable();
  let b = ballDiameter;
  let startX = -tableWidth / 4 + 60 + 250;
  balls.push(new Ball(startX - b * 2, 0, 'blue'));
  for (let i = -4; i <= 4; i++) balls.push(new Ball(startX, i * b, 'red'));
  for (let i = 1; i <= 3; i++) balls.push(new Ball(startX + (i * b), 0, 'red'));
  let redClusterEndX = startX + 3 * b;
  balls.push(new Ball(redClusterEndX + b, 0, 'black'));
}

// Setup simple UI buttons for modes and restart
function createUI() {
  let btn1 = createButton('Mode 1'); btn1.position(20, 650); btn1.mousePressed(setupMode1);
  let btn2 = createButton('Mode 2'); btn2.position(100, 650); btn2.mousePressed(setupMode2);
  let btn3 = createButton('Mode 3'); btn3.position(180, 650); btn3.mousePressed(setupMode3);
  let reset = createButton('RESTART'); reset.position(280, 650); reset.style('background', 'red'); reset.style('color', 'white'); reset.mousePressed(setupMode1);
}

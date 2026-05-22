let fontMain, fontSmall; 
let systems = [];  // Array to hold the 3 circular text systems ("NO", "MORE", "SILENCE")

// DOT SYSTEM
let dots = [];     // 2D grid holding all the background dot objects
let colsDots, rowsDots;  // Grid dimensions (how many columns and rows of dots fit on screen)
let baseDotSize = 40;  // Size of dots
let dotSize, dotMargin;  // Real-time calculated dot size and spacing between them
let dotSpeed = 0.03; 

// GRID SYSTEM
let columns = 12;       
let rows = 8;            
let margin = 80;       
let colW_Virtual, rowH_Virtual; // The width and height of each virtual grid cell

// TYPO SYSTEM
let alphabet = {};  // A dictionary/lookup map to store our custom glitched text graphics
let chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789., "; 
let pixel_size = 2;      

// GLOBAL CONTROL
let globalResolved = false;    // False = text is broken/scrambled; True = text snaps together legibly
let globalClicksToResolve = 0; // Countdown tracker for how many clicks are left to fix the text

// AUDIO
let soundFile = null;  
let isPlaying = false;   // Audio state tracker (is the track playing or paused?)
let amplitude;           // Volume analyzer to make visuals dance to the beat

//let clickSound = null;

let hoverSound = null;
let wasHovering = false;

let heartbeatSound = null;
let heartbeatPlaying = false;

let glitchSound = null;

let paperSound = null; 
let isPaperPlaying = false;

// RESPONSIVE LOGIC
let isMobile = false;    // Switch flag: triggers layout changes if on a phone
let mobileCanvasHeight = 1700; // Fixed tall height for scrolling on mobile devices
let prevWindowWidth;     // Back-up tracker to check if window size actually changed on resize

// BUTTON
let btnX, btnY, btnW, btnH; 

// IMAGES
let imgLips, imgWoman;   

/* PRELOAD LIFECYCLE
 * Loads all heavy assets (fonts, images, audio) into memory before the sketch starts.
 * If the audio fails to load, it catches the error and logs it to the console.
 */
function preload() {
  fontMain = loadFont("fonts/Rodchenko W08 Bold.ttf");
  fontSmall = loadFont("fonts/impact.ttf");

  imgLips = loadImage("assets/lips.png");
  imgWoman = loadImage("assets/women.png");

  soundFile = loadSound(
    "phuc-sounds/mixed-radio.wav",
    () => { console.log("Audio loaded"); },
    (err) => { console.error("Error loading audio:", err); }
  );
  
  //clickSound = loadSound("phuc-sounds/mouse click.wav");
  hoverSound = loadSound("phuc-sounds/mouse drag.wav");
  
  heartbeatSound = loadSound("phuc-sounds/heartbeat.wav");
  
  glitchSound = loadSound("phuc-sounds/glitch.wav");
  
  paperSound = loadSound("phuc-sounds/paper texture.wav", 
    () => { console.log("Paper sound loaded"); },
    (err) => { console.error("Error loading paper sound:", err); }
  );
}

function setup() {
  prevWindowWidth = windowWidth;
  
  colorMode(HSB, 360, 100, 100, 255);
  
  computeLayout();
  createAlphabet();
  createSystems(); 
  checkLayout(); 

  globalClicksToResolve = floor(random(2, 6));

  amplitude = new p5.Amplitude();
  amplitude.smooth(0.6); // Damps the audio data so visuals don't jitter too violently
  if (soundFile && soundFile.isLoaded()) {
    amplitude.setInput(soundFile);
    soundFile.setVolume(0.55);
  }
  
  if (hoverSound) {
  hoverSound.playMode('restart');
  hoverSound.setVolume(0.2);
  }
  
  if (heartbeatSound) {
  heartbeatSound.setVolume(0.4);
  heartbeatSound.loop();        // luôn chạy nền
  heartbeatSound.stop();        // nhưng mặc định tắt
}
  
  if (glitchSound) {
  glitchSound.playMode('restart');
  glitchSound.setVolume(0.3);
}
  
  if (paperSound) {
    paperSound.setVolume(0.5);
  }
}

/* RESPONSIVE RE-INDEXER
 * Listens for window resizing. It locks out vertical-only resizing (like mobile browser address bars hiding)
 * and only recalculates layout parameters if the horizontal window width changes.
 */
function windowResized() {
  if (windowWidth !== prevWindowWidth) {
    prevWindowWidth = windowWidth;
    checkLayout(); 
  }
}

/* SCREEN CONFIGURATION AUDIT
 * Checks if the screen width is smaller than 1024px (Mobile layout).
 * - Mobile: Forces a scrolling tall canvas (1700px height).
 * - Desktop: Fits perfectly to the browser window size.
 * Re-runs layout math and regenerates background dot arrays to match the new canvas boundaries.
 */
function checkLayout() {
  isMobile = windowWidth < 1024;
  
  if (isMobile) {
    resizeCanvas(windowWidth, mobileCanvasHeight);
  } else {
    resizeCanvas(windowWidth, windowHeight);
  }
  
  computeLayout();
  createDotField(); 
}

/* LAYOUT COORDINATE COMPUTER
 * Sets inner padding margins (dense 40px for mobile, spacious 80px for desktop).
 * Calculates standard desktop grid cell dimensions based on a master 1920x1080 canvas blueprint.
 * Sizes the interactive button structure contextually depending on the device.
 */
function computeLayout() {
  margin = isMobile ? 40 : 80; 
  
  colW_Virtual = (1920 - 80 * 2) / 12;
  rowH_Virtual = (1080 - 80 * 2) / 8;
  
  if (isMobile) {
    btnW = 140; 
    btnH = 45;
  } else {
    btnW = colW_Virtual * 1.5;
    btnH = rowH_Virtual * 0.5;
  }
}

/* TYPOGRAPHIC SYSTEM BUILDER
 * Generates and positions the 3 circular, kinetic text rings on the canvas.
 * Takes the text string, an anchor X position, an anchor Y position, and a layout diameter.
 */
function createSystems() {
  systems = [];
  let vMargin = 80;
  systems.push(new CircularType("NO", vMargin + colW_Virtual * 8, vMargin + rowH_Virtual * 1.2, 320));
  systems.push(new CircularType("MORE", vMargin + colW_Virtual * 10.4, vMargin + rowH_Virtual * 2.5, 440));
  systems.push(new CircularType("SILENCE", vMargin + colW_Virtual * 8.2, vMargin + rowH_Virtual * 5.5, 600));
}

/* DOT BACKGROUND FIELD GENERATOR
 * Fills the screen backdrop canvas with a grid of calculated point matrices.
 * Determines how many columns and rows of dots can fit onto the screen safely.
 * Calculates spatial distance formulas from the center of the screen to give each dot a specific phase angle and size offset.
 */
function createDotField() {
  let canvasW = isMobile ? width : 1920;
  let canvasH = isMobile ? height : 1080;
  
  dotSize = max(8, floor(min(canvasW, canvasH) * 0.018));
  if (isMobile) dotSize = max(8, floor(width * 0.025)); 
  dotMargin = floor(dotSize * 0.5);
  
  colsDots = floor((canvasW - dotMargin * 2) / dotSize);
  rowsDots = floor((canvasH - dotMargin * 2) / dotSize);

  dots = [];
  for (let i = 0; i < colsDots; i++) {
    dots[i] = [];
    for (let j = 0; j < rowsDots; j++) {
      let x = dotMargin + dotSize / 2 + i * dotSize;
      let y = dotMargin + dotSize / 2 + j * dotSize;

      let distance = dist(x, y, canvasW / 2, canvasH / 2);
      let angle = map(distance, 0, canvasW / 2, 0, TWO_PI * 3);
      let scl = map(distance, 0, canvasW / 2, 0.05, 0.03);

      dots[i][j] = new Dot(x, y, angle, dotSpeed, scl);
    }
  }
}

function draw() {
  background(0);

  // Get current vertical scroll distance to keep UI sticky on mobile screens
  let currentScrollY = window.scrollY || document.documentElement.scrollTop;

  if (!isMobile) {
    
    // DESKTOP
    let scaleF = min(width / 1920, height / 1080); 
    let transX = (width - 1920 * scaleF) / 2;       // Letterbox horizontal offset center point buffer
    let transY = (height - 1080 * scaleF) / 2;      // Letterbox vertical offset center point buffer

    push(); 
    translate(transX, transY); // Center canvas on the monitor screen
    scale(scaleF); // Uniform scale everything to fit window dimensions safely

    drawGridVirtual(); // Render the subtle background design layout guide lines
    drawDotField();    // Update and draw the interactive backdrop background dot array field

    push();
    tint(0, 0, 100); 
    if (imgLips) {
      imageMode(CORNER);
      image(imgLips, 80 + 400, 80 - 150, 549, 366); 
    }
    if (imgWoman) {
      imageMode(CENTER);
      let midLeftX = 80 + ((1920 / 2) - 80 * 1.5) / 2;
      let midLeftY = 1080 / 2;
      image(imgWoman, midLeftX + 150, midLeftY, 1423, 801);
    }
    pop();

    // Loop through the 3 animated circular text ring blocks
    for (let s of systems) {
      s.update();   // Step current inner slice transition rot values forward
      s.display();  // Slice and paste graphic layout textures on screen
    }

    push();
    fill(0, 0, 100);
    textFont(fontSmall);
    textSize(45);
    textAlign(LEFT, BOTTOM);
    text("COMRADES, THERE IS NO TRUE SOCIAL REVOLUTION\nWITHOUT THE LIBERATION OF WOMEN.", 80, 1080 - 80);
    pop();

    btnX = 80; 
    btnY = 80; 
    drawButtonLogic(btnX, btnY, scaleF, transX, transY);

    pop(); 
  } else {
   
    // MOBILE: TOP-DOWN LINEAR STACKING LAYOUT
    drawGridMobile(); 
    drawDotField();    

    let uniformGap = 60; // Standard spacing separation buffer block used between elements

    // Scale images proportionally down so they fit mobile device width constraints bounds
    let imgScale = width / 1423 * 0.9; 
    let wLips = 549 * imgScale * 1.2;
    let hLips = 366 * imgScale * 1.2;
    let wWoman = 1423 * imgScale;
    let hWoman = 801 * imgScale;

    // Element 1: Y-start calculation right beneath top padding margin plus button height blocks
    let contentStartY = margin + btnH + uniformGap;

    // Element 2: Position LIPS image
    let lipsTopY = contentStartY - 100;
    let lipsCenterY = lipsTopY + hLips / 2; // Find center target for image(CENTER) mode rendering properties

    // Element 3: Stack WOMAN graphic directly beneath lips using uniform gap logic math
    let womanTopY = lipsTopY - 100 + hLips + uniformGap;
    let womanCenterY = womanTopY + hWoman / 2;

    push();
    tint(0, 0, 100);
    imageMode(CENTER);
    if (imgLips) image(imgLips, width / 2, lipsCenterY, wLips, hLips);
    if (imgWoman) image(imgWoman, width / 2 + 70, womanCenterY, wWoman, hWoman);
    pop();

    // Element 4: Stack core text propaganda quote statement block under woman artwork layer
    let textTopY = womanTopY - 50 + hWoman + uniformGap;
    
    push();
    fill(0, 0, 100);
    textFont(fontSmall);
    let tSize = width * 0.045; // Dynamic font sizing based directly on hardware phone screens width metrics
    textSize(tSize);
    textAlign(CENTER, TOP); 
    textLeading(tSize * 1.15); // Format tracking spacing row heights preventing overlaps strings
    text("COMRADES, THERE IS NO TRUE SOCIAL REVOLUTION\nWITHOUT THE LIBERATION OF WOMEN.", width / 2, textTopY);
    pop();

    // Mathematically find out exactly where the text block bottom edge ends
    let bottomOfText = textTopY + (tSize * 1.15) * 2; 

    // Element 5: Stack kinetic ring group systems directly after the text block ends
    let circleGroupTopY = bottomOfText + uniformGap; 
    
    let circleScale = min(width / 1920 * 1.6, 0.5); // Prevent rings scaling so large they clip past viewport edge limits
    let vCenterX = (systems[0].x + systems[1].x + systems[2].x) / 3; // Find the average layout baseline center map indices
    let vTopY = systems[0].y - (systems[0].size / 2); 
    
    push();
    translate(width / 2, circleGroupTopY); // Center text rings on mobile layout width centerline
    scale(circleScale); 
    translate(-vCenterX, -vTopY); 
    
    for (let s of systems) {
      s.update();
      s.display();
    }
    pop();

    // AUDIO INTERFACE CONTROL BUTTON (Sticky Top layout configuration anchors tracks)
    btnX = margin;
    btnY = margin + currentScrollY; // Multiplies screen scrolling distance factors keeping items static locked at top views
    drawButtonLogic(btnX, btnY, 1, 0, 0); 
  }

  // Master Graphic Filter: Quantizes canvas data into sharp pure raw black and white pixels profiles
  filter(THRESHOLD, 0.4);
}

/* INTERACTIVE BUTTON LOGIC & INTERFACE
 * Handles rendering states for the media track dashboard switch controller.
 * Converts matrix-transformed mouse pointer targets accurately contextually per device scales setups.
 * Triggers full vector color inverting switches upon detecting active cursor hover collisions boundaries.
 */
function drawButtonLogic(bx, by, scaleF, tX, tY) {
  let mx = isMobile ? mouseX : (mouseX - tX) / scaleF;
  let my = isMobile ? mouseY : (mouseY - tY) / scaleF;
  
  let isHover = mx >= bx && mx <= bx + btnW && my >= by && my <= by + btnH;
  
  if (isHover && !wasHovering) {
  if (hoverSound && hoverSound.isLoaded()) {
    hoverSound.play();
  }
}

wasHovering = isHover;
  
  push();
  if (isHover) {
    fill(0, 0, 100); stroke(0, 0, 0);
  } else {
    fill(0, 0, 0); stroke(0, 0, 100);
  }
  strokeWeight(2);
  rect(bx, by, btnW, btnH);

  let btnText = "PLAY AUDIO";
  if (!soundFile || !soundFile.isLoaded()) btnText = "LOADING...";
  else if (isPlaying) btnText = "STOP AUDIO";

  if (isHover) fill(0, 0, 0); else fill(0, 0, 100);
  noStroke();
  textFont(fontSmall);
  textSize(isMobile ? 18 : 22); 
  textAlign(CENTER, CENTER);
  text(btnText, bx + btnW / 2, by + btnH / 2 - 2);
  pop();
}

/* DESKTOP ALIGNMENT GUIDE MATRIX
 * Draws a 12-column, 8-row layout blueprint helper matrix across desktop canvas dimensions.
 * Visible purely as ultra-thin low opacity grid lines checking alignment balance configurations.
 */
function drawGridVirtual() {
  stroke(0, 0, 100, 60); strokeWeight(0.25); noFill();
  for (let i = 0; i < 12; i++) {
    for (let j = 0; j < 8; j++) {
      rect(80 + i * colW_Virtual, 80 + j * rowH_Virtual, colW_Virtual, rowH_Virtual);
    }
  }
}

/* MOBILE ALIGNMENT GUIDE MATRIX
 * Draws a dense 6-column square grid layout blueprint checking balance parameters properties
 * safely on extended vertically stacked smartphone viewport displays formats.
 */
function drawGridMobile() {
  stroke(0, 0, 100, 60); strokeWeight(0.25); noFill();
  let cw = (width - margin * 2) / 6;
  let mRows = floor((height - margin * 2) / cw);
  for (let i = 0; i < 6; i++) {
    for (let j = 0; j < mRows; j++) {
      rect(margin + i * cw, margin + j * cw, cw, cw);
    }
  }
}

/* BACKGROUND DOT MATRIX DRAW TRACK
 * Sweeps down dot matrix collection indexes triggering update computations phases
 * and telling individual Dot objects inside tracking arrays arrays to paint pixels maps onto canvases.
 */
function drawDotField() {
  push();
  fill(255); noStroke();
  for (let i = 0; i < colsDots; i++) {
    for (let j = 0; j < rowsDots; j++) {
      dots[i][j].update();
      dots[i][j].display();
    }
  }
  pop();
}

/* INTERACTION LISTENER COMMAND LOOP
 * Checks if a click falls inside the audio button boundaries: if yes, it fires media stream toggles and stops.
 * If clicking outside the button, it acts as a layout scrambler/resolver:
 * Decrements click counts steps until hitting zero, triggering unified textual alignment modes, or breaks rings back down to chaos.
 */
function mousePressed() {
  let scaleF = min(width / 1920, height / 1080);
  let transX = (width - 1920 * scaleF) / 2;
  let transY = (height - 1080 * scaleF) / 2;
  
  let mx = isMobile ? mouseX : (mouseX - transX) / scaleF;
  let my = isMobile ? mouseY : (mouseY - transY) / scaleF;

  // 1. Kiểm tra bấm nút Audio bạc định
  if (mx >= btnX && mx <= btnX + btnW && my >= btnY && my <= btnY + btnH) {
    /*if (clickSound && clickSound.isLoaded()) {
      clickSound.play();
    }*/
    togglePlay();
    return;
  }

  // 2. THÊM VÀO ĐÂY: Kiểm tra click trúng hình LIPS
  if (isClickingLips(mx, my)) {
    if (paperSound && paperSound.isLoaded()) {
      if (!isPaperPlaying) {
        paperSound.loop(); // Phát lặp lại âm thanh nền texture giấy
        isPaperPlaying = true;
      } else {
        paperSound.pause(); // Dừng phát khi bấm lại lần nữa
        isPaperPlaying = false;
      }
    }
    return; // Thoát hàm để việc click vào ảnh không ảnh hưởng đến hệ thống xoay chữ bên dưới
  }

  // 3. Toàn bộ logic giải mã chữ phía dưới giữ nguyên...
  if (globalResolved) {
    globalResolved = false;
    globalClicksToResolve = floor(random(2, 6));
    if (heartbeatSound && heartbeatPlaying) {
      heartbeatSound.stop();
      heartbeatPlaying = false;
    }
  } else {
    globalClicksToResolve--;
    if (glitchSound && glitchSound.isLoaded()) {
      glitchSound.play();
    }
    if (globalClicksToResolve <= 0) {
      globalResolved = true;
      if (heartbeatSound && !heartbeatPlaying) {
        heartbeatSound.loop();
        heartbeatPlaying = true;
      }
    }
  }

  for (let s of systems) s.syncState(); 
}

/* AUDIO SIGNAL SWITCH ENGINE
 * Safely controls media streaming audio pipelines.
 * Loops audio track data streams if idle, or freezes/pauses active runs instantly updating control metrics states markers.
 */
function togglePlay() {
  if (!soundFile || !soundFile.isLoaded()) return;
  if (!isPlaying) {
    soundFile.loop(); isPlaying = true;
    if (amplitude) amplitude.setInput(soundFile);
  } else {
    soundFile.pause(); isPlaying = false;
  }
}

/* BACKGROUND BACKGROUND POINT ENTITIES
 * Manages unique tracking values per point. Uses wave math loops stepping phase shifts.
 * Pulls active volumetric reading numbers scaling dots extra large when heavy beats hit streams tracks.
 */
class Dot {
  constructor(x, y, angle, speed, scl) {
    this.x = x; this.y = y; this.angle = angle; this.speed = speed; this.scl = scl;
  }
  update() {
    let boost = 1;
    if (amplitude && isPlaying) {
      let level = amplitude.getLevel(); // Get real-time audio loudness levels outputs
      boost = map(level, 0, 0.25, 1, 12); // Map audio peak metrics scaling velocities thresholds multipliers
      boost = constrain(boost, 1, 12);    // Force bounds safety caps keeping values inside limits parameters
    }
    this.angle += this.speed * boost; 
  }
  display() {
    let offsetLimit = isMobile ? width : min(1920, 1080);
    let offsetX = cos(this.angle) * (offsetLimit * 0.01); // Compute sine-wave layout oscillation deviations vectors
    let offsetY = sin(this.angle) * (offsetLimit * 0.01); // Compute sine-wave layout oscillation deviations vectors
    let s = map(sin(this.angle), -1, 1, 1, 4);            // Modulation scale tracker altering square dimensions loop fields
    rect(this.x + offsetX, this.y + offsetY, baseDotSize * s * this.scl, baseDotSize * s * this.scl);
  }
}

/* CONCENTRIC KINETIC MASKED TYPOGRAPHY
 * Renders static text down onto an offscreen canvas buffer space first, then cuts it up like concentric target sheets rings.
 * Smoothly interpolates (lerps) rotational phase tracks shifting broken scattered states into pure uniform readable alignments.
 */
class CircularType {
  constructor(word, x, y, size) {
    this.word = word; this.x = x; this.y = y; this.size = size; this.rings = 11;
    this.spacing = size / this.rings;
    this.currentRot = []; this.targetRot = [];
    for (let i = 0; i < this.rings; i++) {
      let r = random(TWO_PI);
      this.currentRot[i] = r; this.targetRot[i] = r;
    }
    this.pg = createGraphics(floor(size), floor(size)); // Construct offscreen canvas buffer container spaces asset layers
    this.createText();
  }
  syncState() {
    // If globalResolved is true, targets are set to 0 (aligned). Otherwise, targets are set to a random jumbled angle.
    for (let i = 0; i < this.rings; i++) this.targetRot[i] = globalResolved ? 0 : random(-TWO_PI, TWO_PI);
  }
  update() {
    // Smoothly slides current rotation values toward target landmarks using standard 6% linear interpolation steps
    for (let i = 0; i < this.rings; i++) this.currentRot[i] = lerp(this.currentRot[i], this.targetRot[i], 0.06);
  }
  display() {
    push(); translate(this.x, this.y); imageMode(CENTER);
    for (let i = 0; i < this.rings; i++) {
      let outerR = this.size / 2 - i * this.spacing;
      let innerR = outerR - this.spacing;
      push();
      rotate(this.currentRot[i]);
      
      // Vector clip path masking tools tracking boundaries slicing up graphics buffers layers safely
      beginClip(); beginShape();
      for (let a = 0; a < TWO_PI; a += 0.05) vertex(cos(a) * outerR, sin(a) * outerR);
      beginContour(); // Carve inner holes out of circular vectors generating hollow path channels contours
      for (let a = TWO_PI; a > 0; a -= 0.05) vertex(cos(a) * innerR, sin(a) * innerR);
      endContour(); endShape(CLOSE); endClip();
      
      blendMode(ADD); image(this.pg, 0, 0); // Overlay text textures onto active concentric masks slices maps
      pop();
    }
    noFill(); stroke(0, 0, 100); strokeWeight(1); 
    for (let i = 0; i < this.rings; i++) circle(0, 0, this.size - i * this.spacing * 2); // Stamp technical layout line borders references
    pop();
  }
  createText() {
    let pg = this.pg; pg.clear(); pg.colorMode(HSB, 360, 100, 100, 255);
    pg.translate(this.size / 2, this.size / 2); pg.noStroke();
    // Segment string bodies into structural layout coordinates blocks matching custom display patterns rules parameters
    if (this.word === "NO") this.drawGlitchText(pg, "NO", -140, -80, this.size * 0.45, this.size * 0.45, 140);
    else if (this.word === "MORE") {
      this.drawGlitchText(pg, "MO", -170, -160, this.size * 0.39, this.size * 0.39, 170);
      this.drawGlitchText(pg, "RE", -140, 10, this.size * 0.39, this.size * 0.39, 150);
    } else if (this.word === "SILENCE") {
      this.drawGlitchText(pg, "SI", -220, -260, this.size * 0.29, this.size * 0.29, 125);
      this.drawGlitchText(pg, "LEN", -170, -80, this.size * 0.29, this.size * 0.29, 160);
      this.drawGlitchText(pg, "CE", -200, 100, this.size * 0.29, this.size * 0.29, 155);
    }
  }
  drawGlitchText(target, str, x, y, w, h, spacing) {
    target.push();
    target.translate(x, y);
    for (let n = 0; n < str.length; n++) {
      let char = str[n];
      let charImg = alphabet[char];
      if (charImg) {
        target.push();
        target.translate(n * spacing, 0);
        charImg.loadPixels();
        
        // Pixel Scanning Scanner: Steps vertically and horizontally across baked alphabet image datasets layers
        for (let px = 0; px < charImg.width; px += pixel_size) {
          let dx = map(px, 0, charImg.width, 0, w);
          for (let py = 0; py < charImg.height; py += pixel_size) {
            let idx = (px + py * charImg.width) * 4;
            if (charImg.pixels[idx + 3] > 128) { // If sample points contain opaque pixels mass signals data
              let dy = map(py, 0, charImg.height, 0, h);
              target.fill(0, 0, 100);
              target.rect(dx, dy, random(5, 6), random(5, 6)); // Draw text characters out using noisy jittery particle squares blocks
            }
          }
        }
        target.pop();
      }
    }
    target.pop();
  }
}

/* PROCEDURAL GLITCH ALPHABET 
 * Iterates through allowed characters strings creating custom graphic buffers layers maps files.
 * Draws oversized text, strips color information values clean into hard binary opaque points parameters,
 * and splits letter textures right down vertical centerlines shifting right/left paths forming constructivist glitch offsets looks.
 */
function createAlphabet() {
  for (let char of chars) {
    let pg = createGraphics(220, 260);
    pg.pixelDensity(1);
    pg.noSmooth();
    pg.colorMode(HSB, 360, 100, 100, 255);
    pg.textFont(fontMain);
    pg.textAlign(CENTER, TOP);
    pg.textSize(350);
    pg.fill(0, 0, 100);
    pg.stroke(0, 0, 100);
    pg.strokeWeight(20);
    pg.strokeJoin(MITER);
    pg.drawingContext.miterLimit = 1.5;
    pg.text(char, pg.width / 2, -50);

    pg.loadPixels();
    for (let i = 0; i < pg.pixels.length; i += 4) {
      if (pg.pixels[i] > 50) {
        pg.pixels[i] = pg.pixels[i + 1] = pg.pixels[i + 2] = pg.pixels[i + 3] = 255;
      } else {
        pg.pixels[i + 3] = 0;
      }
    }
    pg.updatePixels();

    let cutX = pg.width / 2;
    let gap = 10;
    let leftPart = pg.get(0, 0, cutX - gap / 2, pg.height);
    let rightPart = pg.get(cutX + gap / 2, 0, cutX - gap / 2, pg.height);
    pg.clear();
    pg.image(leftPart, 0, -6);
    pg.image(rightPart, cutX + gap / 2, 6);
    alphabet[char] = pg;
  }
}

/* HÀM KIỂM TRA CLICK TRÚNG HÌNH LIPS */
function isClickingLips(mx, my) {
  if (!isMobile) {
    // Trên Desktop: dựa theo câu lệnh image(imgLips, 80 + 400, 80 - 150, 549, 366);
    let lx = 80 + 400;
    let ly = 80 - 150;
    let lw = 549;
    let lh = 366;
    return (mx >= lx && mx <= lx + lw && my >= ly && my <= ly + lh);
  } else {
    // Trên Mobile: dựa theo logic tính toán lipsCenterY trong hàm draw()
    let currentScrollY = window.scrollY || document.documentElement.scrollTop;
    let uniformGap = 60;
    let contentStartY = margin + btnH + uniformGap;
    let lipsTopY = contentStartY - 100;
    
    let imgScale = width / 1423 * 0.9; 
    let wLips = 549 * imgScale * 1.2;
    let hLips = 366 * imgScale * 1.2;
    
    let lx = width / 2 - wLips / 2; // Vì vẽ ở chế độ IMAGE MODE (CENTER)
    let ly = (lipsTopY + hLips / 2) - hLips / 2 + currentScrollY; 
    
    // Sử dụng trực tiếp mouseX, mouseY của hệ thống thay vì mx, my đã qua xử lý ảo
    return (mouseX >= lx && mouseX <= lx + wLips && mouseY >= ly && mouseY <= ly + hLips);
  }
}


function keyPressed() {
  if (key === 'f' || key === 'F') fullscreen(!fullscreen());
}
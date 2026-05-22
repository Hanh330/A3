// noprotect

// ==========================================
// 1. GLOBAL VARIABLES 
// ==========================================
// GRID BASE
let margin = 40;
let collums = 12; 
let rows = 6;
let colW, rowH;
// END GRID BASE


// CREATE ALPHABET: Settings for fonts and characters
let alphabet = {}; 
let chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.,! "; 
let fontMain;  // font Rodchenko
let fontSmall; // font Impact Label
let ctaFont;   // font Impact Bold
// CREATE ALPHABET END


// ASSETS IMAGES
let Woman;
let Img;
let processedWoman;
let processedLips; 


// CAMERA FACE MESH : AI settings to track the face
let capture; 
let faceMesh;
let faces = [];

// LIP POINTS: ID list of face landmarks for the mouth
let lipsExterior = [267, 269, 270, 409, 291, 375, 321, 405, 314, 17, 84, 181, 91, 146, 61, 185, 40, 39, 37, 0];
let lipsInterior = [13, 312, 311, 310, 415, 308, 324, 318, 402, 317, 14, 87, 178, 88, 95, 78, 191, 80, 81, 82];
// END CAMERA FACE MESH


// MIC INTERACT: Audio analysis settings
let mic, fft;
let totalSamples = 2000; // data points
let waveformData = new Array(totalSamples).fill(0); //It just creates an empty list of 2,000 points and fills them with zeros to represent absolute silence at the start.
let angle = 0;
let radius = 10; 
let numCircles = 12; 
let sensitivity = 5.0;    
let sharpness = 3;      
let peakScale = 3000;    
let baseBandWidth = 3;  // is the starting thickness of the lines when it's quiet.
let bandWidthScale = 1; // It determines how much the lines will widen or puff up based on the volume from the mic.
// END MIC INTERACT


// UI SLIDERS: Variables for the interactive controls

let tX, tY, sp, dspx, dspy, fct;
let isLocked = false;

//NOISE
let noiseGraphics;
let noiseColor;

// PLAY AUDIO
let mySound;
let isPlaying = false; // Trạng thái nhạc đang chạy hay tắt

// ==========================================
// 2. SYSTEM INIT (Khởi tạo hệ thống)
// ==========================================

// PRELOAD

function preload() {
  
  fontMain = loadFont("fonts/Rodchenko W08 Bold.ttf");
  fontSmall = loadFont("fonts/Impact Label Reversed.ttf");
  ctaFont = loadFont("fonts/impact.ttf");

  
  Img = loadImage("assets/lips.png");

  Woman = loadImage("assets/women.png");

  let options = { maxFaces: 1, refineLandmarks: false, flipped: true };
  faceMesh = ml5.faceMesh(options);
  mySound = loadSound("hanh-sounds/mixing.wav");
}

// END PRELOAD

function setup() {

  createCanvas(windowWidth, windowHeight); 
  
  mic = new p5.AudioIn();
  mic.start();
  mic.amp(sensitivity); 
  
  fft = new p5.FFT(0.8, 1024); 
  fft.setInput(mic);
  noStroke();
  recalculateGrid();
  capture = createCapture(VIDEO, { flipped: true });
  capture.size(640, 480); 
  capture.hide(); 
  
  mySound.disconnect(); 
  mySound.connect();
  
  faceMesh.detectStart(capture, gotFace);
  lipsInterior.reverse();
  
  createAlphabet();
  createSliders(); 
  
  processedWoman = Woman.get();
  processedWoman.filter(THRESHOLD, 0.3);
  processedLips = Img.get();
  processedLips.filter(THRESHOLD, 0.3);
  
  // --- TẠO TEXTURE NOISE ĐEN TRẮNG HỆ RGB ---
  noiseColor = color(255, 255, 255, 25); // Hạt bụi trắng mờ
  noiseGraphics = createGraphics(width, height);
  generateNoiseTexture(noiseGraphics, noiseColor);
}

// ==========================================
// 3. RESPONSIVE LOGIC (Xử lý co giãn màn hình)
// ==========================================

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  recalculateGrid();
  
  // Tạo lại lớp bụi bặm theo size màn hình mới
  if (noiseGraphics) {
    noiseGraphics = createGraphics(width, height);
    generateNoiseTexture(noiseGraphics, noiseColor);
  }
}

function recalculateGrid() {

  collums = 12; 
  rows = 6;
  colW = (width - margin * 2) / collums;
  rowH = (height - margin * 2) / rows;
}

// ==========================================
// 4. MAIN DISPLAY LOOP (Vòng lặp vẽ chính)
// ==========================================

function draw() {
  background(0, 0, 0); 
  drawGrid();
  
    
// WEBCAM Start
  
// --- camera GRID ---
let camX = margin + colW * 3; 
let camY = margin + rowH * 2;
let camW = colW * 4; 
let camH = rowH * 2;

stroke(0); 
strokeWeight(2);
noFill();
rect(camX, camY, camW, camH);

push();
translate(camX, camY);

let scaleX = camW / capture.width;
let scaleY = camH / capture.height;


if (capture.width > 0 && capture.height > 0) {
  capture.loadPixels();
  let stepSize = 4; 
  
  if (stepSize > 0) { 
    for (let y = 0; y < capture.height; y += stepSize) {
      for (let x = 0; x < capture.width; x += stepSize) {
        let index = (x + y * capture.width) * 4;
        
        if (index + 2 < capture.pixels.length) {
          let r = capture.pixels[index];
          let g = capture.pixels[index + 1];
          let b = capture.pixels[index + 2];
          
          let bright = (r + g + b) / 3;

          if (bright > 120) { 
            stroke(255); 
            strokeWeight(stepSize * scaleX * 0.8); 
            point(x * scaleX, y * scaleY);
          }
        }
      }
    }
  }
}

if (faces.length > 0) {
  let face = faces[0];
  
  push();
  colorMode(HSB, 360, 100, 100); 
  fill(0, 100, 100); // Đỏ rực tươi nhất
  noStroke();

  beginShape();
  for (let i of lipsExterior) {
    let p = face.keypoints[i];
    vertex(p.x * scaleX, p.y * scaleY);
  }
  beginContour();
  for (let i of lipsInterior) {
    let p = face.keypoints[i];
    vertex(p.x * scaleX, p.y * scaleY);
  }
  endContour();
  endShape(CLOSE);
  pop();
}

pop(); 
//WEBCAM END
  
  
// --- COMRADES CHAOS TYPOGRAPHY ---
push(); 
fill(255); 
noStroke();
textFont(ctaFont);
textAlign(LEFT, TOP);

drawType("C", margin + colW * 1 - (colW * 0.87), margin + rowH * 0 - (rowH * 0.7), colW * 2, rowH * 3.8, colW * 1.8);
drawType("O", margin + colW * 2 - (colW * 0.62), margin + rowH * 0 - (rowH * 0.7), colW * 2, rowH * 3.8, colW * 1.8);
drawType("M", margin + colW * 3 - (colW * 0.18), margin + rowH * 0 - (rowH * 0.38), colW * 2, rowH * 2.8, colW * 1.8);
drawType("R", margin + colW * 5 - (colW * 0.31), margin + rowH * 0 - (rowH * 0.8), colW * 2.3, rowH * 3.8, colW * 2.07);
drawType("A", margin + colW * 6.5 + (colW * 0.06), margin + rowH * 1.5 - (rowH * 1.1), colW * 2, rowH * 4, colW * 1.8);
drawType("D", margin + colW * 2.5 - (colW * 0.75), margin + rowH * 3.8 + (rowH * 0.22), colW * 5.4, rowH * 3, colW * 4.8);
drawType("E", margin + colW * 3 - (colW * 1.03), margin + rowH * 2.5 + (rowH * 0.55), colW * 5, rowH * 3, colW * 4.5);
drawType("S", margin + colW * 6 + (colW * 0.09), margin + rowH * 2 - (rowH * 0.05), colW * 4, rowH * 6.2, colW * 3.6);
drawType("!", margin + colW * 9, margin + rowH * 3.8, colW * 3, rowH * 2.5, colW * 2.7);
pop(); 
  

push(); 
  let waveX = margin + colW * 1;
  let waveY = margin + rowH * 4.5;
  translate(waveX, waveY); 

  let waveScale = colW * 0.025; 
  scale(waveScale); 

  angle += 0.005;  
  let currentWaveform = fft.waveform(); 
  if (currentWaveform.length > 2) {
    stroke(255, 150); 
    strokeWeight(max(0.2, 1 / waveScale)); 
    noFill();
    
    let samplesToDraw = min(totalSamples, currentWaveform.length);
    for (let i = 0; i < samplesToDraw; i++) {
        let t = i / samplesToDraw;
        let r_base = radius + t * (numCircles * 25); 
        let a = angle + t * (numCircles * TWO_PI);
        
        let val = abs(currentWaveform[i]);
        let spike = pow(val, sharpness) * peakScale;
        
        let r_out = r_base + spike;
        let x2 = r_out * cos(a);
        let y2 = r_out * sin(a);
        
        let r_in = r_base - spike * 0.3;
        let x3 = r_in * cos(a);
        let y3 = r_in * sin(a);

        line(x2, y2, x3, y3); 
    }
  }
pop(); 

push();
textFont(fontMain);
noStroke();

// Ép chữ tính theo colW (ví dụ bằng 28% độ rộng của 1 cột)
let fluidSize = colW * 0.29; 
textSize(fluidSize);

// Chiều cao của box cũng ăn theo fluidSize 
let boxH = fluidSize * 1.2;  
textAlign(LEFT, CENTER);

let boxes = [
  { txt: "SPEAK UP", c: 5.5, r: 2, wMult: 1.8 },   
  { txt: "AGAINST", c: 5.8, r: 2.3, wMult: 1.5 },  
  { txt: "UNDER", c: 2.8, r: 3.5, wMult: 1.15 },       
  { txt: "VALUATION", c: 2.8, r: 3.8, wMult: 1.7}     
];

for (let b of boxes) {
  let x = margin + colW * b.c;
  let y = margin + rowH * b.r;
  let bW = colW * b.wMult; 

  fill(255);
  rect(x, y, bW, boxH); 
  fill(0); // Chữ màu đen đè lên
  text(b.txt, x + 10, y + boxH / 2); 
}
pop();


// --- SMALL TEXT: COMRADES ---
push();
  translate(margin + colW * 0, margin + rowH * 1.75); 
  rotate(-HALF_PI); 
  fill(255); // SỬA LỖI: Đổi (0, 0, 100) sang 255
  noStroke();
  textFont(ctaFont);
  textSize(rowH * 0.4);
  textAlign(LEFT, TOP);
  text("COMRADES", 0, 0); 
pop();
  
// --- WOMAN IMG  ---
push();

  let fluidRowFactor = map(height, 600, 1080, 1.5, 0.7, true);

  // Neo vị trí: Trục X giữ nguyên colW * 7, trục Y sẽ chạy theo hệ số fluid vừa tính
  translate(margin + colW * 7, margin + rowH * fluidRowFactor); 

  if (processedWoman) { 
    let targetWidth = colW * 7.5; 
    let s = targetWidth / processedWoman.width; 
    scale(s); 
    image(processedWoman, 0, 0);  
  }
pop();

// --- LIPS IMG ---
push();
  if (processedLips) {
    let fluidLipFactor = map(height, 600, 1080, 0, 1, true);
    translate(margin + colW * 7, margin + rowH * 0 - (rowH * fluidLipFactor));
    
    let targetW = colW * 4; 
    let s = targetW / processedLips.width;
    scale(s);
    image(processedLips, 0, 0); 
  }
pop();


// --- QUOTE 1: COMRADES ---
push();
fill(255); 
noStroke();
textFont(fontSmall); 
textAlign(LEFT, TOP);


let qSize = rowH * 0.155; 
textSize(qSize);
textLeading(qSize * 1.15); 
let quoteText = "COMRADES,\nTHERE IS NO\nTRUE SOCIAL\nREVOLUTION\n WITHOUT THE\nLIBERATION\nOF WOMEN.";

text(
  quoteText, 
  margin + colW * 10.8, 
  margin + rowH * 0, 
  colW * 2,  
  rowH * 2.5 
);
pop();

// --- QUOTE 2: YOUR VOICE ---
  push();
  fill(255); 
  noStroke();
  textFont(fontSmall); 
  textAlign(LEFT, TOP);
  textSize(qSize);
  textLeading(qSize * 1.1);
  text(
    "YOUR VOICE, YOUR WEAPON.", 
    margin + colW * 11, margin + rowH * 5.3, colW * 1, rowH * 1
  );
  pop(); 

  // --- NOISE---
  push();
    blendMode(DODGE); // Hoặc OVERLAY tùy mày test gu nào dơ hơn
    if (noiseGraphics) {
      image(noiseGraphics, 0, 0, width, height);
    }
  pop();

} 


// ==========================================
// 5. HELPER FUNCTIONS (Các hàm bổ trợ thuật toán)
// ==========================================

function drawGrid() {


 
  stroke(255, 30); 
  strokeWeight(0);
  
  for (let i = 0; i <= collums; i++) {
    let x = margin + i * colW;
    line(x, margin, x, height - margin);
  }
  for (let j = 0; j <= rows; j++) {
    let y = margin + j * rowH;
    line(margin, y, width - margin, y);
  }
}

// CREATE ALPHABET: Render letters once into RAM cache to optimize performance
function createAlphabet() {
  let pg = createGraphics(200, 260);
  pg.pixelDensity(1); 
  pg.smooth();
  pg.colorMode(HSB, 360, 100, 100, 255);
  
  for (let char of chars) {
    pg.clear(); 
    pg.textFont(ctaFont); 
    pg.textAlign(CENTER, CENTER);
    pg.fill(0, 0, 100);
    pg.noStroke();

    if (char === "M" || char === "R") {
      pg.push();
      pg.translate(pg.width / 2, pg.height / 2);
      pg.rotate(-HALF_PI);
      pg.textSize(240); 
      pg.text(char, 0, -10); 
      pg.pop();
    } 
    else if (char === "D") {
      pg.push();
      pg.translate(pg.width / 2, pg.height / 2);
      pg.rotate(-HALF_PI);
      pg.textSize(185); 
      pg.text(char, 0, -5); // Bù nhẹ tọa độ
      pg.pop();
    }
    else if (char === "E") {
      pg.push();
      pg.translate(pg.width / 2, pg.height / 2);
      pg.rotate(-HALF_PI);
      pg.textSize(200);
      pg.text(char, 0, -5);
      pg.pop();
    }
    else if (char === "S") {
      pg.push();
      pg.translate(pg.width / 2, pg.height / 2);
      pg.rotate(-HALF_PI);
      pg.textSize(185);
      pg.text(char, 0, -5);
      pg.pop();
    }
    else { 
      pg.textSize(230); 
      pg.text(char, pg.width / 2, pg.height / 2 - 15);
    }
    alphabet[char] = pg.get(); 
  }
}

// DRAW TYPE: Slice letters into grids and animate using nested loops and map()
function drawType(targetStr, x, y, w, h, spacing) {
  push();
  translate(x, y);
  let cols = tX.value();
  let rowsNum = tY.value();

  let cellW = w / cols;
  let cellH = h / rowsNum;

  [...targetStr].forEach((char, n) => {
    push();
    translate(n * spacing, 0);

    let pg = alphabet[char];

    if (pg) {
      push(); 
      blendMode(BLEND);
      noTint();
      noStroke(); 
      let sw = pg.width / cols;
      let sh = pg.height / rowsNum;

      for (let col = 0; col < cols; col++) {
        for (let row = 0; row < rowsNum; row++) {
          
          // --- LOGIC KINETIC TYPOGRAPHY ---

          let waveX = sin(frameCount * sp.value() + (col * row) * dspx.value()) * fct.value();
          let waveY = sin(frameCount * sp.value() + (col * row) * dspy.value()) * fct.value();


          let sx = map(col, 0, cols, 0, pg.width) + waveX;
          let sy = map(row, 0, rowsNum, 0, pg.height) + waveY;
          image(pg, col * cellW, row * cellH, cellW, cellH, sx, sy, sw, sh);
        }
      }
      pop();
    }
    pop();
  });
  
  pop();
}

// CREATE SLIDERS: Generate UI sliders for real-time control
// CREATE SLIDERS: Tạo UI nằm ngoài canvas và khóa hoàn toàn sự kiện click chuột
function createSliders(){
  let topY = height + 20; // Đẩy toàn bộ đống slider xuống dưới đáy canvas
  let stopPropagation = (e) => e.stopPropagation();

  // --- TILES X ---
  tX = createSlider(1, 80, 16, 1);
  tX.position(20, topY + 30);
  tX.mousePressed(stopPropagation); // KHÓA: Click vào đây không bị dính mousePressed tổng
  createP('Tiles X').position(20, topY).style('color', '#fff').style('margin', '0');

  // --- TILES Y ---
  tY = createSlider(1, 80, 16, 1);
  tY.position(20, topY + 100);
  tY.mousePressed(stopPropagation); // KHÓA
  createP('Tiles Y').position(20, topY + 60).style('color', '#fff').style('margin', '0');

  // --- SPEED ---
  sp = createSlider(0, 1, 0.005, 0.01);
  sp.position(20, topY + 170);
  sp.mousePressed(stopPropagation); // KHÓA
  createP('Speed').position(20, topY + 130).style('color', '#fff').style('margin', '0');

  // --- DISPLACEMENT X ---
  dspx = createSlider(0, 0.1, 0.05, 0.001);
  dspx.position(180, topY + 30);
  dspx.mousePressed(stopPropagation); // KHÓA
  createP('Displacement X').position(180, topY).style('color', '#fff').style('margin', '0');

  // --- DISPLACEMENT Y ---
  dspy = createSlider(0, 0.2, 0, 0.01);
  dspy.position(180, topY + 100);
  dspy.mousePressed(stopPropagation); // KHÓA
  createP('Displacement Y').position(180, topY + 60).style('color', '#fff').style('margin', '0');

  // --- OFFSET ---
  fct = createSlider(0, 300, 100, 1);
  fct.position(180, topY + 170);
  fct.mousePressed(stopPropagation); // KHÓA
  createP('Offset').position(180, topY + 130).style('color', '#fff').style('margin', '0');
}

// MOUSE PRESSED: Manage full-screen toggle and lock states safely
function mousePressed() {
  // SỬA LỖI CHÍ MẠNG: Nếu tọa độ chuột vượt quá chiều cao Canvas (mouseY > height),
  // tức là mày đang bấm chỉnh đống Slider ở phía dưới. 
  // Lập tức dừng hàm luôn (return), không cho chạy lệnh đổi trạng thái `isLocked` bậy bạ!
  if (mouseY > height || mouseX < 0 || mouseX > width || mouseY < 0) {
    return; 
  }
  isLocked = !isLocked; 
  console.log(faces);
  let fs = fullscreen();
  fullscreen(!fs);
}

// GOT FACE: Callback function to update AI face landmark data
function gotFace(results) {
  faces = results;
}

// Hàm thuật toán sinh bụi bặm đen trắng hệ RGB 
function generateNoiseTexture(g, c) {
  g.clear();
  let noiz = 0.1;
  let rnd = random(0.000001, 0.00001);
  for (let i = 0; i < 100000; i++) {
    const x = random(1) * g.width;
    const y = random(1) * g.height;
    const w = noise(noiz) * random(4, 25); // Thu nhỏ nhẹ kích thước hạt cho mịn màng toàn màn hình
    const h = noise(noiz) * random(4, 25);
    
    g.stroke(0, 0, 0, 40); // Stroke đen trong suốt tạo xước bẩn
    g.strokeWeight(noiz);
    g.fill(c);
    g.ellipse(x, y, w, h);

    noiz += rnd;
  }
}


function keyPressed() {

  if (key === ' ') {
    if (!isPlaying) {
      mySound.loop(); 
      isPlaying = true;
    } else {
      mySound.stop(); 
      isPlaying = false;
    }
  }
  

}


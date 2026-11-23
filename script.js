const logo = document.querySelector('#dvd-logo');
const canvas = document.querySelector('#game');
const context = canvas.getContext('2d');
const scoreLabel = document.querySelector('#score');
const message = document.querySelector('#game-message');
const startButton = document.querySelector('#game-start');
const jumpButton = document.querySelector('#jump-button');
const duckButton = document.querySelector('#duck-button');
const avatar = new Image();
avatar.src = './runner-avatar.png';
const wordIcon = new Image();
wordIcon.src = './word-obstacle.svg';

let logoX = 24;
let logoY = 32;
let logoVx = 140;
let logoVy = 105;
let logoHue = 0;
let lastLogoFrame = 0;

function animateLogo(time) {
  const delta = lastLogoFrame ? Math.min((time - lastLogoFrame) / 1000, 0.05) : 0;
  lastLogoFrame = time;
  const maxX = Math.max(0, innerWidth - logo.offsetWidth);
  const maxY = Math.max(0, innerHeight - logo.offsetHeight);
  logoX += logoVx * delta;
  logoY += logoVy * delta;
  if (logoX <= 0 || logoX >= maxX) {
    logoX = Math.max(0, Math.min(maxX, logoX));
    logoVx *= -1;
    logoHue = (logoHue + 85) % 360;
  }
  if (logoY <= 0 || logoY >= maxY) {
    logoY = Math.max(0, Math.min(maxY, logoY));
    logoVy *= -1;
    logoHue = (logoHue + 110) % 360;
  }
  logo.style.transform = `translate3d(${logoX}px, ${logoY}px, 0)`;
  logo.style.filter = `hue-rotate(${logoHue}deg)`;
  requestAnimationFrame(animateLogo);
}
requestAnimationFrame(animateLogo);

const ground = 183;
const playerX = 82;
const playerRadius = 28;
let width = 900;
let state = 'idle';
let lastGameFrame = 0;
let jumpHeight = 0;
let jumpVelocity = 0;
let ducking = false;
let obstacles = [];
let spawnIn = 0;
let spawnCount = 0;
let score = 0;
let bestScore = 0;

function resizeCanvas() {
  const scale = window.devicePixelRatio || 1;
  width = canvas.clientWidth;
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(220 * scale);
  context.setTransform(scale, 0, 0, scale, 0, 0);
  draw();
}

function drawPlayer() {
  const halfHeight = ducking && jumpHeight === 0 ? 16 : playerRadius;
  const centerY = ground - halfHeight - jumpHeight;
  context.save();
  context.beginPath();
  context.ellipse(playerX, centerY, playerRadius, halfHeight, 0, 0, Math.PI * 2);
  context.clip();
  if (avatar.complete && avatar.naturalWidth) {
    const size = avatar.naturalWidth * 0.73;
    context.drawImage(avatar, (avatar.naturalWidth - size) / 2, avatar.naturalHeight * 0.03, size, size, playerX - playerRadius, centerY - halfHeight, playerRadius * 2, halfHeight * 2);
  } else {
    context.fillStyle = '#9dc7eb';
    context.fillRect(playerX - playerRadius, centerY - halfHeight, playerRadius * 2, halfHeight * 2);
  }
  context.restore();
  context.strokeStyle = '#315d93';
  context.lineWidth = 3;
  context.beginPath();
  context.ellipse(playerX, centerY, playerRadius, halfHeight, 0, 0, Math.PI * 2);
  context.stroke();
}

function drawWord(obstacle) {
  const top = ground - obstacle.height;
  if (wordIcon.complete && wordIcon.naturalWidth) {
    context.drawImage(wordIcon, obstacle.x, top, obstacle.width, obstacle.height);
  } else {
    context.fillStyle = '#185abd';
    context.fillRect(obstacle.x, top, obstacle.width, obstacle.height);
  }
}

function drawMango(obstacle) {
  const centerX = obstacle.x + obstacle.width / 2;
  const centerY = obstacle.y + obstacle.height / 2;
  context.fillStyle = '#fff0c2';
  context.beginPath();
  context.ellipse(centerX, centerY, 24, 14, -0.2, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = '#f59e0b';
  context.strokeStyle = '#b45309';
  context.lineWidth = 2;
  context.beginPath();
  context.ellipse(centerX, centerY, 22, 13, -0.2, 0, Math.PI * 2);
  context.fill();
  context.stroke();
  context.fillStyle = '#15803d';
  context.beginPath();
  context.ellipse(centerX + 6, obstacle.y - 1, 8, 4, -0.5, 0, Math.PI * 2);
  context.fill();
}

function draw() {
  context.clearRect(0, 0, width, 220);
  context.fillStyle = '#fbfcfe';
  context.fillRect(0, 0, width, 220);
  context.strokeStyle = '#97a8bc';
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(0, ground + 2);
  context.lineTo(width, ground + 2);
  context.stroke();
  obstacles.forEach(obstacle => obstacle.type === 'mango' ? drawMango(obstacle) : drawWord(obstacle));
  drawPlayer();
  if (state !== 'running') {
    context.fillStyle = '#475569';
    context.font = '14px system-ui';
    context.textAlign = 'center';
    context.fillText(state === 'over' ? 'Кінець гри — натисніть «Ще раз»' : 'Натисніть «Почати гру»', width / 2, 42);
  }
}

function startGame() {
  if (state === 'running') return;
  state = 'running';
  lastGameFrame = 0;
  jumpHeight = 0;
  jumpVelocity = 0;
  ducking = false;
  score = 0;
  obstacles = [{ type: 'word', x: Math.max(width * 0.75, 220), width: 46, height: 46 }];
  spawnIn = 1.5;
  spawnCount = 0;
  scoreLabel.textContent = '00000';
  message.textContent = 'Пробіл / ↑ — стрибок. Утримуйте ↓ / S — пригинання.';
  duckButton.setAttribute('aria-pressed', 'false');
  startButton.disabled = true;
  requestAnimationFrame(gameFrame);
}

function jump() {
  if (state !== 'running') startGame();
  if (jumpHeight === 0 && !ducking) jumpVelocity = 540;
}

function setDucking(value) {
  if (value && state !== 'running') startGame();
  ducking = value;
  duckButton.setAttribute('aria-pressed', String(value));
  if (state !== 'running') draw();
}

function hitsObstacle(obstacle) {
  const halfHeight = ducking && jumpHeight === 0 ? 16 : playerRadius;
  const centerY = ground - halfHeight - jumpHeight;
  const top = obstacle.type === 'mango' ? obstacle.y : ground - obstacle.height;
  const bottom = obstacle.type === 'mango' ? obstacle.y + obstacle.height : ground;
  const nearestX = Math.max(obstacle.x, Math.min(playerX, obstacle.x + obstacle.width));
  const nearestY = Math.max(top, Math.min(centerY, bottom));
  return ((playerX - nearestX) / playerRadius) ** 2 + ((centerY - nearestY) / halfHeight) ** 2 <= 1;
}

function gameFrame(time) {
  if (state !== 'running') return;
  const delta = lastGameFrame ? Math.min((time - lastGameFrame) / 1000, 0.04) : 0;
  lastGameFrame = time;
  jumpHeight = Math.max(0, jumpHeight + jumpVelocity * delta);
  jumpVelocity -= 1500 * delta;
  if (jumpHeight === 0 && jumpVelocity < 0) jumpVelocity = 0;
  score += delta * 10;
  const speed = Math.min(460, 300 + score * 0.8);
  obstacles.forEach(obstacle => { obstacle.x -= speed * delta; });
  obstacles = obstacles.filter(obstacle => obstacle.x + obstacle.width > 0);
  spawnIn -= delta;
  if (spawnIn <= 0) {
    spawnCount++;
    obstacles.push(spawnCount % 2 ? { type: 'mango', x: width + 20, y: ground - 66, width: 48, height: 29 } : { type: 'word', x: width + 20, width: 46, height: Math.random() < 0.5 ? 46 : 52 });
    spawnIn = 1.6 + Math.random() * 0.4;
  }
  scoreLabel.textContent = String(Math.floor(score)).padStart(5, '0');
  if (obstacles.some(hitsObstacle)) {
    state = 'over';
    ducking = false;
    duckButton.setAttribute('aria-pressed', 'false');
    bestScore = Math.max(bestScore, Math.floor(score));
    message.textContent = `Зіткнення! Рахунок: ${Math.floor(score)} · рекорд: ${bestScore}.`;
    startButton.textContent = 'Ще раз';
    startButton.disabled = false;
    draw();
    return;
  }
  draw();
  requestAnimationFrame(gameFrame);
}

startButton.addEventListener('click', startGame);
jumpButton.addEventListener('click', jump);
canvas.addEventListener('pointerdown', jump);
document.addEventListener('keydown', event => {
  if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;
  if ((event.code === 'Space' || event.code === 'ArrowUp') && !event.repeat) {
    event.preventDefault();
    jump();
  }
  if (event.code === 'ArrowDown' || event.code === 'KeyS') {
    event.preventDefault();
    setDucking(true);
  }
});
document.addEventListener('keyup', event => {
  if (event.code === 'ArrowDown' || event.code === 'KeyS') setDucking(false);
});
duckButton.addEventListener('pointerdown', event => {
  event.preventDefault();
  duckButton.setPointerCapture(event.pointerId);
  setDucking(true);
});
['pointerup', 'pointercancel', 'lostpointercapture'].forEach(type => duckButton.addEventListener(type, () => setDucking(false)));
window.addEventListener('blur', () => setDucking(false));
window.addEventListener('resize', resizeCanvas);
avatar.addEventListener('load', draw);
wordIcon.addEventListener('load', draw);
resizeCanvas();

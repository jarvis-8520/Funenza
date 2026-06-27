const PLAYABLE_SECTIONS = ["#home-zones", "#home-why"];
const GRID_SIZE = 20;

const canvas = document.getElementById("pacman-canvas");
const ctx = canvas.getContext("2d");

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

function getPlayableRects() {
  return PLAYABLE_SECTIONS
    .map(selector => document.querySelector(selector))
    .filter(Boolean)
    .map(el => {
      const rect = el.getBoundingClientRect();
      return {
        id: el.id,
        left: rect.left,
        top: rect.top,
        right: rect.right,
        bottom: rect.bottom,
        width: rect.width,
        height: rect.height
      };
    });
}

function drawGridInRect(rect) {
  ctx.strokeStyle = "rgba(0, 229, 255, 0.18)";
  ctx.lineWidth = 1;

  for (let x = rect.left; x <= rect.right; x += GRID_SIZE) {
    ctx.beginPath();
    ctx.moveTo(x, rect.top);
    ctx.lineTo(x, rect.bottom);
    ctx.stroke();
  }

  for (let y = rect.top; y <= rect.bottom; y += GRID_SIZE) {
    ctx.beginPath();
    ctx.moveTo(rect.left, y);
    ctx.lineTo(rect.right, y);
    ctx.stroke();
  }
}

function drawSectionBounds(rect) {
  ctx.strokeStyle = "rgba(255, 217, 61, 0.9)";
  ctx.lineWidth = 2;
  ctx.strokeRect(rect.left, rect.top, rect.width, rect.height);

  ctx.fillStyle = "rgba(255, 217, 61, 0.95)";
  ctx.font = "12px monospace";
  ctx.fillText(rect.id, rect.left + 8, rect.top + 18);
}

function renderMapOverlay() {
  resizeCanvas();
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const rects = getPlayableRects();
  rects.forEach(rect => {
    drawGridInRect(rect);
    drawSectionBounds(rect);
  });
}

window.addEventListener("load", renderMapOverlay);
window.addEventListener("resize", renderMapOverlay);
// Removed scroll listener to prevent layout thrashing and freezing
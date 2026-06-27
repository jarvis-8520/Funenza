/* ==========================================================
   PACMAN ANIMATION (True Arcade Rules & AI Edition)
   ========================================================== */

(function PacmanHighlights() {
  'use strict';

  const PACMAN_IMG = './images/pacman/pacman.png';  
  const ALIEN_1_IMG = './images/pacman/alien-1.png'; 
  const ALIEN_2_IMG = './images/pacman/alien-2.png';
  const ALIEN_3_IMG = './images/pacman/alien-3.png';

  const DOT_SIZE    = 20;   
  const PACMAN_SIZE = 16;  
  const SPEED       = 2.0;  
  const GHOST_SPEED = 1.4;  
  const FRIGHTENED_SPEED = 0.8;

  let grid, items;
  let pacEl;
  let pacX, pacY, pacDir = { x: 1, y: 0 };
  let pacTargetC, pacTargetR;
  let currentRotation = 0;
  let isInitialized = false;  
  let corridorSet = new Set();
  let corridorPaths = [];
  let dotMap = {}; 
  let ghosts = [];
  let raf = null;
  let dotsRemaining = 0;

  // Frightened Mode
  let frightenedMode = false;
  let frightenedTimer = null;

  // --- 1. BUILD BOARD PATHWAYS ---
  function buildMap(layoutItems) {
    corridorPaths = [];
    corridorSet.clear();

    const gridData = layoutItems.grid;
    const rows = layoutItems.rows;
    const cols = layoutItems.cols;

    for (let R = 0; R < rows; R++) {
      for (let C = 0; C < cols; C++) {
        const internalR = R - 1;
        const internalC = C - 1;
        const isBlocked = gridData[internalR] && gridData[internalR][internalC];

        if (!isBlocked) {
          corridorPaths.push({ c: C, r: R });
          corridorSet.add(`${C},${R}`);
        }
      }
    }
  }

  const walkable = (c, r) => corridorSet.has(`${c},${r}`);

  function getPowerPelletCorners() {
    let corners = [
      { maxScore: -Infinity, cell: null, calc: (c, r) => -c - r }, 
      { maxScore: -Infinity, cell: null, calc: (c, r) => c - r },  
      { maxScore: -Infinity, cell: null, calc: (c, r) => -c + r }, 
      { maxScore: -Infinity, cell: null, calc: (c, r) => c + r }   
    ];
    
    corridorPaths.forEach(cell => {
      corners.forEach(corner => {
        let score = corner.calc(cell.c, cell.r);
        if (score > corner.maxScore) {
          corner.maxScore = score;
          corner.cell = cell;
        }
      });
    });

    return new Set(corners.map(c => `${c.cell.c},${c.cell.r}`));
  }

  // --- 2. SMART AI BRAINS ---
  function getDistToNearestDot(startC, startR) {
    const key = `${startC},${startR}`;
    if (dotMap[key] && !dotMap[key].eaten) return 0;

    let queue = [{ c: startC, r: startR, dist: 0 }];
    let visited = new Set([key]);
    
    while (queue.length > 0) {
      let curr = queue.shift();
      const dirs = [{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }];
      
      for (let d of dirs) {
        let nc = curr.c + d.x, nr = curr.r + d.y;
        let nKey = `${nc},${nr}`;
        if (walkable(nc, nr) && !visited.has(nKey)) {
          if (dotMap[nKey] && !dotMap[nKey].eaten) return curr.dist + 1;
          visited.add(nKey);
          queue.push({ c: nc, r: nr, dist: curr.dist + 1 });
        }
      }
    }
    return 9999; 
  }

  function getSmartPacmanDir(c, r, curDir) {
    const allDirs = [{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }];
    const validMoves = allDirs.filter(d => walkable(c + d.x, r + d.y));

    if (validMoves.length === 0) return { x: -curDir.x, y: -curDir.y }; 

    let bestScore = Infinity;
    let bestMove = validMoves[0];

    validMoves.forEach(d => {
      let nc = c + d.x, nr = r + d.y;
      let score = getDistToNearestDot(nc, nr);
      let minGhostDist = 9999;
      
      ghosts.forEach(g => {
        if (!g.respawning) {
          let dist = Math.abs(g.c - nc) + Math.abs(g.r - nr); 
          if (dist < minGhostDist) minGhostDist = dist;
        }
      });

      if (frightenedMode) {
        if (minGhostDist < 5) score -= (10 - minGhostDist); 
      } else {
        if (minGhostDist <= 2) score += 1000;      
        else if (minGhostDist <= 4) score += 50;   
      }

      score += Math.random() * 0.1;

      if (score < bestScore) {
        bestScore = score;
        bestMove = d;
      }
    });

    return bestMove;
  }

  function getSmartGhostDir(g) {
    const allDirs = [{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }];
    const validMoves = allDirs.filter(d => walkable(g.c + d.x, g.r + d.y));
    
    const noReverse = validMoves.filter(d => !(d.x === -g.dir.x && d.y === -g.dir.y));
    const choices = noReverse.length > 0 ? noReverse : validMoves;

    if (frightenedMode) {
      return choices[Math.floor(Math.random() * choices.length)];
    }

    choices.sort((a, b) => {
      let da = Math.hypot((g.c + a.x) - g.targetPacC, (g.r + a.y) - g.targetPacR);
      let db = Math.hypot((g.c + b.x) - g.targetPacC, (g.r + b.y) - g.targetPacR);
      return da - db;
    });

    return choices[0];
  }

  // --- 3. ACTOR & ITEM SPAWNING ---
  function spawnPacman() {
    pacEl = document.createElement('img');
    pacEl.id = 'pacman-actor';
    pacEl.src = PACMAN_IMG;
    Object.assign(pacEl.style, {
      position: 'absolute', zIndex: '20', pointerEvents: 'none',
      width: PACMAN_SIZE + 'px', height: PACMAN_SIZE + 'px',
      objectFit: 'contain', left: '0px', top: '0px',
      transform: 'translate3d(0px, 0px, 0) translate(-50%,-50%)',
      willChange: 'transform'
    });
    grid.appendChild(pacEl);
  }

  function spawnDots() {
    dotMap = {};
    const powerCorners = getPowerPelletCorners();
    dotsRemaining = 0;

    corridorPaths.forEach((cell) => {
      const key = `${cell.c},${cell.r}`;
      const isPowerPellet = powerCorners.has(key);
      const dot = document.createElement('div');

      if (isPowerPellet) {
        dot.className = 'pac-power-pellet';
        Object.assign(dot.style, {
          position: 'absolute', zIndex: '10', pointerEvents: 'none',
          width: '12px', height: '12px', borderRadius: '50%',
          background: '#FFB8FF', transform: 'translate(-50%,-50%)',
          left: (cell.c * DOT_SIZE + 10) + 'px', top: (cell.r * DOT_SIZE + 10) + 'px',
          boxShadow: '0 0 10px #FFB8FF',
          animation: 'pac-dot-pulse 0.4s infinite alternate'
        });
      } else {
        dot.className = 'pac-dot';
        Object.assign(dot.style, {
          position: 'absolute', zIndex: '10', pointerEvents: 'none',
          width: '4px', height: '4px', borderRadius: '50%',
          background: '#FFD93D', transform: 'translate(-50%,-50%)',
          left: (cell.c * DOT_SIZE + 10) + 'px', top: (cell.r * DOT_SIZE + 10) + 'px'
        });
      }

      grid.appendChild(dot);
      dotMap[key] = { el: dot, isPower: isPowerPellet, eaten: false };
      dotsRemaining++;
    });

    if (!document.getElementById('pacman-style-animations')) {
      const style = document.createElement('style');
      style.id = 'pacman-style-animations';
      style.innerHTML = `@keyframes pac-dot-pulse { from { opacity: 1; transform: translate(-50%,-50%) scale(1); } to { opacity: 0.4; transform: translate(-50%,-50%) scale(1.3); } }`;
      document.head.appendChild(style);
    }
  }

  function spawnGhosts() {
    const images = [ALIEN_1_IMG, ALIEN_2_IMG, ALIEN_3_IMG];
    for (let i = 0; i < 3; i++) {
      const spawnCells = corridorPaths.filter(p => p.c > 5 && p.r > 5);
      const cell = spawnCells.length ? spawnCells[Math.floor(Math.random() * spawnCells.length)] : corridorPaths[0];
      
      const el = document.createElement('img');
      el.className = 'pacman-ghost';
      el.src = images[i];
      
      const gx = cell.c * DOT_SIZE + 10;
      const gy = cell.r * DOT_SIZE + 10;

      Object.assign(el.style, {
        position: 'absolute', zIndex: '19', pointerEvents: 'none',
        width: PACMAN_SIZE + 'px', height: PACMAN_SIZE + 'px',
        objectFit: 'contain', left: '0px', top: '0px',
        transform: `translate3d(${gx}px, ${gy}px, 0) translate(-50%,-50%)`,
        willChange: 'transform',
        transition: 'filter 0.2s'
      });
      grid.appendChild(el);
      
      ghosts.push({
        id: i, el, x: gx, y: gy, 
        c: cell.c, r: cell.r,
        dir: { x: -1, y: 0 },
        targetC: cell.c, targetR: cell.r, 
        targetPacC: cell.c, targetPacR: cell.r,
        respawning: false
      });
    }
  }

  function triggerPowerPellet() {
    frightenedMode = true;
    clearTimeout(frightenedTimer);

    ghosts.forEach(g => {
      if (g.respawning) return;
      g.el.style.filter = 'invert(48%) sepia(88%) saturate(3087%) hue-rotate(200deg) brightness(108%) contrast(106%)';
      g.dir = { x: -g.dir.x, y: -g.dir.y };
      g.targetC = g.c + g.dir.x;
      g.targetR = g.r + g.dir.y;
    });

    frightenedTimer = setTimeout(() => {
      frightenedMode = false;
      ghosts.forEach(g => {
        if (!g.respawning) g.el.style.filter = 'none';
      });
    }, 7000);
  }

  // --- 4. ENGINE HEARTBEAT LOOP ---
  function tick() {
    const tx = pacTargetC * DOT_SIZE + 10;
    const ty = pacTargetR * DOT_SIZE + 10;
    const dist = Math.hypot(tx - pacX, ty - pacY);

    if (dist <= SPEED) {
      pacX = tx; pacY = ty;
      
      const coordKey = `${pacTargetC},${pacTargetR}`;
      if (dotMap[coordKey] && !dotMap[coordKey].eaten) {
        dotMap[coordKey].eaten = true;
        dotMap[coordKey].el.remove();
        dotsRemaining--;
        
        if (dotMap[coordKey].isPower) triggerPowerPellet();
        
        // LEVEL COMPLETE
        if (dotsRemaining <= 0) {
          cancelAnimationFrame(raf); 
          setTimeout(() => {
            isInitialized = false; 
            init();
          }, 1000); 
          return;
        }
      }

      pacDir = getSmartPacmanDir(pacTargetC, pacTargetR, pacDir);
      pacTargetC += pacDir.x;
      pacTargetR += pacDir.y;

      if (pacDir.x === 1) currentRotation = 0;
      else if (pacDir.x === -1) currentRotation = 180;
      else if (pacDir.y === 1) currentRotation = 90;
      else if (pacDir.y === -1) currentRotation = 270;

    } else {
      pacX += (tx - pacX) / dist * SPEED; 
      pacY += (ty - pacY) / dist * SPEED;
    }
    
    if (pacEl) {
      pacEl.style.transform = currentRotation === 180 
        ? `translate3d(${pacX}px, ${pacY}px, 0) translate(-50%,-50%) scaleX(-1)` 
        : `translate3d(${pacX}px, ${pacY}px, 0) translate(-50%,-50%) rotate(${currentRotation}deg)`;
    }

    const currentGhostSpeed = frightenedMode ? FRIGHTENED_SPEED : GHOST_SPEED;

    ghosts.forEach(g => {
      const gtx = g.targetC * DOT_SIZE + 10;
      const gty = g.targetR * DOT_SIZE + 10;
      const gdist = Math.hypot(gtx - g.x, gty - g.y);

      if (gdist <= currentGhostSpeed) {
        g.x = gtx; g.y = gty; g.c = g.targetC; g.r = g.targetR;
        
        if (g.respawning) {
          g.respawning = false;
          if (!frightenedMode) g.el.style.filter = 'none';
        }

        if (g.id === 0) { 
          g.targetPacC = pacTargetC; g.targetPacR = pacTargetR;
        } else if (g.id === 1) { 
          g.targetPacC = pacTargetC + (pacDir.x * 4); g.targetPacR = pacTargetR + (pacDir.y * 4);
        } else { 
          if (Math.hypot(g.c - pacTargetC, g.r - pacTargetR) > 8) {
            g.targetPacC = pacTargetC; g.targetPacR = pacTargetR;
          } else {
            g.targetPacC = 0; g.targetPacR = items.rows; 
          }
        }

        g.dir = getSmartGhostDir(g);
        g.targetC = g.c + g.dir.x; 
        g.targetR = g.r + g.dir.y;
      } else {
        g.x += (gtx - g.x) / gdist * currentGhostSpeed; 
        g.y += (gty - g.y) / gdist * currentGhostSpeed;
      }

      if (g.el) {
        g.el.style.transform = g.dir.x === -1 
          ? `translate3d(${g.x}px, ${g.y}px, 0) translate(-50%,-50%) scaleX(-1)` 
          : `translate3d(${g.x}px, ${g.y}px, 0) translate(-50%,-50%) scaleX(1)`;
      }
    });

    // --- 3. COLLISION DETECTION ---
    let collisionDetected = false;
    for (const g of ghosts) {
      if (Math.hypot(pacX - g.x, pacY - g.y) < PACMAN_SIZE - 2) { 
        if (frightenedMode && !g.respawning) {
          // PACMAN EATS GHOST: Teleport ghost away immediately
          g.respawning = true;
          const escapeCell = corridorPaths[Math.floor(Math.random() * corridorPaths.length)];
          g.c = escapeCell.c; g.r = escapeCell.r;
          g.targetC = escapeCell.c; g.targetR = escapeCell.r;
          g.x = escapeCell.c * DOT_SIZE + 10; g.y = escapeCell.r * DOT_SIZE + 10;
          g.el.style.filter = 'opacity(0.3) grayscale(1)'; 
        } else if (!g.respawning) {
          // GHOST EATS PACMAN: Trigger Death Sequence
          collisionDetected = true;
          break; 
        }
      }
    }

    if (collisionDetected) {
      cancelAnimationFrame(raf); // Instantly stop the animation frame
      
      // Visual feedback so the user knows they died
      if (pacEl) {
        pacEl.style.transition = 'transform 0.4s ease-in, opacity 0.4s ease';
        pacEl.style.transform += ' scale(0.1)';
        pacEl.style.opacity = '0';
      }

      // Wait 800ms for the death animation, then fully reset
      setTimeout(() => {
        isInitialized = false; 
        init();
      }, 800);
      return; 
    }

    raf = requestAnimationFrame(tick);
  }

  // --- 5. INITIALIZER ---
  function init() {
    if (isInitialized && ghosts.length > 0) return;

    grid = document.getElementById('highlights-grid');
    items = window._highlightsLayoutItems;

    if (!grid || !items) {
      setTimeout(init, 500); 
      return;
    }

    if (raf) cancelAnimationFrame(raf);
    clearTimeout(frightenedTimer);
    frightenedMode = false;
    
    // Purge old DOM items thoroughly
    const oldEls = grid.querySelectorAll('#pacman-actor, .pac-dot, .pac-power-pellet, .pacman-ghost');
    oldEls.forEach(el => el.remove());
    
    ghosts = []; 
    dotMap = {};
    isInitialized = true; 

    buildMap(items);
    if (corridorPaths.length === 0) {
      isInitialized = false; 
      return;
    }

    const startCells = corridorPaths.filter(p => p.c <= 2 && p.r <= 2);
    const si = startCells.length ? startCells[0] : corridorPaths[0];
    
    pacX = si.c * DOT_SIZE + 10; 
    pacY = si.r * DOT_SIZE + 10;
    pacTargetC = si.c; 
    pacTargetR = si.r;
    pacDir = { x: 1, y: 0 };
    currentRotation = 0;

    spawnPacman();
    spawnDots();
    spawnGhosts();
    
    raf = requestAnimationFrame(tick);
  }

  // --- 6. STARTUP LOGIC ---
  if (window._highlightsLayoutItems) {
    init();
  } else {
    const observer = new MutationObserver(() => {
      if (window._highlightsLayoutItems) {
        observer.disconnect();
        setTimeout(init, 250);
      }
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }

})();
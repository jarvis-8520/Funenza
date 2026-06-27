let hasSavedSnapshotThisSession = true; // <-- safeguard flag

const HIGHLIGHTS_JSON_PATH = "./data/home-highlights.json";
const HIGHLIGHTS_IMAGE_PATH = "./images/gallery/";

const HIGHLIGHTS_LAYOUT = {
  minItems: 10,
  maxItems: 13,
  minPortraitItems: 2,

  baseSize: 1,
  gap: 14,

  randomize: true,
  showText: false,
  debug: false,
};

let highlightsResizeTimer = null;
let highlightsCachedData = null;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function debounce(fn, delay = 140) {
  return (...args) => {
    clearTimeout(highlightsResizeTimer);
    highlightsResizeTimer = setTimeout(() => fn(...args), delay);
  };
}

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function fetchHighlightsData() {
  return fetch(HIGHLIGHTS_JSON_PATH).then((response) => {
    if (!response.ok) {
      throw new Error(`Failed to load highlights JSON: ${response.status}`);
    }
    return response.json();
  });
}

function getHighlightsItems(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  return [];
}

function getOrientation(item) {
  if (item?.orientation === "portrait" || item?.orientation === "landscape") {
    return item.orientation;
  }

  const width = Number(item?.width) || 0;
  const height = Number(item?.height) || 0;
  if (!width || !height) return "landscape";

  return width / height < 1 ? "portrait" : "landscape";
}

function normalizeHighlightItem(item, index) {
  const width = Number(item?.width) || 1200;
  const height = Number(item?.height) || 800;
  const orientation = getOrientation(item);
  const imageName = String(item?.image || "").trim();

  return {
    id: item?.id || `highlight-${index + 1}`,
    title: item?.title || "",
    subtitle: item?.subtitle || "",
    alt: item?.alt || item?.title || `Highlight ${index + 1}`,
    image: imageName,
    imageSrc: `${HIGHLIGHTS_IMAGE_PATH}${encodeURIComponent(imageName)}`,
    featured: Boolean(item?.featured),
    width,
    height,
    ratio: width / height,
    orientation,
  };
}

function shuffleArray(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function selectHighlightItems(items, config) {
  const normalized = items
    .filter((item) => item?.image)
    .map((item, index) => normalizeHighlightItem(item, index));

  const ordered = config.randomize ? shuffleArray(normalized) : [...normalized];

  const portraits = ordered.filter((item) => item.orientation === "portrait");
  const landscapes = ordered.filter((item) => item.orientation !== "portrait");

  const targetCount = clamp(ordered.length, config.minItems, config.maxItems);

  // RULE 1: Maximum 3 portrait cards
  const allowedPortraitCount = Math.min(portraits.length, 3);
  const chosenPortraits = portraits.slice(0, allowedPortraitCount);

  // Fill the remaining quota with landscape cards
  const neededLandscapesCount = targetCount - chosenPortraits.length;
  const chosenLandscapes = landscapes.slice(
    0,
    Math.min(landscapes.length, neededLandscapesCount)
  );

  const selected = [];
  let pIdx = 0;
  let lIdx = 0;

  // CHANGED: landscape cards forced to display first before any portraits
  let landscapesSinceLastPortrait = 0;

  // RULE 3: Interleave cards to ensure at least 2 landscapes exist between any two portraits
  while (pIdx < chosenPortraits.length || lIdx < chosenLandscapes.length) {
    if (pIdx < chosenPortraits.length && landscapesSinceLastPortrait >= 2) {
      selected.push(chosenPortraits[pIdx]);
      pIdx++;
      landscapesSinceLastPortrait = 0;
    } else if (lIdx < chosenLandscapes.length) {
      selected.push(chosenLandscapes[lIdx]);
      lIdx++;
      landscapesSinceLastPortrait++;
    } else {
      // Discard extra portraits if they break Rule 3
      break;
    }
  }

  // Fallback to preserve grid item requirement if pool arrangement runs short
  if (selected.length < config.minItems) {
    return ordered.slice(0, Math.min(ordered.length, config.maxItems));
  }

  return selected;
}

/**
 * PAC-MAN BOARD PLACEMENT ENGINE
 * Creates a coordinate-based maze layout.
 */
function packCardsPacman(items, containerWidth, config) {
  const dotSize = 20;
  const corridor = 1;

  // Base card sizes
  const landscape = { w: 14, h: 10 };
  const portrait = { w: 14, h: 20 };

  let cols = Math.floor(containerWidth / dotSize);
  // Ensure minimum width for at least one portrait + 2 corridors
  if (cols < portrait.w + 2) cols = portrait.w + 2;

  const W_grid = cols - 2; // Internal grid width available for cards

  const layoutItems = [];
  const grid = [];

  // RULE 4: Tracking map to isolate portraits into distinct 12-dot vertical bands
  const portraitBands = new Set();

  function getPortraitBand(row) {
    return Math.floor(row / 13);
  }

  function markUsed(c, r, w, h) {
    for (let y = r; y < r + h; y++) {
      if (!grid[y]) grid[y] = [];
      for (let x = c; x < c + w; x++) {
        grid[y][x] = true;
      }
    }
  }

  function isFree(c, r, w, h) {
    if (c < 0 || c + w > W_grid) return false;
    for (let y = Math.max(0, r - corridor); y <= r + h; y++) {
      if (grid[y]) {
        for (let x = Math.max(0, c - corridor); x <= c + w; x++) {
          if (grid[y][x]) return false;
        }
      }
    }
    return true;
  }

  // Assign base dimensions
  const processedItems = items.map((item) => {
    let w = landscape.w;
    let h = landscape.h;

    if (item.orientation === "portrait") {
      w = portrait.w;
      h = portrait.h;
    }

    // Fallback for very small screens
    if (w > W_grid) w = W_grid;

    return { ...item, gridW: w, gridH: h };
  });

  // Pass 1: Place items and expand horizontally
  processedItems.forEach((item) => {
    let w = item.gridW;
    let h = item.gridH;

    let placed = false;
    let r = 0;

    while (!placed) {
      for (let c = 0; c <= W_grid - w; c++) {
        if (isFree(c, r, w, h)) {
          // RULE 4: Reject placement if another portrait already claims this band
          if (item.orientation === "portrait") {
            const band = getPortraitBand(r);
            if (portraitBands.has(band)) {
              continue;
            }
          }

          if (item.orientation !== "portrait") {
            let max_w = w;
            while (max_w < W_grid && isFree(c, r, max_w + 1, h)) {
              max_w++;
            }

            // Fill awkward gaps
            if (max_w - w > 0 && max_w - w < portrait.w) {
              w = max_w;
            }

            // Complete rows flush to the right edge
            if (c + max_w === W_grid && max_w - w > 0 && max_w - w < landscape.w) {
              w = max_w;
            }
          }

          // RULE 4: Portrait claims this vertical band
          if (item.orientation === "portrait") {
            portraitBands.add(getPortraitBand(r));
          }

          markUsed(c, r, w, h);
          layoutItems.push({
            ...item,
            x: (c + 1) * dotSize,
            y: (r + 1) * dotSize,
            width: w * dotSize,
            height: h * dotSize,
            gridCol: c,
            gridRow: r,
            gridW: w,
            gridH: h,
          });
          placed = true;
          break;
        }
      }
      if (!placed) r++;
    }
  });

  // Pass 2: Vertical expansion to eliminate awkward bottom gaps
  const bottomR =
    layoutItems.length > 0
      ? Math.max(...layoutItems.map((i) => i.gridRow + i.gridH))
      : 0;

  layoutItems.forEach((item) => {
    if (item.orientation !== "portrait") {
      let max_h = item.gridH;
      let canExpand = true;

      while (item.gridRow + max_h < bottomR && canExpand) {
        let checkR = item.gridRow + max_h;
        for (let c = item.gridCol; c < item.gridCol + item.gridW; c++) {
          if (grid[checkR] && grid[checkR][c]) canExpand = false;
        }
        if (canExpand) {
          let corridorR = checkR + corridor;
          for (
            let c = Math.max(0, item.gridCol - corridor);
            c <= item.gridCol + item.gridW;
            c++
          ) {
            if (grid[corridorR] && grid[corridorR][c]) canExpand = false;
          }
        }
        if (canExpand) {
          max_h++;
        }
      }

      // Stretch to fill small gaps
      if (max_h - item.gridH > 0 && max_h - item.gridH <= landscape.h + corridor) {
        item.gridH = max_h;
        item.height = max_h * dotSize;
        markUsed(item.gridCol, item.gridRow, item.gridW, item.gridH);
      }
    }
  });

  const rows =
    layoutItems.length > 0
      ? Math.max(...layoutItems.map((item) => item.gridRow + item.gridH)) + 2
      : 0;

  layoutItems.grid = grid;
  layoutItems.dotSize = dotSize;
  layoutItems.corridor = corridor;
  layoutItems.cols = cols;
  layoutItems.rows = rows;

  window._highlightsLayoutItems = layoutItems;
  return layoutItems;
}

function getPackedHeight(layoutItems) {
  return layoutItems.reduce(
    (max, item) => Math.max(max, item.y + item.height),
    0
  );
}

function estimateEmptySpace(layoutItems, containerWidth, packedHeight) {
  const usedArea = layoutItems.reduce(
    (sum, item) => sum + item.width * item.height,
    0
  );
  const totalArea = containerWidth * packedHeight;
  if (!totalArea) return 0;
  return Math.max(0, 1 - usedArea / totalArea);
}

// THE FIX: Added 'index' as the second parameter
function buildHighlightCard(item, index, config) {
  const style = [
    "position:absolute",
    `left:${item.x}px`,
    `top:${item.y}px`,
    `width:${item.width}px`,
    `height:${item.height}px`,
  ].join(";");

  const classes = [
    "highlight-card",
    item.orientation === "portrait" ? "is-portrait" : "is-landscape",
  ].join(" ");

  const debugLabel = config.debug
    ? `<span style="position:absolute;top:8px;left:8px;z-index:4;padding:2px 6px;border-radius:999px;background:rgba(0,0,0,.7);color:#fff;font:600 11px/1 sans-serif;">${escapeHtml(
        item.id
      )}</span>`
    : "";

  const body =
    config.showText && (item.title || item.subtitle)
      ? `
        <div class="highlight-card-body">
          ${
            item.title
              ? `<h3 class="highlight-card-title">${escapeHtml(
                  item.title
                )}</h3>`
              : ""
          }
          ${
            item.subtitle
              ? `<p class="highlight-card-subtitle">${escapeHtml(
                  item.subtitle
                )}</p>`
              : ""
          }
        </div>
      `
      : "";

  return `
    <article class="${classes}" style="${style}" ${
    config.debug ? `data-id="${escapeHtml(item.id)}"` : ""
  }>
      <div class="highlight-card-media" style="position:absolute;inset:0;min-height:0;">
        <img
          src="${item.imageSrc}"
          alt="${escapeHtml(item.alt)}"
          loading="${index < 4 ? 'eager' : 'lazy'}"
          fetchpriority="${index < 2 ? 'high' : 'auto'}"
          decoding="async"
          width="${item.width}"
          height="${item.height}"
          style="width:100% !important; height:100% !important; object-fit:cover !important; display:block !important;"
        />
      </div>
      ${debugLabel}
      ${body}
    </article>
  `;
}

function renderHighlightCards(layoutItems, grid, config) {
  const dotSize = 24;
  const packedHeight = Math.ceil(getPackedHeight(layoutItems)) + dotSize;

  grid.style.position = "relative";
  grid.style.height = `${packedHeight}px`;
  grid.style.gap = "0px";
  grid.innerHTML = layoutItems.map((item, index) => buildHighlightCard(item, index, config)).join("");
  return packedHeight;
}

function publishPacmanBoard(layoutItems, packedHeight) {
  const board = {
    layoutItems,
    grid: layoutItems.grid,
    dotSize: layoutItems.dotSize,
    corridor: layoutItems.corridor,
    cols: layoutItems.cols,
    rows: layoutItems.rows,
    width: layoutItems.cols * layoutItems.dotSize,
    height: packedHeight,
  };

  window.pacmanBoard = board;
  window.dispatchEvent(
    new CustomEvent("pacman-board-ready", {
      detail: board,
    })
  );
}
function renderMobileSlider(items, grid) {
  // Normalize so we get the correct imageSrc path
  const normalizedItems = items
    .filter((item) => item?.image)
    .map((item, index) => normalizeHighlightItem(item, index));

  // Duplicate the list so the CSS translateX(-50%) marquee loops seamlessly
  const doubled = [...normalizedItems, ...normalizedItems];

  const cardHtml = (item) => `
    <article class="highlight-card ${item.orientation === "portrait" ? "is-portrait" : "is-landscape"}" aria-hidden="false">
      <div class="highlight-card-media">
        <img
          src="${item.imageSrc}"
          alt="${escapeHtml(item.alt)}"
          loading="lazy"
          decoding="async"
          width="${item.width}"
          height="${item.height}"
        />
      </div>
    </article>
  `;

  // Wrap in .slider-track so the TRACK animates (width:max-content),
  // while the grid itself stays as the fixed overflow:hidden viewport.
  // translateX(-50%) of max-content = exactly one full set of cards,
  // not -50% of 100vw which caused the visible jump/reset.
  const track = document.createElement("div");
  track.className = "slider-track";
  track.innerHTML = doubled.map(cardHtml).join("");

  // Speed: ~6 seconds per card
  const durationSec = Math.max(20, normalizedItems.length * 6);
  track.style.animationDuration = `${durationSec}s`;

  grid.innerHTML = "";
  grid.appendChild(track);

  // Let CSS know this is the marquee row
  grid.classList.add("mobile-slider-active");
}
function runHighlightsLayout(data, config = HIGHLIGHTS_LAYOUT) {
  const grid = document.getElementById("highlights-grid");
  if (!grid) return;

  const items = getHighlightsItems(data);
  const selectedItems = selectHighlightItems(items, config);

  // SHORT-CIRCUIT: If mobile, stop the skyline math
  if (window.innerWidth < 768) {
    renderMobileSlider(items, grid);
    return;
  }

  const sectionEl = document.querySelector(".home-highlights");
  const container = sectionEl.querySelector(".container");
  const containerWidth = Math.max(0, Math.floor(container.clientWidth));

  if (!containerWidth || !selectedItems.length) {
    grid.innerHTML = "";
    grid.style.height = "0px";
    return;
  }

  const packed = packCardsPacman(selectedItems, containerWidth, config);
  const packedHeight = renderHighlightCards(packed, grid, config);

  grid.style.width = `${packed.cols * packed.dotSize}px`;
  grid.style.margin = "0 auto";

  publishPacmanBoard(packed, packedHeight);

  if (!hasSavedSnapshotThisSession && packed.length > 0) {
    triggerLiveSnapshotDownload(packed);
    hasSavedSnapshotThisSession = true;
  }

  if (config.debug) {
    const portraitCount = packed.filter(
      (item) => item.orientation === "portrait"
    ).length;
    const emptyRatio = estimateEmptySpace(packed, containerWidth, packedHeight);
    console.log("[highlights] selected card count:", packed.length);
    console.log("[highlights] portrait count:", portraitCount);
    console.log("[highlights] final container height:", packedHeight);
    console.log(
      "[highlights] empty-space estimate:",
      `${(emptyRatio * 100).toFixed(2)}%`
    );
  }
}

const rerunHighlightsLayout = debounce(() => {
  if (highlightsCachedData) {
    runHighlightsLayout(highlightsCachedData, HIGHLIGHTS_LAYOUT);
  }
}, 160);

function triggerLiveSnapshotDownload(grownItems) {
  let currentCounter = parseInt(localStorage.getItem("live_json_counter"), 10);
  if (isNaN(currentCounter) || currentCounter < 1) {
    currentCounter = 1;
  }

  const sectionEl = document.querySelector(".home-highlights");
  const titleEl = sectionEl?.querySelector(".section-title");
  const subtitleEl = sectionEl?.querySelector(".section-desc");

  const cleanItems = grownItems.map((item) => ({
    id: item.id,
    title: item.title,
    subtitle: item.subtitle,
    image: item.image,
    alt: item.alt,
    featured: item.featured,
    width: item.width,
    height: item.height,
    orientation: item.orientation,
  }));

  const payload = {
    sectionTitle: titleEl ? titleEl.textContent.trim() : "Highlights",
    sectionSubtitle: subtitleEl ? subtitleEl.textContent.trim() : "",
    items: cleanItems,
  };

  const jsonString = JSON.stringify(payload, null, 2);
  const blob = new Blob([jsonString], { type: "application/json" });
  const downloadUrl = URL.createObjectURL(blob);

  const filename = `live_${currentCounter}.json`;

  const link = document.createElement("a");
  link.href = downloadUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();

  document.body.removeChild(link);
  URL.revokeObjectURL(downloadUrl);

  console.log(`[Snapshot Log] Triggered download for: ${filename}`);
  localStorage.setItem("live_json_counter", currentCounter + 1);
}

export async function initHighlights() {
  const grid = document.getElementById("highlights-grid");
  if (!grid) return;

  try {
    highlightsCachedData = await fetchHighlightsData();
    runHighlightsLayout(highlightsCachedData, HIGHLIGHTS_LAYOUT);

    window.removeEventListener("resize", rerunHighlightsLayout);
    window.addEventListener("resize", rerunHighlightsLayout, { passive: true });
  } catch (error) {
    console.warn("Highlights JSON failed to load:", error);
    grid.innerHTML = "";
    grid.style.height = "0px";
  }
}
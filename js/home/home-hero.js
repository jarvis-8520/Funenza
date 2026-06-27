/* =========================================================
   HOME-HERO.JS
   Hero slider module for homepage

   Responsibilities:
   - Load slide data from ./data/home-hero.json
   - Render image/video slides
   - Handle dots, arrows, autoplay, swipe
   - Rebuild when crossing mobile breakpoint
   ========================================================= */

const HERO_MEDIA_PATH = "./images/hero/";
const HERO_JSON_PATH = "./data/home-hero.json";
const MOBILE_BREAKPOINT = 768;

let heroSlides = [];
let currentIndex = 0;
let autoplayTimer = null;
let arrowsBound = false;
let swipeBound = false;
let resizeBound = false;

/* --- Detect desktop or mobile --- */
function isMobile() {
  return window.innerWidth < MOBILE_BREAKPOINT;
}

/* --- Pick correct src based on screen size --- */
function getMediaSrc(srcField) {
  if (typeof srcField === "string") return HERO_MEDIA_PATH + srcField;
  if (isMobile() && srcField.mobile) return HERO_MEDIA_PATH + srcField.mobile;
  return HERO_MEDIA_PATH + srcField.desktop;
}

function getPosterSrc(posterField) {
  if (!posterField) return "";
  if (typeof posterField === "string") return HERO_MEDIA_PATH + posterField;
  if (isMobile() && posterField.mobile) return HERO_MEDIA_PATH + posterField.mobile;
  return HERO_MEDIA_PATH + posterField.desktop;
}

/* --- Build one slide element --- */
function buildSlide(slide, index) {
  const div = document.createElement("div");
  div.classList.add("hero-slide");
  div.dataset.index = index;

  if (slide.type === "image") {
    const picture = document.createElement("picture");

    // 1. If a mobile asset path exists in your JSON, add the native mobile source rule
    if (slide.src && slide.src.mobile) {
      const source = document.createElement("source");
      source.media = "(max-width: 767px)";
      source.srcset = HERO_MEDIA_PATH + slide.src.mobile;
      picture.appendChild(source);
    }

    // 2. Create the standard img element as the desktop fallback
    const img = document.createElement("img");
    
    // Check if slide.src is an object with a desktop property, otherwise fallback to slide.src string
    const desktopSrc = (slide.src && slide.src.desktop) ? slide.src.desktop : slide.src;
    img.src = HERO_MEDIA_PATH + desktopSrc;
    img.alt = slide.alt || "";
    
    // Since slide 0 is hardcoded in HTML, all these dynamic slides are in the background and can safely be lazy-loaded
    img.loading = index === 0 ? "eager" : "lazy";
    
    // Assemble the elements
    picture.appendChild(img);
    div.appendChild(picture);

  } else if (slide.type === "video") {
    const video = document.createElement("video");
    video.src = getMediaSrc(slide.src);
    video.poster = getPosterSrc(slide.poster);
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.autoplay = true;
    video.setAttribute("playsinline", "");
    div.appendChild(video);
  }

  return div;
}
/* --- Build dot indicators --- */
function buildDots(total) {
  const dotsEl = document.getElementById("hero-dots");
  if (!dotsEl) return;

  dotsEl.innerHTML = "";

  for (let i = 0; i < total; i++) {
    const dot = document.createElement("button");
    dot.classList.add("hero-dot");
    dot.setAttribute("type", "button");
    dot.setAttribute("aria-label", `Go to slide ${i + 1}`);
    dot.addEventListener("click", () => goToSlide(i));
    dotsEl.appendChild(dot);
  }
}

/* --- Update active dot --- */
function updateDots(index) {
  const dots = document.querySelectorAll(".hero-dot");
  dots.forEach((dot, i) => {
    dot.classList.toggle("is-active", i === index);
  });
}

/* --- Go to a specific slide --- */
function goToSlide(index) {
  const slides = document.querySelectorAll(".hero-slide");
  if (!slides.length) return;

  const currentSlide = slides[currentIndex];
  const currentVideo = currentSlide?.querySelector("video");
  if (currentVideo) currentVideo.pause();

  slides.forEach((slide) => slide.classList.remove("is-active"));

  currentIndex = (index + slides.length) % slides.length;
  slides[currentIndex].classList.add("is-active");

  const newVideo = slides[currentIndex].querySelector("video");
  if (newVideo) {
    const playPromise = newVideo.play();
    if (playPromise?.catch) playPromise.catch(() => {});
  }

  updateDots(currentIndex);
  resetAutoplay();
}

/* --- Next / Prev --- */
function nextSlide() {
  goToSlide(currentIndex + 1);
}

function prevSlide() {
  goToSlide(currentIndex - 1);
}

/* --- Autoplay --- */
function startAutoplay() {
  if (!heroSlides.length) return;

  const delay = heroSlides[currentIndex]?.delay || 5000;

  autoplayTimer = setTimeout(() => {
    nextSlide();
    startAutoplay();
  }, delay);
}

function resetAutoplay() {
  clearTimeout(autoplayTimer);
  startAutoplay();
}

/* --- Touch swipe support --- */
function initSwipe(el) {
  if (!el || swipeBound) return;

  let startX = 0;

  el.addEventListener(
    "touchstart",
    (e) => {
      startX = e.touches[0].clientX;
    },
    { passive: true }
  );

  el.addEventListener(
    "touchend",
    (e) => {
      const diff = startX - e.changedTouches[0].clientX;
      if (Math.abs(diff) < 50) return;
      if (diff > 0) nextSlide();
      else prevSlide();
    },
    { passive: true }
  );

  swipeBound = true;
}

/* --- Arrow buttons --- */
function initArrows() {
  if (arrowsBound) return;

  const prev = document.getElementById("hero-prev");
  const next = document.getElementById("hero-next");

  if (prev) prev.addEventListener("click", prevSlide);
  if (next) next.addEventListener("click", nextSlide);

  arrowsBound = true;
}

/* --- Render hero slides --- */
/* --- Render hero slides --- */
function renderHero(slides) {
  const track = document.getElementById("hero-track");
  const heroEl = document.querySelector(".home-hero");
  if (!track || !heroEl) return;

  // REMOVED: track.innerHTML = ""; 
  // We no longer clear this container so we don't wipe out our hardcoded Slide 0!

  clearTimeout(autoplayTimer);
  currentIndex = 0;

  slides.forEach((slide, i) => {
    // Skip creating slide 0 because it's already alive in index.html for instant performance loading
    if (i === 0) return;

    const el = buildSlide(slide, i);
    track.appendChild(el);
  });

  // If your first slide ever switches to a video, this safely triggers playback natively
  const firstVideo = track.querySelector(".hero-slide.is-active video");
  if (firstVideo) {
    const playPromise = firstVideo.play();
    if (playPromise?.catch) playPromise.catch(() => {});
  }

  buildDots(slides.length);
  updateDots(0);
  initArrows();
  initSwipe(heroEl);
  startAutoplay();
}
/* --- Main hero init --- */
export function initHero() {
  fetch(HERO_JSON_PATH)
    .then((res) => res.json())
    .then((slides) => {
      heroSlides = slides;
      renderHero(slides);
    })
    .catch((err) => {
      console.warn("Hero JSON failed to load:", err);
    });
}


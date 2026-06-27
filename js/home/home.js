/* =========================================================
   HOME.JS
   Homepage entry point

   Responsibilities:
   - Import homepage feature modules
   - Initialize all homepage sections
   ========================================================= */

import { initNavbar } from "../navbar.js";
import { initHero} from "./home-hero.js";
import { initZones } from "./home-zones.js";
import { initHighlights } from "./home-highlights.js";
import "./pacman-animation.js";
import "./zones-pacman-animation.js";

import { initCelebrate } from "./home-celebrate.js";
// import { initScrollReveal } from "./scroll-reveal.js";

document.addEventListener("DOMContentLoaded", () => {
  // initNavbar is handled globally by main.js
  initHero();
  initZones();
  initHighlights();
  initCelebrate();
  // initScrollReveal();
});
export function initNavbar() {
  const header = document.querySelector(".site-header");
  const toggle = document.querySelector(".navbar-toggle");
  const drawer = document.querySelector(".mobile-drawer");
  const closeBtn = document.querySelector(".mobile-close");
  const backdrop = document.querySelector(".mobile-backdrop");

  if (header) {
    let lastScrollY = window.scrollY;
    let ticking = false;

    header.classList.add("is-floating");

    const updateNavbarOnScroll = () => {
      const currentScrollY = window.scrollY;

      if (currentScrollY <= 8) {
        header.classList.remove("is-hidden-on-scroll");
        header.classList.remove("is-scrolled");
        lastScrollY = currentScrollY;
        ticking = false;
        return;
      }

      header.classList.add("is-scrolled");

      if (currentScrollY > lastScrollY + 2) {
        header.classList.add("is-hidden-on-scroll");
      } else if (currentScrollY < lastScrollY) {
        header.classList.remove("is-hidden-on-scroll");
      }

      lastScrollY = currentScrollY;
      ticking = false;
    };

    window.addEventListener(
      "scroll",
      () => {
        if (!ticking) {
          window.requestAnimationFrame(updateNavbarOnScroll);
          ticking = true;
        }
      },
      { passive: true }
    );
  }

  if (toggle && drawer && closeBtn && backdrop) {
    const openMenu = () => {
      drawer.removeAttribute("hidden");
      drawer.classList.add("is-open");
      backdrop.removeAttribute("hidden");
      toggle.setAttribute("aria-expanded", "true");
      document.body.style.overflow = "hidden";
    };

    const closeMenu = () => {
      drawer.classList.remove("is-open");
      backdrop.setAttribute("hidden", "");
      drawer.setAttribute("hidden", "");
      toggle.setAttribute("aria-expanded", "false");
      document.body.style.overflow = "";
    };

    toggle.addEventListener("click", () => {
      if (drawer.classList.contains("is-open")) {
        closeMenu();
      } else {
        openMenu();
      }
    });

    closeBtn.addEventListener("click", closeMenu);
    backdrop.addEventListener("click", closeMenu);

    drawer.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", closeMenu);
    });
  }
}

// Attach to window for global access (backward compatibility for main.js)
window.initNavbar = initNavbar;
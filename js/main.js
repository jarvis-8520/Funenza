async function loadComponent(targetId, filePath) {
  const target = document.getElementById(targetId);
  if (!target) return;

  try {
    const response = await fetch(filePath);
    if (!response.ok) {
      throw new Error(`Failed to load ${filePath}`);
    }

    const html = await response.text();
    target.innerHTML = html;
  } catch (error) {
    console.error(error);
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  await loadComponent("site-navbar", "./components/navbar.html");
  await loadComponent("site-footer", "./components/footer.html");
  await loadComponent("site-popup", "./components/inquiry-popup.html");

  if (typeof initNavbar === "function") {
    initNavbar();
  }
});
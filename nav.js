const siteNavRoot = document.querySelector("#site-nav-root");
const currentPage = document.body.dataset.page;
const sitePagesConfigPaths = [
  "config/published/site-pages.json",
  "config/site-pages.json"
];

const fallbackNavItems = [
  { key: "home", label: "hero逻辑页（首页）", href: "index.html?home=1" },
  { key: "explore", label: "地图开发者版本", href: "explore.html" },
  { key: "information", label: "Information", href: "information.html" },
  { key: "course-builder", label: "Course Builder", href: "course-builder.html" },
  { key: "ledger", label: "生活记账", href: "ledger.html" },
  { key: "question", label: "Question", href: "question.html" }
];

function renderNav(navItems) {
  siteNavRoot.innerHTML = `
  <button class="menu-trigger" aria-label="Open navigation">
    <span></span>
    <span></span>
    <span></span>
  </button>

  <div class="drawer-overlay"></div>

  <aside class="drawer">
    <div class="drawer-header">
      <button class="drawer-close" aria-label="Close navigation">×</button>
      <div class="drawer-title">Exploration & Decision</div>
    </div>

    <nav class="drawer-nav">
      ${navItems
        .map(
          (item) => `
            <a class="drawer-link ${item.key === currentPage ? "active" : ""}" href="${item.href}">
              ${item.label}
            </a>
          `
        )
        .join("")}
    </nav>
  </aside>
`;

  const menuTrigger = document.querySelector(".menu-trigger");
  const drawer = document.querySelector(".drawer");
  const drawerOverlay = document.querySelector(".drawer-overlay");
  const drawerClose = document.querySelector(".drawer-close");

  function openDrawer() {
    drawer.classList.add("open");
    drawerOverlay.classList.add("show");
    document.body.classList.add("drawer-open");
  }

  function closeDrawer() {
    drawer.classList.remove("open");
    drawerOverlay.classList.remove("show");
    document.body.classList.remove("drawer-open");
  }

  menuTrigger.addEventListener("click", openDrawer);
  drawerClose.addEventListener("click", closeDrawer);
  drawerOverlay.addEventListener("click", closeDrawer);
}

async function fetchSitePagesConfig(path) {
  const url = `${path}?v=${Date.now()}`;
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

async function loadNavItems() {
  for (const path of sitePagesConfigPaths) {
    try {
      const data = await fetchSitePagesConfig(path);
      const pages = Array.isArray(data.pages) ? data.pages : [];
      return pages
        .filter((page) => page.showInNavigation !== false && page.status !== "hidden")
        .map((page) => ({
          key: page.key,
          label: page.label,
          href: page.href
        }));
    } catch (error) {
      console.warn(`Failed to load site pages config from ${path}.`, error);
    }
  }

  console.warn("Failed to load site pages config. Using fallback navigation.");
  return fallbackNavItems;
}

loadNavItems().then(renderNav);

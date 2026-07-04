const siteNavRoot = document.querySelector("#site-nav-root");
const currentPage = document.body.dataset.page;

const navItems = [
  { key: "home", label: "hero逻辑页（首页）", href: "index.html?home=1" },
  { key: "map-tool", label: "地图工具", href: "map-tool.html" },
  { key: "explore", label: "地图开发者版本", href: "explore.html" },
  { key: "information", label: "Information", href: "information.html" },
  { key: "question", label: "Question", href: "question.html" }
];

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

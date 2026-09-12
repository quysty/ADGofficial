const siteNavRoot = document.querySelector("#site-nav-root");
const currentPage = document.body.dataset.page;
const sitePagesConfigPaths = [
  "config/published/site-pages.json",
  "config/site-pages.json"
];

const fallbackNavItems = [
  { key: "home", label: "Residence Finder", href: "index.html?home=1" },
  { key: "explore", label: "Map", href: "explore.html" },
  { key: "information", label: "Information", href: "information.html" },
  { key: "course-builder", label: "Course Builder", href: "course-builder.html" },
  { key: "ledger", label: "Balance", href: "ledger.html" },
  { key: "question", label: "Question", href: "question.html" }
];

const navSections = [
  {
    key: "anu-explore",
    label: "ANU Explore",
    pageKeys: ["home", "explore", "information", "question"]
  },
  { key: "course-builder", label: "", pageKeys: ["course-builder"] },
  { key: "balance", label: "", pageKeys: ["ledger"] }
];

const navIcons = {
  home: `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 17.5V9.8L12 4l8 5.8v7.7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z" />
      <path d="M9 19.5v-6h6v6" />
    </svg>`,
  explore: `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m4 6 5-2 6 2 5-2v14l-5 2-6-2-5 2V6Z" />
      <path d="M9 4v14M15 6v14" />
    </svg>`,
  information: `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 10v6M12 7h.01" />
    </svg>`,
  question: `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M9.4 9a2.8 2.8 0 1 1 4.8 2c-1.4 1.1-2.2 1.7-2.2 3" />
      <path d="M12 18h.01" />
      <circle cx="12" cy="12" r="9" />
    </svg>`,
  "course-builder": `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <path d="M4 9h16M9 9v11M15 9v11M9 14h11" />
    </svg>`,
  ledger: `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H18a2 2 0 0 1 2 2v11H6.5A2.5 2.5 0 0 1 4 15.5v-8Z" />
      <path d="M4 8h13M15 12h5v4h-5a2 2 0 1 1 0-4Z" />
    </svg>`
};

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function pageIcon(key) {
  return navIcons[key] || navIcons.information;
}

function renderNav(navItems) {
  if (!siteNavRoot) return;

  const itemsByKey = new Map(navItems.map((item) => [item.key, item]));
  const renderedKeys = new Set(navSections.flatMap((section) => section.pageKeys));
  const extraItems = navItems.filter((item) => !renderedKeys.has(item.key));
  const sections = navSections.map((section, index) => ({
    ...section,
    items: section.pageKeys.map((key) => itemsByKey.get(key)).filter(Boolean)
      .concat(index === 0 ? extraItems : [])
  })).filter((section) => section.items.length);

  siteNavRoot.innerHTML = `
  <aside id="siteSidebar" class="site-sidebar" aria-label="Product navigation">
    <button
      class="site-sidebar-toggle"
      type="button"
      aria-controls="siteSidebar"
      aria-expanded="false"
      aria-label="Expand navigation"
    >
      <span class="site-sidebar-toggle__mark" aria-hidden="true">
        <svg viewBox="0 0 24 24">
          <path d="M6 5.5h5v5H6zM13 5.5h5v5h-5zM6 13.5h5v5H6zM13 13.5h5v5h-5z" />
        </svg>
      </span>
      <span class="site-sidebar-toggle__label">All products</span>
      <span class="site-sidebar-toggle__chevron" aria-hidden="true">›</span>
    </button>

    <nav class="site-sidebar-nav" aria-label="Pages">
      ${sections.map((section) => `
        <section class="site-sidebar-group" aria-label="${escapeHtml(section.label || section.items[0].label)}">
          ${section.label ? `<h2 class="site-sidebar-group__title">${escapeHtml(section.label)}</h2>` : ""}
          ${section.items.map((item) => {
            const active = item.key === currentPage;
            return `
              <a
                class="site-sidebar-link ${active ? "active" : ""}"
                href="${escapeHtml(item.href)}"
                title="${escapeHtml(item.label)}"
                ${active ? 'aria-current="page"' : ""}
              >
                <span class="site-sidebar-link__icon" aria-hidden="true">${pageIcon(item.key)}</span>
                <span class="site-sidebar-link__label">${escapeHtml(item.label)}</span>
              </a>`;
          }).join("")}
        </section>`).join("")}
    </nav>
  </aside>
  <button class="site-sidebar-backdrop" type="button" aria-label="Close navigation"></button>
`;

  const sidebar = siteNavRoot.querySelector(".site-sidebar");
  const toggle = siteNavRoot.querySelector(".site-sidebar-toggle");
  const backdrop = siteNavRoot.querySelector(".site-sidebar-backdrop");

  function setExpanded(expanded) {
    sidebar.classList.toggle("is-expanded", expanded);
    toggle.setAttribute("aria-expanded", String(expanded));
    toggle.setAttribute("aria-label", expanded ? "Collapse navigation" : "Expand navigation");
    toggle.querySelector(".site-sidebar-toggle__chevron").textContent = expanded ? "‹" : "›";
    try {
      window.sessionStorage.setItem("anu-site-sidebar-expanded", String(expanded));
    } catch {
      // Navigation still works when browser storage is unavailable.
    }
  }

  let initiallyExpanded = false;
  try {
    initiallyExpanded = window.sessionStorage.getItem("anu-site-sidebar-expanded") === "true";
  } catch {
    // Keep the default collapsed state.
  }
  setExpanded(initiallyExpanded);

  toggle.addEventListener("click", () => setExpanded(!sidebar.classList.contains("is-expanded")));
  backdrop.addEventListener("click", () => setExpanded(false));
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && sidebar.classList.contains("is-expanded")) {
      setExpanded(false);
      toggle.focus();
    }
  });
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

if (siteNavRoot) {
  document.body.classList.add("has-site-sidebar");
  loadNavItems().then(renderNav);
}

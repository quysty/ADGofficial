/* =========================================================
   INFORMATION PAGE SCRIPT
   当前用途：
   1) 读取 URL 参数 dorm
   2) 从 window.DORM_DATA 中查找对应宿舍
   3) 渲染 information.html 的宿舍信息

   注意：
   - 这里只负责 Information 页面
   - 不负责修改首页推荐逻辑
   - 不负责 Explore 地图逻辑
   - 不负责样式
   ========================================================= */

(function initInformationPage() {
  const allDorms = Array.isArray(window.DORM_DATA) ? window.DORM_DATA : [];
  const dorms = allDorms.filter((dorm) => dorm.isInformationVisible !== false);
  const params = new URLSearchParams(window.location.search);
  const dormId = params.get("dorm");

  const pageTitle = document.getElementById("informationTitle");
  const pageSubtitle = document.getElementById("informationSubtitle");
  const card = document.getElementById("informationDormCard");
  const image = document.getElementById("informationDormImage");
  const cardTitle = document.getElementById("informationDormName");
  const cardText = document.getElementById("informationDormDescription");
  const details = document.getElementById("informationDormDetails");
  const drawer = document.getElementById("informationDrawer");
  const drawerBackdrop = document.getElementById("informationDrawerBackdrop");
  const drawerClose = document.getElementById("informationDrawerClose");
  const drawerContent = document.getElementById("informationDrawerContent");
  const compareDrawer = document.getElementById("informationCompareDrawer");
  const compareDrawerClose = document.getElementById("informationCompareDrawerClose");
  const compareDrawerContent = document.getElementById("informationCompareDrawerContent");
  let activePrimaryDormId = null;

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function renderList(title, items) {
    const list = Array.isArray(items) ? items : [];

    if (!list.length) {
      return "";
    }

    return `
      <h3>${escapeHtml(title)}</h3>
      <ul>
        ${list.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
      </ul>
    `;
  }

  function renderPlaceholder() {
    if (card) {
      card.classList.add("information-card--overview");
      card.classList.remove("information-card--detail", "information-card--fallback");
    }

    if (pageTitle) pageTitle.textContent = "Residence overview";
    if (pageSubtitle) {
      pageSubtitle.textContent =
        "Browse ANU residence information, compare living styles, and open a residence profile when you need more detail.";
    }

    if (image) {
      image.src = "assets/images/IMG_7082.jpeg";
      image.alt = "Information page overview image";
    }

    if (cardTitle) cardTitle.textContent = "";
    if (cardText) {
      cardText.textContent =
        "";
    }

    if (details) {
      details.innerHTML = `
        <div class="information-overview-grid">
          ${dorms
            .map(
              (dorm) => `
                <a class="information-overview-card" href="information.html?dorm=${escapeHtml(dorm.id)}" data-info-dorm="${escapeHtml(dorm.id)}">
                  <span class="information-overview-card__name">${escapeHtml(dorm.name)}</span>
                  <span class="information-overview-card__meta">${escapeHtml(dorm.type || "Residence")}</span>
                  <span class="information-overview-card__summary">${escapeHtml(dorm.summary || dorm.description || "")}</span>
                </a>
              `
            )
            .join("")}
        </div>
      `;
    }
  }

  function renderInvalidDorm() {
    if (card) {
      card.classList.add("information-card--fallback");
      card.classList.remove("information-card--overview", "information-card--detail");
    }

    if (pageTitle) pageTitle.textContent = "Residence overview";
    if (pageSubtitle) {
      pageSubtitle.textContent =
        "Residence information is not available yet.";
    }

    if (image) {
      image.src = "assets/images/IMG_7082.jpeg";
      image.alt = "Information fallback image";
    }

    if (cardTitle) cardTitle.textContent = "Residence not available";
    if (cardText) {
      cardText.textContent =
        "This residence is either hidden, incomplete, or not yet connected to the public Information page.";
    }

    if (details) {
      details.innerHTML = `
        <a class="information-back-link" href="information.html">Back to all residences</a>
      `;
    }
  }

  function renderDorm(dorm) {
    document.title = `${dorm.name} | ANU Dorm Guide`;

    if (card) {
      card.classList.add("information-card--detail");
      card.classList.remove("information-card--overview", "information-card--fallback");
    }

    if (pageTitle) pageTitle.textContent = dorm.name;
    if (pageSubtitle) {
      pageSubtitle.textContent =
        dorm.description || "Dorm information loaded from centralized dorm data.";
    }

    if (image && dorm.image) {
      image.src = dorm.image;
      image.alt = `${dorm.name} image`;
    }

    if (cardTitle) cardTitle.textContent = "";
    if (cardText) {
      cardText.textContent =
        "";
    }

    function renderItems(items) {
      const list = Array.isArray(items) ? items : [];

      if (!list.length) {
        return `<li>Not available yet.</li>`;
      }

      return list.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
    }

    if (details) {
      details.innerHTML = `
        <div class="information-detail-grid">
          <section class="information-detail-item">
            <span>Best for</span>
            <p>${escapeHtml(dorm.bestFor || "—")}</p>
          </section>

          <section class="information-detail-item">
            <span>Location feel</span>
            <p>${escapeHtml(dorm.locationFeel || "—")}</p>
          </section>

          <section class="information-detail-item">
            <span>Main trade-off</span>
            <p>${escapeHtml(dorm.tradeOff || "—")}</p>
          </section>

          <section class="information-detail-item">
            <span>Residence type</span>
            <p>${escapeHtml(dorm.type || "—")}</p>
          </section>
        </div>

        <div class="information-pro-con-grid">
          <section class="information-list-panel">
            <h3>Pros</h3>
            <ul>
              ${renderItems(dorm.pros)}
            </ul>
          </section>

          <section class="information-list-panel">
            <h3>Cons</h3>
            <ul>
              ${renderItems(dorm.cons)}
            </ul>
          </section>
        </div>

        <a class="information-back-link" href="information.html">Back to all residences</a>
      `;
    }
  }

  function formatRent(dorm) {
    if (!dorm || dorm.pricePerWeek === null || dorm.pricePerWeek === undefined) {
      return "To be verified";
    }

    return `$${escapeHtml(dorm.pricePerWeek)} per week`;
  }

  function renderDrawerList(items) {
    const list = Array.isArray(items) ? items : [];

    if (!list.length) {
      return "<li>Not available yet.</li>";
    }

    return list.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
  }

  function renderFacts(dorm) {
    return `
      <div class="information-drawer__facts">
        <div>
          <span>Rent</span>
          <strong>${formatRent(dorm)}</strong>
        </div>
        <div>
          <span>Type</span>
          <strong>${escapeHtml(dorm.type || "—")}</strong>
        </div>
        <div>
          <span>Location</span>
          <strong>${escapeHtml(dorm.location || "—")}</strong>
        </div>
      </div>
    `;
  }

  function renderSections(dorm) {
    return `
      <section class="information-drawer__section">
        <h3>Best for</h3>
        <p>${escapeHtml(dorm.bestFor || "—")}</p>
      </section>

      <section class="information-drawer__section">
        <h3>Location feel</h3>
        <p>${escapeHtml(dorm.locationFeel || "—")}</p>
      </section>

      <section class="information-drawer__section">
        <h3>Main trade-off</h3>
        <p>${escapeHtml(dorm.tradeOff || "—")}</p>
      </section>
    `;
  }

  function renderProsCons(dorm) {
    return `
      <div class="information-drawer__two-col">
        <section>
          <h3>Pros</h3>
          <ul>${renderDrawerList(dorm.pros)}</ul>
        </section>
        <section>
          <h3>Cons</h3>
          <ul>${renderDrawerList(dorm.cons)}</ul>
        </section>
      </div>
    `;
  }

  function renderCompareCandidates(currentDormId) {
    const candidates = dorms.filter((item) => item.id !== currentDormId);

    if (!candidates.length) {
      return `<p class="information-drawer__compare-empty">No additional residence is available for compare.</p>`;
    }

    return `
      <div class="information-drawer__compare-list" hidden>
        ${candidates
          .map(
            (item) => `
              <button class="information-drawer__compare-option" type="button" data-compare-dorm="${escapeHtml(item.id)}">
                ${escapeHtml(item.name)}
              </button>
            `
          )
          .join("")}
      </div>
    `;
  }

  function renderActions(dorm, options = {}) {
    const mode = options.mode === "compare" ? "compare" : "primary";
    const showCompare = Boolean(options.showCompare);

    return `
      <div class="information-drawer__actions" data-drawer-actions="${mode}">
        <a class="information-drawer__full-link" href="information.html?dorm=${escapeHtml(dorm.id)}">Open detail</a>
        ${
          showCompare
            ? `
              <div class="information-drawer__compare-picker">
                <button class="information-drawer__compare-button" type="button" data-information-compare-toggle aria-expanded="false">
                  Compare
                </button>
                ${renderCompareCandidates(dorm.id)}
              </div>
            `
            : ""
        }
      </div>
    `;
  }

  function renderDrawerBody(dorm, options = {}) {
    const mode = options.mode === "compare" ? "compare" : "primary";

    return `
      <div class="information-drawer-panel information-drawer-panel--${mode}">
      <p class="information-drawer__eyebrow">Residence detail</p>
      <h2 class="information-drawer__title">${escapeHtml(dorm.name)}</h2>
      <p class="information-drawer__summary">${escapeHtml(dorm.description || dorm.summary || "")}</p>
      ${renderFacts(dorm)}
      ${renderSections(dorm)}
      ${renderProsCons(dorm)}
      ${renderActions(dorm, options)}
      </div>
    `;
  }

  function bindPrimaryDrawerActions() {
    if (!drawerContent) return;

    const compareToggle = drawerContent.querySelector("[data-information-compare-toggle]");
    const compareList = drawerContent.querySelector(".information-drawer__compare-list");

    if (compareToggle && compareList) {
      compareToggle.addEventListener("click", () => {
        const expanded = compareToggle.getAttribute("aria-expanded") === "true";
        compareToggle.setAttribute("aria-expanded", expanded ? "false" : "true");
        compareList.hidden = expanded;
        compareList.classList.toggle("is-open", !expanded);
      });

      compareList.addEventListener("click", (event) => {
        const target = event.target.closest("[data-compare-dorm]");
        if (!target) return;

        const compareDormId = target.getAttribute("data-compare-dorm");
        const compareDorm = dorms.find((item) => item.id === compareDormId);
        if (!compareDorm) return;

        compareList.hidden = true;
        compareList.classList.remove("is-open");
        compareToggle.setAttribute("aria-expanded", "false");
        openCompareDrawer(compareDorm);
      });
    }
  }

  function openInformationDrawer(dorm) {
    if (!drawer || !drawerBackdrop || !drawerContent || !dorm) return;

    activePrimaryDormId = dorm.id;
    drawerContent.innerHTML = renderDrawerBody(dorm, { mode: "primary", showCompare: true });
    bindPrimaryDrawerActions();
    closeCompareDrawer({ keepSplitMode: true });

    drawer.hidden = false;
    drawerBackdrop.hidden = false;

    requestAnimationFrame(() => {
      drawer.classList.add("is-open");
      drawerBackdrop.classList.add("is-open");
      drawer.setAttribute("aria-hidden", "false");
    });
  }

  function openCompareDrawer(dorm) {
    if (!compareDrawer || !compareDrawerContent || !dorm) return;
    if (dorm.id === activePrimaryDormId) return;

    compareDrawerContent.innerHTML = renderDrawerBody(dorm, { mode: "compare", showCompare: false });
    compareDrawer.hidden = false;
    compareDrawer.scrollTop = 0;

    if (drawer) {
      drawer.classList.add("is-split");
      drawer.scrollTop = 0;
    }

    requestAnimationFrame(() => {
      compareDrawer.classList.add("is-open");
      compareDrawer.setAttribute("aria-hidden", "false");
    });
  }

  function closeCompareDrawer(options = {}) {
    if (!compareDrawer) return;

    compareDrawer.classList.remove("is-open");
    compareDrawer.setAttribute("aria-hidden", "true");

    if (drawer) {
      drawer.classList.remove("is-split");
    }

    window.setTimeout(() => {
      if (!compareDrawer.classList.contains("is-open")) {
        compareDrawer.hidden = true;
        if (!options.keepSplitMode && drawer) {
          drawer.classList.remove("is-split");
        }
      }
    }, 180);
  }

  function closeInformationDrawer() {
    if (!drawer || !drawerBackdrop) return;

    closeCompareDrawer();
    activePrimaryDormId = null;
    drawer.classList.remove("is-open");
    drawerBackdrop.classList.remove("is-open");
    drawer.setAttribute("aria-hidden", "true");

    window.setTimeout(() => {
      if (!drawer.classList.contains("is-open")) {
        drawer.hidden = true;
        drawerBackdrop.hidden = true;
      }
    }, 180);
  }

  function bindOverviewDrawerActions() {
    document.querySelectorAll("[data-info-dorm]").forEach((link) => {
      link.addEventListener("click", (event) => {
        const dormId = link.getAttribute("data-info-dorm");
        const dorm = dorms.find((item) => item.id === dormId);

        if (!dorm) return;

        event.preventDefault();
        openInformationDrawer(dorm);
      });
    });
  }

  if (drawerClose) {
    drawerClose.addEventListener("click", closeInformationDrawer);
  }

  if (compareDrawerClose) {
    compareDrawerClose.addEventListener("click", () => {
      closeCompareDrawer();
    });
  }

  if (drawerBackdrop) {
    drawerBackdrop.addEventListener("click", closeInformationDrawer);
  }

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeInformationDrawer();
    }
  });


  if (!dormId) {
    renderPlaceholder();
    bindOverviewDrawerActions();
    return;
  }

  const dorm = dorms.find((item) => item.id === dormId);

  if (!dorm) {
    renderInvalidDorm();
    return;
  }

  renderDorm(dorm);
})();

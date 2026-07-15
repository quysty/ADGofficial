(() => {
  const root = document.querySelector("#degreeProgress");
  if (!root) return;

  const metrics = {
    "bacct-1000": { target: 8, mode: "maximum", label: "BACCT 1000 level" },
    "bcomp-1000": { target: 6, mode: "maximum", label: "BCOMP 1000 level" },
    "bcomp-advanced-comp": {
      target: 4,
      mode: "minimum",
      label: "BCOMP COMP 3000 and 4000 level"
    }
  };

  function dots(count) {
    return Array.from({ length: count }, () => '<span class="degree-progress__dot"></span>').join("");
  }

  root.innerHTML = `
    <section class="degree-progress__rule degree-progress__rule--maximum" aria-labelledby="level-1000-rule-title">
      <h2 id="level-1000-rule-title" class="degree-progress__rule-title">1000 LEVEL <span>MAX</span></h2>
      <div class="degree-progress__groups">
        <div class="degree-progress__metric" data-progress-metric="bacct-1000">
          <div class="degree-progress__metric-head"><span>BACCT</span><strong data-progress-value>0/8 courses</strong></div>
          <div class="degree-progress__dots" data-progress-dots role="progressbar">${dots(8)}</div>
        </div>
        <div class="degree-progress__metric" data-progress-metric="bcomp-1000">
          <div class="degree-progress__metric-head"><span>BCOMP</span><strong data-progress-value>0/6 courses</strong></div>
          <div class="degree-progress__dots" data-progress-dots role="progressbar">${dots(6)}</div>
        </div>
      </div>
    </section>

    <section class="degree-progress__rule degree-progress__rule--advanced" aria-labelledby="advanced-comp-rule-title">
      <h2 id="advanced-comp-rule-title" class="degree-progress__rule-title">COMP 3000/4000 <span>MIN</span></h2>
      <div class="degree-progress__groups">
        <div class="degree-progress__metric" data-progress-metric="bcomp-advanced-comp">
          <div class="degree-progress__metric-head"><span>BCOMP</span><strong data-progress-value>0/4 courses</strong></div>
          <div class="degree-progress__dots" data-progress-dots role="progressbar">${dots(4)}</div>
        </div>
      </div>
    </section>
  `;

  function sumUnits(entries) {
    return entries.reduce((total, entry) => total + (Number(entry.units) || 0), 0);
  }

  function uniqueEntries(entries) {
    const entriesByCode = new Map();
    entries.forEach((entry) => {
      if (entry?.code && !entriesByCode.has(entry.code)) entriesByCode.set(entry.code, entry);
    });
    return [...entriesByCode.values()];
  }

  function courseEquivalents(entries) {
    return sumUnits(entries) / 6;
  }

  function formatCourseCount(value) {
    return Number.isInteger(value) ? String(value) : value.toFixed(1);
  }

  function renderMetric(name, currentValue) {
    const metric = metrics[name];
    const element = root.querySelector(`[data-progress-metric="${name}"]`);
    if (!metric || !element) return;

    const current = Math.max(0, Number(currentValue) || 0);
    const overLimit =
      (metric.mode === "maximum" && current > metric.target) ||
      (metric.mode === "exact" && current > metric.target);
    const complete =
      (metric.mode === "minimum" && current >= metric.target) ||
      (metric.mode === "exact" && current === metric.target);
    const value = element.querySelector("[data-progress-value]");
    const dotContainer = element.querySelector("[data-progress-dots]");
    const activeDotCount = Math.min(Math.ceil(current), metric.target);

    element.classList.toggle("is-complete", complete);
    element.classList.toggle("is-over-limit", overLimit);
    if (value) value.textContent = `${formatCourseCount(current)}/${metric.target} courses`;
    if (dotContainer) {
      dotContainer.querySelectorAll(".degree-progress__dot").forEach((dot, index) => {
        dot.classList.toggle("is-active", index < activeDotCount);
      });
      dotContainer.setAttribute("aria-label", metric.label);
      dotContainer.setAttribute("aria-valuemin", "0");
      dotContainer.setAttribute("aria-valuemax", String(metric.target));
      dotContainer.setAttribute("aria-valuenow", String(current));
    }
  }

  function update(entries = []) {
    const plannedEntries = uniqueEntries(entries.filter((entry) => entry?.code));
    const selectedMajorCode = document.querySelector("#bcompMajorSelect")?.value || "";
    const bacctSlotEntries = plannedEntries.filter((entry) => entry.slotComponent === "BACCT");
    const bcompSlotEntries = plannedEntries.filter((entry) => entry.slotComponent === "BCOMP");
    const bacctCoreEntries = bacctSlotEntries.filter(
      (entry) => entry.packageComponent === "BACCT" && entry.programRole === "compulsory"
    );
    const bacctElectiveEntries = bacctSlotEntries.filter(
      (entry) => entry.packageComponent === "BACCT" && entry.programRole === "elective_option"
    );
    const bacctValidEntries = uniqueEntries([...bacctCoreEntries, ...bacctElectiveEntries]);
    const bcompCoreEntries = bcompSlotEntries.filter(
      (entry) =>
        entry.packageComponent === "BCOMP" &&
        !entry.majorCode &&
        entry.choiceGroup !== "BCOMP_ICT_RELATED" &&
        ["choice", "compulsory"].includes(entry.programRole)
    );
    const bcompMajorEntries = bcompSlotEntries.filter(
      (entry) => Boolean(selectedMajorCode) && entry.majorCode === selectedMajorCode
    );
    const bcompIctEntries = bcompSlotEntries.filter(
      (entry) => !entry.majorCode && entry.choiceGroup === "BCOMP_ICT_RELATED"
    );
    const bcompValidEntries = uniqueEntries([
      ...bcompCoreEntries,
      ...bcompMajorEntries,
      ...bcompIctEntries
    ]);
    const values = {
      "bacct-1000": courseEquivalents(
        bacctValidEntries.filter((entry) => entry.level === 1000)
      ),
      "bcomp-1000": courseEquivalents(
        bcompValidEntries.filter((entry) => entry.level === 1000)
      ),
      "bcomp-advanced-comp": courseEquivalents(
        bcompValidEntries.filter(
          (entry) =>
            entry.subjectCode === "COMP" && (entry.level === 3000 || entry.level === 4000)
        )
      )
    };

    Object.entries(values).forEach(([name, value]) => renderMetric(name, value));
  }

  window.CourseDegreeProgress = { update };
  update([]);
})();

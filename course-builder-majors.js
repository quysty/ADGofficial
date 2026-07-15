(() => {
  const catalog = window.BcompMajorCatalog;
  const select = document.querySelector("#bcompMajorSelect");
  const mount = document.querySelector("#bcompMajorPanels");
  const emptyState = document.querySelector("#bcompMajorEmpty");

  if (!catalog?.majors?.length || !select || !mount || !emptyState) return;

  function groupHeading(group) {
    const courseCount = group.courseCodes.length;
    const itemName = group.selectionMode === "all" ? "course" : "option";
    const courseLabel = `${courseCount} ${itemName}${courseCount === 1 ? "" : "s"}`;
    return `${group.label} ${group.units} units · ${courseLabel}`;
  }

  function createCourseSlot(courseCode, major, group) {
    const courseData = catalog.courses[courseCode];
    const slot = document.createElement("div");
    const card = document.createElement("article");
    const code = document.createElement("strong");
    const title = document.createElement("span");
    const units = document.createElement("b");

    slot.className = "course-library-slot";
    card.className = "course-card course-library-card";
    card.dataset.courseCode = courseCode;
    card.dataset.choiceGroupOverride = "none";
    card.dataset.planningComponent = "BCOMP";
    card.dataset.majorCode = major.code;
    card.dataset.majorRequirementGroup = group.id;
    card.dataset.officialTitle = courseData.title;
    code.textContent = courseCode;
    title.textContent = courseData.displayTitle || courseData.title;
    units.textContent = courseData.unitsLabel || `${courseData.units} units`;

    card.append(code, title, units);
    slot.append(card);
    return slot;
  }

  function createMajorPanel(major) {
    const panel = document.createElement("section");
    const title = document.createElement("h4");
    const constraints = document.createElement("p");
    const constraintParts = [`${catalog.totalUnits} units`];

    panel.className = "bcomp-major-panel";
    panel.dataset.majorPanel = major.code;
    panel.hidden = true;
    title.className = "bcomp-major-panel__title";
    title.textContent = `${major.code} · ${major.title}`;
    constraints.className = "bcomp-major-panel__constraints";

    if (major.constraints.maximum1000LevelUnits) {
      constraintParts.push(`1000-level ≤ ${major.constraints.maximum1000LevelUnits} units`);
    }
    if (major.constraints.minimum3000Or4000LevelUnits) {
      constraintParts.push(
        `3000/4000-level ≥ ${major.constraints.minimum3000Or4000LevelUnits} units`
      );
    }
    constraints.textContent = constraintParts.join(" · ");
    panel.append(title, constraints);

    major.groups.forEach((group) => {
      const groupElement = document.createElement("section");
      const heading = document.createElement("h5");
      const grid = document.createElement("div");

      groupElement.className = "bcomp-major-group";
      groupElement.dataset.majorRequirementGroup = group.id;
      heading.className = "bcomp-major-group__title";
      heading.textContent = groupHeading(group);
      grid.className = "course-library-grid";
      grid.setAttribute("aria-label", `${major.code} ${groupHeading(group)}`);

      group.courseCodes.forEach((courseCode) => {
        grid.append(createCourseSlot(courseCode, major, group));
      });
      groupElement.append(heading, grid);
      panel.append(groupElement);
    });

    return panel;
  }

  catalog.majors.forEach((major) => {
    const option = document.createElement("option");
    option.value = major.code;
    option.textContent = `${major.code} ${major.title}`;
    select.append(option);
    mount.append(createMajorPanel(major));
  });

  function showSelectedMajor() {
    const selectedMajorCode = select.value;
    mount.querySelectorAll("[data-major-panel]").forEach((panel) => {
      panel.hidden = panel.dataset.majorPanel !== selectedMajorCode;
    });
    emptyState.hidden = Boolean(selectedMajorCode);
    mount.dataset.activeMajor = selectedMajorCode;
  }

  select.addEventListener("change", showSelectedMajor);
  showSelectedMajor();
})();

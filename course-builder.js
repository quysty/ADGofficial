const courseCards = document.querySelectorAll(".course-card");
const shelfSlots = document.querySelectorAll(".course-slot");
const librarySlots = document.querySelectorAll(".course-library-slot");
const degreeYears = document.querySelectorAll(".degree-year");
const courseBuilderGridOverlay = document.querySelector("#courseBuilderGrid");
const courseBuilderGridToggle = document.querySelector("#courseBuilderGridToggle");
const PLANNING_START_YEAR = 2026;
const PLANNING_END_YEAR = 2029;
const TERM_SEQUENCE = ["S1", "S2", "SPRING", "SUMMER"];
const TERM_LABELS = {
  S1: "Semester 1",
  S2: "Semester 2",
  SPRING: "Spring Session",
  SUMMER: "Summer Session"
};
const currentProgramContext = {
  academicYear: PLANNING_START_YEAR,
  codes: ["BACCT-BCOMP", "BACCT", "BCOMP"],
  groups: ["CBE degree"],
  types: []
};
const FALLBACK_OFFERING_PATTERNS = [
  {
    codes: [
      "BUSN1001",
      "BUSN1002",
      "BUSN2011",
      "BUSN2015",
      "BUSN2037",
      "BUSN3001",
      "BUSN3014",
      "COMP1100",
      "COMP1110",
      "COMP2100",
      "COMP2400",
      "ECON1101",
      "ECON1102",
      "FINM1001",
      "STAT1008",
      "STAT2008"
    ],
    terms: ["S1", "S2"]
  },
  {
    codes: [
      "BUSN2101",
      "BUSN3002",
      "CBEA2001",
      "COMP1130",
      "COMP2300",
      "MATH1005",
      "MATH2222"
    ],
    terms: ["S1"]
  },
  {
    codes: ["BUSN1101", "BUSN3017", "BUSN3051", "COMP1140", "COMP1600"],
    terms: ["S2"]
  }
];
const coursePackageByCode = new Map();
let draggedCourse = null;
let targetSlot = null;
let activePointerId = null;
let pointerStart = null;
let dragSourceRect = null;
let dragPointerOffset = null;
let dragPreview = null;
let dragStarted = false;
let courseOfferingDataReady = false;
let selectedRelationshipCourseCode = "";

function assignShelfSlotTerms(startYear = PLANNING_START_YEAR) {
  degreeYears.forEach((yearElement, yearIndex) => {
    const academicYear = startYear + yearIndex;
    const termSlotIndexes = new Map();
    const yearSlots = yearElement.querySelectorAll(".course-slot");
    const standardSlots = Array.from(
      yearElement.querySelectorAll(":scope > .course-rack > .course-slot")
    );
    yearElement.dataset.academicYear = String(academicYear);

    yearSlots.forEach((slot) => {
      const shortSession = slot.closest(".course-short-session");
      const standardSlotIndex = standardSlots.indexOf(slot);
      const planningTerm =
        shortSession?.dataset.planningTerm || (standardSlotIndex < 5 ? "S1" : "S2");
      const termSlotIndex = termSlotIndexes.get(planningTerm) || 0;
      const columnIndex = standardSlotIndex % 5;
      const programComponent = !shortSession && columnIndex === 4 ? "EXTRA" : "";
      slot.dataset.academicYear = String(academicYear);
      slot.dataset.planningTerm = planningTerm;
      slot.dataset.planSlotId = `Y${yearIndex + 1}:${planningTerm}:${termSlotIndex + 1}`;
      slot.dataset.programComponent = programComponent;
      termSlotIndexes.set(planningTerm, termSlotIndex + 1);
      slot.setAttribute(
        "aria-label",
        `${academicYear} ${TERM_LABELS[planningTerm] || planningTerm} course slot`
      );
    });
  });
}

assignShelfSlotTerms();

function syncGridToggle() {
  if (!courseBuilderGridOverlay || !courseBuilderGridToggle) return;
  const gridVisible = !courseBuilderGridOverlay.hidden;
  courseBuilderGridToggle.setAttribute("aria-pressed", String(gridVisible));
  courseBuilderGridToggle.textContent = gridVisible ? "网格：开" : "网格：关";
}

courseBuilderGridToggle?.addEventListener("click", () => {
  if (!courseBuilderGridOverlay) return;
  courseBuilderGridOverlay.hidden = !courseBuilderGridOverlay.hidden;
  syncGridToggle();
});

syncGridToggle();

librarySlots.forEach((slot, index) => {
  const slotId = `library-slot-${index}`;
  const course = slot.querySelector(":scope > .course-card");
  slot.dataset.librarySlotId = slotId;
  if (course) {
    course.dataset.libraryOrigin = slotId;
    course.dataset.courseCode = course.querySelector("strong")?.textContent.trim() || "";
  }
});

function exportCoursePlanState() {
  const majorCode = document.querySelector("#bcompMajorSelect")?.value || "";
  const placements = Array.from(shelfSlots).flatMap((slot) => {
    const card = slot.querySelector(":scope > .course-card");
    if (!card) return [];

    return [
      {
        slotId: slot.dataset.planSlotId,
        courseCode: courseCodeFor(card),
        libraryOrigin: card.dataset.libraryOrigin || "",
        majorCode: card.dataset.majorCode || "",
        majorRequirementGroup: card.dataset.majorRequirementGroup || "",
        planningComponent: card.dataset.planningComponent || "",
        choiceGroupOverride: card.hasAttribute("data-choice-group-override")
          ? card.dataset.choiceGroupOverride
          : null
      }
    ];
  });

  return {
    schemaVersion: 1,
    programCode: currentProgramContext.codes[0] || "BACCT-BCOMP",
    planningStartYear: currentProgramContext.academicYear,
    majorCode,
    placements
  };
}

function returnShelfCoursesToLibrary() {
  Array.from(shelfSlots).forEach((slot) => {
    const card = slot.querySelector(":scope > .course-card");
    const originId = card?.dataset.libraryOrigin;
    if (!card || !originId) return;

    const originSlot = Array.from(librarySlots).find(
      (librarySlot) => librarySlot.dataset.librarySlotId === originId
    );
    if (originSlot && !originSlot.querySelector(":scope > .course-card")) {
      originSlot.appendChild(card);
    }
  });
}

function libraryCardForPlacement(placement) {
  const expectedCode = String(placement?.courseCode || "").trim().toUpperCase();
  const expectedMajorCode = String(placement?.majorCode || "");
  const expectedRequirementGroup = String(placement?.majorRequirementGroup || "");
  const expectedPlanningComponent = String(placement?.planningComponent || "");
  const expectedChoiceGroupOverride = placement?.choiceGroupOverride;
  const originId = String(placement?.libraryOrigin || "");
  const originSlot = Array.from(librarySlots).find(
    (slot) => slot.dataset.librarySlotId === originId
  );
  const originCard = originSlot?.querySelector(":scope > .course-card");

  function isSemanticMatch(card) {
    return (
      courseCodeFor(card) === expectedCode &&
      (card.dataset.majorCode || "") === expectedMajorCode &&
      (card.dataset.majorRequirementGroup || "") === expectedRequirementGroup &&
      (card.dataset.planningComponent || "") === expectedPlanningComponent &&
      card.hasAttribute("data-choice-group-override") ===
        (expectedChoiceGroupOverride !== null && expectedChoiceGroupOverride !== undefined) &&
      (expectedChoiceGroupOverride === null ||
        expectedChoiceGroupOverride === undefined ||
        card.dataset.choiceGroupOverride === expectedChoiceGroupOverride)
    );
  }

  if (originCard && isSemanticMatch(originCard)) return originCard;

  const availableMatches = Array.from(
    document.querySelectorAll(".course-library-slot > .course-card")
  ).filter((card) => courseCodeFor(card) === expectedCode);
  const semanticMatch = availableMatches.find(isSemanticMatch);
  if (semanticMatch) return semanticMatch;

  const majorMatches = expectedMajorCode
    ? availableMatches.filter((card) => card.dataset.majorCode === expectedMajorCode)
    : [];
  if (majorMatches.length === 1) return majorMatches[0];
  return availableMatches.length === 1 ? availableMatches[0] : null;
}

function importCoursePlanState(planState) {
  if (
    !planState ||
    Number(planState.schemaVersion) !== 1 ||
    !Array.isArray(planState.placements)
  ) {
    throw new Error("Unsupported course plan data.");
  }

  clearDragState();
  selectedRelationshipCourseCode = "";
  returnShelfCoursesToLibrary();

  const majorSelect = document.querySelector("#bcompMajorSelect");
  if (majorSelect) {
    const savedMajorCode = String(planState.majorCode || "");
    const hasSavedMajor = Array.from(majorSelect.options).some(
      (option) => option.value === savedMajorCode
    );
    majorSelect.value = hasSavedMajor ? savedMajorCode : "";
    majorSelect.dispatchEvent(new Event("change", { bubbles: true }));
  }

  const shelfSlotsById = new Map(
    Array.from(shelfSlots).map((slot) => [slot.dataset.planSlotId, slot])
  );
  let restored = 0;
  let skipped = 0;

  planState.placements.forEach((placement) => {
    const destinationSlot = shelfSlotsById.get(String(placement?.slotId || ""));
    const card = libraryCardForPlacement(placement);
    if (!destinationSlot || !card || destinationSlot.querySelector(":scope > .course-card")) {
      skipped += 1;
      return;
    }

    destinationSlot.appendChild(card);
    restored += 1;
  });

  syncChoiceGroupState();
  validateShelfPlan();
  syncCourseRelationshipHighlights();
  return { restored, skipped };
}

function syncChoiceGroupState() {
  const selectedCourses = Array.from(shelfSlots)
    .map((slot) => slot.querySelector(":scope > .course-card"))
    .filter(Boolean);
  const selectedChoiceGroups = new Set(
    selectedCourses.map((course) => course.dataset.choiceGroup).filter(Boolean)
  );
  const selectedCourseCodes = new Set(selectedCourses.map(courseCodeFor).filter(Boolean));

  courseCards.forEach((course) => {
    const isInLibrary = course.parentElement.classList.contains("course-library-slot");
    const isChoiceBlocked =
      isInLibrary &&
      Boolean(course.dataset.choiceGroup) &&
      selectedChoiceGroups.has(course.dataset.choiceGroup);
    const isDuplicateBlocked = isInLibrary && selectedCourseCodes.has(courseCodeFor(course));
    const isBlocked = isChoiceBlocked || isDuplicateBlocked;

    course.classList.toggle("is-choice-blocked", isBlocked);
    course.dataset.blockReason = isDuplicateBlocked
      ? "duplicate-course"
      : isChoiceBlocked
        ? "choice-group"
        : "";
    course.setAttribute("aria-disabled", String(isBlocked));
  });
}

function enabledPlanningTerms(sessions) {
  return new Set(
    (sessions || [])
      .filter(
        (session) =>
          session?.planningEnabled === true &&
          TERM_SEQUENCE.includes(session.planningTerm)
      )
      .map((session) => session.planningTerm)
  );
}

function offeredTermsForYear(coursePackage, academicYear) {
  const publishedOffering = (coursePackage?.offerings || []).find(
    (offering) => Number(offering.year) === academicYear
  );

  if (publishedOffering) return enabledPlanningTerms(publishedOffering.sessions);

  const projection = coursePackage?.offeringProjection;
  const projectionStart = Number(projection?.appliesFromYear);
  if (
    projection?.strategy !== "repeat_latest_published_pattern" ||
    !Number.isFinite(projectionStart) ||
    academicYear < projectionStart
  ) {
    return new Set();
  }

  if (projection.appliesUntil !== "open-ended") {
    const projectionEnd = Number(projection.appliesUntil);
    if (!Number.isFinite(projectionEnd) || academicYear > projectionEnd) return new Set();
  }

  return enabledPlanningTerms(projection.sessions);
}

function courseCodeFor(course) {
  return course?.dataset.courseCode || course?.querySelector("strong")?.textContent.trim() || "";
}

function subjectCodeFor(courseCode) {
  return courseCode.match(/^[A-Z]+/)?.[0] || "";
}

function courseLevelFor(courseCode) {
  const courseNumber = Number(courseCode.match(/\d{4}/)?.[0]);
  return Number.isFinite(courseNumber) ? Math.floor(courseNumber / 1000) * 1000 : null;
}

function libraryCourseCards() {
  return Array.from(document.querySelectorAll(".course-library-slot > .course-card"));
}

function prerequisiteCodesFor(coursePackage) {
  const engine = window.CourseRequisiteEngine;
  if (!engine?.prerequisiteCourseCodes || !coursePackage) return [];
  return engine.prerequisiteCourseCodes(coursePackage, {
    academicYear: currentProgramContext.academicYear,
    program: currentProgramContext
  });
}

function clearCourseRelationshipHighlights() {
  libraryCourseCards().forEach((card) => {
    card.classList.remove(
      "is-relation-selected",
      "is-relation-prerequisite",
      "is-relation-postrequisite"
    );
    delete card.dataset.courseRelation;
    card.removeAttribute("aria-description");
  });
}

function syncCourseRelationshipHighlights() {
  clearCourseRelationshipHighlights();
  if (!selectedRelationshipCourseCode) return;

  const selectedPackage = coursePackageByCode.get(selectedRelationshipCourseCode);
  if (!selectedPackage) return;

  const requiredCodes = new Set(prerequisiteCodesFor(selectedPackage));
  const prerequisiteCodes = new Set(requiredCodes);
  const satisfiedBySelected = new Set([
    selectedRelationshipCourseCode,
    ...(selectedPackage.prerequisiteEquivalences || [])
  ]);
  const postrequisiteCodes = new Set();

  coursePackageByCode.forEach((coursePackage, code) => {
    const satisfiesCodes = [code, ...(coursePackage.prerequisiteEquivalences || [])];
    if (satisfiesCodes.some((satisfiedCode) => requiredCodes.has(satisfiedCode))) {
      prerequisiteCodes.add(code);
    }

    if (
      code !== selectedRelationshipCourseCode &&
      prerequisiteCodesFor(coursePackage).some((requiredCode) =>
        satisfiedBySelected.has(requiredCode)
      )
    ) {
      postrequisiteCodes.add(code);
    }
  });

  libraryCourseCards().forEach((card) => {
    const code = courseCodeFor(card);
    const isSelected = code === selectedRelationshipCourseCode;
    const isPrerequisite = !isSelected && prerequisiteCodes.has(code);
    const isPostrequisite = !isSelected && postrequisiteCodes.has(code);

    card.classList.toggle("is-relation-selected", isSelected);
    card.classList.toggle("is-relation-prerequisite", isPrerequisite);
    card.classList.toggle("is-relation-postrequisite", isPostrequisite);

    if (isSelected) {
      card.dataset.courseRelation = "当前";
      card.setAttribute("aria-description", "当前选中的课程");
    } else if (isPrerequisite && isPostrequisite) {
      card.dataset.courseRelation = "前置 / 后置";
      card.setAttribute(
        "aria-description",
        `既是 ${selectedRelationshipCourseCode} 的前置课程，也是其后置课程`
      );
    } else if (isPrerequisite) {
      card.dataset.courseRelation = "前置";
      card.setAttribute("aria-description", `${selectedRelationshipCourseCode} 的前置课程`);
    } else if (isPostrequisite) {
      card.dataset.courseRelation = "后置";
      card.setAttribute("aria-description", `${selectedRelationshipCourseCode} 的后置课程`);
    }
  });
}

function toggleCourseRelationshipSelection(card) {
  if (!card.parentElement?.classList.contains("course-library-slot")) return;
  const code = courseCodeFor(card);
  selectedRelationshipCourseCode = selectedRelationshipCourseCode === code ? "" : code;
  syncCourseRelationshipHighlights();
}

function termRankForSlot(slot) {
  const academicYear = Number(slot?.dataset.academicYear);
  const planningTerm = slot?.dataset.planningTerm;
  const termIndex = TERM_SEQUENCE.indexOf(planningTerm);
  if (!Number.isFinite(academicYear) || termIndex < 0) return null;
  return (academicYear - PLANNING_START_YEAR) * TERM_SEQUENCE.length + termIndex;
}

function plannedCourseEntries() {
  return Array.from(shelfSlots).flatMap((slot) => {
    const card = slot.querySelector(":scope > .course-card");
    const termRank = termRankForSlot(slot);
    if (!card || termRank === null) return [];

    const code = courseCodeFor(card);
    const coursePackage = coursePackageByCode.get(code);
    const packageComponent = coursePackage?.programRequirement?.component || null;
    const planningComponent = card.dataset.planningComponent || null;
    return [
      {
        card,
        slot,
        code,
        academicYear: Number(slot.dataset.academicYear),
        planningTerm: slot.dataset.planningTerm,
        slotComponent: slot.dataset.programComponent,
        planningComponent,
        packageComponent,
        degreeComponent:
          planningComponent ||
          packageComponent ||
          (slot.dataset.programComponent === "EXTRA" ? null : slot.dataset.programComponent),
        programRole: coursePackage?.programRequirement?.role || null,
        choiceGroup: card.dataset.choiceGroup || null,
        majorCode: card.dataset.majorCode || null,
        termRank,
        units: Number(coursePackage?.units) || 6,
        subjectCode: subjectCodeFor(code),
        level: courseLevelFor(code),
        satisfiesCourseCodes: [code, ...(coursePackage?.prerequisiteEquivalences || [])]
      }
    ];
  });
}

function clearCourseRequirementState(course) {
  course.classList.remove("is-requisite-invalid", "is-requisite-manual");
  delete course.dataset.requisiteMessage;
  delete course.dataset.requisiteStatus;
  course.removeAttribute("title");
  course.removeAttribute("aria-invalid");
  course.removeAttribute("aria-description");
  course.removeAttribute("tabindex");
}

function validateShelfPlan() {
  courseCards.forEach(clearCourseRequirementState);
  const entries = plannedCourseEntries();
  window.CourseDegreeProgress?.update(entries);

  const engine = window.CourseRequisiteEngine;
  if (!engine) return;

  entries.forEach((entry) => {
    const coursePackage = coursePackageByCode.get(entry.code);
    const result = engine.validateCourse({
      coursePackage,
      targetEntry: entry,
      entries,
      program: currentProgramContext
    });
    const messages = [...result.messages];
    const status = result.status;
    if (status === engine.STATUS.VALID) return;

    const message = messages.join("\n");
    entry.card.classList.add(
      status === engine.STATUS.INVALID ? "is-requisite-invalid" : "is-requisite-manual"
    );
    entry.card.dataset.requisiteStatus = status;
    entry.card.dataset.requisiteMessage = message;
    entry.card.title = message;
    entry.card.setAttribute("aria-invalid", String(status === engine.STATUS.INVALID));
    entry.card.setAttribute("aria-description", message);
    entry.card.tabIndex = 0;
  });
}

function fallbackTermsForCourse(code, academicYear) {
  if (academicYear < PLANNING_START_YEAR || academicYear > PLANNING_END_YEAR) return [];
  if (code === "INFS2005") return ["S1", "S2"];
  return FALLBACK_OFFERING_PATTERNS.find((pattern) => pattern.codes.includes(code))?.terms || [];
}

function installFallbackCoursePackages() {
  courseCards.forEach((course) => {
    const code = courseCodeFor(course);
    if (!code || coursePackageByCode.has(code)) return;

    const offerings = [];
    for (let year = PLANNING_START_YEAR; year <= PLANNING_END_YEAR; year += 1) {
      offerings.push({
        year,
        sessions: fallbackTermsForCourse(code, year).map((planningTerm) => ({
          planningTerm,
          planningEnabled: true
        }))
      });
    }

    coursePackageByCode.set(code, { code, offerings, requirementsUnavailable: true });
  });
}

function applyCourseIndex(data) {
  if (!data?.coursePackages?.length) return false;
  const packageIndexByCode = new Map(
    data.coursePackages.map((coursePackage) => [coursePackage.code, coursePackage])
  );

  currentProgramContext.academicYear =
    Number(data.program?.academicYear) || PLANNING_START_YEAR;
  assignShelfSlotTerms(currentProgramContext.academicYear);
  currentProgramContext.codes = [
    data.program?.code,
    ...(data.program?.componentCodes || [])
  ].filter(Boolean);
  currentProgramContext.groups = data.program?.programGroups || currentProgramContext.groups;
  currentProgramContext.types = data.program?.programTypes || [];

  courseCards.forEach((course) => {
    const code = courseCodeFor(course);
    const metadata = packageIndexByCode.get(code);
    const hasChoiceGroupOverride = course.hasAttribute("data-choice-group-override");
    const choiceGroupOverride = course.dataset.choiceGroupOverride;
    course.dataset.courseCode = code || "";
    course.dataset.choiceGroup = hasChoiceGroupOverride
      ? choiceGroupOverride === "none"
        ? ""
        : choiceGroupOverride
      : metadata?.choiceGroup || "";
  });
  return true;
}

function installBundledCourseCatalog() {
  const catalog = window.CourseCatalog;
  if (!catalog?.index || !catalog?.packagesByCode || !applyCourseIndex(catalog.index)) {
    return false;
  }

  Object.values(catalog.packagesByCode).forEach((coursePackage) => {
    if (coursePackage?.code) coursePackageByCode.set(coursePackage.code, coursePackage);
  });
  return coursePackageByCode.size > 0;
}

function isCourseOfferedInSlot(course, slot) {
  if (!courseOfferingDataReady || !course || !slot) return false;
  const coursePackage = coursePackageByCode.get(courseCodeFor(course));
  const academicYear = Number(slot.dataset.academicYear);
  const planningTerm = slot.dataset.planningTerm;
  if (!coursePackage || !Number.isFinite(academicYear) || !planningTerm) return false;
  return offeredTermsForYear(coursePackage, academicYear).has(planningTerm);
}

async function loadCourseMetadata() {
  try {
    const response = await fetch("src/data/courses/index.json", { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    applyCourseIndex(data);

    const packageResults = await Promise.allSettled(
      data.coursePackages.map(async (metadata) => {
        const packageResponse = await fetch(`src/data/courses/${metadata.file}`, {
          cache: "no-store"
        });
        if (!packageResponse.ok) throw new Error(`${metadata.code}: HTTP ${packageResponse.status}`);
        return packageResponse.json();
      })
    );

    packageResults.forEach((result, index) => {
      if (result.status === "fulfilled") {
        coursePackageByCode.set(result.value.code, result.value);
      } else {
        console.warn(
          `Failed to refresh course data for ${data.coursePackages[index].code}. Keeping bundled or fallback data.`,
          result.reason
        );
      }
    });

    syncChoiceGroupState();
  } catch (error) {
    console.warn(
      "Failed to refresh course metadata. Keeping bundled or fallback data.",
      error
    );
    syncChoiceGroupState();
  } finally {
    installFallbackCoursePackages();
    courseOfferingDataReady = coursePackageByCode.size > 0;
    validateShelfPlan();
    syncCourseRelationshipHighlights();
  }
}

installBundledCourseCatalog();
installFallbackCoursePackages();
courseOfferingDataReady = coursePackageByCode.size > 0;
syncChoiceGroupState();
validateShelfPlan();
loadCourseMetadata();
document.querySelector("#bcompMajorSelect")?.addEventListener("change", validateShelfPlan);

shelfSlots.forEach((slot) => {
  slot.addEventListener("dblclick", () => {
    const course = slot.querySelector(":scope > .course-card");
    const originId = course?.dataset.libraryOrigin;
    if (!course || !originId) return;

    const originSlot = document.querySelector(`[data-library-slot-id="${originId}"]`);
    if (!originSlot || originSlot.querySelector(":scope > .course-card")) return;
    originSlot.appendChild(course);
    syncChoiceGroupState();
    validateShelfPlan();
    syncCourseRelationshipHighlights();
  });
});

function canMoveCourseToShelfSlot(course, destinationSlot) {
  const sourceSlot = course?.parentElement;
  if (!sourceSlot || !destinationSlot?.classList.contains("course-slot")) return false;
  if (sourceSlot === destinationSlot || !isCourseOfferedInSlot(course, destinationSlot)) return false;

  const destinationCourse = destinationSlot.querySelector(":scope > .course-card");
  const duplicateOnShelf = Array.from(shelfSlots).some((slot) => {
    const shelfCourse = slot.querySelector(":scope > .course-card");
    return shelfCourse && shelfCourse !== course && courseCodeFor(shelfCourse) === courseCodeFor(course);
  });
  if (sourceSlot.classList.contains("course-library-slot") && duplicateOnShelf) return false;
  if (sourceSlot.classList.contains("course-library-slot") && destinationCourse) return false;

  return !(
    destinationCourse &&
    sourceSlot.classList.contains("course-slot") &&
    !isCourseOfferedInSlot(destinationCourse, sourceSlot)
  );
}

function syncUnavailableShelfSlots(course) {
  const sourceSlot = course.parentElement;
  shelfSlots.forEach((slot) => {
    const unavailable = slot !== sourceSlot && !canMoveCourseToShelfSlot(course, slot);
    slot.classList.toggle("is-drop-unavailable", unavailable);
  });
}

function createDragPreview(course, clientX, clientY) {
  const sourceSlot = course.parentElement;
  const sourceRect = dragSourceRect || sourceSlot.getBoundingClientRect();
  const preview = sourceSlot.cloneNode(true);
  const previewCard = preview.querySelector(":scope > .course-card");

  preview.classList.remove("is-drag-target", "is-drop-unavailable");
  preview.classList.add("course-drag-preview");
  preview.removeAttribute("data-library-slot-id");
  preview.setAttribute("aria-hidden", "true");
  preview.style.width = `${sourceRect.width}px`;
  preview.style.height = `${sourceRect.height}px`;
  preview.style.backgroundColor = getComputedStyle(sourceSlot).backgroundColor;

  previewCard?.classList.remove(
    "is-dragging",
    "is-choice-blocked",
    "is-requisite-invalid",
    "is-requisite-manual"
  );
  if (previewCard) {
    delete previewCard.dataset.requisiteMessage;
    delete previewCard.dataset.requisiteStatus;
    previewCard.removeAttribute("aria-disabled");
    previewCard.removeAttribute("aria-invalid");
    previewCard.removeAttribute("aria-description");
    previewCard.removeAttribute("title");
    previewCard.removeAttribute("tabindex");
  }
  document.body.appendChild(preview);
  dragPreview = preview;
  updateDragPreview(clientX, clientY);
}

function updateDragPreview(clientX, clientY) {
  if (!dragPreview || !dragPointerOffset) return;
  dragPreview.style.setProperty("--drag-x", `${clientX - dragPointerOffset.x}px`);
  dragPreview.style.setProperty("--drag-y", `${clientY - dragPointerOffset.y}px`);
  dragPreview.style.transformOrigin = `${dragPointerOffset.x}px ${dragPointerOffset.y}px`;
}

function startVisualDrag(course, clientX, clientY) {
  dragStarted = true;
  course.classList.add("is-dragging");
  syncUnavailableShelfSlots(course);
  createDragPreview(course, clientX, clientY);
}

function clearDragState() {
  if (activePointerId !== null && draggedCourse?.hasPointerCapture?.(activePointerId)) {
    draggedCourse.releasePointerCapture(activePointerId);
  }
  draggedCourse?.classList.remove("is-dragging");
  targetSlot?.classList.remove("is-drag-target");
  shelfSlots.forEach((slot) => slot.classList.remove("is-drop-unavailable"));
  dragPreview?.remove();
  draggedCourse = null;
  targetSlot = null;
  activePointerId = null;
  pointerStart = null;
  dragSourceRect = null;
  dragPointerOffset = null;
  dragPreview = null;
  dragStarted = false;
}

function moveCourseToSlot(course, destinationSlot) {
  const sourceSlot = course.parentElement;
  const destinationCourse = destinationSlot.querySelector(":scope > .course-card");

  if (
    destinationSlot.classList.contains("course-slot") &&
    !canMoveCourseToShelfSlot(course, destinationSlot)
  ) {
    return false;
  }
  if (sourceSlot.classList.contains("course-library-slot") && destinationCourse) return;
  if (
    sourceSlot.classList.contains("course-library-slot") &&
    courseCodeFor(course) === selectedRelationshipCourseCode
  ) {
    selectedRelationshipCourseCode = "";
  }
  if (destinationCourse) sourceSlot.appendChild(destinationCourse);
  destinationSlot.appendChild(course);
  syncChoiceGroupState();
  validateShelfPlan();
  syncCourseRelationshipHighlights();
  return true;
}

courseCards.forEach((card) => {
  card.draggable = false;

  card.addEventListener("pointerup", (event) => {
    if (event.button !== 0 || dragStarted) return;
    toggleCourseRelationshipSelection(card);
  });

  card.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;

    event.preventDefault();
    if (card.classList.contains("is-choice-blocked") || !courseOfferingDataReady) return;
    draggedCourse = card;
    activePointerId = event.pointerId;
    pointerStart = { x: event.clientX, y: event.clientY };
    dragSourceRect = card.parentElement.getBoundingClientRect();
    dragPointerOffset = {
      x: event.clientX - dragSourceRect.left,
      y: event.clientY - dragSourceRect.top
    };
    card.setPointerCapture?.(event.pointerId);
  });
});

document.addEventListener("pointermove", (event) => {
  if (!draggedCourse || event.pointerId !== activePointerId) return;

  if (!dragStarted) {
    const distance = Math.hypot(event.clientX - pointerStart.x, event.clientY - pointerStart.y);
    if (distance < 4) return;
    startVisualDrag(draggedCourse, event.clientX, event.clientY);
  } else {
    updateDragPreview(event.clientX, event.clientY);
  }

  const sourceSlot = draggedCourse.parentElement;
  const libraryOrigin = draggedCourse.dataset.libraryOrigin;
  const nextTarget = document
    .elementsFromPoint(event.clientX, event.clientY)
    .find(
      (element) => {
        if (element === sourceSlot) return false;

        if (element.classList?.contains("course-slot")) {
          return canMoveCourseToShelfSlot(draggedCourse, element);
        }

        if (element.classList?.contains("course-library-slot")) {
          return (
            Boolean(libraryOrigin) &&
            element.dataset.librarySlotId === libraryOrigin &&
            !element.querySelector(":scope > .course-card")
          );
        }

        return false;
      }
    );

  if (nextTarget === targetSlot) return;
  targetSlot?.classList.remove("is-drag-target");
  targetSlot = nextTarget || null;
  targetSlot?.classList.add("is-drag-target");
});

document.addEventListener("pointerup", (event) => {
  if (event.pointerId !== activePointerId) return;
  const completedDrag = dragStarted;
  if (completedDrag && draggedCourse && targetSlot) moveCourseToSlot(draggedCourse, targetSlot);
  clearDragState();
});

document.addEventListener("pointercancel", (event) => {
  if (event.pointerId === activePointerId) clearDragState();
});

window.addEventListener("blur", clearDragState);

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape" || !selectedRelationshipCourseCode) return;
  selectedRelationshipCourseCode = "";
  syncCourseRelationshipHighlights();
});

window.CourseBuilderPlanState = Object.freeze({
  exportPlan: exportCoursePlanState,
  importPlan: importCoursePlanState
});
window.dispatchEvent(new CustomEvent("coursebuilder:plan-state-ready"));

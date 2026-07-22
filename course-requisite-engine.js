(() => {
  const STATUS = {
    VALID: "valid",
    INVALID: "invalid",
    MANUAL: "manual"
  };

  function uniqueMessages(messages) {
    return [...new Set(messages.filter(Boolean))];
  }

  function createResult(status = STATUS.VALID, messages = []) {
    return { status, messages: uniqueMessages(messages) };
  }

  function courseTimingText(minimumStatus) {
    return minimumStatus === "completed_or_concurrent" ? "本学期或之前" : "此前学期";
  }

  function externalQualificationDescription(rule) {
    if (rule.officialText) return rule.officialText;
    const names = (rule.acceptableQualifications || []).map((item) => item.name).filter(Boolean);
    const result = rule.requiredResult ? `${rule.requiredResult}：` : "";
    return names.length ? `${result}${names.join(" / ")}` : "满足外部资格条件";
  }

  function ruleDescription(rule) {
    if (!rule) return "没有额外条件";

    switch (rule.type) {
      case "course": {
        return `${courseTimingText(rule.minimumStatus)}完成 ${rule.courseCode}`;
      }
      case "minimumCompletedUnits":
        return `此前完成至少 ${rule.units} units`;
      case "subjectUnits": {
        const level = rule.level ? `${rule.level}-level ` : "";
        const subject = rule.subject || (rule.subjects || []).join("/") || "任意科目";
        const exclusions = rule.excludedCourseCodes?.length
          ? `（不含 ${rule.excludedCourseCodes.join("、")}）`
          : "";
        return `此前完成至少 ${rule.minimumUnits} units 的 ${level}${subject} 课程${exclusions}`;
      }
      case "programEnrollment":
        return `就读 ${rule.programTitle || rule.programCode || rule.programGroup}`;
      case "programRestriction":
        return rule.message || "满足项目限制";
      case "allOf":
        return (rule.rules || []).map(ruleDescription).join(" 且 ");
      case "anyOf":
        return (rule.rules || []).map(ruleDescription).join(" 或 ");
      case "manualCondition":
        return rule.officialText || "满足需要人工确认的条件";
      case "externalQualification":
        return externalQualificationDescription(rule);
      default:
        return rule.officialText || `满足 ${rule.type || "未知"} 条件`;
    }
  }

  function entrySatisfiesCourse(entry, courseCode) {
    return (
      entry.code === courseCode ||
      (entry.satisfiesCourseCodes || []).includes(courseCode)
    );
  }

  function eligibleCourseEntries(rule, context) {
    const allowConcurrent = rule.minimumStatus === "completed_or_concurrent";
    return context.entries.filter(
      (entry) =>
        entry !== context.targetEntry &&
        entrySatisfiesCourse(entry, rule.courseCode) &&
        (allowConcurrent
          ? entry.termRank <= context.targetEntry.termRank
          : entry.termRank < context.targetEntry.termRank)
    );
  }

  function evaluateCourseRule(rule, context) {
    const matchingEntries = eligibleCourseEntries(rule, context);
    if (!matchingEntries.length) {
      return createResult(STATUS.INVALID, [
        `需要在${courseTimingText(rule.minimumStatus)}完成 ${rule.courseCode}`
      ]);
    }
    return createResult();
  }

  function completedEntries(context, minimumStatus = "completed") {
    const allowConcurrent = minimumStatus === "completed_or_concurrent";
    return context.entries.filter(
      (entry) =>
        entry !== context.targetEntry &&
        (allowConcurrent
          ? entry.termRank <= context.targetEntry.termRank
          : entry.termRank < context.targetEntry.termRank)
    );
  }

  function evaluateMinimumUnits(rule, context) {
    const completedUnits = completedEntries(context, rule.minimumStatus).reduce(
      (total, entry) => total + entry.units,
      0
    );
    const requiredUnits = Number(rule.units) || 0;
    if (completedUnits >= requiredUnits) return createResult();

    return createResult(STATUS.INVALID, [
      `此前已完成 ${completedUnits} units，尚缺 ${requiredUnits - completedUnits} units（要求 ${requiredUnits} units）`
    ]);
  }

  function subjectMatches(entry, rule) {
    const subjects = rule.subjects || (rule.subject ? [rule.subject] : []);
    if ((rule.excludedCourseCodes || []).includes(entry.code)) return false;
    if (subjects.length && !subjects.includes(entry.subjectCode)) return false;
    if (rule.level && entry.level !== Number(rule.level)) return false;
    if (rule.minimumLevel && entry.level < Number(rule.minimumLevel)) return false;
    if (rule.maximumLevel && entry.level > Number(rule.maximumLevel)) return false;
    return true;
  }

  function evaluateSubjectUnits(rule, context) {
    const matchingUnits = completedEntries(context, rule.minimumStatus)
      .filter((entry) => subjectMatches(entry, rule))
      .reduce((total, entry) => total + entry.units, 0);
    const requiredUnits = Number(rule.minimumUnits) || 0;
    if (matchingUnits >= requiredUnits) return createResult();

    const level = rule.level ? `${rule.level}-level ` : "";
    const subject = rule.subject || (rule.subjects || []).join("/") || "任意科目";
    const exclusions = rule.excludedCourseCodes?.length
      ? `（不含 ${rule.excludedCourseCodes.join("、")}）`
      : "";
    return createResult(STATUS.INVALID, [
      `此前已有 ${matchingUnits} units 的 ${level}${subject} 课程${exclusions}，尚缺 ${
        requiredUnits - matchingUnits
      } units`
    ]);
  }

  function evaluateProgramEnrollment(rule, context) {
    const program = context.program || {};
    const requiredCodes = rule.programCodes || (rule.programCode ? [rule.programCode] : []);
    const requiredGroups = rule.programGroups || (rule.programGroup ? [rule.programGroup] : []);
    const matchesCode =
      !requiredCodes.length || requiredCodes.some((code) => (program.codes || []).includes(code));
    const matchesGroup =
      !requiredGroups.length ||
      requiredGroups.some((group) => (program.groups || []).includes(group));
    if (matchesCode && matchesGroup) return createResult();

    return createResult(STATUS.INVALID, [
      `需要就读 ${rule.programTitle || rule.programCode || rule.programGroup}`
    ]);
  }

  function evaluateAllOf(rule, context) {
    const results = (rule.rules || []).map((childRule) => evaluateRule(childRule, context));
    const hasInvalid = results.some((result) => result.status === STATUS.INVALID);
    const hasManual = results.some((result) => result.status === STATUS.MANUAL);
    const messages = results.flatMap((result) => result.messages);
    if (hasInvalid) return createResult(STATUS.INVALID, messages);
    if (hasManual) return createResult(STATUS.MANUAL, messages);
    return createResult();
  }

  function evaluateAnyOf(rule, context) {
    const childRules = rule.rules || [];
    const results = childRules.map((childRule) => evaluateRule(childRule, context));
    if (results.some((result) => result.status === STATUS.VALID)) return createResult();

    const hasManualPath = results.some((result) => result.status === STATUS.MANUAL);
    const alternatives = results.map((result, index) => {
      const detail = result.messages.join(" 且 ");
      return detail || ruleDescription(childRules[index]);
    });
    return createResult(hasManualPath ? STATUS.MANUAL : STATUS.INVALID, [
      `${hasManualPath ? "需人工确认以下任一路径" : "需满足以下任一条件"}：${alternatives.join("；或 ")}`
    ]);
  }

  function evaluateRule(rule, context) {
    if (!rule) return createResult();

    switch (rule.type) {
      case "course":
        return evaluateCourseRule(rule, context);
      case "minimumCompletedUnits":
        return evaluateMinimumUnits(rule, context);
      case "subjectUnits":
        return evaluateSubjectUnits(rule, context);
      case "programEnrollment":
        return evaluateProgramEnrollment(rule, context);
      case "allOf":
        return evaluateAllOf(rule, context);
      case "anyOf":
        return evaluateAnyOf(rule, context);
      case "manualCondition":
      case "externalQualification":
        return createResult();
      default:
        console.warn(`Skipped unsupported course requirement type: ${rule.type || "unknown"}`);
        return createResult();
    }
  }

  function courseCodesInRule(rule) {
    if (!rule) return [];
    if (rule.type === "course") return rule.courseCode ? [rule.courseCode] : [];
    if (rule.type === "allOf" || rule.type === "anyOf") {
      return uniqueMessages((rule.rules || []).flatMap(courseCodesInRule));
    }
    return [];
  }

  function whenMatches(when, context) {
    if (!when) return true;
    const program = context.program || {};
    const academicYear = Number(context.targetEntry?.academicYear ?? context.academicYear);
    if (
      when.programCodes?.length &&
      !when.programCodes.some((code) => (program.codes || []).includes(code))
    ) {
      return false;
    }
    if (
      when.programGroups?.length &&
      !when.programGroups.some((group) => (program.groups || []).includes(group))
    ) {
      return false;
    }
    if (
      when.programTypes?.length &&
      !when.programTypes.some((type) => (program.types || []).includes(type))
    ) {
      return false;
    }
    if (
      when.academicYearFrom &&
      (!Number.isFinite(academicYear) || academicYear < when.academicYearFrom)
    ) {
      return false;
    }
    if (
      when.academicYearTo &&
      (!Number.isFinite(academicYear) || academicYear > when.academicYearTo)
    ) {
      return false;
    }
    return true;
  }

  function prerequisiteCourseCodes(coursePackage, context = {}) {
    const requisite = coursePackage?.requisiteAndIncompatibility || {};
    const rules = [
      requisite.prerequisiteRule,
      ...(requisite.conditionalPrerequisiteRules || [])
        .filter((conditionalRule) => whenMatches(conditionalRule.when, context))
        .map((conditionalRule) => conditionalRule.prerequisiteRule || conditionalRule)
    ];
    return uniqueMessages(rules.flatMap(courseCodesInRule));
  }

  function evaluateConditionalRule(conditionalRule, context) {
    if (!conditionalRule) return createResult();
    if (conditionalRule.when && !whenMatches(conditionalRule.when, context)) return createResult();
    return evaluateRule(conditionalRule.prerequisiteRule || conditionalRule, context);
  }

  function evaluatePrerequisitePath(coursePackage, requisite, context) {
    return evaluateRule(requisite.prerequisiteRule || null, context);
  }

  function evaluateIncompatibilities(coursePackage, context) {
    const incompatibleCodes = uniqueMessages([
      ...(coursePackage?.requisiteAndIncompatibility?.incompatibilities || []),
      ...(coursePackage?.postrequisiteRestrictions?.blockedByCompletedCourses || [])
    ]);
    const conflicts = incompatibleCodes.filter((courseCode) =>
      context.entries.some(
        (entry) => entry !== context.targetEntry && entrySatisfiesCourse(entry, courseCode)
      )
    );
    if (!conflicts.length) return createResult();
    return createResult(STATUS.INVALID, [
      `与 ${conflicts.join("、")} 互斥，不能同时出现在课程计划中`
    ]);
  }

  function evaluateProgramRestrictions(coursePackage, context) {
    const results = (coursePackage?.programRestrictions || [])
      .filter((restriction) => restriction.sourceSection === "Requisite and Incompatibility")
      .filter((restriction) => whenMatches(restriction.when, context))
      .map((restriction) => {
        if (restriction.effect === "prohibited") {
          return createResult(STATUS.INVALID, [
            restriction.message ||
              `当前项目不能选择该课程${
                restriction.redirectCourseCode ? `，请改选 ${restriction.redirectCourseCode}` : ""
              }`
          ]);
        }
        return createResult();
      });
    return evaluateResults(results);
  }

  function evaluateProgramSlot(coursePackage, context) {
    const expectedComponent = context.targetEntry.slotComponent;
    const courseComponent =
      context.targetEntry.planningComponent || coursePackage?.programRequirement?.component;
    if (!expectedComponent || expectedComponent === "EXTRA" || !courseComponent) {
      return createResult();
    }
    if (expectedComponent === courseComponent) return createResult();

    return createResult(STATUS.INVALID, [
      `该格属于 ${expectedComponent}，${coursePackage.code} 计入 ${courseComponent}`
    ]);
  }

  function evaluateResults(results) {
    const hasInvalid = results.some((result) => result.status === STATUS.INVALID);
    const hasManual = results.some((result) => result.status === STATUS.MANUAL);
    const messages = results.flatMap((result) => result.messages);
    if (hasInvalid) return createResult(STATUS.INVALID, messages);
    if (hasManual) return createResult(STATUS.MANUAL, messages);
    return createResult();
  }

  function validateCourse({ coursePackage, targetEntry, entries, program }) {
    if (!coursePackage || coursePackage.requirementsUnavailable || !targetEntry) {
      return createResult();
    }

    const context = { targetEntry, entries, program };
    const requisite = coursePackage.requisiteAndIncompatibility || {};
    const results = [
      evaluatePrerequisitePath(coursePackage, requisite, context),
      ...(requisite.conditionalPrerequisiteRules || []).map((rule) =>
        evaluateConditionalRule(rule, context)
      ),
      evaluateIncompatibilities(coursePackage, context),
      evaluateProgramRestrictions(coursePackage, context),
      evaluateProgramSlot(coursePackage, context)
    ];
    return evaluateResults(results);
  }

  window.CourseRequisiteEngine = {
    STATUS,
    evaluateRule,
    prerequisiteCourseCodes,
    ruleDescription,
    validateCourse
  };
})();

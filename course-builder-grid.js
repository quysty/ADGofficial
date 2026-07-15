const courseBuilderGrid = document.querySelector("#courseBuilderGrid");
const courseBuilderGridXAxis = document.querySelector("#courseBuilderGridXAxis");
const courseBuilderGridYAxis = document.querySelector("#courseBuilderGridYAxis");
const courseBuilderGridMajorStep = 100;

function buildGridAxis(axis, length, unitLabel) {
  const ticks = [];

  for (let value = 0; value <= length; value += courseBuilderGridMajorStep) {
    ticks.push(
      `<span class="course-builder-grid__tick" style="${axis}: ${value}px">${value}</span>`
    );
  }

  return `<span class="course-builder-grid__unit">${unitLabel}</span>${ticks.join("")}`;
}

function renderCourseBuilderGrid() {
  const width = Math.max(document.documentElement.scrollWidth, window.innerWidth);
  const height = Math.max(document.documentElement.scrollHeight, window.innerHeight);

  courseBuilderGrid.style.width = `${width}px`;
  courseBuilderGrid.style.height = `${height}px`;
  courseBuilderGridXAxis.innerHTML = buildGridAxis("left", width, "X / px");
  courseBuilderGridYAxis.innerHTML = buildGridAxis("top", height, "Y / px");
}

renderCourseBuilderGrid();
window.addEventListener("resize", renderCourseBuilderGrid);

const courseBuilderGridObserver = new ResizeObserver(renderCourseBuilderGrid);
courseBuilderGridObserver.observe(document.body);

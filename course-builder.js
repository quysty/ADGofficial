const courseCards = document.querySelectorAll(".course-card");
const librarySlots = document.querySelectorAll(".course-library-slot");
let draggedCourse = null;
let targetSlot = null;
let activePointerId = null;

librarySlots.forEach((slot, index) => {
  const slotId = `library-slot-${index}`;
  const course = slot.querySelector(":scope > .course-card");
  slot.dataset.librarySlotId = slotId;
  if (course) course.dataset.libraryOrigin = slotId;
});

function clearDragState() {
  draggedCourse?.classList.remove("is-dragging");
  targetSlot?.classList.remove("is-drag-target");
  draggedCourse = null;
  targetSlot = null;
  activePointerId = null;
}

function moveCourseToSlot(course, destinationSlot) {
  const sourceSlot = course.parentElement;
  const destinationCourse = destinationSlot.querySelector(":scope > .course-card");

  if (sourceSlot.classList.contains("course-library-slot") && destinationCourse) return;
  if (destinationCourse) sourceSlot.appendChild(destinationCourse);
  destinationSlot.appendChild(course);
}

courseCards.forEach((card) => {
  card.draggable = false;

  card.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;

    event.preventDefault();
    draggedCourse = card;
    activePointerId = event.pointerId;
    card.classList.add("is-dragging");
  });
});

document.addEventListener("pointermove", (event) => {
  if (!draggedCourse || event.pointerId !== activePointerId) return;

  const sourceSlot = draggedCourse.parentElement;
  const currentlyInLibrary = sourceSlot.classList.contains("course-library-slot");
  const libraryOrigin = draggedCourse.dataset.libraryOrigin;
  const nextTarget = document
    .elementsFromPoint(event.clientX, event.clientY)
    .find(
      (element) => {
        if (element === sourceSlot) return false;

        if (element.classList?.contains("course-slot")) {
          return !currentlyInLibrary || !element.querySelector(":scope > .course-card");
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
  if (draggedCourse && targetSlot) moveCourseToSlot(draggedCourse, targetSlot);
  clearDragState();
});

document.addEventListener("pointercancel", clearDragState);

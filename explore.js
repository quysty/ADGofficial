import * as THREE from "three";
import { MapControls } from "three/addons/controls/MapControls.js";

const container = document.querySelector("#map3dContainer");
const mapStatus = document.querySelector("#mapStatus");
const btn3D = document.querySelector("#btn3D");
const btn2D = document.querySelector("#btn2D");
const btnNumbers = document.querySelector("#btnNumbers");
const btnReset = document.querySelector("#btnReset");
const btnBackOverview = document.querySelector("#btnBackOverview");
const sceneVeil = document.querySelector("#sceneVeil");
const sceneModeToggle = document.querySelector("#sceneModeToggle");
const mapWrap = document.querySelector("#exploreMapWrap");
const layout = document.querySelector("#exploreSceneLayout");
const overviewPanel = document.querySelector("#overviewPanel");
const detailPanel = document.querySelector("#detailPanel");
const detailTitle = document.querySelector("#detailTitle");
const detailCode = document.querySelector("#detailCode");
const detailScroll = document.querySelector("#detailScroll");

if (
  !container ||
  !mapStatus ||
  !btn3D ||
  !btn2D ||
  !btnNumbers ||
  !btnReset ||
  !btnBackOverview ||
  !sceneVeil ||
  !sceneModeToggle ||
  !mapWrap ||
  !layout ||
  !overviewPanel ||
  !detailPanel ||
  !detailTitle ||
  !detailCode ||
  !detailScroll
) {
  throw new Error("Explore page structure is incomplete. Required DOM nodes were not found.");
}

const labelLayer = document.createElement("div");
labelLayer.className = "explore-label-layer";
mapWrap.querySelector(".explore-map-shell").appendChild(labelLayer);

const scene = new THREE.Scene();
scene.background = new THREE.Color("#f3f4f1");

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(container.clientWidth, container.clientHeight);
renderer.domElement.style.display = "block";
container.appendChild(renderer.domElement);

const perspectiveCamera = new THREE.PerspectiveCamera(
  42,
  Math.max(container.clientWidth / Math.max(container.clientHeight, 1), 1),
  0.1,
  20000
);

const orthoCamera = new THREE.OrthographicCamera(-500, 500, 500, -500, 0.1, 20000);
orthoCamera.up.set(0, 0, -1);

let activeCamera = perspectiveCamera;

const controls = new MapControls(activeCamera, renderer.domElement);
controls.enableDamping = true;
controls.enablePan = true;
controls.enableRotate = true;
controls.screenSpacePanning = false;
controls.minDistance = 80;
controls.maxDistance = 12000;
controls.minPolarAngle = 0.14;
controls.maxPolarAngle = Math.PI / 2.02;

const ambientLight = new THREE.AmbientLight(0xffffff, 2.1);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.8);
directionalLight.position.set(260, 300, 220);
scene.add(directionalLight);

const fillLight = new THREE.DirectionalLight(0xffffff, 0.9);
fillLight.position.set(-220, 140, -180);
scene.add(fillLight);

const environment3D = new THREE.Group();
const environment2D = new THREE.Group();
const world3D = new THREE.Group();
const world2D = new THREE.Group();

scene.add(environment3D);
scene.add(environment2D);
scene.add(world3D);
scene.add(world2D);

/* 圆形地面：只改场景里的地面，不改地图框 */
const groundGroup = new THREE.Group();
scene.add(groundGroup);

let groundDisk = null;
let groundRing = null;
const treeScenePoints = [];

let currentMode = "3d";
let sceneState = null;
let isTransitioning = false;
let showNormalLabels = false;
let cameraTween = null;
let selectedBuilding = null;
let lastBrowseViewState = null;

let labelsDirty = true;
let lastLabelMode = "";

const buildingObjects = [];
const buildingStats = {
  count: 0,
  skipped: 0
};

const environmentStats = {
  roads: 0,
  green: 0,
  water: 0,
  trees: 0
};

let BUILDING_TYPES = {};
let FUNCTIONAL_BUILDINGS = {};
let DETAIL_CONTENT = {};
const DORMS = Array.isArray(window.DORM_DATA) ? window.DORM_DATA : [];

const pageParams = new URLSearchParams(window.location.search);
const guidedPreviewState = {
  active: pageParams.get("mode") === "guided",
  from: pageParams.get("from") || "",
  focusValue: pageParams.get("focus") || pageParams.get("building") || "",
  entryBuildingId: null,
  entryDormId: null
};

if (guidedPreviewState.active) {
  document.body.classList.add("is-guided-preview");
}

/* =========================================================
   UI STATE
   ========================================================= */

function setButtonState(mode) {
  btn3D.classList.toggle("is-active", mode === "3d");
  btn2D.classList.toggle("is-active", mode === "2d");
  sceneModeToggle.dataset.mode = mode;
  btnReset.classList.toggle("is-hidden", mode !== "3d");
}

function setNumbersButtonState() {
  btnNumbers.classList.toggle("is-active", showNormalLabels);
  btnNumbers.textContent = showNormalLabels ? "Developer On" : "Developer Off";
}

function beginSwitchVisual() {
  mapWrap.classList.add("is-switching");
  sceneVeil.classList.add("active");
}

function endSwitchVisual() {
  sceneVeil.classList.remove("active");
  mapWrap.classList.remove("is-switching");
}

function runModeTransition(callback) {
  if (isTransitioning) return;

  isTransitioning = true;
  beginSwitchVisual();

  window.clearTimeout(runModeTransition._midTimer);
  window.clearTimeout(runModeTransition._endTimer);

  runModeTransition._midTimer = window.setTimeout(() => {
    callback();
  }, 140);

  runModeTransition._endTimer = window.setTimeout(() => {
    endSwitchVisual();
    isTransitioning = false;
  }, 390);
}

function updateStatusText() {
  const head =
    currentMode === "3d"
      ? `3D mode · Loaded ${buildingStats.count} buildings.`
      : `2D mode · Loaded ${buildingStats.count} building footprints.`;

  const envPart = ` Roads ${environmentStats.roads}, green ${environmentStats.green}, water ${environmentStats.water}, trees ${environmentStats.trees}.`;
  const devPart = showNormalLabels ? " Developer labels on." : " Developer labels off.";

  const helpText =
    currentMode === "3d"
      ? " Drag to pan, right-drag to rotate, scroll to zoom."
      : " Drag to pan, scroll to zoom.";

  if (selectedBuilding?.functionalConfig) {
    mapStatus.textContent = `${head}${envPart}${devPart} Selected: ${selectedBuilding.functionalConfig.name}.${helpText}`;
  } else {
    mapStatus.textContent = `${head}${envPart}${devPart}${helpText}`;
  }
}

function setSidePanelState(mode) {
  const isDetail = mode === "detail";

  layout.classList.toggle("is-detail-open", isDetail);

  overviewPanel.classList.toggle("is-active", !isDetail);
  overviewPanel.setAttribute("aria-hidden", isDetail ? "true" : "false");

  detailPanel.classList.toggle("is-active", isDetail);
  detailPanel.setAttribute("aria-hidden", isDetail ? "false" : "true");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatRent(dorm) {
  if (!dorm || dorm.pricePerWeek == null) return "Not listed";
  return `$${Number(dorm.pricePerWeek).toLocaleString()} / week`;
}

function renderGuidedList(items) {
  const list = Array.isArray(items) ? items : [];

  if (!list.length) {
    return "<li>Not available yet.</li>";
  }

  return list.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
}

function getGuidedDorm(building) {
  const buildingId = building?.functionalConfig?.buildingId;
  if (!buildingId) return null;

  return DORMS.find((dorm) => dorm.buildingId === buildingId || dorm.mapFocus === buildingId) || null;
}

function renderGuidedDetailContent(building) {
  const dorm = getGuidedDorm(building);
  if (!dorm) return false;

  detailPanel.classList.add("scene-panel-detail--guided");
  guidedPreviewState.entryBuildingId = building.functionalConfig?.buildingId || null;
  guidedPreviewState.entryDormId = dorm.id || null;

  detailTitle.textContent = dorm.name || building.functionalConfig?.name || "Selected dorm";
  detailCode.textContent = "Guided dorm information";

  detailScroll.innerHTML = `
    <div class="information-drawer-panel information-drawer-panel--guided">
      <p class="information-drawer__eyebrow">Residence detail</p>
      <h2 class="information-drawer__title">${escapeHtml(dorm.name)}</h2>
      <p class="information-drawer__summary">${escapeHtml(dorm.description || dorm.summary || "")}</p>

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

      <div class="information-drawer__two-col">
        <section>
          <h3>Pros</h3>
          <ul>${renderGuidedList(dorm.pros)}</ul>
        </section>
        <section>
          <h3>Cons</h3>
          <ul>${renderGuidedList(dorm.cons)}</ul>
        </section>
      </div>

      <div class="information-drawer__actions">
        <a class="information-drawer__full-link" href="information.html?dorm=${encodeURIComponent(dorm.id)}">Open detail</a>
      </div>
    </div>
  `;

  detailScroll.scrollTop = 0;
  return true;
}

function syncSceneAfterLayoutChange() {
  requestAnimationFrame(() => {
    resizeRenderer();
    updateLabels(true);
  });

  window.clearTimeout(syncSceneAfterLayoutChange._timerA);
  window.clearTimeout(syncSceneAfterLayoutChange._timerB);

  syncSceneAfterLayoutChange._timerA = window.setTimeout(() => {
    resizeRenderer();
    updateLabels(true);
  }, 90);

  syncSceneAfterLayoutChange._timerB = window.setTimeout(() => {
    resizeRenderer();
    updateLabels(true);
  }, 360);
}

/* =========================================================
   DATA LOADING
   ========================================================= */

async function fetchJsonStrict(path) {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Failed to load ${path}: HTTP ${response.status}`);
  }
  return await response.json();
}

async function fetchGeoJsonSafe(path) {
  try {
    const response = await fetch(path);
    if (!response.ok) {
      console.warn(`Failed to load ${path}: HTTP ${response.status}`);
      return null;
    }
    return await response.json();
  } catch (error) {
    console.warn(`Failed to load ${path}:`, error);
    return null;
  }
}

/* =========================================================
   GEOMETRY HELPERS
   ========================================================= */

function cleanRing(ring) {
  if (!Array.isArray(ring) || ring.length < 3) return [];

  const cleaned = ring.map((point) => [Number(point[0]), Number(point[1])]);
  const first = cleaned[0];
  const last = cleaned[cleaned.length - 1];

  if (
    first &&
    last &&
    Math.abs(first[0] - last[0]) < 1e-9 &&
    Math.abs(first[1] - last[1]) < 1e-9
  ) {
    cleaned.pop();
  }

  return cleaned;
}

function polygonArea(ring) {
  let area = 0;

  for (let i = 0; i < ring.length; i += 1) {
    const [x1, y1] = ring[i];
    const [x2, y2] = ring[(i + 1) % ring.length];
    area += x1 * y2 - x2 * y1;
  }

  return Math.abs(area) * 0.5;
}

function updateGroundDisk(center, radius) {
  if (groundDisk) {
    groundGroup.remove(groundDisk);
    groundDisk.geometry.dispose();
    groundDisk.material.dispose();
    groundDisk = null;
  }

  if (groundRing) {
    groundGroup.remove(groundRing);
    groundRing.geometry.dispose();
    groundRing.material.dispose();
    groundRing = null;
  }

  groundDisk = new THREE.Mesh(
    new THREE.CircleGeometry(radius, 96),
    new THREE.MeshStandardMaterial({
      color: "#ece9e2",
      roughness: 1,
      metalness: 0,
      side: THREE.DoubleSide
    })
  );
  groundDisk.rotation.x = -Math.PI / 2;
  groundDisk.position.set(center.x, -1.9, center.z);
  groundGroup.add(groundDisk);

  groundRing = new THREE.Mesh(
    new THREE.RingGeometry(radius * 0.985, radius, 96),
    new THREE.MeshStandardMaterial({
      color: "#ddd8cf",
      roughness: 1,
      metalness: 0,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9
    })
  );
  groundRing.rotation.x = -Math.PI / 2;
  groundRing.position.set(center.x, -1.85, center.z);
  groundGroup.add(groundRing);
}

function getCampusCoverageFromBuildingsAndTrees() {
  const buildingBox = new THREE.Box3().setFromObject(world3D);
  const buildingSize = buildingBox.getSize(new THREE.Vector3());
  const buildingCenter = buildingBox.getCenter(new THREE.Vector3());

  let minX = buildingBox.min.x;
  let maxX = buildingBox.max.x;
  let minZ = buildingBox.min.z;
  let maxZ = buildingBox.max.z;

  for (const point of treeScenePoints) {
    minX = Math.min(minX, point.x);
    maxX = Math.max(maxX, point.x);
    minZ = Math.min(minZ, point.z);
    maxZ = Math.max(maxZ, point.z);
  }

  const spanX = maxX - minX;
  const spanZ = maxZ - minZ;
  const squareSide = Math.max(spanX, spanZ);

  const center = new THREE.Vector3(
    (minX + maxX) / 2,
    buildingCenter.y,
    (minZ + maxZ) / 2
  );

  /* 包住“建筑 + 树”正方形的最小圆 */
  const radius = squareSide * (Math.SQRT2 / 2) + 18;

  return {
    center,
    radius,
    squareSide,
    minX,
    maxX,
    minZ,
    maxZ,
    height: buildingSize.y
  };
}

function estimateHeight(area) {
  if (area > 16000) return 46;
  if (area > 9000) return 36;
  if (area > 4500) return 28;
  if (area > 1800) return 20;
  return 14;
}

function toVector2Ring(ring, centerX, centerY, scale) {
  return cleanRing(ring).map(([x, y]) => {
    const localX = (x - centerX) * scale;
    const localY = (y - centerY) * scale;
    return new THREE.Vector2(localX, localY);
  });
}

function buildShapeFromPolygonCoordinates(polygonCoords, centerX, centerY, scale) {
  if (!Array.isArray(polygonCoords) || polygonCoords.length === 0) return null;

  const outerRing = toVector2Ring(polygonCoords[0], centerX, centerY, scale);
  if (outerRing.length < 3) return null;

  const shape = new THREE.Shape(outerRing);

  for (let i = 1; i < polygonCoords.length; i += 1) {
    const holeRing = toVector2Ring(polygonCoords[i], centerX, centerY, scale);
    if (holeRing.length >= 3) {
      shape.holes.push(new THREE.Path(holeRing));
    }
  }

  return shape;
}

function getPolygonSets(geometry) {
  if (!geometry) return [];
  if (geometry.type === "Polygon") return [geometry.coordinates];
  if (geometry.type === "MultiPolygon") return geometry.coordinates;
  return [];
}

function getLineSets(geometry) {
  if (!geometry) return [];
  if (geometry.type === "LineString") return [geometry.coordinates];
  if (geometry.type === "MultiLineString") return geometry.coordinates;
  return [];
}

function getPointSets(geometry) {
  if (!geometry) return [];
  if (geometry.type === "Point") return [geometry.coordinates];
  if (geometry.type === "MultiPoint") return geometry.coordinates;
  return [];
}

function collectBounds(features) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const feature of features) {
    const polygonSets = getPolygonSets(feature.geometry);

    for (const polygonCoords of polygonSets) {
      for (const ring of polygonCoords) {
        for (const point of ring) {
          const x = Number(point[0]);
          const y = Number(point[1]);

          if (!Number.isFinite(x) || !Number.isFinite(y)) continue;

          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, x);
          maxY = Math.max(maxY, y);
        }
      }
    }
  }

  if (!Number.isFinite(minX) || !Number.isFinite(minY)) {
    throw new Error("No valid XY coordinates found in building GeoJSON.");
  }

  return {
    minX,
    minY,
    maxX,
    maxY,
    centerX: (minX + maxX) / 2,
    centerY: (minY + maxY) / 2
  };
}

function getPolygonCenter(ring) {
  const cleaned = cleanRing(ring);

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const [x, y] of cleaned) {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }

  return {
    x: (minX + maxX) / 2,
    y: (minY + maxY) / 2
  };
}

function toSceneXZ(x, y, centerX, centerY, scale) {
  return {
    x: (x - centerX) * scale,
    z: -(y - centerY) * scale
  };
}

/* =========================================================
   LABEL HELPERS
   ========================================================= */

function createNormalLabelElement(number) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "scene-label is-normal";
  button.disabled = true;
  button.setAttribute("tabindex", "-1");

  const face = document.createElement("span");
  face.className = "scene-label__face";

  const text = document.createElement("span");
  text.className = "scene-label__text";
  text.textContent = String(number);

  face.appendChild(text);
  button.appendChild(face);
  labelLayer.appendChild(button);

  return button;
}

function createFunctionalLabelElement(shortName, typeKey, interactive) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "scene-label is-dorm is-functional";
  if (!interactive) {
    button.disabled = true;
    button.setAttribute("tabindex", "-1");
  }

  button.dataset.functionalType = typeKey;

  const face = document.createElement("span");
  face.className = "scene-label__face";

  const text = document.createElement("span");
  text.className = "scene-label__text";
  text.textContent = shortName;

  face.appendChild(text);
  button.appendChild(face);
  labelLayer.appendChild(button);

  return button;
}

function applyFunctionalLabelVisual(labelEl, typeConfig, selected) {
  if (!labelEl || !typeConfig) return;

  const face = labelEl.querySelector(".scene-label__face");
  if (!face) return;

  face.style.background = selected ? typeConfig.selectedColor : typeConfig.baseColor;
  face.style.border = `1px solid ${selected ? typeConfig.selectedEdgeColor : typeConfig.edgeColor}`;
  face.style.boxShadow = selected
    ? `0 0 0 4px rgba(15, 23, 42, 0.06), 0 12px 22px rgba(15, 23, 42, 0.12)`
    : `0 10px 20px rgba(15, 23, 42, 0.08)`;

  const text = labelEl.querySelector(".scene-label__text");
  if (text) {
    text.style.color = "#142033";
    text.style.fontWeight = "800";
  }
}

/* =========================================================
   CAMERA / CONTROL
   ========================================================= */

function updateOrthoFrustum(state) {
  const width = Math.max(state.size.x, 500);
  const depth = Math.max(state.size.z, 500);
  const padding = 1.16;
  const halfWidth = (width * padding) / 2;
  const halfDepth = (depth * padding) / 2;
  const aspect = container.clientWidth / Math.max(container.clientHeight, 1);

  if (halfWidth / halfDepth > aspect) {
    orthoCamera.left = -halfWidth;
    orthoCamera.right = halfWidth;
    orthoCamera.top = halfWidth / aspect;
    orthoCamera.bottom = -halfWidth / aspect;
  } else {
    orthoCamera.top = halfDepth;
    orthoCamera.bottom = -halfDepth;
    orthoCamera.right = halfDepth * aspect;
    orthoCamera.left = -halfDepth * aspect;
  }

  orthoCamera.near = 0.1;
  orthoCamera.far = 20000;
  orthoCamera.updateProjectionMatrix();
}

function resizeRenderer() {
  const width = container.clientWidth;
  const height = container.clientHeight;

  renderer.setSize(width, height);

  perspectiveCamera.aspect = width / Math.max(height, 1);
  perspectiveCamera.updateProjectionMatrix();

  if (sceneState) {
    updateOrthoFrustum(sceneState);
  }
}

window.addEventListener("resize", () => {
  resizeRenderer();
  labelsDirty = true;
});

controls.addEventListener("change", () => {
  labelsDirty = true;
});

function apply3DView() {
  if (!sceneState) return;

  activeCamera = perspectiveCamera;
  controls.object = perspectiveCamera;
  controls.enableRotate = true;
  controls.enablePan = true;
  controls.screenSpacePanning = false;
  controls.minPolarAngle = 0.14;
  controls.maxPolarAngle = Math.PI / 2.02;
  controls.minDistance = 80;
  controls.maxDistance = 12000;

  environment3D.visible = true;
  environment2D.visible = false;
  world3D.visible = true;
  world2D.visible = false;

  controls.target.copy(sceneState.center3D);
  perspectiveCamera.position.copy(sceneState.default3DPosition);
  perspectiveCamera.lookAt(sceneState.center3D);

  currentMode = "3d";
  setButtonState("3d");
  labelsDirty = true;
  updateStatusText();
}

function apply2DView() {
  if (!sceneState) return;

  activeCamera = orthoCamera;
  controls.object = orthoCamera;
  controls.enableRotate = false;
  controls.enablePan = true;
  controls.screenSpacePanning = true;

  updateOrthoFrustum(sceneState);

  environment3D.visible = false;
  environment2D.visible = true;
  world3D.visible = false;
  world2D.visible = true;

  controls.target.copy(sceneState.center3D);
  orthoCamera.position.copy(sceneState.top2DPosition);
  orthoCamera.lookAt(sceneState.center3D);

  currentMode = "2d";
  setButtonState("2d");
  labelsDirty = true;
  updateStatusText();
}

function switchMode(mode) {
  if (!sceneState || isTransitioning || currentMode === mode) return;

  runModeTransition(() => {
    if (mode === "3d") {
      apply3DView();
    } else {
      apply2DView();
    }
  });
}

function resetCurrentView() {
  if (!sceneState || isTransitioning) return;

  runModeTransition(() => {
    if (currentMode === "3d") {
      apply3DView();
    } else {
      apply2DView();
    }
    cameraTween = null;
    labelsDirty = true;
  });
}

function startCameraTween(toPosition, toTarget, duration = 780) {
  cameraTween = {
    startTime: performance.now(),
    duration,
    fromPosition: activeCamera.position.clone(),
    toPosition: toPosition.clone(),
    fromTarget: controls.target.clone(),
    toTarget: toTarget.clone()
  };
}

function updateCameraTween(now) {
  if (!cameraTween) return;

  const elapsed = now - cameraTween.startTime;
  const t = Math.min(elapsed / cameraTween.duration, 1);
  const eased = 1 - Math.pow(1 - t, 3);

  activeCamera.position.lerpVectors(
    cameraTween.fromPosition,
    cameraTween.toPosition,
    eased
  );

  controls.target.lerpVectors(
    cameraTween.fromTarget,
    cameraTween.toTarget,
    eased
  );

  if (t >= 1) {
    cameraTween = null;
  }
}

/* =========================================================
   DETAIL LOGIC
   ========================================================= */

function captureCurrentViewState() {
  return {
    mode: currentMode,
    position: activeCamera.position.clone(),
    target: controls.target.clone(),
    zoom: activeCamera.isOrthographicCamera ? activeCamera.zoom : perspectiveCamera.zoom
  };
}

function restoreCapturedViewState(viewState) {
  if (!viewState || !sceneState) return;

  if (viewState.mode === "3d") {
    apply3DView();
    perspectiveCamera.position.copy(viewState.position);
    controls.target.copy(viewState.target);
    perspectiveCamera.zoom = viewState.zoom ?? 1;
    perspectiveCamera.updateProjectionMatrix();
  } else {
    apply2DView();
    orthoCamera.position.copy(viewState.position);
    controls.target.copy(viewState.target);
    orthoCamera.zoom = viewState.zoom ?? 1;
    orthoCamera.updateProjectionMatrix();
  }

  labelsDirty = true;
  syncSceneAfterLayoutChange();
}

function createFallbackDetail(building) {
  const fc = building.functionalConfig;
  return {
    title: fc?.name || `Building ${building.displayNumber}`,
    subtitle: fc?.type || "Functional building",
    summary:
      "Placeholder detail. This building has already entered the functional building system, but its final detail content has not been written yet.",
    bullets: [
      `Display number: ${building.displayNumber}`,
      `Building id: ${fc?.buildingId || building.stableId}`,
      `Type: ${fc?.type || "unknown"}`,
      "Replace this placeholder later with final content."
    ]
  };
}

function fillDetailContent(building) {
  if (guidedPreviewState.active && renderGuidedDetailContent(building)) {
    return;
  }

  detailPanel.classList.remove("scene-panel-detail--guided");
  const fc = building.functionalConfig;
  const content = (fc && DETAIL_CONTENT[fc.buildingId]) || createFallbackDetail(building);

  detailTitle.textContent = content.title;
  detailCode.textContent = `${building.stableId} · ${fc?.shortName || building.displayNumber}`;

  const bulletHtml = (content.bullets || [])
    .map((item) => `<li>${item}</li>`)
    .join("");

  detailScroll.innerHTML = `
    <p>${content.summary}</p>

    <div class="detail-placeholder-block">
      <h4>Quick notes</h4>
      <ul>${bulletHtml}</ul>
    </div>

    <div class="detail-placeholder-block">
      <h4>Expandable content</h4>
      <p>
        This block is intentionally structured so you can later replace it with type-specific material such as dorm comparisons, teaching building functions, retail notes, or route guidance.
      </p>
      <p>
        Because detail content now comes from JSON rather than being hard-coded in the main scene file, future changes should mostly happen in config files instead of in rendering logic.
      </p>
    </div>
  `;

  detailScroll.scrollTop = 0;
}

function openFunctionalDetail(building) {
  if (!building?.functionalConfig?.interactive) return;

  selectedBuilding = building;
  refreshBuildingStyles();
  fillDetailContent(building);
  setSidePanelState("detail");
  labelsDirty = true;
  updateStatusText();
  syncSceneAfterLayoutChange();
}

function closeFunctionalDetail() {
  const viewState = lastBrowseViewState;

  selectedBuilding = null;
  refreshBuildingStyles();
  setSidePanelState("overview");
  labelsDirty = true;
  updateStatusText();

  if (viewState) {
    runModeTransition(() => {
      restoreCapturedViewState(viewState);
      lastBrowseViewState = null;
    });
  } else {
    syncSceneAfterLayoutChange();
  }
}

btnBackOverview.addEventListener("click", () => {
  if (guidedPreviewState.active) {
    window.location.href = "index.html#homeResults";
    return;
  }

  closeFunctionalDetail();
});

function focusBuilding(building) {
  const target = building.focusCenter.clone();
  const offsetX = Math.max(building.focusSize.x * 0.82, 74);
  const offsetY = Math.max(building.focusSize.y * 2.6, 110);
  const offsetZ = Math.max(building.focusSize.z * 0.82, 74);

  const nextPosition = target.clone().add(
    new THREE.Vector3(offsetX, offsetY, offsetZ)
  );

  startCameraTween(nextPosition, target, 820);
}

function focusBuildingFromEntry(building) {
  const target = building.focusCenter.clone();

  const offsetX = Math.max(building.focusSize.x * 1.2, 120);
  const offsetY = Math.max(building.focusSize.y * 4.2, 190);
  const offsetZ = Math.max(building.focusSize.z * 1.28, 120);

  const nextPosition = target.clone().add(
    new THREE.Vector3(offsetX, offsetY, offsetZ)
  );

  startCameraTween(nextPosition, target, 920);
}

function focusBuildingFromUrl() {
  const focusValue = guidedPreviewState.focusValue;
  if (!focusValue) return;

  const target =
    buildingObjects.find((item) => String(item.displayNumber) === focusValue) ||
    buildingObjects.find((item) => item.functionalConfig?.buildingId === focusValue);

  if (!target) return;

  guidedPreviewState.entryBuildingId = target.functionalConfig?.buildingId || null;

  if (guidedPreviewState.active) {
    if (currentMode !== "3d") {
      runModeTransition(() => {
        apply3DView();
        focusBuildingFromEntry(target);
        if (target.functionalConfig?.interactive) {
          openFunctionalDetail(target);
        }
      });
    } else {
      focusBuildingFromEntry(target);
      if (target.functionalConfig?.interactive) {
        openFunctionalDetail(target);
      }
    }
    return;
  }

  if (currentMode !== "3d") {
    runModeTransition(() => {
      apply3DView();
      focusBuilding(target);
      if (target.functionalConfig?.interactive) {
        openFunctionalDetail(target);
      }
    });
  } else {
    focusBuilding(target);
    if (target.functionalConfig?.interactive) {
      openFunctionalDetail(target);
    }
  }
}

/* =========================================================
   BUILDING STYLE APPLICATION
   ========================================================= */

function refreshBuildingStyles() {
  for (const building of buildingObjects) {
    const fc = building.functionalConfig;
    const typeConfig = building.typeConfig;
    const isSelected =
      selectedBuilding && selectedBuilding.displayNumber === building.displayNumber;

    if (fc && typeConfig) {
      building.mesh3D.material.color.set(isSelected ? typeConfig.selectedColor : typeConfig.baseColor);
      building.mesh2D.material.color.set(isSelected ? typeConfig.selectedColor : typeConfig.baseColor);
      building.edge3D.material.color.set(isSelected ? typeConfig.selectedEdgeColor : typeConfig.edgeColor);
      building.edge2D.material.color.set(isSelected ? typeConfig.selectedEdgeColor : typeConfig.edgeColor);

      if (building.functionalLabelEl) {
        building.functionalLabelEl.classList.toggle("is-selected", !!isSelected);
        applyFunctionalLabelVisual(building.functionalLabelEl, typeConfig, !!isSelected);
      }
    } else {
      building.mesh3D.material.color.set("#e2e0db");
      building.mesh2D.material.color.set("#e2e0db");
      building.edge3D.material.color.set("#cbc7bf");
      building.edge2D.material.color.set("#cbc7bf");
    }
  }
}

/* =========================================================
   ENVIRONMENT LAYERS
   ========================================================= */

function addPolygonLayer(geojson, centerX, centerY, options) {
  if (!geojson?.features?.length) return 0;

  let count = 0;

  for (const feature of geojson.features) {
    const polygonSets = getPolygonSets(feature.geometry);

    for (const polygonCoords of polygonSets) {
      const shape = buildShapeFromPolygonCoordinates(
        polygonCoords,
        centerX,
        centerY,
        1
      );

      if (!shape) continue;

      const geometry3D = new THREE.ShapeGeometry(shape);
      geometry3D.rotateX(-Math.PI / 2);

      const mesh3D = new THREE.Mesh(
        geometry3D,
        new THREE.MeshStandardMaterial({
          color: options.color3D,
          roughness: 1,
          metalness: 0,
          transparent: !!options.transparent,
          opacity: options.opacity3D ?? 1,
          side: THREE.DoubleSide
        })
      );
      mesh3D.position.y = options.y3D ?? 0.02;
      environment3D.add(mesh3D);

      const geometry2D = new THREE.ShapeGeometry(shape);
      geometry2D.rotateX(-Math.PI / 2);

      const mesh2D = new THREE.Mesh(
        geometry2D,
        new THREE.MeshStandardMaterial({
          color: options.color2D,
          roughness: 1,
          metalness: 0,
          transparent: !!options.transparent,
          opacity: options.opacity2D ?? 1,
          side: THREE.DoubleSide
        })
      );
      mesh2D.position.y = options.y2D ?? 0.02;
      environment2D.add(mesh2D);

      count += 1;
    }
  }

  return count;
}

function addLineLayer(geojson, centerX, centerY, options) {
  if (!geojson?.features?.length) return 0;

  let count = 0;

  for (const feature of geojson.features) {
    const lineSets = getLineSets(feature.geometry);

    for (const coords of lineSets) {
      if (!Array.isArray(coords) || coords.length < 2) continue;

      const points3D = coords
        .map((point) => {
          const x = Number(point[0]);
          const y = Number(point[1]);
          if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
          const local = toSceneXZ(x, y, centerX, centerY, 1);
          return new THREE.Vector3(local.x, options.y3D ?? 0.12, local.z);
        })
        .filter(Boolean);

      if (points3D.length < 2) continue;

      const geometry3D = new THREE.BufferGeometry().setFromPoints(points3D);
      const line3D = new THREE.Line(
        geometry3D,
        new THREE.LineBasicMaterial({
          color: options.color3D,
          transparent: !!options.transparent,
          opacity: options.opacity3D ?? 1
        })
      );
      environment3D.add(line3D);

      const points2D = points3D.map(
        (point) => new THREE.Vector3(point.x, options.y2D ?? 0.12, point.z)
      );
      const geometry2D = new THREE.BufferGeometry().setFromPoints(points2D);
      const line2D = new THREE.Line(
        geometry2D,
        new THREE.LineBasicMaterial({
          color: options.color2D,
          transparent: !!options.transparent,
          opacity: options.opacity2D ?? 1
        })
      );
      environment2D.add(line2D);

      count += 1;
    }
  }

  return count;
}

function addTreeLayer(geojson, centerX, centerY) {
  if (!geojson?.features?.length) return 0;

  let count = 0;

  const sphereGeometry = new THREE.SphereGeometry(3.1, 8, 8);
  const sphereMaterial3D = new THREE.MeshStandardMaterial({
    color: "#8fd26a",
    roughness: 1,
    metalness: 0
  });

  const circleGeometry = new THREE.CircleGeometry(2.8, 12);
  const circleMaterial2D = new THREE.MeshStandardMaterial({
    color: "#8fd26a",
    roughness: 1,
    metalness: 0,
    side: THREE.DoubleSide
  });

  for (const feature of geojson.features) {
    const pointSets = getPointSets(feature.geometry);

    if (pointSets.length) {
      for (const point of pointSets) {
        const x = Number(point[0]);
        const y = Number(point[1]);

        if (!Number.isFinite(x) || !Number.isFinite(y)) continue;

        const local = toSceneXZ(x, y, centerX, centerY, 1);
        treeScenePoints.push({ x: local.x, z: local.z });

        const tree3D = new THREE.Mesh(sphereGeometry, sphereMaterial3D);
        tree3D.position.set(local.x, 3.8, local.z);
        environment3D.add(tree3D);

        const tree2D = new THREE.Mesh(circleGeometry, circleMaterial2D);
        tree2D.rotation.x = -Math.PI / 2;
        tree2D.position.set(local.x, 0.16, local.z);
        environment2D.add(tree2D);

        count += 1;
      }
      continue;
    }

    const polygonSets = getPolygonSets(feature.geometry);
    for (const polygonCoords of polygonSets) {
      const outer = cleanRing(polygonCoords[0]);
      if (outer.length < 3) continue;

      const center = getPolygonCenter(outer);
      const local = toSceneXZ(center.x, center.y, centerX, centerY, 1);
      treeScenePoints.push({ x: local.x, z: local.z });

      const tree3D = new THREE.Mesh(sphereGeometry, sphereMaterial3D);
      tree3D.position.set(local.x, 3.8, local.z);
      environment3D.add(tree3D);

      const tree2D = new THREE.Mesh(circleGeometry, circleMaterial2D);
      tree2D.rotation.x = -Math.PI / 2;
      tree2D.position.set(local.x, 0.16, local.z);
      environment2D.add(tree2D);

      count += 1;
    }
  }

  return count;
}

async function loadEnvironmentLayers(centerX, centerY) {
  const [roadsGeo, greenGeo, treesGeo, water0Geo, water2Geo] = await Promise.all([
    fetchGeoJsonSafe("./topo/roads.geojson"),
    fetchGeoJsonSafe("./topo/green.geojson"),
    fetchGeoJsonSafe("./topo/trees.geojson"),
    fetchGeoJsonSafe("./topo/water0.geojson"),
    fetchGeoJsonSafe("./topo/water2.geojson")
  ]);

  environmentStats.green += addPolygonLayer(greenGeo, centerX, centerY, {
    color3D: "#dbeccf",
    color2D: "#dbeccf",
    y3D: 0.01,
    y2D: 0.01
  });

  environmentStats.water += addPolygonLayer(water0Geo, centerX, centerY, {
    color3D: "#cfeaf9",
    color2D: "#cfeaf9",
    y3D: 0.03,
    y2D: 0.03,
    transparent: true,
    opacity3D: 0.92,
    opacity2D: 0.92
  });

  environmentStats.water += addPolygonLayer(water2Geo, centerX, centerY, {
    color3D: "#bfe3f7",
    color2D: "#bfe3f7",
    y3D: 0.035,
    y2D: 0.035,
    transparent: true,
    opacity3D: 0.9,
    opacity2D: 0.9
  });

  environmentStats.water += addLineLayer(water0Geo, centerX, centerY, {
    color3D: "#9fd4f2",
    color2D: "#9fd4f2",
    y3D: 0.09,
    y2D: 0.09
  });

  environmentStats.water += addLineLayer(water2Geo, centerX, centerY, {
    color3D: "#9fd4f2",
    color2D: "#9fd4f2",
    y3D: 0.1,
    y2D: 0.1
  });

  environmentStats.roads += addPolygonLayer(roadsGeo, centerX, centerY, {
    color3D: "#d6d9de",
    color2D: "#d6d9de",
    y3D: 0.06,
    y2D: 0.06
  });

  environmentStats.roads += addLineLayer(roadsGeo, centerX, centerY, {
    color3D: "#c7ccd4",
    color2D: "#c7ccd4",
    y3D: 0.12,
    y2D: 0.12
  });

  environmentStats.trees += addTreeLayer(treesGeo, centerX, centerY);
}

/* =========================================================
   BUILDING LOADING
   ========================================================= */

function getFunctionalConfigForNumber(displayNumber) {
  return FUNCTIONAL_BUILDINGS[String(displayNumber)] || null;
}

function getTypeConfig(typeKey) {
  if (!typeKey) return null;
  return BUILDING_TYPES[typeKey] || null;
}

async function loadScene() {
  try {
    const [
      buildingTypesData,
      functionalBuildingsData,
      detailContentData,
      buildingsGeoJson
    ] = await Promise.all([
      fetchJsonStrict("./config/building-types.json"),
      fetchJsonStrict("./config/functional-buildings.json"),
      fetchJsonStrict("./config/detail-content.json"),
      fetchJsonStrict("./topo/buildings.geojson")
    ]);

    BUILDING_TYPES = buildingTypesData;
    FUNCTIONAL_BUILDINGS = functionalBuildingsData;
    DETAIL_CONTENT = detailContentData;

    const features = buildingsGeoJson.features || [];
    if (!features.length) {
      throw new Error("Building GeoJSON contains no features.");
    }

    const bounds = collectBounds(features);
    const rawBuildings = [];
    let skippedCount = 0;

    treeScenePoints.length = 0;
    await loadEnvironmentLayers(bounds.centerX, bounds.centerY);

    for (const feature of features) {
      try {
        const polygonSets = getPolygonSets(feature.geometry);

        if (!polygonSets.length) {
          skippedCount += 1;
          continue;
        }

        for (const polygonCoords of polygonSets) {
          const shape = buildShapeFromPolygonCoordinates(
            polygonCoords,
            bounds.centerX,
            bounds.centerY,
            1
          );

          if (!shape) {
            skippedCount += 1;
            continue;
          }

          const outerRing = cleanRing(polygonCoords[0]);
          const area = polygonArea(outerRing);

          if (area < 1) {
            skippedCount += 1;
            continue;
          }

          const center = getPolygonCenter(outerRing);

          rawBuildings.push({
            shape,
            area,
            sourceCenterX: center.x,
            sourceCenterY: center.y
          });
        }
      } catch (featureError) {
        console.warn("Skipped one feature:", featureError);
        skippedCount += 1;
      }
    }

    rawBuildings.sort((a, b) => {
      if (Math.abs(b.sourceCenterY - a.sourceCenterY) > 0.0001) {
        return b.sourceCenterY - a.sourceCenterY;
      }
      return a.sourceCenterX - b.sourceCenterX;
    });

    rawBuildings.forEach((item, index) => {
      const displayNumber = index + 1;
      const stableId = `B${String(displayNumber).padStart(4, "0")}`;
      const functionalConfig = getFunctionalConfigForNumber(displayNumber);
      const typeConfig = getTypeConfig(functionalConfig?.type);
      const height = estimateHeight(item.area);

      const mesh3DMaterial = new THREE.MeshStandardMaterial({
        color: typeConfig ? typeConfig.baseColor : "#e2e0db",
        roughness: 0.97,
        metalness: 0.02
      });

      const edge3DMaterial = new THREE.LineBasicMaterial({
        color: typeConfig ? typeConfig.edgeColor : "#cbc7bf"
      });

      const mesh2DMaterial = new THREE.MeshStandardMaterial({
        color: typeConfig ? typeConfig.baseColor : "#e2e0db",
        roughness: 0.99,
        metalness: 0.01,
        side: THREE.DoubleSide
      });

      const edge2DMaterial = new THREE.LineBasicMaterial({
        color: typeConfig ? typeConfig.edgeColor : "#cbc7bf"
      });

      const geometry3D = new THREE.ExtrudeGeometry(item.shape, {
        depth: height,
        bevelEnabled: false,
        steps: 1,
        curveSegments: 2
      });
      geometry3D.rotateX(-Math.PI / 2);

      const mesh3D = new THREE.Mesh(geometry3D, mesh3DMaterial);
      world3D.add(mesh3D);

      const edge3D = new THREE.LineSegments(
        new THREE.EdgesGeometry(geometry3D),
        edge3DMaterial
      );
      world3D.add(edge3D);

      const geometry2D = new THREE.ShapeGeometry(item.shape);
      geometry2D.rotateX(-Math.PI / 2);

      const mesh2D = new THREE.Mesh(geometry2D, mesh2DMaterial);
      mesh2D.position.y = 0.2;
      world2D.add(mesh2D);

      const edge2D = new THREE.LineSegments(
        new THREE.EdgesGeometry(geometry2D),
        edge2DMaterial
      );
      edge2D.position.y = 0.26;
      world2D.add(edge2D);

      const scenePos = toSceneXZ(
        item.sourceCenterX,
        item.sourceCenterY,
        bounds.centerX,
        bounds.centerY,
        1
      );

      const normalLabelEl = createNormalLabelElement(displayNumber);

      let functionalLabelEl = null;
      if (functionalConfig && typeConfig) {
        functionalLabelEl = createFunctionalLabelElement(
          functionalConfig.shortName || String(displayNumber),
          functionalConfig.type,
          !!functionalConfig.interactive
        );

        applyFunctionalLabelVisual(functionalLabelEl, typeConfig, false);
      }

      const focusBox = new THREE.Box3().setFromObject(mesh3D);
      const focusCenter = focusBox.getCenter(new THREE.Vector3());
      const focusSize = focusBox.getSize(new THREE.Vector3());

      const building = {
        stableId,
        displayNumber,
        functionalConfig,
        typeConfig,
        mesh3D,
        edge3D,
        mesh2D,
        edge2D,
        normalLabelEl,
        functionalLabelEl,
        focusCenter,
        focusSize,
        anchor3D: new THREE.Vector3(
          scenePos.x,
          height + (functionalConfig ? 10 : 7),
          scenePos.z
        ),
        anchor2D: new THREE.Vector3(
          scenePos.x,
          functionalConfig ? 4.6 : 3.2,
          scenePos.z
        )
      };

      if (functionalLabelEl && functionalConfig?.interactive) {
        functionalLabelEl.addEventListener("click", () => {
          if (
            guidedPreviewState.active &&
            guidedPreviewState.entryBuildingId &&
            functionalConfig.buildingId !== guidedPreviewState.entryBuildingId
          ) {
            return;
          }

          if (!selectedBuilding) {
            lastBrowseViewState = captureCurrentViewState();
          }

          if (currentMode !== "3d") {
            runModeTransition(() => {
              apply3DView();
              if (guidedPreviewState.active) {
                focusBuildingFromEntry(building);
              } else {
                focusBuilding(building);
              }
              openFunctionalDetail(building);
            });
          } else {
            if (guidedPreviewState.active) {
              focusBuildingFromEntry(building);
            } else {
              focusBuilding(building);
            }
            openFunctionalDetail(building);
          }
        });
      }

      buildingObjects.push(building);
    });

    if (buildingObjects.length === 0) {
      throw new Error("No polygon could be rendered.");
    }

    environment2D.visible = false;
    world2D.visible = false;

    buildingStats.count = buildingObjects.length;
    buildingStats.skipped = skippedCount;

    const campusCoverage = getCampusCoverageFromBuildingsAndTrees();
    const worldCenter = campusCoverage.center;
    const squareSide = campusCoverage.squareSide;
    const diskRadius = campusCoverage.radius;

    updateGroundDisk(worldCenter, diskRadius);

    sceneState = {
      center3D: worldCenter.clone(),
      size: new THREE.Vector3(squareSide, campusCoverage.height, squareSide),
      default3DPosition: new THREE.Vector3(
        worldCenter.x + squareSide * 0.36,
        worldCenter.y + Math.max(squareSide * 0.22, 120),
        worldCenter.z + squareSide * 0.40
      ),
      top2DPosition: new THREE.Vector3(
        worldCenter.x,
        worldCenter.y + Math.max(squareSide * 0.92, 920),
        worldCenter.z
      )
    };

    setButtonState("3d");
    setNumbersButtonState();

    if (guidedPreviewState.active) {
      btnReset.innerHTML = '<span aria-hidden="true">⌖</span><span class="guided-reset-text">Reset focus</span>';
      btnReset.title = "Reset focus";
    }

    setSidePanelState("overview");
    updateOrthoFrustum(sceneState);
    apply3DView();
    refreshBuildingStyles();
    updateStatusText();
    syncSceneAfterLayoutChange();
    updateLabels(true);
    focusBuildingFromUrl();
  } catch (error) {
    console.error(error);
    mapStatus.textContent = `Scene failed: ${error.message}`;
  }
}

/* =========================================================
   LABEL UPDATE
   ========================================================= */

function getFunctionalLabelScale(anchor) {
  if (currentMode === "3d") {
    const distance = activeCamera.position.distanceTo(anchor);
    const nearDistance = 260;
    const farDistance = 1800;

    const t = THREE.MathUtils.clamp(
      (distance - nearDistance) / (farDistance - nearDistance),
      0,
      1
    );

    const eased = t * t * (3 - 2 * t);
    return THREE.MathUtils.lerp(1.12, 0.44, eased);
  }

  const orthoSpan = orthoCamera.top - orthoCamera.bottom;
  const nearSpan = 420;
  const farSpan = 2600;

  const t = THREE.MathUtils.clamp(
    (orthoSpan - nearSpan) / (farSpan - nearSpan),
    0,
    1
  );

  const eased = t * t * (3 - 2 * t);
  return THREE.MathUtils.lerp(1.08, 0.5, eased);
}

function getNormalLabelScale(anchor) {
  if (currentMode === "3d") {
    const distance = activeCamera.position.distanceTo(anchor);
    const nearDistance = 260;
    const farDistance = 1800;

    const t = THREE.MathUtils.clamp(
      (distance - nearDistance) / (farDistance - nearDistance),
      0,
      1
    );

    const eased = t * t * (3 - 2 * t);
    return THREE.MathUtils.lerp(0.9, 0.42, eased);
  }

  const orthoSpan = orthoCamera.top - orthoCamera.bottom;
  const nearSpan = 420;
  const farSpan = 2600;

  const t = THREE.MathUtils.clamp(
    (orthoSpan - nearSpan) / (farSpan - nearSpan),
    0,
    1
  );

  const eased = t * t * (3 - 2 * t);
  return THREE.MathUtils.lerp(0.88, 0.48, eased);
}

function placeLabel(el, x, y, scale) {
  el.style.display = "block";
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  el.style.scale = `${scale}`;
}

function updateLabels(force = false) {
  const modeKey = `${currentMode}-${showNormalLabels}-${selectedBuilding?.displayNumber || "none"}`;
  if (!force && !labelsDirty && !cameraTween && modeKey === lastLabelMode) return;

  labelsDirty = false;
  lastLabelMode = modeKey;

  const width = container.clientWidth;
  const height = container.clientHeight;

  for (const building of buildingObjects) {
    if (!building.functionalLabelEl) continue;

    if (
      guidedPreviewState.active &&
      guidedPreviewState.entryBuildingId &&
      building.functionalConfig?.buildingId !== guidedPreviewState.entryBuildingId
    ) {
      building.functionalLabelEl.style.display = "none";
      continue;
    }

    const anchor = currentMode === "3d" ? building.anchor3D : building.anchor2D;
    const projected = anchor.clone().project(activeCamera);

    const visible =
      projected.z >= -1 &&
      projected.z <= 1 &&
      projected.x >= -1.12 &&
      projected.x <= 1.12 &&
      projected.y >= -1.12 &&
      projected.y <= 1.12;

    if (!visible) {
      building.functionalLabelEl.style.display = "none";
      continue;
    }

    const x = (projected.x * 0.5 + 0.5) * width;
    const y = (-projected.y * 0.5 + 0.5) * height;
    const scale = getFunctionalLabelScale(anchor);

    placeLabel(building.functionalLabelEl, x, y, scale);
  }

  const developerMode = showNormalLabels;

  if (!developerMode) {
    for (const building of buildingObjects) {
      building.normalLabelEl.style.display = "none";
    }
    return;
  }

  let zoomAllowsLabels = true;
  let maxLabels = currentMode === "2d" ? 220 : 72;

  if (currentMode === "2d") {
    const orthoSpan = orthoCamera.top - orthoCamera.bottom;
    zoomAllowsLabels = orthoSpan < 2800;
  } else {
    const distance = perspectiveCamera.position.distanceTo(controls.target);
    zoomAllowsLabels = distance < 4200;
  }

  if (!zoomAllowsLabels) {
    for (const building of buildingObjects) {
      building.normalLabelEl.style.display = "none";
    }
    return;
  }

  const candidates = [];

  for (const building of buildingObjects) {
    if (building.functionalLabelEl) {
      building.normalLabelEl.style.display = "none";
      continue;
    }

    const anchor = currentMode === "3d" ? building.anchor3D : building.anchor2D;
    const projected = anchor.clone().project(activeCamera);

    const visible =
      projected.z >= -1 &&
      projected.z <= 1 &&
      projected.x >= -1.08 &&
      projected.x <= 1.08 &&
      projected.y >= -1.08 &&
      projected.y <= 1.08;

    if (!visible) {
      building.normalLabelEl.style.display = "none";
      continue;
    }

    const x = (projected.x * 0.5 + 0.5) * width;
    const y = (-projected.y * 0.5 + 0.5) * height;
    const scale = getNormalLabelScale(anchor);

    candidates.push({
      building,
      x,
      y,
      scale,
      dx: x - width / 2,
      dy: y - height / 2
    });
  }

  candidates.sort((a, b) => {
    const da = a.dx * a.dx + a.dy * a.dy;
    const db = b.dx * b.dx + b.dy * b.dy;
    return da - db;
  });

  const chosen = candidates.slice(0, maxLabels);
  const chosenSet = new Set(chosen.map((item) => item.building.displayNumber));

  for (const item of chosen) {
    placeLabel(item.building.normalLabelEl, item.x, item.y, item.scale);
  }

  for (const building of buildingObjects) {
    if (!chosenSet.has(building.displayNumber)) {
      building.normalLabelEl.style.display = "none";
    }
  }
}

/* =========================================================
   EVENTS
   ========================================================= */

btn3D.addEventListener("click", () => switchMode("3d"));
btn2D.addEventListener("click", () => switchMode("2d"));
btnNumbers.addEventListener("click", () => {
  showNormalLabels = !showNormalLabels;
  setNumbersButtonState();
  labelsDirty = true;
});
btnReset.addEventListener("click", () => {
  if (guidedPreviewState.active && guidedPreviewState.entryBuildingId) {
    const target = buildingObjects.find(
      (item) => item.functionalConfig?.buildingId === guidedPreviewState.entryBuildingId
    );

    if (target) {
      focusBuildingFromEntry(target);
      return;
    }
  }

  resetCurrentView();
  labelsDirty = true;
});

/* =========================================================
   LOOP
   ========================================================= */

function animate(now = 0) {
  updateCameraTween(now);
  controls.update();
  updateLabels(false);
  renderer.render(scene, activeCamera);
  requestAnimationFrame(animate);
}

loadScene();
animate();

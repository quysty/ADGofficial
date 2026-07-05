import * as THREE from "three";
import { MapControls } from "three/addons/controls/MapControls.js";
import {
  applyBuildingLabelOverrides,
  loadBuildingLabelOverrides
} from "./src/backend/buildingOverrides.js";
import { loadBuildingHeightOverrides } from "./src/backend/buildingHeights.js";

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
const pageParams = new URLSearchParams(window.location.search);
const adminPreviewParam = pageParams.get("adminPreview") || "";
const isAdminPreview = Boolean(adminPreviewParam);
const adminToolParam = pageParams.get("adminTool") || "";
const adminToolModeParam = pageParams.get("adminToolMode") || "";
const isAdminMapToolPreview = isAdminPreview && adminToolParam === "map-tools";
const DATA_FETCH_OPTIONS = { cache: "no-cache" };

if (isAdminPreview) {
  document.body.classList.add("is-admin-map-preview");
}

if (isAdminMapToolPreview) {
  document.body.classList.add("is-admin-map-tool-preview");
}

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

const entranceIndexNotice = document.createElement("div");
entranceIndexNotice.className = "entrance-index-notice";
document.body.appendChild(entranceIndexNotice);

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
const selectedBuildingBeam = new THREE.Group();
const entranceToolMarker = new THREE.Group();
const mapToolMarkerGroup = new THREE.Group();
const mapToolRoadGroup = new THREE.Group();
const mapToolCameraGroup = new THREE.Group();
const entranceNavigationGroup = new THREE.Group();
const entranceRouteGroup = new THREE.Group();
const boundaryToolGroup = new THREE.Group();
const boundaryToolShapeGroup = new THREE.Group();
const terrainReliefGroup = new THREE.Group();
const campusTerritoryGroup = new THREE.Group();

scene.add(environment3D);
scene.add(environment2D);
scene.add(terrainReliefGroup);
scene.add(campusTerritoryGroup);
scene.add(world3D);
scene.add(world2D);
scene.add(selectedBuildingBeam);
scene.add(entranceToolMarker);
scene.add(mapToolMarkerGroup);
scene.add(mapToolRoadGroup);
scene.add(mapToolCameraGroup);
scene.add(entranceNavigationGroup);
scene.add(entranceRouteGroup);
scene.add(boundaryToolShapeGroup);
scene.add(boundaryToolGroup);
selectedBuildingBeam.visible = false;
entranceToolMarker.visible = false;

/* 圆形地面：只改场景里的地面，不改地图框 */
const groundGroup = new THREE.Group();
scene.add(groundGroup);

let groundDisk = null;
let groundRing = null;
let groundOuterDim = null;
let groundFocusBoundary = null;
const treeScenePoints = [];

let currentMode = "3d";
let sceneState = null;
let isTransitioning = false;
let showNormalLabels = false;
let cameraTween = null;
let selectedBuilding = null;
let selectedBeamTarget = null;
let lastBrowseViewState = null;

let labelsDirty = true;
let lastLabelMode = "";

const buildingObjects = [];
const entranceRouteTimeLabels = [];
let activeEntranceRouteLabelId = null;
let entranceRoutePointerStart = null;
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
const BUILDING_HEIGHT_SCALE_OVERRIDES = {
  963: 0.5,
  1089: 0.5,
  1176: 0.5,
  1238: 1 / 3
};
const BUILDING_HEIGHT_MATCH_OVERRIDES = {
  928: 821
};

let BUILDING_TYPES = {};
let FUNCTIONAL_BUILDINGS = {};
let DETAIL_CONTENT = {};
let DORM_ENTRANCES = {};
let CAMPUS_BOUNDARIES = {};
let campusBoundaryScenePoints = [];
let campusTerritoryScenePoints = [];
const DORMS = Array.isArray(window.DORM_DATA) ? window.DORM_DATA : [];
const raycaster = new THREE.Raycaster();
const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

const isBaseMap = pageParams.get("map") === "base";
const isLabMap = !isBaseMap;
const topoDataRoot = isBaseMap ? "topo" : "topo-lab";
const DATA_CACHE_VERSION = "building-1786-footprint-v1";
const CONFIG_CACHE_VERSION = DATA_CACHE_VERSION;
const TOPO_CACHE_VERSION = DATA_CACHE_VERSION;
if (pageParams.get("labels") === "off") {
  document.body.classList.add("is-map-labels-hidden");
}

function configPath(fileName) {
  return `./config/${fileName}?v=${CONFIG_CACHE_VERSION}`;
}

function topoPath(fileName) {
  return `./${topoDataRoot}/${fileName}?v=${TOPO_CACHE_VERSION}`;
}

const guidedPreviewState = {
  active: pageParams.get("mode") === "guided",
  from: pageParams.get("from") || "",
  focusValue: pageParams.get("focus") || pageParams.get("building") || "",
  entryBuildingId: null,
  entryDormId: null,
  navigationTargetMode: null,
  navigationCategoryViewActive: false
};
const isHomePathEntry = !guidedPreviewState.active && guidedPreviewState.from === "homePath";
const isMapToolPage = document.body.dataset.page === "map-tool" ||
  pageParams.get("tool") === "point" ||
  isAdminMapToolPreview;
const entranceToolParam = pageParams.get("entrance") || "";
const boundaryToolParam = pageParams.get("boundary") || "";
const MAP_TOOL_MAX_POINTS = 10;
const MAP_ROAD_MAX_POINTS = 40;
const MAP_BOUNDARY_MAX_AREAS = 3;
const MAP_BOUNDARY_AREA_COLORS = ["#2f8cff", "#f59e0b", "#10b981"];
const MAP_CAMERA_DEFAULT_PITCH = 48;
const MAP_CAMERA_DEFAULT_HEIGHT = 980;
const MAP_CAMERA_MIN_PITCH = 18;
const MAP_CAMERA_MAX_PITCH = 76;
const MAP_CAMERA_MIN_HEIGHT = 240;
const MAP_CAMERA_MAX_HEIGHT = 2800;
const BUILDING_DISPLAY_MODES = {
  dorm: {
    key: "dorm",
    label: "宿舍",
    detailKicker: "DORM DETAIL",
    labelClass: "is-building-mode-dorm",
    detailClass: "scene-panel-detail--mode-dorm",
    fallbackSubtitle: "Dormitory",
    detailBlockTitle: "宿舍模式内容",
    frameworkTitle: "宿舍交互框架",
    frameworkCopy:
      "这个分支专门留给宿舍建筑：后续可以接入宿舍对比、房型、生活氛围、入口导航和 Information 页面联动。",
    style: {
      baseColor: "#a4e878",
      selectedColor: "#84d85f",
      edgeColor: "#4fbd55",
      selectedEdgeColor: "#2d8f3a"
    }
  },
  functional: {
    key: "functional",
    label: "功能建筑",
    detailKicker: "FUNCTIONAL BUILDING",
    labelClass: "is-building-mode-functional",
    detailClass: "scene-panel-detail--mode-functional",
    fallbackSubtitle: "Functional building",
    detailBlockTitle: "功能建筑模式内容",
    frameworkTitle: "功能建筑交互框架",
    frameworkCopy:
      "这个分支专门留给非宿舍功能建筑：后续可以接入教学楼、商店、服务点、设施说明和路线引导。",
    style: {
      baseColor: "#90d7ff",
      selectedColor: "#68c5ff",
      edgeColor: "#36a3ea",
      selectedEdgeColor: "#177dca"
    }
  },
  store: {
    key: "store",
    label: "商店",
    detailKicker: "STORE",
    labelClass: "is-building-mode-store",
    detailClass: "scene-panel-detail--mode-store",
    fallbackSubtitle: "Store",
    detailBlockTitle: "商店模式内容",
    frameworkTitle: "商店标记框架",
    frameworkCopy:
      "这个分支专门留给商店建筑：当前只用于地图识别，默认不接入点击、详情、导航或其他交互。",
    style: {
      baseColor: "#fed7aa",
      selectedColor: "#fdba74",
      edgeColor: "#f59e0b",
      selectedEdgeColor: "#d97706"
    }
  },
  reference: {
    key: "reference",
    label: "商场",
    detailKicker: "MALL",
    labelClass: "is-building-mode-reference",
    detailClass: "scene-panel-detail--mode-reference",
    fallbackSubtitle: "Mall",
    detailBlockTitle: "商场模式内容",
    frameworkTitle: "商场标记框架",
    frameworkCopy:
      "这个分支专门留给商场建筑：当前先用于地图识别和导航类别，后续可以接入商场内容与路线逻辑。",
    style: {
      baseColor: "#eadcff",
      selectedColor: "#d8c0ff",
      edgeColor: "#b89af1",
      selectedEdgeColor: "#986ee3"
    }
  },
  social: {
    key: "social",
    label: "社会建筑",
    detailKicker: "SOCIAL BUILDING",
    labelClass: "is-building-mode-social",
    detailClass: "scene-panel-detail--mode-social",
    fallbackSubtitle: "Social building",
    detailBlockTitle: "社会建筑模式内容",
    frameworkTitle: "社会建筑标记框架",
    frameworkCopy:
      "这个分支专门留给社会建筑：当前只用于地图识别，默认不接入点击、详情、导航或其他交互。",
    style: {
      baseColor: "#fff3a3",
      selectedColor: "#ffe66d",
      edgeColor: "#e8c227",
      selectedEdgeColor: "#c9a21a"
    }
  }
};
const BUILDING_DETAIL_MODE_CLASSES = Object.values(BUILDING_DISPLAY_MODES).map(
  (mode) => mode.detailClass
);
const NAVIGATION_TARGET_MODE_ORDER = ["dorm", "functional", "social", "store", "reference"];

function createMapBoundaryArea(index) {
  return {
    id: `area_${index + 1}`,
    index: index + 1,
    label: `面积 ${index + 1}`,
    points: [],
    closed: false
  };
}

function normalizeMapToolMode(mode) {
  return mode === "boundary" || mode === "road" || mode === "camera"
    ? mode
    : "entrance";
}

const mapToolState = {
  active: isMapToolPage,
  mode: normalizeMapToolMode(adminToolModeParam),
  bounds: null,
  panel: null,
  picks: [],
  entranceMode: "mouse",
  boundaryMode: isAdminMapToolPreview ? "mouse" : "select",
  roadMode: "mouse",
  roadAction: "add",
  roadPoints: [],
  removedRoadSegments: [],
  boundaryLabelsEnabled: false,
  cameraGridEnabled: false,
  cameraGrid: null,
  cameraFocusMarker: null,
  cameraPitch: MAP_CAMERA_DEFAULT_PITCH,
  cameraHeight: MAP_CAMERA_DEFAULT_HEIGHT,
  cameraPanelSyncedAt: 0,
  pointerStart: null,
  roadPointerStart: null,
  boundaryPointerStart: null,
  previousMapViewMode: null,
  lastPickedAt: 0
};
const entranceToolState = {
  active: Boolean(entranceToolParam),
  dormId: isLabMap || entranceToolParam.includes("_")
    ? entranceToolParam
    : `dorm_${entranceToolParam}`,
  bounds: null,
  panel: null,
  roadSegments: [],
  lastPick: null,
  pointerStart: null
};
const boundaryToolState = {
  active: Boolean(boundaryToolParam),
  id: boundaryToolParam || "anu",
  bounds: null,
  panel: null,
  points: [],
  areas: Array.from({ length: MAP_BOUNDARY_MAX_AREAS }, (_, index) => createMapBoundaryArea(index)),
  activeAreaIndex: 0,
  markers: [],
  line: null,
  fill: null,
  closed: false,
  pointerStart: null
};
const entranceNavigationState = {
  active: !isMapToolPage && !guidedPreviewState.active && !Boolean(entranceToolParam) && !Boolean(boundaryToolParam),
  bounds: null,
  roadSegments: [],
  baseGraph: null,
  markers: [],
  hitTargets: [],
  selectedStartId: null,
  routeEndpointIds: new Set(),
  pointerStart: null
};

const cityOverviewState = {
  active: !guidedPreviewState.active && !boundaryToolState.active,
  dismissed: false,
  defaultDistance: 0,
  wheelZoomFade: 0
};

if (guidedPreviewState.active) {
  document.body.classList.add("is-guided-preview");
} else {
  document.body.classList.add("is-city-overview");
}

if (isHomePathEntry) {
  document.body.classList.add("is-home-path-entry", "is-home-path-explore");
  window.setTimeout(() => {
    document.body.classList.remove("is-home-path-entry");
  }, 680);
}

if (entranceToolState.active) {
  document.body.classList.add("is-entrance-tool");
}

if (boundaryToolState.active) {
  document.body.classList.add("is-boundary-tool");
}

if (mapToolState.active) {
  document.body.classList.add("is-map-tool");
}

/* =========================================================
   SELECTED BUILDING BEAM
   ========================================================= */

function createBeamMaterial(color, opacity) {
  return new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide
  });
}

function initSelectedBuildingBeam() {
  const outerBeam = new THREE.Mesh(
    new THREE.CylinderGeometry(1, 1, 1, 48, 1, true),
    createBeamMaterial("#78cfff", 0.22)
  );
  outerBeam.name = "selected-building-beam-outer";

  const innerBeam = new THREE.Mesh(
    new THREE.CylinderGeometry(1, 1, 1, 48, 1, true),
    createBeamMaterial("#ffffff", 0.16)
  );
  innerBeam.name = "selected-building-beam-inner";

  const baseRing = new THREE.Mesh(
    new THREE.TorusGeometry(1, 0.04, 14, 96),
    createBeamMaterial("#8fdcff", 0.58)
  );
  baseRing.name = "selected-building-beam-ring";
  baseRing.rotation.x = Math.PI / 2;

  selectedBuildingBeam.add(outerBeam, innerBeam, baseRing);
}

function placeSelectedBuildingBeam(building) {
  selectedBuildingBeam.visible = false;
  selectedBeamTarget = null;
  return;

  if (!isHomePathEntry || currentMode !== "3d" || !building) {
    selectedBuildingBeam.visible = false;
    selectedBeamTarget = null;
    return;
  }

  const radius = Math.max(building.focusSize.x, building.focusSize.z, 28) * 0.08;
  const beamHeight = Math.max(building.focusSize.y * 7.2, 320);
  const baseY = 1.2;

  selectedBuildingBeam.position.set(building.focusCenter.x, baseY, building.focusCenter.z);
  selectedBuildingBeam.visible = true;
  selectedBeamTarget = building;

  const outerBeam = selectedBuildingBeam.getObjectByName("selected-building-beam-outer");
  const innerBeam = selectedBuildingBeam.getObjectByName("selected-building-beam-inner");
  const baseRing = selectedBuildingBeam.getObjectByName("selected-building-beam-ring");

  if (outerBeam) {
    outerBeam.position.y = beamHeight / 2;
    outerBeam.scale.set(radius, beamHeight, radius);
  }

  if (innerBeam) {
    innerBeam.position.y = beamHeight / 2;
    innerBeam.scale.set(radius * 0.34, beamHeight * 1.04, radius * 0.34);
  }

  if (baseRing) {
    baseRing.position.y = 0.18;
    baseRing.scale.set(radius * 5.2, radius * 5.2, radius * 5.2);
  }
}

function updateSelectedBuildingBeam(now = 0) {
  if (!selectedBuildingBeam.visible || !selectedBeamTarget) return;

  const pulse = 0.5 + Math.sin(now * 0.004) * 0.5;
  const outerBeam = selectedBuildingBeam.getObjectByName("selected-building-beam-outer");
  const innerBeam = selectedBuildingBeam.getObjectByName("selected-building-beam-inner");
  const baseRing = selectedBuildingBeam.getObjectByName("selected-building-beam-ring");

  if (outerBeam) {
    outerBeam.material.opacity = 0.22 + pulse * 0.12;
  }

  if (innerBeam) {
    innerBeam.material.opacity = 0.18 + pulse * 0.12;
  }

  if (baseRing) {
    baseRing.material.opacity = 0.22 + pulse * 0.16;
    const ringPulse = 1 + pulse * 0.05;
    baseRing.scale.x = Math.max(selectedBeamTarget.focusSize.x, selectedBeamTarget.focusSize.z, 28) * 0.42 * ringPulse;
    baseRing.scale.y = baseRing.scale.x;
  }
}

initSelectedBuildingBeam();

/* =========================================================
   DORM ENTRANCE PICKER TOOL
   ========================================================= */

function formatEntranceNumber(value) {
  return Number(value).toFixed(3);
}

function sourceToScenePoint(x, y) {
  const bounds = mapToolState.bounds || entranceToolState.bounds || entranceNavigationState.bounds;
  if (!bounds) return null;
  const sourceX = Number(x);
  const sourceY = Number(y);
  if (!Number.isFinite(sourceX) || !Number.isFinite(sourceY)) return null;

  const local = toSceneXZ(sourceX, sourceY, bounds.centerX, bounds.centerY, 1);
  return new THREE.Vector3(local.x, 0, local.z);
}

function sceneToSourcePoint(point) {
  const bounds = mapToolState.bounds || entranceToolState.bounds || entranceNavigationState.bounds;
  if (!bounds || !point) return null;

  return {
    x: point.x + bounds.centerX,
    y: bounds.centerY - point.z
  };
}

function boundarySceneToSourcePoint(point) {
  const bounds = boundaryToolState.bounds;
  if (!bounds || !point) return null;

  return {
    x: point.x + bounds.centerX,
    y: bounds.centerY - point.z
  };
}

function getClosestPointOnSegment(point, start, end) {
  const segment = end.clone().sub(start);
  const lengthSq = segment.lengthSq();

  if (lengthSq <= 0) {
    return {
      point: start.clone(),
      t: 0,
      distance: point.distanceTo(start)
    };
  }

  const t = THREE.MathUtils.clamp(point.clone().sub(start).dot(segment) / lengthSq, 0, 1);
  const closest = start.clone().add(segment.multiplyScalar(t));

  return {
    point: closest,
    t,
    distance: point.distanceTo(closest)
  };
}

function buildEntranceRoadSegments(roadsGeo, centerX, centerY) {
  const segments = [];

  entranceToolState.roadSegments = segments;
  entranceNavigationState.roadSegments = segments;
  entranceNavigationState.baseGraph = null;

  if (!roadsGeo?.features?.length) return;

  for (const feature of roadsGeo.features) {
    const roadType = feature.properties?.type || "Unknown";
    const lineSets = getLineSets(feature.geometry);
    let featureSegmentIndex = 0;

    for (const coords of lineSets) {
      if (!Array.isArray(coords) || coords.length < 2) continue;

      const points = coords
        .map((coord) => {
          const x = Number(coord[0]);
          const y = Number(coord[1]);
          if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
          const local = toSceneXZ(x, y, centerX, centerY, 1);
          return {
            source: { x, y },
            scene: new THREE.Vector3(local.x, 0, local.z)
          };
        })
        .filter(Boolean);

      for (let index = 1; index < points.length; index += 1) {
        featureSegmentIndex += 1;

        segments.push({
          id: `${String(feature.id ?? "road")}:${featureSegmentIndex}`,
          featureId: String(feature.id ?? ""),
          segmentIndex: featureSegmentIndex,
          type: roadType,
          start: points[index - 1],
          end: points[index]
        });
      }
    }
  }

  entranceNavigationState.baseGraph = buildEntranceRouteGraph(segments);
}

function findNearestRoadSnap(scenePoint) {
  const roadSegments = entranceToolState.roadSegments.length
    ? entranceToolState.roadSegments
    : entranceNavigationState.roadSegments;

  if (!scenePoint || !roadSegments.length) return null;

  let best = null;

  for (const segment of roadSegments) {
    const closest = getClosestPointOnSegment(scenePoint, segment.start.scene, segment.end.scene);

    if (!best || closest.distance < best.distance) {
      const sourceX = THREE.MathUtils.lerp(segment.start.source.x, segment.end.source.x, closest.t);
      const sourceY = THREE.MathUtils.lerp(segment.start.source.y, segment.end.source.y, closest.t);

      best = {
        type: segment.type,
        distance: closest.distance,
        scenePoint: closest.point,
        sourcePoint: {
          x: sourceX,
          y: sourceY
        }
      };
    }
  }

  return best;
}

function createEntranceToolMarker() {
  entranceToolMarker.clear();

  const markerMaterial = new THREE.MeshBasicMaterial({
    color: "#f8fbff",
    transparent: true,
    opacity: 0.94,
    depthWrite: false
  });
  const marker = new THREE.Mesh(new THREE.SphereGeometry(5.2, 16, 16), markerMaterial);
  marker.name = "entrance-tool-marker-dot";
  marker.position.y = 5.2;

  const ringMaterial = new THREE.MeshBasicMaterial({
    color: "#4ba8ff",
    transparent: true,
    opacity: 0.75,
    depthWrite: false,
    side: THREE.DoubleSide
  });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(10, 0.42, 12, 72), ringMaterial);
  ring.name = "entrance-tool-marker-ring";
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.62;

  const snapMaterial = new THREE.LineBasicMaterial({
    color: "#f9c74f",
    transparent: true,
    opacity: 0.92
  });
  const snapLine = new THREE.Line(new THREE.BufferGeometry(), snapMaterial);
  snapLine.name = "entrance-tool-snap-line";

  entranceToolMarker.add(marker, ring, snapLine);
}

function updateEntranceToolMarker(scenePoint, snap) {
  if (!scenePoint) {
    entranceToolMarker.visible = false;
    return;
  }

  entranceToolMarker.position.set(scenePoint.x, 0, scenePoint.z);
  entranceToolMarker.visible = true;

  const snapLine = entranceToolMarker.getObjectByName("entrance-tool-snap-line");
  if (snapLine) {
    snapLine.geometry.dispose();
    snapLine.geometry = snap?.scenePoint
      ? new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 1.2, 0),
        new THREE.Vector3(snap.scenePoint.x - scenePoint.x, 1.2, snap.scenePoint.z - scenePoint.z)
      ])
      : new THREE.BufferGeometry();
  }
}

function createEntranceToolPanel() {
  if (!entranceToolState.active || entranceToolState.panel) return;

  const panel = document.createElement("aside");
  panel.className = "entrance-tool-panel";
  panel.innerHTML = `
    <p class="entrance-tool-panel__kicker">Entrance picker</p>
    <h2>${escapeHtml(entranceToolState.dormId)}</h2>
    <p class="entrance-tool-panel__hint">Click the exact dorm entrance on the map. Dragging the camera is ignored. JSON copies automatically after each pick.</p>
    <pre class="entrance-tool-panel__output">No entrance selected yet.</pre>
    <p class="entrance-tool-panel__status">Pick a point to auto-copy JSON.</p>
  `;

  document.body.appendChild(panel);
  entranceToolState.panel = panel;

  [
    "pointerdown",
    "pointermove",
    "pointerup",
    "mousedown",
    "mousemove",
    "mouseup",
    "touchstart",
    "touchmove",
    "touchend",
    "click",
    "dblclick",
    "wheel"
  ].forEach((eventName) => {
    panel.addEventListener(eventName, (event) => {
      event.stopPropagation();
    });
  });

}

function updateEntranceToolPanel(pick) {
  const output = entranceToolState.panel?.querySelector(".entrance-tool-panel__output");
  if (!output || !pick) return;

  output.textContent = JSON.stringify(pick, null, 2);
}

function updateEntranceToolCopyStatus(message, copied = false) {
  const panel = entranceToolState.panel;
  const status = panel?.querySelector(".entrance-tool-panel__status");
  if (!panel || !status) return;

  status.textContent = message;
  panel.classList.toggle("is-copied", copied);
}

async function copyEntrancePickToClipboard(pick) {
  if (!pick) return;

  try {
    await copyTextToClipboard(JSON.stringify(pick, null, 2));
    updateEntranceToolCopyStatus("Copied JSON automatically.", true);
  } catch (error) {
    console.warn("Clipboard copy failed:", error);
    updateEntranceToolCopyStatus("Auto-copy was blocked. Select the JSON text above.", false);
  }
}

async function copyTextToClipboard(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
}

function pickEntranceAtClientPoint(clientX, clientY) {
  if (!entranceToolState.active || !entranceToolState.bounds) return null;

  const rect = renderer.domElement.getBoundingClientRect();
  const pointer = new THREE.Vector2(
    ((clientX - rect.left) / Math.max(rect.width, 1)) * 2 - 1,
    -(((clientY - rect.top) / Math.max(rect.height, 1)) * 2 - 1)
  );
  let scenePoint = null;
  let hitScenePoint = null;

  raycaster.setFromCamera(pointer, activeCamera);

  const buildingMeshes = buildingObjects
    .map((building) => (currentMode === "2d" ? building.mesh2D : building.mesh3D))
    .filter(Boolean);
  const buildingHits = raycaster.intersectObjects(buildingMeshes, false);

  if (buildingHits.length) {
    hitScenePoint = buildingHits[0].point.clone();
    scenePoint = new THREE.Vector3(buildingHits[0].point.x, 0, buildingHits[0].point.z);
  } else {
    scenePoint = new THREE.Vector3();
    if (!raycaster.ray.intersectPlane(groundPlane, scenePoint)) return null;
    hitScenePoint = scenePoint.clone();
  }

  const sourcePoint = sceneToSourcePoint(scenePoint);
  const snap = findNearestRoadSnap(scenePoint);

  if (!sourcePoint || !snap) return null;

  return {
    [entranceToolState.dormId]: {
      entrance: [
        Number(formatEntranceNumber(sourcePoint.x)),
        Number(formatEntranceNumber(sourcePoint.y))
      ],
      snap: [
        Number(formatEntranceNumber(snap.sourcePoint.x)),
        Number(formatEntranceNumber(snap.sourcePoint.y))
      ],
      snapRoadType: snap.type,
      snapDistanceMeters: Number(formatEntranceNumber(snap.distance))
    },
    _scenePoint: scenePoint,
    _snap: snap
  };
}

function bindEntranceToolEvents() {
  if (!entranceToolState.active) return;

  renderer.domElement.addEventListener("pointerdown", (event) => {
    entranceToolState.pointerStart = {
      x: event.clientX,
      y: event.clientY
    };
  });

  renderer.domElement.addEventListener("pointerup", (event) => {
    const start = entranceToolState.pointerStart;
    entranceToolState.pointerStart = null;
    if (!start) return;

    const moved = Math.hypot(event.clientX - start.x, event.clientY - start.y);
    if (moved > 6) return;

    const pick = pickEntranceAtClientPoint(event.clientX, event.clientY);
    if (!pick) return;

    const cleanPick = {
      [entranceToolState.dormId]: pick[entranceToolState.dormId]
    };

    entranceToolState.lastPick = cleanPick;
    updateEntranceToolMarker(pick._scenePoint, pick._snap);
    updateEntranceToolPanel(cleanPick);
    copyEntrancePickToClipboard(cleanPick);
  });
}

/* =========================================================
   MAP POINT TOOL
   ========================================================= */

function createMapToolPanel() {
  if (isAdminMapToolPreview) return;
  if (!mapToolState.active || mapToolState.panel) return;

  const panel = document.createElement("aside");
  let boundaryRowsHtml = "";
  for (let index = 0; index < MAP_BOUNDARY_MAX_AREAS; index += 1) {
    boundaryRowsHtml += '<div class="map-tool-boundary-row" data-boundary-row="' + index + '">' +
      '<button class="map-tool-boundary-select" type="button" data-boundary-select="' + index + '">面积 ' + (index + 1) + '</button>' +
      '<button class="map-tool-boundary-copy" type="button" data-boundary-copy="' + index + '" disabled>复制</button>' +
      '<button class="map-tool-boundary-delete" type="button" data-boundary-delete="' + index + '" disabled>删除</button>' +
    '</div>';
  }

  panel.className = "entrance-tool-panel map-tool-panel";
  panel.innerHTML = `
    <div class="map-tool-panel__head">
      <p class="entrance-tool-panel__kicker map-tool-panel__title">入口工具</p>
      <div class="map-tool-panel__mode-actions">
        <button class="map-tool-panel__entrance-toggle" type="button">鼠标模式</button>
        <button class="map-tool-panel__mode-toggle" type="button">切到圈地</button>
        <button class="map-tool-panel__road-toggle" type="button">切到道路</button>
        <button class="map-tool-panel__camera-toggle" type="button">摄像机</button>
      </div>
    </div>
    <p class="entrance-tool-panel__hint map-tool-panel__hint">点击地图记录坐标；拖动地图不会记录。蓝色入口标记仅用于参考，不触发连线。</p>
    <div class="map-tool-boundary-controls" hidden>
      <div class="map-tool-boundary-areas" aria-label="圈地面积管理">
        ${boundaryRowsHtml}
      </div>
      <button class="map-tool-panel__button map-tool-boundary-label-toggle" type="button">建筑编号：关</button>
      <button class="map-tool-panel__button map-tool-boundary-copy-all" type="button" disabled>一起复制</button>
    </div>
    <div class="map-tool-road-controls" hidden>
      <div class="map-tool-road-actions" aria-label="道路调整模式">
        <button class="map-tool-road-action is-active" type="button" data-road-action="add">新增道路</button>
        <button class="map-tool-road-action" type="button" data-road-action="remove">删除道路</button>
      </div>
    </div>
    <div class="map-tool-camera-controls" hidden>
      <label class="map-tool-camera-check">
        <input class="map-tool-camera-grid" type="checkbox" />
        <span>地图网格</span>
      </label>
      <label class="map-tool-camera-field">
        <span>俯仰角度 <strong class="map-tool-camera-pitch-value">48°</strong></span>
        <input class="map-tool-camera-pitch" type="range" min="${MAP_CAMERA_MIN_PITCH}" max="${MAP_CAMERA_MAX_PITCH}" step="1" value="${MAP_CAMERA_DEFAULT_PITCH}" />
      </label>
      <label class="map-tool-camera-field">
        <span>相机高度 <strong class="map-tool-camera-height-value">980</strong></span>
        <input class="map-tool-camera-height" type="range" min="${MAP_CAMERA_MIN_HEIGHT}" max="${MAP_CAMERA_MAX_HEIGHT}" step="20" value="${MAP_CAMERA_DEFAULT_HEIGHT}" />
      </label>
    </div>
    <pre class="entrance-tool-panel__output map-tool-panel__output">暂无点位。</pre>
    <div class="map-tool-panel__actions">
      <button class="map-tool-panel__button map-tool-panel__copy" type="button" disabled>复制 JSON</button>
      <button class="map-tool-panel__button map-tool-panel__delete" type="button" disabled>删除上一个</button>
      <button class="map-tool-panel__button map-tool-panel__clear" type="button" disabled>清空</button>
    </div>
    <p class="entrance-tool-panel__status">0 个点位。</p>
  `;

  document.body.appendChild(panel);
  mapToolState.panel = panel;

  [
    "pointerdown",
    "pointermove",
    "pointerup",
    "mousedown",
    "mousemove",
    "mouseup",
    "touchstart",
    "touchmove",
    "touchend",
    "click",
    "dblclick",
    "wheel"
  ].forEach((eventName) => {
    panel.addEventListener(eventName, (event) => {
      event.stopPropagation();
    });
  });

  panel.querySelector(".map-tool-panel__mode-toggle")?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    setMapToolMode(mapToolState.mode === "boundary" ? "entrance" : "boundary");
  });

  panel.querySelector(".map-tool-panel__entrance-toggle")?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    toggleMapToolInputMode();
  });

  panel.querySelector(".map-tool-panel__road-toggle")?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    setMapToolMode(mapToolState.mode === "road" ? "entrance" : "road");
  });

  panel.querySelector(".map-tool-panel__camera-toggle")?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    setMapToolMode(mapToolState.mode === "camera" ? "entrance" : "camera");
  });

  panel.querySelector(".map-tool-camera-grid")?.addEventListener("change", (event) => {
    event.stopPropagation();
    setMapCameraGridEnabled(event.currentTarget.checked);
  });

  panel.querySelector(".map-tool-camera-pitch")?.addEventListener("input", (event) => {
    event.stopPropagation();
    setMapCameraPitch(event.currentTarget.value);
  });

  panel.querySelector(".map-tool-camera-height")?.addEventListener("input", (event) => {
    event.stopPropagation();
    setMapCameraHeight(event.currentTarget.value);
  });

  panel.querySelectorAll("[data-road-action]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      setMapRoadAction(button.dataset.roadAction);
    });
  });

  panel.querySelector(".map-tool-panel__copy")?.addEventListener("click", async (event) => {
    event.preventDefault();
    event.stopPropagation();
    await copyMapToolPointsToClipboard();
  });

  panel.querySelector(".map-tool-panel__delete")?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    deleteLastMapToolPoint();
  });

  panel.querySelector(".map-tool-panel__clear")?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    clearMapToolPoints();
  });

  panel.querySelectorAll("[data-boundary-select]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      setActiveMapBoundaryArea(Number(button.dataset.boundarySelect));
    });
  });

  panel.querySelectorAll("[data-boundary-copy]").forEach((button) => {
    button.addEventListener("click", async (event) => {
      event.preventDefault();
      event.stopPropagation();
      await copyMapBoundaryAreaToClipboard(Number(button.dataset.boundaryCopy));
    });
  });

  panel.querySelectorAll("[data-boundary-delete]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      deleteMapBoundaryArea(Number(button.dataset.boundaryDelete));
    });
  });

  panel.querySelector(".map-tool-boundary-copy-all")?.addEventListener("click", async (event) => {
    event.preventDefault();
    event.stopPropagation();
    await copyMapBoundaryAllToClipboard();
  });

  panel.querySelector(".map-tool-boundary-label-toggle")?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    toggleMapBoundaryLabels();
  });
}

function getMapToolOutput() {
  return {
    tool: "entrance",
    totalPoints: mapToolState.picks.length,
    maxPoints: MAP_TOOL_MAX_POINTS,
    points: mapToolState.picks
  };
}

function clampMapCameraPitch(value) {
  const parsed = Number(value);
  return THREE.MathUtils.clamp(
    Number.isFinite(parsed) ? parsed : MAP_CAMERA_DEFAULT_PITCH,
    MAP_CAMERA_MIN_PITCH,
    MAP_CAMERA_MAX_PITCH
  );
}

function clampMapCameraHeight(value) {
  const parsed = Number(value);
  return THREE.MathUtils.clamp(
    Number.isFinite(parsed) ? parsed : MAP_CAMERA_DEFAULT_HEIGHT,
    MAP_CAMERA_MIN_HEIGHT,
    MAP_CAMERA_MAX_HEIGHT
  );
}

function getMapCameraGroundY() {
  return 0;
}

function getMapCameraDefaultTarget() {
  const target = sceneState?.center3D ? sceneState.center3D.clone() : new THREE.Vector3();
  target.y = getMapCameraGroundY();
  return target;
}

function getMapCameraHorizontalDirection(resetDirection = false) {
  if (!resetDirection && activeCamera?.position && controls?.target) {
    const offset = activeCamera.position.clone().sub(controls.target);
    offset.y = 0;
    if (offset.lengthSq() > 1) return offset.normalize();
  }

  return new THREE.Vector3(0.64, 0, 0.77).normalize();
}

function getMapCameraPositionFromTarget(target, resetDirection = false) {
  const pitch = THREE.MathUtils.degToRad(clampMapCameraPitch(mapToolState.cameraPitch));
  const height = clampMapCameraHeight(mapToolState.cameraHeight);
  const horizontalDistance = height / Math.max(Math.tan(pitch), 0.001);
  const direction = getMapCameraHorizontalDirection(resetDirection);

  return target
    .clone()
    .addScaledVector(direction, horizontalDistance)
    .setY(target.y + height);
}

function getMapCameraFocusFromPosition(position, resetDirection = false) {
  const pitch = THREE.MathUtils.degToRad(clampMapCameraPitch(mapToolState.cameraPitch));
  const groundY = getMapCameraGroundY();
  const height = Math.max(position.y - groundY, 1);
  const horizontalDistance = height / Math.max(Math.tan(pitch), 0.001);
  const direction = getMapCameraHorizontalDirection(resetDirection);

  return new THREE.Vector3(position.x, groundY, position.z)
    .addScaledVector(direction, -horizontalDistance);
}

function ensureMapCameraGrid() {
  if (mapToolState.cameraGrid || !sceneState) return;

  const baseSize = Math.max(sceneState.size.x, sceneState.size.z, 800);
  const gridSize = Math.ceil((baseSize * 1.34) / 100) * 100;
  const divisions = Math.max(80, Math.min(220, Math.round(gridSize / 18)));
  const grid = new THREE.GridHelper(gridSize, divisions, 0x111827, 0xb8a66f);
  grid.name = "map-tool-camera-grid";
  grid.position.copy(sceneState.center3D);
  grid.position.y = getMapCameraGroundY() + 0.12;
  grid.renderOrder = 72;
  grid.material.transparent = true;
  grid.material.opacity = 0.42;
  grid.material.depthWrite = false;

  mapToolState.cameraGrid = grid;
  mapToolCameraGroup.add(grid);
}

function ensureMapCameraFocusMarker() {
  if (mapToolState.cameraFocusMarker) return;

  const marker = new THREE.Group();
  marker.name = "map-tool-camera-focus";
  marker.renderOrder = 98;

  const stone = new THREE.Mesh(
    new THREE.SphereGeometry(7.2, 28, 14),
    new THREE.MeshBasicMaterial({
      color: "#111827",
      transparent: true,
      opacity: 0.92,
      depthTest: false,
      depthWrite: false
    })
  );
  stone.name = "map-tool-camera-focus-stone";
  stone.scale.y = 0.12;
  stone.position.y = 0.95;
  stone.renderOrder = 99;

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(16, 1.05, 12, 72),
    new THREE.MeshBasicMaterial({
      color: "#facc15",
      transparent: true,
      opacity: 0.92,
      depthTest: false,
      depthWrite: false
    })
  );
  ring.name = "map-tool-camera-focus-ring";
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.16;
  ring.renderOrder = 98;

  const crossGeometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-26, 0.2, 0),
    new THREE.Vector3(26, 0.2, 0),
    new THREE.Vector3(0, 0.2, -26),
    new THREE.Vector3(0, 0.2, 26)
  ]);
  const cross = new THREE.LineSegments(
    crossGeometry,
    new THREE.LineBasicMaterial({
      color: "#111827",
      transparent: true,
      opacity: 0.76,
      depthTest: false,
      depthWrite: false
    })
  );
  cross.name = "map-tool-camera-focus-cross";
  cross.renderOrder = 97;

  marker.add(ring, cross, stone);
  mapToolState.cameraFocusMarker = marker;
  mapToolCameraGroup.add(marker);
}

function syncMapCameraFocusMarker() {
  ensureMapCameraFocusMarker();
  if (!mapToolState.cameraFocusMarker) return;

  const target = controls.target || getMapCameraDefaultTarget();
  mapToolState.cameraFocusMarker.position.set(target.x, getMapCameraGroundY(), target.z);
  mapToolState.cameraFocusMarker.visible = isMapToolCameraMode();
}

function syncMapCameraStateFromControls(options = {}) {
  if (!isMapToolCameraMode()) return;

  mapToolState.cameraHeight = Math.round(clampMapCameraHeight(
    perspectiveCamera.position.y - getMapCameraGroundY()
  ));
  syncMapCameraFocusMarker();

  if (options.updatePanel) {
    const now = performance.now();
    if (now - mapToolState.cameraPanelSyncedAt > 90) {
      mapToolState.cameraPanelSyncedAt = now;
      updateMapToolPanel();
    }
  }
}

function syncMapCameraGrid() {
  ensureMapCameraGrid();
  syncMapCameraFocusMarker();
  mapToolCameraGroup.visible = isMapToolCameraMode();
  if (mapToolState.cameraGrid) {
    mapToolState.cameraGrid.visible = isMapToolCameraMode() && mapToolState.cameraGridEnabled;
  }
  if (mapToolState.cameraFocusMarker) {
    mapToolState.cameraFocusMarker.visible = isMapToolCameraMode();
  }
}

function applyMapCameraToolView(options = {}) {
  if (!sceneState) return;

  if (currentMode !== "3d" || activeCamera !== perspectiveCamera) {
    apply3DView();
  }

  let position = perspectiveCamera.position.clone();
  let target = null;

  if (options.resetPosition === true) {
    target = getMapCameraDefaultTarget();
    position = getMapCameraPositionFromTarget(target, true);
  } else {
    if (options.applyHeight === true) {
      position.y = getMapCameraGroundY() + clampMapCameraHeight(mapToolState.cameraHeight);
    }
    target = getMapCameraFocusFromPosition(position, options.resetDirection === true);
  }

  controls.target.copy(target);
  perspectiveCamera.position.copy(position);
  perspectiveCamera.lookAt(target);
  perspectiveCamera.updateProjectionMatrix();
  controls.update();
  mapToolState.cameraHeight = Math.round(clampMapCameraHeight(
    perspectiveCamera.position.y - getMapCameraGroundY()
  ));
  labelsDirty = true;
  updateLabels(true);
  syncMapCameraGrid();
}

function resetMapCameraTool() {
  mapToolState.cameraPitch = MAP_CAMERA_DEFAULT_PITCH;
  mapToolState.cameraHeight = MAP_CAMERA_DEFAULT_HEIGHT;
  applyMapCameraToolView({ resetDirection: true, resetPosition: true });
  updateMapToolPanel();
}

function setMapCameraGridEnabled(enabled) {
  mapToolState.cameraGridEnabled = Boolean(enabled);
  syncMapCameraGrid();
  updateMapToolPanel();
}

function setMapCameraPitch(value) {
  mapToolState.cameraPitch = clampMapCameraPitch(value);
  if (isMapToolCameraMode()) applyMapCameraToolView();
  updateMapToolPanel();
}

function setMapCameraHeight(value) {
  mapToolState.cameraHeight = clampMapCameraHeight(value);
  if (isMapToolCameraMode()) applyMapCameraToolView({ applyHeight: true });
  updateMapToolPanel();
}

function formatMapCameraVector(vector) {
  return [
    Number(formatEntranceNumber(vector.x)),
    Number(formatEntranceNumber(vector.y)),
    Number(formatEntranceNumber(vector.z))
  ];
}

function getMapCameraOrbitAngles() {
  const offset = perspectiveCamera.position.clone().sub(controls.target);
  offset.y = 0;

  if (offset.lengthSq() < 0.0001) {
    return {
      sideAngleDegrees: 0,
      orbitAngleDegrees: 0
    };
  }

  const rawAngle = THREE.MathUtils.radToDeg(Math.atan2(offset.x, offset.z));
  const orbitAngle = (rawAngle + 360) % 360;
  const sideAngle = orbitAngle > 180 ? orbitAngle - 360 : orbitAngle;

  return {
    sideAngleDegrees: Number(formatEntranceNumber(sideAngle)),
    orbitAngleDegrees: Number(formatEntranceNumber(orbitAngle))
  };
}

function getMapCameraOutput() {
  const focusSource = sceneToSourcePoint(controls.target);
  const orbitAngles = getMapCameraOrbitAngles();

  return {
    tool: "camera-view",
    mode: "focus-art-camera",
    gridEnabled: mapToolState.cameraGridEnabled,
    pitchDegrees: Number(formatEntranceNumber(mapToolState.cameraPitch)),
    sideAngleDegrees: orbitAngles.sideAngleDegrees,
    orbitAngleDegrees: orbitAngles.orbitAngleDegrees,
    height: Number(formatEntranceNumber(mapToolState.cameraHeight)),
    focus: {
      scene: formatMapCameraVector(controls.target),
      source: focusSource
        ? [
          Number(formatEntranceNumber(focusSource.x)),
          Number(formatEntranceNumber(focusSource.y))
        ]
        : null
    },
    camera: {
      mode: currentMode,
      position: formatMapCameraVector(perspectiveCamera.position),
      target: formatMapCameraVector(controls.target),
      sideAngleDegrees: orbitAngles.sideAngleDegrees,
      orbitAngleDegrees: orbitAngles.orbitAngleDegrees,
      distance: Number(formatEntranceNumber(perspectiveCamera.position.distanceTo(controls.target)))
    }
  };
}

function getMapBoundaryAreaColor(areaIndex) {
  return MAP_BOUNDARY_AREA_COLORS[areaIndex % MAP_BOUNDARY_AREA_COLORS.length];
}

function getMapBoundaryActiveArea() {
  return boundaryToolState.areas[boundaryToolState.activeAreaIndex] || boundaryToolState.areas[0];
}

function getMapBoundaryAreasWithPoints() {
  return boundaryToolState.areas.filter((area) => area.points.length > 0);
}

function getMapBoundaryTotalPoints() {
  return boundaryToolState.areas.reduce((total, area) => total + area.points.length, 0);
}

function getMapBoundaryAreaOutput(area) {
  const points = area.points.map((point, index) => {
    const source = boundarySceneToSourcePoint(point);

    return {
      index: index + 1,
      label: `边界点 ${index + 1}`,
      source: source
        ? [
          Number(formatEntranceNumber(source.x)),
          Number(formatEntranceNumber(source.y))
        ]
        : null,
      scene: [
        Number(formatEntranceNumber(point.x)),
        Number(formatEntranceNumber(point.y)),
        Number(formatEntranceNumber(point.z))
      ]
    };
  });

  return {
    id: area.id,
    index: area.index,
    label: area.label,
    totalPoints: points.length,
    closed: area.closed,
    points
  };
}

function getMapBoundaryOutput() {
  const areas = boundaryToolState.areas.map(getMapBoundaryAreaOutput);
  const totalPoints = areas.reduce((total, area) => total + area.totalPoints, 0);

  return {
    tool: "boundary",
    mode: "top-down-2d",
    maxAreas: MAP_BOUNDARY_MAX_AREAS,
    activeArea: getMapBoundaryActiveArea().index,
    totalAreas: areas.filter((area) => area.totalPoints > 0).length,
    totalClosedAreas: areas.filter((area) => area.closed).length,
    totalPoints,
    areas
  };
}

function getRoadSegmentsForMapTool() {
  return entranceToolState.roadSegments.length
    ? entranceToolState.roadSegments
    : entranceNavigationState.roadSegments;
}

function getMapRoadAddSegments() {
  const points = mapToolState.roadPoints;
  const segments = [];

  for (let index = 1; index < points.length; index += 1) {
    const from = points[index - 1];
    const to = points[index];
    const fromScene = new THREE.Vector3(from.groundScene[0], 0, from.groundScene[2]);
    const toScene = new THREE.Vector3(to.groundScene[0], 0, to.groundScene[2]);

    segments.push({
      index,
      label: `新增道路段 ${index}`,
      from: from.id,
      to: to.id,
      source: [from.source, to.source],
      scene: [from.groundScene, to.groundScene],
      distanceMeters: Number(formatEntranceNumber(fromScene.distanceTo(toScene)))
    });
  }

  return segments;
}

function getMapRoadRemoveSegmentOutput(segment, index) {
  return {
    id: segment.id || `road_segment_${index + 1}`,
    index: index + 1,
    label: `删除道路段 ${index + 1}`,
    featureId: segment.featureId || null,
    segmentIndex: Number.isFinite(segment.segmentIndex) ? segment.segmentIndex : null,
    roadType: segment.type || "Unknown",
    source: [
      [
        Number(formatEntranceNumber(segment.start.source.x)),
        Number(formatEntranceNumber(segment.start.source.y))
      ],
      [
        Number(formatEntranceNumber(segment.end.source.x)),
        Number(formatEntranceNumber(segment.end.source.y))
      ]
    ],
    scene: [
      [
        Number(formatEntranceNumber(segment.start.scene.x)),
        0,
        Number(formatEntranceNumber(segment.start.scene.z))
      ],
      [
        Number(formatEntranceNumber(segment.end.scene.x)),
        0,
        Number(formatEntranceNumber(segment.end.scene.z))
      ]
    ],
    distanceMeters: Number(formatEntranceNumber(segment.start.scene.distanceTo(segment.end.scene)))
  };
}

function getMapRoadOutput() {
  const addSegments = getMapRoadAddSegments();
  const removeSegments = mapToolState.removedRoadSegments.map(getMapRoadRemoveSegmentOutput);

  return {
    tool: "road-adjustment",
    mode: "custom-navigation-route",
    activeAction: mapToolState.roadAction,
    totalPoints: mapToolState.roadPoints.length + removeSegments.length,
    totalAddPoints: mapToolState.roadPoints.length,
    totalAddSegments: addSegments.length,
    totalRemoveSegments: removeSegments.length,
    addRoute: {
      totalPoints: mapToolState.roadPoints.length,
      points: mapToolState.roadPoints,
      segments: addSegments
    },
    removeSegments
  };
}

function getCurrentMapToolOutput() {
  if (mapToolState.mode === "boundary") return getMapBoundaryOutput();
  if (mapToolState.mode === "road") return getMapRoadOutput();
  if (mapToolState.mode === "camera") return getMapCameraOutput();
  return getMapToolOutput();
}

function getMapToolInputMode() {
  if (mapToolState.mode === "boundary") return mapToolState.boundaryMode;
  if (mapToolState.mode === "road") return mapToolState.roadMode;
  return mapToolState.entranceMode;
}

function getMapToolStatusText() {
  const isBoundaryMode = mapToolState.mode === "boundary";
  const isRoadMode = mapToolState.mode === "road";
  const isCameraMode = mapToolState.mode === "camera";

  if (isBoundaryMode) {
    const activeArea = getMapBoundaryActiveArea();
    const labelText = mapToolState.boundaryLabelsEnabled ? "编号开" : "编号关";
    const inputText = mapToolState.boundaryMode === "select" ? "圈地模式" : "鼠标模式";
    if (activeArea.closed) {
      return `${inputText}，${activeArea.label} 已闭合，${activeArea.points.length} 个边界点，${labelText}。`;
    }
    return `${inputText}，当前：${activeArea.label}，${activeArea.points.length} 个边界点，${labelText}。`;
  }

  if (isRoadMode) {
    const roadModeText = mapToolState.roadMode === "select" ? "选点模式" : "鼠标模式";
    return mapToolState.roadAction === "remove"
      ? `${roadModeText}，待删除道路段 ${mapToolState.removedRoadSegments.length} 个；新增道路点 ${mapToolState.roadPoints.length} 个。`
      : `${roadModeText}，新增道路点 ${mapToolState.roadPoints.length} 个；待删除道路段 ${mapToolState.removedRoadSegments.length} 个。`;
  }

  if (isCameraMode) {
    return `视角模式，高度 ${Math.round(mapToolState.cameraHeight)}，俯仰 ${Math.round(mapToolState.cameraPitch)}°，网格${mapToolState.cameraGridEnabled ? "开" : "关"}。`;
  }

  if (!mapToolState.picks.length) {
    return mapToolState.entranceMode === "select"
      ? `选点模式，0 个点位，最多 ${MAP_TOOL_MAX_POINTS} 个。`
      : "鼠标模式，0 个点位；当前不会记录入口。";
  }

  if (mapToolState.picks.length >= MAP_TOOL_MAX_POINTS) {
    return `已记录 ${MAP_TOOL_MAX_POINTS} 个点位，已达到上限。`;
  }

  const modeText = mapToolState.entranceMode === "select" ? "选点模式" : "鼠标模式";
  return `${modeText}，已记录 ${mapToolState.picks.length} 个点位，最后一个：点位 ${mapToolState.picks.length}。`;
}

function getMapToolPayload() {
  const output = getCurrentMapToolOutput();
  const activeArea = getMapBoundaryActiveArea();
  const boundaryTotalPoints = getMapBoundaryTotalPoints();
  const roadOutputTotal = mapToolState.roadPoints.length + mapToolState.removedRoadSegments.length;
  const canDelete = mapToolState.mode === "boundary"
    ? activeArea.points.length > 0
    : mapToolState.mode === "road"
      ? mapToolState.roadAction === "remove"
        ? mapToolState.removedRoadSegments.length > 0
        : mapToolState.roadPoints.length > 0
      : mapToolState.mode === "camera"
        ? false
        : mapToolState.picks.length > 0;
  const canClear = mapToolState.mode === "boundary"
    ? activeArea.points.length > 0
    : mapToolState.mode === "road"
      ? mapToolState.roadAction === "remove"
        ? mapToolState.removedRoadSegments.length > 0
        : mapToolState.roadPoints.length > 0
      : mapToolState.mode === "camera"
        ? true
        : mapToolState.picks.length > 0;

  return {
    mode: mapToolState.mode,
    inputMode: getMapToolInputMode(),
    entranceMode: mapToolState.entranceMode,
    boundaryMode: mapToolState.boundaryMode,
    roadMode: mapToolState.roadMode,
    roadAction: mapToolState.roadAction,
    developerLabelsEnabled: showNormalLabels,
    boundaryLabelsEnabled: mapToolState.boundaryLabelsEnabled,
    boundaryAreas: output?.areas || [],
    activeArea: activeArea?.index || 1,
    boundaryTotalPoints,
    camera: mapToolState.mode === "camera"
      ? {
        gridEnabled: mapToolState.cameraGridEnabled,
        pitchDegrees: Number(formatEntranceNumber(mapToolState.cameraPitch)),
        height: Number(formatEntranceNumber(mapToolState.cameraHeight))
      }
      : null,
    canDelete,
    canClear,
    status: getMapToolStatusText(),
    output
  };
}

function postAdminMapToolState() {
  if (!isAdminMapToolPreview || window.parent === window) return;

  window.parent.postMessage(
    {
      source: "anu-explore-preview",
      type: "map-tool-state",
      payload: getMapToolPayload()
    },
    window.location.origin
  );
}

function updateMapToolPanel() {
  const isBoundaryMode = mapToolState.mode === "boundary";
  const isRoadMode = mapToolState.mode === "road";
  const isCameraMode = mapToolState.mode === "camera";
  const title = mapToolState.panel?.querySelector(".map-tool-panel__title");
  const entranceToggleButton = mapToolState.panel?.querySelector(".map-tool-panel__entrance-toggle");
  const toggleButton = mapToolState.panel?.querySelector(".map-tool-panel__mode-toggle");
  const roadToggleButton = mapToolState.panel?.querySelector(".map-tool-panel__road-toggle");
  const cameraToggleButton = mapToolState.panel?.querySelector(".map-tool-panel__camera-toggle");
  const hint = mapToolState.panel?.querySelector(".map-tool-panel__hint");
  const output = mapToolState.panel?.querySelector(".map-tool-panel__output");
  const status = mapToolState.panel?.querySelector(".entrance-tool-panel__status");
  const copyButton = mapToolState.panel?.querySelector(".map-tool-panel__copy");
  const deleteButton = mapToolState.panel?.querySelector(".map-tool-panel__delete");
  const clearButton = mapToolState.panel?.querySelector(".map-tool-panel__clear");
  const boundaryControls = mapToolState.panel?.querySelector(".map-tool-boundary-controls");
  const roadControls = mapToolState.panel?.querySelector(".map-tool-road-controls");
  const cameraControls = mapToolState.panel?.querySelector(".map-tool-camera-controls");
  const cameraGridInput = mapToolState.panel?.querySelector(".map-tool-camera-grid");
  const cameraPitchInput = mapToolState.panel?.querySelector(".map-tool-camera-pitch");
  const cameraHeightInput = mapToolState.panel?.querySelector(".map-tool-camera-height");
  const cameraPitchValue = mapToolState.panel?.querySelector(".map-tool-camera-pitch-value");
  const cameraHeightValue = mapToolState.panel?.querySelector(".map-tool-camera-height-value");
  const boundaryLabelButton = mapToolState.panel?.querySelector(".map-tool-boundary-label-toggle");
  const copyAllButton = mapToolState.panel?.querySelector(".map-tool-boundary-copy-all");
  const activeArea = getMapBoundaryActiveArea();
  const boundaryTotalPoints = getMapBoundaryTotalPoints();
  const roadItemCount = mapToolState.roadAction === "remove"
    ? mapToolState.removedRoadSegments.length
    : mapToolState.roadPoints.length;
  const roadOutputTotal = mapToolState.roadPoints.length + mapToolState.removedRoadSegments.length;
  const itemCount = isBoundaryMode
    ? activeArea.points.length
    : isRoadMode
      ? roadItemCount
      : isCameraMode
        ? 1
        : mapToolState.picks.length;

  if (title) {
    title.textContent = isBoundaryMode
      ? "圈地工具"
      : isRoadMode
        ? "道路工具"
        : isCameraMode
          ? "摄像机工具"
          : "入口工具";
  }
  if (entranceToggleButton) {
    const activeInputMode = isBoundaryMode
      ? mapToolState.boundaryMode
      : isRoadMode
        ? mapToolState.roadMode
        : mapToolState.entranceMode;
    entranceToggleButton.textContent = activeInputMode === "select"
      ? isBoundaryMode ? "圈地模式" : "选点模式"
      : "鼠标模式";
    entranceToggleButton.classList.toggle(
      "is-active",
      !isCameraMode && activeInputMode === "select"
    );
    entranceToggleButton.disabled = isCameraMode;
  }
  if (toggleButton) {
    toggleButton.textContent = isBoundaryMode ? "切回入口" : "切到圈地";
    toggleButton.classList.toggle("is-active", isBoundaryMode);
  }
  if (roadToggleButton) {
    roadToggleButton.textContent = isRoadMode ? "切回入口" : "切到道路";
    roadToggleButton.classList.toggle("is-active", isRoadMode);
  }
  if (cameraToggleButton) {
    cameraToggleButton.textContent = isCameraMode ? "切回入口" : "摄像机";
    cameraToggleButton.classList.toggle("is-active", isCameraMode);
  }
  if (hint) {
    hint.textContent = isBoundaryMode
      ? mapToolState.boundaryMode === "select"
        ? "圈地模式：俯视 2D，右键添加当前面积的边界点；右键靠近第 1 点闭合。最多保留 3 个面积。"
        : "圈地鼠标模式：可以拖动、缩放和查看地图，不会新增边界点；需要圈地时切到圈地模式。"
      : isRoadMode
        ? mapToolState.roadMode === "select"
          ? mapToolState.roadAction === "remove"
            ? "道路选点模式：点击现有道路段，把它加入待删除列表；不会直接修改道路文件。"
            : "道路选点模式：点击地图添加路线节点，节点之间会形成自定义导航道路；拖动地图不会记录。"
          : "道路鼠标模式：可以拖动、缩放和查看地图，不会新增或删除道路；需要操作道路时切到选点模式。"
        : isCameraMode
          ? "摄像机工具：黑色落点是当前地面焦点；俯仰角只改变看向位置，不移动相机；高度才改变相机高度。"
          : mapToolState.entranceMode === "select"
            ? "选点模式：点击地图记录入口坐标；拖动地图不会记录。蓝色入口标记仅用于参考，不触发连线。"
            : "鼠标模式：可以拖动、缩放和查看地图，不会记录入口点；需要标入口时切到选点模式。";
  }

  if (boundaryControls) {
    boundaryControls.hidden = !isBoundaryMode;
  }
  if (roadControls) {
    roadControls.hidden = !isRoadMode;
  }
  if (cameraControls) {
    cameraControls.hidden = !isCameraMode;
  }
  if (cameraGridInput) {
    cameraGridInput.checked = mapToolState.cameraGridEnabled;
  }
  if (cameraPitchInput) {
    cameraPitchInput.value = String(mapToolState.cameraPitch);
  }
  if (cameraHeightInput) {
    cameraHeightInput.value = String(mapToolState.cameraHeight);
  }
  if (cameraPitchValue) {
    cameraPitchValue.textContent = `${Math.round(mapToolState.cameraPitch)}°`;
  }
  if (cameraHeightValue) {
    cameraHeightValue.textContent = String(Math.round(mapToolState.cameraHeight));
  }

  if (output) {
    if (isBoundaryMode) {
      output.textContent = boundaryTotalPoints
        ? JSON.stringify(getMapBoundaryOutput(), null, 2)
        : "暂无圈地面积。";
    } else if (isRoadMode) {
      output.textContent = roadOutputTotal
        ? JSON.stringify(getMapRoadOutput(), null, 2)
        : "暂无道路调整。";
    } else if (isCameraMode) {
      output.textContent = JSON.stringify(getMapCameraOutput(), null, 2);
    } else {
      output.textContent = mapToolState.picks.length
        ? JSON.stringify(getMapToolOutput(), null, 2)
        : "暂无点位。";
    }
  }

  if (status) {
    if (isBoundaryMode) {
      const labelText = mapToolState.boundaryLabelsEnabled ? "编号开" : "编号关";
      status.textContent = activeArea.closed
        ? `${activeArea.label} 已闭合，${activeArea.points.length} 个边界点，${labelText}。`
        : `当前：${activeArea.label}，${activeArea.points.length} 个边界点，${labelText}。`;
    } else if (isRoadMode) {
      const roadModeText = mapToolState.roadMode === "select" ? "选点模式" : "鼠标模式";
      status.textContent = mapToolState.roadAction === "remove"
        ? `${roadModeText}，待删除道路段 ${mapToolState.removedRoadSegments.length} 个；新增道路点 ${mapToolState.roadPoints.length} 个。`
        : mapToolState.roadPoints.length >= MAP_ROAD_MAX_POINTS
          ? `${roadModeText}，已记录 ${MAP_ROAD_MAX_POINTS} 个道路点，已达到上限。`
          : `${roadModeText}，新增道路点 ${mapToolState.roadPoints.length} 个；待删除道路段 ${mapToolState.removedRoadSegments.length} 个。`;
    } else if (isCameraMode) {
      status.textContent = `视角模式，高度 ${Math.round(mapToolState.cameraHeight)}，俯仰 ${Math.round(mapToolState.cameraPitch)}°，网格${mapToolState.cameraGridEnabled ? "开" : "关"}。`;
    } else if (!mapToolState.picks.length) {
      status.textContent = mapToolState.entranceMode === "select"
        ? `选点模式，0 个点位，最多 ${MAP_TOOL_MAX_POINTS} 个。`
        : `鼠标模式，0 个点位；当前不会记录入口。`;
    } else if (mapToolState.picks.length >= MAP_TOOL_MAX_POINTS) {
      status.textContent = `已记录 ${MAP_TOOL_MAX_POINTS} 个点位，已达到上限。`;
    } else {
      const modeText = mapToolState.entranceMode === "select" ? "选点模式" : "鼠标模式";
      status.textContent = `${modeText}，已记录 ${mapToolState.picks.length} 个点位，最后一个：点位 ${mapToolState.picks.length}。`;
    }
  }

  if (copyButton) {
    copyButton.disabled = isCameraMode ? false : isRoadMode ? roadOutputTotal === 0 : itemCount === 0;
    copyButton.textContent = isBoundaryMode
      ? "复制当前"
      : isRoadMode
        ? "复制道路"
        : isCameraMode
          ? "复制视角"
          : "复制 JSON";
  }

  if (deleteButton) {
    deleteButton.disabled = isCameraMode || itemCount === 0;
    deleteButton.textContent = isBoundaryMode
      ? "删除上一点"
      : isRoadMode
        ? mapToolState.roadAction === "remove" ? "撤销删段" : "删除节点"
        : isCameraMode
          ? "无删除项"
          : "删除上一个";
  }

  if (clearButton) {
    clearButton.disabled = isCameraMode ? false : itemCount === 0;
    clearButton.textContent = isBoundaryMode
      ? "清空当前"
      : isRoadMode
        ? mapToolState.roadAction === "remove" ? "清空删段" : "清空路线"
        : isCameraMode
          ? "重置视角"
          : "清空";
  }

  if (copyAllButton) {
    copyAllButton.disabled = boundaryTotalPoints === 0;
  }

  if (boundaryLabelButton) {
    boundaryLabelButton.textContent = mapToolState.boundaryLabelsEnabled
      ? "建筑编号：开"
      : "建筑编号：关";
    boundaryLabelButton.classList.toggle("is-active", mapToolState.boundaryLabelsEnabled);
  }

  boundaryToolState.areas.forEach((area, index) => {
    const row = mapToolState.panel
      ? mapToolState.panel.querySelector(`[data-boundary-row="${index}"]`)
      : null;
    const selectButton = mapToolState.panel
      ? mapToolState.panel.querySelector(`[data-boundary-select="${index}"]`)
      : null;
    const copyAreaButton = mapToolState.panel
      ? mapToolState.panel.querySelector(`[data-boundary-copy="${index}"]`)
      : null;
    const deleteAreaButton = mapToolState.panel
      ? mapToolState.panel.querySelector(`[data-boundary-delete="${index}"]`)
      : null;
    const hasPoints = area.points.length > 0;

    if (row) {
      row.classList.toggle("is-active", index === boundaryToolState.activeAreaIndex);
      row.classList.toggle("is-closed", area.closed);
      row.style.setProperty("--boundary-area-color", getMapBoundaryAreaColor(index));
    }

    if (selectButton) {
      selectButton.textContent = area.closed
        ? `${area.label} 已闭合`
        : `${area.label} (${area.points.length})`;
    }
    if (copyAreaButton) copyAreaButton.disabled = !hasPoints;
    if (deleteAreaButton) deleteAreaButton.disabled = !hasPoints;
  });

  mapToolState.panel?.querySelectorAll("[data-road-action]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.roadAction === mapToolState.roadAction);
  });

  postAdminMapToolState();
}

async function copyMapToolOutputToClipboard(output, successText) {
  if (!output || (!output.totalPoints && output.tool !== "camera-view")) return;

  const status = mapToolState.panel?.querySelector(".entrance-tool-panel__status");

  try {
    await copyTextToClipboard(JSON.stringify(output, null, 2));
    if (status) status.textContent = successText || "已复制 JSON。";
  } catch (error) {
    console.warn("Map tool clipboard copy failed:", error);
    if (status) status.textContent = "复制被浏览器拦截，请手动选中上方 JSON。";
  }
}

async function copyMapToolPointsToClipboard() {
  if (mapToolState.mode === "boundary") {
    await copyMapBoundaryAreaToClipboard(boundaryToolState.activeAreaIndex);
    return;
  }

  if (mapToolState.mode === "camera") {
    await copyMapToolOutputToClipboard(getMapCameraOutput(), "已复制摄像机视角。");
    return;
  }

  await copyMapToolOutputToClipboard(getCurrentMapToolOutput(), "已复制 JSON。");
}

async function copyMapBoundaryAreaToClipboard(areaIndex) {
  const area = boundaryToolState.areas[areaIndex];
  if (!area || !area.points.length) return;

  await copyMapToolOutputToClipboard(
    {
      tool: "boundary-area",
      mode: "top-down-2d",
      totalPoints: area.points.length,
      area: getMapBoundaryAreaOutput(area)
    },
    `已复制${area.label}。`
  );
}

async function copyMapBoundaryAllToClipboard() {
  const output = getMapBoundaryOutput();
  if (!output.totalPoints) return;

  await copyMapToolOutputToClipboard(output, "已一起复制所有面积。");
}

function disposeMapToolMarkerObject(object) {
  object.traverse((child) => {
    if (child.geometry) child.geometry.dispose();

    const materials = Array.isArray(child.material)
      ? child.material
      : child.material
        ? [child.material]
        : [];

    for (const material of materials) {
      if (material.map) material.map.dispose();
      material.dispose();
    }
  });
}

function clearMapToolMarkers() {
  for (const child of [...mapToolMarkerGroup.children]) {
    mapToolMarkerGroup.remove(child);
    disposeMapToolMarkerObject(child);
  }
}

function createMapToolLabelSprite(index) {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  const label = String(index);

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.beginPath();
  ctx.arc(64, 64, 45, 0, Math.PI * 2);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.lineWidth = 10;
  ctx.strokeStyle = "#f97316";
  ctx.stroke();
  ctx.fillStyle = "#111827";
  ctx.font = "800 52px system-ui, -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, 64, 66);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false,
      depthWrite: false
    })
  );
  sprite.name = "map-tool-point-label";
  sprite.position.y = 22;
  sprite.scale.set(24, 24, 1);
  sprite.renderOrder = 90;
  return sprite;
}

function createMapToolPointMarker(pick, index) {
  if (!pick?.groundScene) return null;

  const marker = new THREE.Group();
  marker.name = `map-tool-point-${index}`;
  marker.position.set(Number(pick.groundScene[0]), 0, Number(pick.groundScene[2]));

  const dot = new THREE.Mesh(
    new THREE.SphereGeometry(4.8, 18, 18),
    new THREE.MeshBasicMaterial({
      color: "#f97316",
      transparent: true,
      opacity: 0.95,
      depthWrite: false
    })
  );
  dot.name = "map-tool-point-dot";
  dot.position.y = 5.2;

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(9.2, 0.8, 12, 56),
    new THREE.MeshBasicMaterial({
      color: "#fb923c",
      transparent: true,
      opacity: 0.78,
      depthWrite: false
    })
  );
  ring.name = "map-tool-point-ring";
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.85;

  marker.add(dot, ring, createMapToolLabelSprite(index));
  mapToolMarkerGroup.add(marker);
  return marker;
}

function redrawMapToolMarkers() {
  clearMapToolMarkers();
  mapToolState.picks.forEach((pick, index) => {
    createMapToolPointMarker(pick, index + 1);
  });
}

function clearMapRoadToolVisuals() {
  for (const child of [...mapToolRoadGroup.children]) {
    mapToolRoadGroup.remove(child);
    disposeObject3D(child);
  }
}

function createMapRoadPointMarker(point, index) {
  if (!point?.groundScene) return null;

  const marker = new THREE.Group();
  marker.name = `map-tool-road-point-${index}`;
  marker.position.set(Number(point.groundScene[0]), 0, Number(point.groundScene[2]));

  const dot = new THREE.Mesh(
    new THREE.SphereGeometry(4.2, 18, 18),
    new THREE.MeshBasicMaterial({
      color: "#f59e0b",
      transparent: true,
      opacity: 0.96,
      depthWrite: false
    })
  );
  dot.position.y = 5.6;

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(8.6, 0.72, 12, 56),
    new THREE.MeshBasicMaterial({
      color: "#fbbf24",
      transparent: true,
      opacity: 0.78,
      depthWrite: false
    })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.95;

  marker.add(dot, ring, createMapToolLabelSprite(index));
  mapToolRoadGroup.add(marker);
  return marker;
}

function createMapRoadSegmentLine(from, to, color, radius = 1.85) {
  const start = new THREE.Vector3(from[0], 2.4, from[2]);
  const end = new THREE.Vector3(to[0], 2.4, to[2]);
  const material = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0.88,
    depthWrite: false
  });
  const line = createRouteCylinder(start, end, material);
  if (!line) {
    material.dispose();
    return null;
  }

  line.scale.x = radius / 1.7;
  line.scale.z = radius / 1.7;
  line.renderOrder = 82;
  mapToolRoadGroup.add(line);
  return line;
}

function redrawMapRoadTool() {
  clearMapRoadToolVisuals();

  mapToolState.roadPoints.forEach((point, index) => {
    createMapRoadPointMarker(point, index + 1);
    if (index > 0) {
      createMapRoadSegmentLine(
        mapToolState.roadPoints[index - 1].groundScene,
        point.groundScene,
        "#f59e0b",
        2
      );
    }
  });

  mapToolState.removedRoadSegments.forEach((segment) => {
    createMapRoadSegmentLine(
      [
        Number(formatEntranceNumber(segment.start.scene.x)),
        0,
        Number(formatEntranceNumber(segment.start.scene.z))
      ],
      [
        Number(formatEntranceNumber(segment.end.scene.x)),
        0,
        Number(formatEntranceNumber(segment.end.scene.z))
      ],
      "#ef4444",
      2.4
    );
  });

  updateMapToolPanel();
}

function setMapRoadAction(action) {
  const nextAction = action === "remove" ? "remove" : "add";
  if (mapToolState.roadAction === nextAction) return;

  mapToolState.roadAction = nextAction;
  mapToolState.roadPointerStart = null;
  updateMapToolPanel();
}

function toggleMapToolInputMode() {
  if (!mapToolState.active) return;

  if (mapToolState.mode === "boundary") {
    toggleMapBoundaryInputMode();
    return;
  }

  if (mapToolState.mode === "road") {
    toggleMapRoadInputMode();
    return;
  }

  toggleMapEntranceInputMode();
}

function toggleMapEntranceInputMode() {
  if (mapToolState.mode !== "entrance") return;

  mapToolState.entranceMode = mapToolState.entranceMode === "select" ? "mouse" : "select";
  mapToolState.pointerStart = null;
  refreshMapToolMarker();
  updateMapToolPanel();
}

function toggleMapBoundaryInputMode() {
  if (mapToolState.mode !== "boundary") return;

  mapToolState.boundaryMode = mapToolState.boundaryMode === "select" ? "mouse" : "select";
  mapToolState.boundaryPointerStart = null;
  updateMapToolPanel();
}

function toggleMapRoadInputMode() {
  if (mapToolState.mode !== "road") return;

  mapToolState.roadMode = mapToolState.roadMode === "select" ? "mouse" : "select";
  mapToolState.roadPointerStart = null;
  updateMapToolPanel();
}

function findNearestMapRoadSegment(scenePoint) {
  if (!scenePoint) return null;

  const roadSegments = getRoadSegmentsForMapTool();
  if (!roadSegments.length) return null;

  let best = null;
  for (const segment of roadSegments) {
    const closest = getClosestPointOnSegment(scenePoint, segment.start.scene, segment.end.scene);
    if (!best || closest.distance < best.distance) {
      best = {
        segment,
        distance: closest.distance,
        scenePoint: closest.point
      };
    }
  }

  return best;
}

function pickMapRoadPointAtClientPoint(clientX, clientY) {
  if (!mapToolState.active || !mapToolState.bounds) return null;

  const rect = renderer.domElement.getBoundingClientRect();
  const pointer = new THREE.Vector2(
    ((clientX - rect.left) / Math.max(rect.width, 1)) * 2 - 1,
    -(((clientY - rect.top) / Math.max(rect.height, 1)) * 2 - 1)
  );
  let scenePoint = null;
  let hitScenePoint = null;

  raycaster.setFromCamera(pointer, activeCamera);

  const buildingMeshes = buildingObjects
    .map((building) => (currentMode === "2d" ? building.mesh2D : building.mesh3D))
    .filter(Boolean);
  const buildingHits = raycaster.intersectObjects(buildingMeshes, false);

  if (buildingHits.length) {
    hitScenePoint = buildingHits[0].point.clone();
    scenePoint = new THREE.Vector3(buildingHits[0].point.x, 0, buildingHits[0].point.z);
  } else {
    scenePoint = new THREE.Vector3();
    if (!raycaster.ray.intersectPlane(groundPlane, scenePoint)) return null;
    hitScenePoint = scenePoint.clone();
  }

  const sourcePoint = sceneToSourcePoint(scenePoint);
  if (!sourcePoint) return null;

  const snap = findNearestRoadSnap(scenePoint);
  const nextIndex = mapToolState.roadPoints.length + 1;

  return {
    id: `road_point_${String(nextIndex).padStart(2, "0")}`,
    index: nextIndex,
    label: `道路点 ${nextIndex}`,
    source: [
      Number(formatEntranceNumber(sourcePoint.x)),
      Number(formatEntranceNumber(sourcePoint.y))
    ],
    scene: [
      Number(formatEntranceNumber(hitScenePoint.x)),
      Number(formatEntranceNumber(hitScenePoint.y)),
      Number(formatEntranceNumber(hitScenePoint.z))
    ],
    groundScene: [
      Number(formatEntranceNumber(scenePoint.x)),
      Number(formatEntranceNumber(scenePoint.y)),
      Number(formatEntranceNumber(scenePoint.z))
    ],
    snap: snap
      ? [
        Number(formatEntranceNumber(snap.sourcePoint.x)),
        Number(formatEntranceNumber(snap.sourcePoint.y))
      ]
      : null,
    snapRoadType: snap?.type || null,
    snapDistanceMeters: snap ? Number(formatEntranceNumber(snap.distance)) : null
  };
}

function pickMapRoadSegmentAtClientPoint(clientX, clientY) {
  if (!mapToolState.active || !mapToolState.bounds) return null;

  const rect = renderer.domElement.getBoundingClientRect();
  const pointer = new THREE.Vector2(
    ((clientX - rect.left) / Math.max(rect.width, 1)) * 2 - 1,
    -(((clientY - rect.top) / Math.max(rect.height, 1)) * 2 - 1)
  );
  const scenePoint = new THREE.Vector3();

  raycaster.setFromCamera(pointer, activeCamera);
  if (!raycaster.ray.intersectPlane(groundPlane, scenePoint)) return null;

  const nearest = findNearestMapRoadSegment(scenePoint);
  if (!nearest || nearest.distance > 18) return null;

  return nearest.segment;
}

function setActiveMapBoundaryArea(areaIndex) {
  const nextIndex = Number(areaIndex);
  if (!Number.isInteger(nextIndex) || !boundaryToolState.areas[nextIndex]) return;

  boundaryToolState.activeAreaIndex = nextIndex;
  mapToolState.boundaryPointerStart = null;
  redrawMapBoundaryTool();
}

function resetMapBoundaryArea(areaIndex) {
  const area = boundaryToolState.areas[areaIndex];
  if (!area) return;

  area.points = [];
  area.closed = false;
}

function deleteMapBoundaryArea(areaIndex) {
  const area = boundaryToolState.areas[areaIndex];
  if (!area || !area.points.length) return;

  resetMapBoundaryArea(areaIndex);
  boundaryToolState.activeAreaIndex = areaIndex;
  redrawMapBoundaryTool();
}

function getNextEmptyMapBoundaryAreaIndex() {
  return boundaryToolState.areas.findIndex((area) => !area.points.length);
}

function redrawMapBoundaryTool() {
  clearBoundaryToolVisuals();

  boundaryToolState.areas.forEach((area, areaIndex) => {
    area.points.forEach((point, pointIndex) => {
      createBoundaryMarker(point, pointIndex, areaIndex);
    });
    createBoundaryLine(area.points, area.closed, areaIndex);
    createBoundaryFill(area.points, {
      closed: area.closed,
      areaIndex
    });
    createBoundaryAreaLabel(area, areaIndex);
  });

  updateMapToolPanel();
}

function isMapToolBoundaryMode() {
  return mapToolState.active && mapToolState.mode === "boundary";
}

function isMapToolBoundaryLabelMode() {
  return isMapToolBoundaryMode() && mapToolState.boundaryLabelsEnabled;
}

function toggleMapBoundaryLabels() {
  if (!isMapToolBoundaryMode()) return;

  mapToolState.boundaryLabelsEnabled = !mapToolState.boundaryLabelsEnabled;
  labelsDirty = true;
  setNumbersButtonState();
  updateMapToolPanel();
  updateLabels(true);
}

function isMapToolRoadMode() {
  return mapToolState.active && mapToolState.mode === "road";
}

function isMapToolCameraMode() {
  return mapToolState.active && mapToolState.mode === "camera";
}

function isMapToolTopDownMode(mode) {
  return mode === "boundary" || mode === "road";
}

function syncMapToolMode() {
  const isBoundaryMode = isMapToolBoundaryMode();
  const isRoadMode = isMapToolRoadMode();
  const isCameraMode = isMapToolCameraMode();
  document.body.classList.toggle("is-map-boundary-mode", isBoundaryMode);
  document.body.classList.toggle("is-map-road-mode", isRoadMode);
  document.body.classList.toggle("is-map-camera-mode", isCameraMode);
  mapToolMarkerGroup.visible = !isBoundaryMode && !isRoadMode && !isCameraMode;
  mapToolRoadGroup.visible = isRoadMode;
  boundaryToolGroup.visible = isBoundaryMode;
  boundaryToolShapeGroup.visible = isBoundaryMode;
  syncMapCameraGrid();

  if (isBoundaryMode || isRoadMode) {
    setNumbersButtonState();

    if (currentMode !== "2d") {
      apply2DView();
    }
    applyBoundaryOverviewView();
    updateEntranceToolMarker(null, null);
    if (isBoundaryMode) {
      redrawMapBoundaryTool();
    } else {
      redrawMapRoadTool();
    }
  } else if (isCameraMode) {
    setNumbersButtonState();
    clearMapRoadToolVisuals();
    updateEntranceToolMarker(null, null);
    applyMapCameraToolView();
  } else {
    setNumbersButtonState();
    clearMapRoadToolVisuals();
    redrawMapToolMarkers();
  }

  labelsDirty = true;
  updateMapToolPanel();
}

function setMapToolMode(mode) {
  const nextMode = mode === "boundary" || mode === "road" || mode === "camera" ? mode : "entrance";
  if (mapToolState.mode === nextMode) return;

  const wasTopDownMode = isMapToolTopDownMode(mapToolState.mode);
  mapToolState.mode = nextMode;
  mapToolState.pointerStart = null;
  mapToolState.roadPointerStart = null;
  mapToolState.boundaryPointerStart = null;
  if (nextMode === "entrance") {
    mapToolState.entranceMode = "mouse";
  }
  if (nextMode === "boundary" && isAdminMapToolPreview) {
    mapToolState.boundaryMode = "mouse";
  }
  if (nextMode === "road") {
    mapToolState.roadMode = "mouse";
  }

  if (isMapToolTopDownMode(nextMode) && !wasTopDownMode) {
    mapToolState.previousMapViewMode = currentMode;
  } else if (!isMapToolTopDownMode(nextMode) && wasTopDownMode && mapToolState.previousMapViewMode === "3d") {
    apply3DView();
    mapToolState.previousMapViewMode = null;
  } else if (!isMapToolTopDownMode(nextMode)) {
    mapToolState.previousMapViewMode = null;
  }
  syncMapToolMode();
}

function refreshMapToolMarker() {
  const lastPick = mapToolState.picks[mapToolState.picks.length - 1];

  if (!lastPick?.groundScene) {
    updateEntranceToolMarker(null, null);
    return;
  }

  const scenePoint = new THREE.Vector3(
    Number(lastPick.groundScene[0]),
    0,
    Number(lastPick.groundScene[2])
  );
  const snapScenePoint = Array.isArray(lastPick.snap)
    ? sourceToScenePoint(lastPick.snap[0], lastPick.snap[1])
    : null;

  updateEntranceToolMarker(
    scenePoint,
    snapScenePoint ? { scenePoint: snapScenePoint } : null
  );
}

function deleteLastMapToolPoint() {
  if (mapToolState.mode === "boundary") {
    const activeArea = getMapBoundaryActiveArea();
    if (!activeArea.points.length) return;

    activeArea.closed = false;
    activeArea.points.pop();
    redrawMapBoundaryTool();
    return;
  }

  if (mapToolState.mode === "road") {
    if (mapToolState.roadAction === "remove") {
      if (!mapToolState.removedRoadSegments.length) return;
      mapToolState.removedRoadSegments.pop();
    } else {
      if (!mapToolState.roadPoints.length) return;
      mapToolState.roadPoints.pop();
    }
    redrawMapRoadTool();
    return;
  }

  if (!mapToolState.picks.length) return;

  mapToolState.picks.pop();
  redrawMapToolMarkers();
  refreshMapToolMarker();
  updateMapToolPanel();
}

function clearMapToolPoints() {
  if (mapToolState.mode === "camera") {
    resetMapCameraTool();
    return;
  }

  if (mapToolState.mode === "boundary") {
    const activeArea = getMapBoundaryActiveArea();
    if (!activeArea.points.length) return;

    resetMapBoundaryArea(boundaryToolState.activeAreaIndex);
    redrawMapBoundaryTool();
    return;
  }

  if (mapToolState.mode === "road") {
    if (mapToolState.roadAction === "remove") {
      if (!mapToolState.removedRoadSegments.length) return;
      mapToolState.removedRoadSegments = [];
    } else {
      if (!mapToolState.roadPoints.length) return;
      mapToolState.roadPoints = [];
    }
    redrawMapRoadTool();
    return;
  }

  if (!mapToolState.picks.length) return;

  mapToolState.picks = [];
  redrawMapToolMarkers();
  refreshMapToolMarker();
  updateMapToolPanel();
}

function pickMapToolPointAtClientPoint(clientX, clientY) {
  if (!mapToolState.active || !mapToolState.bounds) return null;

  const rect = renderer.domElement.getBoundingClientRect();
  const pointer = new THREE.Vector2(
    ((clientX - rect.left) / Math.max(rect.width, 1)) * 2 - 1,
    -(((clientY - rect.top) / Math.max(rect.height, 1)) * 2 - 1)
  );
  let scenePoint = null;
  let hitScenePoint = null;

  raycaster.setFromCamera(pointer, activeCamera);

  const buildingMeshes = buildingObjects
    .map((building) => (currentMode === "2d" ? building.mesh2D : building.mesh3D))
    .filter(Boolean);
  const buildingHits = raycaster.intersectObjects(buildingMeshes, false);

  if (buildingHits.length) {
    hitScenePoint = buildingHits[0].point.clone();
    scenePoint = new THREE.Vector3(buildingHits[0].point.x, 0, buildingHits[0].point.z);
  } else {
    scenePoint = new THREE.Vector3();
    if (!raycaster.ray.intersectPlane(groundPlane, scenePoint)) return null;
    hitScenePoint = scenePoint.clone();
  }

  const sourcePoint = sceneToSourcePoint(scenePoint);
  if (!sourcePoint) return null;

  const snap = findNearestRoadSnap(scenePoint);
  const nextIndex = mapToolState.picks.length + 1;

  return {
    id: `point_${String(nextIndex).padStart(2, "0")}`,
    index: nextIndex,
    label: `点位 ${nextIndex}`,
    source: [
      Number(formatEntranceNumber(sourcePoint.x)),
      Number(formatEntranceNumber(sourcePoint.y))
    ],
    scene: [
      Number(formatEntranceNumber(hitScenePoint.x)),
      Number(formatEntranceNumber(hitScenePoint.y)),
      Number(formatEntranceNumber(hitScenePoint.z))
    ],
    groundScene: [
      Number(formatEntranceNumber(scenePoint.x)),
      Number(formatEntranceNumber(scenePoint.y)),
      Number(formatEntranceNumber(scenePoint.z))
    ],
    snap: snap
      ? [
        Number(formatEntranceNumber(snap.sourcePoint.x)),
        Number(formatEntranceNumber(snap.sourcePoint.y))
      ]
      : null,
    snapRoadType: snap?.type || null,
    snapDistanceMeters: snap ? Number(formatEntranceNumber(snap.distance)) : null,
    _scenePoint: scenePoint,
    _snap: snap
  };
}

function pickMapBoundaryPointAtClientPoint(clientX, clientY) {
  if (!mapToolState.active || !boundaryToolState.bounds) return null;

  const rect = renderer.domElement.getBoundingClientRect();
  const pointer = new THREE.Vector2(
    ((clientX - rect.left) / Math.max(rect.width, 1)) * 2 - 1,
    -(((clientY - rect.top) / Math.max(rect.height, 1)) * 2 - 1)
  );

  raycaster.setFromCamera(pointer, activeCamera);
  const point = new THREE.Vector3();
  if (!raycaster.ray.intersectPlane(groundPlane, point)) return null;

  return new THREE.Vector3(point.x, 0, point.z);
}

function addMapBoundaryPoint(point, event) {
  const activeArea = getMapBoundaryActiveArea();
  if (!activeArea || !point) return;

  if (activeArea.closed) {
    const nextIndex = getNextEmptyMapBoundaryAreaIndex();
    const status = mapToolState.panel?.querySelector(".entrance-tool-panel__status");
    if (nextIndex >= 0) {
      boundaryToolState.activeAreaIndex = nextIndex;
      redrawMapBoundaryTool();
      if (status) status.textContent = `${activeArea.label} 已闭合，已切到面积 ${nextIndex + 1}。`;
    } else if (status) {
      status.textContent = "3 个面积都已有数据，请先删除某个面积再继续圈地。";
    }
    return;
  }

  const firstPoint = activeArea.points[0];
  const canClose = activeArea.points.length >= 3 && firstPoint;
  const closeDistance = canClose
    ? getBoundaryPointScreenDistance(firstPoint, event.clientX, event.clientY)
    : Infinity;

  if (closeDistance <= 18) {
    activeArea.closed = true;
    const nextIndex = getNextEmptyMapBoundaryAreaIndex();
    if (nextIndex >= 0) {
      boundaryToolState.activeAreaIndex = nextIndex;
    }
    redrawMapBoundaryTool();
    return;
  }

  activeArea.points.push(point);
  redrawMapBoundaryTool();
}

function bindMapToolEvents() {
  if (!mapToolState.active) return;

  function isMapToolPointerOnMap(event) {
    if (event.target?.closest?.(".map-tool-panel, .explore-map-toolbar, .explore-map-legend, #site-nav-root")) {
      return false;
    }

    const rect = renderer.domElement.getBoundingClientRect();
    return (
      event.clientX >= rect.left &&
      event.clientX <= rect.right &&
      event.clientY >= rect.top &&
      event.clientY <= rect.bottom
    );
  }

  function shouldHandleEntrancePointerEvent(event) {
    return (
      mapToolState.mode === "entrance" &&
      mapToolState.entranceMode === "select" &&
      event.button !== 2 &&
      isMapToolPointerOnMap(event)
    );
  }

  function shouldHandleBoundaryPointerEvent(event) {
    return (
      mapToolState.mode === "boundary" &&
      mapToolState.boundaryMode === "select" &&
      event.button === 2 &&
      isMapToolPointerOnMap(event)
    );
  }

  function shouldHandleRoadPointerEvent(event) {
    return (
      mapToolState.mode === "road" &&
      mapToolState.roadMode === "select" &&
      event.button !== 2 &&
      isMapToolPointerOnMap(event)
    );
  }

  function addMapToolPointFromClientPoint(clientX, clientY) {
    if (mapToolState.mode !== "entrance" || mapToolState.entranceMode !== "select") return false;

    const entranceHit = findEntranceNavigationHitData(clientX, clientY);
    if (entranceHit?.entranceId) {
      showEntranceIndexNotice(entranceHit.entranceId);
      return false;
    }

    if (mapToolState.picks.length >= MAP_TOOL_MAX_POINTS) {
      const status = mapToolState.panel?.querySelector(".entrance-tool-panel__status");
      if (status) status.textContent = `最多只能记录 ${MAP_TOOL_MAX_POINTS} 个点位，请先删除或清空。`;
      return false;
    }

    const pick = pickMapToolPointAtClientPoint(clientX, clientY);
    if (!pick) {
      const status = mapToolState.panel?.querySelector(".entrance-tool-panel__status");
      if (status) status.textContent = "这次点击没有取到地图点，请点击可见建筑、道路或地面。";
      return false;
    }

    mapToolState.picks.push({
      id: pick.id,
      index: pick.index,
      label: pick.label,
      source: pick.source,
      scene: pick.scene,
      groundScene: pick.groundScene,
      snap: pick.snap,
      snapRoadType: pick.snapRoadType,
      snapDistanceMeters: pick.snapDistanceMeters
    });

    mapToolState.lastPickedAt = performance.now();
    redrawMapToolMarkers();
    updateEntranceToolMarker(pick._scenePoint, pick._snap);
    updateMapToolPanel();
    return true;
  }

  function addMapRoadEditFromClientPoint(clientX, clientY) {
    if (mapToolState.mode !== "road" || mapToolState.roadMode !== "select") return false;

    const status = mapToolState.panel?.querySelector(".entrance-tool-panel__status");

    if (mapToolState.roadAction === "remove") {
      const segment = pickMapRoadSegmentAtClientPoint(clientX, clientY);
      if (!segment) {
        if (status) status.textContent = "没有选中道路段，请靠近道路线点击。";
        return false;
      }

      const segmentId = segment.id || `${segment.featureId}:${segment.segmentIndex}`;
      const existingIndex = mapToolState.removedRoadSegments.findIndex((item) => {
        const itemId = item.id || `${item.featureId}:${item.segmentIndex}`;
        return itemId === segmentId;
      });

      if (existingIndex >= 0) {
        mapToolState.removedRoadSegments.splice(existingIndex, 1);
        if (status) status.textContent = "已取消该道路段的删除标记。";
      } else {
        mapToolState.removedRoadSegments.push(segment);
        if (status) status.textContent = `已标记删除道路段 ${mapToolState.removedRoadSegments.length}。`;
      }

      mapToolState.lastPickedAt = performance.now();
      redrawMapRoadTool();
      return true;
    }

    if (mapToolState.roadPoints.length >= MAP_ROAD_MAX_POINTS) {
      if (status) status.textContent = `最多只能记录 ${MAP_ROAD_MAX_POINTS} 个道路点，请先删除或清空。`;
      return false;
    }

    const point = pickMapRoadPointAtClientPoint(clientX, clientY);
    if (!point) {
      if (status) status.textContent = "这次点击没有取到道路点，请点击可见建筑、道路或地面。";
      return false;
    }

    mapToolState.roadPoints.push(point);
    mapToolState.lastPickedAt = performance.now();
    redrawMapRoadTool();
    return true;
  }

  document.addEventListener("contextmenu", (event) => {
    if (
      mapToolState.mode !== "boundary" ||
      mapToolState.boundaryMode !== "select" ||
      !isMapToolPointerOnMap(event)
    ) return;

    event.preventDefault();
    event.stopPropagation();
  }, true);

  document.addEventListener("pointerdown", (event) => {
    if (shouldHandleBoundaryPointerEvent(event)) {
      mapToolState.boundaryPointerStart = {
        x: event.clientX,
        y: event.clientY
      };
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    if (shouldHandleRoadPointerEvent(event)) {
      mapToolState.roadPointerStart = {
        x: event.clientX,
        y: event.clientY
      };
      return;
    }

    if (shouldHandleEntrancePointerEvent(event)) {
      mapToolState.pointerStart = {
        x: event.clientX,
        y: event.clientY
      };
    }
  }, true);

  document.addEventListener("pointerup", (event) => {
    if (shouldHandleBoundaryPointerEvent(event)) {
      const start = mapToolState.boundaryPointerStart;
      mapToolState.boundaryPointerStart = null;
      event.preventDefault();
      event.stopPropagation();
      if (!start) return;

      const moved = Math.hypot(event.clientX - start.x, event.clientY - start.y);
      if (moved > 8) return;

      const point = pickMapBoundaryPointAtClientPoint(event.clientX, event.clientY);
      addMapBoundaryPoint(point, event);
      return;
    }

    if (shouldHandleRoadPointerEvent(event)) {
      const start = mapToolState.roadPointerStart;
      mapToolState.roadPointerStart = null;
      if (!start) return;

      const moved = Math.hypot(event.clientX - start.x, event.clientY - start.y);
      if (moved > 6) return;

      addMapRoadEditFromClientPoint(event.clientX, event.clientY);
      return;
    }

    if (!shouldHandleEntrancePointerEvent(event)) return;

    const start = mapToolState.pointerStart;
    mapToolState.pointerStart = null;
    if (!start) return;

    const moved = Math.hypot(event.clientX - start.x, event.clientY - start.y);
    if (moved > 6) return;

    addMapToolPointFromClientPoint(event.clientX, event.clientY);
  }, true);

  document.addEventListener("click", (event) => {
    if (shouldHandleRoadPointerEvent(event)) {
      if (performance.now() - mapToolState.lastPickedAt < 250) return;
      addMapRoadEditFromClientPoint(event.clientX, event.clientY);
      return;
    }

    if (!shouldHandleEntrancePointerEvent(event)) return;
    if (performance.now() - mapToolState.lastPickedAt < 250) return;
    addMapToolPointFromClientPoint(event.clientX, event.clientY);
  }, true);
}

/* =========================================================
   DORM ENTRANCE ROUTING
   ========================================================= */

function getRoadNodeKey(source) {
  return `${formatEntranceNumber(source.x)},${formatEntranceNumber(source.y)}`;
}

function ensureRoadGraphNode(graph, point) {
  const key = getRoadNodeKey(point.source);

  if (!graph.has(key)) {
    graph.set(key, {
      key,
      source: point.source,
      scene: point.scene.clone(),
      edges: []
    });
  }

  return key;
}

function connectRoadGraphNodes(graph, fromKey, toKey, weight) {
  const from = graph.get(fromKey);
  const to = graph.get(toKey);

  if (!from || !to || !Number.isFinite(weight) || weight <= 0) return;

  from.edges.push({ to: toKey, weight });
  to.edges.push({ to: fromKey, weight });
}

function buildEntranceRouteGraph(segments) {
  const graph = new Map();

  for (const segment of segments) {
    const startKey = ensureRoadGraphNode(graph, segment.start);
    const endKey = ensureRoadGraphNode(graph, segment.end);
    const distance = segment.start.scene.distanceTo(segment.end.scene);
    connectRoadGraphNodes(graph, startKey, endKey, distance);
  }

  return graph;
}

function cloneEntranceRouteGraph(baseGraph) {
  const graph = new Map();

  for (const [key, node] of baseGraph || []) {
    graph.set(key, {
      key,
      source: node.source,
      scene: node.scene.clone(),
      edges: node.edges.map((edge) => ({ ...edge }))
    });
  }

  return graph;
}

function findNearestNavigationSegment(scenePoint) {
  if (!scenePoint || !entranceNavigationState.roadSegments.length) return null;

  let best = null;

  for (const segment of entranceNavigationState.roadSegments) {
    const closest = getClosestPointOnSegment(scenePoint, segment.start.scene, segment.end.scene);

    if (!best || closest.distance < best.distance) {
      best = {
        segment,
        distance: closest.distance
      };
    }
  }

  return best;
}

function addVirtualEntranceNode(graph, entranceId, entranceData) {
  const entranceScene = sourceToScenePoint(
    entranceData.entrance?.[0],
    entranceData.entrance?.[1]
  );
  const snapScene = sourceToScenePoint(
    entranceData.snap?.[0],
    entranceData.snap?.[1]
  );

  if (!entranceScene || !snapScene) return null;

  const nearest = findNearestNavigationSegment(snapScene);
  if (!nearest) return null;

  const key = `entrance:${entranceId}`;
  graph.set(key, {
    key,
    source: {
      x: Number(entranceData.snap[0]),
      y: Number(entranceData.snap[1])
    },
    scene: snapScene.clone(),
    edges: []
  });

  const startKey = getRoadNodeKey(nearest.segment.start.source);
  const endKey = getRoadNodeKey(nearest.segment.end.source);
  connectRoadGraphNodes(graph, key, startKey, snapScene.distanceTo(nearest.segment.start.scene));
  connectRoadGraphNodes(graph, key, endKey, snapScene.distanceTo(nearest.segment.end.scene));

  return {
    key,
    entranceScene,
    snapScene
  };
}

class MinHeap {
  constructor() {
    this.items = [];
  }

  push(item) {
    this.items.push(item);
    this.bubbleUp(this.items.length - 1);
  }

  pop() {
    if (!this.items.length) return null;
    const top = this.items[0];
    const last = this.items.pop();

    if (this.items.length && last) {
      this.items[0] = last;
      this.bubbleDown(0);
    }

    return top;
  }

  bubbleUp(index) {
    let current = index;

    while (current > 0) {
      const parent = Math.floor((current - 1) / 2);
      if (this.items[parent].distance <= this.items[current].distance) break;
      [this.items[parent], this.items[current]] = [this.items[current], this.items[parent]];
      current = parent;
    }
  }

  bubbleDown(index) {
    let current = index;

    while (true) {
      const left = current * 2 + 1;
      const right = left + 1;
      let smallest = current;

      if (
        left < this.items.length &&
        this.items[left].distance < this.items[smallest].distance
      ) {
        smallest = left;
      }

      if (
        right < this.items.length &&
        this.items[right].distance < this.items[smallest].distance
      ) {
        smallest = right;
      }

      if (smallest === current) break;
      [this.items[current], this.items[smallest]] = [this.items[smallest], this.items[current]];
      current = smallest;
    }
  }

  get size() {
    return this.items.length;
  }
}

function runDijkstra(graph, startKey, endKey) {
  const distances = new Map([[startKey, 0]]);
  const previous = new Map();
  const heap = new MinHeap();
  heap.push({ key: startKey, distance: 0 });

  while (heap.size) {
    const current = heap.pop();
    if (!current) break;

    if (current.distance > (distances.get(current.key) ?? Infinity)) continue;
    if (current.key === endKey) break;

    const node = graph.get(current.key);
    if (!node) continue;

    for (const edge of node.edges) {
      const nextDistance = current.distance + edge.weight;
      if (nextDistance >= (distances.get(edge.to) ?? Infinity)) continue;

      distances.set(edge.to, nextDistance);
      previous.set(edge.to, current.key);
      heap.push({ key: edge.to, distance: nextDistance });
    }
  }

  if (!distances.has(endKey)) return null;

  const path = [];
  let currentKey = endKey;

  while (currentKey) {
    path.push(currentKey);
    if (currentKey === startKey) break;
    currentKey = previous.get(currentKey);
  }

  if (path[path.length - 1] !== startKey) return null;

  return {
    distance: distances.get(endKey),
    nodeKeys: path.reverse()
  };
}

function disposeObject3D(object) {
  object.traverse((child) => {
    if (child.geometry) child.geometry.dispose();
    if (Array.isArray(child.material)) {
      child.material.forEach((material) => {
        if (material.map) material.map.dispose();
        material.dispose();
      });
    } else if (child.material) {
      if (child.material.map) child.material.map.dispose();
      child.material.dispose();
    }
  });
}

function clearEntranceRouteTimeLabels() {
  for (const item of entranceRouteTimeLabels.splice(0)) {
    item.el.remove();
  }
  activeEntranceRouteLabelId = null;
}

function clearEntranceRoute() {
  for (const child of [...entranceRouteGroup.children]) {
    entranceRouteGroup.remove(child);
    disposeObject3D(child);
  }
  clearEntranceRouteTimeLabels();
  labelsDirty = true;
}

function clearGuidedNavigationRoutes() {
  clearEntranceRoute();
  entranceNavigationState.selectedStartId = null;
  entranceNavigationState.routeEndpointIds = new Set();
  refreshEntranceMarkerStyles();
}

function createRouteCylinder(start, end, material) {
  const direction = end.clone().sub(start);
  const length = direction.length();
  if (length < 0.2) return null;

  const geometry = new THREE.CylinderGeometry(1.7, 1.7, length, 10, 1);
  const cylinder = new THREE.Mesh(geometry, material);
  const midpoint = start.clone().add(end).multiplyScalar(0.5);

  cylinder.position.copy(midpoint);
  cylinder.quaternion.setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    direction.normalize()
  );
  cylinder.renderOrder = 60;

  return cylinder;
}

function drawEntranceRoute(route) {
  clearEntranceRoute();

  const material = new THREE.MeshBasicMaterial({
    color: "#ef4444",
    transparent: true,
    opacity: 0.94,
    depthWrite: false,
    depthTest: false
  });

  const points = [
    route.start.entranceScene,
    ...route.path.nodeKeys.map((key) => route.graph.get(key)?.scene).filter(Boolean),
    route.end.entranceScene
  ].map((point) => new THREE.Vector3(point.x, 3.2, point.z));

  for (let index = 1; index < points.length; index += 1) {
    const segment = createRouteCylinder(points[index - 1], points[index], material);
    if (segment) entranceRouteGroup.add(segment);
  }
}

function getRoutePoints(route) {
  return [
    route.start.entranceScene,
    ...route.path.nodeKeys.map((key) => route.graph.get(key)?.scene).filter(Boolean),
    route.end.entranceScene
  ].map((point) => new THREE.Vector3(point.x, 3.2, point.z));
}

function getRouteMidpoint(points) {
  if (!points.length) return null;
  if (points.length === 1) return points[0].clone();

  let totalDistance = 0;
  for (let index = 1; index < points.length; index += 1) {
    totalDistance += points[index - 1].distanceTo(points[index]);
  }

  if (totalDistance <= 0) return points[Math.floor(points.length / 2)].clone();

  const halfDistance = totalDistance / 2;
  let walked = 0;

  for (let index = 1; index < points.length; index += 1) {
    const from = points[index - 1];
    const to = points[index];
    const segmentDistance = from.distanceTo(to);

    if (walked + segmentDistance >= halfDistance) {
      const t = (halfDistance - walked) / Math.max(segmentDistance, 0.001);
      return from.clone().lerp(to, THREE.MathUtils.clamp(t, 0, 1));
    }

    walked += segmentDistance;
  }

  return points[points.length - 1].clone();
}

function getRouteColorForBuilding(building, fallbackModeKey) {
  const styleConfig = building?.typeConfig || getBuildingDisplayModeConfig(fallbackModeKey).style;
  return styleConfig.selectedEdgeColor || styleConfig.edgeColor || "#ef4444";
}

function setActiveEntranceRouteLabel(routeId) {
  activeEntranceRouteLabelId = routeId || null;
  labelsDirty = true;
}

function createEntranceRouteTimeLabel(anchor, color, routeId) {
  const label = document.createElement("div");
  label.className = "entrance-route-time-label";
  label.textContent = "10min";
  label.dataset.routeId = routeId;
  label.style.setProperty("--route-time-color", color);
  labelLayer.appendChild(label);
  entranceRouteTimeLabels.push({ el: label, anchor, routeId });
}

function drawEntranceRoutes(routes, modeKey) {
  clearEntranceRoute();

  routes.forEach((route, routeIndex) => {
    const routeId = `guided-route-${modeKey}-${routeIndex}`;
    const routeColor = getRouteColorForBuilding(route.targetBuilding, modeKey);
    const material = new THREE.MeshBasicMaterial({
      color: routeColor,
      transparent: true,
      opacity: 0.78,
      depthWrite: false,
      depthTest: false
    });
    const points = getRoutePoints(route);

    for (let index = 1; index < points.length; index += 1) {
      const segment = createRouteCylinder(points[index - 1], points[index], material);
      if (segment) {
        segment.userData.isGuidedCategoryRoute = true;
        segment.userData.routeId = routeId;
        entranceRouteGroup.add(segment);
      }
    }

    const midpoint = getRouteMidpoint(points);
    if (midpoint) {
      createEntranceRouteTimeLabel(midpoint.clone().setY(9.5), routeColor, routeId);
    }
  });

  labelsDirty = true;
}

function findEntranceRouteHit(clientX, clientY) {
  if (!entranceRouteGroup.children.length) return null;

  const rect = renderer.domElement.getBoundingClientRect();
  const pointer = new THREE.Vector2(
    ((clientX - rect.left) / Math.max(rect.width, 1)) * 2 - 1,
    -(((clientY - rect.top) / Math.max(rect.height, 1)) * 2 - 1)
  );

  raycaster.setFromCamera(pointer, activeCamera);
  const hits = raycaster.intersectObjects(entranceRouteGroup.children, false);
  return hits.find((hit) => hit.object?.userData?.isGuidedCategoryRoute)?.object || null;
}

function bindEntranceRouteEvents() {
  renderer.domElement.addEventListener("pointerdown", (event) => {
    entranceRoutePointerStart = {
      x: event.clientX,
      y: event.clientY
    };
  });

  renderer.domElement.addEventListener("pointerup", (event) => {
    const start = entranceRoutePointerStart;
    entranceRoutePointerStart = null;
    if (!start) return;

    const moved = Math.hypot(event.clientX - start.x, event.clientY - start.y);
    if (moved > 6) return;

    const routeSegment = findEntranceRouteHit(event.clientX, event.clientY);
    if (!routeSegment) {
      if (activeEntranceRouteLabelId) {
        setActiveEntranceRouteLabel(null);
      }
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    setActiveEntranceRouteLabel(routeSegment.userData.routeId);
  });
}

function getDormEntranceName(entranceId) {
  const entranceLabel = DORM_ENTRANCES[entranceId]?.label;
  if (entranceLabel) return entranceLabel;

  const dormId = entranceId.replace(/^dorm_/, "");
  const dorm = DORMS.find((item) => item.buildingId === entranceId || item.id === dormId);
  return dorm?.shortName || dorm?.name || entranceId.replace(/^dorm_/, "");
}

function getEntranceNumber(entranceId) {
  const index = Object.keys(DORM_ENTRANCES).indexOf(entranceId);
  return index >= 0 ? index + 1 : null;
}

function showEntranceIndexNotice(entranceId) {
  const entranceNumber = getEntranceNumber(entranceId);
  if (!entranceNumber) return;

  window.clearTimeout(showEntranceIndexNotice._timer);
  entranceIndexNotice.textContent = `入口 ${entranceNumber} · ${getDormEntranceName(entranceId)}`;
  entranceIndexNotice.classList.add("is-visible");
  showEntranceIndexNotice._timer = window.setTimeout(() => {
    entranceIndexNotice.classList.remove("is-visible");
  }, 2600);
}

function getEntranceRouteDistanceText(route) {
  const approachDistance =
    route.start.entranceScene.distanceTo(route.start.snapScene) +
    route.end.entranceScene.distanceTo(route.end.snapScene);
  const distance = route.path.distance + approachDistance;
  return `${Math.round(distance)} m`;
}

function findShortestEntranceRoute(startId, endId) {
  if (!entranceNavigationState.baseGraph) return null;

  const startData = DORM_ENTRANCES[startId];
  const endData = DORM_ENTRANCES[endId];
  if (!startData || !endData) return null;

  const graph = cloneEntranceRouteGraph(entranceNavigationState.baseGraph);
  const start = addVirtualEntranceNode(graph, startId, startData);
  const end = addVirtualEntranceNode(graph, endId, endData);
  if (!start || !end) return null;

  const path = runDijkstra(graph, start.key, end.key);
  if (!path) return null;

  return {
    graph,
    startId,
    endId,
    start,
    end,
    path
  };
}

function refreshEntranceMarkerStyles() {
  for (const marker of entranceNavigationState.markers) {
    const isStart = marker.userData.entranceId === entranceNavigationState.selectedStartId;
    const isRouteEndpoint = entranceNavigationState.routeEndpointIds?.has(
      marker.userData.entranceId
    );
    const dot = marker.getObjectByName("entrance-nav-dot");
    const ring = marker.getObjectByName("entrance-nav-ring");

    if (dot?.material) {
      dot.material.color.set(isStart || isRouteEndpoint ? "#ef4444" : "#2563eb");
      dot.material.opacity = isStart || isRouteEndpoint ? 0.98 : 0.9;
    }

    if (ring?.material) {
      ring.material.color.set(isStart || isRouteEndpoint ? "#ef4444" : "#2f8cff");
      ring.material.opacity = isStart || isRouteEndpoint ? 0.86 : 0.72;
    }
  }
}

function selectEntranceForRoute(entranceId) {
  showEntranceIndexNotice(entranceId);

  if (!entranceNavigationState.selectedStartId) {
    entranceNavigationState.selectedStartId = entranceId;
    entranceNavigationState.routeEndpointIds = new Set([entranceId]);
    clearEntranceRoute();
    refreshEntranceMarkerStyles();
    mapStatus.textContent = `${getDormEntranceName(entranceId)} entrance selected. Click another entrance to draw the shortest road route.`;
    return;
  }

  if (entranceNavigationState.selectedStartId === entranceId) {
    entranceNavigationState.routeEndpointIds = new Set([entranceId]);
    refreshEntranceMarkerStyles();
    return;
  }

  const startId = entranceNavigationState.selectedStartId;
  const route = findShortestEntranceRoute(startId, entranceId);

  if (!route) {
    mapStatus.textContent = `No road route found between ${getDormEntranceName(startId)} and ${getDormEntranceName(entranceId)}.`;
    return;
  }

  drawEntranceRoute(route);
  entranceNavigationState.selectedStartId = entranceId;
  entranceNavigationState.routeEndpointIds = new Set([startId, entranceId]);
  refreshEntranceMarkerStyles();
  mapStatus.textContent = `${getDormEntranceName(startId)} to ${getDormEntranceName(entranceId)} shortest route: ${getEntranceRouteDistanceText(route)}.`;
}

function createEntranceNavigationMarker(entranceId, entranceData, options = {}) {
  const entranceScene = sourceToScenePoint(
    entranceData.entrance?.[0],
    entranceData.entrance?.[1]
  );
  if (!entranceScene) return null;

  const isInteractive = options.interactive !== false;
  const hasHitTarget = options.hitTarget !== false;
  const entranceNumber = Number(options.entranceNumber) || getEntranceNumber(entranceId);
  const marker = new THREE.Group();
  marker.userData.entranceId = entranceId;
  marker.userData.entranceNumber = entranceNumber;
  marker.position.set(entranceScene.x, 0, entranceScene.z);

  const dot = new THREE.Mesh(
    new THREE.SphereGeometry(4.4, 18, 18),
    new THREE.MeshBasicMaterial({
      color: "#2563eb",
      transparent: true,
      opacity: 0.9,
      depthWrite: false
    })
  );
  dot.name = "entrance-nav-dot";
  dot.position.y = 5.4;

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(8.5, 0.8, 12, 52),
    new THREE.MeshBasicMaterial({
      color: "#2f8cff",
      transparent: true,
      opacity: 0.72,
      depthWrite: false
    })
  );
  ring.name = "entrance-nav-ring";
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.85;

  marker.add(dot, ring);

  if (hasHitTarget) {
    const hitTarget = new THREE.Mesh(
      new THREE.SphereGeometry(12, 14, 14),
      new THREE.MeshBasicMaterial({
        color: "#ffffff",
        transparent: true,
        opacity: 0.001,
        depthWrite: false
      })
    );
    hitTarget.position.y = 5.4;
    hitTarget.userData.isEntranceNavigationHitTarget = true;
    hitTarget.userData.entranceId = entranceId;
    hitTarget.userData.entranceNumber = entranceNumber;
    hitTarget.userData.isEntranceNavigationInteractive = isInteractive;

    marker.add(hitTarget);
    entranceNavigationState.hitTargets.push(hitTarget);
  }

  entranceNavigationState.markers.push(marker);
  entranceNavigationGroup.add(marker);

  return marker;
}

function setupEntranceNavigationLayer() {
  const shouldShowEntranceMarkers = entranceNavigationState.active || mapToolState.active;
  const hasMarkerBounds = entranceNavigationState.bounds || mapToolState.bounds;

  if (!shouldShowEntranceMarkers || !hasMarkerBounds) return;

  entranceNavigationState.markers = [];
  entranceNavigationState.hitTargets = [];
  entranceNavigationState.selectedStartId = null;
  entranceNavigationState.routeEndpointIds = new Set();
  entranceNavigationGroup.clear();
  clearEntranceRoute();

  Object.entries(DORM_ENTRANCES).forEach(([entranceId, entranceData], index) => {
    createEntranceNavigationMarker(entranceId, entranceData, {
      entranceNumber: index + 1,
      interactive: entranceNavigationState.active,
      hitTarget: entranceNavigationState.active || mapToolState.active
    });
  });
}

function findEntranceNavigationHitData(clientX, clientY) {
  if (!(entranceNavigationState.active || mapToolState.active) || !entranceNavigationState.hitTargets.length) {
    return null;
  }

  const rect = renderer.domElement.getBoundingClientRect();
  const pointer = new THREE.Vector2(
    ((clientX - rect.left) / Math.max(rect.width, 1)) * 2 - 1,
    -(((clientY - rect.top) / Math.max(rect.height, 1)) * 2 - 1)
  );

  raycaster.setFromCamera(pointer, activeCamera);
  const hits = raycaster.intersectObjects(entranceNavigationState.hitTargets, false);
  const hit = hits[0]?.object;
  if (!hit?.userData?.entranceId) return null;

  return {
    entranceId: hit.userData.entranceId,
    entranceNumber: hit.userData.entranceNumber || getEntranceNumber(hit.userData.entranceId),
    interactive: hit.userData.isEntranceNavigationInteractive !== false
  };
}

function findEntranceNavigationHit(clientX, clientY) {
  return findEntranceNavigationHitData(clientX, clientY)?.entranceId || null;
}

function bindEntranceNavigationEvents() {
  if (!entranceNavigationState.active) return;

  renderer.domElement.addEventListener("pointerdown", (event) => {
    entranceNavigationState.pointerStart = {
      x: event.clientX,
      y: event.clientY
    };
  });

  renderer.domElement.addEventListener("pointerup", (event) => {
    const start = entranceNavigationState.pointerStart;
    entranceNavigationState.pointerStart = null;
    if (!start) return;

    const moved = Math.hypot(event.clientX - start.x, event.clientY - start.y);
    if (moved > 6) return;
    if (guidedPreviewState.navigationCategoryViewActive) return;

    const entranceId = findEntranceNavigationHit(event.clientX, event.clientY);
    if (!entranceId) return;

    event.preventDefault();
    event.stopPropagation();
    selectEntranceForRoute(entranceId);
  });
}

/* =========================================================
   CAMPUS BOUNDARY PICKER TOOL
   ========================================================= */

function createBoundaryToolPanel() {
  if (!boundaryToolState.active || boundaryToolState.panel) return;

  const panel = document.createElement("aside");
  panel.className = "entrance-tool-panel boundary-tool-panel";
  panel.innerHTML = `
    <p class="entrance-tool-panel__kicker">Boundary picker</p>
    <h2>${escapeHtml(boundaryToolState.id)} boundary</h2>
    <p class="entrance-tool-panel__hint">Right-click to add small boundary points. Left drag and wheel still move the map. Right-click near point 1 to close the shape.</p>
    <pre class="entrance-tool-panel__output boundary-tool-panel__output">No boundary points yet.</pre>
    <button class="boundary-tool-panel__undo" type="button" disabled>Undo last point</button>
    <p class="entrance-tool-panel__status">0 points saved in this browser.</p>
  `;

  document.body.appendChild(panel);
  boundaryToolState.panel = panel;
  panel.addEventListener("pointerdown", (event) => event.stopPropagation());
  panel.addEventListener("pointerup", (event) => event.stopPropagation());
  panel.addEventListener("contextmenu", (event) => event.stopPropagation());
  panel.querySelector(".boundary-tool-panel__undo")?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    undoBoundaryPoint();
  });
}

function getBoundaryOutputText() {
  if (!boundaryToolState.points.length) return "No boundary points yet.";

  const rows = boundaryToolState.points.map((point, index) => {
    const source = boundarySceneToSourcePoint(point);
    if (!source) return `${index + 1}: unavailable`;
    return `${index + 1}: ${formatEntranceNumber(source.x)}, ${formatEntranceNumber(source.y)}`;
  });

  if (boundaryToolState.closed) {
    rows.push("closed: yes");
  }

  return rows.join("\n");
}

function updateBoundaryToolPanel() {
  const output = boundaryToolState.panel?.querySelector(".boundary-tool-panel__output");
  const status = boundaryToolState.panel?.querySelector(".entrance-tool-panel__status");
  const undoButton = boundaryToolState.panel?.querySelector(".boundary-tool-panel__undo");
  const text = getBoundaryOutputText();

  if (output) output.textContent = text;
  if (undoButton) undoButton.disabled = boundaryToolState.points.length === 0;
  if (status) {
    status.textContent = boundaryToolState.closed
      ? `${boundaryToolState.points.length} points, shape closed.`
      : `${boundaryToolState.points.length} points saved in this browser.`;
  }

  try {
    window.localStorage.setItem(`boundary:${boundaryToolState.id}`, text);
  } catch (error) {
    console.warn("Boundary draft could not be stored:", error);
  }
}

function undoBoundaryPoint() {
  if (!boundaryToolState.points.length) return;

  boundaryToolState.closed = false;
  boundaryToolState.points.pop();
  redrawBoundaryTool();
}

function pickBoundaryPointAtClientPoint(clientX, clientY) {
  if (!boundaryToolState.active || !boundaryToolState.bounds) return null;

  const rect = renderer.domElement.getBoundingClientRect();
  const pointer = new THREE.Vector2(
    ((clientX - rect.left) / Math.max(rect.width, 1)) * 2 - 1,
    -(((clientY - rect.top) / Math.max(rect.height, 1)) * 2 - 1)
  );

  raycaster.setFromCamera(pointer, activeCamera);
  const point = new THREE.Vector3();
  if (!raycaster.ray.intersectPlane(groundPlane, point)) return null;

  return new THREE.Vector3(point.x, 0, point.z);
}

function getBoundaryPointScreenDistance(point, clientX, clientY) {
  const rect = renderer.domElement.getBoundingClientRect();
  const projected = point.clone().project(activeCamera);
  const x = rect.left + (projected.x * 0.5 + 0.5) * rect.width;
  const y = rect.top + (-projected.y * 0.5 + 0.5) * rect.height;
  return Math.hypot(x - clientX, y - clientY);
}

function clearBoundaryToolVisuals() {
  for (const child of [...boundaryToolGroup.children]) {
    boundaryToolGroup.remove(child);
    disposeObject3D(child);
  }

  for (const child of [...boundaryToolShapeGroup.children]) {
    boundaryToolShapeGroup.remove(child);
    disposeObject3D(child);
  }

  boundaryToolState.markers = [];
  boundaryToolState.line = null;
  boundaryToolState.fill = null;
}

function createBoundaryMarker(point, index, areaIndex = 0) {
  const isActiveArea = areaIndex === boundaryToolState.activeAreaIndex;
  const marker = new THREE.Mesh(
    new THREE.SphereGeometry(isActiveArea ? 2.15 : 1.7, 12, 12),
    new THREE.MeshBasicMaterial({
      color: index === 0 ? "#ef4444" : getMapBoundaryAreaColor(areaIndex),
      transparent: true,
      opacity: isActiveArea ? 0.96 : 0.82,
      depthWrite: false,
      depthTest: false
    })
  );

  marker.position.set(point.x, 4.8, point.z);
  marker.renderOrder = 40;
  boundaryToolGroup.add(marker);
  boundaryToolState.markers.push(marker);
}

function createBoundaryLine(points, closed, areaIndex = 0) {
  if (points.length < 2) return;

  const linePoints = points.map((point) => new THREE.Vector3(point.x, 4.2, point.z));
  if (closed) {
    linePoints.push(new THREE.Vector3(points[0].x, 4.2, points[0].z));
  }

  const line = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(linePoints),
    new THREE.LineBasicMaterial({
      color: closed ? getMapBoundaryAreaColor(areaIndex) : "#2563eb",
      transparent: true,
      opacity: areaIndex === boundaryToolState.activeAreaIndex ? 0.94 : 0.68,
      depthWrite: false,
      depthTest: false
    })
  );
  line.renderOrder = 39;
  boundaryToolShapeGroup.add(line);
  boundaryToolState.line = line;
}

function createBoundaryFill(points, options = {}) {
  const closed = typeof options.closed === "boolean" ? options.closed : boundaryToolState.closed;
  const areaIndex = Number.isInteger(options.areaIndex) ? options.areaIndex : 0;

  if (points.length < 3 || !closed) return;

  const shape = new THREE.Shape(
    points.map((point) => new THREE.Vector2(point.x, -point.z))
  );
  const fill = new THREE.Mesh(
    new THREE.ShapeGeometry(shape),
    new THREE.MeshBasicMaterial({
      color: getMapBoundaryAreaColor(areaIndex),
      transparent: true,
      opacity: areaIndex === boundaryToolState.activeAreaIndex ? 0.2 : 0.13,
      depthWrite: false,
      depthTest: false,
      side: THREE.DoubleSide
    })
  );

  fill.rotation.x = -Math.PI / 2;
  fill.position.y = 3.4;
  fill.renderOrder = 38;
  boundaryToolShapeGroup.add(fill);
  boundaryToolState.fill = fill;
}

function getBoundaryAreaCenter(points) {
  if (!points.length) return null;

  let crossSum = 0;
  let centerX = 0;
  let centerZ = 0;

  for (let index = 0; index < points.length; index += 1) {
    const current = points[index];
    const next = points[(index + 1) % points.length];
    const cross = current.x * next.z - next.x * current.z;
    crossSum += cross;
    centerX += (current.x + next.x) * cross;
    centerZ += (current.z + next.z) * cross;
  }

  if (Math.abs(crossSum) > 0.001) {
    return new THREE.Vector3(centerX / (3 * crossSum), 0, centerZ / (3 * crossSum));
  }

  const average = points.reduce(
    (total, point) => {
      total.x += point.x;
      total.z += point.z;
      return total;
    },
    { x: 0, z: 0 }
  );

  return new THREE.Vector3(average.x / points.length, 0, average.z / points.length);
}

function createBoundaryAreaLabelSprite(area, areaIndex) {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 96;
  const ctx = canvas.getContext("2d");
  const color = getMapBoundaryAreaColor(areaIndex);

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.beginPath();
  ctx.moveTo(42, 18);
  ctx.lineTo(214, 18);
  ctx.quadraticCurveTo(242, 18, 242, 46);
  ctx.lineTo(242, 50);
  ctx.quadraticCurveTo(242, 78, 214, 78);
  ctx.lineTo(42, 78);
  ctx.quadraticCurveTo(14, 78, 14, 50);
  ctx.lineTo(14, 46);
  ctx.quadraticCurveTo(14, 18, 42, 18);
  ctx.closePath();
  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.fill();
  ctx.lineWidth = 8;
  ctx.strokeStyle = color;
  ctx.stroke();
  ctx.fillStyle = "#111827";
  ctx.font = "800 31px system-ui, -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(area.label, 128, 49);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;

  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
      depthTest: false
    })
  );
  sprite.name = "boundary-area-label";
  sprite.scale.set(48, 18, 1);
  sprite.renderOrder = 44;
  return sprite;
}

function createBoundaryAreaLabel(area, areaIndex = 0) {
  if (!area.closed || area.points.length < 3) return;

  const center = getBoundaryAreaCenter(area.points);
  if (!center) return;

  const label = createBoundaryAreaLabelSprite(area, areaIndex);
  label.position.set(center.x, 7.2, center.z);
  boundaryToolGroup.add(label);
}

function redrawBoundaryTool() {
  clearBoundaryToolVisuals();

  boundaryToolState.points.forEach((point, index) => {
    createBoundaryMarker(point, index);
  });
  createBoundaryLine(boundaryToolState.points, boundaryToolState.closed);
  createBoundaryFill(boundaryToolState.points);
  updateBoundaryToolPanel();
}

function addBoundaryPoint(point, event) {
  if (boundaryToolState.closed || !point) return;

  const firstPoint = boundaryToolState.points[0];
  const canClose = boundaryToolState.points.length >= 3 && firstPoint;
  const closeDistance = canClose
    ? getBoundaryPointScreenDistance(firstPoint, event.clientX, event.clientY)
    : Infinity;

  if (closeDistance <= 18) {
    boundaryToolState.closed = true;
    redrawBoundaryTool();
    return;
  }

  boundaryToolState.points.push(point);
  redrawBoundaryTool();
}

function bindBoundaryToolEvents() {
  if (!boundaryToolState.active) return;

  renderer.domElement.addEventListener("contextmenu", (event) => {
    event.preventDefault();
  });

  renderer.domElement.addEventListener(
    "pointerdown",
    (event) => {
      if (event.button !== 2) return;
      boundaryToolState.pointerStart = {
        x: event.clientX,
        y: event.clientY
      };
      event.preventDefault();
      event.stopPropagation();
    },
    true
  );

  renderer.domElement.addEventListener(
    "pointerup",
    (event) => {
      if (event.button !== 2) return;
      const start = boundaryToolState.pointerStart;
      boundaryToolState.pointerStart = null;
      event.preventDefault();
      event.stopPropagation();
      if (!start) return;

      const moved = Math.hypot(event.clientX - start.x, event.clientY - start.y);
      if (moved > 8) return;

      const point = pickBoundaryPointAtClientPoint(event.clientX, event.clientY);
      addBoundaryPoint(point, event);
    },
    true
  );
}

createEntranceToolMarker();
createEntranceToolPanel();
bindEntranceToolEvents();
createMapToolPanel();
bindMapToolEvents();
bindEntranceNavigationEvents();
bindEntranceRouteEvents();
createBoundaryToolPanel();
bindBoundaryToolEvents();

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
  if (isMapToolBoundaryMode()) {
    btnNumbers.classList.toggle("is-active", mapToolState.boundaryLabelsEnabled);
    btnNumbers.disabled = true;
    btnNumbers.textContent = mapToolState.boundaryLabelsEnabled ? "Labels On" : "Labels Off";
    btnNumbers.title = "圈地模式的建筑编号由圈地工具面板里的开关控制。";
    return;
  }

  btnNumbers.disabled = false;
  btnNumbers.title = "";
  btnNumbers.classList.toggle("is-active", showNormalLabels);
  btnNumbers.textContent = showNormalLabels ? "Developer On" : "Developer Off";
}

function setDeveloperLabelsEnabled(enabled) {
  showNormalLabels = Boolean(enabled);
  setNumbersButtonState();
  updateStatusText();
  labelsDirty = true;
  updateLabels(true);
  postAdminMapToolState();
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
    const modeConfig = getBuildingDisplayModeConfig(selectedBuilding.displayMode);
    mapStatus.textContent = `${head}${envPart}${devPart} Selected ${modeConfig.label}: ${selectedBuilding.functionalConfig.name}.${helpText}`;
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

function setGuidedDetailActions(isGuidedEntry) {
  let actionWrap = detailPanel.querySelector(".guided-detail-actions");

  if (!isGuidedEntry) {
    if (actionWrap) {
      detailPanel.appendChild(btnBackOverview);
      actionWrap.remove();
    }
    guidedPreviewState.navigationTargetMode = null;
    guidedPreviewState.navigationCategoryViewActive = false;
    clearGuidedNavigationRoutes();
    btnBackOverview.textContent = "Return to Explore";
    return;
  }

  if (!actionWrap) {
    actionWrap = document.createElement("div");
    actionWrap.className = "guided-detail-actions";
    detailPanel.insertBefore(actionWrap, btnBackOverview);
    actionWrap.appendChild(btnBackOverview);

    const navigationBtn = document.createElement("button");
    navigationBtn.id = "btnGuidedNavigation";
    navigationBtn.className = "scene-detail-back scene-detail-back--navigation";
    navigationBtn.type = "button";
    navigationBtn.textContent = "Navigation";
    navigationBtn.setAttribute("aria-pressed", "false");
    navigationBtn.addEventListener("click", () => {
      if (isAdminPreview) return;
      renderDormNavigationCategoryView();
    });
    actionWrap.appendChild(navigationBtn);

    const viewDetailsBtn = document.createElement("button");
    viewDetailsBtn.id = "btnGuidedViewDetails";
    viewDetailsBtn.className = "scene-detail-back scene-detail-back--details";
    viewDetailsBtn.type = "button";
    viewDetailsBtn.textContent = "View Dorms";
    viewDetailsBtn.addEventListener("click", () => {
      if (isAdminPreview) return;
      window.location.href = "index.html?home=1#homeResults";
    });
    actionWrap.appendChild(viewDetailsBtn);
  }

  btnBackOverview.textContent = "Return to ANU";
}

function setGuidedNavigationButtonActive(isActive) {
  const navigationBtn = detailPanel.querySelector("#btnGuidedNavigation");
  if (!navigationBtn) return;

  navigationBtn.classList.toggle("is-active", isActive);
  navigationBtn.setAttribute("aria-pressed", isActive ? "true" : "false");
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
  if (dorm?.rentText) return dorm.rentText;
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

function getNavigationTargetModes() {
  return NAVIGATION_TARGET_MODE_ORDER
    .map((modeKey) => BUILDING_DISPLAY_MODES[modeKey])
    .filter(Boolean);
}

function getBuildingEntranceIds(building) {
  const buildingId = building?.functionalConfig?.buildingId;
  if (!buildingId) return [];

  return Object.entries(DORM_ENTRANCES)
    .filter(([entranceId, entranceData]) => (
      entranceId === buildingId ||
      entranceData?.buildingId === buildingId
    ))
    .map(([entranceId]) => entranceId);
}

function getBuildingEntranceId(building) {
  return getBuildingEntranceIds(building)[0] || null;
}

function getNavigationTargetBuildings(modeKey, sourceBuilding) {
  const sourceEntranceIds = new Set(getBuildingEntranceIds(sourceBuilding));

  return buildingObjects.filter((building) => {
    const targetEntranceIds = getBuildingEntranceIds(building);
    return (
      building !== sourceBuilding &&
      building.displayMode === modeKey &&
      targetEntranceIds.some((entranceId) => !sourceEntranceIds.has(entranceId))
    );
  });
}

function getEntranceRouteDistance(route) {
  return (
    route.path.distance +
    route.start.entranceScene.distanceTo(route.start.snapScene) +
    route.end.entranceScene.distanceTo(route.end.snapScene)
  );
}

function findShortestBuildingRoute(sourceBuilding, targetBuilding) {
  const sourceEntranceIds = getBuildingEntranceIds(sourceBuilding);
  const targetEntranceIds = getBuildingEntranceIds(targetBuilding);
  let bestRoute = null;

  for (const sourceEntranceId of sourceEntranceIds) {
    for (const targetEntranceId of targetEntranceIds) {
      if (sourceEntranceId === targetEntranceId) continue;

      const route = findShortestEntranceRoute(sourceEntranceId, targetEntranceId);
      if (!route) continue;

      if (!bestRoute || getEntranceRouteDistance(route) < getEntranceRouteDistance(bestRoute)) {
        bestRoute = route;
      }
    }
  }

  return bestRoute;
}

function applyGuidedNavigationTarget(modeKey) {
  const sourceBuilding = selectedBuilding;
  const sourceEntranceId = getBuildingEntranceId(sourceBuilding);
  const modeConfig = getBuildingDisplayModeConfig(modeKey);

  if (!sourceBuilding || !sourceEntranceId) {
    clearGuidedNavigationRoutes();
    return {
      status: "当前建筑还没有绑定入口，暂时不能自动导航。"
    };
  }

  const routes = getNavigationTargetBuildings(modeKey, sourceBuilding)
    .map((targetBuilding) => {
      const route = findShortestBuildingRoute(sourceBuilding, targetBuilding);
      return route ? { ...route, targetBuilding } : null;
    })
    .filter(Boolean);

  if (!routes.length) {
    clearGuidedNavigationRoutes();
    mapStatus.textContent = `暂无可导航到的${modeConfig.label}入口。`;
    return {
      status: `暂无可导航到的${modeConfig.label}入口。`
    };
  }

  drawEntranceRoutes(routes, modeKey);
  entranceNavigationState.selectedStartId = sourceEntranceId;
  entranceNavigationState.routeEndpointIds = new Set([
    sourceEntranceId,
    ...routes.flatMap((route) => [route.startId, route.endId])
  ]);
  refreshEntranceMarkerStyles();

  const sourceName = getDormEntranceName(sourceEntranceId);
  mapStatus.textContent = `${sourceName} 已连接 ${routes.length} 个${modeConfig.label}入口。`;

  return {
    status: `已连接 ${routes.length} 个${modeConfig.label}入口。`
  };
}

function renderDormNavigationCategoryView() {
  setGuidedDetailActions(guidedPreviewState.active || isHomePathEntry || cityOverviewState.dismissed);
  setGuidedNavigationButtonActive(true);
  guidedPreviewState.navigationCategoryViewActive = true;

  const targetModes = getNavigationTargetModes();
  detailTitle.textContent = "Navigation";
  detailCode.textContent = guidedPreviewState.entryBuildingId
    ? `起点 ${guidedPreviewState.entryBuildingId}`
    : "选择目标类别";

  detailScroll.innerHTML = `
    <div class="dorm-navigation-panel">
      <p class="dorm-navigation-panel__eyebrow">Navigation</p>
      <h2 class="dorm-navigation-panel__title">选择目标类别</h2>
      <div class="dorm-navigation-panel__grid">
        ${targetModes
          .map((mode) => `
            <button
              class="dorm-navigation-category"
              type="button"
              data-navigation-category="${escapeHtml(mode.key)}"
              style="--nav-category-bg: ${escapeHtml(mode.style.baseColor)}; --nav-category-selected: ${escapeHtml(mode.style.selectedColor)}; --nav-category-edge: ${escapeHtml(mode.style.edgeColor)};"
              aria-pressed="${guidedPreviewState.navigationTargetMode === mode.key ? "true" : "false"}"
            >
              <span class="dorm-navigation-category__swatch" aria-hidden="true"></span>
              <span>${escapeHtml(mode.label)}</span>
            </button>
          `)
          .join("")}
      </div>
      <p class="dorm-navigation-panel__status" aria-live="polite" hidden></p>
    </div>
  `;

  const statusEl = detailScroll.querySelector(".dorm-navigation-panel__status");

  detailScroll.querySelectorAll(".dorm-navigation-category").forEach((button) => {
    const isSelected = guidedPreviewState.navigationTargetMode === button.dataset.navigationCategory;
    button.classList.toggle("is-selected", isSelected);

    button.addEventListener("click", () => {
      guidedPreviewState.navigationTargetMode = button.dataset.navigationCategory || null;

      detailScroll.querySelectorAll(".dorm-navigation-category").forEach((item) => {
        const itemSelected = item.dataset.navigationCategory === guidedPreviewState.navigationTargetMode;
        item.classList.toggle("is-selected", itemSelected);
        item.setAttribute("aria-pressed", itemSelected ? "true" : "false");
      });

      const result = applyGuidedNavigationTarget(guidedPreviewState.navigationTargetMode);
      if (statusEl) {
        statusEl.textContent = result.status;
        statusEl.hidden = false;
      }
    });
  });

  detailScroll.scrollTop = 0;
}

function renderGuidedDetailContent(building) {
  const dorm = getGuidedDorm(building);
  if (!dorm) return false;

  detailPanel.classList.add("scene-panel-detail--guided");
  setGuidedDetailActions(guidedPreviewState.active || isHomePathEntry || cityOverviewState.dismissed);
  guidedPreviewState.entryBuildingId = building.functionalConfig?.buildingId || null;
  guidedPreviewState.entryDormId = dorm.id || null;
  guidedPreviewState.navigationTargetMode = null;
  guidedPreviewState.navigationCategoryViewActive = false;
  setGuidedNavigationButtonActive(false);
  clearGuidedNavigationRoutes();

  detailTitle.textContent = dorm.name || building.functionalConfig?.name || "Selected dorm";
  detailCode.textContent = "Guided dorm information";

  const quickPoints = [
    ["Best for", dorm.bestFor],
    ["Location feel", dorm.locationFeel],
    ["Main trade-off", dorm.tradeOff]
  ]
    .filter(([, value]) => value)
    .slice(0, 3);

  detailScroll.innerHTML = `
    <div class="information-drawer-panel information-drawer-panel--guided information-drawer-panel--guided-compact">
      <p class="information-drawer__eyebrow">Residence detail</p>
      <h2 class="information-drawer__title">${escapeHtml(dorm.name)}</h2>
      <p class="information-drawer__summary">${escapeHtml(dorm.summary || dorm.description || "")}</p>

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

      <div class="information-drawer__compact-notes">
        ${quickPoints
          .map(([label, value]) => `
            <section class="information-drawer__compact-note">
              <h3>${escapeHtml(label)}</h3>
              <p>${escapeHtml(value)}</p>
            </section>
          `)
          .join("")}
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
  const response = await fetch(path, DATA_FETCH_OPTIONS);
  if (!response.ok) {
    throw new Error(`Failed to load ${path}: HTTP ${response.status}`);
  }
  return await response.json();
}

async function fetchGeoJsonSafe(path) {
  try {
    const response = await fetch(path, DATA_FETCH_OPTIONS);
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

async function fetchJsonSafe(path) {
  try {
    const response = await fetch(path, DATA_FETCH_OPTIONS);
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

function getCampusBoundaryScenePoints(boundaryId, bounds) {
  const points = CAMPUS_BOUNDARIES[boundaryId];
  if (!Array.isArray(points) || points.length < 3 || !bounds) return [];

  return points
    .map((point) => {
      const x = Number(point[0]);
      const y = Number(point[1]);
      if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
      const local = toSceneXZ(x, y, bounds.centerX, bounds.centerY, 1);
      return new THREE.Vector3(local.x, 0, local.z);
    })
    .filter(Boolean);
}

function isScenePointInsidePolygon(point, polygonPoints, fallback = false) {
  if (!point || !Array.isArray(polygonPoints) || polygonPoints.length < 3) {
    return fallback;
  }

  let inside = false;
  const x = point.x;
  const z = point.z;

  for (
    let index = 0, previous = polygonPoints.length - 1;
    index < polygonPoints.length;
    previous = index, index += 1
  ) {
    const currentPoint = polygonPoints[index];
    const previousPoint = polygonPoints[previous];
    const crosses =
      currentPoint.z > z !== previousPoint.z > z &&
      x <
        ((previousPoint.x - currentPoint.x) * (z - currentPoint.z)) /
          (previousPoint.z - currentPoint.z) +
          currentPoint.x;

    if (crosses) inside = !inside;
  }

  return inside;
}

function isScenePointInsideCampusBoundary(point) {
  return isScenePointInsidePolygon(point, campusBoundaryScenePoints, true);
}

function isSourcePointInsideCampusBoundary(x, y, centerX, centerY) {
  if (campusBoundaryScenePoints.length < 3) return true;
  const local = toSceneXZ(x, y, centerX, centerY, 1);
  return isScenePointInsideCampusBoundary(local);
}

function isScenePointInsideCampusTerritory(point) {
  return isScenePointInsidePolygon(point, campusTerritoryScenePoints, false);
}

function isSourcePointInsideCampusTerritory(x, y, centerX, centerY) {
  if (campusTerritoryScenePoints.length < 3) return false;
  const local = toSceneXZ(x, y, centerX, centerY, 1);
  return isScenePointInsideCampusTerritory(local);
}

function getCampusMutedColor(color, insideCampus, mix = 0.84) {
  if (insideCampus || campusBoundaryScenePoints.length < 3) return color;

  const muted = new THREE.Color(color);
  muted.lerp(new THREE.Color("#eef1ef"), mix);
  return muted;
}

function getTerritorySharpnessColor(color, insideTerritory, outsideMix = 0.58) {
  const adjusted = color instanceof THREE.Color ? color.clone() : new THREE.Color(color);
  if (campusTerritoryScenePoints.length < 3) return adjusted;

  if (insideTerritory) {
    adjusted.offsetHSL(0, 0.045, -0.012);
    return adjusted;
  }

  adjusted.lerp(new THREE.Color("#edf1e8"), outsideMix);
  adjusted.offsetHSL(0, -0.05, 0.018);
  return adjusted;
}

function getBuildingVisualColor(color, building, insideCampus, mix = 0.84) {
  return getTerritorySharpnessColor(
    getCampusMutedColor(color, insideCampus, mix),
    !!building?.isInsideCampusTerritory || building === selectedBuilding
  );
}

function clearCampusTerritoryBoundary() {
  for (const child of [...campusTerritoryGroup.children]) {
    campusTerritoryGroup.remove(child);
    disposeObject3D(child);
  }
}

function createCampusTerritorySegment(from, to, color, opacity, radius, y, renderOrder) {
  const start = new THREE.Vector3(from.x, y, from.z);
  const end = new THREE.Vector3(to.x, y, to.z);
  const material = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity,
    depthWrite: false,
    depthTest: false
  });
  const line = createRouteCylinder(start, end, material);
  if (!line) {
    material.dispose();
    return null;
  }

  line.scale.x = radius / 1.7;
  line.scale.z = radius / 1.7;
  line.renderOrder = renderOrder;
  campusTerritoryGroup.add(line);
  return line;
}

function drawCampusTerritoryBoundary(points) {
  clearCampusTerritoryBoundary();
  if (!Array.isArray(points) || points.length < 3) return;

  for (let index = 0; index < points.length; index += 1) {
    const from = points[index];
    const to = points[(index + 1) % points.length];
    createCampusTerritorySegment(from, to, "#facc15", 0.1, 3.6, 1.12, 41);
    createCampusTerritorySegment(from, to, "#a16207", 0.46, 0.95, 1.36, 42);
  }
}

function getCoordinateCenter(coords) {
  let totalX = 0;
  let totalY = 0;
  let count = 0;

  for (const coord of coords || []) {
    const x = Number(coord?.[0]);
    const y = Number(coord?.[1]);
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    totalX += x;
    totalY += y;
    count += 1;
  }

  if (!count) return null;

  return {
    x: totalX / count,
    y: totalY / count
  };
}

function buildBoundaryGroundShape(center, radius, boundaryPoints) {
  const outerSize = radius * 1.18;
  const outerShape = new THREE.Shape([
    new THREE.Vector2(center.x - outerSize, -(center.z - outerSize)),
    new THREE.Vector2(center.x + outerSize, -(center.z - outerSize)),
    new THREE.Vector2(center.x + outerSize, -(center.z + outerSize)),
    new THREE.Vector2(center.x - outerSize, -(center.z + outerSize))
  ]);

  const boundaryPath = new THREE.Path(
    boundaryPoints.map((point) => new THREE.Vector2(point.x, -point.z))
  );
  outerShape.holes.push(boundaryPath);

  return outerShape;
}

function updateGroundDisk(center, radius, boundaryPoints = []) {
  [groundDisk, groundRing, groundOuterDim, groundFocusBoundary].forEach((item) => {
    if (!item) return;
    groundGroup.remove(item);
    item.geometry.dispose();
    item.material.dispose();
  });
  groundDisk = null;
  groundRing = null;
  groundOuterDim = null;
  groundFocusBoundary = null;

  if (isLabMap) {
    return;
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
  groundDisk.position.set(center.x, isLabMap ? -6.35 : -1.9, center.z);
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
  groundRing.position.set(center.x, isLabMap ? -6.25 : -1.85, center.z);
  groundGroup.add(groundRing);

  const hasBoundary = boundaryPoints.length >= 3;
  const focusRadius = radius * 0.64;
  groundOuterDim = new THREE.Mesh(
    hasBoundary
      ? new THREE.ShapeGeometry(buildBoundaryGroundShape(center, radius, boundaryPoints))
      : new THREE.RingGeometry(focusRadius, radius * 1.08, 160),
    new THREE.MeshBasicMaterial({
      color: "#edf6ff",
      transparent: true,
      opacity: isLabMap ? 0 : hasBoundary ? 0.2 : 0.62,
      depthWrite: false,
      depthTest: true,
      side: THREE.DoubleSide
    })
  );
  groundOuterDim.rotation.x = -Math.PI / 2;
  groundOuterDim.position.set(hasBoundary ? 0 : center.x, hasBoundary ? -1.62 : 0.32, hasBoundary ? 0 : center.z);
  groundOuterDim.renderOrder = hasBoundary ? -1 : 24;
  groundGroup.add(groundOuterDim);

  groundFocusBoundary = hasBoundary
    ? new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(
          [...boundaryPoints, boundaryPoints[0]].map(
            (point) => new THREE.Vector3(point.x, 0.42, point.z)
          )
        ),
        new THREE.LineBasicMaterial({
          color: "#7f9aaa",
          transparent: true,
          opacity: 0.54,
          depthWrite: false,
          depthTest: true
        })
      )
    : new THREE.Mesh(
        new THREE.TorusGeometry(focusRadius, 0.72, 12, 160),
        new THREE.MeshBasicMaterial({
          color: "#7f9aaa",
          transparent: true,
          opacity: 0.34,
          depthWrite: false,
          depthTest: false
        })
      );
  if (!hasBoundary && groundFocusBoundary instanceof THREE.Mesh) {
    groundFocusBoundary.rotation.x = -Math.PI / 2;
    groundFocusBoundary.position.set(center.x, 0.42, center.z);
  }
  groundFocusBoundary.renderOrder = hasBoundary ? 0 : 25;
  groundGroup.add(groundFocusBoundary);
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

function getStaticBuildingHeight(displayNumber, item, rawBuildings) {
  const matchedHeightNumber = BUILDING_HEIGHT_MATCH_OVERRIDES[displayNumber];
  const matchedHeightItem = matchedHeightNumber ? rawBuildings[matchedHeightNumber - 1] : null;
  const heightScale = item.modelHeightScale || BUILDING_HEIGHT_SCALE_OVERRIDES[displayNumber] || 1;
  const heightSourceArea = matchedHeightItem?.area || item.area;
  const heightSourceScale = matchedHeightNumber
    ? BUILDING_HEIGHT_SCALE_OVERRIDES[matchedHeightNumber] || 1
    : heightScale;
  const heightSourceMeters = matchedHeightItem ? null : item.modelHeightMeters;

  return (heightSourceMeters || estimateHeight(heightSourceArea)) * heightSourceScale;
}

function getPublishedHeightOverride(overrides, displayNumber) {
  const override = overrides?.[String(displayNumber)];
  if (!override) return null;

  const hasPublishedHeight =
    Number.isFinite(override.publishedMultiplier) ||
    Boolean(override.publishedCopyFrom);

  return hasPublishedHeight ? override : null;
}

function resolvePublishedBuildingHeight(
  displayNumber,
  fallbackHeight,
  baseHeightByNumber,
  heightOverrides,
  resolving = new Set()
) {
  const override = getPublishedHeightOverride(heightOverrides, displayNumber);
  if (!override) return fallbackHeight;

  const multiplier = Number.isFinite(override.publishedMultiplier)
    ? override.publishedMultiplier
    : 1;
  const copyFrom = override.publishedCopyFrom;

  if (!copyFrom) return fallbackHeight * multiplier;
  if (resolving.has(String(displayNumber))) return fallbackHeight * multiplier;

  resolving.add(String(displayNumber));
  const sourceBaseHeight = baseHeightByNumber.get(String(copyFrom));
  const sourceHeight = sourceBaseHeight
    ? resolvePublishedBuildingHeight(
      copyFrom,
      sourceBaseHeight,
      baseHeightByNumber,
      heightOverrides,
      resolving
    )
    : fallbackHeight;
  resolving.delete(String(displayNumber));

  return sourceHeight * multiplier;
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

function createFunctionalLabelElement(shortName, displayMode, typeKey, interactive) {
  const modeConfig = getBuildingDisplayModeConfig(displayMode);
  const button = document.createElement("button");
  button.type = "button";
  button.className = `scene-label is-dorm is-functional ${modeConfig.labelClass}`;
  button.setAttribute("aria-label", `${modeConfig.label}: ${shortName}`);
  if (!interactive) {
    button.disabled = true;
    button.setAttribute("tabindex", "-1");
  }

  button.dataset.functionalType = typeKey;
  button.dataset.displayMode = modeConfig.key;

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
  syncMapCameraStateFromControls({ updatePanel: true });
  updateCityOverviewFade();
});

renderer.domElement.addEventListener(
  "wheel",
  (event) => {
    if (!cityOverviewState.active || cityOverviewState.dismissed) return;

    const strength = Math.min(Math.abs(event.deltaY) / 260, 1.4);
    const direction = event.deltaY < 0 ? 1 : -1;
    cityOverviewState.wheelZoomFade = THREE.MathUtils.clamp(
      cityOverviewState.wheelZoomFade + direction * strength,
      0,
      1
    );

    updateCityOverviewFade();
  },
  { passive: true }
);

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
  placeSelectedBuildingBeam(selectedBuilding);
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
  placeSelectedBuildingBeam(null);
  setButtonState("2d");
  labelsDirty = true;
  updateStatusText();
}

function applyBoundaryOverviewView() {
  if (!sceneState) return;

  updateOrthoFrustum(sceneState);
  orthoCamera.zoom = 1;
  orthoCamera.updateProjectionMatrix();
  controls.target.copy(sceneState.center3D);
  orthoCamera.position.copy(sceneState.top2DPosition);
  orthoCamera.lookAt(sceneState.center3D);
  controls.update();
  labelsDirty = true;
}

function switchMode(mode) {
  if (!sceneState || isTransitioning || currentMode === mode) return;
  if (mapToolState.active && mapToolState.mode === "camera" && mode !== "3d") {
    mapStatus.textContent = "摄像机工具使用 3D 视角，请切回入口工具后再使用 2D。";
    return;
  }
  if (mapToolState.active && (mapToolState.mode === "boundary" || mapToolState.mode === "road") && mode !== "2d") {
    mapStatus.textContent = mapToolState.mode === "road"
      ? "道路工具使用俯视 2D，请切回入口工具后再使用 3D。"
      : "圈地工具使用俯视 2D，请切回入口工具后再使用 3D。";
    return;
  }

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
    if (isMapToolCameraMode()) {
      resetMapCameraTool();
    } else if (currentMode === "3d") {
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

function applyCityOverviewCamera() {
  if (!sceneState || !cityOverviewState.active || currentMode !== "3d") return;

  const squareSide = sceneState.size.x;
  const target = sceneState.center3D.clone();
  const position = target.clone().add(
    new THREE.Vector3(
      squareSide * 0.52,
      Math.max(squareSide * 0.56, 860),
      squareSide * 0.58
    )
  );

  controls.target.copy(target);
  perspectiveCamera.position.copy(position);
  perspectiveCamera.lookAt(target);
  perspectiveCamera.updateProjectionMatrix();
  controls.update();
  cityOverviewState.defaultDistance = perspectiveCamera.position.distanceTo(controls.target);
  cityOverviewState.wheelZoomFade = 0;
  labelsDirty = true;
  updateCityOverviewFade();
}

function applyAdminCityOverviewView() {
  if (!sceneState) return;

  if (currentMode !== "3d") {
    apply3DView();
  }

  const squareSide = sceneState.size.x;
  const target = sceneState.center3D.clone();
  const position = target.clone().add(
    new THREE.Vector3(
      squareSide * 0.52,
      Math.max(squareSide * 0.56, 860),
      squareSide * 0.58
    )
  );

  controls.target.copy(target);
  perspectiveCamera.position.copy(position);
  perspectiveCamera.lookAt(target);
  perspectiveCamera.updateProjectionMatrix();
  controls.update();

  cityOverviewState.defaultDistance = perspectiveCamera.position.distanceTo(controls.target);
  cityOverviewState.wheelZoomFade = 1;
  document.body.style.setProperty("--city-info-opacity", "0");
  document.body.classList.add("is-city-info-hidden");
  labelsDirty = true;
}

function getCityOverviewInfoOpacity() {
  if (!sceneState) return 1;
  if (!cityOverviewState.active || cityOverviewState.dismissed) return 0;

  if (activeCamera.isOrthographicCamera) {
    const fadeStartZoom = 1.25;
    const fadeEndZoom = 2.65;
    const t = THREE.MathUtils.clamp(
      (orthoCamera.zoom - fadeStartZoom) / (fadeEndZoom - fadeStartZoom),
      0,
      1
    );

    return 1 - t;
  }

  const distance = perspectiveCamera.position.distanceTo(controls.target);
  const baseDistance = cityOverviewState.defaultDistance || distance;
  const fadeStartDistance = baseDistance * 0.98;
  const fadeEndDistance = baseDistance * 0.88;

  const distanceOpacity = THREE.MathUtils.clamp(
    (distance - fadeEndDistance) / (fadeStartDistance - fadeEndDistance),
    0,
    1
  );

  return Math.min(distanceOpacity, 1 - cityOverviewState.wheelZoomFade);
}

function dismissCityOverview() {
  if (!cityOverviewState.active || cityOverviewState.dismissed) return;

  cityOverviewState.active = false;
  cityOverviewState.dismissed = true;
  cityOverviewState.wheelZoomFade = 1;
  document.body.style.setProperty("--city-info-opacity", "0");
  document.body.classList.add(
    "is-city-info-hidden",
    "is-city-overview-dismissed",
    "is-free-map-explore"
  );
  labelsDirty = true;
}

function updateCityOverviewFade() {
  if (!sceneState || !cityOverviewState.active || cityOverviewState.dismissed) return;

  const opacity = getCityOverviewInfoOpacity();
  const visualOpacity = opacity < 0.16 ? 0 : opacity * opacity;
  document.body.style.setProperty("--city-info-opacity", visualOpacity.toFixed(3));
  document.body.classList.toggle("is-city-info-hidden", visualOpacity < 0.04);

  if (visualOpacity <= 0) {
    dismissCityOverview();
  }
}

function createFallbackDetail(building) {
  const fc = building.functionalConfig;
  const modeConfig = getBuildingDisplayModeConfig(building.displayMode);
  return {
    title: fc?.name || `Building ${building.displayNumber}`,
    subtitle: fc?.type || modeConfig.fallbackSubtitle,
    summary:
      `${modeConfig.label} placeholder detail. This building has already entered the ${modeConfig.label} display mode, but its final detail content has not been written yet.`,
    bullets: [
      `Display number: ${building.displayNumber}`,
      `Building id: ${fc?.buildingId || building.stableId}`,
      `Display mode: ${modeConfig.key}`,
      `Type: ${fc?.type || "unknown"}`,
      "Replace this placeholder later with final content."
    ]
  };
}

function setBuildingDetailMode(building) {
  const modeConfig = getBuildingDisplayModeConfig(building.displayMode);
  detailPanel.classList.remove(...BUILDING_DETAIL_MODE_CLASSES);
  detailPanel.classList.add(modeConfig.detailClass);

  const kicker = detailPanel.querySelector(".scene-detail-kicker");
  if (kicker) {
    kicker.textContent = modeConfig.detailKicker;
  }
}

function fillDetailContent(building) {
  setBuildingDetailMode(building);

  if (
    building.displayMode === "dorm" &&
    (guidedPreviewState.active || cityOverviewState.dismissed) &&
    renderGuidedDetailContent(building)
  ) {
    return;
  }

  setGuidedDetailActions(false);
  detailPanel.classList.remove("scene-panel-detail--guided");
  const fc = building.functionalConfig;
  const modeConfig = getBuildingDisplayModeConfig(building.displayMode);
  const content = (fc && DETAIL_CONTENT[fc.buildingId]) || createFallbackDetail(building);

  detailTitle.textContent = content.title;
  detailCode.textContent = `${modeConfig.label} · ${building.stableId} · ${fc?.shortName || building.displayNumber}`;

  const bulletHtml = (content.bullets || [])
    .map((item) => `<li>${escapeHtml(item)}</li>`)
    .join("");

  detailScroll.innerHTML = `
    <p>${escapeHtml(content.summary)}</p>

    <div class="detail-placeholder-block detail-placeholder-block--${modeConfig.key}">
      <h4>${modeConfig.detailBlockTitle}</h4>
      <ul>${bulletHtml}</ul>
    </div>

    <div class="detail-placeholder-block detail-placeholder-block--${modeConfig.key}">
      <h4>${modeConfig.frameworkTitle}</h4>
      <p>${modeConfig.frameworkCopy}</p>
      <p>当前框架入口：config/functional-buildings.json 的 displayMode 字段决定建筑进入哪一套 UI 和交互逻辑。</p>
    </div>
  `;

  detailScroll.scrollTop = 0;
}

function focusBuildingForCurrentContext(building) {
  if (guidedPreviewState.active || cityOverviewState.dismissed) {
    focusBuildingFromEntry(building);
    return;
  }

  focusBuilding(building);
}

function openBuildingDetail(building) {
  if (!building?.functionalConfig?.interactive) return;

  selectedBuilding = building;
  refreshBuildingStyles();
  fillDetailContent(building);
  setSidePanelState("detail");
  labelsDirty = true;
  updateStatusText();
  syncSceneAfterLayoutChange();
}

function openFunctionalDetail(building) {
  openBuildingDetail(building);
}

function handleBuildingLabelInteraction(building) {
  const functionalConfig = building?.functionalConfig;
  if (!functionalConfig?.interactive) return;

  if (isAdminPreview) {
    postAdminPreviewBuildingSelection(building);
    return;
  }

  if (cityOverviewState.active && !cityOverviewState.dismissed) {
    return;
  }

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
      focusBuildingForCurrentContext(building);
      openBuildingDetail(building);
    });
    return;
  }

  focusBuildingForCurrentContext(building);
  openBuildingDetail(building);
}

function closeFunctionalDetail() {
  const viewState = lastBrowseViewState;

  selectedBuilding = null;
  guidedPreviewState.navigationTargetMode = null;
  guidedPreviewState.navigationCategoryViewActive = false;
  clearGuidedNavigationRoutes();
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
  if (isAdminPreview) return;

  if (guidedPreviewState.active) {
    window.location.href = "explore.html";
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

function findAdminPreviewBuilding(buildingNumber) {
  const targetNumber = String(buildingNumber || "").trim();
  if (!targetNumber) return null;
  return buildingObjects.find((item) => String(item.displayNumber) === targetNumber) || null;
}

function getAdminPreviewBuildingCatalog() {
  return buildingObjects.map((building) => ({
    buildingNumber: String(building.displayNumber),
    buildingId: building.functionalConfig?.buildingId || "",
    name: building.functionalConfig?.name || `Building ${building.displayNumber}`,
    shortName: building.functionalConfig?.shortName || String(building.displayNumber),
    displayMode: building.displayMode || "",
    baseHeight: Number(formatEntranceNumber(building.baseHeight || building.currentHeight || 0)),
    currentHeight: Number(formatEntranceNumber(building.currentHeight || 0))
  }));
}

function postAdminPreviewReady() {
  if (!isAdminPreview || window.parent === window) return;

  window.parent.postMessage(
    {
      source: "anu-explore-preview",
      type: "ready",
      buildings: getAdminPreviewBuildingCatalog()
    },
    window.location.origin
  );
}

function postAdminPreviewBuildingSelection(building) {
  if (!isAdminPreview || window.parent === window || !building) return;

  window.parent.postMessage(
    {
      source: "anu-explore-preview",
      type: "select-building",
      buildingNumber: String(building.displayNumber || ""),
      buildingId: building.functionalConfig?.buildingId || "",
      displayMode: building.displayMode || ""
    },
    window.location.origin
  );
}

function resetAdminPreviewHeightScales() {
  buildingObjects.forEach((building) => {
    building.mesh3D.scale.y = 1;
    building.edge3D.scale.y = 1;
  });
}

function setAdminPreviewMode(mode) {
  document.body.classList.toggle("is-admin-height-preview", mode === "height");
  document.body.classList.toggle("is-admin-dorm-preview", mode === "dorm");
}

function renderAdminOverviewPreview() {
  setAdminPreviewMode("overview");
  resetAdminPreviewHeightScales();
  selectedBuilding = null;
  clearGuidedNavigationRoutes();
  setGuidedNavigationButtonActive(false);
  setSidePanelState("overview");

  applyAdminCityOverviewView();

  showNormalLabels = true;
  refreshBuildingStyles();
  setNumbersButtonState();
  updateStatusText();
  updateLabels(true);
}

function renderAdminDormPreview(building, preview) {
  if (!building) return;

  setAdminPreviewMode("dorm");
  resetAdminPreviewHeightScales();
  selectedBuilding = building;

  if (currentMode !== "3d") apply3DView();
  focusBuildingFromEntry(building);
  setSidePanelState("detail");
  detailPanel.classList.add("scene-panel-detail--guided");
  setGuidedDetailActions(true);

  detailTitle.textContent = preview.name || building.functionalConfig?.name || "Selected dorm";
  detailCode.textContent = "Admin live preview";

  const quickPoints = [
    ["Best for", preview.bestFor],
    ["Location feel", preview.locationFeel],
    ["Main trade-off", preview.tradeOff]
  ].filter(([, value]) => value);

  detailScroll.innerHTML = `
    <div class="information-drawer-panel information-drawer-panel--guided information-drawer-panel--guided-compact">
      <p class="information-drawer__eyebrow">Residence detail</p>
      <h2 class="information-drawer__title">${escapeHtml(preview.name || "")}</h2>
      <p class="information-drawer__summary">${escapeHtml(preview.summary || "")}</p>

      <div class="information-drawer__facts">
        <div>
          <span>Rent</span>
          <strong>${escapeHtml(preview.rentText || "Not listed")}</strong>
        </div>
        <div>
          <span>Type</span>
          <strong>${escapeHtml(preview.type || "—")}</strong>
        </div>
        <div>
          <span>Location</span>
          <strong>${escapeHtml(preview.location || "—")}</strong>
        </div>
      </div>

      <div class="information-drawer__compact-notes">
        ${quickPoints
          .map(([label, value]) => `
            <section class="information-drawer__compact-note">
              <h3>${escapeHtml(label)}</h3>
              <p>${escapeHtml(value)}</p>
            </section>
          `)
          .join("")}
      </div>
    </div>
  `;

  detailScroll.scrollTop = 0;
  refreshBuildingStyles();
  updateLabels(true);
}

function getAdminPreviewHeight(building, preview) {
  const multiplier = Number.isFinite(Number(preview.multiplier))
    ? Math.max(Number(preview.multiplier), 0.01)
    : 1;
  const copyFrom = findAdminPreviewBuilding(preview.copyFromBuildingNumber);
  const sourceHeight = copyFrom
    ? copyFrom.currentHeight || copyFrom.baseHeight || building.currentHeight
    : building.baseHeight || building.currentHeight;

  return sourceHeight * multiplier;
}

function applyAdminHeightPreview(preview) {
  setAdminPreviewMode("height");
  resetAdminPreviewHeightScales();
  setSidePanelState("overview");
  clearGuidedNavigationRoutes();

  if (currentMode !== "3d") apply3DView();

  const targetNumbers = Array.isArray(preview.buildingNumbers)
    ? preview.buildingNumbers.map((item) => String(item).trim()).filter(Boolean).slice(0, 5)
    : [];
  const primaryBuilding = findAdminPreviewBuilding(targetNumbers[0] || preview.buildingNumber);

  targetNumbers.forEach((buildingNumber) => {
    const building = findAdminPreviewBuilding(buildingNumber);
    if (!building) return;

    const nextHeight = getAdminPreviewHeight(building, preview);
    const currentHeight = Math.max(building.currentHeight || building.baseHeight || 1, 1);
    const scaleY = THREE.MathUtils.clamp(nextHeight / currentHeight, 0.05, 8);
    building.mesh3D.scale.y = scaleY;
    building.edge3D.scale.y = scaleY;
  });

  selectedBuilding = primaryBuilding;
  if (primaryBuilding) focusBuilding(primaryBuilding);
  showNormalLabels = true;
  refreshBuildingStyles();
  setNumbersButtonState();
  updateStatusText();
  updateLabels(true);
}

function handleAdminPreviewMessage(event) {
  if (!isAdminPreview || event.origin !== window.location.origin) return;
  const message = event.data || {};
  if (message.source !== "anu-admin") return;

  if (message.type === "map-set-developer-labels") {
    setDeveloperLabelsEnabled(!!message.enabled);
    return;
  }

  if (message.type === "get-buildings") {
    postAdminPreviewReady();
    return;
  }

  if (message.type === "overview-preview") {
    renderAdminOverviewPreview();
    return;
  }

  if (message.type === "dorm-preview") {
    renderAdminDormPreview(
      findAdminPreviewBuilding(message.buildingNumber),
      message.preview || {}
    );
    return;
  }

  if (message.type === "height-preview") {
    applyAdminHeightPreview(message.preview || {});
    return;
  }

  if (!mapToolState.active) return;

  if (message.type === "map-tool-set-mode") {
    setMapToolMode(message.mode);
    syncMapToolMode();
    updateMapToolPanel();
    return;
  }

  if (message.type === "map-tool-toggle-input") {
    toggleMapToolInputMode();
    return;
  }

  if (message.type === "map-tool-road-action") {
    setMapRoadAction(message.action);
    return;
  }

  if (message.type === "map-tool-boundary-area") {
    setActiveMapBoundaryArea(Number(message.areaIndex));
    return;
  }

  if (message.type === "map-tool-delete-boundary-area") {
    deleteMapBoundaryArea(Number(message.areaIndex));
    return;
  }

  if (message.type === "map-tool-toggle-boundary-labels") {
    toggleMapBoundaryLabels();
    return;
  }

  if (message.type === "map-tool-set-developer-labels") {
    setDeveloperLabelsEnabled(!!message.enabled);
    return;
  }

  if (message.type === "map-tool-camera-grid") {
    setMapCameraGridEnabled(!!message.enabled);
    return;
  }

  if (message.type === "map-tool-camera-pitch") {
    setMapCameraPitch(message.value);
    return;
  }

  if (message.type === "map-tool-camera-height") {
    setMapCameraHeight(message.value);
    return;
  }

  if (message.type === "map-tool-delete-last") {
    deleteLastMapToolPoint();
    return;
  }

  if (message.type === "map-tool-clear") {
    clearMapToolPoints();
    return;
  }

  if (message.type === "map-tool-get-state") {
    updateMapToolPanel();
  }
}

window.addEventListener("message", handleAdminPreviewMessage);

/* =========================================================
   BUILDING STYLE APPLICATION
   ========================================================= */

function refreshBuildingStyles() {
  for (const building of buildingObjects) {
    const fc = building.functionalConfig;
    const typeConfig = building.typeConfig;
    const isSelected =
      selectedBuilding && selectedBuilding.displayNumber === building.displayNumber;
    const insideCampus = building.isInsideCampusBoundary || !!isSelected;

    if (fc && typeConfig) {
      building.mesh3D.material.color.set(
        getBuildingVisualColor(
          isSelected ? typeConfig.selectedColor : typeConfig.baseColor,
          building,
          insideCampus
        )
      );
      building.mesh2D.material.color.set(
        getBuildingVisualColor(
          isSelected ? typeConfig.selectedColor : typeConfig.baseColor,
          building,
          insideCampus
        )
      );
      building.edge3D.material.color.set(
        getBuildingVisualColor(
          isSelected ? typeConfig.selectedEdgeColor : typeConfig.edgeColor,
          building,
          insideCampus,
          0.88
        )
      );
      building.edge2D.material.color.set(
        getBuildingVisualColor(
          isSelected ? typeConfig.selectedEdgeColor : typeConfig.edgeColor,
          building,
          insideCampus,
          0.88
        )
      );

      if (building.functionalLabelEl) {
        building.functionalLabelEl.classList.toggle("is-selected", !!isSelected);
        applyFunctionalLabelVisual(building.functionalLabelEl, typeConfig, !!isSelected);
      }
    } else {
      building.mesh3D.material.color.set(
        getBuildingVisualColor("#d6d5cf", building, insideCampus)
      );
      building.mesh2D.material.color.set(
        getBuildingVisualColor("#d6d5cf", building, insideCampus)
      );
      building.edge3D.material.color.set(
        getBuildingVisualColor("#bdbbb5", building, insideCampus, 0.88)
      );
      building.edge2D.material.color.set(
        getBuildingVisualColor("#bdbbb5", building, insideCampus, 0.88)
      );
    }
  }

  placeSelectedBuildingBeam(selectedBuilding);
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
      const polygonCenter = getPolygonCenter(polygonCoords[0]);
      const insideCampus = isSourcePointInsideCampusBoundary(
        polygonCenter.x,
        polygonCenter.y,
        centerX,
        centerY
      );
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
          color: getCampusMutedColor(options.color3D, insideCampus, 0.86),
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
          color: getCampusMutedColor(options.color2D, insideCampus, 0.86),
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
      const sourceCenter = getCoordinateCenter(coords);
      const insideCampus = sourceCenter
        ? isSourcePointInsideCampusBoundary(sourceCenter.x, sourceCenter.y, centerX, centerY)
        : true;

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
          color: getCampusMutedColor(options.color3D, insideCampus, 0.9),
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
          color: getCampusMutedColor(options.color2D, insideCampus, 0.9),
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
  const mutedSphereMaterial3D = new THREE.MeshStandardMaterial({
    color: getCampusMutedColor("#8fd26a", false, 0.88),
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
  const mutedCircleMaterial2D = new THREE.MeshStandardMaterial({
    color: getCampusMutedColor("#8fd26a", false, 0.88),
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
        const insideCampus = isSourcePointInsideCampusBoundary(x, y, centerX, centerY);
        treeScenePoints.push({ x: local.x, z: local.z });

        const tree3D = new THREE.Mesh(
          sphereGeometry,
          insideCampus ? sphereMaterial3D : mutedSphereMaterial3D
        );
        tree3D.position.set(local.x, 3.8, local.z);
        environment3D.add(tree3D);

        const tree2D = new THREE.Mesh(
          circleGeometry,
          insideCampus ? circleMaterial2D : mutedCircleMaterial2D
        );
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
      const insideCampus = isSourcePointInsideCampusBoundary(
        center.x,
        center.y,
        centerX,
        centerY
      );
      treeScenePoints.push({ x: local.x, z: local.z });

      const tree3D = new THREE.Mesh(
        sphereGeometry,
        insideCampus ? sphereMaterial3D : mutedSphereMaterial3D
      );
      tree3D.position.set(local.x, 3.8, local.z);
      environment3D.add(tree3D);

      const tree2D = new THREE.Mesh(
        circleGeometry,
        insideCampus ? circleMaterial2D : mutedCircleMaterial2D
      );
      tree2D.rotation.x = -Math.PI / 2;
      tree2D.position.set(local.x, 0.16, local.z);
      environment2D.add(tree2D);

      count += 1;
    }
  }

  return count;
}

function addTerrainReliefLayer(reliefData, centerX, centerY) {
  if (!isLabMap || pageParams.get("terrain") !== "on" || !reliefData?.elevations?.length) return;

  const cols = Number(reliefData.cols);
  const rows = Number(reliefData.rows);
  const minX = Number(reliefData.minX);
  const minY = Number(reliefData.minY);
  const maxX = Number(reliefData.maxX);
  const maxY = Number(reliefData.maxY);
  const minElevation = Number(reliefData.minElevation);
  const maxElevation = Number(reliefData.maxElevation);
  const elevationRange = Math.max(maxElevation - minElevation, 1);

  if (
    !Number.isInteger(cols) ||
    !Number.isInteger(rows) ||
    cols < 2 ||
    rows < 2 ||
    reliefData.elevations.length !== cols * rows
  ) {
    return;
  }

  const positions = [];
  const colors = [];
  const indices = [];
  const lowColor = new THREE.Color("#efe9dc");
  const midColor = new THREE.Color("#ded5bf");
  const highColor = new THREE.Color("#c7b99f");

  for (let row = 0; row < rows; row += 1) {
    const sourceY = minY + ((maxY - minY) * row) / (rows - 1);

    for (let col = 0; col < cols; col += 1) {
      const sourceX = minX + ((maxX - minX) * col) / (cols - 1);
      const elevation = Number(reliefData.elevations[row * cols + col]);
      const t = THREE.MathUtils.clamp((elevation - minElevation) / elevationRange, 0, 1);
      const local = toSceneXZ(sourceX, sourceY, centerX, centerY, 1);
      const heightY = -5.8 + t * 5.25;
      const color = t < 0.55
        ? lowColor.clone().lerp(midColor, t / 0.55)
        : midColor.clone().lerp(highColor, (t - 0.55) / 0.45);

      positions.push(local.x, heightY, local.z);
      colors.push(color.r, color.g, color.b);
    }
  }

  for (let row = 0; row < rows - 1; row += 1) {
    for (let col = 0; col < cols - 1; col += 1) {
      const a = row * cols + col;
      const b = a + 1;
      const c = a + cols;
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  const material = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 1,
    metalness: 0,
    side: THREE.DoubleSide
  });

  const reliefMesh = new THREE.Mesh(geometry, material);
  reliefMesh.renderOrder = -4;
  terrainReliefGroup.clear();
  terrainReliefGroup.add(reliefMesh);
}

async function loadEnvironmentLayers(centerX, centerY) {
  const [roadsGeo, greenGeo, treesGeo, water0Geo, water2Geo] = await Promise.all([
    fetchGeoJsonSafe(topoPath("roads.geojson")),
    fetchGeoJsonSafe(topoPath("green.geojson")),
    fetchGeoJsonSafe(topoPath("trees.geojson")),
    fetchGeoJsonSafe(topoPath("water0.geojson")),
    fetchGeoJsonSafe(topoPath("water2.geojson"))
  ]);

  buildEntranceRoadSegments(roadsGeo, centerX, centerY);

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

function getBuildingDisplayMode(functionalConfig) {
  if (!functionalConfig) return null;

  const explicitMode = functionalConfig.displayMode || functionalConfig.mode;
  if (explicitMode === "residence") return "dorm";
  if (explicitMode === "function") return "functional";
  if (BUILDING_DISPLAY_MODES[explicitMode]) return explicitMode;

  if (
    functionalConfig.type === "dorm" ||
    String(functionalConfig.buildingId || "").startsWith("dorm_")
  ) {
    return "dorm";
  }

  return "functional";
}

function getBuildingDisplayModeConfig(displayMode) {
  return BUILDING_DISPLAY_MODES[displayMode] || BUILDING_DISPLAY_MODES.functional;
}

function getBuildingStyleConfig(functionalConfig) {
  if (!functionalConfig) return null;

  const typeConfig = getTypeConfig(functionalConfig.type);
  const modeConfig = getBuildingDisplayModeConfig(getBuildingDisplayMode(functionalConfig));

  return {
    ...(typeConfig || {}),
    ...modeConfig.style,
    displayMode: modeConfig.key
  };
}

async function loadScene() {
  try {
    const [
      buildingTypesData,
      functionalBuildingsData,
      detailContentData,
      dormEntrancesData,
      campusBoundaryData,
      terrainReliefData,
      buildingsGeoJson
    ] = await Promise.all([
      fetchJsonStrict(configPath("building-types.json")),
      fetchJsonStrict(configPath("functional-buildings.json")),
      fetchJsonStrict(configPath("detail-content.json")),
      fetchJsonStrict(configPath("dorm-entrances.json")),
      fetchJsonStrict(configPath("campus-boundary.json")),
      isLabMap ? fetchJsonSafe(topoPath("terrain-relief.json")) : Promise.resolve(null),
      fetchJsonStrict(topoPath("buildings.geojson"))
    ]);

    BUILDING_TYPES = buildingTypesData;
    FUNCTIONAL_BUILDINGS = functionalBuildingsData || {};
    DETAIL_CONTENT = detailContentData || {};
    DORM_ENTRANCES = dormEntrancesData || {};
    CAMPUS_BOUNDARIES = campusBoundaryData || {};

    const buildingLabelOverrides = await loadBuildingLabelOverrides();
    if (buildingLabelOverrides.rows.length) {
      FUNCTIONAL_BUILDINGS = applyBuildingLabelOverrides(
        FUNCTIONAL_BUILDINGS,
        buildingLabelOverrides,
        DORMS
      );
    }

    const buildingHeightOverrides = await loadBuildingHeightOverrides();

    const features = buildingsGeoJson.features || [];
    if (!features.length) {
      throw new Error("Building GeoJSON contains no features.");
    }

    const bounds = collectBounds(features);
    mapToolState.bounds = mapToolState.active ? bounds : null;
    entranceToolState.bounds = entranceToolState.active ? bounds : null;
    entranceNavigationState.bounds = entranceNavigationState.active ? bounds : null;
    boundaryToolState.bounds = (boundaryToolState.active || mapToolState.active) ? bounds : null;
    campusBoundaryScenePoints = isLabMap
      ? []
      : getCampusBoundaryScenePoints("anu", bounds);
    campusTerritoryScenePoints = getCampusBoundaryScenePoints("anu", bounds);
    drawCampusTerritoryBoundary(campusTerritoryScenePoints);
    const rawBuildings = [];
    let skippedCount = 0;

    treeScenePoints.length = 0;
    await loadEnvironmentLayers(bounds.centerX, bounds.centerY);
    setupEntranceNavigationLayer();

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
            featureId: String(feature.id ?? ""),
            modelDisplayNumber: Number.isInteger(Number(feature.properties?.modelDisplayNumber))
              ? Number(feature.properties.modelDisplayNumber)
              : null,
            modelHideNormalLabel: feature.properties?.modelHideNormalLabel === true,
            modelHeightScale: Number(feature.properties?.modelHeightScale) || null,
            modelHeightMeters: Number(feature.properties?.modelHeightMeters) || null,
            modelMergeFeatureIds: Array.isArray(feature.properties?.modelMergeFeatureIds)
              ? feature.properties.modelMergeFeatureIds.map(String)
              : [],
            modelMergedInto: feature.properties?.modelMergedInto
              ? String(feature.properties.modelMergedInto)
              : "",
            shape,
            area,
            sourceCenterX: center.x,
            sourceCenterY: center.y,
            isInsideCampusBoundary: isSourcePointInsideCampusBoundary(
              center.x,
              center.y,
              bounds.centerX,
              bounds.centerY
            ),
            isInsideCampusTerritory: isSourcePointInsideCampusTerritory(
              center.x,
              center.y,
              bounds.centerX,
              bounds.centerY
            )
          });
        }
      } catch (featureError) {
        console.warn("Skipped one feature:", featureError);
        skippedCount += 1;
      }
    }

    rawBuildings.sort((a, b) => {
      if (a.modelDisplayNumber && b.modelDisplayNumber) {
        return a.modelDisplayNumber - b.modelDisplayNumber;
      }
      if (a.modelDisplayNumber) return -1;
      if (b.modelDisplayNumber) return 1;
      if (Math.abs(b.sourceCenterY - a.sourceCenterY) > 0.0001) {
        return b.sourceCenterY - a.sourceCenterY;
      }
      return a.sourceCenterX - b.sourceCenterX;
    });

    const baseHeightByNumber = new Map();
    rawBuildings.forEach((item, index) => {
      const displayNumber = item.modelDisplayNumber || index + 1;
      if (item.modelMergedInto) return;
      baseHeightByNumber.set(
        String(displayNumber),
        getStaticBuildingHeight(displayNumber, item, rawBuildings)
      );
    });

    rawBuildings.forEach((item, index) => {
      const displayNumber = item.modelDisplayNumber || index + 1;
      if (item.modelMergedInto) return;

      const stableId = `B${String(displayNumber).padStart(4, "0")}`;
      const functionalConfig = getFunctionalConfigForNumber(displayNumber);
      const displayMode = getBuildingDisplayMode(functionalConfig);
      const typeConfig = getBuildingStyleConfig(functionalConfig);
      const mergedItems = item.modelMergeFeatureIds
        .map((featureId) => rawBuildings.find((modelItem) => modelItem.featureId === featureId))
        .filter(Boolean);
      const modelShapes = [item, ...mergedItems].map((modelItem) => modelItem.shape);
      const baseHeight = baseHeightByNumber.get(String(displayNumber)) ||
        getStaticBuildingHeight(displayNumber, item, rawBuildings);
      const height = resolvePublishedBuildingHeight(
        displayNumber,
        baseHeight,
        baseHeightByNumber,
        buildingHeightOverrides.overrides
      );

      const mesh3DMaterial = new THREE.MeshStandardMaterial({
        color: typeConfig ? typeConfig.baseColor : "#d6d5cf",
        roughness: 0.97,
        metalness: 0.02
      });

      const edge3DMaterial = new THREE.LineBasicMaterial({
        color: typeConfig ? typeConfig.edgeColor : "#bdbbb5"
      });

      const mesh2DMaterial = new THREE.MeshStandardMaterial({
        color: typeConfig ? typeConfig.baseColor : "#d6d5cf",
        roughness: 0.99,
        metalness: 0.01,
        side: THREE.DoubleSide
      });

      const edge2DMaterial = new THREE.LineBasicMaterial({
        color: typeConfig ? typeConfig.edgeColor : "#bdbbb5"
      });

      const geometry3D = new THREE.ExtrudeGeometry(modelShapes, {
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

      const geometry2D = new THREE.ShapeGeometry(modelShapes);
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
          displayMode,
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
        displayMode,
        functionalConfig,
        typeConfig,
        baseHeight,
        currentHeight: height,
        mesh3D,
        edge3D,
        mesh2D,
        edge2D,
        normalLabelEl,
        functionalLabelEl,
        hideNormalLabel: item.modelHideNormalLabel,
        focusCenter,
        focusSize,
        isInsideCampusBoundary: item.isInsideCampusBoundary,
        isInsideCampusTerritory: item.isInsideCampusTerritory,
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
          handleBuildingLabelInteraction(building);
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

    updateGroundDisk(worldCenter, diskRadius, campusBoundaryScenePoints);
    addTerrainReliefLayer(terrainReliefData, bounds.centerX, bounds.centerY);

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
    applyCityOverviewCamera();
    if (boundaryToolState.active) {
      apply2DView();
    }
    refreshBuildingStyles();
    updateStatusText();
    if (mapToolState.active) {
      mapStatus.textContent = "地图工具已开启。点击地图记录点位坐标。";
      syncMapToolMode();
    }
    if (boundaryToolState.active) {
      mapStatus.textContent = "Boundary picker active. Right-click to add points; right-click near point 1 to close.";
    }
    updateCityOverviewFade();
    syncSceneAfterLayoutChange();
    updateLabels(true);
    focusBuildingFromUrl();
    postAdminPreviewReady();
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

function getOrthoVisibleSpan() {
  const baseSpan = orthoCamera.top - orthoCamera.bottom;
  return baseSpan / Math.max(orthoCamera.zoom || 1, 0.001);
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

  const boundaryLabelMode = isMapToolBoundaryLabelMode();
  const orthoSpan = boundaryLabelMode
    ? getOrthoVisibleSpan()
    : orthoCamera.top - orthoCamera.bottom;
  const nearSpan = 420;
  const farSpan = 2600;

  const t = THREE.MathUtils.clamp(
    (orthoSpan - nearSpan) / (farSpan - nearSpan),
    0,
    1
  );

  const eased = t * t * (3 - 2 * t);
  if (boundaryLabelMode) {
    return THREE.MathUtils.lerp(1.45, 0.95, eased);
  }

  return THREE.MathUtils.lerp(0.88, 0.48, eased);
}

function getLabelProjectionMetrics() {
  const canvasRect = renderer.domElement.getBoundingClientRect();
  const layerRect = labelLayer.getBoundingClientRect();
  const width = canvasRect.width || container.clientWidth || layerRect.width;
  const height = canvasRect.height || container.clientHeight || layerRect.height;

  return {
    width,
    height,
    offsetX: canvasRect.left - layerRect.left,
    offsetY: canvasRect.top - layerRect.top
  };
}

function getProjectedLabelPosition(anchor, metrics) {
  const projected = anchor.clone().project(activeCamera);
  return {
    projected,
    x: metrics.offsetX + (projected.x * 0.5 + 0.5) * metrics.width,
    y: metrics.offsetY + (-projected.y * 0.5 + 0.5) * metrics.height
  };
}

function placeLabel(el, x, y, scale) {
  el.style.display = "block";
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  el.style.scale = "";
  el.style.transform = `translate(-50%, -100%) scale(${scale})`;
}

function updateEntranceRouteTimeLabels(metrics) {
  for (const item of entranceRouteTimeLabels) {
    if (!activeEntranceRouteLabelId || item.routeId !== activeEntranceRouteLabelId) {
      item.el.style.display = "none";
      continue;
    }

    const projected = item.anchor.clone().project(activeCamera);
    const visible =
      projected.z >= -1 &&
      projected.z <= 1 &&
      projected.x >= -1.1 &&
      projected.x <= 1.1 &&
      projected.y >= -1.1 &&
      projected.y <= 1.1;

    if (!visible) {
      item.el.style.display = "none";
      continue;
    }

    const x = metrics.offsetX + (projected.x * 0.5 + 0.5) * metrics.width;
    const y = metrics.offsetY + (-projected.y * 0.5 + 0.5) * metrics.height;
    item.el.style.display = "block";
    item.el.style.left = `${x}px`;
    item.el.style.top = `${y}px`;
  }
}

function updateLabels(force = false) {
  const boundaryToolMode = isMapToolBoundaryMode();
  const boundaryLabelMode = isMapToolBoundaryLabelMode();
  const modeKey = `${currentMode}-${showNormalLabels}-${boundaryLabelMode}-${selectedBuilding?.displayNumber || "none"}`;
  if (!force && !labelsDirty && !cameraTween && modeKey === lastLabelMode) return;

  labelsDirty = false;
  lastLabelMode = modeKey;

  const labelMetrics = getLabelProjectionMetrics();
  const { width, height } = labelMetrics;

  updateEntranceRouteTimeLabels(labelMetrics);

  for (const building of buildingObjects) {
    if (!building.functionalLabelEl) continue;

    if (boundaryToolMode) {
      building.functionalLabelEl.style.display = "none";
      continue;
    }

    if (
      guidedPreviewState.active &&
      guidedPreviewState.entryBuildingId &&
      building.functionalConfig?.buildingId !== guidedPreviewState.entryBuildingId
    ) {
      building.functionalLabelEl.style.display = "none";
      continue;
    }

    const anchor = currentMode === "3d" ? building.anchor3D : building.anchor2D;
    const { projected, x, y } = getProjectedLabelPosition(anchor, labelMetrics);

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

    const scale = getFunctionalLabelScale(anchor);

    placeLabel(building.functionalLabelEl, x, y, scale);
  }

  const developerMode = boundaryToolMode ? boundaryLabelMode : showNormalLabels;

  if (!developerMode) {
    for (const building of buildingObjects) {
      building.normalLabelEl.style.display = "none";
    }
    return;
  }

  let zoomAllowsLabels = true;
  let maxLabels = boundaryLabelMode
    ? buildingObjects.length
    : currentMode === "2d"
      ? 220
      : 72;

  if (boundaryLabelMode) {
    zoomAllowsLabels = true;
  } else if (currentMode === "2d") {
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
    if (!boundaryLabelMode && building.hideNormalLabel) {
      building.normalLabelEl.style.display = "none";
      continue;
    }

    if (!boundaryLabelMode && building.functionalLabelEl) {
      building.normalLabelEl.style.display = "none";
      continue;
    }

    const anchor = currentMode === "3d" ? building.anchor3D : building.anchor2D;
    const { projected, x, y } = getProjectedLabelPosition(anchor, labelMetrics);

    const screenMargin = boundaryLabelMode ? 1.22 : 1.08;
    const visible =
      projected.z >= -1 &&
      projected.z <= 1 &&
      projected.x >= -screenMargin &&
      projected.x <= screenMargin &&
      projected.y >= -screenMargin &&
      projected.y <= screenMargin;

    if (!visible) {
      building.normalLabelEl.style.display = "none";
      continue;
    }

    const scale = getNormalLabelScale(anchor);

    candidates.push({
      building,
      x,
      y,
      scale,
      dx: x - (labelMetrics.offsetX + width / 2),
      dy: y - (labelMetrics.offsetY + height / 2)
    });
  }

  if (!boundaryLabelMode) {
    candidates.sort((a, b) => {
      const da = a.dx * a.dx + a.dy * a.dy;
      const db = b.dx * b.dx + b.dy * b.dy;
      return da - db;
    });
  }

  const chosen = candidates.slice(0, maxLabels);
  const chosenSet = new Set(chosen.map((item) => item.building));

  for (const item of chosen) {
    placeLabel(item.building.normalLabelEl, item.x, item.y, item.scale);
  }

  for (const building of buildingObjects) {
    if (!chosenSet.has(building)) {
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
  if (isMapToolBoundaryMode()) return;

  setDeveloperLabelsEnabled(!showNormalLabels);
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
  syncMapCameraStateFromControls();
  updateCityOverviewFade();
  updateLabels(false);
  updateSelectedBuildingBeam(now);
  renderer.render(scene, activeCamera);
  requestAnimationFrame(animate);
}

loadScene();
animate();

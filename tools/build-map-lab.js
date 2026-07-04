#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const repoRoot = path.resolve(__dirname, "..");
const sourceRoot = path.resolve(
  process.argv[2] || "/Users/terry/Downloads/topoexport-5FAEE9"
);
const outputRoot = path.join(repoRoot, "topo-lab");
const forcedMissingDisplayNumbers = new Set([963, 1016, 1089, 1176]);
const hiddenDisplayNumbers = new Set([683, 863, 877]);
const customLabBuildings = [
  {
    id: "lab_custom_unnumbered_001",
    displayNumber: 863,
    height: 9,
    ring: [
      [692884.962, 6094179.821],
      [692897.708, 6094188.64],
      [692950.018, 6094146.761],
      [692942.77, 6094136.889],
      [692884.962, 6094179.821]
    ]
  }
];

const sourceFiles = {
  buildings: "buildings_3d_Buildings_OSM.geojson",
  roads: "roads_Roads_OSM.geojson",
  green: "green_areas_Green Area_OSM.geojson",
  railways: "railways_Railways_OSM.geojson",
  trees: "trees_Trees_OSM.geojson",
  water0: "waterways_Waterways_OSM_0.geojson",
  water2: "waterways_Waterways_OSM_2.geojson",
  contours: "contours_Digital Elevation Model_5m_Geoscience_Australia.geojson",
  frame: "frame.geojson"
};

const baseFiles = {
  buildings: path.join(repoRoot, "topo", "buildings.geojson"),
  roads: path.join(repoRoot, "topo", "roads.geojson"),
  green: path.join(repoRoot, "topo", "green.geojson"),
  trees: path.join(repoRoot, "topo", "trees.geojson"),
  water0: path.join(repoRoot, "topo", "water0.geojson"),
  water2: path.join(repoRoot, "topo", "water2.geojson")
};

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function writeJson(file, data) {
  fs.writeFileSync(file, `${JSON.stringify(data)}\n`);
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function getSourceFile(name) {
  return path.join(sourceRoot, sourceFiles[name]);
}

function cleanRing(ring) {
  if (!Array.isArray(ring)) return [];
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

function getPolygonSets(geometry) {
  if (!geometry) return [];
  if (geometry.type === "Polygon") return [geometry.coordinates];
  if (geometry.type === "MultiPolygon") return geometry.coordinates;
  return [];
}

function getCenter(ring) {
  let totalX = 0;
  let totalY = 0;
  let count = 0;

  for (const point of ring) {
    const x = Number(point[0]);
    const y = Number(point[1]);
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    totalX += x;
    totalY += y;
    count += 1;
  }

  return count
    ? {
        x: totalX / count,
        y: totalY / count
      }
    : null;
}

function getBounds(ring) {
  const bounds = {
    minX: Infinity,
    minY: Infinity,
    maxX: -Infinity,
    maxY: -Infinity
  };

  for (const point of ring) {
    const x = Number(point[0]);
    const y = Number(point[1]);
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    bounds.minX = Math.min(bounds.minX, x);
    bounds.minY = Math.min(bounds.minY, y);
    bounds.maxX = Math.max(bounds.maxX, x);
    bounds.maxY = Math.max(bounds.maxY, y);
  }

  return Number.isFinite(bounds.minX) ? bounds : null;
}

function getBoundsArea(bounds) {
  return Math.max(bounds.maxX - bounds.minX, 0) * Math.max(bounds.maxY - bounds.minY, 0);
}

function getBoundsIntersectionArea(a, b) {
  const width = Math.max(0, Math.min(a.maxX, b.maxX) - Math.max(a.minX, b.minX));
  const height = Math.max(0, Math.min(a.maxY, b.maxY) - Math.max(a.minY, b.minY));
  return width * height;
}

function getBoundsIoU(a, b) {
  const intersection = getBoundsIntersectionArea(a, b);
  const union = getBoundsArea(a) + getBoundsArea(b) - intersection;
  return union > 0 ? intersection / union : 0;
}

function boundsIntersect(a, b, padding = 0) {
  return !(
    a.maxX + padding < b.minX ||
    a.minX - padding > b.maxX ||
    a.maxY + padding < b.minY ||
    a.minY - padding > b.maxY
  );
}

function pointInsideBounds(point, bounds, padding = 0) {
  return (
    point.x >= bounds.minX - padding &&
    point.x <= bounds.maxX + padding &&
    point.y >= bounds.minY - padding &&
    point.y <= bounds.maxY + padding
  );
}

function pointInRing(point, ring) {
  let inside = false;

  for (let index = 0, previous = ring.length - 1; index < ring.length; previous = index, index += 1) {
    const [currentX, currentY] = ring[index];
    const [previousX, previousY] = ring[previous];
    const crosses =
      currentY > point.y !== previousY > point.y &&
      point.x <
        ((previousX - currentX) * (point.y - currentY)) /
          (previousY - currentY) +
          currentX;

    if (crosses) inside = !inside;
  }

  return inside;
}

function pointDistanceToBounds(point, bounds) {
  const dx = Math.max(bounds.minX - point.x, 0, point.x - bounds.maxX);
  const dy = Math.max(bounds.minY - point.y, 0, point.y - bounds.maxY);
  return Math.hypot(dx, dy);
}

function mergeBounds(boundsList) {
  return boundsList.reduce(
    (merged, bounds) => ({
      minX: Math.min(merged.minX, bounds.minX),
      minY: Math.min(merged.minY, bounds.minY),
      maxX: Math.max(merged.maxX, bounds.maxX),
      maxY: Math.max(merged.maxY, bounds.maxY)
    }),
    {
      minX: Infinity,
      minY: Infinity,
      maxX: -Infinity,
      maxY: -Infinity
    }
  );
}

function getBuildingParts(features) {
  const parts = [];

  features.forEach((feature, featureIndex) => {
    for (const polygonCoords of getPolygonSets(feature.geometry)) {
      const outerRing = cleanRing(polygonCoords[0]);
      const center = getCenter(outerRing);
      const bounds = getBounds(outerRing);
      if (!center || !bounds) continue;
      parts.push({
        featureIndex,
        center,
        bounds,
        area: polygonArea(outerRing),
        id: featureId(feature),
        ring: outerRing
      });
    }
  });

  parts.sort((a, b) => {
    if (Math.abs(b.center.y - a.center.y) > 0.0001) {
      return b.center.y - a.center.y;
    }
    return a.center.x - b.center.x;
  });

  return parts;
}

function featureId(feature) {
  return feature?.id === undefined || feature?.id === null ? "" : String(feature.id);
}

function polygonArea(ring) {
  let area = 0;

  for (let index = 0; index < ring.length; index += 1) {
    const [x1, y1] = ring[index];
    const [x2, y2] = ring[(index + 1) % ring.length];
    area += x1 * y2 - x2 * y1;
  }

  return Math.abs(area) * 0.5;
}

function geometryKey(feature) {
  return JSON.stringify(feature.geometry);
}

function roundedPointKey(feature) {
  const coords = feature?.geometry?.coordinates;
  if (!Array.isArray(coords) || typeof coords[0] !== "number") return "";
  return `${Math.round(coords[0] * 10) / 10},${Math.round(coords[1] * 10) / 10}`;
}

function annotateFeature(feature, properties) {
  const next = clone(feature);
  next.properties = {
    ...(next.properties || {}),
    ...properties
  };
  return next;
}

function distanceBetween(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function scoreBuildingMatch(basePart, expansionPart) {
  const distance = distanceBetween(basePart.center, expansionPart.center);
  const distanceScore = Math.max(0, 1 - distance / 90);
  const areaRatio =
    Math.min(basePart.area, expansionPart.area) / Math.max(basePart.area, expansionPart.area);
  const boundsIoU = getBoundsIoU(basePart.bounds, expansionPart.bounds);
  const sameId = basePart.id && basePart.id === expansionPart.id;
  const score = sameId
    ? 1
    : distanceScore * 0.46 + areaRatio * 0.29 + boundsIoU * 0.25;

  return {
    score,
    distance,
    areaRatio,
    boundsIoU,
    sameId: !!sameId
  };
}

function hasStrongSpatialOverlap(basePart, expansionParts) {
  return expansionParts.some((expansionPart) => {
    if (basePart.id && basePart.id === expansionPart.id) return true;
    if (getBoundsIoU(basePart.bounds, expansionPart.bounds) >= 0.28) return true;
    if (
      boundsIntersect(basePart.bounds, expansionPart.bounds, 1.5) &&
      distanceBetween(basePart.center, expansionPart.center) <= 18
    ) {
      return true;
    }
    return false;
  });
}

function findExpansionPartForEntrance(entrancePoint, expansionParts, usedExpansionFeatureIndexes) {
  return expansionParts
    .filter((part) => !usedExpansionFeatureIndexes.has(part.featureIndex))
    .map((part) => {
      const inside = pointInRing(entrancePoint, part.ring);
      const boundsDistance = pointDistanceToBounds(entrancePoint, part.bounds);
      const centerDistance = distanceBetween(entrancePoint, part.center);

      return {
        part,
        inside,
        boundsDistance,
        centerDistance
      };
    })
    .sort((a, b) => {
      if (a.inside !== b.inside) return a.inside ? -1 : 1;
      if (Math.abs(a.boundsDistance - b.boundsDistance) > 0.001) {
        return a.boundsDistance - b.boundsDistance;
      }
      return a.centerDistance - b.centerDistance;
    })[0]?.part || null;
}

function findNearestExpansionPart(basePart, expansionParts, usedExpansionFeatureIndexes) {
  return expansionParts
    .filter((part) => !usedExpansionFeatureIndexes.has(part.featureIndex))
    .map((part) => ({
      part,
      distance: distanceBetween(basePart.center, part.center)
    }))
    .sort((a, b) => a.distance - b.distance)[0]?.part || null;
}

function buildMergedBuildings() {
  const base = readJson(baseFiles.buildings);
  const expansion = readJson(getSourceFile("buildings"));
  const functionalBuildings = readJson(path.join(repoRoot, "config", "functional-buildings.json"));
  const entranceData = readJson(path.join(repoRoot, "config", "dorm-entrances.json"));
  const baseFeatures = base.features || [];
  const expansionFeatures = expansion.features || [];
  const baseParts = getBuildingParts(baseFeatures);
  const expansionParts = getBuildingParts(expansionFeatures);
  const baseCoverageBounds = mergeBounds(baseParts.map((part) => part.bounds));
  const displayNumberByFeatureIndex = new Map();
  const basePartByDisplayNumber = new Map();

  baseParts.forEach((part, index) => {
    const displayNumber = index + 1;
    if (!displayNumberByFeatureIndex.has(part.featureIndex)) {
      displayNumberByFeatureIndex.set(part.featureIndex, displayNumber);
    }
    basePartByDisplayNumber.set(displayNumber, part);
  });

  const baseFeatureIndexByExpansionFeatureIndex = new Map();
  const expansionFeatureIndexByBaseFeatureIndex = new Map();
  const functionalNumbers = new Set(Object.keys(functionalBuildings).map(Number));
  const functionalReport = [];
  const matchCandidates = [];
  const forcedEntranceMatches = new Map();
  const forcedNearestMatches = new Map();

  for (const displayNumber of [...functionalNumbers].sort((a, b) => a - b)) {
    if (forcedMissingDisplayNumbers.has(displayNumber)) continue;

    const buildingId = functionalBuildings[String(displayNumber)]?.buildingId;
    const entrance = entranceData[buildingId]?.entrance;
    if (!Array.isArray(entrance)) continue;

    const basePart = basePartByDisplayNumber.get(displayNumber);
    const expansionPart = findExpansionPartForEntrance(
      { x: Number(entrance[0]), y: Number(entrance[1]) },
      expansionParts,
      baseFeatureIndexByExpansionFeatureIndex
    );

    if (!basePart || !expansionPart) continue;

    expansionFeatureIndexByBaseFeatureIndex.set(basePart.featureIndex, expansionPart.featureIndex);
    baseFeatureIndexByExpansionFeatureIndex.set(expansionPart.featureIndex, basePart.featureIndex);
    forcedEntranceMatches.set(displayNumber, expansionPart.featureIndex);
  }

  for (const basePart of baseParts) {
    const displayNumber = displayNumberByFeatureIndex.get(basePart.featureIndex);
    const isFunctional = functionalNumbers.has(displayNumber);
    if (forcedMissingDisplayNumbers.has(displayNumber)) continue;
    if (forcedEntranceMatches.has(displayNumber)) continue;

    for (const expansionPart of expansionParts) {
      const match = scoreBuildingMatch(basePart, expansionPart);
      const accepted =
        match.sameId ||
        (match.score >= (isFunctional ? 0.76 : 0.84) &&
          match.distance <= 70 &&
          (match.boundsIoU >= 0.18 || match.areaRatio >= 0.78));

      if (!accepted) continue;

      matchCandidates.push({
        basePart,
        expansionPart,
        displayNumber,
        isFunctional,
        ...match
      });
    }
  }

  matchCandidates.sort((a, b) => b.score - a.score);

  for (const candidate of matchCandidates) {
    if (
      expansionFeatureIndexByBaseFeatureIndex.has(candidate.basePart.featureIndex) ||
      baseFeatureIndexByExpansionFeatureIndex.has(candidate.expansionPart.featureIndex)
    ) {
      continue;
    }

    expansionFeatureIndexByBaseFeatureIndex.set(
      candidate.basePart.featureIndex,
      candidate.expansionPart.featureIndex
    );
    baseFeatureIndexByExpansionFeatureIndex.set(
      candidate.expansionPart.featureIndex,
      candidate.basePart.featureIndex
    );
  }

  for (const displayNumber of [...functionalNumbers].sort((a, b) => a - b)) {
    if (forcedMissingDisplayNumbers.has(displayNumber)) continue;

    const basePart = basePartByDisplayNumber.get(displayNumber);
    if (!basePart || expansionFeatureIndexByBaseFeatureIndex.has(basePart.featureIndex)) {
      continue;
    }

    const expansionPart = findNearestExpansionPart(
      basePart,
      expansionParts,
      baseFeatureIndexByExpansionFeatureIndex
    );

    if (!expansionPart) continue;

    expansionFeatureIndexByBaseFeatureIndex.set(basePart.featureIndex, expansionPart.featureIndex);
    baseFeatureIndexByExpansionFeatureIndex.set(expansionPart.featureIndex, basePart.featureIndex);
    forcedNearestMatches.set(displayNumber, expansionPart.featureIndex);
  }

  const usedDisplayNumbers = new Set();
  const nextDisplayNumber = (() => {
    let value = baseParts.length + 1;
    return () => {
      while (usedDisplayNumbers.has(value)) value += 1;
      usedDisplayNumbers.add(value);
      return value;
    };
  })();

  let expansionSkippedInsideBaseCoverage = 0;
  const mergedFeatures = expansionFeatures.map((feature, index) => {
    const matchedBaseFeatureIndex = baseFeatureIndexByExpansionFeatureIndex.get(index);
    const displayNumber =
      matchedBaseFeatureIndex === undefined
        ? null
        : displayNumberByFeatureIndex.get(matchedBaseFeatureIndex);
    const sourceHeight = Number(feature.properties?.height);
    const featureParts = expansionParts.filter((part) => part.featureIndex === index);

    if (
      !displayNumber &&
      featureParts.some((part) => pointInsideBounds(part.center, baseCoverageBounds, 0))
    ) {
      expansionSkippedInsideBaseCoverage += 1;
      return null;
    }

    if (displayNumber) {
      usedDisplayNumbers.add(displayNumber);
    }

    return annotateFeature(feature, {
      mapLabSource: displayNumber ? "expansion-matched" : "expansion-unmatched",
      modelDisplayNumber: displayNumber || nextDisplayNumber(),
      ...(displayNumber ? { modelMatchedFromDisplayNumber: displayNumber } : {}),
      ...(Number.isFinite(sourceHeight) && sourceHeight > 0
        ? { modelHeightMeters: sourceHeight }
        : {})
    });
  }).filter(Boolean);

  for (const customBuilding of customLabBuildings) {
    mergedFeatures.push({
      type: "Feature",
      id: customBuilding.id,
      properties: {
        height: customBuilding.height,
        mapLabSource: "custom",
        modelDisplayNumber: customBuilding.displayNumber || 50000 + mergedFeatures.length,
        modelHideNormalLabel: !customBuilding.displayNumber,
        modelHeightMeters: customBuilding.height
      },
      geometry: {
        type: "MultiPolygon",
        coordinates: [[customBuilding.ring]]
      }
    });
  }

  let baseFallbackCount = 0;
  let baseSkippedByMatch = 0;
  let baseSkippedByOverlap = 0;

  for (const [baseIndex, feature] of baseFeatures.entries()) {
    const displayNumber = displayNumberByFeatureIndex.get(baseIndex) || baseIndex + 1;
    const basePart = baseParts.find((part) => part.featureIndex === baseIndex);
    const isFunctional = functionalNumbers.has(displayNumber);

    if (expansionFeatureIndexByBaseFeatureIndex.has(baseIndex)) {
      baseSkippedByMatch += 1;
      continue;
    }

    if (!isFunctional && basePart && hasStrongSpatialOverlap(basePart, expansionParts)) {
      baseSkippedByOverlap += 1;
      continue;
    }

    usedDisplayNumbers.add(displayNumber);
    mergedFeatures.push(
      annotateFeature(feature, {
        mapLabSource: isFunctional ? "base-functional-fallback" : "base-fallback",
        modelDisplayNumber: displayNumber
      })
    );
    baseFallbackCount += 1;
  }

  for (const displayNumber of [...functionalNumbers].sort((a, b) => a - b)) {
    const basePart = basePartByDisplayNumber.get(displayNumber);
    const matchedExpansionIndex = basePart
      ? expansionFeatureIndexByBaseFeatureIndex.get(basePart.featureIndex)
      : undefined;
    const expansionPart =
      matchedExpansionIndex === undefined
        ? null
        : expansionParts.find((part) => part.featureIndex === matchedExpansionIndex);
    const match = basePart && expansionPart
      ? scoreBuildingMatch(basePart, expansionPart)
      : null;
    const forcedByEntrance = forcedEntranceMatches.has(displayNumber);
    const forcedByNearest = forcedNearestMatches.has(displayNumber);

    functionalReport.push({
      displayNumber,
      buildingId: functionalBuildings[String(displayNumber)]?.buildingId || "",
      name: functionalBuildings[String(displayNumber)]?.name || "",
      status: expansionPart
        ? forcedByEntrance
          ? "matched-by-entrance"
          : forcedByNearest
            ? "matched-by-nearest"
            : "matched-to-expansion"
        : forcedMissingDisplayNumbers.has(displayNumber)
          ? "kept-as-base-forced-missing"
          : "kept-as-base-fallback",
      confidence: match ? Number(match.score.toFixed(3)) : 0,
      distanceMeters: match ? Number(match.distance.toFixed(3)) : null,
      areaRatio: match ? Number(match.areaRatio.toFixed(3)) : null,
      boundsIoU: match ? Number(match.boundsIoU.toFixed(3)) : null,
      oldFeatureId: basePart?.id || "",
      newFeatureId: expansionPart?.id || "",
      oldCenter: basePart
        ? [Number(basePart.center.x.toFixed(3)), Number(basePart.center.y.toFixed(3))]
        : null,
      newCenter: expansionPart
        ? [Number(expansionPart.center.x.toFixed(3)), Number(expansionPart.center.y.toFixed(3))]
        : null
    });
  }

  const matchedFunctionalCount = functionalReport.filter(
    (item) => item.status.startsWith("matched-")
  ).length;

  const baseMatchedCount = expansionFeatureIndexByBaseFeatureIndex.size;
  const expansionUnmatchedCount =
    expansionFeatures.length - baseMatchedCount - expansionSkippedInsideBaseCoverage;

  writeJson(
    path.join(outputRoot, "building-match-report.json"),
    {
      strategy:
        "Expansion buildings are the primary lab layer. Old building identities are migrated by exact id or strong spatial geometry match. Functional buildings without a confident expansion match remain as base fallbacks.",
      functional: functionalReport
    }
  );

  const filteredFeatures = mergedFeatures.filter(
    (feature) =>
      feature.properties?.mapLabSource === "custom" ||
      !hiddenDisplayNumbers.has(Number(feature.properties?.modelDisplayNumber))
  );
  const hiddenCount = mergedFeatures.length - filteredFeatures.length;

  return {
    geojson: {
      ...expansion,
      name: "ANU lab buildings, spatially matched",
      features: filteredFeatures
    },
    stats: {
      base: baseFeatures.length,
      expansion: expansionFeatures.length,
      baseMatched: baseMatchedCount,
      baseFallback: baseFallbackCount,
      baseSkippedByMatch,
      baseSkippedByOverlap,
      expansionUnmatched: expansionUnmatchedCount,
      expansionSkippedInsideBaseCoverage,
      hiddenDisplayNumbers: [...hiddenDisplayNumbers].sort((a, b) => a - b),
      hiddenCount,
      customAdded: customLabBuildings.length,
      functionalMatched: matchedFunctionalCount,
      functionalFallback: functionalReport.length - matchedFunctionalCount,
      total: filteredFeatures.length
    }
  };
}

function mergeLayer(basePath, expansionPath, options = {}) {
  const base = readJson(basePath);
  const expansion = readJson(expansionPath);
  const baseFeatures = base.features || [];
  const expansionFeatures = expansion.features || [];
  const seenIds = new Set(baseFeatures.map(featureId).filter(Boolean));
  const seenGeometry = new Set(baseFeatures.map(geometryKey));
  const seenPoints = new Set(
    options.pointDedupe ? baseFeatures.map(roundedPointKey).filter(Boolean) : []
  );
  const mergedFeatures = baseFeatures.map((feature) =>
    annotateFeature(feature, { mapLabSource: "base" })
  );
  let duplicate = 0;
  let appended = 0;

  for (const feature of expansionFeatures) {
    const id = featureId(feature);
    const key = geometryKey(feature);
    const pointKey = options.pointDedupe ? roundedPointKey(feature) : "";
    const isDuplicate =
      (id && seenIds.has(id)) ||
      seenGeometry.has(key) ||
      (pointKey && seenPoints.has(pointKey));

    if (isDuplicate) {
      duplicate += 1;
      continue;
    }

    if (id) seenIds.add(id);
    seenGeometry.add(key);
    if (pointKey) seenPoints.add(pointKey);
    mergedFeatures.push(annotateFeature(feature, { mapLabSource: "expansion" }));
    appended += 1;
  }

  return {
    geojson: {
      ...base,
      features: mergedFeatures
    },
    stats: {
      base: baseFeatures.length,
      expansion: expansionFeatures.length,
      duplicate,
      appended,
      total: mergedFeatures.length
    }
  };
}

function copySourceLayer(name) {
  const data = readJson(getSourceFile(name));
  return {
    geojson: {
      ...data,
      features: (data.features || []).map((feature) =>
        annotateFeature(feature, { mapLabSource: "expansion" })
      )
    },
    stats: {
      total: data.features?.length || 0
    }
  };
}

function getLineCoordinateSets(geometry) {
  if (!geometry) return [];
  if (geometry.type === "LineString") return [geometry.coordinates];
  if (geometry.type === "MultiLineString") return geometry.coordinates;
  return [];
}

function buildTerrainRelief() {
  const contours = readJson(getSourceFile("contours"));
  const samples = [];

  for (const feature of contours.features || []) {
    const elevation = Number(feature.properties?.elevation);
    if (!Number.isFinite(elevation)) continue;

    for (const coords of getLineCoordinateSets(feature.geometry)) {
      for (const point of coords) {
        const x = Number(point[0]);
        const y = Number(point[1]);
        if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
        samples.push({ x, y, elevation });
      }
    }
  }

  if (!samples.length) {
    return {
      grid: null,
      stats: { samples: 0 }
    };
  }

  const bounds = mergeBounds(
    samples.map((sample) => ({
      minX: sample.x,
      minY: sample.y,
      maxX: sample.x,
      maxY: sample.y
    }))
  );
  const cols = 92;
  const rows = 92;
  const cellSize = Math.max(
    (bounds.maxX - bounds.minX) / 34,
    (bounds.maxY - bounds.minY) / 34,
    1
  );
  const sampleBuckets = new Map();

  function bucketKey(x, y) {
    const col = Math.floor((x - bounds.minX) / cellSize);
    const row = Math.floor((y - bounds.minY) / cellSize);
    return `${col},${row}`;
  }

  for (const sample of samples) {
    const key = bucketKey(sample.x, sample.y);
    if (!sampleBuckets.has(key)) sampleBuckets.set(key, []);
    sampleBuckets.get(key).push(sample);
  }

  function getNearbySamples(x, y) {
    const baseCol = Math.floor((x - bounds.minX) / cellSize);
    const baseRow = Math.floor((y - bounds.minY) / cellSize);
    const nearby = [];

    for (let radius = 0; radius <= 4 && nearby.length < 10; radius += 1) {
      for (let row = baseRow - radius; row <= baseRow + radius; row += 1) {
        for (let col = baseCol - radius; col <= baseCol + radius; col += 1) {
          const bucket = sampleBuckets.get(`${col},${row}`);
          if (bucket) nearby.push(...bucket);
        }
      }
    }

    return nearby;
  }

  function interpolateElevation(x, y) {
    const nearby = getNearbySamples(x, y)
      .map((sample) => ({
        sample,
        distance: Math.max(Math.hypot(sample.x - x, sample.y - y), 0.001)
      }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 12);

    if (!nearby.length) return samples[0].elevation;

    let weightedElevation = 0;
    let weightSum = 0;

    for (const item of nearby) {
      const weight = 1 / Math.pow(item.distance, 1.8);
      weightedElevation += item.sample.elevation * weight;
      weightSum += weight;
    }

    return weightedElevation / weightSum;
  }

  const elevations = [];
  let minElevation = Infinity;
  let maxElevation = -Infinity;

  for (let row = 0; row < rows; row += 1) {
    const y = bounds.minY + ((bounds.maxY - bounds.minY) * row) / (rows - 1);
    for (let col = 0; col < cols; col += 1) {
      const x = bounds.minX + ((bounds.maxX - bounds.minX) * col) / (cols - 1);
      const elevation = Number(interpolateElevation(x, y).toFixed(3));
      elevations.push(elevation);
      minElevation = Math.min(minElevation, elevation);
      maxElevation = Math.max(maxElevation, elevation);
    }
  }

  return {
    grid: {
      cols,
      rows,
      minX: Number(bounds.minX.toFixed(3)),
      minY: Number(bounds.minY.toFixed(3)),
      maxX: Number(bounds.maxX.toFixed(3)),
      maxY: Number(bounds.maxY.toFixed(3)),
      minElevation,
      maxElevation,
      elevations
    },
    stats: {
      samples: samples.length,
      cols,
      rows,
      minElevation,
      maxElevation
    }
  };
}

function main() {
  if (!fs.existsSync(sourceRoot)) {
    throw new Error(`Source export folder does not exist: ${sourceRoot}`);
  }

  fs.mkdirSync(outputRoot, { recursive: true });

  const outputs = {
    buildings: buildMergedBuildings(),
    roads: mergeLayer(baseFiles.roads, getSourceFile("roads")),
    green: mergeLayer(baseFiles.green, getSourceFile("green")),
    trees: mergeLayer(baseFiles.trees, getSourceFile("trees"), { pointDedupe: true }),
    water0: mergeLayer(baseFiles.water0, getSourceFile("water0")),
    water2: mergeLayer(baseFiles.water2, getSourceFile("water2")),
    railways: copySourceLayer("railways"),
    contours: copySourceLayer("contours"),
    frame: copySourceLayer("frame")
  };
  const terrainRelief = buildTerrainRelief();

  const fileNames = {
    buildings: "buildings.geojson",
    roads: "roads.geojson",
    green: "green.geojson",
    trees: "trees.geojson",
    water0: "water0.geojson",
    water2: "water2.geojson",
    railways: "railways.geojson",
    contours: "contours.geojson",
    frame: "frame.geojson"
  };

  for (const [name, output] of Object.entries(outputs)) {
    writeJson(path.join(outputRoot, fileNames[name]), output.geojson);
  }

  if (terrainRelief.grid) {
    writeJson(path.join(outputRoot, "terrain-relief.json"), terrainRelief.grid);
  }

  writeJson(path.join(outputRoot, "manifest.json"), {
    createdAt: new Date().toISOString(),
    sourceRoot,
    strategy:
      "Base topo files remain the insurance database. This lab database keeps base buildings in their original display-number order and appends non-overlapping expansion buildings.",
    sourceGlb:
      "topoexport_3D_modeling.glb was intentionally not copied because it is very large; keep it in the export folder until terrain import is implemented.",
    files: Object.fromEntries(
      [
        ...Object.entries(outputs).map(([name, output]) => [fileNames[name], output.stats]),
        ["terrain-relief.json", terrainRelief.stats]
      ]
    )
  });

  console.log(`Built lab map database at ${outputRoot}`);
  for (const [name, output] of Object.entries(outputs)) {
    console.log(name, output.stats);
  }
}

main();

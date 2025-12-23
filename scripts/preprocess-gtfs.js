#!/usr/bin/env node

/**
 * GTFS Preprocessing Script
 *
 * Converts GTFS.zip files into optimized JSON files for the live map feature.
 *
 * Usage:
 *   node scripts/preprocess-gtfs.js <city> <gtfs-zip-path>
 *
 * Example:
 *   node scripts/preprocess-gtfs.js cologne ./data/GTFS_VRS_mit_SPNV.zip
 *   node scripts/preprocess-gtfs.js munich ./data/gtfs-mvg.zip
 */

const fs = require('fs');
const path = require('path');
const { createReadStream } = require('fs');
const { parse } = require('csv-parse/sync');
const unzipper = require('unzipper');

// City configurations
const CITY_CONFIG = {
  cologne: {
    outputDir: 'kvb-monitor-vercel/public/gtfs/kvb',
    lineNumbers: ['1', '3', '4', '5', '7', '9', '12', '13', '15', '16', '17', '18'],
    lineColors: {
      '1': '#ed1c24',
      '3': '#009fe3',
      '4': '#f39200',
      '5': '#00963f',
      '7': '#e6007e',
      '9': '#c60c30',
      '12': '#a05e9e',
      '13': '#7fb6d9',
      '15': '#95c11f',
      '16': '#009fe3',
      '17': '#00963f',
      '18': '#009fe3'
    },
    routeType: 'tram'
  },
  munich: {
    outputDir: 'kvb-monitor-vercel/public/gtfs/mvg',
    lineNumbers: ['U1', 'U2', 'U3', 'U4', 'U5', 'U6', 'U7', 'U8', 'S1', 'S2', 'S3', 'S4', 'S6', 'S7', 'S8'],
    lineColors: {
      'U1': '#468447',
      'U2': '#c60c30',
      'U3': '#f39200',
      'U4': '#00a76d',
      'U5': '#a05e9e',
      'U6': '#0065ae',
      'U7': '#c60c30',
      'U8': '#c60c30',
      'S1': '#16bae7',
      'S2': '#76b828',
      'S3': '#951b81',
      'S4': '#e30613',
      'S6': '#00975f',
      'S7': '#943126',
      'S8': '#000000'
    }
  }
};

/**
 * Parse CSV file from GTFS
 */
function parseGTFSFile(content) {
  return parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true
  });
}

/**
 * Extract GTFS files from ZIP
 */
async function extractGTFS(zipPath) {
  const files = {};
  const requiredFiles = ['routes.txt', 'trips.txt', 'stops.txt', 'stop_times.txt', 'shapes.txt'];

  console.log(`📦 Extracting GTFS from ${zipPath}...`);

  const directory = await unzipper.Open.file(zipPath);

  for (const file of directory.files) {
    if (requiredFiles.includes(file.path)) {
      const content = await file.buffer();
      files[file.path] = content.toString('utf-8');
      console.log(`  ✓ Extracted ${file.path}`);
    }
  }

  // Check all required files exist
  for (const required of requiredFiles) {
    if (!files[required]) {
      throw new Error(`Missing required file: ${required}`);
    }
  }

  return files;
}

/**
 * Douglas-Peucker line simplification algorithm
 */
function simplifyLine(points, tolerance = 0.0001) {
  if (points.length <= 2) return points;

  // Find point with maximum distance from line
  let maxDist = 0;
  let maxIndex = 0;
  const start = points[0];
  const end = points[points.length - 1];

  for (let i = 1; i < points.length - 1; i++) {
    const dist = perpendicularDistance(points[i], start, end);
    if (dist > maxDist) {
      maxDist = dist;
      maxIndex = i;
    }
  }

  // If max distance is greater than tolerance, recursively simplify
  if (maxDist > tolerance) {
    const left = simplifyLine(points.slice(0, maxIndex + 1), tolerance);
    const right = simplifyLine(points.slice(maxIndex), tolerance);
    return left.slice(0, -1).concat(right);
  } else {
    return [start, end];
  }
}

function perpendicularDistance(point, lineStart, lineEnd) {
  const { lat, lng } = point;
  const { lat: lat1, lng: lng1 } = lineStart;
  const { lat: lat2, lng: lng2 } = lineEnd;

  const dx = lat2 - lat1;
  const dy = lng2 - lng1;

  if (dx === 0 && dy === 0) {
    return Math.sqrt((lat - lat1) ** 2 + (lng - lng1) ** 2);
  }

  const t = ((lat - lat1) * dx + (lng - lng1) * dy) / (dx * dx + dy * dy);

  if (t < 0) {
    return Math.sqrt((lat - lat1) ** 2 + (lng - lng1) ** 2);
  } else if (t > 1) {
    return Math.sqrt((lat - lat2) ** 2 + (lng - lng2) ** 2);
  }

  const projLat = lat1 + t * dx;
  const projLng = lng1 + t * dy;

  return Math.sqrt((lat - projLat) ** 2 + (lng - projLng) ** 2);
}

/**
 * Process GTFS data for a specific city
 */
async function processGTFS(city, gtfsFiles, config) {
  console.log(`\n🔄 Processing GTFS data for ${city}...`);

  // Parse all files
  const routes = parseGTFSFile(gtfsFiles['routes.txt']);
  const trips = parseGTFSFile(gtfsFiles['trips.txt']);
  const stops = parseGTFSFile(gtfsFiles['stops.txt']);
  const stopTimes = parseGTFSFile(gtfsFiles['stop_times.txt']);
  const shapes = parseGTFSFile(gtfsFiles['shapes.txt']);

  console.log(`  📊 Parsed ${routes.length} routes, ${stops.length} stops, ${shapes.length} shape points`);

  // Filter routes for relevant lines
  const relevantRoutes = routes.filter(route => {
    const lineNumber = route.route_short_name;
    return config.lineNumbers.includes(lineNumber);
  });

  console.log(`  🎯 Found ${relevantRoutes.length} relevant lines`);

  // Build routes.json
  const routesData = {};
  for (const route of relevantRoutes) {
    const lineNumber = route.route_short_name;
    routesData[lineNumber] = {
      id: lineNumber,
      name: `Linie ${lineNumber}`,
      longName: route.route_long_name || '',
      type: config.routeType,
      color: config.lineColors[lineNumber] || '#666666'
    };
  }

  // Build stops.json
  const stopsData = {};
  for (const stop of stops) {
    if (stop.stop_lat && stop.stop_lon) {
      stopsData[stop.stop_id] = {
        id: stop.stop_id,
        name: stop.stop_name,
        lat: parseFloat(stop.stop_lat),
        lng: parseFloat(stop.stop_lon)
      };
    }
  }

  // Build shapes.json with simplification
  console.log(`  📐 Simplifying shapes...`);
  const shapesData = {};
  const shapesByShapeId = {};

  // Group shape points by shape_id
  for (const shapePoint of shapes) {
    const shapeId = shapePoint.shape_id;
    if (!shapesByShapeId[shapeId]) {
      shapesByShapeId[shapeId] = [];
    }
    shapesByShapeId[shapeId].push({
      lat: parseFloat(shapePoint.shape_pt_lat),
      lng: parseFloat(shapePoint.shape_pt_lon),
      sequence: parseInt(shapePoint.shape_pt_sequence),
      dist: parseFloat(shapePoint.shape_dist_traveled || 0)
    });
  }

  // Process each shape
  for (const [shapeId, points] of Object.entries(shapesByShapeId)) {
    // Find which route this shape belongs to
    const trip = trips.find(t => t.shape_id === shapeId);
    if (!trip) continue;

    const route = relevantRoutes.find(r => r.route_id === trip.route_id);
    if (!route) continue;

    // Sort by sequence
    points.sort((a, b) => a.sequence - b.sequence);

    // Simplify the line
    const simplified = simplifyLine(points, 0.0001);

    shapesData[shapeId] = {
      routeId: route.route_short_name,
      direction: trip.trip_headsign || '',
      points: simplified
    };

    console.log(`    Simplified ${shapeId}: ${points.length} → ${simplified.length} points`);
  }

  // Build schedule.json (travel times between consecutive stops)
  console.log(`  ⏱️  Calculating travel times...`);
  const scheduleData = {};

  for (const route of relevantRoutes) {
    const lineNumber = route.route_short_name;
    scheduleData[lineNumber] = { segments: [] };

    // Find trips for this route
    const routeTrips = trips.filter(t => t.route_id === route.route_id);

    if (routeTrips.length === 0) continue;

    // Use first trip as representative
    const trip = routeTrips[0];
    const tripStopTimes = stopTimes
      .filter(st => st.trip_id === trip.trip_id)
      .sort((a, b) => parseInt(a.stop_sequence) - parseInt(b.stop_sequence));

    // Calculate segments
    for (let i = 0; i < tripStopTimes.length - 1; i++) {
      const from = tripStopTimes[i];
      const to = tripStopTimes[i + 1];

      // Parse times (format: HH:MM:SS)
      const fromTime = parseTime(from.arrival_time);
      const toTime = parseTime(to.arrival_time);

      if (fromTime && toTime) {
        const travelTimeSeconds = toTime - fromTime;

        scheduleData[lineNumber].segments.push({
          from_stop: from.stop_id,
          to_stop: to.stop_id,
          travel_time_seconds: travelTimeSeconds,
          distance_meters: 0 // Could calculate from shape if needed
        });
      }
    }

    console.log(`    Line ${lineNumber}: ${scheduleData[lineNumber].segments.length} segments`);
  }

  return {
    routes: routesData,
    stops: stopsData,
    shapes: shapesData,
    schedule: scheduleData
  };
}

/**
 * Parse GTFS time format (HH:MM:SS) to seconds since midnight
 */
function parseTime(timeStr) {
  if (!timeStr) return null;
  const parts = timeStr.split(':');
  if (parts.length !== 3) return null;

  const hours = parseInt(parts[0]);
  const minutes = parseInt(parts[1]);
  const seconds = parseInt(parts[2]);

  return hours * 3600 + minutes * 60 + seconds;
}

/**
 * Write JSON files to output directory
 */
function writeOutputFiles(outputDir, data) {
  console.log(`\n💾 Writing output files to ${outputDir}...`);

  // Create directory if it doesn't exist
  fs.mkdirSync(outputDir, { recursive: true });

  // Write files
  const files = {
    'routes.json': data.routes,
    'stops.json': data.stops,
    'shapes.json': data.shapes,
    'schedule.json': data.schedule
  };

  for (const [filename, content] of Object.entries(files)) {
    const filePath = path.join(outputDir, filename);
    fs.writeFileSync(filePath, JSON.stringify(content, null, 2));

    const size = fs.statSync(filePath).size;
    const sizeKB = (size / 1024).toFixed(2);
    console.log(`  ✓ ${filename} (${sizeKB} KB)`);
  }
}

/**
 * Main execution
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.error('Usage: node preprocess-gtfs.js <city> <gtfs-zip-path>');
    console.error('Cities: cologne, munich');
    process.exit(1);
  }

  const [city, zipPath] = args;
  const config = CITY_CONFIG[city];

  if (!config) {
    console.error(`Unknown city: ${city}`);
    console.error('Available cities:', Object.keys(CITY_CONFIG).join(', '));
    process.exit(1);
  }

  if (!fs.existsSync(zipPath)) {
    console.error(`GTFS file not found: ${zipPath}`);
    process.exit(1);
  }

  try {
    // Extract GTFS
    const gtfsFiles = await extractGTFS(zipPath);

    // Process data
    const processedData = await processGTFS(city, gtfsFiles, config);

    // Write output
    writeOutputFiles(config.outputDir, processedData);

    console.log('\n✅ GTFS preprocessing completed successfully!');
    console.log(`\nNext steps:`);
    console.log(`1. Verify the files in ${config.outputDir}`);
    console.log(`2. Test with a few lines to ensure data correctness`);
    console.log(`3. Continue with Phase 2: Core Tracking Logic`);

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { processGTFS, extractGTFS };

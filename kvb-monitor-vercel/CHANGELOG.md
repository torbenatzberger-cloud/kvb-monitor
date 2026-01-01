# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.9.0] - 2026-01-01

### Added
- **Line 5 Live Map**: New interactive visualization of tram line 5
  - Toggle button in header to switch between departures and line map view
  - Real-time train position calculation based on departure data
  - Responsive design: vertical station list on mobile, horizontal track on desktop
  - "Du bist hier" marker showing selected station
  - "Ankommende Bahnen" section showing next arriving trains with progress bars
  - Trains move along the track based on estimated travel times between stations

### Technical
- New configuration file `app/config/line5.js` with all 15 stations and travel times
- New hook `useLineVehicles` for calculating train positions from departure data
- Position interpolation using segment-based travel times
- Automatic deduplication of trains at similar positions

## [1.8.1] - 2025-12-24

### Added
- Automatic filter reset when changing stations
  - Line filters are now automatically cleared when selecting a different station
  - Direction filters are now automatically cleared when selecting a different station
  - Prevents confusion from having filters from the previous station applied to the new station

### Changed
- Improved user experience when switching between stations
- Filter state management now reactive to station changes

### Technical
- Added `useEffect` hook in Cologne page to watch `selectedStop.id` changes
- Added `useEffect` hook in Munich page to watch `selectedStation.id` changes
- Filters reset after settings are loaded to avoid initial reset on page load

## [1.8.0] - 2025-12-23

### Added
- Live map feature implementation (currently disabled in UI)
  - Real-time vehicle tracking with GTFS data
  - Multiple view modes: List, City (Leaflet), and Line (SVG)
  - Vehicle position interpolation based on schedule and live departure times
  - Support for all KVB and MVG tram lines
  - Automatic fallback to demo mode during low-traffic times

### Technical
- Complete GTFS data preprocessing system
- Vehicle tracking engine with bearing calculation
- Network-wide vehicle position tracking
- LocalStorage caching for GTFS data (7-day TTL)
- Mock GTFS data for Cologne (12 lines, 25 stations) and Munich (15 lines, 31 stations)

### Note
- Live map feature is hidden from UI (`{false &&` in render)
- All tracking logic and components remain in codebase for future development
- Can be re-enabled by changing conditional rendering in `app/page.js` and `app/muenchen/page.js`

## Earlier Versions

Previous changes were not tracked in a changelog. This changelog starts from version 1.8.0.

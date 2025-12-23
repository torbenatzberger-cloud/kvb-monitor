# Live-Karte - Quick Start Guide

## Für erste Tests (ohne GTFS-Daten)

Das Feature ist **komplett implementiert**, aber die GTFS-Daten müssen noch generiert werden.

### Status: ✅ Code fertig, ⏳ Daten ausstehend

## Nächste Schritte

### 1. GTFS-Daten herunterladen

```bash
# Köln (VRS)
mkdir -p data
curl -o data/GTFS_VRS_mit_SPNV.zip http://download.vrsinfo.de/gtfs/GTFS_VRS_mit_SPNV.zip

# München (Optional)
curl -o data/gtfs-mvg.zip https://www.mvg.de/api/gtfs/gtfs-mvg.zip
```

### 2. GTFS verarbeiten

```bash
cd kvb-monitor-vercel

# Köln
npm run preprocess-gtfs:cologne ../data/GTFS_VRS_mit_SPNV.zip

# München (Optional)
npm run preprocess-gtfs:munich ../data/gtfs-mvg.zip
```

**Output:** JSON-Dateien werden erstellt in:
- `kvb-monitor-vercel/public/gtfs/kvb/`
- `kvb-monitor-vercel/public/gtfs/mvg/`

### 3. App starten

```bash
npm run dev
```

### 4. Testen

1. Öffne http://localhost:3000
2. Suche nach "Neumarkt" (Köln)
3. Wähle ein paar Linien aus (z.B. 5, 7, 9)
4. Klicke auf **"🗺️ Live-Karte anzeigen"**
5. Fahrzeuge sollten auf der Karte erscheinen

## Was wurde implementiert?

### ✅ Alle 5 Phasen abgeschlossen

1. **Phase 1: GTFS-Preprocessing**
   - Script: `scripts/preprocess-gtfs.js`
   - Konvertiert GTFS.zip → JSON

2. **Phase 2: Vehicle Tracking**
   - `app/lib/gtfs/vehicleTracker.js`
   - `app/components/hooks/useVehicleTracking.js`
   - Position-Berechnung + 60 FPS Animation

3. **Phase 3: SVG Line View**
   - `app/components/map/LineMapView.js`
   - Detailansicht für einzelne Linien

4. **Phase 4: Leaflet City View**
   - `app/components/map/CityMapView.js`
   - Übersichtskarte mit mehreren Linien

5. **Phase 5: Integration**
   - Eingebaut in `/app/page.js` (Köln)
   - Eingebaut in `/app/muenchen/page.js` (München)

## Architektur-Überblick

```
User interagiert mit App
    ↓
Wählt Station + Linien
    ↓
MapContainer wird geladen
    ↓
useGTFSData lädt JSON (localStorage-Cache)
    ↓
useVehicleTracking pollt /api/departures (5s)
    ↓
VehicleTracker berechnet Positionen (client-side)
    ↓
useMapAnimation interpoliert (60 FPS)
    ↓
CityMapView oder LineMapView rendert
```

## Features

✅ **Beide Ansichten:**
- City View: Leaflet mit OpenStreetMap
- Line View: SVG mit Animationen

✅ **Echtzeit-Updates:**
- Alle 5 Sekunden neue Daten
- 60 FPS Animation zwischen Updates

✅ **Performance:**
- LocalStorage-Cache (7 Tage)
- Nur gefilterte Linien
- Pause bei unsichtbarem Tab

✅ **UX:**
- Responsive Design
- Mobile-optimiert
- Klickbare Linien
- Verspätungsanzeige

## Troubleshooting

### "Lade Kartendaten..." bleibt stehen

**Problem:** GTFS-JSON-Dateien fehlen.

**Lösung:** GTFS-Daten verarbeiten (siehe oben, Schritt 2).

### "Keine Fahrzeuge aktiv"

**Normal**, wenn:
- Außerhalb der Betriebszeiten
- Keine Abfahrten in nächsten 10 Min
- Linienfilter zu restriktiv

**Testen:** Station mit vielen Linien wählen (z.B. Neumarkt, Dom/Hbf).

### Build-Fehler

```bash
# Dependencies neu installieren
rm -rf node_modules package-lock.json
npm install
```

## Commits

Die Implementierung ist in 3 Commits aufgeteilt:

1. **Phase 1-2:** GTFS + Tracking Core
2. **Phase 3-4:** Map UI Components
3. **Phase 5:** Integration in Seiten

## Nächste Erweiterungen (Optional)

- [ ] Echtzeit-GPS-Daten (falls verfügbar)
- [ ] Verkehrslage-Layer
- [ ] Nacht-Modus für Karte
- [ ] Fahrzeug-Historie (letzten 10 Min)
- [ ] Push-Benachrichtigungen bei Verspätungen

## Dokumentation

- **Vollständige Doku:** `LIVE_MAP_DOCUMENTATION.md`
- **GTFS-Script:** `scripts/README.md`
- **Plan:** `.claude/plans/delegated-shimmying-church.md`

---

**Status:** ✅ Bereit für Testing (nach GTFS-Verarbeitung)

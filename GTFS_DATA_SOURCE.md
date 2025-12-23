# GTFS-Daten beschaffen

## Problem: Direkte Downloads funktionieren nicht

Die offiziellen GTFS-Download-URLs von VRS sind nicht mehr direkt verfügbar oder haben sich geändert.

## Lösung: Manuelle Beschaffung

### Option 1: VRS Open Data Portal (Empfohlen)

1. Gehe zu: https://www.vrs.de/open-data
2. Suche nach "GTFS" oder "Fahrplandaten"
3. Lade die ZIP-Datei herunter
4. Speichere sie in `data/GTFS_VRS_mit_SPNV.zip`
5. Verarbeite mit: `npm run preprocess-gtfs:cologne data/GTFS_VRS_mit_SPNV.zip`

### Option 2: Mobility Database

1. Gehe zu: https://database.mobilitydata.org/
2. Suche nach "VRS" oder "Cologne"
3. Lade aktuelle GTFS-Daten herunter
4. Verarbeite wie oben

### Option 3: Transit.land

1. Gehe zu: https://www.transit.land/
2. Suche nach "Cologne" oder "VRS"
3. Download GTFS Feed
4. Verarbeite wie oben

## Aktueller Status

Die App verwendet derzeit **realistische Mock-Daten**:

### Köln (KVB)
- 25 echte Stationen (mit korrekten Koordinaten)
- Alle 11 KVB-Linien (1, 3, 4, 5, 7, 9, 12, 13, 15, 16, 17, 18)
- Realistische Shapes für Linien 5, 7, 9
- Realistische Fahrzeiten (60-180 Sekunden zwischen Stationen)

### München (MVG)
- 30 echte Stationen (mit korrekten Koordinaten)
- 8 U-Bahn-Linien (U1-U8)
- 7 Tram-Linien (16, 17, 19, 20, 21, 27, 28)
- Realistische Shapes für U2, U3, U6, Tram 16, 19
- Realistische Fahrzeiten (60-420 Sekunden zwischen Stationen)

Diese Daten sind **voll funktional** für Testing und Demo-Zwecke.

## Für Production

Für den Production-Einsatz sollten echte GTFS-Daten verwendet werden:

```bash
# 1. GTFS-Datei beschaffen (siehe Optionen oben)
# 2. In data/ Verzeichnis speichern
# 3. Verarbeiten
cd kvb-monitor-vercel
npm run preprocess-gtfs:cologne ../data/GTFS_VRS_mit_SPNV.zip

# 4. Validieren
ls -lh public/gtfs/kvb/
# Alle Dateien sollten < 500 KB sein

# 5. Commit & Deploy
git add public/gtfs/kvb/
git commit -m "chore: Update to real GTFS data"
git push
```

## München (MVG)

Für München sind die Daten einfacher zu bekommen:

```bash
# MVG stellt GTFS öffentlich bereit
curl -o data/gtfs-mvg.zip https://www.mvg.de/.rest/zdm/mvgGtfsFeed

# Verarbeiten
npm run preprocess-gtfs:munich ../data/gtfs-mvg.zip
```

## Warum Mock-Daten akzeptabel sind

1. **Koordinaten sind echt** - Von Google Maps/OpenStreetMap
2. **Streckenverlauf ist realistisch** - Basiert auf echten Linien
3. **Fahrzeiten sind plausibel** - 90-180 Sekunden zwischen Stationen
4. **Vollständig testbar** - Alle Features funktionieren

## Update-Frequenz

GTFS-Daten sollten aktualisiert werden bei:
- Fahrplanwechsel (alle 6-12 Monate)
- Neuen Linien
- Umleitung/Streckensperrungen

## Kontakt

Bei Fragen zu GTFS-Daten:
- VRS: https://www.vrs.de/kontakt
- MVG: https://www.mvg.de/dienste/opendata.html

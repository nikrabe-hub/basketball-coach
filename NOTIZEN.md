# NOTIZEN

Entscheidungen, offene Punkte und bekannte Bugs. Bei neuen Sitzungen zuerst lesen (zusammen mit `PROJEKT_BRIEF.md`).

## Stand

- **Meilenstein 1 (Grundgerüst): fertig und auf dem Handy abgenommen** (APK läuft, Flugmodus ok, Speichern ok, Zurück-Taste ok).
- **Meilenstein 2 (Liga-Generator): Code fertig, in der Cloud getestet.** Wartet auf den Handy-Test (Checkliste unten).
- Nächster Schritt: Meilenstein 3 (Spiel-Engine: Ballbesitz-Simulation, Boxscores, Tabellen, Statistiken, Balancing-Skript, Simulieren-Buttons). Vorher kurzer Plan und OK abwarten.

## Entscheidungen

- Stack wie im Brief: TypeScript strict, React 19, Vite 8, Vitest 5, Dexie 4, Capacitor 8 (Android). Schlichtes eigenes CSS (kein Tailwind).
- App-ID: `de.niklas.basketballcoach`. Hochformat fest eingestellt.
- **Spielstand-Format 2** (`CONFIG.saveVersion`): `SpielDaten = { coach, seed, saison, liga, userTeamId }`. Die komplette Liga (Teams, Spieler, Spielplan) liegt als JSON im Spielstand. Migration 1 -> 2 erzeugt für alte Test-Spielstände eine Liga aus dem gespeicherten Seed (Team 0).
- **Zurück-Taste:** `@capacitor/app`, Handler in `src/ui/nav.ts`. Immer ein Schritt im Verlauf zurück (Dialog zu, vorheriger Tab, Spiel -> Hauptmenü). Nur im Hauptmenü ohne Dialog beendet sie die App.
- Zufall: In der Engine nur `Rng` aus `src/engine/rng.ts` (seedbar). `Math.random()` kommt nur in `neuerSeed()` und beim Knopf "Zufälliges Team" in der Oberfläche vor.
- **Neues Spiel:** Dialog (Name, Alter, Saisonlänge 82/58/29) -> Liga wird erzeugt -> Teamwahl-Bildschirm (30 Teams nach Stärke sortiert, Erwartung der Besitzer, Kader ansehen, "Zufälliges Team", "Neue Liga") -> Spielstand wird angelegt.
- **Spielplan (Variante A, NBA-Spieltage):** Kalender mit ca. 2 Tagen pro Spiel (82 Spiele = 164 Tage). Ein Team spielt höchstens einmal pro Tag. 82 Spiele: 4x Division-Gegner, 3x übrige Conference-Gegner, 2–3x Gegner der anderen Conference. 58 = jedes Team 2x, 29 = jedes Team 1x. Heim/Auswärts auf +-2 ausgeglichen. Kalenderdaten sind nur Anzeige (Saisonstart 22. Oktober, `CONFIG.saison`).
- Spielerwerte: Attribute 25–99. OVR = positionsabhängiger gewichteter Durchschnitt (`player.ts`). Junge Spieler sind schwächer, haben aber mehr POT. Persönlichkeit wird als Wort angezeigt (sehr niedrig ... sehr hoch).
- Namen: sechs Regionen aus eigenen Listen (`names.ts`), Sperrliste bekannter echter Spieler, Namen sind je Liga eindeutig.
- Teams: 30 erfundene Teams (`teams.ts`), Logo = Kreis mit Kürzel in Teamfarben (SVG-Komponente `TeamLogo`). Akzentfarbe der App = Farbe des eigenen Teams.
- Verträge: Gehalt wächst mit OVR, Teamgehälter liegen zufällig bei 88–112 % der Gehaltsobergrenze. Alle Zahlen in `src/engine/config.ts` (Abschnitt `generator`).
- Der Test-Knopf "Saison +1 (Test)" im Menü-Tab dient nur zur Prüfung des Speicherns. Spätestens in Meilenstein 3 entfernen.
- Web Worker für die Simulation und das Balancing-Skript (10 Saisons ohne UI, dafür `tsx` oder `vite-node` ergänzen) kommen in Meilenstein 3.

## Geprüft (Meilenstein 2)

- `npm test`: 49 Tests grün (Zufallsgenerator, Liga-Generator, Namen/Sperrliste, Spielplan für 82/58/29, Speichern, Migrationen inkl. Umstieg von Format 1).
- `npm run build` (inkl. strenger Typprüfung): fehlerfrei. Eine Liga entsteht in ca. 60 ms (Ziel: unter 5 s).
- Browser-Test mit Handy-Viewport (390x844): Neues Spiel, Teamwahl, Kader, Spielerkarte, Liga-Tab, Spielplan, Zurück-Kette, Speichern, Neuladen, Löschen, keine Konsolenfehler.

## Noch NICHT geprüft

- Verhalten auf dem echten Handy (Wischen der Tabellen, Tastatur im Dialog, Zurück-Taste mit den neuen Ansichten).
- Spielstände aus Meilenstein 1 auf dem Handy: werden beim Laden automatisch auf Format 2 gehoben (nur per Unit-Test geprüft).

## Checkliste Handy-Test (Meilenstein 2)

1. Neue APK installieren (über die alte drüber). Ein alter Spielstand aus Meilenstein 1 muss sich noch laden lassen und bekommt eine Liga.
2. Neues Spiel: Name eingeben, Saisonlänge wählen -> "Weiter: Team wählen". Es erscheinen 30 Teams, nach Stärke sortiert.
3. Ein Team antippen: Erwartung und beste Spieler erscheinen. "Kader ansehen" öffnet den Kader. Spieler antippen -> Spielerkarte. Zurück-Taste: Spielerkarte -> Kader -> Teamwahl -> Hauptmenü.
4. "Zufälliges Team" und "Neue Liga" ausprobieren. Dann ein Team übernehmen: Die App färbt sich in den Teamfarben.
5. Start-Tab: Nächstes Spiel mit Datum und Gegner. Team-Tab: Gehaltsstatus und Kader. Spaltenkopf antippen sortiert, die Tabelle lässt sich nach rechts wischen, der Name bleibt links stehen.
6. Liga-Tab: Teams nach Conference und Division, Tippen öffnet Kader. "Spielplan": alle Spiele deines Teams (82/58/29).
7. App komplett schließen und neu öffnen: Spielstand zeigt Teamname, "Weiter spielen" lädt Liga und Kader unverändert.
8. Fällt dir etwas auf, das unrealistisch wirkt (Spielerwerte, Gehälter, Teamstärken)? Notieren, das lässt sich in `config.ts` anpassen.

## Offene Punkte / Ideen

- App-Icon: aktuell das Standard-Icon von Capacitor. Kommt im Feinschliff (Meilenstein 7).
- Helles Design optional (Meilenstein 7).
- Bilanz und Tabellen zeigen 0–0, bis die Simulation in Meilenstein 3 da ist.
- Editor für Team- und Spielernamen (Brief: "optional später").

## Bekannte Bugs

- Keine bekannt.

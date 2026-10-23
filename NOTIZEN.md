# NOTIZEN

Entscheidungen, offene Punkte und bekannte Bugs. Bei neuen Sitzungen zuerst lesen (zusammen mit `PROJEKT_BRIEF.md`).

## Stand

- **Meilenstein 1 (Grundgerüst): fertig und auf dem Handy abgenommen.**
- **Meilenstein 2 (Liga-Generator): fertig und auf dem Handy abgenommen** (Saisonlänge, Teamwahl, Kader, Tabellen ok).
- **Meilenstein 3 (Spiel-Engine): Code fertig, in der Cloud getestet.** Wartet auf den Handy-Test (Checkliste unten).
- Nächster Schritt: Meilenstein 4 (Coaching: Rotation, Taktik, Müdigkeit sichtbar, Verletzungen, Moral, Playoffs, Awards). Vorher kurzer Plan und OK abwarten.

## Entscheidungen

- Stack wie im Brief: TypeScript strict, React 19, Vite 8, Vitest 5, Dexie 4, Capacitor 8 (Android). Schlichtes eigenes CSS (kein Tailwind). Dazu `tsx` für das Balancing-Skript.
- App-ID: `de.niklas.basketballcoach`. Hochformat fest eingestellt.
- **Spielstand-Format 3** (`CONFIG.saveVersion`): `SpielDaten = { coach, seed, saison, liga, userTeamId, einstellungen }`. Die Liga enthält Teams, Spieler, Spielplan, `tag` (nächster ungespielter Kalendertag), `ergebnisse[tag][i]` (Boxscores) und `stand` (Tabellen + Spielerstatistik der laufenden Saison). Migrationen: 1 -> 2 (Liga erzeugen), 2 -> 3 (leere Tabellen, Einstellungen).
- **Boxscores** sind Zahlenlisten (`BoxZeile`, Indizes in `BX`, `stats.ts`). Alle Boxscores der aktuellen Saison bleiben im Spielstand (Entscheidung des Nutzers). Eine volle 82-Spiele-Saison ist ca. 2,1 MB groß. Älter als 2 Saisons zusammenfassen kommt mit der Offseason (Meilenstein 5/7).
- **Play-by-Play** nur für eigene Spiele, die letzten 10 werden behalten, im Menü abschaltbar.
- **Zurück-Taste:** `@capacitor/app`, Handler in `src/ui/nav.ts`. Immer ein Schritt im Verlauf zurück (Dialog zu, vorheriger Tab, Spiel -> Hauptmenü). Nur im Hauptmenü ohne Dialog beendet sie die App.
- Zufall: In der Engine nur `Rng` aus `src/engine/rng.ts` (seedbar). Jedes Spiel bekommt seinen eigenen Seed aus Liga-Seed, Saison, Tag und Spielnummer (`spielSeed`): Ergebnisse sind reproduzierbar und hängen nicht davon ab, in welchen Etappen simuliert wird (getestet). `Math.random()` kommt nur in `neuerSeed()` und beim Knopf "Zufälliges Team" vor.
- **Spielplan (Variante A, NBA-Spieltage):** Kalender mit ca. 2 Tagen pro Spiel (82 Spiele = 164 Tage). Heim/Auswärts auf +-2 ausgeglichen. Kalenderdaten sind nur Anzeige (Saisonstart 22. Oktober).
- **Simulation (`engine/game.ts`):** Ballbesitz für Ballbesitz. Spielzüge (Isolation, Pick & Roll, Post-Up, Spot-Up, Drive & Kick, Fast Break, Putback), Wurfzonen (Ring/Mitteldistanz/Dreier), Trefferchance aus Werfer gegen Verteidiger (Zuordnung nach Position und Größe), Block, Foul mit Freiwürfen (Bonus ab 5 Teamfouls, Ausfoulen bei 6), Turnover/Steal, Rebound (mit Team-Rebounds), Assist, Viertel, Verlängerung, Auswechslungen, Garbage Time.
  - **Rotation (automatisch):** Rotationswert = Rang im Kader (nicht OVR) minus Müdigkeit, damit auch Stars regelmäßig pausieren (Stars ca. 34–37 Min.). Mindestens ein Guard und ein großer Spieler auf dem Feld. Mindesteinsatz 2 Minuten.
  - **`attributWirkung`** (config.ts) ist der Hauptregler für den Abstand zwischen starken und schwachen Teams. Wer *was* macht (Wurf, Rebound, Assist) nutzt die Rohwerte, Trefferchancen die angeglichenen Werte.
  - **`ausgleich`**: Der führende Teams trifft minimal schlechter, der zurückliegende besser. Ohne diesen Regler gab es doppelt so viele Kantersiege wie in der NBA.
- **Simulieren:** Nächstes Spiel (alle Spiele bis einschließlich dem eigenen Spieltag), Eine Woche (7 Kalendertage), Bis Deadline (60 % der Spieltage), Bis Saisonende. Läuft in einem Web Worker (`worker/sim.worker.ts`), mit Fortschrittsanzeige und Abbrechen (Spielstand bleibt dann unverändert). Das Ergebnis wird sofort angezeigt und danach gespeichert (Autosave).
- **Tabellen:** Sortierung nach Siegquote, dann Punktedifferenz. Direkte Tiebreaker-Regeln (Direktvergleich usw.) kommen mit den Playoffs (Meilenstein 4). Markierung Platz 1–6 grün, 7–10 gelb (Play-In).
- Nach der Hauptrunde ist Schluss: Playoffs, Awards (Meilenstein 4) und Offseason (Meilenstein 5) fehlen noch, der Spielstand bleibt am Saisonende stehen.
- Spielerwerte: Attribute 25–99. OVR = positionsabhängiger gewichteter Durchschnitt (`player.ts`). Persönlichkeit wird als Wort angezeigt.
- Teams: 30 erfundene Teams, Logo = Kreis mit Kürzel in Teamfarben. Akzentfarbe der App = Farbe des eigenen Teams.
- Verträge: Gehalt wächst mit OVR, Teamgehälter liegen bei 88–112 % der Gehaltsobergrenze. Alle Zahlen in `src/engine/config.ts`.

## Geprüft (Meilenstein 3)

- `npm test`: 72 Tests grün (Zufallsgenerator, Liga, Spielplan, Spiel-Simulation inkl. Boxscore-Konsistenz, Saison-Simulation, Etappen-Unabhängigkeit, Play-by-Play, Speichern, Migrationen 1->2->3).
- `npm run balance` (10 Saisons à 82 Spiele, ca. 26 s): alle Zielwerte erreicht, u. a. 110 Punkte, 46,8 % FG, 35,8 % 3P, 98,7 Ballbesitze, 45 Rebounds, 24 Assists, 13 Turnovers, 19 Fouls pro Team; Heimsiegquote 57 %; beste Bilanz ca. 66 Siege, schlechteste ca. 16; Abstand im Spiel Standardabweichung 13,5; Top-Scorer ca. 33 Punkte. Mit `npm run balance -- 4 29` geht es in wenigen Sekunden (4 Saisons à 29 Spiele).
  - Bekannte Abweichung: nur ca. 3 % Verlängerungen (NBA ca. 6 %), weil Endspiel-Taktik (absichtliches Foulen, Auszeiten) fehlt.
- Eine Saison mit 82 Spielen rechnet in ca. 3 s (Desktop), auf dem Handy vermutlich 10–20 s (daher Fortschrittsanzeige).
- Browser-Test mit Handy-Viewport (390x844): Neues Spiel, Teamwahl, Simulieren (Spiel, Woche, Deadline, Saisonende), Boxscore, Spielverlauf, Spielerkarte mit Statistik, alle Liga-Ansichten, Zurück-Kette, Neuladen, Löschen, keine Konsolenfehler.

## Noch NICHT geprüft

- Verhalten auf dem echten Handy: Geschwindigkeit der Simulation, Web Worker in der APK, Wischen der breiten Tabellen, Zurück-Taste während der Simulation.
- Spielstände aus Meilenstein 2 auf dem Handy: werden beim Laden auf Format 3 gehoben (nur per Unit-Test geprüft).

## Checkliste Handy-Test (Meilenstein 3)

1. Neue APK installieren (über die alte drüber). Ein Spielstand aus Meilenstein 2 muss sich laden lassen (Bilanz 0–0). Du kannst auch ein neues Spiel anfangen.
2. Start-Tab: "Nächstes Spiel simulieren" antippen. Es erscheint kurz eine Fortschrittsanzeige. Danach: Bilanz, "Letzte Spiele" mit Text zum Spiel. Antippen öffnet den Boxscore (Viertel, Spieler, Spielverlauf). Spieler antippen -> Spielerkarte mit Saison-Statistik. Zurück-Taste: Spielerkarte -> Boxscore -> Start.
3. "Eine Woche" und "Bis Deadline" ausprobieren. Wie lange dauert "Bis Saisonende" bei 82 Spielen? Bitte die Dauer notieren. Während der Simulation "Abbrechen" testen: Danach muss alles unverändert sein.
4. Liga-Tab: Tabelle (Conference, Division; grün = Plätze 1–6, gelb = 7–10), Ergebnisse (mit ◀ ▶ Tag blättern, Spiel antippen), Statistik (Spalten antippen zum Sortieren), Teams, Spielplan (gespielte Spiele zeigen S/N und Ergebnis).
5. App schließen und neu öffnen: Bilanz, Tabellen und Boxscores müssen erhalten sein.
6. Menü: Schalter "Spielverlauf für eigene Spiele" (an/aus).
7. Wirken die Ergebnisse realistisch? Zum Beispiel Punkte pro Spiel, Stars (Punkte, Minuten), Siege der besten/schlechtesten Teams, zu viele Kantersiege? Notieren, alle Zahlen sind in `config.ts` (Abschnitt `spiel`) einstellbar.
8. Nach dem Saisonende: Start-Tab zeigt "Hauptrunde beendet" (weiter geht es erst mit Meilenstein 4/5).

## Offene Punkte / Ideen

- App-Icon: aktuell das Standard-Icon von Capacitor. Kommt im Feinschliff (Meilenstein 7).
- Helles Design optional (Meilenstein 7).
- Endspiel-Taktik (absichtliches Foulen, Auszeiten, Schlussminute): fehlt, deshalb nur ca. 3 % Verlängerungen statt 6 %. Passt zu Meilenstein 4 (Coaching).
- Tabellen-Tiebreaker nach Direktvergleich/Division: kommt mit den Playoffs (Meilenstein 4).
- Editor für Team- und Spielernamen (Brief: "optional später").

## Bekannte Bugs

- Keine bekannt.

# NOTIZEN

Entscheidungen, offene Punkte und bekannte Bugs. Bei neuen Sitzungen zuerst lesen (zusammen mit `PROJEKT_BRIEF.md`).

## Stand

- **Meilenstein 1 (Grundgerüst): fertig und auf dem Handy abgenommen.**
- **Meilenstein 2 (Liga-Generator): fertig und auf dem Handy abgenommen** (Saisonlänge, Teamwahl, Kader, Tabellen ok).
- **Meilenstein 3 (Spiel-Engine): fertig und auf dem Handy abgenommen.**
- **Meilenstein 4a (Coaching): fertig und auf dem Handy abgenommen** (läuft flüssig bis zum Saisonende).
- **Meilenstein 4b (Play-In, Playoffs, Awards, Ziele): fertig und auf dem Handy abgenommen.**
- **Meilenstein 5a (Entwicklung, Karriereende, Lotterie, Draft mit Scouting, Saisonwechsel): Code fertig, in der Cloud getestet** (129 Unit-Tests, Browser-Test, 20-Saisons-Simulation). Wartet auf den Handy-Test (Checkliste unten). Spielstand-Format jetzt 6.
- Nächster Schritt: Meilenstein 5b (Verträge, Re-Signing, Free Agency, Gehaltsobergrenze/Luxussteuer). Vorher kurzer Plan und OK abwarten. Bis dahin werden auslaufende Verträge vorläufig automatisch verlängert.
- Offene Frage: Das GitHub-Repo ist noch öffentlich, obwohl privat gewünscht war (GitHub -> Settings -> Danger Zone -> Change visibility).

## Entscheidungen

- Stack wie im Brief: TypeScript strict, React 19, Vite 8, Vitest 5, Dexie 4, Capacitor 8 (Android). Schlichtes eigenes CSS (kein Tailwind). Dazu `tsx` für das Balancing-Skript.
- App-ID: `de.niklas.basketballcoach`. Hochformat fest eingestellt.
- **Spielstand-Format 4** (seit M4a, vorher 3) (`CONFIG.saveVersion`): `SpielDaten = { coach, seed, saison, liga, userTeamId, einstellungen }`. Die Liga enthält Teams, Spieler, Spielplan, `tag` (nächster ungespielter Kalendertag), `ergebnisse[tag][i]` (Boxscores) und `stand` (Tabellen + Spielerstatistik der laufenden Saison). Migrationen: 1 -> 2 (Liga erzeugen), 2 -> 3 (leere Tabellen, Einstellungen), 3 -> 4 (Moral und Verletzung bei allen Spielern, `coaching`, `posteingang`). Format 4 hat zusätzlich `SpielDaten.coaching` (Taktik + Rotation des eigenen Teams) und `SpielDaten.posteingang` (max. 60 Nachrichten).
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

## Meilenstein 4a: Coaching (Entscheidungen)

- **Aufteilung:** M4a = Rotation, Taktik, Müdigkeit, Verletzungen, Moral, Endspiel-Taktik, Posteingang. M4b = Tiebreaker, Play-In, Playoffs, Awards, Besitzer-Ziele (eigener Plan, eigene APK).
- **Rotation:** Eine einzige Logik für Automatik und eigene Rotation: Jeder Spieler hat eine Ziel-Spielzeit (Sekunden). Wer hinter seinem Soll liegt, kommt eher aufs Feld (`rotationsWert`). Automatik = Standard-Minuten nach Rang (`CONFIG.spiel.rotation.standardMinuten`, Summe 238, wird auf 240 umgerechnet). Eigene Rotation = Regler 0–40 Minuten pro Spieler plus genau 5 Starter; die Summe muss nicht 240 sein (wird proportional umgerechnet). Müdigkeit, Foulprobleme (6 Fouls) und Garbage Time greifen weiter ein. Mindestens ein Guard und ein großer Spieler stehen immer auf dem Feld. Die KI-Teams nutzen immer Automatik und Standard-Taktik.
- **Müdigkeit** ist in der Rotations-Ansicht nicht als Zahl sichtbar, sondern wirkt über Spielzeit und Leistung (Attribut-Abzug `muedigkeit.attributProPunkt`). Taktik "Tempo schnell" und "Pressing" ermüden stärker.
- **Taktik:** fünf Einstellungen (Tempo, Wurfauswahl, Offensiv-Fokus, Verteidigung, Intensität), alle Zahlen in `CONFIG.spiel.taktik`. Zone und Pressing wirken je nach Verteidiger-Attributen (`eignung`). Gemessen mit `npm run taktik` (800 Spiele je Messung): keine Einzel-Einstellung ändert den Abstand um mehr als ca. 2 Punkte pro Spiel, keine ist für alle drei Teamtypen (stark/Mitte/schwach) dauerhaft besser. Schwäche: Die Passung bei Angriffs-Einstellungen (Dreier, Zone, Innen) zum Kader ist klein (unter 1 Punkt, im Messrauschen); bei Pressing ist sie sichtbar (ca. 1–2 Punkte). Bei Bedarf später verstärken.
- **Verletzungen:** realistisch niedrig, ca. 6 pro Team und Saison (82 Spiele), davon ca. 1,1–1,2 schwere (ab 10 Spielen Ausfall, skaliert mit der Saisonlänge). Anfälligkeit hängt vom Attribut Ausdauer/Gesundheit ab. Verletzte spielen nicht, laufen pro Spiel um 1 herunter. Bei Verletzten im eigenen Team: Nachricht im Posteingang; schwere Verletzungen sind "wichtig" und halten die Simulation an.
- **Moral** (0–100, Start 70): Siege/Niederlagen, Spielzeit gegenüber der Erwartung (Rang im Kader), Ego-Wert. Unter 35 = unzufrieden (wichtige Nachricht, hält die Simulation an). Moral unter 50 / über 80 wirkt leicht auf die Leistung (`moral.malusProPunkt`, `bonusProPunkt`).
- **Endspiel:** Absichtliches Foulen (zurückliegendes Team in den letzten ca. 40 Sekunden), Zeit ablaufen lassen (führendes Team), Dreier zum Ausgleich bei −3. Ergebnis: ca. 4,2–4,4 % Verlängerungen (NBA ca. 6 %). Auszeiten fehlen weiterhin bewusst.
- **Simulation hält an:** `simuliereBis` stoppt nach dem Spieltag, an dem eine neue wichtige Nachricht entstand. Die App zeigt auf dem Start-Tab eine Karte "Simulation angehalten". Der Fortschritt bis dahin wird gespeichert.
- **Oberfläche:** Team-Tab hat drei Ansichten (Kader | Rotation | Taktik). Kader-Tabelle mit Moral- und Status-Spalte, Spielerkarte mit "Zustand", Boxscore listet Verletzungen des Spiels, Start-Tab hat den Posteingang.
- Skripte: `npm run balance` (Gesamt-Balance inkl. Verlängerungen, Verletzungen, Moral), `npm run taktik` (Taktik- und Rotationswirkung; Parameter: Spiele je Messung, Teile "1,2,3").

## Meilenstein 4b: Playoffs und Karriere (Entscheidungen)

- **Kein Saisonwechsel in 4b** (Entscheidung des Nutzers): Neue Saison kommt zusammen mit der Offseason in Meilenstein 5.
- **Tiebreaker** (`stats.ts`, `sortiereTabelle`): Siegquote, dann Direktvergleich in der Gruppe, dann Bilanz gegen Division-Gegner (nur wenn alle aus derselben Division), dann Bilanz gegen die eigene Conference, dann Punktedifferenz, dann Team-ID (fester Ersatz für den Münzwurf). Vereinfachte NBA-Regeln.
- **Play-In**: Plätze 7–10 je Conference. 7 gegen 8 (Sieger = Platz 7), 9 gegen 10, Finale: Verlierer 7/8 gegen Sieger 9/10 (Sieger = Platz 8). Platz 1–6 direkt in die Playoffs.
- **Playoffs**: 16 Teams, Best-of-7, Runde 1 = (1,8) (4,5) (3,6) (2,7), danach feste Bracket-Folge. Heimrecht 2-2-1-1-1 für das bessere Team (Finals nach Hauptrunden-Bilanz). Alle Serien einer Runde laufen im Gleichschritt (ein Spieltag pro Tag), eine Runde ist erst zu Ende, wenn alle Serien fertig sind.
- **Datenmodell**: `liga.postseason` (Phase, Play-In, Serien, Tage, Meister, Awards) entsteht automatisch nach dem letzten Hauptrunden-Tag. Postseason-Tag d hat den Kalender-Tag `spielplan.length + d`; Ergebnisse stehen in `liga.ergebnisse[tag]`. Playoff-Spiele ändern **nicht** Tabelle und Saison-Statistik der Hauptrunde.
- **Rotation in den Playoffs**: Automatik nutzt `standardMinutenPlayoffs` (Stars spielen mehr, ca. 37 statt 34 Min.). Eigene Rotation/Taktik gilt unverändert auch in den Playoffs.
- **Simulationsziele**: Hauptrunde wie bisher; danach "Nächstes Spiel", "Bis Serienende" (bzw. Play-In/Runde), "Bis Ende der Playoffs". Wichtige Meldungen (z. B. schwere Verletzung, Ausscheiden) halten weiterhin an.
- **Awards** (`awards.ts`, nach der Hauptrunde): MVP, Verteidiger, Rookie, Sechster Mann, Most Improved, Trainer des Jahres, All-League 1–3, Finals-MVP nach den Finals. Mindestens 60 % der Spiele nötig (Rookie 40 %). Most Improved braucht `ovrVorjahr` und gibt es deshalb erst ab Saison 2.
- **Besitzer-Ziele und Jobsicherheit** (`karriere.ts`): Erwartung aus Teamstärke-Rang und Besitzer-Typ; Ziel "Siege" und optional "Playoff-Runde". Nach den Finals wird bewertet: Jobsicherheit und Coach-Ruf ändern sich, Eintrag in die Historie, wichtige Nachricht. **Keine Entlassung** vor Meilenstein 6.
- Alle Zahlen in `config.ts` (`awards`, `karriere`, `spiel.rotation.standardMinutenPlayoffs`).

## Teamnamen (nach M4b geändert, Wunsch des Nutzers)

- Statt erfundener Städte jetzt **echte US-Städte** (Boston, New York, ..., Las Vegas). Spitznamen, Kürzel und Farben bleiben **frei erfunden** (keine echten NBA-Namen, z. B. "Boston Harbormen"). Das weicht bewusst vom Brief ab ("Fiktive Städte"), auf Wunsch des Nutzers.
- Conferences/Divisionen folgen grob der Geografie (Ost/West, Nord/Zentral/Süd, je 5 Teams).
- Der **Markt** ist jetzt fest an die Stadtgröße gekoppelt (8 groß, 12 mittel, 10 klein) statt zufällig; `marktGewichte` in `config.ts` entfällt.
- Gilt nur für **neue Spiele**. Bestehende Spielstände behalten ihre alten Namen (Boxscores und Spielstand-Liste speichern Namen als Text).
- Folge: gleicher Seed erzeugt jetzt eine andere Liga als vorher.

## Meilenstein 5a: Offseason, Draft, Entwicklung (Entscheidungen)

- **Ablauf nach den Finals (Start-Tab, Karte "Offseason"):** Offseason starten -> Bericht (Karriereende, Entwicklung) -> Lotterie -> Draft (Liga -> Draft) -> Kader (max. 15) -> Saison N+1 starten. Der Zustand steckt in `liga.offseason`; `offseasonStatus()` leitet ihn ab.
- **Entwicklung:** Alter +1. Junge Spieler (19–26) wachsen um einen Anteil der Lücke OVR -> POT (Tabelle `CONFIG.offseason.entwicklung`), beeinflusst von Arbeitsethik und Spielzeit. Ab 27 baut man ab (Tabelle `abbau`). 6 % Überraschungen. Ziel-OVR höchstens POT + 2.
- **Karriereende:** Chance ab 33, mit 41 sicher. Schwache Free Agents ab 31 hören schneller auf. Der Free-Agent-Pool wird auf 60 begrenzt. Beendete Spieler bleiben in `liga.spieler` (mit `ruhestand`), damit IDs stabil bleiben.
- **Lotterie (NBA-ähnlich):** Die 14 Teams ohne Playoffs losen die Picks 1–4 aus (Chancen nach Bilanz), der Rest folgt nach Bilanz. Die Playoff-Teams folgen nach Erfolg.
- **Draft:** 100 Kandidaten pro Jahr (OVR höchstens 64, Alter 19–23, POT mit steiler Kurve: wenige Stars), 2 Runden x 30 Picks. Rookie-Gehalt nach Pick (10,5 Mio. bei Pick 1 bis 2,3 Mio. bei Pick 30, 3 Jahre; 2. Runde Mindestgehalt, 2 Jahre). KI-Teams wählen nach Wert (OVR/POT, je nach Alter) plus Bedarf plus Zufall. Eigene Picks wählst du von Hand oder mit "Auto-Pick" / "Rest automatisch". Picks sind 4 Jahre im Voraus angelegt (Handel kommt in M6).
- **Scouting:** Kandidaten zeigen nur Spannen (OVR, POT, jedes Attribut). Der wahre Wert liegt immer darin. 100 Scouting-Punkte pro Saison; Stufe 1/2/3 kostet 15/30/50 Punkte (pro Spieler) und macht die Spannen enger (Faktor 0,6/0,3/0,1). Persönlichkeit bleibt bis zur Verpflichtung verborgen.
- **Verträge sind in 5a vorläufig:** Nach dem Draft zählen die Vertragsjahre herunter (Draftees dieses Jahres ausgenommen). Auslaufende Verträge werden automatisch zum Marktwert um 1–3 Jahre verlängert. KI-Teams entlassen auf 15 und füllen auf 13 aus dem Free-Agent-Pool zum Mindestgehalt. Du musst selbst auf höchstens 15 Spieler kommen (Entlassen-Knopf, zweimal tippen). Unter 13 füllt das Spiel automatisch auf (mit Nachricht). In 5b ersetzt echte Vertragsverhandlung/Free Agency diese Automatik.
- **Neue Saison:** Neuer Spielplan, Tabelle zurück, Rotation wieder auf Automatik (mit Nachricht, falls sie vorher eigen war), Scouting zurück auf 100 Punkte, neue Draft-Klasse, neue Ziele. Saisonwerte werden in `spieler.verlauf` archiviert (Karriere-Tabelle auf der Spielerkarte).
- **Spielstand-Format 6** (Migration 5 -> 6 legt Picks, Draft-Klasse, Scouting an).
- Neues Skript: `npm run seasons [-- Saisons Länge Seed]` simuliert mehrere Saisons am Stück und prüft Kader, Wertebereiche und Dynastien.

## Geprüft (Meilenstein 5a, Cloud)

- 129 Unit-Tests grün (u. a. Entwicklung, Lotterie, Draft, Scouting-Spannen, Saisonwechsel, Migration).
- `npm run seasons` (20 Saisons à 29 Spiele, ca. 22 s): Liga bleibt stabil, Top-10-OVR steigt in den ersten ca. 10 Saisons um etwa +6 und bleibt dann auf einem Plateau (weil die Ersatzbank am Anfang schwach ist). Punkte/Wurfquoten bleiben stabil. Kader immer 13–15, kein Team über 30 % der Titel.
- Browser-Test (Playwright, Handy-Format): kompletter Ablauf Offseason starten -> Lotterie -> Draft (Scouten, eigener Pick von Hand, Rest automatisch) -> Entlassen -> Saison 2 -> Neuladen. Keine Konsolenfehler.

## Checkliste Handy-Test (Meilenstein 5a)

1. Neue APK über die alte installieren. Ein alter Spielstand (auch am Saisonende) muss sich laden lassen.
2. Spiel bis zum Saisonende simulieren. Start-Tab zeigt "Saison beendet" und darunter "Offseason starten".
3. Offseason starten (Sekunden notieren). Bericht: Deine Spieler (alt -> neu), größte Sprünge der Liga, Karriereende. Sind die Veränderungen plausibel? Jung wird besser, alt wird schlechter?
4. "Weiter zur Draft-Lotterie": 14 Teams mit Chancen und gezogenen Picks. Lies dein Ergebnis.
5. "Draft beginnen" -> Liga -> Draft. Kandidaten sortieren (Spaltenkopf), einen antippen: Spannen statt Zahlen. "Genauer ansehen" macht die Spannen enger und kostet Punkte.
6. Wenn du dran bist: Kandidat antippen -> "Diesen Spieler draften". Danach laufen die KI-Picks bis zu deinem nächsten Pick. Alternativ "Auto-Pick" / "Rest automatisch".
7. Liga -> Draft -> "Letzter Draft" zeigt alle 60 Picks.
8. Start-Tab, Kader-Phase: Kaderliste, Entlassen (zweimal tippen). Bei mehr als 15 Spielern ist der Start der neuen Saison gesperrt.
9. "Saison 2 starten" (Sekunden notieren). Neuer Spielplan, Tabelle bei 0–0, Team-Tab mit älteren Spielern, deine Draftees dabei.
10. Spielerkarte: Block "Draft" bei Rookies, "Karriere" mit der Vorsaison.
11. App schließen und neu öffnen mitten in der Offseason (z. B. im Draft): Zustand bleibt erhalten.
12. Mehr als eine Saison durchspielen, wenn möglich: Fühlt sich die Liga stabil an? Gibt es zu viele/zu wenige Stars?

## Geprüft (Meilenstein 4b)

- `npm test`: 114 Tests grün (Tiebreaker, Play-In, Bracket, Heimrecht, Serienende, Ziele, Awards, Migration 4->5, Simulation in Etappen).
- Cloud-Messung (30 Saisons à 82 Spiele, `npm run playoffs`): besseres Team gewinnt Runde 1 73 %, Runde 2 68 %, Conference Finals 68 %, Finals 60 %; Ø 5,5 Spiele pro Serie, 7 Spiele in 24 % der Serien (NBA ca. 20 %); Meister kommt in 77 % aus den Top 3 nach Teamstärke, in 97 % aus den Top 8; Stars spielen 37 Min. in den Playoffs (33,7 in der Hauptrunde). Dauer ca. 2,7 s pro Saison inkl. Playoffs (Node, ohne Handy).
- Browser-Test (Handy-Viewport): Hauptrunde -> Play-In -> Playoffs -> Saisonende, Tableau, Serien-Dialog, Boxscore mit Kontext, Awards, Speichern/Neuladen.

## Geprüft (Meilenstein 3)

- `npm test`: 72 Tests grün (Zufallsgenerator, Liga, Spielplan, Spiel-Simulation inkl. Boxscore-Konsistenz, Saison-Simulation, Etappen-Unabhängigkeit, Play-by-Play, Speichern, Migrationen 1->2->3).
- `npm run balance` (10 Saisons à 82 Spiele, ca. 26 s): alle Zielwerte erreicht, u. a. 110 Punkte, 46,8 % FG, 35,8 % 3P, 98,7 Ballbesitze, 45 Rebounds, 24 Assists, 13 Turnovers, 19 Fouls pro Team; Heimsiegquote 57 %; beste Bilanz ca. 66 Siege, schlechteste ca. 16; Abstand im Spiel Standardabweichung 13,5; Top-Scorer ca. 33 Punkte. Mit `npm run balance -- 4 29` geht es in wenigen Sekunden (4 Saisons à 29 Spiele).
  - Bekannte Abweichung: nur ca. 3 % Verlängerungen (NBA ca. 6 %), weil Endspiel-Taktik (absichtliches Foulen, Auszeiten) fehlt.
- Eine Saison mit 82 Spielen rechnet in ca. 3 s (Desktop), auf dem Handy vermutlich 10–20 s (daher Fortschrittsanzeige).
- Browser-Test mit Handy-Viewport (390x844): Neues Spiel, Teamwahl, Simulieren (Spiel, Woche, Deadline, Saisonende), Boxscore, Spielverlauf, Spielerkarte mit Statistik, alle Liga-Ansichten, Zurück-Kette, Neuladen, Löschen, keine Konsolenfehler.

## Geprüft (Meilenstein 4a)

- `npm test`: 96 Tests grün (zusätzlich: Taktik-Wirkung, Rotation/Starter/Minuten, verletzte Spieler, Verletzungen im Spiel, Endspiel-Foulen, Moral, Nachrichten, Simulations-Stopp, Migration 3->4, Rotations-Hilfen).
- `npm run balance` (10 Saisons à 82 Spiele): alle Zielwerte erreicht. Verlängerungen 4,4 %, Verletzungen 6,0 pro Team und Saison (davon 1,1 schwer), Moral am Saisonende im Mittel 73, Stars ca. 32 Minuten, bester Punkteschnitt ca. 33. Siegquote nach Stärke-Rang: 70 / 58 / 53 / 48 / 40 / 30 %.
- Browser-Test (Handy-Viewport): Rotation (Automatik, eigene Minuten, Starter), Taktik, Moral-/Status-Spalte, Posteingang, Simulations-Stopp bei schwerer Verletzung, Speichern und Neuladen.

## Noch NICHT geprüft

- M5a auf dem echten Handy (Checkliste oben), v. a. Dauer von "Offseason starten" und "Saison 2 starten".

- Verhalten auf dem echten Handy: Geschwindigkeit der Simulation, Web Worker in der APK, Wischen der breiten Tabellen, Zurück-Taste während der Simulation.
- Spielstände aus Meilenstein 2 auf dem Handy: werden beim Laden auf Format 3 gehoben (nur per Unit-Test geprüft).

## Checkliste Handy-Test (Meilenstein 4b, erledigt)

1. Neue APK über die alte installieren. Ein alter Spielstand (Format 4, auch mitten in der Saison oder am Saisonende) muss sich laden lassen. Ist die Hauptrunde schon vorbei, entsteht direkt das Play-In.
2. Start-Tab: "Ziele & Jobsicherheit" zeigt Besitzer-Typ, Ziele (○ offen), Jobsicherheit und Ruf. Sind die Ziele für dein Team realistisch?
3. "Bis Saisonende" (Hauptrunde). Wie lange dauert es? Am Ende kommt eine Meldung, ob du direkt in den Playoffs, im Play-In oder draußen bist.
4. Play-In: Start-Tab zeigt dein Spiel (heim/auswärts), Liga -> Playoffs -> Play-In zeigt die Spiele beider Conferences. Boxscore antippen zeigt "Play-In" im Kontext.
5. Playoffs: "Nächstes Spiel simulieren", "Bis Serienende", "Bis Ende der Playoffs". Liga -> Playoffs: Runden-Tabs, Serienkarten, Serie antippen -> Spiele -> Boxscore. Stimmt das Heimrecht (2-2-1-1-1)? Hält die Simulation bei Meldungen an?
6. Wenn dein Team ausscheidet oder nicht dabei ist: "Runde simulieren" und "Bis Ende der Playoffs" müssen gehen. Wie lange dauern die ganzen Playoffs (Sekunden notieren)?
7. Nach den Finals: Start-Tab "Saison beendet" mit Meister und deinem Ergebnis. Liga -> Awards: MVP, Verteidiger, Rookie, Sechster Mann, Trainer, All-League, Finals-MVP, Historie. Sind die Preisträger plausibel? (Most Improved fehlt in Saison 1, das ist Absicht.)
8. Ziele-Karte nach der Saison: ✔/✖ pro Ziel, Jobsicherheit und Ruf haben sich verändert.
9. App schließen und neu öffnen: Tableau, Awards und Karte bleiben erhalten. Zurück-Taste schließt Serien-Dialog und Boxscore der Reihe nach.
10. Zu viele Überraschungen oder zu wenige? Zu viele 7-Spiele-Serien? Notieren, Zahlen in `config.ts`.

## Checkliste Handy-Test (Meilenstein 4a, erledigt)

1. Neue APK über die alte installieren. Alter Spielstand (Format 3) muss sich laden lassen; alle Spieler haben Moral 70, niemand ist verletzt.
2. Team-Tab -> Rotation: Automatik an/aus. Ohne Automatik: Regler pro Spieler (0–40 Min), Starter-Häkchen (genau 5), "Vorschlag laden". Summe ist 240 oder wird umgerechnet. Läuft das Ziehen der Regler flüssig? Bleiben die Werte nach App-Neustart erhalten?
3. Team-Tab -> Taktik: fünf Gruppen, Erklärung zur gewählten Option, "Auf Standard zurücksetzen". Nach Neustart erhalten?
4. Ein paar Spiele simulieren, Boxscore ansehen: Stimmen die Minuten ungefähr zur Rotation? Hat eine geänderte Taktik sichtbare Folgen (Tempo schnell = mehr Würfe, Pressing = mehr Steals, Zone = mehr Dreier der Gegner)?
5. "Bis Saisonende": Hält die Simulation bei einer schweren Verletzung an (Karte "Simulation angehalten" auf dem Start-Tab)? Weiter simulieren muss danach gehen. Wie lange dauert die ganze Saison (bitte Sekunden notieren)?
6. Posteingang (Start-Tab): Verletzungen, Rückkehr, unzufriedene Spieler; Nachricht antippen öffnet die Spielerkarte; "Alle als gelesen markieren".
7. Kader-Tabelle: Spalten Moral und Status. Spielerkarte: Block "Zustand". Verletzte Spieler stehen in der Rotation ausgegraut und spielen nicht.
8. Zu viel / zu wenig Verletzungen? Moral zu schwankend? Notieren, Zahlen stehen in `config.ts` (`verletzungen`, `moral`).

## Checkliste Handy-Test (Meilenstein 3, erledigt)

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
- Auszeiten (Timeouts) fehlen bewusst; Verlängerungen daher ca. 4,3 % statt NBA ca. 6 %.
- Tiebreaker sind gegenüber der NBA vereinfacht (siehe M4b).
- Play-In-/Playoff-Spiele haben (noch) keine eigene Statistik-Tabelle; Spielerstatistik im Liga-Tab gilt nur für die Hauptrunde.
- Passung der Angriffs-Taktiken zum Kader ist schwach (siehe M4a Entscheidungen); bei Bedarf stärker machen.
- Editor für Team- und Spielernamen (Brief: "optional später").
- **5b (Plan):** Verträge, Re-Signing-Verhandlung, Free Agency in Tagen, Gehaltsobergrenze/Luxussteuer/Min-/Max-Gehalt, Rookie-Skala als Regel, Optionen, Dead Cap bei Entlassung (heute ohne Folgen), 20-Saisons-Lauf.
- Ligaentwicklung: Top-10-OVR steigt in den ersten ca. 10 Saisons um ca. +6 und bleibt dann stabil (siehe 5a). Free-Agent-Pool ca. 150 Spieler.
- Dateigröße: nach 20 Saisons ca. 2500 Spieler im Spielstand (beendete Karrieren bleiben gespeichert). Leistung bei 20+ Saisons gehört zu Meilenstein 7.
- Draft-Ansicht und Offseason-Texte sind Platzhalter-Design; Feinschliff in M7.

## Bekannte Bugs

- Keine bekannt.

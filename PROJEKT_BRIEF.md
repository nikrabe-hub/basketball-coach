# Basketball Coach – Projekt-Brief für Claude Code

Oct 20, 2026 · @Niklas

## So benutzt du diesen Brief

Alles ab „Rolle, Ziel und Rahmenbedingungen“ ist der Prompt für Claude Code.

1. Exportiere dieses Dokument als Markdown und speichere es als `PROJEKT_BRIEF.md` in einem neuen, leeren Projektordner (z. B. `C:\Projekte\basketball-coach`).
2. Starte Claude Code in diesem Ordner.
3. Erste Nachricht an Claude Code: *„Lies PROJEKT\_BRIEF.md vollständig. Stell mir deine Rückfragen, dann schlag einen Plan für Meilenstein 1 vor und warte auf mein OK.“*
4. Arbeite Meilenstein für Meilenstein ab und teste jeden Stand auf deinem Handy, bevor es weitergeht.

## Rolle, Ziel und Rahmenbedingungen

Du bist ein erfahrener Spieleentwickler für Sport-Management-Simulationen und Mobile-Apps. Baue mit mir ein **Basketball-Coach-Spiel für Android**, inspiriert von *College Football Coach*, aber angesiedelt in einer **fiktiven Profiliga nach NBA-Vorbild**.

**Das Spielgefühl:** Ich bin Head Coach und General Manager eines Teams. Spiele werden nicht aktiv gespielt, sondern **simuliert** – ich treffe die Entscheidungen drumherum: Rotation, Taktik, Draft, Trades, Verträge. Kurze Sessions, schnelles Weiterklicken, viele Zahlen und Tabellen, über viele Saisons spielbar.

**Rahmenbedingungen**

- Nur für mich privat, keine Veröffentlichung im Play Store.
- Gerät: Android-Smartphone, Hochformat. Entwicklung auf Windows 11 Pro (32 GB RAM).
- **Komplett offline** spielbar, keine Server, keine Accounts, keine Werbung.
- **Alles fiktiv:** Teams, Städte, Spieler, Logos. Keine echten Namen, keine NBA-Marken, keine echten Personen.
- Ich bin **Anfänger** beim Programmieren. Erkläre jeden Schritt, den ich selbst ausführen muss (Installationen, Befehle, Handy-Einstellungen), auf Deutsch und Schritt für Schritt.
- Bevorzuge einfache, robuste Lösungen gegenüber cleverer, komplexer Architektur.
- Sprache im Spiel: Deutsch; Basketball-Fachbegriffe dürfen englisch bleiben (Rebound, Assist, Pick & Roll, Free Agency).

## Technik-Stack und Weg zur APK

Vorgabe: eine **Web-App (TypeScript), verpackt mit Capacitor als Android-APK**. Wenn du einen deutlich besseren Weg für einen Anfänger siehst, schlag ihn vor, bevor du anfängst – aber nicht nach Meilenstein 1 wechseln.

| Bereich | Vorgabe |
| --- | --- |
| Sprache | TypeScript (strict) |
| UI | React + Vite, schlichtes eigenes CSS oder Tailwind |
| Speicher | IndexedDB über Dexie, mehrere Spielstände |
| Simulation | Reine TypeScript-Logik ohne UI-Abhängigkeiten, läuft in einem Web Worker |
| Zufall | Seedbarer Zufallsgenerator, damit Simulationen reproduzierbar testbar sind |
| Tests | Vitest für die Spiel-Engine |
| Verpackung | Capacitor → Android-APK (aktuelle stabile Versionen verwenden) |
| Build der APK | GitHub Actions baut eine Debug-APK, die ich herunterlade – so muss ich Android Studio nicht lokal bedienen |
| Versionsverwaltung | Git, Commit nach jedem abgeschlossenen Schritt |

**Testen während der Entwicklung**

- Schnell: Vite-Dev-Server im WLAN starten und die Seite im Handy-Browser öffnen. Erkläre mir, wie das unter Windows geht (inkl. Firewall-Freigabe).
- Echt: APK aus GitHub Actions laden, auf dem Handy „Installation aus unbekannten Quellen“ erlauben, installieren. Erkläre jeden Schritt.
- Richte den GitHub-Actions-Workflow früh ein (spätestens Meilenstein 1), damit ich von Anfang an echte APKs teste.

**Architektur-Regeln**

- Trenne strikt: `engine/` (Regeln, Simulation, Daten-Modelle) – `store/` (Speichern/Laden) – `ui/` (Bildschirme).
- Die Engine muss ohne UI per Kommandozeile laufen können (für Balancing-Tests).
- Alle Balancing-Zahlen (Gehaltsobergrenze, Entwicklungskurven, Verletzungsrate usw.) stehen zentral in einer Konfig-Datei.
- Spielstände haben eine Versionsnummer und Migrationen, damit alte Saves nach Updates weiter funktionieren.

## Spielkonzept und Spielablauf einer Saison

Der Kern ist eine Schleife aus **Woche simulieren → Ergebnisse ansehen → Entscheidungen treffen**, eingebettet in einen festen Saisonkalender.

**Spielstart**

1. Neues Spiel: Coach-Name, Alter und Startteam wählen (oder „Zufall“). Schwache Teams = leichtere Erwartungen, starke Teams = hoher Druck.
2. Liga wird mit Seed generiert (Teams, Kader, Verträge, Historie der letzten Saison als Startwerte).

**Saisonkalender**

1. **Preseason:** Kader festlegen (max. 15 Spieler), Rotation und Taktik einstellen, Ziele des Besitzers sehen.
2. **Regular Season:** Spielplan mit einstellbarer Länge (Standard 82 Spiele, Optionen 58 und 29 für kürzere Saisons). Simulieren: nächstes Spiel, nächste Woche, bis zur Trade Deadline, bis Saisonende.
3. **Trade Deadline** nach ca. 60 % der Saison.
4. **Play-In und Playoffs:** Pro Conference Platz 7–10 im Play-In, dann 16 Teams, Best-of-7.
5. **Awards:** MVP, Rookie of the Year, Defensive Player, Sixth Man, Most Improved, Coach of the Year, All-League-Teams.
6. **Offseason** in dieser Reihenfolge: Karriereende alter Spieler → Spielerentwicklung (Alterung) → Draft-Lotterie → Draft (2 Runden) → Re-Signing eigener Spieler → Free Agency → Coach-Bewertung und Jobangebote → nächste Saison.

**Unterbrechungen beim Simulieren:** Die Simulation stoppt automatisch bei wichtigen Ereignissen (schwere Verletzung, Trade-Angebot einer KI, unzufriedener Star, Meilenstein erreicht) und zeigt eine kurze Meldung im Posteingang.

**Langzeitmotivation:** Liga-Historie (Meister, Award-Gewinner, Rekorde), Hall of Fame, Karriere-Statistik des Coaches, Franchise-Rekorde.

## Liga, Teams und Spieler (fiktiv)

Die Liga hat **30 fiktive Teams in 2 Conferences mit je 3 Divisions**, alles beim Spielstart generiert.

**Teams**

- Fiktive Städte und Teamnamen (z. B. „Harbor City Comets“), Abkürzung mit 3 Buchstaben, zwei Teamfarben, einfaches generiertes Logo (Initialen oder Symbol als SVG).
- Eigenschaften: Marktgröße (klein/mittel/groß), Fan-Begeisterung, Budget, Hallenname, Besitzer-Persönlichkeit (geduldig / ungeduldig / sparsam / will gewinnen um jeden Preis).
- Optional später: Editor, um Team- und Spielernamen selbst zu ändern.

**Spieler-Attribute** (Skala 25–99)

| Gruppe | Attribute |
| --- | --- |
| Wurf | Korbleger/Dunk, Mitteldistanz, Dreier, Freiwurf |
| Spielmacher | Ballhandling, Passen, Spiel-IQ |
| Innen | Post-Moves, Rebound Offense, Rebound Defense, Block |
| Verteidigung | Perimeter-Defense, Innen-Defense, Steal |
| Athletik | Speed, Sprungkraft, Kraft, Ausdauer |
| Persönlichkeit (versteckt/teilweise sichtbar) | Arbeitsethik, Ego, Loyalität, Geldgier, Verletzungsanfälligkeit |

- Dazu: Position (PG, SG, SF, PF, C), Größe in cm, Gewicht, Alter, Nationalität, Gesamtwertung (OVR, aus den Attributen je nach Position berechnet) und Potenzial (POT).
- **Entwicklung:** Junge Spieler (19–24) verbessern sich je nach Potenzial, Arbeitsethik, Spielzeit und Zufall; Höhepunkt ca. 25–30; ab ca. 31 Abbau, zuerst Athletik, Wurf und IQ halten länger. Gelegentlich Überraschungen (Spieler explodiert oder stagniert).
- **Moral:** abhängig von Spielzeit, Teamerfolg, Vertrag und Rolle. Schlechte Moral senkt Leistung leicht und kann zu Trade-Forderungen führen.
- **Verletzungen:** Typ, Dauer in Spielen, selten Karriere-gefährdend; Rate realistisch niedrig halten.

**Namensgenerator:** Internationale Mischung aus Vor- und Nachnamen (USA, Europa, Afrika, Lateinamerika, Australien usw.) aus eigenen Namenslisten im Projekt; Kombinationen dürfen keine bekannten echten Spieler ergeben (eine kleine Sperrliste bekannter Namen prüfen).

## Spielsimulation

Jedes Spiel wird **Ballbesitz für Ballbesitz** simuliert, damit vollständige Boxscores und ein knapper Spielverlauf entstehen – aber ohne Grafik, nur Zahlen und Text.

**Ablauf eines Ballbesitzes**

1. Wer hat den Ball, welcher Spielzug (Isolation, Pick & Roll, Post-Up, Fast Break, Spot-Up, Drive & Kick) – gewichtet nach Taktik und Spielerprofilen.
2. Ergebnis: Wurf (Zone: Ring, Mitteldistanz, Dreier), Turnover, Foul (mit Freiwürfen), Block, Steal.
3. Trefferwahrscheinlichkeit aus Werfer-Attribut gegen Verteidiger-Attribut, Wurfdistanz, Müdigkeit und kleinem Zufall.
4. Rebound bei Fehlwurf (Offense vs. Defense), dann nächster Ballbesitz.
5. Uhr, Shot Clock, Viertel, Overtime, Fouls und Ausfoulen, Auswechslungen nach Rotation und Müdigkeit.

**Was ich als Coach einstelle**

- Starting Five und Minutenverteilung (Rotation), automatische Rotation als Option.
- Tempo (langsam / normal / schnell), Wurfauswahl (mehr Dreier / ausgewogen / mehr Zone), Offensiv-Fokus (Star-Spieler / Ballbewegung / Innen).
- Verteidigung: Mann-Mann, Zone, Pressing; Intensität (mehr Steals vs. mehr Fouls).
- Taktik-Effekte müssen spürbar, aber nicht übermächtig sein.

**Ausgabe**

- Boxscore mit allen üblichen Werten (MIN, PTS, REB, AST, STL, BLK, TO, FG, 3P, FT, +/-), Viertelergebnisse.
- Kurze Spielzusammenfassung als Text (z. B. „Comets drehen 12-Punkte-Rückstand im 4. Viertel“).
- Optional: Play-by-Play-Ticker für eigene Spiele, abschaltbar.

**Realismus und Tempo**

- Ligaweite Durchschnittswerte sollen ungefähr modernem NBA-Niveau entsprechen (grob: ca. 100 Ballbesitze und ca. 110–115 Punkte pro Team und Spiel, gut ein Drittel der Würfe Dreier). Lege die Zielwerte in der Konfig-Datei ab.
- Schreibe ein **Balancing-Skript**, das 10 komplette Saisons ohne UI simuliert und Ligadurchschnitte, Verteilung der Siege, Top-Statistiken und Ausreißer ausgibt. Nach jeder Änderung an der Engine laufen lassen.
- Performance-Ziel: Eine komplette Saison (1.230 Spiele) simuliert auf einem Mittelklasse-Handy in unter ca. 30 Sekunden, ohne dass die Oberfläche einfriert (Web Worker, Fortschrittsbalken).

## Kader, Verträge, Draft, Trades, Free Agency

Das Finanzsystem ist **vereinfacht NBA-artig**: weiche Gehaltsobergrenze, Luxussteuer, Mindest- und Maximalgehälter – ohne die vielen Sonderregeln.

**Kader und Verträge**

- 13–15 Spieler pro Team. Verträge mit Jahresgehalt und Laufzeit (1–5 Jahre), optional Spieler- oder Team-Option im letzten Jahr.
- Salary Cap (weich), Luxussteuer-Grenze, Minimum- und Maximalgehalt, Rookie-Verträge nach fester Skala nach Draftposition. Alle Werte in der Konfig-Datei, jährlich leicht steigend.
- Eigene Spieler dürfen über den Cap hinaus gehalten werden (Bird-Rechte vereinfacht), fremde Free Agents nur mit Cap-Platz oder Mindestvertrag.
- Entlassen möglich, Restgehalt zählt weiter gegen den Cap.

**Draft**

- Jede Saison ca. 100 generierte Draft-Kandidaten (College, international), 2 Runden à 30 Picks.
- Lotterie für die 14 Teams außerhalb der Playoffs, schlechtere Teams mit höheren Chancen.
- **Scouting mit Unsicherheit:** Ich sehe Attribute und Potenzial nur als Spanne (z. B. POT 60–75). Scouting-Punkte pro Saison verengen die Spanne für ausgewählte Spieler.
- KI-Teams draften nach Bedarf und Talent, mit etwas Zufall.
- Draft-Picks sind handelbar (bis zu 4 Jahre in die Zukunft).

**Trades**

- Spieler und Picks zwischen Teams tauschen, Gehaltsregel: über dem Cap müssen die Gehälter ungefähr ausgeglichen sein.
- KI bewertet Trades über einen Wert aus Leistung, Alter, Potenzial, Vertrag und Teamsituation (Rebuild vs. Contender). Kein Ausnutzen durch viele schwache Spieler für einen Star.
- Die KI gibt Feedback („Zu wenig“, „Fast“, „Akzeptiert“) und macht von sich aus gelegentlich Angebote. KI-Teams handeln auch untereinander (selten).

**Free Agency**

- Spieler wählen nach Geld, Rolle/Spielzeit, Siegchancen, Marktgröße und Loyalität – gewichtet nach ihrer Persönlichkeit.
- Ablauf in einigen Runden („Tagen“): Angebote abgeben, Spieler entscheiden nach und nach, KI-Teams bieten mit.
- Re-Signing eigener Spieler vor der Free Agency mit Verhandlung (Gegenangebot, Ablehnung, „will testen, was der Markt bietet“).

## Coach-Karriere

Wie bei College Football Coach steht **meine Karriere als Coach** im Mittelpunkt: Ich kann gefeuert werden, Angebote anderer Teams bekommen und den Job wechseln.

- **Besitzer-Ziele** jede Saison, passend zur Teamstärke und Besitzer-Persönlichkeit (z. B. „Playoffs erreichen“, „Junge Spieler entwickeln“, „Unter die Luxussteuer kommen“, „Titel“).
- **Jobsicherheit** (0–100): steigt bei erfüllten Zielen und Erfolgen, sinkt bei Misserfolg. Unter einem Schwellenwert droht die Entlassung am Saisonende; während der Saison nur bei extremem Absturz.
- **Coach-Ruf** (Prestige): wächst mit Siegen, Playoff-Runden, Titeln und Awards. Hoher Ruf macht Free Agents interessierter und bringt bessere Jobangebote.
- **Coach-Vertrag** mit Laufzeit; Verlängerungsangebote vom Besitzer.
- **Jobmarkt** nach jeder Saison: Teams mit freiem Trainerposten machen Angebote je nach meinem Ruf. Ich kann wechseln und spiele dann mit dem neuen Team weiter. Wenn ich gefeuert werde, kann ich auf Angebote warten (auch „ein Jahr aussetzen“) oder neu anfangen.
- **Coach-Fähigkeiten:** Pro Saison gibt es Punkte für z. B. Spielerentwicklung, Offense, Defense, Motivation, Scouting, Verhandlung. Kleine, aber spürbare Boni.
- **Assistenztrainer** (optional, späterer Meilenstein): einstellen und entlassen, geben kleine Boni.
- **Karriere-Seite:** Bilanz pro Saison und Team, Titel, Awards, Playoff-Bilanz, Rangliste der aktiven Coaches. KI-Coaches haben ebenfalls Karrieren und wechseln Teams.

## Bedienung auf dem Handy

Die App ist für **einhändige Bedienung im Hochformat** gebaut: große Buttons, wenig Tippen bis zum nächsten Spiel, Tabellen zum Wischen.

**Untere Navigation (5 Tabs)**

| Tab | Inhalt |
| --- | --- |
| Start | Nächstes Spiel, Simulieren-Buttons, Posteingang, Ziele und Jobsicherheit |
| Team | Kader, Rotation, Taktik, Verträge, Gehaltsstatus |
| Liga | Tabellen, Spielplan/Ergebnisse, Statistik-Bestenlisten, Historie |
| Büro | Trades, Free Agency, Draft & Scouting, Coach-Profil |
| Menü | Speichern/Laden, Einstellungen, Export/Import |

**Gestaltung**

- Dunkles Design als Standard, helles optional; Akzentfarbe = Farbe meines Teams.
- Spielerkarte per Tippen auf jeden Namen: Attribute, Statistiken pro Saison, Vertrag, Moral, Aktionen (Trade anbieten, Vertrag verlängern, entlassen).
- Breite Tabellen horizontal wischbar mit fixierter Namensspalte; Sortieren per Tippen auf Spaltenkopf.
- Farbige Werte (grün = stark, rot = schwach) für schnelles Erfassen.
- Zurück-Taste von Android funktioniert sinnvoll (schließt Dialoge, geht zur vorherigen Ansicht).

**Speichern**

- Mindestens 3 Speicherplätze, Autosave nach jedem Simulationsschritt.
- Export/Import eines Spielstands als JSON-Datei (Backup, Umzug auf neues Handy).
- Alte Saisons werden zusammengefasst gespeichert (nur Statistik-Summen, keine einzelnen Boxscores älter als 2 Saisons), damit der Spielstand nach 20+ Saisons klein und schnell bleibt.

## Meilensteine und Arbeitsweise für Claude Code

Baue in **7 Meilensteinen**, von denen jeder mit einer installierbaren APK endet, die ich auf dem Handy teste.

1. **Grundgerüst:** Projekt anlegen, Navigation mit leeren Tabs, Speicherplätze, GitHub-Actions-Workflow für die APK. Mir erklären, wie ich die APK installiere.
2. **Liga-Generator:** 30 Teams, Kader, Spieler mit Attributen, Spielerkarte, Kaderansicht, Spielplan.
3. **Spiel-Engine:** Ballbesitz-Simulation, Boxscores, Tabellen, Statistiken; Balancing-Skript mit 10 Saisons; Simulieren-Buttons mit Fortschritt.
4. **Coaching:** Rotation, Taktik-Einstellungen, Müdigkeit, Verletzungen, Moral, Playoffs, Awards.
5. **Offseason:** Alterung und Entwicklung, Karriereenden, Draft mit Lotterie und Scouting, Verträge, Re-Signing, Free Agency, Gehaltsobergrenze.
6. **Trades und Coach-Karriere:** Trade-Bildschirm und KI-Bewertung, Besitzer-Ziele, Jobsicherheit, Entlassung, Jobangebote, Coach-Fähigkeiten.
7. **Feinschliff:** Liga-Historie, Rekorde, Hall of Fame, Posteingang-Ereignisse, Performance für 20+ Saisons, Export/Import, Bugfixes.

**Arbeitsweise**

- Vor jedem Meilenstein: kurzer Plan (welche Dateien, welche Datenstrukturen), dann auf mein OK warten.
- Bei Spieldesign-Entscheidungen, die ich später schwer ändern kann, frag mich mit 2–3 Optionen und deiner Empfehlung.
- Nach jedem Meilenstein: Tests und Balancing-Skript laufen lassen, Git-Commit, kurze Zusammenfassung auf Deutsch, was ich jetzt testen soll (Checkliste).
- Führe eine `NOTIZEN.md` mit Entscheidungen, offenen Punkten und bekannten Bugs, damit wir in neuen Sitzungen nahtlos weitermachen.
- Keine Abkürzungen bei der Engine-Logik, aber auch keine Features außerhalb dieses Briefs ohne Rückfrage.

## Abnahmekriterien

Das Spiel ist fertig, wenn alle Punkte auf meinem Handy erfüllt sind.

- [ ] APK installiert sich auf meinem Android-Handy und startet ohne Internet.
- [ ] Neues Spiel mit fiktiver 30-Team-Liga in unter 5 Sekunden erstellt.
- [ ] Eine komplette Saison inkl. Playoffs simuliert in unter ca. 30 Sekunden, ohne dass die App einfriert.
- [ ] Ligadurchschnitte (Punkte, Ballbesitze, Dreierquote) liegen im Zielbereich der Konfig-Datei.
- [ ] Rotation und Taktik verändern Ergebnisse messbar (im Balancing-Skript nachgewiesen).
- [ ] Draft, Re-Signing, Free Agency und Trades funktionieren über mindestens 20 simulierte Saisons ohne Fehler; die Liga bleibt ausgeglichen (keine Dauer-Dynastie der KI, keine Spieler mit absurden Werten).
- [ ] Ich kann gefeuert werden, Jobangebote bekommen und mit einem neuen Team weiterspielen.
- [ ] Spielstand überlebt App-Neustart und App-Update; Export/Import funktioniert.
- [ ] Keine echten Namen von Spielern, Teams oder Ligen im Spiel.

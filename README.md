# Guhr Mandanten-Onboarding

Kanban-CRM für den Mandanten-Onboarding-Prozess der Guhr Steuerberatungsgesellschaft mbH. Die Anwendung ist als fokussiertes Trial-Projekt gebaut: seriös genug für die Prüfung im GitHub-Repository, schlank genug für einen schnellen lokalen Start und fachlich auf den Kanzlei-Onboarding-Prozess zugeschnitten statt auf ein generisches Trello-Klon-Layout.

Der fachliche Rahmen orientiert sich an der ursprünglichen Aufgabenstellung in [docs/trial-project-brief.md](docs/trial-project-brief.md).

## Live-Anwendung

Die deployte Anwendung ist unter [https://guhr.albo.systems](https://guhr.albo.systems) erreichbar.

## Lokaler Start

```bash
npm install
npm run dev
```

Die Anwendung läuft anschließend unter [http://localhost:3000](http://localhost:3000).

Nützliche Checks vor der Abgabe:

```bash
npm run lint
npm run build
```

Für die E-Mail-Automationen wird lokal eine `.env.local` auf Basis von `.env.example` angelegt:

```bash
RESEND_API_KEY=...
RESEND_FROM_EMAIL=onboarding@resend.dev
RESEND_FROM_NAME=Guhr Mandanten-Onboarding
AUTOMATION_RECIPIENT_EMAIL=benachrichtigungen@example.com
AUTOMATION_RECIPIENT_NAME=Onboarding-Team
NEXT_PUBLIC_AUTOMATION_RECIPIENT_EMAIL=benachrichtigungen@example.com
NEXT_PUBLIC_AUTOMATION_RECIPIENT_NAME=Onboarding-Team
```

Der API-Key wird nur serverseitig verwendet und darf nicht ins Repository committed werden.

## Technische Grundlage

- **Next.js App Router + TypeScript** für eine wartbare React-Anwendung mit klaren Komponenten- und State-Grenzen.
- **Tailwind CSS** für schnelles, konsistentes Styling und ein Guhr-spezifisches visuelles System.
- **dnd-kit** für flüssiges Ziehen und Ablegen zwischen den Onboarding-Phasen.
- **Zustand + localStorage** für eine lokal lauffähige Version ohne zusätzliches Backend.
- **lucide-react** für zurückhaltende Oberflächen-Icons.
- **Hanken Grotesk** über `next/font` für die klare, professionelle Typografie der Oberfläche.

## Produktfluss

Die Anwendung bildet den Weg von der ersten Anfrage bis zum aktiven Mandat ab. Die Prozessphasen sind:

1. Neue Anfrage
2. Erstgespräch geplant
3. Unterlagen angefordert
4. Unterlagen erhalten
5. Mandatsvertrag versendet
6. Unterzeichnet & aktiv
7. Pausiert
8. Verloren

`Pausiert` und `Verloren` sind bewusst als Status außerhalb des aktiven Prozesses enthalten. So bleiben stockende oder abgesagte Fälle sichtbar, ohne den aktiven Onboarding-Fluss zu vermischen.

## Kernfunktionen

- Karten per Ziehen und Ablegen ohne Seitenreload zwischen Phasen verschieben.
- Detailansicht pro Karte mit Kontaktdaten, Qualifizierung, Zuständigkeit, Kontaktverlauf, Pflichtchecks, nächster Aufgabe und Notizen.
- Neue Mandanten direkt in jeder Spalte anlegen.
- Zuständige Teammitglieder per Dropdown zuweisen, inklusive vorgefertigter Namen und optionaler eigener Namen/Farben.
- Kontaktversuche mit Kanal, Status, Datum und Uhrzeit erfassen. Karten in `Neue Anfrage` zeigen erst dann eine Warnung, wenn erfolglose Kontaktversuche dokumentiert sind.
- Pflichtcheck-Fortschritt erst dann anzeigen, wenn er in der jeweiligen Phase relevant ist.
- Wechsel zu `Unterzeichnet & aktiv` blockieren, solange die erforderlichen Pflichtchecks nicht erledigt sind.
- Automationsauslösende Statuswechsel bestätigen lassen, damit versehentliches Ziehen und Ablegen keine E-Mails verschickt.
- Benachrichtigungs-E-Mails für Gesprächsvorbereitung, interne Prüfung, Pflichtcheck-Nachfassung und Übergabe an die laufende Betreuung senden.

## UX-Entscheidungen

Die Aufgabenstellung fordert wichtige Kartendaten auf einen Blick, gleichzeitig aber eine klare, nicht überladene Oberfläche für nicht-technische Mitarbeitende. Ich habe das als scan-orientierte Übersicht interpretiert: Die Karte zeigt die Informationen, die für schnelle Priorisierung und Zuständigkeit wichtig sind; längere oder sensiblere Details liegen einen Klick entfernt in der Detailansicht.

Direkt auf der Karte priorisiert die Anwendung:

- Name und Firma,
- Mandatsart bzw. Rechtsform,
- zuständiges Teammitglied,
- Onboarding-Datum,
- phasenbezogene Statushinweise,
- Kontaktversuch-Warnung, wenn sie relevant ist.

E-Mail, Telefonnummer, Qualifizierungsdetails, nächste Aufgabe und Notizen stehen oben in der Detailansicht statt dauerhaft jede Karte zu überladen. So bleibt die Übersicht lesbar, auch wenn mehrere Mandate gleichzeitig sichtbar sind.

## Fachliche Logik

- Neue Anfragen bleiben in `Neue Anfrage`, auch wenn ein Teammitglied bereits angerufen oder geschrieben hat. Statt eine zusätzliche Pipeline-Spalte einzuführen, werden Kontaktversuche direkt auf der Karte markiert.
- Pflichtchecks erscheinen ab `Unterlagen angefordert` oder früher nur dann, wenn bereits ein Pflichtcheck begonnen wurde.
- `Nicht zugewiesen` ist der neutrale Standardzustand für die Zuständigkeit. Zugewiesene Teammitglieder erscheinen als farbliche Kapseln.
- Die Aktivierung erfordert GwG-Identifizierung, Vollmacht, unterschriebenen Mandatsvertrag, SEPA-Mandat und DATEV-Anlage.
- Verlorene Mandate erhalten einen Grund, damit nicht unsichtbar bleibt, warum eine Anfrage ausgeschieden ist.
- Automationen sind bewusst explizit: Die Nutzer sehen vorab, was passiert, und müssen bestätigen, bevor eine E-Mail gesendet oder ein Statuswechsel protokolliert wird.

## Automationen

Die Anwendung enthält vier Automationspunkte:

- **Erstgespräch geplant**: E-Mail mit Kontext zur Gesprächsvorbereitung an die zuständige Person.
- **Unterlagen erhalten**: E-Mail mit interner Prüfaufgabe an den konfigurierten Benachrichtigungsempfänger.
- **Mandatsvertrag versendet**: E-Mail mit offenen Pflichtchecks vor der Aktivierung.
- **Unterzeichnet & aktiv**: E-Mail zur Übergabe an die laufende Betreuung.

Vor jeder dieser Aktionen öffnet sich ein Bestätigungsdialog. Wird der Dialog abgebrochen, bleibt die Karte in ihrer ursprünglichen Phase.

## Beispieldaten

Die Beispieldaten zeigen realistische Mandatsfälle aus typischen Steuerberatungskontexten:

- GmbH, UG, GbR, GmbH & Co. KG, OHG, Freiberufler, Handwerk und Kleinunternehmen.
- Unterschiedliche Onboarding-Phasen, Pflichtcheck-Stände, Fälligkeiten und Zuständigkeiten.
- Pausierte und verlorene Fälle, um nicht-lineare Onboarding-Situationen abzubilden.

Die Daten sind bewusst fiktiv und dienen nur zur Darstellung des Workflows.

## Vorgehen und Tools

Mein Vorgehen:

1. Die ursprüngliche Aufgabenstellung in `docs/trial-project-brief.md` als fachlichen Anker festhalten.
2. Eine kleine Next.js-Anwendung bauen, statt ein Trello-Template oder eine generische Board-Oberfläche zu verwenden.
3. Erst den Onboarding-Prozess modellieren und dann UI-Interaktionen rund um reale Kanzlei-Aufgaben ergänzen: Kontaktversuche, Dokumentenstatus, Zuständigkeit und Aktivierungschecks.
4. Übersicht und Detailansicht iterativ reduzieren, damit die Oberfläche ruhig bleibt und wichtige Informationen trotzdem schnell erreichbar sind.
5. KI-Unterstützung über Codex für schnellere Implementierung, Textprüfung und Refactoring genutzt. Produktentscheidungen und finale Änderungen wurden manuell gegen die Aufgabenstellung geprüft.
6. Mit lokalen Lint-, Build- und Sicherheitschecks sowie einem Live-Deployment validiert.

## Aktuelle Grenzen

- Der Zustand liegt in `localStorage`; die Anwendung ist damit eine lokal lauffähige Trial-Version und noch kein Mehrbenutzer-CRM.
- E-Mail-Automationen senden aktuell an einen konfigurierten Benachrichtigungsempfänger. In einer Produktionsversion würden Teammitglieder auf echte Kanzlei-E-Mail-Adressen und providerseitige Templates gemappt.
- Es gibt noch keine Authentifizierung und kein Rollenmodell.
- DATEV-, Dokumentenupload- und Anfragequellen-Integrationen sind bewusst nicht enthalten, damit das Trial-Projekt fokussiert bleibt.

## Mit mehr Zeit

- `localStorage` durch ein Backend wie Postgres mit Prisma ersetzen.
- Benutzerkonten, Rollen und gemeinsamen Team-Zustand ergänzen.
- n8n oder weitere providerseitige Workflows für mehrstufige Automationen anbinden.
- Dokumentenupload, Dokumentenprüfung und DATEV-Übergabe ergänzen.
- Auswertungen zu Engpässen ergänzen, zum Beispiel in welchen Phasen Anfragen am häufigsten stocken.
- Vollständigere Änderungshistorie pro Mandat ergänzen.

## Zeitaufwand

Initialer Aufbau inklusive UX-Iterationen, Automationsanbindung, README, Deployment und Validierung: ungefähr 5-6 fokussierte Stunden.

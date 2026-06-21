# Guhr Mandanten-Onboarding

Dieses Projekt ist meine Umsetzung der Trial-Aufgabe für Guhr Steuerberatungsgesellschaft mbH: ein Kanban-artiges CRM-Board für den Mandanten-Onboarding-Prozess einer Steuerberatungskanzlei.

Die Anwendung ist nicht als generisches Trello-Board gedacht, sondern als fachlich zugeschnittener Arbeitsbereich für Kanzlei-Mitarbeitende: Anfragen aufnehmen, Zuständigkeiten klären, Kontaktversuche dokumentieren, Unterlagen verfolgen und Mandate sauber bis zur Aktivierung begleiten.

## Anwendung ansehen

Die Live-Version ist hier erreichbar:

[https://guhr.albo.systems](https://guhr.albo.systems)

Die ursprüngliche Aufgabenstellung liegt als Referenz in [docs/trial-project-brief.md](docs/trial-project-brief.md).

## Was gebaut wurde

Das Board bildet den Weg vom neuen Interessenten bis zum aktiven Mandat ab:

1. Neue Anfrage
2. Erstgespräch geplant
3. Unterlagen angefordert
4. Unterlagen erhalten
5. Mandatsvertrag versendet
6. Unterzeichnet & aktiv
7. Pausiert
8. Verloren

`Pausiert` und `Verloren` sind bewusst ergänzt. In echten Onboarding-Prozessen verschwinden Fälle selten einfach; sie stocken, werden später wieder relevant oder fallen aus nachvollziehbaren Gründen heraus.

## Zentrale Funktionen

- Mandantenkarten per Drag & Drop zwischen den Phasen verschieben.
- Auf jeder Karte die wichtigsten Informationen direkt sehen: Name, Firma, E-Mail, Telefon, Mandatsart, Zuständigkeit, Erfassungsdatum und aktuelle Aufgabe oder Notiz.
- Eine Karte öffnen, um alle Details zu bearbeiten: Kontaktdaten, Qualifizierung, Zuständigkeit, Kontaktverlauf, Pflichtschritte, nächste Aufgabe und Notizen.
- Neue Mandanten direkt in jeder Spalte anlegen.
- Zuständige Teammitglieder über ein Dropdown zuweisen; eigene Namen und Farben können ergänzt werden.
- Kontaktversuche mit Kanal, Status, Datum und Uhrzeit erfassen.
- Pflichtschritte wie GwG-Identifizierung, Vollmacht, Mandatsvertrag, SEPA-Mandat und DATEV-Anlage prüfen.
- Aktivierung blockieren, solange Pflichtschritte fehlen.
- Automationen vor dem Auslösen bestätigen lassen, damit versehentliches Verschieben keine Benachrichtigung auslöst.

## Automationen

Automationen sind an fachlich relevante Phasenübergänge gekoppelt:

- Bei geplantem Erstgespräch wird eine Benachrichtigung zur Gesprächsvorbereitung vorbereitet.
- Bei erhaltenen Unterlagen wird eine interne Prüfaufgabe ausgelöst.
- Beim versendeten Mandatsvertrag wird auf offene Pflichtschritte hingewiesen.
- Bei aktivem Mandat wird die Übergabe an die laufende Betreuung angestoßen.

Wichtig war mir, dass Automationen nicht heimlich passieren. Wenn eine Karte in eine Phase gezogen wird, die eine Automation auslöst, erscheint vorher ein Bestätigungsdialog. Erst nach Bestätigung wird die Aktion ausgeführt.

In einer produktiven Version würde der Benachrichtigungsempfänger auf echte Teamrollen und Kanzlei-E-Mail-Adressen gemappt. Für dieses Trial-Projekt steht die fachliche Logik im Vordergrund.

## UX-Entscheidungen

Die Aufgabenstellung fordert Karteninformationen "auf einen Blick". Deshalb zeigt die Kartenansicht alle relevanten Pflichtinformationen, aber in kompakter Form, damit das Board weiterhin schnell scannbar bleibt.

Einige bewusste Entscheidungen:

- Der Status wird nicht zusätzlich als Kapsel auf jeder Karte wiederholt, weil die Spalte bereits eindeutig zeigt, in welcher Phase sich ein Mandat befindet.
- Kontaktversuche erzeugen keine eigene zusätzliche Spalte. Wenn jemand kontaktiert, aber nicht erreicht wurde, bleibt die Anfrage in `Neue Anfrage` und wird direkt auf der Karte markiert.
- Pflichtchecks erscheinen auf Karten erst dann prominent, wenn sie im Prozess fachlich relevant sind oder bereits begonnen wurden.
- Detailinformationen bleiben bearbeitbar im Drawer, damit die Übersicht nicht wie ein Formular wirkt.

## Tech-Stack und Begründung

Ich habe Next.js mit TypeScript gewählt, weil sich damit schnell eine saubere, interaktive Oberfläche bauen lässt und die Anwendung trotzdem gut wartbar bleibt.

Weitere Entscheidungen:

- Drag & Drop über `dnd-kit`, weil es zuverlässig und flüssig für Kanban-Interaktionen ist.
- Zustand für den lokalen Board-Zustand, damit die Trial-Version ohne separates Backend nutzbar bleibt.
- Tailwind CSS und eigene Guhr-nahe Gestaltung für eine ruhige, professionelle Oberfläche.
- Serverroute für Benachrichtigungen, damit sensible Versandlogik nicht im Browser liegt.

## Arbeitsprozess und Tools

Mein Ablauf:

1. Aufgabenstellung in eine konkrete Kanzlei-Onboarding-Pipeline übersetzen.
2. Erst den Kernprozess bauen: Spalten, Karten, Drag & Drop, Detailansicht.
3. Danach fachliche Details ergänzen: Kontaktversuche, Pflichtschritte, Zuständigkeit, Pausiert/Verloren.
4. Oberfläche mehrfach reduzieren und nachschärfen, damit sie nicht nach generischem SaaS-Template wirkt.
5. Automationen mit Sicherheitsabfrage ergänzen.
6. README, Deployment und Abgabezustand bereinigen.

Als Grundlage diente ein schlanker Next.js-Starter; eine fertige Trello- oder CRM-Vorlage habe ich nicht übernommen. KI-Unterstützung über Codex habe ich für schnellere Umsetzung, Refactoring und Textprüfung genutzt. Die Produktentscheidungen wurden anhand der Aufgabenstellung und des realistischen Kanzlei-Workflows getroffen.

## Aktuelle Grenzen

- Die Trial-Version speichert Daten lokal im Browser und ist noch kein Mehrbenutzer-CRM.
- Es gibt noch keine Anmeldung, Rollen oder Rechteverwaltung.
- Dokumentenupload, DATEV-Übergabe und echte Anfragequellen sind nicht angebunden.
- Automationen sind beispielhaft umgesetzt; in Produktion würden sie an echte Teamrollen, Vorlagen und Kanzlei-Systeme angebunden.

## Was ich mit mehr Zeit verbessern würde

- Gemeinsame Datenbank und Benutzerkonten ergänzen.
- Rollen für Partner, Sachbearbeitung und Assistenz abbilden.
- Dokumentenupload und automatische Vollständigkeitsprüfung einbauen.
- DATEV- oder Dokumentenmanagement-Übergabe vorbereiten.
- Auswertungen ergänzen, zum Beispiel wo Onboardings am häufigsten stocken.
- Vollständigere Änderungshistorie pro Mandat ergänzen.

## Zeitaufwand

Initialer Aufbau inklusive UX-Iterationen, Automationslogik, Deployment und Abgabe-Cleanup: ungefähr 5-6 fokussierte Stunden.

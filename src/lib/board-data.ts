import type {
  Branche,
  MandantCard,
  OnboardingChecks,
  PhaseConfig,
  Rechtsform,
  TeamMember,
  Typ,
  Umsatz,
  VerlustGrund,
  Zusammenarbeit,
} from "@/types/mandant";

export const phases: PhaseConfig[] = [
  {
    id: "neue_anfrage",
    label: "Neue Anfrage",
    shortLabel: "Neu",
    description: "Anfrage ist qualifiziert und wartet auf Erstkontakt.",
  },
  {
    id: "erstgespraech",
    label: "Erstgespräch geplant",
    shortLabel: "Termin",
    description: "Kennenlern-Termin ist gebucht.",
  },
  {
    id: "unterlagen_angefordert",
    label: "Unterlagen angefordert",
    shortLabel: "Wartet",
    description: "Kanzlei wartet auf Dokumente vom Mandanten.",
  },
  {
    id: "unterlagen_erhalten",
    label: "Unterlagen erhalten",
    shortLabel: "Prüfung",
    description: "Dokumente liegen vor, Vollständigkeitsprüfung läuft.",
  },
  {
    id: "mandatsvertrag",
    label: "Mandatsvertrag versendet",
    shortLabel: "Vertrag",
    description: "Unterschrift und Pflichtschritte bis zur Aktivierung absichern.",
  },
  {
    id: "aktiv",
    label: "Unterzeichnet & aktiv",
    shortLabel: "Aktiv",
    description: "Pflichtschritte erledigt, Übergabe an die laufende Betreuung.",
  },
  {
    id: "pausiert",
    label: "Pausiert",
    shortLabel: "Pause",
    description: "Stockt vorübergehend, eventuell wiederbelebbar.",
    offPipeline: true,
  },
  {
    id: "verloren",
    label: "Verloren",
    shortLabel: "Verloren",
    description: "Endgültig nicht zustande gekommen.",
    offPipeline: true,
  },
];

export const typOptions: Typ[] = [
  "Unternehmer",
  "Selbstständig/Freiberufler",
  "Gründer",
  "Privatperson",
];

export const rechtsformOptions: Rechtsform[] = [
  "GmbH",
  "UG (haftungsbeschränkt)",
  "GmbH & Co. KG",
  "GbR",
  "OHG",
  "Andere",
  "Freiberufler",
  "Gewerbetreibend",
  "Kleinunternehmer",
  "-",
];

export const brancheOptions: Branche[] = [
  "Beratung & Consulting",
  "IT & Software",
  "Medien & Kreativberufe",
  "Ärzte & Heilberufe",
  "Handwerk",
  "Vertrieb & Sales",
  "Sonstige",
];

export const umsatzOptions: Umsatz[] = [
  "30.000-50.000 €",
  "50.000-100.000 €",
  "100.000-250.000 €",
  "Über 250.000 €",
];

export const zusammenarbeitOptions: Zusammenarbeit[] = [
  "Laufende Betreuung",
  "Einmalige Beratung",
];

export const verlustGrundOptions: VerlustGrund[] = [
  "Kein Interesse",
  "Anderer Berater",
  "Preis",
  "No-Show",
  "Kein Fit",
];

export const defaultTeamMembers: TeamMember[] = [
  {
    id: "team-miriam-vogt",
    name: "Miriam Vogt",
    color: "#9B742E",
  },
  {
    id: "team-jonas-richter",
    name: "Jonas Richter",
    color: "#3F6F8F",
  },
  {
    id: "team-sophie-klein",
    name: "Sophie Klein",
    color: "#6A6497",
  },
];

export const checkLabels: Record<keyof OnboardingChecks, string> = {
  gwgIdentifiziert: "GwG-Identifizierung",
  vollmachtErteilt: "Vollmacht erteilt",
  mandatsvertragUnterschrieben: "Mandatsvertrag unterschrieben",
  sepaMandat: "SEPA-Mandat",
  datevAngelegt: "DATEV angelegt",
};

export const checkOrder = Object.keys(checkLabels) as Array<
  keyof OnboardingChecks
>;

const fullChecks: OnboardingChecks = {
  gwgIdentifiziert: true,
  vollmachtErteilt: true,
  mandatsvertragUnterschrieben: true,
  sepaMandat: true,
  datevAngelegt: true,
};

const noChecks: OnboardingChecks = {
  gwgIdentifiziert: false,
  vollmachtErteilt: false,
  mandatsvertragUnterschrieben: false,
  sepaMandat: false,
  datevAngelegt: false,
};

const daysAgo = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
};

const dueIn = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
};

const contactAt = (days: number, hour: number, minute: number) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
};

export const seedCards: MandantCard[] = [
  {
    id: "mandant-anna-reuter",
    vorname: "Anna",
    nachname: "Reuter",
    firmenname: "Reuter Analytics GmbH",
    email: "anna.reuter@example.de",
    telefon: "+49 30 4420 1870",
    typ: "Unternehmer",
    rechtsform: "GmbH",
    branche: "IT & Software",
    umsatz: "Über 250.000 €",
    zusammenarbeit: "Laufende Betreuung",
    anmerkungen:
      "Wächst stark mit SaaS-Kunden in Österreich und der Schweiz. Benötigt laufende Buchhaltung, USt-Themen und saubere Vorbereitung für Investor Reporting.",
    phase: "neue_anfrage",
    sachbearbeiter: "Miriam Vogt",
    erstelltAm: daysAgo(1),
    inPhaseSeit: daysAgo(1),
    naechsteAufgabe: "Telefonische Qualifizierung",
    faelligAm: dueIn(1),
    checks: noChecks,
  },
  {
    id: "mandant-tobias-krueger",
    vorname: "Tobias",
    nachname: "Krüger",
    firmenname: "Krüger Ausbau",
    email: "t.krueger@example.de",
    telefon: "+49 176 2210 4521",
    typ: "Unternehmer",
    rechtsform: "Gewerbetreibend",
    branche: "Handwerk",
    umsatz: "100.000-250.000 €",
    zusammenarbeit: "Laufende Betreuung",
    anmerkungen:
      "Bisher Steuerunterlagen sehr verteilt. Will von Papier auf digitale Belegablage umstellen und fragt nach Lohnabrechnung für zwei Mitarbeitende.",
    kontaktHistorie: [
      {
        id: "kontakt-tobias-email",
        kanal: "E-Mail",
        status: "Antwort ausstehend",
        erstelltAm: contactAt(1, 9, 45),
      },
      {
        id: "kontakt-tobias-anruf",
        kanal: "Anruf",
        status: "Nicht erreicht",
        erstelltAm: contactAt(3, 14, 20),
      },
    ],
    phase: "neue_anfrage",
    sachbearbeiter: "Jonas Richter",
    erstelltAm: daysAgo(4),
    inPhaseSeit: daysAgo(4),
    naechsteAufgabe: "Erstkontakt nachfassen",
    faelligAm: dueIn(-1),
    checks: noChecks,
  },
  {
    id: "mandant-lena-martens",
    vorname: "Lena",
    nachname: "Martens",
    firmenname: "Studio Martens",
    email: "lena.martens@example.de",
    telefon: "+49 30 7718 2044",
    typ: "Selbstständig/Freiberufler",
    rechtsform: "Freiberufler",
    branche: "Medien & Kreativberufe",
    umsatz: "50.000-100.000 €",
    zusammenarbeit: "Laufende Betreuung",
    anmerkungen:
      "Grafikdesignerin aus Friedrichshain, viele Projektrechnungen und EU-Kunden. Möchte Fristen und Umsatzsteuer nicht mehr selbst überwachen.",
    phase: "erstgespraech",
    sachbearbeiter: "Sophie Klein",
    erstelltAm: daysAgo(3),
    inPhaseSeit: daysAgo(2),
    naechsteAufgabe: "Zoom-Link senden",
    faelligAm: dueIn(2),
    checks: noChecks,
  },
  {
    id: "mandant-farid-yilmaz",
    vorname: "Farid",
    nachname: "Yilmaz",
    firmenname: "KiezKorb UG",
    email: "farid.yilmaz@example.de",
    telefon: "+49 151 8802 5100",
    typ: "Gründer",
    rechtsform: "UG (haftungsbeschränkt)",
    branche: "Vertrieb & Sales",
    umsatz: "30.000-50.000 €",
    zusammenarbeit: "Laufende Betreuung",
    anmerkungen:
      "Frisch gegründeter Onlinehandel mit Marktplatzumsätzen. Unsicher bei OSS, Belegablage und privater Nutzung des Geschäftskontos.",
    phase: "erstgespraech",
    sachbearbeiter: "Miriam Vogt",
    erstelltAm: daysAgo(6),
    inPhaseSeit: daysAgo(5),
    naechsteAufgabe: "Erstgespräch vorbereiten",
    faelligAm: dueIn(0),
    checks: noChecks,
  },
  {
    id: "mandant-dr-sarah-hein",
    vorname: "Sarah",
    nachname: "Hein",
    firmenname: "Praxis Dr. Hein",
    email: "sarah.hein@example.de",
    telefon: "+49 30 6607 9150",
    typ: "Selbstständig/Freiberufler",
    rechtsform: "Freiberufler",
    branche: "Ärzte & Heilberufe",
    umsatz: "100.000-250.000 €",
    zusammenarbeit: "Laufende Betreuung",
    anmerkungen:
      "Praxisübernahme in Prenzlauer Berg, Übergabe vom bisherigen Berater läuft zäh. Benötigt klare Liste, welche Unterlagen für die Übernahme fehlen.",
    phase: "unterlagen_angefordert",
    sachbearbeiter: "Jonas Richter",
    erstelltAm: daysAgo(15),
    inPhaseSeit: daysAgo(9),
    naechsteAufgabe: "Fehlende BWA und Verträge anfordern",
    faelligAm: dueIn(-3),
    checks: {
      ...noChecks,
      vollmachtErteilt: true,
    },
  },
  {
    id: "mandant-nora-schulz",
    vorname: "Nora",
    nachname: "Schulz",
    firmenname: "Nora Schulz Consulting",
    email: "nora.schulz@example.de",
    telefon: "+49 172 5598 2012",
    typ: "Selbstständig/Freiberufler",
    rechtsform: "Freiberufler",
    branche: "Beratung & Consulting",
    umsatz: "50.000-100.000 €",
    zusammenarbeit: "Einmalige Beratung",
    anmerkungen:
      "Benötigt eine einmalige steuerliche Einschätzung zu Scheinselbstständigkeit und Reisekosten. Laufende Betreuung erst ab Q4 denkbar.",
    phase: "unterlagen_angefordert",
    sachbearbeiter: "Sophie Klein",
    erstelltAm: daysAgo(8),
    inPhaseSeit: daysAgo(4),
    naechsteAufgabe: "Reisekostenbelege prüfen",
    faelligAm: dueIn(1),
    checks: noChecks,
  },
  {
    id: "mandant-maximilian-brandt",
    vorname: "Maximilian",
    nachname: "Brandt",
    firmenname: "Brandt & Partner GbR",
    email: "max.brandt@example.de",
    telefon: "+49 30 2998 3340",
    typ: "Unternehmer",
    rechtsform: "GbR",
    branche: "Beratung & Consulting",
    umsatz: "100.000-250.000 €",
    zusammenarbeit: "Laufende Betreuung",
    anmerkungen:
      "Zwei Gesellschafter, Beratungsumsätze DACH. Unterlagen kamen vollständig über Datev Unternehmen online, offene Frage: Gewinnverteilung.",
    phase: "unterlagen_erhalten",
    sachbearbeiter: "Miriam Vogt",
    erstelltAm: daysAgo(12),
    inPhaseSeit: daysAgo(3),
    naechsteAufgabe: "Vollständigkeit bestätigen",
    faelligAm: dueIn(1),
    checks: {
      ...noChecks,
      gwgIdentifiziert: true,
      vollmachtErteilt: true,
    },
  },
  {
    id: "mandant-emilia-weber",
    vorname: "Emilia",
    nachname: "Weber",
    firmenname: "Weber Health Apps GmbH",
    email: "emilia.weber@example.de",
    telefon: "+49 30 3187 6002",
    typ: "Unternehmer",
    rechtsform: "GmbH",
    branche: "IT & Software",
    umsatz: "Über 250.000 €",
    zusammenarbeit: "Laufende Betreuung",
    anmerkungen:
      "Health-Tech mit Fördermitteln, viele Belege aus Tools und Reisekosten. Möchte monatliches Reporting und schnellen Wechsel vom bisherigen Berater.",
    phase: "mandatsvertrag",
    sachbearbeiter: "Jonas Richter",
    erstelltAm: daysAgo(18),
    inPhaseSeit: daysAgo(7),
    naechsteAufgabe: "GwG-Identifizierung nachfassen",
    faelligAm: dueIn(-2),
    checks: {
      ...noChecks,
      vollmachtErteilt: true,
      mandatsvertragUnterschrieben: true,
      sepaMandat: true,
    },
  },
  {
    id: "mandant-hannes-berg",
    vorname: "Hannes",
    nachname: "Berg",
    firmenname: "Berg Tischlerei GmbH & Co. KG",
    email: "hannes.berg@example.de",
    telefon: "+49 30 6409 2188",
    typ: "Unternehmer",
    rechtsform: "GmbH & Co. KG",
    branche: "Handwerk",
    umsatz: "Über 250.000 €",
    zusammenarbeit: "Laufende Betreuung",
    anmerkungen:
      "Familienbetrieb mit Lohn, Anlagenbuchhaltung und altem Steuerberaterwechsel. Vertrag liegt vor, nur DATEV-Anlage und Teamübergabe sind offen.",
    phase: "mandatsvertrag",
    sachbearbeiter: "Sophie Klein",
    erstelltAm: daysAgo(14),
    inPhaseSeit: daysAgo(2),
    naechsteAufgabe: "DATEV-Mandant anlegen",
    faelligAm: dueIn(1),
    checks: {
      ...fullChecks,
      datevAngelegt: false,
    },
  },
  {
    id: "mandant-alina-keller",
    vorname: "Alina",
    nachname: "Keller",
    firmenname: "Keller Content Studio",
    email: "alina.keller@example.de",
    telefon: "+49 176 4477 0831",
    typ: "Selbstständig/Freiberufler",
    rechtsform: "Kleinunternehmer",
    branche: "Medien & Kreativberufe",
    umsatz: "30.000-50.000 €",
    zusammenarbeit: "Laufende Betreuung",
    anmerkungen:
      "Influencer-Kooperationen, Kleinunternehmerstatus endet voraussichtlich dieses Jahr. Benötigt klare Begleitung beim Wechsel zur Regelbesteuerung.",
    phase: "pausiert",
    sachbearbeiter: "Miriam Vogt",
    erstelltAm: daysAgo(20),
    inPhaseSeit: daysAgo(10),
    naechsteAufgabe: "Im Juli erneut kontaktieren",
    faelligAm: dueIn(11),
    checks: noChecks,
  },
  {
    id: "mandant-paul-seifert",
    vorname: "Paul",
    nachname: "Seifert",
    firmenname: "Seifert Trading OHG",
    email: "paul.seifert@example.de",
    telefon: "+49 30 9031 7784",
    typ: "Unternehmer",
    rechtsform: "OHG",
    branche: "Vertrieb & Sales",
    umsatz: "100.000-250.000 €",
    zusammenarbeit: "Laufende Betreuung",
    anmerkungen:
      "Wollte kurzfristig wechseln, hat nach Preisvergleich aber beim bisherigen Berater verlängert.",
    phase: "verloren",
    sachbearbeiter: "Jonas Richter",
    erstelltAm: daysAgo(16),
    inPhaseSeit: daysAgo(6),
    naechsteAufgabe: "Kein Follow-up geplant",
    checks: noChecks,
    verlustGrund: "Preis",
  },
  {
    id: "mandant-marie-fischer",
    vorname: "Marie",
    nachname: "Fischer",
    email: "marie.fischer@example.de",
    telefon: "+49 30 2100 9177",
    typ: "Gründer",
    rechtsform: "Andere",
    branche: "Sonstige",
    umsatz: "50.000-100.000 €",
    zusammenarbeit: "Einmalige Beratung",
    anmerkungen:
      "Gründung wurde verschoben, erschien nicht zum Erstgespräch und reagierte danach nicht mehr auf zwei Nachfassmails.",
    phase: "verloren",
    sachbearbeiter: "Sophie Klein",
    erstelltAm: daysAgo(11),
    inPhaseSeit: daysAgo(8),
    naechsteAufgabe: "Archiviert",
    checks: noChecks,
    verlustGrund: "No-Show",
  },
  {
    id: "mandant-leon-arnold",
    vorname: "Leon",
    nachname: "Arnold",
    firmenname: "Arnold Software Solutions",
    email: "leon.arnold@example.de",
    telefon: "+49 170 3402 8111",
    typ: "Selbstständig/Freiberufler",
    rechtsform: "Freiberufler",
    branche: "IT & Software",
    umsatz: "100.000-250.000 €",
    zusammenarbeit: "Laufende Betreuung",
    anmerkungen:
      "Softwareentwickler mit US-Kunden und wenigen, aber hohen Rechnungen. Wünscht monatliche Voranmeldung und Beratung zu Rücklagen.",
    phase: "aktiv",
    sachbearbeiter: "Miriam Vogt",
    erstelltAm: daysAgo(24),
    inPhaseSeit: daysAgo(1),
    naechsteAufgabe: "An laufendes FiBu-Team übergeben",
    faelligAm: dueIn(2),
    checks: fullChecks,
  },
];

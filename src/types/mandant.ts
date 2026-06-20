export type Typ =
  | "Unternehmer"
  | "Selbstständig/Freiberufler"
  | "Gründer"
  | "Privatperson";

export type Rechtsform =
  | "GmbH"
  | "UG (haftungsbeschränkt)"
  | "GmbH & Co. KG"
  | "GbR"
  | "OHG"
  | "Andere"
  | "Freiberufler"
  | "Gewerbetreibend"
  | "Kleinunternehmer"
  | "-";

export type Branche =
  | "Beratung & Consulting"
  | "IT & Software"
  | "Medien & Kreativberufe"
  | "Ärzte & Heilberufe"
  | "Handwerk"
  | "Vertrieb & Sales"
  | "Sonstige";

export type Umsatz =
  | "Unter 30.000 €"
  | "30.000-50.000 €"
  | "50.000-100.000 €"
  | "100.000-250.000 €"
  | "Über 250.000 €";

export type Zusammenarbeit = "Laufende Betreuung" | "Einmalige Beratung";

export type Phase =
  | "neue_anfrage"
  | "erstgespraech"
  | "unterlagen_angefordert"
  | "unterlagen_erhalten"
  | "mandatsvertrag"
  | "aktiv"
  | "pausiert"
  | "verloren";

export type VerlustGrund =
  | "Kein Interesse"
  | "Anderer Berater"
  | "Preis"
  | "No-Show"
  | "Kein Fit";

export interface TeamMember {
  id: string;
  name: string;
  color: string;
}

export interface OnboardingChecks {
  gwgIdentifiziert: boolean;
  vollmachtErteilt: boolean;
  mandatsvertragUnterschrieben: boolean;
  sepaMandat: boolean;
  datevAngelegt: boolean;
}

export type KontaktKanal = "Anruf" | "E-Mail";
export type KontaktStatus =
  | "Nicht erreicht"
  | "Mailbox erreicht"
  | "Rückruf erbeten"
  | "E-Mail gesendet"
  | "Antwort ausstehend"
  | "Terminoptionen gesendet"
  | "Unzustellbar";

export interface KontaktHistorieEintrag {
  id: string;
  kanal: KontaktKanal;
  status: KontaktStatus;
  erstelltAm: string;
}

export interface MandantCard {
  id: string;
  vorname: string;
  nachname: string;
  firmenname?: string;
  email: string;
  telefon: string;
  typ: Typ;
  rechtsform: Rechtsform;
  branche: Branche;
  umsatz: Umsatz;
  zusammenarbeit: Zusammenarbeit;
  anmerkungen?: string;
  kontaktHistorie?: KontaktHistorieEintrag[];
  phase: Phase;
  sachbearbeiter: string;
  erstelltAm: string;
  inPhaseSeit: string;
  naechsteAufgabe?: string;
  naechsterSchritt?: string;
  faelligAm?: string;
  checks: OnboardingChecks;
  verlustGrund?: VerlustGrund;
}

export interface PhaseConfig {
  id: Phase;
  label: string;
  shortLabel: string;
  description: string;
  offPipeline?: boolean;
}

export type ActivityKind =
  | "move"
  | "gate"
  | "automation"
  | "update"
  | "create"
  | "delete";

export interface ActivityEntry {
  id: string;
  cardId: string;
  cardName: string;
  kind: ActivityKind;
  text: string;
  createdAt: string;
}

export type ToastKind = "success" | "warning" | "danger" | "info";

export interface ToastMessage {
  id: string;
  kind: ToastKind;
  title: string;
  text?: string;
}

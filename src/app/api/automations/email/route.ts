import { checkLabels, checkOrder } from "@/lib/board-data";
import { formatDate, fullName } from "@/lib/board-utils";
import type { MandantCard } from "@/types/mandant";

export const runtime = "nodejs";

type EmailAutomationKind =
  | "appointment_scheduled"
  | "documents_received"
  | "engagement_letter"
  | "active_handover";

interface EmailAutomationRequest {
  kind: EmailAutomationKind;
  recipientEmail?: string;
  recipientName?: string;
  card?: MandantCard;
}

interface AutomationMailCopy {
  status: string;
  subject: string;
  headline: string;
  intro: string;
  action: string;
  checklistTitle: string;
  checklistItems: string[];
  footer: string;
}

function isEmailAutomationKind(value: unknown): value is EmailAutomationKind {
  return (
    value === "appointment_scheduled" ||
    value === "documents_received" ||
    value === "engagement_letter" ||
    value === "active_handover"
  );
}

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function listOpenChecks(card: MandantCard) {
  const openChecks = checkOrder
    .filter((key) => !card.checks[key])
    .map((key) => checkLabels[key]);

  return openChecks;
}

function responsibleName(card: MandantCard) {
  return card.sachbearbeiter || "Onboarding-Team";
}

function greetingName(card: MandantCard) {
  const name = responsibleName(card);
  return name === "Onboarding-Team" ? name : name.split(" ")[0];
}

function mandateType(card: MandantCard) {
  return card.rechtsform === "-" ? card.typ : card.rechtsform;
}

function nextTask(card: MandantCard) {
  return card.naechsteAufgabe || card.naechsterSchritt || "Noch nicht gepflegt";
}

function checklistItems(kind: EmailAutomationKind, card: MandantCard) {
  if (kind === "appointment_scheduled") {
    return [
      "Mandantenprofil und Notizen vor dem Gespräch prüfen",
      "offene Rückfragen im Board ergänzen",
      "Zuständigkeit und nächste Aufgabe abstimmen",
      "nach dem Gespräch Unterlagenbedarf festlegen",
    ];
  }

  if (kind === "documents_received") {
    return [
      "Unterlagen auf Vollständigkeit prüfen",
      "fehlende Dokumente oder Rückfragen im Board notieren",
      "Fälligkeit und nächste Aufgabe aktualisieren",
      "bei vollständigen Unterlagen Mandatsvertrag vorbereiten",
    ];
  }

  if (kind === "engagement_letter") {
    const openChecks = listOpenChecks(card);
    return openChecks.length > 0
      ? openChecks
      : [
          "Alle Pflichtchecks sind aktuell erledigt. Bitte vor Aktivierung kurz plausibilisieren.",
        ];
  }

  return [
    "laufende Betreuung über neues Mandat informieren",
    "Mandantenprofil und nächste Aufgabe prüfen",
    "DATEV- und Zugangsstatus intern abstimmen",
    "erste wiederkehrende Betreuungsschritte planen",
  ];
}

function mailCopy(kind: EmailAutomationKind, card: MandantCard): AutomationMailCopy {
  const name = fullName(card);

  if (kind === "appointment_scheduled") {
    return {
      status: "Erstgespräch geplant",
      subject: `Erstgespräch vorbereiten: ${name}`,
      headline: "Erstgespräch vorbereiten",
      intro:
        `Für ${name} ist ein Erstgespräch geplant. Bitte prüfe vorab die vorhandenen Mandantendaten und ergänze offene Punkte direkt im Board.`,
      action:
        "Gesprächsvorbereitung prüfen und offene Rückfragen vor dem Termin festhalten.",
      checklistTitle: "Vorbereitung",
      checklistItems: checklistItems(kind, card),
      footer:
        "Diese Nachricht wurde automatisch ausgelöst, weil die Karte nach Erstgespräch geplant verschoben wurde.",
    };
  }

  if (kind === "documents_received") {
    return {
      status: "Unterlagen erhalten",
      subject: `Unterlagen prüfen: ${name} wartet auf Review`,
      headline: `Unterlagen für ${name} prüfen`,
      intro:
        "Die Unterlagen sind im Onboarding als erhalten markiert. Bitte prüfe, ob alles vollständig ist, und dokumentiere fehlende Punkte direkt im Board.",
      action:
        "Vollständigkeitsprüfung starten und die nächste Aufgabe im Board aktualisieren.",
      checklistTitle: "Prüffokus",
      checklistItems: checklistItems(kind, card),
      footer:
        "Diese Nachricht wurde automatisch ausgelöst, weil die Karte nach Unterlagen erhalten verschoben wurde.",
    };
  }

  if (kind === "engagement_letter") {
    return {
      status: "Mandatsvertrag versendet",
      subject: `Pflichtchecks offen: ${name} vor Aktivierung prüfen`,
      headline: "Pflichtchecks vor Aktivierung absichern",
      intro:
        `Der Mandatsvertrag für ${name} wurde versendet. Bevor das Mandat aktiv übergeben wird, sollten die offenen Pflichtschritte sauber nachgehalten werden.`,
      action:
        "Offene Pflichtchecks nachfassen und das Mandat erst nach vollständiger Prüfung aktivieren.",
      checklistTitle: "Offene Pflichtchecks",
      checklistItems: checklistItems(kind, card),
      footer:
        "Diese Nachricht wurde automatisch ausgelöst, weil die Karte nach Mandatsvertrag versendet verschoben wurde.",
    };
  }

  return {
    status: "Unterzeichnet & aktiv",
    subject: `Mandat aktiv: Übergabe für ${name} vorbereiten`,
    headline: "Mandat an laufende Betreuung übergeben",
    intro:
      `${name} wurde als aktives Mandat markiert. Die Pflichtchecks sind abgeschlossen; jetzt sollte die operative Übergabe an die laufende Betreuung vorbereitet werden.`,
    action:
      "Übergabe an das zuständige Betreuungsteam vorbereiten und die nächste interne Aufgabe festlegen.",
    checklistTitle: "Übergabe-Fokus",
    checklistItems: checklistItems(kind, card),
    footer:
      "Diese Nachricht wurde automatisch ausgelöst, weil die Karte nach Unterzeichnet & aktiv verschoben wurde.",
  };
}

function detailRows(card: MandantCard) {
  return [
    ["Mandant", fullName(card)],
    ["Firma", card.firmenname || "-"],
    ["Mandatsart", mandateType(card)],
    ["Zuständig", responsibleName(card)],
    ["E-Mail", card.email],
    ["Telefon", card.telefon],
    ["Nächste Aufgabe", nextTask(card)],
    ["Fällig", formatDate(card.faelligAm)],
  ];
}

function plainLines(kind: EmailAutomationKind, card: MandantCard) {
  const copy = mailCopy(kind, card);

  return [
    "Guhr Mandanten-Onboarding",
    "",
    copy.subject,
    "",
    `Hallo ${greetingName(card)},`,
    "",
    copy.intro,
    "",
    "Nächste Aktion:",
    copy.action,
    "",
    `${copy.checklistTitle}:`,
    ...copy.checklistItems.map((item) => `- ${item}`),
    "",
    "Mandant:",
    ...detailRows(card).map(([label, value]) => `${label}: ${value}`),
    "",
    copy.footer,
  ];
}

function htmlContent(kind: EmailAutomationKind, card: MandantCard) {
  const copy = mailCopy(kind, card);
  const rows = detailRows(card);

  return `
    <div style="display:none; max-height:0; overflow:hidden; opacity:0;">
      ${escapeHtml(copy.action)}
    </div>
    <div style="margin:0; padding:0; background:#f5f6fa; font-family:Arial, Helvetica, sans-serif; color:#23304f;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%; background:#f5f6fa; border-collapse:collapse;">
        <tr>
          <td align="center" style="padding:28px 14px;">
            <table role="presentation" width="640" cellspacing="0" cellpadding="0" style="width:100%; max-width:640px; border-collapse:collapse; background:#ffffff; border:1px solid #e6e8ef; border-radius:14px; overflow:hidden;">
              <tr>
                <td style="background:#23304f; padding:28px 32px 26px;">
                  <p style="margin:0 0 14px; color:#d9c28c; font-size:11px; font-weight:700; letter-spacing:0.16em; text-transform:uppercase;">Guhr Mandanten-Onboarding</p>
                  <h1 style="margin:0; color:#ffffff; font-size:24px; line-height:1.25; font-weight:700;">${escapeHtml(copy.headline)}</h1>
                  <div style="margin-top:16px;">
                    <span style="display:inline-block; padding:7px 11px; border-radius:999px; background:rgba(255,255,255,0.12); color:#f4ecda; font-size:12px; font-weight:700;">${escapeHtml(copy.status)}</span>
                  </div>
                </td>
              </tr>
              <tr>
                <td style="padding:30px 32px 32px;">
                  <p style="margin:0 0 12px; color:#23304f; font-size:15px; line-height:1.6; font-weight:700;">Hallo ${escapeHtml(greetingName(card))},</p>
                  <p style="margin:0 0 22px; color:#4d566d; font-size:15px; line-height:1.65;">${escapeHtml(copy.intro)}</p>

                  <div style="margin:0 0 22px; padding:18px 20px; border-left:4px solid #c2a15c; background:#fbf7ec; border-radius:10px;">
                    <p style="margin:0 0 6px; color:#a98c45; font-size:11px; font-weight:700; letter-spacing:0.13em; text-transform:uppercase;">Nächste Aktion</p>
                    <p style="margin:0; color:#23304f; font-size:16px; line-height:1.55; font-weight:700;">${escapeHtml(copy.action)}</p>
                  </div>

                  <div style="margin:0 0 24px; padding:18px 20px; border:1px solid #eceef3; background:#fbfbfd; border-radius:12px;">
                    <p style="margin:0 0 12px; color:#23304f; font-size:15px; font-weight:700;">${escapeHtml(copy.checklistTitle)}</p>
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse; width:100%;">
                      ${copy.checklistItems
                        .map(
                          (item) => `
                            <tr>
                              <td style="padding:7px 0; vertical-align:top; width:24px;">
                                <span style="display:inline-block; width:13px; height:13px; border:2px solid #c2a15c; border-radius:4px;"></span>
                              </td>
                              <td style="padding:5px 0 7px; color:#4d566d; font-size:14px; line-height:1.45;">${escapeHtml(item)}</td>
                            </tr>
                          `,
                        )
                        .join("")}
                    </table>
                  </div>

                  <p style="margin:0 0 10px; color:#23304f; font-size:15px; font-weight:700;">Mandantendaten</p>
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse; width:100%; border:1px solid #eceef3; border-radius:10px; overflow:hidden;">
                    ${rows
                      .map(
                        ([label, value]) => `
                          <tr>
                            <td style="padding:10px 12px; border-bottom:1px solid #eceef3; background:#fbfbfd; color:#6b7286; font-size:13px; width:170px;">${escapeHtml(label)}</td>
                            <td style="padding:10px 12px; border-bottom:1px solid #eceef3; color:#23304f; font-size:13px; font-weight:700;">${escapeHtml(value)}</td>
                          </tr>
                        `,
                      )
                      .join("")}
                  </table>

                  <p style="margin:20px 0 0; color:#7a8195; font-size:12px; line-height:1.55;">${escapeHtml(copy.footer)}</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </div>
  `;
}

export async function POST(request: Request) {
  const apiKey = process.env.RESEND_API_KEY;
  const senderEmail = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";
  const senderName = process.env.RESEND_FROM_NAME || "Guhr Mandanten-Onboarding";
  const fallbackRecipientEmail =
    process.env.AUTOMATION_RECIPIENT_EMAIL ||
    process.env.NEXT_PUBLIC_AUTOMATION_RECIPIENT_EMAIL ||
    "";
  if (!apiKey) {
    return Response.json(
      {
        error:
          "Resend ist nicht konfiguriert. Bitte RESEND_API_KEY in .env.local setzen.",
      },
      { status: 500 },
    );
  }

  let body: EmailAutomationRequest;

  try {
    body = (await request.json()) as EmailAutomationRequest;
  } catch {
    return Response.json({ error: "Ungültiger Request." }, { status: 400 });
  }

  if (!isEmailAutomationKind(body.kind)) {
    return Response.json({ error: "Unbekannte Automation." }, { status: 400 });
  }

  if (!body.card) {
    return Response.json({ error: "Mandant fehlt." }, { status: 400 });
  }

  const recipientEmail = body.recipientEmail?.trim() || fallbackRecipientEmail;

  if (!isEmail(recipientEmail)) {
    return Response.json(
      { error: "Bitte einen gültigen Benachrichtigungsempfänger konfigurieren." },
      { status: 400 },
    );
  }

  const subject = mailCopy(body.kind, body.card).subject;
  const textContent = plainLines(body.kind, body.card).join("\n");
  const sender = `${senderName} <${senderEmail}>`;

  const resendResponse = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
      "user-agent": "guhr-onboarding-board/0.1",
    },
    body: JSON.stringify({
      from: sender,
      to: [recipientEmail],
      subject,
      html: htmlContent(body.kind, body.card),
      text: textContent,
    }),
  });

  if (!resendResponse.ok) {
    const errorText = await resendResponse.text();
    const lowerError = errorText.toLowerCase();
    const restrictedTestRecipient =
      lowerError.includes("only send testing emails") ||
      lowerError.includes("verify a domain") ||
      lowerError.includes("domain is not verified");

    return Response.json(
      {
        error: restrictedTestRecipient
          ? "Resend benötigt eine verifizierte Absenderdomain oder einen erlaubten Test-Empfänger."
          : "Resend konnte die E-Mail nicht versenden.",
        detail: errorText,
      },
      { status: resendResponse.status },
    );
  }

  const result = (await resendResponse.json()) as { id?: string };

  return Response.json({
    ok: true,
    messageId: result.id,
    subject,
  });
}

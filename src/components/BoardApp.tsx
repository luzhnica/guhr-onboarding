"use client";

import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import clsx from "clsx";
import Image from "next/image";
import {
  AlertTriangle,
  Bell,
  Building2,
  CalendarDays,
  ClipboardCheck,
  Mail,
  NotepadText,
  Phone,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import {
  brancheOptions,
  checkLabels,
  checkOrder,
  phases,
  rechtsformOptions,
  typOptions,
  umsatzOptions,
  verlustGrundOptions,
  zusammenarbeitOptions,
} from "@/lib/board-data";
import {
  checklistComplete,
  checklistProgress,
  createId,
  formatDate,
  formatDateTime,
  formatShortDate,
  fullName,
  isPhase,
  phaseById,
} from "@/lib/board-utils";
import { useBoardStore } from "@/store/board-store";
import type {
  Branche,
  KontaktKanal,
  KontaktStatus,
  MandantCard,
  Phase,
  Rechtsform,
  TeamMember,
  ToastMessage,
  ToastKind,
  Typ,
  Umsatz,
  VerlustGrund,
  Zusammenarbeit,
} from "@/types/mandant";

const toastClasses: Record<ToastKind, string> = {
  success: "guhr-toast-success",
  warning: "guhr-toast-warning",
  danger: "guhr-toast-danger",
  info: "guhr-toast-info",
};

const TOAST_AUTO_DISMISS_MS = 5000;
const UNASSIGNED_TEAM_LABEL = "Nicht zugewiesen";
const ADD_TEAM_MEMBER_VALUE = "__add_team_member__";
const DEFAULT_TEAM_COLOR = "#6B7286";
const AUTOMATION_RECIPIENT_STORAGE_KEY = "guhr-automation-notification-recipient";
const FIXED_AUTOMATION_RECIPIENT =
  process.env.NEXT_PUBLIC_AUTOMATION_RECIPIENT_EMAIL || "";
const FIXED_AUTOMATION_RECIPIENT_NAME =
  process.env.NEXT_PUBLIC_AUTOMATION_RECIPIENT_NAME || "Empfänger";
const kontaktKanalOptions: KontaktKanal[] = ["Anruf", "E-Mail"];
const kontaktStatusOptionsByKanal: Record<KontaktKanal, KontaktStatus[]> = {
  Anruf: ["Nicht erreicht", "Mailbox erreicht", "Rückruf erbeten"],
  "E-Mail": [
    "E-Mail gesendet",
    "Antwort ausstehend",
    "Terminoptionen gesendet",
    "Unzustellbar",
  ],
};

type EmailAutomationKind =
  | "appointment_scheduled"
  | "documents_received"
  | "engagement_letter"
  | "active_handover";

interface AutomationDefinition {
  badge: string;
  title: string;
  summary: string;
  confirmLabel: string;
  requiresEmail: boolean;
  emailKind?: EmailAutomationKind;
}

interface PendingAutomation {
  cardId: string;
  destinationPhase: Phase;
  overCardId?: string;
}

const automationDefinitions: Partial<Record<Phase, AutomationDefinition>> = {
  erstgespraech: {
    badge: "E-Mail",
    title: "Erstgespräch bestätigen",
    summary: "Karte verschieben und E-Mail zur Gesprächsvorbereitung senden.",
    confirmLabel: "Bestätigen",
    requiresEmail: true,
    emailKind: "appointment_scheduled",
  },
  unterlagen_erhalten: {
    badge: "E-Mail",
    title: "Unterlagenprüfung anstoßen",
    summary: "Karte verschieben und E-Mail zur Vollständigkeitsprüfung senden.",
    confirmLabel: "Bestätigen",
    requiresEmail: true,
    emailKind: "documents_received",
  },
  mandatsvertrag: {
    badge: "E-Mail",
    title: "Pflichtschritte nachfassen",
    summary: "Karte verschieben und E-Mail zu offenen Pflichtchecks senden.",
    confirmLabel: "Bestätigen",
    requiresEmail: true,
    emailKind: "engagement_letter",
  },
  aktiv: {
    badge: "E-Mail",
    title: "Übergabe an laufende Betreuung",
    summary: "Karte aktivieren und E-Mail zur Übergabe senden.",
    confirmLabel: "Bestätigen",
    requiresEmail: true,
    emailKind: "active_handover",
  },
};

function automationForPhase(phase: Phase) {
  return automationDefinitions[phase];
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function padDatePart(value: number) {
  return String(value).padStart(2, "0");
}

function contactFormDefaults() {
  const now = new Date();
  return {
    datum: [
      now.getFullYear(),
      padDatePart(now.getMonth() + 1),
      padDatePart(now.getDate()),
    ].join("-"),
    uhrzeit: [
      padDatePart(now.getHours()),
      padDatePart(now.getMinutes()),
    ].join(":"),
  };
}

function contactAttemptIso(datum: string, uhrzeit: string) {
  const value = new Date(`${datum}T${uhrzeit}:00`);
  return Number.isNaN(value.getTime()) ? new Date().toISOString() : value.toISOString();
}

function legacyContactAttemptCount(card: MandantCard) {
  const legacyAttempts = (card as MandantCard & { kontaktversuche?: unknown })
    .kontaktversuche;

  if (typeof legacyAttempts !== "number") return 0;
  return Math.max(0, Math.floor(legacyAttempts));
}

function contactAttemptCount(card: MandantCard) {
  return (card.kontaktHistorie?.length || 0) + legacyContactAttemptCount(card);
}

function assignedTeamMemberName(name?: string) {
  return name?.trim() || "";
}

function findTeamMember(teamMembers: TeamMember[], name?: string) {
  const assignedName = assignedTeamMemberName(name);
  if (!assignedName) return undefined;
  return teamMembers.find(
    (member) => member.name.trim().toLowerCase() === assignedName.toLowerCase(),
  );
}

function normalizeHexColor(color?: string) {
  return color && /^#[0-9a-f]{6}$/i.test(color) ? color : DEFAULT_TEAM_COLOR;
}

function hexToRgba(hex: string, alpha: number) {
  const normalized = normalizeHexColor(hex).slice(1);
  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function teamMemberPillStyle(color?: string): CSSProperties {
  const normalizedColor = normalizeHexColor(color);
  return {
    backgroundColor: hexToRgba(normalizedColor, 0.12),
    borderColor: hexToRgba(normalizedColor, 0.24),
    color: normalizedColor,
  };
}

function findDestinationPhase(
  overId: string | undefined,
  cards: MandantCard[],
): Phase | undefined {
  if (!overId) return undefined;
  if (isPhase(overId)) return overId;
  return cards.find((card) => card.id === overId)?.phase;
}

export default function BoardApp() {
  const cards = useBoardStore((state) => state.cards);
  const hydrated = useBoardStore((state) => state.hydrated);
  const moveCard = useBoardStore((state) => state.moveCard);
  const addToast = useBoardStore((state) => state.addToast);
  const [query, setQuery] = useState("");
  const [activeCardId, setActiveCardId] = useState<string>();
  const [overPhase, setOverPhase] = useState<Phase>();
  const [showActivity, setShowActivity] = useState(false);
  const [pendingAutomation, setPendingAutomation] = useState<PendingAutomation>();
  const [automationBusy, setAutomationBusy] = useState(false);
  const [automationError, setAutomationError] = useState<string>();
  const [automationRecipient, setAutomationRecipient] = useState(() => {
    if (FIXED_AUTOMATION_RECIPIENT) return FIXED_AUTOMATION_RECIPIENT;
    if (typeof window === "undefined") return "";
    return window.localStorage.getItem(AUTOMATION_RECIPIENT_STORAGE_KEY) || "";
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const filteredCards = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return cards;
    return cards.filter((card) =>
      [
        fullName(card),
        card.firmenname,
        card.rechtsform,
        card.branche,
        card.sachbearbeiter,
        card.anmerkungen,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(needle),
    );
  }, [cards, query]);

  const activeCard = cards.find((card) => card.id === activeCardId);
  const pendingAutomationCard = pendingAutomation
    ? cards.find((card) => card.id === pendingAutomation.cardId)
    : undefined;
  const pendingAutomationDefinition = pendingAutomation
    ? automationForPhase(pendingAutomation.destinationPhase)
    : undefined;

  function handleDragStart(event: DragStartEvent) {
    setActiveCardId(String(event.active.id));
  }

  function handleDragOver(event: DragOverEvent) {
    setOverPhase(findDestinationPhase(String(event.over?.id ?? ""), cards));
  }

  function handleDragEnd(event: DragEndEvent) {
    const activeId = String(event.active.id);
    const overId = event.over ? String(event.over.id) : undefined;
    const destination = findDestinationPhase(overId, cards);
    const sourceCard = cards.find((card) => card.id === activeId);
    const overCardId = overId && !isPhase(overId) ? overId : undefined;

    setActiveCardId(undefined);
    setOverPhase(undefined);

    if (!destination || !sourceCard) return;

    if (sourceCard.phase === destination) {
      moveCard(activeId, destination, overCardId);
      return;
    }

    const automationDefinition = automationForPhase(destination);

    if (automationDefinition) {
      if (destination === "aktiv" && !checklistComplete(sourceCard.checks)) {
        moveCard(activeId, destination, overCardId);
        return;
      }

      setPendingAutomation({
        cardId: activeId,
        destinationPhase: destination,
        overCardId,
      });
      setAutomationError(undefined);
      return;
    }

    moveCard(activeId, destination, overCardId);
  }

  function cancelPendingAutomation() {
    if (automationBusy) return;
    setPendingAutomation(undefined);
    setAutomationError(undefined);
  }

  async function confirmPendingAutomation() {
    if (!pendingAutomation || !pendingAutomationCard || !pendingAutomationDefinition) {
      return;
    }

    const effectiveAutomationRecipient =
      FIXED_AUTOMATION_RECIPIENT || automationRecipient.trim();

    if (
      pendingAutomationDefinition.requiresEmail &&
      !isValidEmail(effectiveAutomationRecipient)
    ) {
      setAutomationError("Bitte trage einen gültigen Empfänger ein.");
      return;
    }

    setAutomationBusy(true);
    setAutomationError(undefined);

    try {
      if (pendingAutomationDefinition.requiresEmail) {
        const response = await fetch("/api/automations/email", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            kind: pendingAutomationDefinition.emailKind,
            recipientEmail: effectiveAutomationRecipient,
            recipientName: FIXED_AUTOMATION_RECIPIENT_NAME,
            card: pendingAutomationCard,
          }),
        });
        const payload = (await response.json().catch(() => ({}))) as {
          error?: string;
        };

        if (!response.ok) {
          throw new Error(
            payload.error || "Die E-Mail-Automation konnte nicht ausgeführt werden.",
          );
        }

        if (!FIXED_AUTOMATION_RECIPIENT) {
          window.localStorage.setItem(
            AUTOMATION_RECIPIENT_STORAGE_KEY,
            effectiveAutomationRecipient,
          );
        }
      }

      const moved = moveCard(
        pendingAutomation.cardId,
        pendingAutomation.destinationPhase,
        pendingAutomation.overCardId,
      );

      if (!moved) {
        throw new Error("Die Karte konnte nicht verschoben werden.");
      }

      setPendingAutomation(undefined);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Die Automation konnte nicht ausgeführt werden.";
      setAutomationError(message);
      addToast("danger", "Automation gestoppt", message);
    } finally {
      setAutomationBusy(false);
    }
  }

  return (
    <div className="guhr-page flex flex-col">
      <header className="z-30 flex flex-col">
        <div className="guhr-topbar flex items-center justify-between">
          <div className="flex items-center">
            <Image
              src="/guhr-logo-white.svg"
              alt="Guhr Steuerberatung"
              width={156}
              height={32}
              priority
              className="h-8 w-auto"
            />
          </div>
          <div className="flex items-center gap-2 text-white/70">
            <button
              type="button"
              onClick={() => setShowActivity(true)}
              className="inline-flex h-8 items-center gap-2 rounded-[8px] px-2.5 text-[12.5px] font-semibold transition hover:bg-white/10 hover:text-white"
              aria-label="Aktivitätsverlauf öffnen"
            >
              <Bell className="h-[19px] w-[19px]" strokeWidth={1.7} />
              Aktivität
            </button>
          </div>
        </div>

        <div className="guhr-subheader">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <p className="guhr-eyebrow">Mandanten-Onboarding</p>
              <h1 className="guhr-heading mt-[5px]">
                Vom Erstkontakt zum aktiven Mandat
              </h1>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative max-w-xl flex-1">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--guhr-muted-4)]" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                aria-label="Mandanten suchen"
                placeholder="Mandant, Firma oder Bearbeiter suchen"
                className="field-input h-10 rounded-full !pl-11 !pr-10 text-[12.5px] font-semibold"
              />
              {query ? (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full text-[var(--guhr-muted)] transition hover:bg-[var(--guhr-canvas)]"
                  aria-label="Suche zurücksetzen"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </header>

      <main className="min-h-0 flex-1 overflow-hidden px-7 pb-[26px] pt-[18px] max-xl:overflow-x-hidden max-xl:overflow-y-visible max-md:px-5">
        {!hydrated ? (
          <div className="guhr-card text-[13.5px] text-[var(--guhr-muted)]">
            Board wird geladen ...
          </div>
        ) : (
          <div className="guhr-board-grid">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCorners}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDragEnd={handleDragEnd}
              onDragCancel={() => {
                setActiveCardId(undefined);
                setOverPhase(undefined);
              }}
            >
              <section
                aria-label="Mandanten-Onboarding-Board"
                className="board-scroll h-full min-h-0 w-full min-w-0 max-w-full overflow-x-auto overflow-y-hidden pb-2"
              >
                <div className="flex h-full min-h-0 items-start gap-4">
                  {phases.map((phase) => (
                    <BoardColumn
                      key={phase.id}
                      phase={phase.id}
                      cards={filteredCards.filter((card) => card.phase === phase.id)}
                      isOver={overPhase === phase.id}
                      queryActive={query.trim().length > 0}
                    />
                  ))}
                </div>
              </section>

              <DragOverlay dropAnimation={{ duration: 180 }}>
                {activeCard ? <CardShell card={activeCard} overlay /> : null}
              </DragOverlay>
            </DndContext>

          </div>
        )}
      </main>

      {showActivity ? (
        <div className="fixed inset-0 z-40">
          <button
            aria-label="Aktivitätsverlauf schließen"
            className="absolute inset-0 bg-[rgba(20,26,42,0.30)] backdrop-blur-[1.5px]"
            onClick={() => setShowActivity(false)}
          />
          <div className="absolute right-6 top-[76px] w-[min(360px,calc(100vw-32px))] max-md:right-4 max-md:top-[72px]">
            <ActivityPanel onClose={() => setShowActivity(false)} />
          </div>
        </div>
      ) : null}

      <DetailDrawer />
      {pendingAutomation && pendingAutomationCard && pendingAutomationDefinition ? (
        <AutomationConfirmDialog
          card={pendingAutomationCard}
          destinationPhase={pendingAutomation.destinationPhase}
          definition={pendingAutomationDefinition}
          recipientEmail={FIXED_AUTOMATION_RECIPIENT || automationRecipient}
          onRecipientEmailChange={setAutomationRecipient}
          recipientLocked={Boolean(FIXED_AUTOMATION_RECIPIENT)}
          busy={automationBusy}
          error={automationError}
          onCancel={cancelPendingAutomation}
          onConfirm={confirmPendingAutomation}
        />
      ) : null}
      <ToastStack />
    </div>
  );
}

function AutomationConfirmDialog({
  card,
  destinationPhase,
  definition,
  recipientEmail,
  onRecipientEmailChange,
  recipientLocked,
  busy,
  error,
  onCancel,
  onConfirm,
}: {
  card: MandantCard;
  destinationPhase: Phase;
  definition: AutomationDefinition;
  recipientEmail: string;
  onRecipientEmailChange: (value: string) => void;
  recipientLocked: boolean;
  busy: boolean;
  error?: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const needsRecipient = definition.requiresEmail;
  const recipientMissing = needsRecipient && !isValidEmail(recipientEmail);

  return (
    <div className="fixed inset-0 z-[60]">
      <button
        type="button"
        aria-label="Automation abbrechen"
        className="absolute inset-0 bg-[rgba(20,26,42,0.42)] backdrop-blur-[2px]"
        onClick={onCancel}
        disabled={busy}
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="automation-confirm-title"
        className="absolute left-1/2 top-1/2 w-[min(456px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 rounded-[16px] border border-[var(--guhr-line)] bg-white shadow-[0_22px_70px_rgba(20,26,42,0.28)]"
      >
        <div className="border-b border-[var(--guhr-line)] px-5 py-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="guhr-section-label">{definition.badge}</p>
              <h2
                id="automation-confirm-title"
                className="mt-1 text-[21px] font-bold leading-tight text-[var(--guhr-text)]"
              >
                {definition.title}
              </h2>
            </div>
            <button
              type="button"
              onClick={onCancel}
              disabled={busy}
              className="grid h-9 w-9 place-items-center rounded-[9px] text-[var(--guhr-muted)] transition hover:bg-[var(--guhr-canvas)] disabled:opacity-50"
              aria-label="Automation abbrechen"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="px-5 py-4">
          <div className="rounded-[12px] border border-[var(--guhr-line)] bg-[var(--guhr-panel)] p-3.5">
            <p className="text-[13.5px] font-bold text-[var(--guhr-text)]">
              {fullName(card)}
            </p>
            <dl className="mt-3 space-y-2 text-[12.5px]">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-[var(--guhr-muted)]">Ziel</dt>
                <dd className="text-right font-bold text-[var(--guhr-text)]">
                  {phaseById[destinationPhase].label}
                </dd>
              </div>
              {needsRecipient ? (
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-[var(--guhr-muted)]">Empfänger</dt>
                  <dd className="max-w-[250px] truncate text-right font-bold text-[var(--guhr-text)]">
                    {recipientEmail || "Nicht gesetzt"}
                  </dd>
                </div>
              ) : null}
            </dl>
            <p className="mt-3 border-t border-[var(--guhr-rule)] pt-3 text-[12.5px] leading-[1.45] text-[var(--guhr-text-soft)]">
              {definition.summary}
            </p>
          </div>

          {needsRecipient && !recipientLocked ? (
            <label className="mt-4 block">
              <span className="field-label">Empfänger</span>
              <input
                type="email"
                value={recipientEmail}
                onChange={(event) => onRecipientEmailChange(event.target.value)}
                placeholder="benachrichtigung@example.de"
                disabled={recipientLocked}
                className="field-input mt-1 h-10"
              />
            </label>
          ) : null}

          {error ? (
            <div className="mt-4 flex gap-2 rounded-[11px] border border-[var(--guhr-danger-border)] bg-[var(--guhr-danger-bg)] px-3 py-3 text-[12.5px] leading-[1.45] text-[#8E3A30]">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              {error}
            </div>
          ) : null}
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-[var(--guhr-line)] px-5 py-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="guhr-chip justify-center disabled:opacity-60"
          >
            Abbrechen
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy || recipientMissing}
            className="guhr-chip guhr-chip-strong justify-center disabled:opacity-60"
          >
            {busy ? "Wird ausgeführt ..." : definition.confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}

function BoardColumn({
  phase,
  cards,
  isOver,
  queryActive,
}: {
  phase: Phase;
  cards: MandantCard[];
  isOver: boolean;
  queryActive: boolean;
}) {
  const config = phaseById[phase];
  const { setNodeRef } = useDroppable({
    id: phase,
    data: { type: "column", phase },
  });

  return (
    <section
      ref={setNodeRef}
      className={clsx(
        "guhr-lane w-[288px] shrink-0",
        config.offPipeline && "guhr-lane-muted",
        isOver && "guhr-lane-over",
      )}
    >
      <div className="flex flex-none flex-col gap-2">
        <div className="flex items-center justify-between gap-3 px-1 pb-0.5 pt-px">
          <div>
            <p className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-[var(--guhr-gold-dark)]">
              {config.shortLabel}
            </p>
            <h2
              className={clsx(
                "guhr-lane-title mt-1",
                config.offPipeline && "guhr-lane-title-muted",
              )}
            >
              {config.label}
            </h2>
          </div>
          <span className="guhr-count-badge">
            {cards.length}
          </span>
        </div>
        <p className="min-h-9 px-1 text-[12px] leading-[1.45] text-[var(--guhr-muted)]">
          {config.description}
        </p>
      </div>

      <SortableContext
        items={cards.map((card) => card.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="-mx-0.5 flex flex-1 flex-col gap-[9px] overflow-x-hidden overflow-y-auto px-0.5 py-0.5">
          {cards.map((card) => (
            <SortableCard key={card.id} card={card} />
          ))}
          {cards.length === 0 ? (
            <div className="rounded-[12px] border border-dashed border-[#C7CBD6] bg-white/60 px-4 py-5 text-center text-[13px] text-[var(--guhr-muted)]">
              {queryActive
                ? "Keine Treffer in dieser Phase."
                : "Keine Mandate in dieser Phase."}
            </div>
          ) : null}
        </div>
      </SortableContext>

      <InlineCreateForm phase={phase} />
    </section>
  );
}

function SortableCard({ card }: { card: MandantCard }) {
  const selectCard = useBoardStore((state) => state.selectCard);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: card.id,
    data: { type: "card", phase: card.phase },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <CardShell
        card={card}
        dragging={isDragging}
        onOpen={() => selectCard(card.id)}
      />
    </div>
  );
}

function CardShell({
  card,
  dragging,
  overlay,
  onOpen,
}: {
  card: MandantCard;
  dragging?: boolean;
  overlay?: boolean;
  onOpen?: () => void;
}) {
  const teamMembers = useBoardStore((state) => state.teamMembers);
  const progress = checklistProgress(card.checks);
  const contactAttempts = contactAttemptCount(card);
  const showContactAttempts =
    card.phase === "neue_anfrage" && contactAttempts > 0;
  const showChecklistProgress =
    progress.done > 0 ||
    [
      "unterlagen_angefordert",
      "unterlagen_erhalten",
      "mandatsvertrag",
      "aktiv",
    ].includes(card.phase);

  return (
    <article
      role={onOpen ? "button" : undefined}
      tabIndex={onOpen ? 0 : undefined}
      onClick={onOpen}
      onKeyDown={(event) => {
        if (onOpen && (event.key === "Enter" || event.key === " ")) {
          event.preventDefault();
          onOpen();
        }
      }}
      className={clsx(
        "guhr-card",
        onOpen && "guhr-card-clickable",
        dragging && "guhr-card-dragging",
        overlay && "guhr-card-overlay",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-[14px] font-bold leading-[1.25] text-[var(--guhr-text)]">
            {fullName(card)}
          </p>
          {card.firmenname ? (
            <p className="mt-0.5 truncate text-[12px] leading-[1.3] text-[var(--guhr-muted-2)]">
              {card.firmenname}
            </p>
          ) : null}
        </div>
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[#EEF0F5] px-2 py-1 text-[11px] font-semibold text-[#3C4663]">
          <CalendarDays className="h-3 w-3 text-[#A98C45]" strokeWidth={1.9} />
          Onboarding seit {formatShortDate(card.erstelltAm)}
        </span>
      </div>

      <div className="mt-[11px] flex flex-wrap items-center gap-2">
        <span className="guhr-card-type">
          <Building2 className="h-[13px] w-[13px]" strokeWidth={2} />
          <span>{card.rechtsform === "-" ? card.typ : card.rechtsform}</span>
        </span>
        {showContactAttempts ? (
          <span
            className={clsx(
              "guhr-contact-badge",
              contactAttempts >= 3
                ? "guhr-contact-badge-danger"
                : "guhr-contact-badge-warning",
            )}
          >
            {contactAttempts}x kontaktiert
          </span>
        ) : null}
      </div>

      <div className="mt-3 flex items-center justify-between">
        <div className="min-w-0 pr-2">
          <TeamMemberPill
            name={card.sachbearbeiter}
            teamMembers={teamMembers}
          />
        </div>
        {showChecklistProgress ? (
          <div className="guhr-progress-pill">
            <ClipboardCheck className="h-[13px] w-[13px] text-[#B69A4F]" strokeWidth={2.4} />
            <span>Pflichtchecks {progress.done}/{progress.total}</span>
          </div>
        ) : null}
      </div>
    </article>
  );
}

function TeamMemberPill({
  name,
  teamMembers,
}: {
  name?: string;
  teamMembers: TeamMember[];
}) {
  const assignedName = assignedTeamMemberName(name);
  const member = findTeamMember(teamMembers, assignedName);

  if (!assignedName) {
    return (
      <span className="guhr-team-pill guhr-team-pill-empty">
        {UNASSIGNED_TEAM_LABEL}
      </span>
    );
  }

  return (
    <span
      className="guhr-team-pill"
      style={teamMemberPillStyle(member?.color)}
      title={`Zuständig: ${assignedName}`}
    >
      {assignedName}
    </span>
  );
}

function InlineCreateForm({ phase }: { phase: Phase }) {
  const addCard = useBoardStore((state) => state.addCard);
  const [open, setOpen] = useState(false);
  const [vorname, setVorname] = useState("");
  const [nachname, setNachname] = useState("");
  const [firmenname, setFirmenname] = useState("");
  const [typ, setTyp] = useState<Typ>("Unternehmer");
  const [rechtsform, setRechtsform] = useState<Rechtsform>("GmbH");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!vorname.trim() || !nachname.trim()) return;
    addCard(phase, {
      vorname: vorname.trim(),
      nachname: nachname.trim(),
      firmenname: firmenname.trim() || undefined,
      typ,
      rechtsform,
    });
    setVorname("");
    setNachname("");
    setFirmenname("");
    setOpen(false);
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Mandant in ${phaseById[phase].label} anlegen`}
        className="guhr-add-button mt-1"
      >
        <Plus className="h-[15px] w-[15px]" />
        Mandant anlegen
      </button>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="guhr-card mt-1"
    >
      <div className="grid grid-cols-2 gap-2">
        <input
          value={vorname}
          onChange={(event) => setVorname(event.target.value)}
          placeholder="Vorname"
          aria-label="Vorname"
          className="field-input h-10"
        />
        <input
          value={nachname}
          onChange={(event) => setNachname(event.target.value)}
          placeholder="Nachname"
          aria-label="Nachname"
          className="field-input h-10"
        />
      </div>
      <input
        value={firmenname}
        onChange={(event) => setFirmenname(event.target.value)}
        placeholder="Firma (optional)"
        aria-label="Firma optional"
        className="field-input mt-2 h-10"
      />
      <div className="mt-2 grid grid-cols-2 gap-2">
        <select
          value={typ}
          onChange={(event) => setTyp(event.target.value as Typ)}
          aria-label="Mandantentyp"
          className="field-input h-10"
        >
          {typOptions.map((option) => (
            <option key={option}>{option}</option>
          ))}
        </select>
        <select
          value={rechtsform}
          onChange={(event) => setRechtsform(event.target.value as Rechtsform)}
          aria-label="Rechtsform"
          className="field-input h-10"
        >
          {rechtsformOptions.map((option) => (
            <option key={option}>{option}</option>
          ))}
        </select>
      </div>
      <div className="mt-3 flex gap-2">
        <button
          type="submit"
          className="guhr-chip guhr-chip-strong flex-1 justify-center"
        >
          Mandant anlegen
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="guhr-chip justify-center"
        >
          Abbrechen
        </button>
      </div>
    </form>
  );
}

function ActivityPanel({ onClose }: { onClose?: () => void }) {
  const activity = useBoardStore((state) => state.activity);

  return (
    <aside className="guhr-activity max-h-[calc(100vh-104px)] overflow-auto p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="guhr-section-label">
            Verlauf
          </p>
          <h2 className="mt-1 text-[19px] font-bold leading-tight tracking-[-0.01em] text-[var(--guhr-text)]">
            Aktivitätsverlauf
          </h2>
        </div>
        <span className="grid h-[34px] w-[34px] place-items-center rounded-[9px] bg-[#F7F0DD] text-[var(--guhr-gold-dark)]">
          <Bell className="h-4 w-4" />
        </span>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="grid h-[34px] w-[34px] place-items-center rounded-[9px] text-[var(--guhr-muted)] transition hover:bg-[var(--guhr-canvas)]"
            aria-label="Aktivitätsverlauf schließen"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>
      <p className="mt-3 text-[13.5px] leading-[1.55] text-[var(--guhr-text-soft)]">
        Statuswechsel, blockierte Aktivierungen und gelöschte Karten werden hier
        protokolliert.
      </p>
      <div className="mt-5 space-y-3">
        {activity.length === 0 ? (
          <p className="rounded-[12px] border border-[var(--guhr-line)] bg-white p-4 text-[13.5px] text-[var(--guhr-muted)]">
            Noch keine Aktivität in dieser Sitzung.
          </p>
        ) : (
          activity.map((entry) => (
            <div
              key={entry.id}
              className="rounded-[12px] border border-[var(--guhr-line)] bg-white p-3"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-[13.5px] font-bold text-[var(--guhr-text)]">
                  {entry.cardName}
                </p>
                <span className="text-[12px] text-[var(--guhr-muted)]">
                  {formatDateTime(entry.createdAt)}
                </span>
              </div>
              <p className="mt-2 text-[12.5px] leading-[1.42] text-[var(--guhr-text-soft)]">
                {entry.text}
              </p>
            </div>
          ))
        )}
      </div>
    </aside>
  );
}

function DetailDrawer() {
  const selectedCardId = useBoardStore((state) => state.selectedCardId);
  const cards = useBoardStore((state) => state.cards);
  const teamMembers = useBoardStore((state) => state.teamMembers);
  const selectCard = useBoardStore((state) => state.selectCard);
  const updateCard = useBoardStore((state) => state.updateCard);
  const deleteCard = useBoardStore((state) => state.deleteCard);
  const saveTeamMember = useBoardStore((state) => state.saveTeamMember);
  const [deleteCandidateId, setDeleteCandidateId] = useState<string>();
  const card = cards.find((item) => item.id === selectedCardId);

  if (!card) return null;

  const progress = checklistProgress(card.checks);
  const contactAttempts = contactAttemptCount(card);
  const confirmDelete = deleteCandidateId === card.id;

  function removeSelectedCard() {
    if (!card) return;
    deleteCard(card.id);
  }

  return (
    <div className="fixed inset-0 z-50">
      <button
        aria-label="Detailansicht schließen"
        className="absolute inset-0 bg-[rgba(20,26,42,0.30)] backdrop-blur-[1.5px]"
        onClick={() => selectCard(undefined)}
      />
      <aside className="guhr-drawer-panel absolute right-0 top-0 flex h-full flex-col overflow-hidden">
        <div className="guhr-drawer-header relative flex-none">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-[var(--guhr-gold)]">
                {phaseById[card.phase].label}
              </p>
              <h2 className="mt-[7px] pr-9 text-[21px] font-bold leading-tight tracking-[-0.01em] text-white">
                {fullName(card)}
              </h2>
              {card.firmenname ? (
                <p className="mt-[3px] text-[13px] text-[#AEB6C9]">{card.firmenname}</p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => selectCard(undefined)}
              className="absolute right-5 top-5 grid h-8 w-8 place-items-center rounded-[8px] bg-white/10 text-white transition hover:bg-white/15"
              aria-label="Detailansicht schließen"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-[15px] flex flex-wrap items-center gap-[9px]">
            <span
              className="guhr-tag guhr-tag-default"
            >
              {card.rechtsform === "-" ? card.typ : card.rechtsform}
            </span>
            <span className="inline-flex items-center gap-[7px] rounded-full bg-white/10 px-[11px] py-1 text-[11.5px] font-semibold text-[#E3E6EE]">
              <CalendarDays className="h-3.5 w-3.5 text-[var(--guhr-gold)]" strokeWidth={1.8} />
              Onboarding seit {formatDate(card.erstelltAm)}
            </span>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <DrawerStat
              icon={<ClipboardCheck className="h-4 w-4" />}
              label="Pflichtschritte"
              value={`${progress.done}/${progress.total}`}
            />
            <DrawerStat
              icon={<Phone className="h-4 w-4" />}
              label="Kontaktversuche"
              value={`${contactAttempts}`}
            />
            <DrawerStat
              icon={<CalendarDays className="h-4 w-4" />}
              label="Onboarding"
              value={formatDate(card.erstelltAm)}
            />
            <DrawerStat
              icon={<CalendarDays className="h-4 w-4" />}
              label="Fällig"
              value={formatDate(card.faelligAm)}
            />
          </div>
        </div>

        <div className="drawer-body flex-1 overflow-auto px-[26px] py-[22px] pb-9">
          <SectionTitle icon={<Mail className="h-5 w-5" />}>
            Kontaktdaten
          </SectionTitle>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <TextField
              label="E-Mail"
              value={card.email}
              onChange={(value) => updateCard(card.id, { email: value })}
            />
            <TextField
              label="Telefon"
              value={card.telefon}
              onChange={(value) => updateCard(card.id, { telefon: value })}
            />
          </div>

          <SectionTitle className="mt-7" icon={<Building2 className="h-5 w-5" />}>
            Qualifizierung
          </SectionTitle>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <SelectField<Typ>
              label="Typ"
              value={card.typ}
              options={typOptions}
              onChange={(value) => updateCard(card.id, { typ: value })}
            />
            <SelectField<Rechtsform>
              label="Rechtsform"
              value={card.rechtsform}
              options={rechtsformOptions}
              onChange={(value) => updateCard(card.id, { rechtsform: value })}
            />
            <SelectField<Branche>
              label="Branche"
              value={card.branche}
              options={brancheOptions}
              onChange={(value) => updateCard(card.id, { branche: value })}
            />
            <SelectField<Umsatz>
              label="Umsatz"
              value={card.umsatz}
              options={umsatzOptions}
              onChange={(value) => updateCard(card.id, { umsatz: value })}
            />
            <SelectField<Zusammenarbeit>
              label="Zusammenarbeit"
              value={card.zusammenarbeit}
              options={zusammenarbeitOptions}
              onChange={(value) =>
                updateCard(card.id, { zusammenarbeit: value })
              }
            />
            {card.phase === "verloren" ? (
              <SelectField<VerlustGrund>
                label="Verlustgrund"
                value={card.verlustGrund || "Kein Fit"}
                options={verlustGrundOptions}
                onChange={(value) => updateCard(card.id, { verlustGrund: value })}
              />
            ) : null}
          </div>

          <TeamMemberAssignment
            value={card.sachbearbeiter}
            teamMembers={teamMembers}
            onSelect={(value) => updateCard(card.id, { sachbearbeiter: value })}
            onSaveTeamMember={saveTeamMember}
          />

          <KontaktverlaufSection
            key={card.id}
            card={card}
            updateCard={updateCard}
          />

          <SectionTitle className="mt-7" icon={<ShieldCheck className="h-5 w-5" />}>
            Onboarding-Pflichtschritte
          </SectionTitle>
          <div className="mt-2 rounded-[12px] border border-[var(--guhr-line)] bg-white px-4 py-1">
            {checkOrder.map((key) => (
              <label
                key={key}
                className="flex cursor-pointer items-center justify-between gap-3 border-b border-[var(--guhr-rule)] py-3 last:border-b-0"
              >
                <span className="text-[14px] font-semibold text-[var(--guhr-text)]">
                  {checkLabels[key]}
                </span>
                <input
                  type="checkbox"
                  checked={card.checks[key]}
                  onChange={(event) =>
                    updateCard(card.id, {
                      checks: { ...card.checks, [key]: event.target.checked },
                    })
                  }
                  className="h-5 w-5 rounded-md accent-[var(--guhr-gold)]"
                />
              </label>
            ))}
          </div>

          {!checklistComplete(card.checks) && card.phase === "mandatsvertrag" ? (
            <div className="mt-3 flex gap-3 rounded-[11px] border border-[var(--guhr-danger-border)] bg-[var(--guhr-danger-bg)] p-[13px_15px] text-[13.5px] leading-[1.45] text-[#8E3A30]">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
              Noch nicht aktivierbar: GwG, Vollmacht, Vertrag, SEPA und DATEV
              müssen vorher erledigt sein.
            </div>
          ) : null}

          <SectionTitle className="mt-7" icon={<Phone className="h-5 w-5" />}>
            Nächste Aufgabe
          </SectionTitle>
          <div className="mt-3 grid gap-3 md:grid-cols-[1fr_180px] md:items-start">
            <TextareaField
              label="Nächste Aufgabe"
              value={card.naechsteAufgabe || card.naechsterSchritt || ""}
              onChange={(value) =>
                updateCard(card.id, { naechsteAufgabe: value })
              }
              rows={3}
            />
            <TextField
              label="Fällig am"
              type="date"
              value={card.faelligAm || ""}
              onChange={(value) => updateCard(card.id, { faelligAm: value })}
            />
          </div>

          <SectionTitle className="mt-7" icon={<NotepadText className="h-5 w-5" />}>
            Anmerkungen
          </SectionTitle>
          <div className="mt-3">
            <label className="block">
              <span className="field-label">Notizen</span>
              <textarea
                value={card.anmerkungen || ""}
                onChange={(event) =>
                  updateCard(card.id, { anmerkungen: event.target.value })
                }
                rows={5}
                className="field-input mt-1 min-h-32 py-3 leading-[1.55]"
              />
            </label>
          </div>

          <SectionTitle className="mt-7" icon={<Trash2 className="h-5 w-5" />}>
            Karte entfernen
          </SectionTitle>
          <div className="mt-3 rounded-[12px] border border-[var(--guhr-danger-border)] bg-[var(--guhr-danger-bg)] p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[13.5px] font-bold text-[#8E3A30]">
                  Dauerhaft entfernen
                </p>
                <p className="mt-1 text-[12.5px] leading-[1.45] text-[#8E3A30]">
                  Entfernt diese Karte aus dem Board. Die Löschung wird im
                  Aktivitätsverlauf vermerkt.
                </p>
              </div>
              {confirmDelete ? (
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={removeSelectedCard}
                    className="guhr-danger-button"
                  >
                    <Trash2 className="h-4 w-4" />
                    Endgültig löschen
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteCandidateId(undefined)}
                    className="guhr-chip justify-center"
                  >
                    Abbrechen
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setDeleteCandidateId(card.id)}
                  className="guhr-danger-button shrink-0"
                >
                  <Trash2 className="h-4 w-4" />
                  Karte löschen
                </button>
              )}
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}

function KontaktverlaufSection({
  card,
  updateCard,
}: {
  card: MandantCard;
  updateCard: (cardId: string, patch: Partial<MandantCard>) => void;
}) {
  const initialContactDefaults = contactFormDefaults();
  const [contactChannel, setContactChannel] = useState<KontaktKanal | "">("");
  const [contactStatus, setContactStatus] = useState<KontaktStatus | "">("");
  const [contactDate, setContactDate] = useState(initialContactDefaults.datum);
  const [contactTime, setContactTime] = useState(initialContactDefaults.uhrzeit);
  const contactHistory = card.kontaktHistorie || [];
  const legacyAttempts = legacyContactAttemptCount(card);
  const contactAttempts = contactAttemptCount(card);
  const latestContact = contactHistory[0];
  const statusOptions = contactChannel
    ? kontaktStatusOptionsByKanal[contactChannel]
    : [];

  function handleContactChannelChange(kanal: KontaktKanal | "") {
    setContactChannel(kanal);
    setContactStatus(kanal ? kontaktStatusOptionsByKanal[kanal][0] : "");
  }

  function recordContactAttempt(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!contactChannel || !contactStatus) return;

    updateCard(card.id, {
      kontaktHistorie: [
        {
          id: createId("kontakt"),
          kanal: contactChannel,
          status: contactStatus,
          erstelltAm: contactAttemptIso(contactDate, contactTime),
        },
        ...contactHistory,
      ],
    });

    const defaults = contactFormDefaults();
    setContactDate(defaults.datum);
    setContactTime(defaults.uhrzeit);
  }

  function resetContactHistory() {
    updateCard(card.id, {
      kontaktHistorie: [],
      kontaktversuche: 0,
    } as Partial<MandantCard>);
  }

  return (
    <div className="mt-3 rounded-[12px] border border-[var(--guhr-line)] bg-white p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="field-label">Kontaktversuche</p>
          <p className="mt-1 text-[13.5px] font-bold text-[var(--guhr-text)]">
            {contactAttempts > 0
              ? `${contactAttempts} Kontaktversuch${contactAttempts === 1 ? "" : "e"} erfasst`
              : "Noch kein Kontaktversuch erfasst"}
          </p>
          <p className="mt-1 text-[12.5px] leading-[1.45] text-[var(--guhr-muted)]">
            Erfasse Anrufe oder E-Mails, solange noch kein Erstgespräch geplant ist.
          </p>
          {latestContact ? (
            <p className="mt-1 text-[12.5px] leading-[1.45] text-[var(--guhr-muted)]">
              Letzter Versuch: {formatDateTime(latestContact.erstelltAm)}
            </p>
          ) : null}
        </div>
      </div>

      <form onSubmit={recordContactAttempt} className="mt-4">
        <div className="grid gap-3 md:grid-cols-2">
          <label className="block">
            <span className="field-label">Kontaktweg</span>
            <select
              value={contactChannel}
              onChange={(event) =>
                handleContactChannelChange(event.target.value as KontaktKanal | "")
              }
              className="field-input mt-1 h-10"
            >
              <option value="">Bitte wählen</option>
              {kontaktKanalOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="field-label">Status</span>
            <select
              value={contactStatus}
              onChange={(event) =>
                setContactStatus(event.target.value as KontaktStatus | "")
              }
              disabled={!contactChannel}
              className="field-input mt-1 h-10 disabled:cursor-not-allowed disabled:bg-[#F3F4F8] disabled:text-[var(--guhr-muted-3)]"
            >
              <option value="">
                {contactChannel ? "Bitte wählen" : "Erst Kontaktweg wählen"}
              </option>
              {statusOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <TextField
            label="Datum"
            type="date"
            value={contactDate}
            onChange={setContactDate}
          />
          <TextField
            label="Uhrzeit"
            type="time"
            value={contactTime}
            onChange={setContactTime}
          />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={!contactChannel || !contactStatus}
            className="guhr-chip guhr-chip-strong justify-center disabled:opacity-60"
          >
            {contactChannel === "Anruf" ? (
              <Phone className="h-4 w-4" />
            ) : (
              <Mail className="h-4 w-4" />
            )}
            Kontaktversuch speichern
          </button>
          {contactAttempts > 0 ? (
            <button
              type="button"
              onClick={resetContactHistory}
              className="guhr-chip justify-center"
            >
              Zurücksetzen
            </button>
          ) : null}
        </div>
      </form>

      {contactHistory.length > 0 ? (
        <div className="mt-4 space-y-2.5">
          {contactHistory.map((entry) => (
            <div
              key={entry.id}
              className="rounded-[11px] border border-[var(--guhr-rule)] bg-[var(--guhr-panel)] px-3 py-2.5"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 text-[13px] font-bold text-[var(--guhr-text)]">
                  {entry.kanal === "Anruf" ? (
                    <Phone className="h-3.5 w-3.5 text-[var(--guhr-gold-dark)]" />
                  ) : (
                    <Mail className="h-3.5 w-3.5 text-[var(--guhr-gold-dark)]" />
                  )}
                  {entry.kanal}
                </span>
                <span className="text-[12px] font-semibold text-[var(--guhr-muted)]">
                  {formatDateTime(entry.erstelltAm)}
                </span>
              </div>
              <p className="mt-1 text-[12.5px] text-[var(--guhr-text-soft)]">
                {entry.status}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-4 rounded-[11px] border border-dashed border-[#D5D8E1] bg-[var(--guhr-panel)] px-3 py-3 text-[12.5px] leading-[1.45] text-[var(--guhr-muted)]">
          {legacyAttempts > 0
            ? `${legacyAttempts} ältere Kontaktversuch${legacyAttempts === 1 ? "" : "e"} wurden bisher nur als Zähler erfasst. Neue Versuche erscheinen hier mit Kanal und Zeitstempel.`
            : "Sobald ein Anruf oder eine E-Mail erfasst wird, erscheint hier die zeitliche Historie."}
        </p>
      )}
    </div>
  );
}

function DrawerStat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[12px] border border-white/10 bg-white/10 p-3">
      <div className="flex items-center gap-2 text-[var(--guhr-gold)]">{icon}</div>
      <p className="mt-2 text-[11.5px] font-semibold text-[#AEB6C9]">{label}</p>
      <p className="mt-1 truncate text-[13px] font-bold text-white">{value}</p>
    </div>
  );
}

function SectionTitle({
  children,
  icon,
  className,
}: {
  children: React.ReactNode;
  icon: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={clsx("flex items-center gap-2", className)}>
      <span className="grid h-[34px] w-[34px] place-items-center rounded-[9px] bg-[#F1F2F7] text-[var(--guhr-muted)]">
        {icon}
      </span>
      <h3 className="guhr-section-label">{children}</h3>
    </div>
  );
}

function TeamMemberAssignment({
  value,
  teamMembers,
  onSelect,
  onSaveTeamMember,
}: {
  value?: string;
  teamMembers: TeamMember[];
  onSelect: (value: string) => void;
  onSaveTeamMember: (name: string, color: string) => void;
}) {
  const assignedName = assignedTeamMemberName(value);
  const selectedMember = findTeamMember(teamMembers, assignedName);
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState("#9B742E");

  function submitNewMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedName = newName.trim();
    if (!trimmedName) return;

    const color = normalizeHexColor(newColor);
    onSaveTeamMember(trimmedName, color);
    onSelect(trimmedName);
    setNewName("");
    setNewColor("#9B742E");
    setIsAdding(false);
  }

  function changeSelection(nextValue: string) {
    if (nextValue === ADD_TEAM_MEMBER_VALUE) {
      setIsAdding(true);
      return;
    }

    setIsAdding(false);
    onSelect(nextValue);
  }

  const selectedColor = normalizeHexColor(selectedMember?.color);

  return (
    <div className="mt-3 rounded-[12px] border border-[var(--guhr-line)] bg-white p-4">
      <div className="grid gap-3 md:grid-cols-[1fr_132px] md:items-end">
        <label className="block">
          <span className="field-label">Zuständig</span>
          <select
            value={selectedMember ? selectedMember.name : assignedName}
            onChange={(event) => changeSelection(event.target.value)}
            className="field-input mt-1 h-10"
          >
            <option value="">{UNASSIGNED_TEAM_LABEL}</option>
            {teamMembers.map((member) => (
              <option key={member.id} value={member.name}>
                {member.name}
              </option>
            ))}
            {assignedName && !selectedMember ? (
              <option value={assignedName}>{assignedName}</option>
            ) : null}
            <option value={ADD_TEAM_MEMBER_VALUE}>+ Namen ergänzen</option>
          </select>
        </label>

        <label className="block">
          <span className="field-label">Farbe</span>
          <input
            type="color"
            value={selectedColor}
            disabled={!assignedName}
            onChange={(event) => {
              if (!assignedName) return;
              onSaveTeamMember(assignedName, event.target.value);
            }}
            className="guhr-color-input mt-1"
            aria-label="Farbe der Zuständigkeits-Kapsel"
          />
        </label>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <TeamMemberPill
          name={assignedName}
          teamMembers={teamMembers}
        />
      </div>

      {isAdding ? (
        <form
          onSubmit={submitNewMember}
          className="mt-4 rounded-[11px] border border-[var(--guhr-line)] bg-[var(--guhr-panel)] p-3"
        >
          <div className="grid gap-3 md:grid-cols-[1fr_88px] md:items-end">
            <label className="block">
              <span className="field-label">Neues Teammitglied</span>
              <input
                value={newName}
                onChange={(event) => setNewName(event.target.value)}
                className="field-input mt-1 h-10"
                placeholder="Name eingeben"
              />
            </label>
            <label className="block">
              <span className="field-label">Farbe</span>
              <input
                type="color"
                value={newColor}
                onChange={(event) => setNewColor(event.target.value)}
                className="guhr-color-input mt-1"
                aria-label="Farbe für neues Teammitglied"
              />
            </label>
          </div>
          <div className="mt-3 flex gap-2">
            <button
              type="submit"
              className="guhr-chip guhr-chip-strong justify-center"
            >
              Übernehmen
            </button>
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="guhr-chip justify-center"
            >
              Abbrechen
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="field-label">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="field-input mt-1 h-10"
      />
    </label>
  );
}

function TextareaField({
  label,
  value,
  onChange,
  rows = 3,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
}) {
  return (
    <label className="block">
      <span className="field-label">{label}</span>
      <textarea
        value={value}
        rows={rows}
        onChange={(event) => onChange(event.target.value)}
        className="field-input mt-1 min-h-24 resize-y py-3 leading-[1.5]"
      />
    </label>
  );
}

function SelectField<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: T[];
  onChange: (value: T) => void;
}) {
  return (
    <label className="block">
      <span className="field-label">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as T)}
        className="field-input mt-1 h-10"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function ToastStack() {
  const toasts = useBoardStore((state) => state.toasts);
  const dismissToast = useBoardStore((state) => state.dismissToast);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[60] flex w-[min(332px,calc(100vw-40px))] flex-col gap-2.5">
      {toasts.map((toast) => (
        <ToastItem
          key={toast.id}
          toast={toast}
          onDismiss={dismissToast}
        />
      ))}
    </div>
  );
}

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: ToastMessage;
  onDismiss: (toastId: string) => void;
}) {
  useEffect(() => {
    const timer = window.setTimeout(() => {
      onDismiss(toast.id);
    }, TOAST_AUTO_DISMISS_MS);

    return () => window.clearTimeout(timer);
  }, [onDismiss, toast.id]);

  return (
    <div
      className={clsx(
        "guhr-toast",
        toastClasses[toast.kind],
      )}
    >
      <div className="flex items-start justify-between gap-[11px]">
        <div>
          <p className="text-[13.5px] font-bold text-[var(--guhr-text)]">{toast.title}</p>
          {toast.text ? (
            <p className="mt-0.5 text-[12.5px] leading-[1.42] text-[var(--guhr-text-soft)]">
              {toast.text}
            </p>
          ) : null}
        </div>
        <button
          onClick={() => onDismiss(toast.id)}
          className="grid h-7 w-7 shrink-0 place-items-center rounded-[8px] text-[var(--guhr-muted)] transition hover:bg-[var(--guhr-canvas)]"
          aria-label="Hinweis schließen"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { defaultTeamMembers, seedCards } from "@/lib/board-data";
import {
  checklistComplete,
  createId,
  fullName,
  phaseById,
} from "@/lib/board-utils";
import type {
  ActivityEntry,
  MandantCard,
  Phase,
  TeamMember,
  ToastKind,
  ToastMessage,
} from "@/types/mandant";

interface BoardState {
  cards: MandantCard[];
  teamMembers: TeamMember[];
  selectedCardId?: string;
  activity: ActivityEntry[];
  toasts: ToastMessage[];
  hydrated: boolean;
  setHydrated: (hydrated: boolean) => void;
  selectCard: (cardId?: string) => void;
  saveTeamMember: (name: string, color: string) => void;
  addCard: (
    phase: Phase,
    input: Pick<
      MandantCard,
      "vorname" | "nachname" | "firmenname" | "rechtsform" | "typ"
    > &
      Partial<MandantCard>,
  ) => void;
  updateCard: (cardId: string, patch: Partial<MandantCard>) => void;
  deleteCard: (cardId: string) => void;
  moveCard: (
    cardId: string,
    destinationPhase: Phase,
    overCardId?: string,
  ) => boolean;
  dismissToast: (toastId: string) => void;
  addToast: (kind: ToastKind, title: string, text?: string) => void;
}

const nowIso = () => new Date().toISOString();

function toast(kind: ToastKind, title: string, text?: string): ToastMessage {
  return { id: createId("toast"), kind, title, text };
}

function activity(
  card: MandantCard,
  kind: ActivityEntry["kind"],
  text: string,
): ActivityEntry {
  return {
    id: createId("activity"),
    cardId: card.id,
    cardName: fullName(card),
    kind,
    text,
    createdAt: nowIso(),
  };
}

function upsertActivityLog(
  entries: ActivityEntry[],
  entry: ActivityEntry,
): ActivityEntry[] {
  return [entry, ...entries].slice(0, 40);
}

function normalizeColor(color: string) {
  return /^#[0-9a-f]{6}$/i.test(color) ? color : "#6B7286";
}

export const useBoardStore = create<BoardState>()(
  persist(
    (set, get) => ({
      cards: seedCards,
      teamMembers: defaultTeamMembers,
      activity: [
        {
          id: "activity-seed-1",
          cardId: "mandant-emilia-weber",
          cardName: "Emilia Weber",
          kind: "automation",
          text: "Mandatsvertrag versendet: GwG-Identifizierung und Vollmacht priorisiert.",
          createdAt: seedCards.find((card) => card.id === "mandant-emilia-weber")
            ?.inPhaseSeit ?? nowIso(),
        },
        {
          id: "activity-seed-2",
          cardId: "mandant-leon-arnold",
          cardName: "Leon Arnold",
          kind: "automation",
          text: "Mandat aktiviert: Übergabe an das laufende FiBu-Team vorbereitet.",
          createdAt: seedCards.find((card) => card.id === "mandant-leon-arnold")
            ?.inPhaseSeit ?? nowIso(),
        },
      ],
      toasts: [],
      hydrated: false,
      setHydrated: (hydrated) => set({ hydrated }),
      selectCard: (cardId) => set({ selectedCardId: cardId }),
      saveTeamMember: (name, color) =>
        set((state) => {
          const trimmedName = name.trim();
          if (!trimmedName) return state;

          const nextColor = normalizeColor(color);
          const existingIndex = state.teamMembers.findIndex(
            (member) =>
              member.name.trim().toLowerCase() === trimmedName.toLowerCase(),
          );

          if (existingIndex >= 0) {
            return {
              teamMembers: state.teamMembers.map((member, index) =>
                index === existingIndex
                  ? { ...member, name: trimmedName, color: nextColor }
                  : member,
              ),
            };
          }

          return {
            teamMembers: [
              ...state.teamMembers,
              {
                id: createId("team"),
                name: trimmedName,
                color: nextColor,
              },
            ],
          };
        }),
      addToast: (kind, title, text) =>
        set((state) => ({
          toasts: [toast(kind, title, text), ...state.toasts].slice(0, 4),
        })),
      dismissToast: (toastId) =>
        set((state) => ({
          toasts: state.toasts.filter((item) => item.id !== toastId),
        })),
      addCard: (phase, input) =>
        set((state) => {
          const createdAt = nowIso();
          const card: MandantCard = {
            id: createId("mandant"),
            vorname: input.vorname,
            nachname: input.nachname,
            firmenname: input.firmenname,
            email: input.email || "kontakt@example.de",
            telefon: input.telefon || "+49 30 0000 0000",
            typ: input.typ,
            rechtsform: input.rechtsform,
            branche: input.branche || "Beratung & Consulting",
            umsatz: input.umsatz || "50.000-100.000 €",
            zusammenarbeit: input.zusammenarbeit || "Laufende Betreuung",
            anmerkungen:
              input.anmerkungen ||
              "Direkt im Board angelegt. Profil im Detail ergänzen.",
            kontaktHistorie: input.kontaktHistorie || [],
            phase,
            sachbearbeiter: input.sachbearbeiter || "",
            erstelltAm: createdAt,
            inPhaseSeit: createdAt,
            naechsteAufgabe:
              input.naechsteAufgabe ||
              input.naechsterSchritt ||
              "Profil vervollständigen",
            faelligAm: input.faelligAm,
            checks: input.checks || {
              gwgIdentifiziert: false,
              vollmachtErteilt: false,
              mandatsvertragUnterschrieben: false,
              sepaMandat: false,
              datevAngelegt: false,
            },
            verlustGrund: phase === "verloren" ? "Kein Fit" : undefined,
          };

          return {
            cards: [...state.cards, card],
            selectedCardId: card.id,
            activity: upsertActivityLog(
              state.activity,
              activity(
                card,
                "create",
                `Karte in "${phaseById[phase].label}" angelegt.`,
              ),
            ),
            toasts: [
              toast("success", "Mandant angelegt", fullName(card)),
              ...state.toasts,
            ].slice(0, 4),
          };
        }),
      updateCard: (cardId, patch) =>
        set((state) => ({
          cards: state.cards.map((card) =>
            card.id === cardId ? { ...card, ...patch } : card,
          ),
        })),
      deleteCard: (cardId) =>
        set((state) => {
          const card = state.cards.find((item) => item.id === cardId);
          if (!card) return state;

          return {
            cards: state.cards.filter((item) => item.id !== cardId),
            selectedCardId:
              state.selectedCardId === cardId ? undefined : state.selectedCardId,
            activity: upsertActivityLog(
              state.activity,
              activity(card, "delete", "Karte aus dem Board gelöscht."),
            ),
            toasts: [
              toast("info", "Karte gelöscht", fullName(card)),
              ...state.toasts,
            ].slice(0, 4),
          };
        }),
      moveCard: (cardId, destinationPhase, overCardId) => {
        const { cards } = get();
        const card = cards.find((item) => item.id === cardId);
        if (!card) return false;

        if (
          destinationPhase === "aktiv" &&
          !checklistComplete(card.checks)
        ) {
          const entry = activity(
            card,
            "gate",
            "Wechsel zu \"Unterzeichnet & aktiv\" blockiert: GwG, Vollmacht, Vertrag, SEPA und DATEV müssen erledigt sein.",
          );
          set((state) => ({
            activity: upsertActivityLog(state.activity, entry),
            toasts: [
              toast(
                "danger",
                "Noch nicht aktivierbar",
                "Vor der Aktivierung müssen GwG, Vollmacht, Vertrag, SEPA und DATEV erledigt sein.",
              ),
              ...state.toasts,
            ].slice(0, 4),
          }));
          return false;
        }

        set((state) => {
          const sourceCard = state.cards.find((item) => item.id === cardId);
          if (!sourceCard) return state;

          const phaseChanged = sourceCard.phase !== destinationPhase;
          const movedCard: MandantCard = {
            ...sourceCard,
            phase: destinationPhase,
            inPhaseSeit: phaseChanged ? nowIso() : sourceCard.inPhaseSeit,
            verlustGrund:
              destinationPhase === "verloren"
                ? sourceCard.verlustGrund || "Kein Fit"
                : sourceCard.verlustGrund,
          };

          const remaining = state.cards.filter((item) => item.id !== cardId);
          let insertIndex = remaining.length;

          if (overCardId && overCardId !== cardId) {
            const overIndex = remaining.findIndex((item) => item.id === overCardId);
            if (overIndex >= 0) insertIndex = overIndex;
          } else {
            const lastInPhase = remaining.reduce(
              (lastIndex, item, index) =>
                item.phase === destinationPhase ? index : lastIndex,
              -1,
            );
            insertIndex = lastInPhase >= 0 ? lastInPhase + 1 : remaining.length;
          }

          const nextCards = [...remaining];
          nextCards.splice(insertIndex, 0, movedCard);

          const logEntries: ActivityEntry[] = [];
          const toastEntries: ToastMessage[] = [];

          if (phaseChanged) {
            logEntries.push(
              activity(
                movedCard,
                "move",
                `Verschoben nach "${phaseById[destinationPhase].label}".`,
              ),
            );
          }

          if (phaseChanged && destinationPhase === "mandatsvertrag") {
            logEntries.push(
              activity(
                movedCard,
                "automation",
                "Mandatsvertrag versendet: Nachfassmail für offene Pflichtschritte ausgelöst.",
              ),
            );
            toastEntries.push(
              toast(
                "warning",
                "Pflichtschritte-Mail gesendet",
                "Die zuständige Person wurde per E-Mail informiert.",
              ),
            );
          }

          if (phaseChanged && destinationPhase === "erstgespraech") {
            logEntries.push(
              activity(
                movedCard,
                "automation",
                "Erstgespräch geplant: Terminbenachrichtigung zur Gesprächsvorbereitung versendet.",
              ),
            );
            toastEntries.push(
              toast(
                "info",
                "Terminbenachrichtigung gesendet",
                "Die zuständige Person wurde per E-Mail informiert.",
              ),
            );
          }

          if (phaseChanged && destinationPhase === "unterlagen_erhalten") {
            logEntries.push(
              activity(
                movedCard,
                "automation",
                "Unterlagen erhalten: Mail zur internen Vollständigkeitsprüfung ausgelöst.",
              ),
            );
            toastEntries.push(
              toast(
                "info",
                "Prüfaufgabe gesendet",
                "Die zuständige Person wurde per E-Mail informiert.",
              ),
            );
          }

          if (phaseChanged && destinationPhase === "aktiv") {
            logEntries.push(
              activity(
                movedCard,
                "automation",
                "Mandat aktiviert: Übergabemail an die laufende Betreuung ausgelöst.",
              ),
            );
            toastEntries.push(
              toast(
                "success",
                "Übergabe-Mail gesendet",
                "Die laufende Betreuung wurde per E-Mail informiert.",
              ),
            );
          }

          return {
            cards: nextCards,
            activity: logEntries.reduce(
              (entries, entry) => upsertActivityLog(entries, entry),
              state.activity,
            ),
            toasts: [...toastEntries, ...state.toasts].slice(0, 4),
          };
        });

        return true;
      },
    }),
    {
      name: "guhr-onboarding-board",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        cards: state.cards,
        teamMembers: state.teamMembers,
        activity: state.activity,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
    },
  ),
);

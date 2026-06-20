import { checkOrder, phases } from "@/lib/board-data";
import type {
  MandantCard,
  OnboardingChecks,
  Phase,
} from "@/types/mandant";

export const phaseById = Object.fromEntries(
  phases.map((phase) => [phase.id, phase]),
) as Record<Phase, (typeof phases)[number]>;

export function fullName(card: Pick<MandantCard, "vorname" | "nachname">) {
  return `${card.vorname} ${card.nachname}`;
}

export function checklistProgress(checks: OnboardingChecks) {
  const done = checkOrder.filter((key) => checks[key]).length;
  return { done, total: checkOrder.length };
}

export function checklistComplete(checks: OnboardingChecks) {
  return checklistProgress(checks).done === checkOrder.length;
}

export function formatDate(value?: string) {
  if (!value) return "Kein Datum";
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

export function formatShortDate(value?: string) {
  if (!value) return "Kein Datum";
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
  }).format(new Date(value));
}

export function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function createId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function isPhase(value: string): value is Phase {
  return phases.some((phase) => phase.id === value);
}

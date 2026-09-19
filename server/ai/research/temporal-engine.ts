/**
 * Temporal Consistency & Chronology Engine
 * Anchors dynamic runtime dates (never hard-coded), resolves event timelines,
 * and detects outdated future-tense claims vs historical facts.
 */

import type { TemporalStatus } from "./types";

export interface TemporalContext {
  runtimeDate: Date;
  runtimeIso: string;
  runtimeFormatted: string;
  runtimeYear: number;
}

/**
 * Get accurate current runtime date anchor from system environment.
 */
export function getRuntimeTemporalContext(): TemporalContext {
  const now = new Date();
  const runtimeFormatted = now.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return {
    runtimeDate: now,
    runtimeIso: now.toISOString(),
    runtimeFormatted,
    runtimeYear: now.getFullYear(),
  };
}

/**
 * Parse any date string into a normalized Date object if valid.
 */
export function parseDateString(dateStr?: string): Date | null {
  if (!dateStr) return null;
  const parsed = new Date(dateStr);
  return isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Determine the temporal status of an event or claim given source dates and event mentions.
 */
export function evaluateTemporalStatus(
  sourcePublishedDateStr?: string,
  eventDateMentionedStr?: string,
  temporalContext: TemporalContext = getRuntimeTemporalContext()
): { status: TemporalStatus; reasoning: string } {
  const { runtimeDate, runtimeFormatted } = temporalContext;
  const sourceDate = parseDateString(sourcePublishedDateStr);
  const eventDate = parseDateString(eventDateMentionedStr);

  // Scenario 1: Event date is in the past relative to runtime now
  if (eventDate) {
    if (eventDate.getTime() < runtimeDate.getTime()) {
      return {
        status: "HISTORICAL",
        reasoning: `Event date (${eventDate.toISOString().split("T")[0]}) is before current runtime date (${runtimeFormatted}). Event has already occurred.`,
      };
    } else {
      return {
        status: "UPCOMING",
        reasoning: `Event date (${eventDate.toISOString().split("T")[0]}) is after current runtime date (${runtimeFormatted}). Event is in the future.`,
      };
    }
  }

  // Scenario 2: Source publication date is old (>12 months)
  if (sourceDate) {
    const diffMonths = (runtimeDate.getTime() - sourceDate.getTime()) / (1000 * 60 * 60 * 24 * 30.4);
    if (diffMonths > 12) {
      return {
        status: "OUTDATED_PREDICTION",
        reasoning: `Source was published on ${sourceDate.toISOString().split("T")[0]} (${Math.round(diffMonths)} months ago). Cannot be treated as current state without newer confirmation.`,
      };
    }
    return {
      status: "CURRENT",
      reasoning: `Source published on ${sourceDate.toISOString().split("T")[0]} is recent relative to current runtime date.`,
    };
  }

  return {
    status: "TIME_AMBIGUOUS",
    reasoning: "No explicit publication or event dates could be extracted from this source.",
  };
}

/**
 * Check if an older source or text is making future-tense predictions about a date that is now in the past.
 */
export function detectOutdatedFutureTense(
  text: string,
  sourceDateStr?: string,
  temporalContext: TemporalContext = getRuntimeTemporalContext()
): { isOutdatedPrediction: boolean; warning?: string } {
  const currentYear = temporalContext.runtimeYear;
  const sourceDate = parseDateString(sourceDateStr);
  const sourceYear = sourceDate ? sourceDate.getFullYear() : null;

  // If text uses future-tense verb phrases
  const hasFutureTense =
    /\b(will\s+(?:occur|launch|release|take\s+place|happen|arrive|debut|be\s+released|be\s+launched|begin|start)|planned\s+(?:for|to)|scheduled\s+(?:for|to)|expected\s+(?:in|on|to)|set\s+to\s+(?:debut|launch|release))\b/i.test(
      text
    );

  // Check if text explicitly predicts a past year as future (e.g. "will launch in 2024")
  const pastYearRegex = new RegExp(`\\b(will\\s+(?:occur|launch|release|take\s+place|happen|arrive|debut|be\s+released|be\s+launched|begin|start)[^.]{1,40}?\\b(19\\d\\d|20[0-2][0-5])\\b)`, "i");
  const hasFuturePastYear = pastYearRegex.test(text);

  if (hasFuturePastYear || (sourceYear !== null && sourceYear < currentYear && hasFutureTense)) {
    return {
      isOutdatedPrediction: true,
      warning: `Text contains future-tense prediction for past timeline relative to current runtime year (${currentYear}).`,
    };
  }

  return { isOutdatedPrediction: false };
}

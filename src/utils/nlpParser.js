import * as chrono from 'chrono-node';
import { toLocalDateString, getStartOfDay } from '../utils.js';
import { formatRecurrence } from './todoHelpers.js';

const DAY_MAP = {
  sun: 0,
  sunday: 0,
  sundays: 0,
  mon: 1,
  monday: 1,
  mondays: 1,
  tue: 2,
  tues: 2,
  tuesday: 2,
  tuesdays: 2,
  wed: 3,
  wednesday: 3,
  wednesdays: 3,
  thu: 4,
  thur: 4,
  thurs: 4,
  thursday: 4,
  thursdays: 4,
  fri: 5,
  friday: 5,
  fridays: 5,
  sat: 6,
  saturday: 6,
  saturdays: 6,
};

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Checks for common recurrence phrases like:
 * - "daily", "every day", "everyday"
 * - "weekdays", "every weekday", "on weekdays", "workdays"
 * - "weekends", "every weekend", "on weekends"
 * - "every monday", "every mon, wed, fri", "on tuesdays and thursdays", "every other day"
 */
function parseRecurrence(text) {
  if (!text || typeof text !== 'string') return null;

  // 1. Daily
  const dailyMatch = text.match(/\b(every\s+single\s+day|every\s+day|everyday|daily)\b/i);
  if (dailyMatch) {
    const matchedText = dailyMatch[0];
    const cleanTitle = cleanExtractedPhrase(text, dailyMatch.index, matchedText.length);
    return {
      type: 'recurrence',
      recurrenceDays: [1, 2, 3, 4, 5, 6, 0],
      displayLabel: 'Repeats: Daily',
      matchedText,
      cleanTitle,
      scheduledDate: null
    };
  }

  // 2. Weekdays
  const weekdayMatch = text.match(/\b((?:on\s+)?weekdays|every\s+weekday|workdays|every\s+workday)\b/i);
  if (weekdayMatch) {
    const matchedText = weekdayMatch[0];
    const cleanTitle = cleanExtractedPhrase(text, weekdayMatch.index, matchedText.length);
    return {
      type: 'recurrence',
      recurrenceDays: [1, 2, 3, 4, 5],
      displayLabel: 'Repeats: Weekdays',
      matchedText,
      cleanTitle,
      scheduledDate: null
    };
  }

  // 3. Weekends
  const weekendMatch = text.match(/\b((?:on\s+)?weekends|every\s+weekend)\b/i);
  if (weekendMatch) {
    const matchedText = weekendMatch[0];
    const cleanTitle = cleanExtractedPhrase(text, weekendMatch.index, matchedText.length);
    return {
      type: 'recurrence',
      recurrenceDays: [6, 0],
      displayLabel: 'Repeats: Weekends (Sat, Sun)',
      matchedText,
      cleanTitle,
      scheduledDate: null
    };
  }

  // 4. Specific days with "every", "each" (e.g. "every monday", "every mon and wed", "every tue, thu, fri")
  const DAY_UNIT = '(?:mondays?|mon|tuesdays?|tues|tue|wednesdays?|wed|thursdays?|thurs|thur|thu|fridays?|fri|saturdays?|sat|sundays?|sun)';
  const dayPattern = new RegExp(`\\b(?:every|each)\\s+((?:${DAY_UNIT}(?:\\s*(?:,|&|\\band\\b)\\s*|\\s+)?)+)`, 'i');
  const specificDaysMatch = text.match(dayPattern);

  if (specificDaysMatch) {
    const rawDaysStr = specificDaysMatch[1];
    const dayTokens = rawDaysStr.toLowerCase().match(new RegExp(DAY_UNIT, 'gi'));
    
    if (dayTokens && dayTokens.length > 0) {
      const daysSet = new Set();
      dayTokens.forEach(token => {
        if (DAY_MAP[token] !== undefined) {
          daysSet.add(DAY_MAP[token]);
        }
      });

      const recurrenceDays = Array.from(daysSet).sort((a, b) => (a === 0 ? 7 : a) - (b === 0 ? 7 : b));
      if (recurrenceDays.length > 0) {
        const matchedText = specificDaysMatch[0].trim();
        const cleanTitle = cleanExtractedPhrase(text, specificDaysMatch.index, matchedText.length);
        const recurrenceLabel = formatRecurrence(recurrenceDays);
        return {
          type: 'recurrence',
          recurrenceDays,
          displayLabel: `Repeats: ${recurrenceLabel}`,
          matchedText,
          cleanTitle,
          scheduledDate: null
        };
      }
    }
  }

  // 5. Plural day mentions with or without "on": e.g. "Gym on Mondays", "Math tutoring Tuesdays and Thursdays"
  const PLURAL_DAY_UNIT = '(?:mondays|tuesdays|wednesdays|thursdays|fridays|saturdays|sundays)';
  const pluralDaysPattern = new RegExp(`\\b(?:on\\s+)?((?:${PLURAL_DAY_UNIT}(?:\\s*(?:,|&|\\band\\b)\\s*|\\s+)?)+)\\b`, 'i');
  const pluralMatch = text.match(pluralDaysPattern);
  if (pluralMatch) {
    const rawDaysStr = pluralMatch[1];
    const dayTokens = rawDaysStr.toLowerCase().match(new RegExp(PLURAL_DAY_UNIT, 'gi'));
    if (dayTokens && dayTokens.length > 0) {
      const daysSet = new Set();
      dayTokens.forEach(token => {
        if (DAY_MAP[token] !== undefined) {
          daysSet.add(DAY_MAP[token]);
        }
      });
      const recurrenceDays = Array.from(daysSet).sort((a, b) => (a === 0 ? 7 : a) - (b === 0 ? 7 : b));
      if (recurrenceDays.length > 0) {
        const matchedText = pluralMatch[0].trim();
        const cleanTitle = cleanExtractedPhrase(text, pluralMatch.index, matchedText.length);
        const recurrenceLabel = formatRecurrence(recurrenceDays);
        return {
          type: 'recurrence',
          recurrenceDays,
          displayLabel: `Repeats: ${recurrenceLabel}`,
          matchedText,
          cleanTitle,
          scheduledDate: null
        };
      }
    }
  }

  return null;
}

/**
 * Removes a matched phrase from text, including preceding prepositions (by, for, on, at, due on)
 * and cleans up trailing punctuation and whitespace.
 */
function cleanExtractedPhrase(originalText, startIndex, matchLength) {
  let start = startIndex;
  let end = startIndex + matchLength;

  // Check for leading preposition right before startIndex (e.g. "due on ", "by ", "for ", "on ", "at ")
  const textBefore = originalText.substring(0, start);
  const prepMatch = textBefore.match(/(?:\b(due\s+on|due\s+by|due|by|for|on|at|until)\s+)$/i);
  if (prepMatch) {
    start -= prepMatch[0].length;
  }

  const before = originalText.substring(0, start);
  const after = originalText.substring(end);
  const combined = (before + ' ' + after)
    .replace(/\s+/g, ' ')
    .replace(/^[\s,;:-]+|[\s,;:-]+$/g, '')
    .trim();

  return combined || originalText.trim();
}

/**
 * Formats a Date object into a readable display label (e.g. "Tomorrow (Aug 27)", "Friday, Aug 29", etc.)
 */
function formatDateLabel(targetDate, refDate = new Date()) {
  const targetDay = getStartOfDay(targetDate);
  const refDay = getStartOfDay(refDate);
  const diffDays = Math.round((targetDay.getTime() - refDay.getTime()) / (1000 * 60 * 60 * 24));

  const month = MONTHS_SHORT[targetDate.getMonth()];
  const dateNum = targetDate.getDate();
  const dayName = DAY_NAMES[targetDate.getDay()];

  if (diffDays === 0) {
    return `Today (${month} ${dateNum})`;
  }
  if (diffDays === 1) {
    return `Tomorrow (${month} ${dateNum})`;
  }
  if (diffDays === -1) {
    return `Yesterday (${month} ${dateNum})`;
  }
  if (diffDays > 1 && diffDays < 7) {
    return `${dayName} (${month} ${dateNum})`;
  }
  if (targetDate.getFullYear() === refDate.getFullYear()) {
    return `${dayName}, ${month} ${dateNum}`;
  }
  return `${month} ${dateNum}, ${targetDate.getFullYear()}`;
}

/**
 * Main parser function.
 * Given a raw task string and reference date, extracts:
 * - Recurrence (e.g., "every monday", "daily") OR
 * - Scheduled Date (e.g., "tomorrow", "next Friday", "Aug 30")
 * - Cleaned title with date/recurrence tokens stripped.
 */
export function parseTaskInput(rawText, referenceDate = new Date()) {
  if (!rawText || typeof rawText !== 'string' || !rawText.trim()) {
    return {
      hasMatch: false,
      type: null,
      cleanTitle: '',
      matchedText: '',
      displayLabel: '',
      scheduledDate: null,
      recurrenceDays: null
    };
  }

  const trimmed = rawText.trim();

  // 1. Check for recurrence expressions first
  const recurrenceResult = parseRecurrence(trimmed);
  if (recurrenceResult) {
    return {
      hasMatch: true,
      ...recurrenceResult
    };
  }

  // 2. Parse date expressions using chrono-node
  try {
    const parsedResults = chrono.en.parse(trimmed, referenceDate, { forwardDate: true });
    if (parsedResults && parsedResults.length > 0) {
      const match = parsedResults[0];
      const parsedDate = match.start.date();

      if (parsedDate && !isNaN(parsedDate.getTime())) {
        const scheduledDate = toLocalDateString(parsedDate);
        const displayLabel = `Scheduled: ${formatDateLabel(parsedDate, referenceDate)}`;
        const cleanTitle = cleanExtractedPhrase(trimmed, match.index, match.text.length);

        return {
          hasMatch: true,
          type: 'date',
          cleanTitle,
          matchedText: match.text,
          displayLabel,
          scheduledDate,
          recurrenceDays: null
        };
      }
    }
  } catch (err) {
    console.warn('[NLP Parser] Error parsing date:', err);
  }

  return {
    hasMatch: false,
    type: null,
    cleanTitle: trimmed,
    matchedText: '',
    displayLabel: '',
    scheduledDate: null,
    recurrenceDays: null
  };
}

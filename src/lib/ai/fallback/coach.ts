import { FALLBACK_WARNING_COACH } from "../config";
import type { CoachInput, CoachResult } from "../types";

export function fallbackCoachPrompts(input: CoachInput): CoachResult {
  const min = Math.min(...input.votes);
  const max = Math.max(...input.votes);
  const spread = max - min;
  const descriptionSuffix = input.taskDescription?.trim() ? ` Opis: ${input.taskDescription.trim()}` : "";

  const summary = `Zespół oszacował „${input.taskTitle.trim()}” w przedziale ${min}–${max} punktów (różnica ${spread}).${descriptionSuffix} Omówcie założenia stojące za tym rozjazdem.`;

  const questions = [
    `Jakie założenia doprowadziły do głosów ${min} vs ${max} punktów dla „${input.taskTitle.trim()}”?`,
    "Jaki jest minimalny zakres, który musimy dowieźć w tej iteracji?",
    "Jakie edge case’y mogą tłumaczyć wyższe oszacowanie?",
    "Od jakich zależności zewnętrznych zależy złożoność tego zadania?",
    "Jakie kryteria akceptacji muszą być jasne, zanim zespół ponownie zagłosuje?",
  ];

  return {
    source: "fallback",
    warning: FALLBACK_WARNING_COACH,
    summary,
    questions,
  };
}

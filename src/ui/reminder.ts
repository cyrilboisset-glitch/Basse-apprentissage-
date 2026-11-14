/** Rappel quotidien : une PWA ne peut pas programmer de notification à heure fixe sans serveur ; on génère un événement d'agenda récurrent avec alarme. */
export function makeIcs(time: string, minutes: number, now = new Date()): string {
  const [h, m] = time.split(':').map(Number); const pad = (n: number) => String(n).padStart(2, '0');
  const d = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}T${pad(h)}${pad(m)}00`;
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//BassLab//FR', 'BEGIN:VEVENT', `UID:basslab-rappel-${d}@basslab`, `DTSTAMP:${d}`, `DTSTART:${d}`, `DURATION:PT${minutes}M`, 'RRULE:FREQ=DAILY',
    'SUMMARY:BassLab : séance de basse', 'DESCRIPTION:Ouvrez BassLab et lancez la séance du jour.', 'BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:Séance de basse', 'TRIGGER:PT0M', 'END:VALARM', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
}

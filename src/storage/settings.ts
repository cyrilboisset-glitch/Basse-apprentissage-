export type NoteNotation = 'fr' | 'en';
export type Theme = 'dark' | 'light';

export interface Settings {
  notation: NoteNotation;
  theme: Theme;
  leftHanded: boolean;
  strings: 4 | 5;
  frets: number;
  tuning: string;
  refA: number;
  sessionMinutes: 10 | 20 | 30;
  fontScale: number;
  latencyUsbMs: number;
  latencyBluetoothMs: number;
  inputMode: 'usb' | 'bluetooth';
  inputDeviceId: string;
  unlockAll: boolean;
  nuxAuto: boolean;
  reminderTime: string;
  presetMap: Record<string, number>;   // catégorie → preset 1-7 (0 = ne pas changer)
}

export const DEFAULT_SETTINGS: Settings = {
  notation: 'fr', theme: 'dark', leftHanded: false, strings: 4, frets: 24,
  tuning: 'standard4', refA: 440, sessionMinutes: 20, fontScale: 1,
  latencyUsbMs: 0, latencyBluetoothMs: 0, inputMode: 'usb', inputDeviceId: '', unlockAll: false, nuxAuto: false, reminderTime: '',
  presetMap: { clean: 1, blues: 2, funk: 3, rock: 4, pop: 1, reggae: 1, soul: 3, jazz: 1, latin: 1 },
};

export function mergeSettings(partial: Partial<Settings> | undefined): Settings {
  return { ...DEFAULT_SETTINGS, ...(partial ?? {}), presetMap: { ...DEFAULT_SETTINGS.presetMap, ...(partial?.presetMap ?? {}) } };
}

/**
 * Protocole BLE MIDI du NUX Mighty Plug Pro.
 * Sources : Mightier Amp (Dian Iliev, licence MIT) — lib/bluetooth/… (voir docs/nux-protocol.md).
 * Les trames sont celles envoyées par Mightier Amp : en-tête BLE MIDI 0x80 0x80, puis le message MIDI.
 */
export const MIDI_SERVICE = '03b80e5a-ede8-4b33-a751-6ce34ec4c700';
export const MIDI_CHARACTERISTIC = '7772e5db-3868-4112-a1a9-f2669d106bf3';

/** Numéros de Control Change du Plug Pro (classe MidiCCValuesPro). */
export const CC = {
  TUNER_STATE: 11, TUNER_NOTE: 12, TUNER_STRING: 71, TUNER_CENT: 72,
  MASTER: 73,            // niveau du preset (« patch level »), 7 bits
  PRESET_RANGE: 83,      // champ de bits des presets actifs
  USB_REC_LEVEL: 86, USB_PLAY_LEVEL: 87, USB_AUDIO_MODE: 88, USB_DRY_WET: 89,
} as const;
/** Mode audio USB (CC 88) : 0 Dry Out, 1 Normal, 2 Re-amp ; bit 0x10 = Loopback. Non confirmé sur matériel. */
export const USB_MODE = { dryOut: 0, normal: 1, reamp: 2, loopbackBit: 0x10 } as const;
export const TUNER_MODE = { chromatic: 0, guitarCompensated: 1, guitarStandard: 2, bass: 3 } as const;
export const PRESET_COUNT = 7;

const HDR = [0x80, 0x80];
export const ccMessage = (cc: number, value: number) => [...HDR, 0xb0, cc & 0x7f, Math.max(0, Math.min(127, Math.round(value)))];
export function pcMessage(program: number): number[] {
  if (program < 0 || program >= PRESET_COUNT) throw new Error(`Preset hors plage (0-${PRESET_COUNT - 1})`);
  return [...HDR, 0xc0, program];
}
/** SysEx « Pro » : F0 43 58 <privacy> <type> <dir> <données…> F7 */
export const sysexPro = (privacy: number, type: number, dir: number, data: number[]) => [...HDR, 0xf0, 0x43, 0x58, privacy, type, dir, ...data, 0x80, 0xf7];
export const SYX = { PRIVATE: 0x70, TUNER_SETTINGS: 0x6f, DIR_GET: 0, DIR_SET: 1 } as const;

export interface TunerSettings { on: boolean; mode: keyof typeof TUNER_MODE; refHz: number; mute: boolean }
export function tunerSettingsMessage(t: TunerSettings): number[] {
  const ref = Math.max(0, Math.min(20, Math.round(t.refHz) - 430)); // valeur = Hz − 430 (0…20)
  return sysexPro(SYX.PRIVATE, SYX.TUNER_SETTINGS, SYX.DIR_SET, [t.on ? 1 : 0, TUNER_MODE[t.mode], ref, t.mute ? 1 : 0, 0, 0, 0]);
}
export const tunerRequestMessage = () => sysexPro(SYX.PRIVATE, SYX.TUNER_SETTINGS, SYX.DIR_GET, [0, 0, 0, 0, 0, 0, 0]);

export type Incoming = { kind: 'cc'; cc: number; value: number } | { kind: 'pc'; program: number } | { kind: 'sysex'; data: number[] };

/** Décode un paquet BLE MIDI (en-tête, puis [horodatage, statut, données…]*, SysEx possibles). */
export function parseIncoming(bytes: ArrayLike<number>): Incoming[] {
  const d = Array.from(bytes), out: Incoming[] = [];
  let i = 1; // octet 0 = en-tête du paquet
  while (i < d.length) {
    let b = d[i];
    if (b >= 0x80 && i + 1 < d.length && d[i + 1] >= 0x80) { i++; b = d[i]; } // horodatage devant un statut
    if (b === 0xf0) { // SysEx jusqu'à F7
      const data: number[] = []; i++;
      while (i < d.length) { if (d[i] === 0xf7) { i++; break; } if (d[i] < 0x80) data.push(d[i]); i++; }
      out.push({ kind: 'sysex', data }); continue;
    }
    if ((b & 0xf0) === 0xb0 && i + 2 < d.length + 0 && d[i + 1] < 0x80 && d[i + 2] < 0x80) { out.push({ kind: 'cc', cc: d[i + 1], value: d[i + 2] }); i += 3; continue; }
    if ((b & 0xf0) === 0xc0 && i + 1 < d.length) { out.push({ kind: 'pc', program: d[i + 1] }); i += 2; continue; }
    i++;
  }
  return out;
}

export interface TunerReading { enabled: boolean; pc: number | null; cents: number | null; string: number }
/** État du suivi accordeur du Plug Pro : note = demi-tons depuis La (0 = La), centièmes = valeur − 50. */
export class TunerDecoder {
  state: TunerReading = { enabled: false, pc: null, cents: null, string: 0 };
  private note = 0; private cent = 50;
  feed(m: Incoming): TunerReading | null {
    if (m.kind !== 'cc') return null;
    if (m.cc === CC.TUNER_STATE) this.state.enabled = m.value === 1;
    else if (m.cc === CC.TUNER_NOTE) this.note = m.value;
    else if (m.cc === CC.TUNER_STRING) this.state.string = m.value;
    else if (m.cc === CC.TUNER_CENT) this.cent = m.value;
    else return null;
    const noSignal = this.note === 0 && this.cent === 50; // convention observée dans Mightier Amp
    this.state = { ...this.state, pc: noSignal ? null : (9 + this.note) % 12, cents: noSignal ? null : this.cent - 50 };
    return this.state;
  }
}

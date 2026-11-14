const P: Record<string, string> = {
  session: '<circle cx="12" cy="12" r="9"/><path d="M10 8.5l5 3.5-5 3.5z"/>',
  neck: '<rect x="3" y="7" width="18" height="10" rx="1.5"/><path d="M8 7v10M13 7v10M17 7v10"/>',
  practice: '<path d="M9 18V6l10-2v12"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="16.5" cy="16" r="2.5"/>',
  tools: '<path d="M8 21h8l-2.5-16h-3z"/><path d="M12 15l4-7"/>',
  settings: '<path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/>',
  tuner: '<path d="M4 17a8 8 0 0116 0"/><path d="M12 17l3.5-5.5"/><path d="M12 5v2M5.6 8.2l1.4 1.4M18.4 8.2L17 9.6"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  back: '<path d="M15 5l-7 7 7 7"/>',
  chevron: '<path d="M9 5l7 7-7 7"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  x: '<path d="M7 7l10 10M17 7L7 17"/>',
  lock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 018 0v3"/>',
  play: '<path d="M8 5.5v13l11-6.5z" fill="currentColor"/>',
  pause: '<path d="M8 5v14M16 5v14"/>',
  headphones: '<path d="M4 15v-3a8 8 0 0116 0v3"/><rect x="3" y="14" width="4" height="6" rx="1.5"/><rect x="17" y="14" width="4" height="6" rx="1.5"/>',
  volume: '<path d="M4 10v4h4l5 4V6L8 10z"/><path d="M16.5 9a4 4 0 010 6"/>',
  record: '<circle cx="12" cy="12" r="6" fill="currentColor"/>',
  trophy: '<path d="M8 4h8v5a4 4 0 01-8 0z"/><path d="M8 6H5a3 3 0 003 4M16 6h3a3 3 0 01-3 4M12 13v4M9 20h6"/>',
  trash: '<path d="M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  download: '<path d="M12 4v11M7 11l5 5 5-5M5 20h14"/>',
  guitar: '<path d="M14 10l6-6M17 4l3 3"/><path d="M12 9a4 4 0 00-4 4l-1 1a3 3 0 105 5l1-1a4 4 0 004-4"/>',
  mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0014 0M12 18v3"/>',
  file: '<path d="M7 3h7l4 4v14H7z"/><path d="M14 3v4h4"/>',
};
/** Icônes au trait fin, héritent de la couleur du texte. Décoratives par défaut (aria-hidden). */
export function Icon({ name, size = 24, label, class: cls }: { name: keyof typeof P | string; size?: number; label?: string; class?: string }) {
  return <svg class={cls} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden={label ? undefined : 'true'} role={label ? 'img' : undefined} aria-label={label} dangerouslySetInnerHTML={{ __html: P[name] ?? '' }} />;
}

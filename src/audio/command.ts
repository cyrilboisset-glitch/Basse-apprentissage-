/**
 * Note « commande » : la note configurée jouée deux fois (≤ 1 s d'écart) après au moins 1,2 s de silence
 * déclenche démarrer/arrêter. Un jeu continu ne le déclenche donc pas.
 */
export class CommandDetector {
  private last: { t: number; midi: number } | null = null; private lastAny = -Infinity; private armed = -Infinity; private cooldown = -Infinity;
  constructor(public cmdNote = 28, private silence = 1.2, private gap = 1.0) {}
  /** Renvoie true quand la commande est reconnue. */
  feed(t: number, midi: number | null): boolean {
    if (midi === null || t < this.cooldown) return false;
    let hit = false;
    if (midi === this.cmdNote) {
      if (this.last && this.last.midi === midi && t - this.last.t <= this.gap && this.last.t - this.beforeFirst >= this.silence) { hit = true; this.cooldown = t + 2; this.last = null; }
      else if (!this.last || t - this.last.t > this.gap) { this.beforeFirst = this.lastAny; this.last = { t, midi }; }
      else this.last = null;
    } else this.last = null;
    this.lastAny = t; return hit;
  }
  private beforeFirst = -Infinity;
}

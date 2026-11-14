import { BASES } from './course-bases';
import { HARMONIE } from './course-harmonie';
import { RYTHME } from './course-rythme';
import { BASSE } from './course-basse';
import type { Lesson } from './theory-kit';

export { CHAPTERS, type Lesson, type Quiz, type Built } from './theory-kit';
/** Le parcours complet, dans l'ordre : chapitre 1 → 4. */
export const LESSONS: Lesson[] = [...BASES, ...HARMONIE, ...RYTHME, ...BASSE];
export const getLesson = (id: string) => LESSONS.find(l => l.id === id)!;
export const lessonsOf = (chapter: number) => LESSONS.filter(l => l.chapter === chapter);

import { GAME_ICONS, type GameIconName } from './game-icons.data';

/** Inline SVG icon from game-icons.net (CC BY 3.0). Inherits text colour. */
export function GameIcon({ name, className, title }: { name: GameIconName; className?: string; title?: string }) {
  return (
    <svg viewBox="0 0 512 512" className={className} role={title ? 'img' : undefined} aria-hidden={title ? undefined : true} dangerouslySetInnerHTML={{ __html: (title ? `<title>${title}</title>` : '') + GAME_ICONS[name] }} />
  );
}

export type { GameIconName };

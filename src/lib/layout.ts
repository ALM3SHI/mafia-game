/** Shared card-arc layout used by the lobby and the game table. */

export const CARD_COVERS = [
  '/cards/CARDcover.jpg',
  '/cards/CARDcover2.jpg',
  '/cards/CARDcover3.png',
  '/cards/CARDcover4.png',
  '/cards/CARDcover5.jpg',
  '/cards/CARDcover6.png',
  '/cards/CARDcover7.jpg',
  '/cards/CARDcover8.png',
  '/cards/CARDcover9.png',
];

export function arcLayout(index: number, total: number, opts: { lift?: number; maxPerRow?: number; gap?: number; rowHeight?: number } = {}) {
  const { lift = 0, maxPerRow = 7, gap = 230, rowHeight = 300 } = opts;
  const row = Math.floor(index / maxPerRow);
  const col = index % maxPerRow;
  const inRow = Math.min(maxPerRow, total - row * maxPerRow);
  const spread = Math.min((inRow - 1) * gap, 1300);
  const progress = inRow > 1 ? (col / (inRow - 1)) * 2 - 1 : 0;
  const rows = Math.ceil(total / maxPerRow);
  return {
    x: progress * (spread / 2),
    z: inRow > 1 ? -(progress ** 2) * 150 : 0,
    rotY: progress * -25,
    rotZ: progress * 5,
    y: -((rows - 1) * rowHeight) / 2 + row * rowHeight + lift,
  };
}

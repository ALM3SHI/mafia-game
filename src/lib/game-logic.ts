import { Role, Player } from '@/store/useGameStore';

/**
 * Distributes roles to players based on the number of players and Mafia count.
 */
export function distributeRoles(players: Player[], mafiaCount: number): Player[] {
  const roles: Role[] = [];
  
  // Add Mafia roles
  for (let i = 0; i < mafiaCount; i++) {
    roles.push('mafia');
  }
  
  // Add Special roles (Police, Doctor, Witch) if there are enough players
  if (players.length >= 5) roles.push('police');
  if (players.length >= 6) roles.push('doctor');
  if (players.length >= 8) roles.push('witch');
  
  // Fill the rest with Citizens
  while (roles.length < players.length) {
    roles.push('citizen');
  }
  
  // Shuffle roles
  const shuffledRoles = [...roles].sort(() => Math.random() - 0.5);
  
  // Assign to players
  return players.map((player, index) => ({
    ...player,
    role: shuffledRoles[index],
    isAlive: true,
  }));
}

/**
 * Checks if the game has ended and returns the winner.
 */
export function checkWinner(players: Player[]): 'town' | 'mafia' | null {
  const alivePlayers = players.filter(p => p.isAlive);
  const mafiaCount = alivePlayers.filter(p => p.role === 'mafia').length;
  const townCount = alivePlayers.length - mafiaCount;
  
  if (mafiaCount === 0) return 'town';
  if (mafiaCount >= townCount) return 'mafia';
  
  return null;
}

/**
 * Logic to resolve the night actions.
 * In a real game, this would be handled by a Supabase Edge Function
 * or a centralized server to prevent cheating.
 */
export function resolveNight(actions: { type: string, targetId: string, performerId: string }[]) {
  // This is a placeholder for the server-side logic
  console.log('Resolving night actions:', actions);
}

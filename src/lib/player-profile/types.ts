/**
 * Player Profile System - Types
 */

export type PilotIconId = 
  | 'pilot-01' | 'pilot-02' | 'pilot-03' | 'pilot-04'
  | 'pilot-05' | 'pilot-06' | 'pilot-07' | 'pilot-08'
  | 'ace-01' | 'ace-02' | 'ace-03' | 'ace-04'
  | 'veteran-01' | 'veteran-02' | 'veteran-03' | 'veteran-04';

export interface PilotIcon {
  id: PilotIconId;
  name: string;
  category: 'starter' | 'ace' | 'veteran';
  unlockRequirement?: string;
  svg: string;
}

export interface PlayerProfile {
  id: string;
  displayName: string;
  callSign: string;
  iconId: PilotIconId;
  profileCreatedAt: Date;
  lastLoginAt?: Date;
  totalXp: number;
  currentRank: number;
  credits: number;
}

export interface CreateProfileData {
  displayName: string;
  callSign: string;
  iconId: PilotIconId;
}

/** Available pilot icons */
export const PILOT_ICONS: PilotIcon[] = [
  // Starter Icons (available to all)
  {
    id: 'pilot-01',
    name: 'Rookie',
    category: 'starter',
    svg: '👨‍✈️',
  },
  {
    id: 'pilot-02',
    name: 'Explorer',
    category: 'starter',
    svg: '🧑‍🚀',
  },
  {
    id: 'pilot-03',
    name: 'Trader',
    category: 'starter',
    svg: '👩‍💼',
  },
  {
    id: 'pilot-04',
    name: 'Hauler',
    category: 'starter',
    svg: '👷',
  },
  {
    id: 'pilot-05',
    name: 'Scout',
    category: 'starter',
    svg: '🕵️',
  },
  {
    id: 'pilot-06',
    name: 'Racer',
    category: 'starter',
    svg: '🏎️',
  },
  {
    id: 'pilot-07',
    name: 'Mechanic',
    category: 'starter',
    svg: '🔧',
  },
  {
    id: 'pilot-08',
    name: 'Engineer',
    category: 'starter',
    svg: '⚙️',
  },
  
  // Ace Icons (unlock at rank 5)
  {
    id: 'ace-01',
    name: 'Ace Pilot',
    category: 'ace',
    unlockRequirement: 'Reach Rank 5',
    svg: '🦅',
  },
  {
    id: 'ace-02',
    name: 'Hotshot',
    category: 'ace',
    unlockRequirement: 'Reach Rank 5',
    svg: '🔥',
  },
  {
    id: 'ace-03',
    name: 'Sharpshooter',
    category: 'ace',
    unlockRequirement: 'Reach Rank 5',
    svg: '🎯',
  },
  {
    id: 'ace-04',
    name: 'Storm',
    category: 'ace',
    unlockRequirement: 'Reach Rank 5',
    svg: '⚡',
  },
  
  // Veteran Icons (unlock at rank 10)
  {
    id: 'veteran-01',
    name: 'Veteran',
    category: 'veteran',
    unlockRequirement: 'Reach Rank 10',
    svg: '⭐',
  },
  {
    id: 'veteran-02',
    name: 'Legend',
    category: 'veteran',
    unlockRequirement: 'Reach Rank 10',
    svg: '👑',
  },
  {
    id: 'veteran-03',
    name: 'Commander',
    category: 'veteran',
    unlockRequirement: 'Reach Rank 10',
    svg: '💫',
  },
  {
    id: 'veteran-04',
    name: 'Elite',
    category: 'veteran',
    unlockRequirement: 'Reach Rank 10',
    svg: '🌟',
  },
];

/** Get starter icons (always available) */
export function getStarterIcons(): PilotIcon[] {
  return PILOT_ICONS.filter(icon => icon.category === 'starter');
}

/** Get all icons (for profile view, showing locked ones) */
export function getAllIcons(currentRank: number): PilotIcon[] {
  return PILOT_ICONS.map(icon => {
    const isUnlocked = 
      icon.category === 'starter' ||
      (icon.category === 'ace' && currentRank >= 5) ||
      (icon.category === 'veteran' && currentRank >= 10);
    
    return {
      ...icon,
      svg: isUnlocked ? icon.svg : '🔒',
    };
  });
}

/** Check if icon is unlocked */
export function isIconUnlocked(iconId: PilotIconId, currentRank: number): boolean {
  const icon = PILOT_ICONS.find(i => i.id === iconId);
  if (!icon) return false;
  
  if (icon.category === 'starter') return true;
  if (icon.category === 'ace') return currentRank >= 5;
  if (icon.category === 'veteran') return currentRank >= 10;
  
  return false;
}

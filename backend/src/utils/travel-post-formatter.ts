// Utility functions for formatting travel posts with emojis and tags

export interface TravelPostFormatted {
  title: string;
  tag: string;
}

export function formatTravelPostTitle(
  type: 'offering' | 'seeking' | 'seeking-ally',
  fromCity: string,
  toCity: string,
  canOfferCompanionship?: boolean,
  canCarryItems?: boolean
): TravelPostFormatted {
  let emojis = '';
  let tagText = '';

  if (type === 'offering') {
    tagText = 'Offering';
    if (canOfferCompanionship && canCarryItems) {
      emojis = '👥📦';
    } else if (canOfferCompanionship) {
      emojis = '👥';
    } else if (canCarryItems) {
      emojis = '📦';
    }
  } else if (type === 'seeking') {
    tagText = 'Seeking';
    emojis = '👥'; // Default seeking is for companionship
  } else if (type === 'seeking-ally') {
    tagText = 'Seeking';
    emojis = '📦';
  }

  const title = `${tagText} ${emojis} from ${fromCity} to ${toCity}`;
  // Tag should be just the type text, not the emojis
  const tag = tagText;

  return {
    title,
    tag,
  };
}

export function getTravelPostTypeEmojis(
  type: 'offering' | 'seeking' | 'seeking-ally',
  canOfferCompanionship?: boolean,
  canCarryItems?: boolean
): string[] {
  const emojis: string[] = [];

  if (type === 'offering') {
    if (canOfferCompanionship) emojis.push('👥');
    if (canCarryItems) emojis.push('📦');
  } else if (type === 'seeking') {
    emojis.push('👥');
  } else if (type === 'seeking-ally') {
    emojis.push('📦');
  }

  return emojis;
}

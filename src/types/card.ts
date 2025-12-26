export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type Rank = 'ace' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'jack' | 'queen' | 'king';

export interface Card {
    suit: Suit;
    rank: Rank;
    faceUp: boolean;
    id: string; // Unique identifier for React keys
    deckNumber: 1 | 2; // Which deck this card belongs to (for 2-deck mode)
}

export const RANKS: Rank[] = ['ace', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'jack', 'queen', 'king'];
export const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];

export function getRankValue(rank: Rank): number {
    const index = RANKS.indexOf(rank);
    return index + 1; // Ace = 1, 2 = 2, ..., King = 13
}

export function isRed(suit: Suit): boolean {
    return suit === 'hearts' || suit === 'diamonds';
}

export function isBlack(suit: Suit): boolean {
    return suit === 'clubs' || suit === 'spades';
}

export function getCardImagePath(card: Card): string {
    return `/src/assets/cards/English_pattern_${card.rank}_of_${card.suit}.svg`;
}

export function getCardBackImagePath(deckNumber: 1 | 2 = 1): string {
    return deckNumber === 1
        ? '/src/assets/cards/card-back-blue.svg'
        : '/src/assets/cards/card-back-red.svg';
}

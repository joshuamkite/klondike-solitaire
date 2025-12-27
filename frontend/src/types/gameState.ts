import type { Card } from './card';

export interface GameState {
    tableau: Card[][]; // 7 columns for 1 deck, 9 columns for 2 decks
    foundations: Card[][]; // 4 or 8 foundations depending on deck count
    stock: Card[]; // Draw pile
    waste: Card[]; // Waste pile (cards drawn from stock)
    moves: number;
    startTime: number;
    gameWon: boolean;
    deckCount: 1 | 2; // Number of decks in play
    drawCount: 1 | 3; // Number of cards to draw from stock
}

export type PileType = 'tableau' | 'foundation' | 'stock' | 'waste';

export interface CardLocation {
    pileType: PileType;
    pileIndex: number; // Which tableau column or foundation
    cardIndex: number; // Position in that pile
}

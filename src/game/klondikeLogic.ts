import type { Card } from '../types/card';
import type { GameState } from '../types/gameState';
import { RANKS, SUITS, getRankValue, isRed } from '../types/card';

// Create a standard 52-card deck
export function createDeck(deckNumber: 1 | 2 = 1): Card[] {
    const deck: Card[] = [];
    let id = 0;

    for (const suit of SUITS) {
        for (const rank of RANKS) {
            deck.push({
                suit,
                rank,
                faceUp: false,
                id: `deck${deckNumber}-${suit}-${rank}-${id++}`,
                deckNumber
            });
        }
    }

    return deck;
}

// Fisher-Yates shuffle
export function shuffleDeck(deck: Card[]): Card[] {
    const shuffled = [...deck];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

// Initialize a new Klondike game
export function initializeGame(deckCount: 1 | 2 = 1, drawCount: 1 | 3 = 3): GameState {
    let allCards: Card[] = [];

    if (deckCount === 1) {
        allCards = shuffleDeck(createDeck(1));
    } else {
        // Combine two decks
        const deck1 = createDeck(1);
        const deck2 = createDeck(2);
        allCards = shuffleDeck([...deck1, ...deck2]);
    }

    // Deal tableau: 7 columns with 1, 2, 3, 4, 5, 6, 7 cards respectively
    const tableau: Card[][] = [[], [], [], [], [], [], []];
    let deckIndex = 0;

    for (let col = 0; col < 7; col++) {
        for (let row = 0; row <= col; row++) {
            const card = allCards[deckIndex++];
            // Only the last card in each column is face-up
            card.faceUp = row === col;
            tableau[col].push(card);
        }
    }

    // Remaining cards go to stock (face down)
    const stock: Card[] = [];
    while (deckIndex < allCards.length) {
        stock.push(allCards[deckIndex++]);
    }

    // 4 foundations for 1 deck, 8 for 2 decks (2 per suit)
    const foundationCount = deckCount === 1 ? 4 : 8;
    const foundations: Card[][] = Array(foundationCount).fill(null).map(() => []);

    return {
        tableau,
        foundations,
        stock,
        waste: [],
        moves: 0,
        startTime: Date.now(),
        gameWon: false,
        deckCount,
        drawCount
    };
}

// Check if a card can be placed on a foundation
export function canPlaceOnFoundation(card: Card, foundation: Card[]): boolean {
    if (foundation.length === 0) {
        // Only aces can start a foundation
        return card.rank === 'ace';
    }

    const topCard = foundation[foundation.length - 1];

    // Must be same suit
    if (card.suit !== topCard.suit) {
        return false;
    }

    // Must be next rank in sequence
    const cardValue = getRankValue(card.rank);
    const topValue = getRankValue(topCard.rank);

    return cardValue === topValue + 1;
}

// Check if a card (or sequence) can be placed on a tableau column
export function canPlaceOnTableau(card: Card, tableau: Card[]): boolean {
    if (tableau.length === 0) {
        // Only kings can be placed on empty tableau columns
        return card.rank === 'king';
    }

    const topCard = tableau[tableau.length - 1];

    // Must be opposite color
    if (isRed(card.suit) === isRed(topCard.suit)) {
        return false;
    }

    // Must be one rank lower
    const cardValue = getRankValue(card.rank);
    const topValue = getRankValue(topCard.rank);

    return cardValue === topValue - 1;
}

// Validate that a sequence of cards forms a valid descending, alternating-color run
export function isValidSequence(cards: Card[]): boolean {
    if (cards.length === 0) return false;
    if (cards.length === 1) return true;

    for (let i = 0; i < cards.length - 1; i++) {
        const current = cards[i];
        const next = cards[i + 1];

        // Must be opposite colors
        if (isRed(current.suit) === isRed(next.suit)) {
            return false;
        }

        // Must be descending by 1
        const currentValue = getRankValue(current.rank);
        const nextValue = getRankValue(next.rank);

        if (currentValue !== nextValue + 1) {
            return false;
        }
    }

    return true;
}

// Draw cards from stock to waste (uses drawCount from game state)
export function drawFromStock(state: GameState): GameState {
    const newState = { ...state };
    newState.stock = [...state.stock];
    newState.waste = [...state.waste];

    if (newState.stock.length === 0) {
        // Reset stock from waste
        newState.stock = [...newState.waste].reverse().map(card => ({ ...card, faceUp: false }));
        newState.waste = [];
    } else {
        // Draw up to drawCount cards
        const toDraw = Math.min(state.drawCount, newState.stock.length);
        for (let i = 0; i < toDraw; i++) {
            const card = newState.stock.pop()!;
            card.faceUp = true;
            newState.waste.push(card);
        }
    }

    newState.moves++;
    return newState;
}

// Find the appropriate foundation index for a card
export function findFoundationForCard(card: Card, foundations: Card[][]): number | null {
    for (let i = 0; i < foundations.length; i++) {
        if (canPlaceOnFoundation(card, foundations[i])) {
            return i;
        }
    }
    return null;
}

// Move card(s) from one location to another
export function moveCards(
    state: GameState,
    fromPile: 'tableau' | 'waste' | 'foundation',
    fromIndex: number,
    cardIndex: number,
    toPile: 'tableau' | 'foundation',
    toIndex: number
): GameState | null {
    const newState = { ...state };
    newState.tableau = state.tableau.map(col => [...col]);
    newState.foundations = state.foundations.map(f => [...f]);
    newState.waste = [...state.waste];

    // Get source cards
    let cardsToMove: Card[];
    if (fromPile === 'waste') {
        if (state.waste.length === 0) return null;
        cardsToMove = [state.waste[state.waste.length - 1]];
    } else if (fromPile === 'foundation') {
        // Moving from foundation (only top card)
        const foundation = state.foundations[fromIndex];
        if (foundation.length === 0) return null;
        cardsToMove = [foundation[foundation.length - 1]];
    } else {
        // Moving from tableau
        const column = state.tableau[fromIndex];
        if (cardIndex >= column.length || !column[cardIndex].faceUp) return null;
        cardsToMove = column.slice(cardIndex);

        // Validate that the cards being moved form a valid sequence
        if (!isValidSequence(cardsToMove)) return null;
    }

    // Validate move
    if (toPile === 'foundation') {
        // Can only move single cards to foundation
        if (cardsToMove.length !== 1) return null;
        const card = cardsToMove[0];
        const foundation = newState.foundations[toIndex];

        if (!canPlaceOnFoundation(card, foundation)) return null;

        // Perform move
        foundation.push(card);
        if (fromPile === 'waste') {
            newState.waste.pop();
        } else if (fromPile === 'foundation') {
            newState.foundations[fromIndex].pop();
        } else {
            newState.tableau[fromIndex] = newState.tableau[fromIndex].slice(0, cardIndex);
            // Flip the new top card if there is one
            const fromColumn = newState.tableau[fromIndex];
            if (fromColumn.length > 0 && !fromColumn[fromColumn.length - 1].faceUp) {
                fromColumn[fromColumn.length - 1].faceUp = true;
            }
        }
    } else {
        // Moving to tableau
        const targetColumn = newState.tableau[toIndex];
        const firstCard = cardsToMove[0];

        if (!canPlaceOnTableau(firstCard, targetColumn)) return null;

        // Perform move
        targetColumn.push(...cardsToMove);
        if (fromPile === 'waste') {
            newState.waste.pop();
        } else if (fromPile === 'foundation') {
            newState.foundations[fromIndex].pop();
        } else {
            newState.tableau[fromIndex] = newState.tableau[fromIndex].slice(0, cardIndex);
            // Flip the new top card if there is one
            const fromColumn = newState.tableau[fromIndex];
            if (fromColumn.length > 0 && !fromColumn[fromColumn.length - 1].faceUp) {
                fromColumn[fromColumn.length - 1].faceUp = true;
            }
        }
    }

    newState.moves++;
    newState.gameWon = checkWin(newState);
    return newState;
}

// Check if the game is won (all cards in foundations)
export function checkWin(state: GameState): boolean {
    // Each foundation should have 13 cards
    return state.foundations.every(foundation => foundation.length === 13);
}

// Auto-move card to foundation if possible (double-click helper)
export function autoMoveToFoundation(state: GameState, fromPile: 'tableau' | 'waste', fromIndex: number): GameState | null {
    let card: Card;
    let cardIndex: number;

    if (fromPile === 'waste') {
        if (state.waste.length === 0) return null;
        card = state.waste[state.waste.length - 1];
        cardIndex = state.waste.length - 1;
    } else {
        const column = state.tableau[fromIndex];
        if (column.length === 0) return null;
        card = column[column.length - 1];
        cardIndex = column.length - 1;
    }

    // Find a foundation that accepts this card (works for both 1 and 2 deck modes)
    const foundationIndex = findFoundationForCard(card, state.foundations);
    if (foundationIndex !== null) {
        return moveCards(state, fromPile, fromIndex, cardIndex, 'foundation', foundationIndex);
    }

    return null;
}

# Klondike Solitaire Card Game - Agent Guide

## Project Overview
This is a TypeScript React implementation of the classic Klondike solitaire card game. The game runs entirely client-side in the browser.

## Technology Stack
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Package Manager**: Bun

## Project Structure
```
/frontend
  /src
    /components      - React components (Card, GameBoard, VictoryAnimation)
    /game           - Game logic, state management, and rules
    /types          - TypeScript type definitions
  /public
    /cards          - SVG card images from Wikimedia Commons
/dev_tooling/download_cards - Go script to download card images
/terraform          - Infrastructure as Code for AWS deployment
```

## Key Features
1. **Klondike Solitaire Rules**: 7-column tableau for 1 deck, 9-column tableau for 2 decks
2. **Game Modes**:
   - 1 or 2 deck modes
   - Draw 1 or 3 cards from stock
3. **Card Images**: SVG card images from Wikimedia Commons (Byron Knoll, Public Domain)
4. **Interaction Methods**:
   - Drag-and-drop card movement
   - Click-to-select and click-to-move
   - Double-click to auto-move to foundations
5. **Smart Foundation Drops**: Cards automatically go to the correct foundation
6. **Multi-card Selection**: Visual highlighting of entire card sequences
7. **Undo Functionality**: Step back through move history
8. **Victory Animation**: Fireworks celebration with card suit particles
9. **Move Counter**: Tracks number of moves made

## Development Commands
- `bun install` - Install dependencies
- `bun dev` - Start development server (http://localhost:5173)
- `bun build` - Build for production
- `bun preview` - Preview production build

## Card Image Setup
Card images are downloaded from Wikimedia Commons using the Go script:
```bash
cd dev_tooling/download_cards
go run main.go
```

This downloads all 52 card face SVGs plus blue and red card backs.

## Klondike Solitaire Rules

### Setup
- **1 deck mode**: 52 cards dealt into 7 tableau columns (1, 2, 3, 4, 5, 6, 7 cards)
- **2 deck mode**: 104 cards dealt into 9 tableau columns (1, 2, 3, 4, 5, 6, 7, 8, 9 cards)
- Only the top card in each tableau column is face-up initially
- Remaining cards go to stock (draw pile)
- 4 foundations for 1 deck, 8 foundations for 2 decks

### Gameplay
- **Foundations**: Build from Ace to King by suit (top area)
- **Tableau**: Move cards between columns in descending rank and alternating color
- **Stock/Waste**: Draw 1 or 3 cards at a time from stock to waste pile
- **Multi-card moves**: Valid sequences can be moved together as a unit
- **Valid sequences**: Descending rank with alternating colors (red/black)
- **Empty columns**: Only Kings can be placed on empty tableau columns

### Win Condition
Game is won when all cards are moved to foundations (13 cards per foundation).

## Component Architecture

### GameBoard
Main game component managing state with useReducer:
- Game state and move history
- Card selection and drag-and-drop handlers
- Undo functionality
- Game mode toggles (deck count, draw count)
- Autocomplete when stock/waste empty and all cards face-up

### Card
Renders individual card with:
- Face or back image based on faceUp state
- Different card backs for each deck (blue/red)
- Drag-and-drop support
- Click and double-click handlers

### VictoryAnimation
Celebration overlay with:
- Transparent background showing completed game
- Fireworks burst of card suit symbols
- Golden "Congratulations!" title
- Click-anywhere-to-continue hint

## Game Logic (klondikeLogic.ts)

### Key Functions
- `createDeck()` - Creates 52-card deck with unique IDs per deck
- `shuffleDeck()` - Fisher-Yates shuffle algorithm
- `initializeGame()` - Deals tableau, creates foundations, sets up stock
- `drawFromStock()` - Draws cards based on drawCount (1 or 3)
- `moveCards()` - Validates and executes card movements
- `canPlaceOnFoundation()` - Checks if card can go on foundation
- `canPlaceOnTableau()` - Checks if card can go on tableau column
- `isValidSequence()` - Validates multi-card sequences
- `autoMoveToFoundation()` - Auto-moves card to appropriate foundation
- `findFoundationForCard()` - Finds correct foundation for any card
- `checkWin()` - Verifies all foundations have 13 cards

## Type Definitions

### Card
```typescript
interface Card {
    suit: 'hearts' | 'diamonds' | 'clubs' | 'spades';
    rank: 'ace' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'jack' | 'queen' | 'king';
    faceUp: boolean;
    id: string;
    deckNumber: 1 | 2;
}
```

### GameState
```typescript
interface GameState {
    tableau: Card[][];        // 7 columns
    foundations: Card[][];    // 4 or 8 foundations
    stock: Card[];           // Draw pile
    waste: Card[];           // Waste pile
    moves: number;
    startTime: number;
    gameWon: boolean;
    deckCount: 1 | 2;
    drawCount: 1 | 3;
}
```

## UI Controls

### Slider Switches
- **Decks**: Toggle between 1 and 2 decks (starts new game)
- **Draw**: Toggle between drawing 1 or 3 cards (starts new game)

### Buttons
- **Undo**: Step back one move (disabled when no history)
- **New Game**: Start fresh game with current settings

### Stats Display
- Move counter shows total moves made

## File Organization

### Components
- `src/components/Card.tsx` - Card rendering
- `src/components/Card.css` - Card styling
- `src/components/GameBoard.tsx` - Main game logic and UI
- `src/components/GameBoard.css` - Game board styling
- `src/components/VictoryAnimation.tsx` - Win celebration
- `src/components/VictoryAnimation.css` - Animation styling

### Game Logic
- `src/game/klondikeLogic.ts` - All game rules and validation

### Types
- `src/types/card.ts` - Card type and helper functions
- `src/types/gameState.ts` - Game state type definition

### Assets
- `src/assets/cards/*.svg` - 52 card faces + 2 card backs

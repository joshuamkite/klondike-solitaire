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
3. **Responsive Design**: Fully optimized for mobile, tablet, and desktop
   - Dynamic card sizing to fit all columns on any screen size
   - Touch-friendly interactions for mobile devices
   - Landscape and portrait orientation support
4. **Card Images**: SVG card images from Wikimedia Commons (Byron Knoll, Public Domain)
5. **Interaction Methods**:
   - Drag-and-drop card movement
   - Click-to-select and click-to-move
   - Double-click to auto-move to foundations
6. **Smart Foundation Drops**: Cards automatically go to the correct foundation
7. **Multi-card Selection**: Visual highlighting of entire card sequences
8. **Undo Functionality**: Step back through move history
9. **Smooth Card Animations**: Cards visibly fly across the screen for all moves
   - Manual moves, auto-play, and double-click all animated
   - 300ms cubic-bezier transitions for natural motion
   - Animated overlay system with high z-index rendering
10. **Victory Animation**: Fireworks celebration with card suit particles
11. **Move Counter**: Tracks number of moves made

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
- Extended autocomplete when all tableau cards face-up (automatically draws from stock and completes game)
- Animation orchestration with `animateMove()` function
- Position calculation utilities (`getCardPosition`, `getDestinationPosition`)
- Auto-play move detection with `detectAutoPlayMove()`

### Card
Renders individual card with:
- Face or back image based on faceUp state
- Different card backs for each deck (blue/red)
- Drag-and-drop support
- Click and double-click handlers

### AnimatedCard
Overlay component for smooth card movement animations:
- Renders cards flying from source to destination positions
- Uses CSS transforms with 300ms cubic-bezier transitions
- Double `requestAnimationFrame` technique to ensure animations trigger
- High z-index overlay rendering above game board
- Triggers callback on animation completion

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
- `allTableauCardsFaceUp()` - Checks if all tableau cards are face-up (triggers extended autocomplete)
- `getNextAutoCompleteAction()` - Returns next action for extended autocomplete (move/draw/done)

### Autocomplete System
The game features two levels of autocomplete:

1. **Standard Auto-play**: After any move, safe cards automatically move to foundations
   - Uses `autoPlaySingleCard()` with FreeCell-style safety rules
   - Only moves cards that won't block gameplay (conservative strategy)
   - Continues recursively until no safe moves remain

2. **Extended Autocomplete**: Activated when all tableau cards are face-up
   - Automatically draws from stock/waste pile
   - Moves all possible cards to foundations
   - Cycles through: check for moves → move card → check for moves → draw from stock → repeat
   - Continues until game is won or no more moves possible
   - Provides smooth user experience by eliminating tedious endgame clicking

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
- `src/components/AnimatedCard.tsx` - Smooth card movement animations
- `src/components/AnimatedCard.css` - Animation overlay styling
- `src/components/VictoryAnimation.tsx` - Win celebration
- `src/components/VictoryAnimation.css` - Animation styling

### Game Logic
- `src/game/klondikeLogic.ts` - All game rules and validation

### Types
- `src/types/card.ts` - Card type and helper functions
- `src/types/gameState.ts` - Game state type definition

### Assets
- `src/assets/cards/*.svg` - 52 card faces + 2 card backs

## Animation System

### Overview
The game features smooth, visible card animations for all types of moves:
- Manual drag-and-drop moves
- Click-to-select and click-to-move
- Double-click auto-moves to foundations
- Auto-play moves during autocomplete

### Architecture

#### AnimatedCard Component
Located in `src/components/AnimatedCard.tsx`, this component:
1. Receives card data and start/end positions as props
2. Renders an overlay card positioned absolutely over the game board
3. Uses CSS transforms to animate from start to end position
4. Employs double `requestAnimationFrame` to ensure browser applies transitions
5. Calls `onComplete` callback after animation duration (300ms)

#### Animation State Management
In `GameBoard.tsx`:
- **`animatingCard`**: Tracks currently animating card and positions
- **`gameStateRef`**: Ref to current state for async auto-play operations
- **`animateMove()`**: Central function that orchestrates all animations

#### Position Calculation
Two key utility functions:
1. **`getCardPosition(cardId)`**: Finds DOM element by card ID and returns `DOMRect`
2. **`getDestinationPosition(destination)`**: Calculates target position based on current DOM state

#### Animation Flow
```
User Action → animateMove() called
  ↓
Get source card position from DOM
  ↓
Validate move with klondikeLogic
  ↓
Calculate destination position
  ↓
Set animatingCard state (triggers AnimatedCard render)
  ↓
AnimatedCard animates for 300ms
  ↓
onComplete callback → update game state
  ↓
Animation cleared, card appears in new location
```

#### Auto-Play Integration
Auto-play works through:
1. `detectAutoPlayMove()` compares old and new states to identify moved card
2. Finds moved card's source and destination
3. Triggers animation before continuing to next auto-play move
4. Uses `gameStateRef` to track state during async animations

### Key Technical Patterns

#### Double RequestAnimationFrame
```typescript
useEffect(() => {
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            setIsAnimating(true);
        });
    });
}, []);
```
This ensures the browser has rendered the initial position before applying the transform, triggering the CSS transition.

#### Async State Management
```typescript
const gameStateRef = useRef<GameState>(gameState);
useEffect(() => {
    gameStateRef.current = gameState;
}, [gameState]);
```
During auto-play, animations are async. The ref ensures position calculations use the most current state.

#### CSS Transitions
```css
.animated-card {
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
```
Smooth, natural motion with ease-in-out acceleration curve.

# Klondike Solitaire Card Game - Agent Guide

## Project Overview
This is a TypeScript React implementation of the classic Klondike solitaire card game. The game runs entirely client-side and is designed to be deployed to AWS S3/CloudFront as a static website.

## Technology Stack
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Package Manager**: Bun
- **Deployment Target**: AWS S3 + CloudFront

## Project Structure
```
/src
  /components      - React components (Card, GameBoard, etc.)
  /game           - Game logic, state management, and rules
  /utils          - Utility functions (RNG, shuffling, etc.)
  /assets         - Card images from Wikimedia Commons
  /types          - TypeScript type definitions
```

## Key Features
1. **Klondike Solitaire Rules**: Classic 7-column tableau layout
2. **Card Images**: SVG card images from Wikimedia Commons
3. **Game Mechanics**: Full Klondike rules implementation
4. **UI Interaction**: Drag-and-drop or click-to-move card interaction
5. **Win Detection**: Automatic detection when game is won

## Development Commands
- `bun install` - Install dependencies
- `bun dev` - Start development server
- `bun build` - Build for production
- `bun preview` - Preview production build

## Klondike Solitaire Rules
- 52 cards dealt into 7 tableau columns (1, 2, 3, 4, 5, 6, 7 cards respectively)
- Only the top card in each tableau column is face-up initially
- 24 cards remain in the stock (draw pile)
- 4 foundations (top right) - build from Ace to King by suit
- Tableau cards can be moved to another column if descending rank and alternating color
- Multiple cards can be moved as a unit when they form a valid sequence
- Cards are drawn from stock to waste pile (typically 3 at a time)
- Top card of waste pile can be played to tableau or foundation

## Deployment
The built application (`dist/` folder) will be deployed to AWS S3 as a static website with CloudFront CDN for global distribution.

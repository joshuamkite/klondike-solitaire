# Klondike Solitaire

A React TypeScript implementation of the classic Klondike solitaire card game.

## Features

- Classic Klondike solitaire rules
- Clean, intuitive interface
- Card images from Wikimedia Commons (Byron Knoll set)
- Click-to-move card interaction
- Undo functionality
- Move counter
- Win detection

## Development

This project uses:
- **React 19** with TypeScript
- **Vite** for build tooling
- **Bun** as package manager

### Prerequisites

- Bun installed on your system

### Getting Started

1. Install dependencies:
```bash
bun install
```

2. Download card images (if not already present):
```bash
cd dev_tooling/download_cards
go run main.go
cd ../..
```

3. Start development server:
```bash
bun dev
```

4. Build for production:
```bash
bun build
```

5. Preview production build:
```bash
bun preview
```

## Game Rules

- 7 tableau columns dealt with 1, 2, 3, 4, 5, 6, 7 cards respectively
- Only the top card in each tableau column is face-up initially
- 24 cards remain in the stock (draw pile)
- 4 foundations (top right) - build from Ace to King by suit
- Tableau cards can be moved to another column if descending rank and alternating color
- Multiple cards can be moved as a unit when they form a valid sequence
- Cards are drawn from stock to waste pile (3 at a time)
- Top card of waste pile can be played to tableau or foundation
- Double-click a card to auto-move to foundation (if valid)

## Deployment

The built application (`dist/` folder) can be deployed to AWS S3 as a static website with CloudFront CDN for global distribution.

## License

Card images by Byron Knoll, from [Wikimedia Commons](https://commons.wikimedia.org/wiki/Category:SVG_English_pattern_playing_cards) (Public Domain)

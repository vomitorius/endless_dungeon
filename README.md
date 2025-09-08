# Endless Dungeon

A modern retro dungeon pixel art game starter project built with HTML5 Canvas, Pixi.js, and procedural dungeon generation.

## Features

- 🏰 Procedural dungeon generation using Dungeoneer
- 🛡️ Knight character with arrow key movement
- 🎨 Pixel art graphics with 32x32 sprites
- ✨ Win condition when reaching the finish tile
- 🎲 Generate new dungeons on demand
- 📱 Responsive design with Bootstrap 5

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/vomitorius/endless_dungeon.git
cd endless_dungeon
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser and navigate to `http://localhost:3000`

## Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Run ESLint with auto-fix
- `npm run format` - Format code with Prettier

## How to Play

1. Use arrow keys to move your knight around the dungeon
2. Navigate through floors (dark areas) and doors
3. Avoid walls (brown blocks)
4. Reach the finish tile to win and generate a new dungeon
5. Click "Generate New Dungeon" to create a new challenge

## Game Elements

- **Knight** 🛡️ - Your character (controllable)
- **Floor** - Dark areas you can walk on
- **Wall** - Brown blocks that block movement
- **Door** - Openings between rooms
- **Finish** ✨ - Goal tile that triggers victory

## Technology Stack

- **Pixi.js** - HTML5 Canvas/WebGL library for rendering
- **Dungeoneer** - Procedural dungeon generation
- **Vite** - Modern build tool and dev server
- **Bootstrap 5** - UI framework
- **ESLint & Prettier** - Code quality and formatting

## Project Structure

```
endless_dungeon/
├── public/
│   └── img/          # Game sprites and assets
├── src/
│   └── main.js       # Main game logic
├── index.html        # Entry point
├── vite.config.js    # Vite configuration
└── package.json      # Dependencies and scripts
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run linting and formatting: `npm run lint:fix && npm run format`
5. Submit a pull request

## License

MIT License - see LICENSE file for details
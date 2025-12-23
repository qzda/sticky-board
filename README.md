# [Sticky Board](https://sticky-web.netlify.app/)

[English](./README.md) | [中文](./README-zh.md)

A clean and elegant web-based sticky notes board that supports drag-and-drop operations, grid snapping, and Markdown syntax.

All data is stored locally only. No account required, no synchronization needed — just open and use.

## ✨ Features

- 🔒 **Local Storage** – All data is stored only in the browser
- 📄 **Markdown** – Write content using Markdown syntax with preview support
- 📐 **Grid Alignment** – Cards snap to a grid when moving or resizing
- 💾 **Auto Save** – All changes are saved automatically
- 📤 **Import / Export** – Stickies can be imported or exported as JSON files
- 🌓 **Dark Mode** – Automatically follows the system theme
- 🌍 **Multi-language** – Automatically switches between Chinese and English based on browser language

## 📖 Usage

### Create a Sticky

Click and drag on empty space, then release to create a sticky note
(minimum size: 10rem × 10rem)

### Delete a Sticky

Click the “×” button in the top-right corner and confirm to delete

### Edit a Sticky

Click on the empty area of a card to enter edit mode.
Click anywhere outside to exit edit mode and preview the content.

### Move & Resize

- Drag the top area of a sticky to move it
- Drag the bottom-right corner to resize it

### Import / Export

- Click **Settings** in the bottom-right corner to open options
- **Export**: Save as `stickys-[timestamp].json`
- **Import**: Import from a JSON file
  - Same ID: update
  - New ID: create

## 🤝 Contributing

Issues and Pull Requests are welcome.

## 🔮 Roadmap

- [ ] Custom sticky colors
- [ ] Tags / Groups
- [x] Sticky import / export
- [x] Multi-language support
- [ ] Keyboard shortcuts
- [ ] Multi-select & batch operations
- [ ] Undo / redo
- [ ] Cloud sync

## 📝 License

MIT License. See [LICENSE](/LICENSE) for details.

---

<center>Made with ❤️ by qzda</center>

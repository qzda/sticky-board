# [Sticky Board](https://sticky-web.netlify.app/)

A clean and elegant web-based sticky notes board application with support for drag-to-create, move, resize, and delete notes.

## ✨ Features

- 🎨 **Drag to Create** - Click and drag in empty space to create notes with real-time shadow preview
- 📝 **Free Editing** - Each note contains an editable text area
- 🔄 **Drag to Move** - Click the note header to drag to any position
- 📏 **Resizable** - Drag right edge and bottom edge to resize notes
- 🗑️ **Delete Function** - Click the delete button in the top-right corner, confirm to delete
- 💾 **Auto Save** - All operations are automatically saved
- 🌓 **Dark Mode** - Automatically adapts to system theme
- 📐 **Grid Alignment** - All operations automatically snap to grid
- 🔒 **Data Privacy** - All data is stored locally in browser only
- 📤 **Export/Import** - Export notes to JSON file or import from existing files

## 📖 Usage

### Creating Notes

1. Click and hold the left mouse button in empty space
2. Drag to desired size (a dashed preview box will appear)
3. Release mouse to create note
   - Note: Both width and height must be at least 10rem (160px)
   - If dragged area is too small, release will cancel creation

### Editing Notes

- Click the text area inside the note to edit content
- Content is automatically saved

### Moving Notes

- Click the gray header area of the note (not the text area)
- Drag to target position
- Automatically snaps to grid

### Resizing Notes

- Drag the right edge or bottom edge of the note
- You can drag the bottom-right corner to adjust both width and height simultaneously

### Deleting Notes

- Click the "×" button in the top-right corner of the note
- Click "OK" in the confirmation dialog

### Export/Import Notes

- Click the **settings** button in the bottom-right corner to expand options
- **Export**: Click the download button to save all notes as a JSON file (filename: stickys-[timestamp].json)
- **Import**: Click the upload button to import notes from a JSON file
  - Notes with same ID will be updated
  - Notes with new ID will be added
  - Existing notes not in the import file will be preserved

## 🚀 Dev

### Install Dependencies

```bash
npm install
npm run dev
```

## 🤝 Contributing

Issues and Pull Requests are welcome!

## 🔮 Future Plans

- [ ] Support custom note colors
- [ ] Support note groups/tags
- [x] Support export/import note data
- [ ] Support keyboard shortcuts
- [ ] Support multi-select and batch operations
- [ ] Support undo/redo functionality
- [ ] Support cloud sync

---

<center>Made with ❤️ by [qzda]</center>

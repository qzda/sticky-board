# [Sticky Board](https://sticky-web.netlify.app/)

A clean and elegant web-based sticky notes board that supports creating, moving, resizing, and deleting notes via drag-and-drop.

## ✨ Features

- 🎨 **Drag to Create** – Click and drag on empty space to create a sticky note, with real-time preview shadow
- 📝 **Free Editing** – Each sticky note contains an editable text area
- 🔄 **Drag to Move** – Drag the top area of a note to move it anywhere
- 📏 **Resize** – Drag the right edge and bottom edge to resize the note
- 🗑️ **Delete** – Click the “×” button in the top-right corner and confirm to delete
- 💾 **Auto Save** – All operations are automatically saved
- 📤 **Import / Export** – Export notes as a JSON file or import from an existing one
- 🌓 **Dark Mode** – Automatically adapts to system theme (SVG icons adapt as well)
- 📐 **Grid Alignment** – All operations snap to a grid
- 🌍 **Multi-language Support** – Automatically switches between Chinese and English based on browser language
- 🔒 **Data Privacy** – All data is stored locally in the browser only

## 📖 Usage

### Create a Sticky Note

1. Press and hold the left mouse button on an empty area
2. Drag to the desired size (a dashed preview box will appear)
3. Release the mouse to create the note
   - Note: Both width and height must be at least 10rem (160px)
   - If the dragged area is too small, creation will be canceled automatically

### Edit a Sticky Note

- Click inside the text area of a note to edit
- Content is saved automatically

### Move a Sticky Note

- Click the gray top area of the note (not the text area)
- Drag it to the target position
- The note will automatically snap to the grid

### Resize a Sticky Note

- Drag the right edge or bottom edge of the note
- Drag the bottom-right corner to resize both width and height simultaneously

### Delete a Sticky Note

- Click the “×” button in the top-right corner of the note
- Click “Confirm” in the confirmation dialog

### Import / Export Sticky Notes

- Click the **Settings** button in the bottom-right corner to expand options
- **Export**: Click the download button to save all notes as a JSON file
  (filename: `stickys-[timestamp].json`)
- **Import**: Click the upload button to import notes from a JSON file
  - Notes with the same ID will be updated
  - Notes with new IDs will be added
  - Existing notes not present in the imported file will be kept

## 🚀 Dev

### Install Dependencies

```bash
npm install
npm run dev
```

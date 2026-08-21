# Diffchecker

A fast, lightweight, and modern text comparison web tool. Hosted 100% statically on GitHub Pages with zero external dependencies and client-side processing.

🌐 **Live Demo:** [https://imranpollob.github.io/diffchecker/](https://imranpollob.github.io/diffchecker/)

---

## ✨ Features

- **Split View Comparison Modes**:
  - **Word Diff**: Side-by-side comparison with word-level additions (`+`) and removals (`-`) highlighted within modified lines.
  - **Char Diff**: Side-by-side comparison with granular character-level additions and removals highlighted (ideal for typos, spelling differences, and code tokens).
- **Line Wrapping Enabled by Default**: Clean, automatic line wrapping for long lines without requiring horizontal scrolling (toggleable in settings).
- **Synchronized Scrolling**: Dual-pane scrolling stays perfectly locked and aligned between Original and Changed texts.
- **Diff Options**:
  - **Wrap Lines**: Enabled by default; toggle off for raw code scrolling.
  - **Ignore Blank Lines**: Disregards inserted or deleted empty/blank lines.
  - **Ignore Whitespace**: Disregards indentation and trailing space differences.
  - **Ignore Case**: Case-insensitive comparison.
- **Productivity Controls**:
  - **Swap Texts**: Easily switch Original and Changed inputs with one click.
  - **Sample Text**: Load realistic code samples instantly for testing.
  - **Paste & Clear**: Quick clipboard helpers and individual/all clear buttons.
  - **Keyboard Shortcuts**: Press <kbd>Ctrl+Enter</kbd> or <kbd>⌘+Enter</kbd> to run diff instantly.
- **Modern UI & Themes**:
  - Dark mode & Light mode with system preference auto-detection and persistence.
  - Crisp typography and accessible contrast colors for additions and deletions.
  - Fully responsive layout for desktop, tablet, and mobile.
- **Zero Backend & 100% Private**:
  - All comparisons run entirely inside your browser using a custom standalone implementation of the Myers Diff Algorithm.
  - No text is ever uploaded or sent over the network.

---

## 🚀 Deployment to GitHub Pages

To host this on GitHub Pages:

1. Commit and push the repository to GitHub:
   ```bash
   git add .
   git commit -m "feat: implement split view word and char diff tool"
   git push -u origin main
   ```
2. In your repository on GitHub:
   - Go to **Settings** &rarr; **Pages** (under "Code and automation").
   - Under **Build and deployment** &rarr; **Source**, select **Deploy from a branch**.
   - Under **Branch**, select `main` and folder `/ (root)`.
   - Click **Save**.
3. Your site will be published at `https://imranpollob.github.io/diffchecker/` within 1-2 minutes!

---

## 🛠️ Local Development & Testing

Since this project has zero dependencies and requires no build pipeline, you can open `index.html` directly in any web browser, or serve it with any local static HTTP server:

```bash
# Python 3
python3 -m http.server 8000

# Node / npx
npx serve .
```

To run the automated tests for the diff engine:
```bash
node test/diff-engine.test.js
```

---

## 📄 License

MIT License. Open source and free to use!

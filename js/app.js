/**
 * Diffchecker Application Controller
 * Handles user interactions, split view rendering (word & char diff), theme toggling, and diff computation.
 */

(function () {
  'use strict';

  // DOM Elements
  const originalInput = document.getElementById('originalInput');
  const changedInput = document.getElementById('changedInput');
  const originalStats = document.getElementById('originalStats');
  const changedStats = document.getElementById('changedStats');

  const compareBtn = document.getElementById('compareBtn');
  const swapTextsBtn = document.getElementById('swapTextsBtn');
  const sampleBtn = document.getElementById('sampleBtn');
  const clearAllBtn = document.getElementById('clearAllBtn');
  const clearOriginalBtn = document.getElementById('clearOriginalBtn');
  const clearChangedBtn = document.getElementById('clearChangedBtn');
  const pasteOriginalBtn = document.getElementById('pasteOriginalBtn');
  const pasteChangedBtn = document.getElementById('pasteChangedBtn');
  const copyResultBtn = document.getElementById('copyResultBtn');

  const tabButtons = document.querySelectorAll('.tab-btn');
  const optIgnoreWhitespace = document.getElementById('optIgnoreWhitespace');
  const optIgnoreBlankLines = document.getElementById('optIgnoreBlankLines');
  const optIgnoreCase = document.getElementById('optIgnoreCase');
  const optWrapLines = document.getElementById('optWrapLines');

  const themeToggleBtn = document.getElementById('themeToggleBtn');
  const themeIconSun = document.getElementById('themeIconSun');
  const themeIconMoon = document.getElementById('themeIconMoon');

  const resultsHeader = document.getElementById('resultsHeader');
  const statsSummary = document.getElementById('statsSummary');
  const diffCard = document.getElementById('diffCard');
  const emptyState = document.getElementById('emptyState');
  const diffOutput = document.getElementById('diffOutput');
  const toast = document.getElementById('toast');

  // Application State
  let activeMode = 'word'; // 'word' | 'char'
  let cachedDiff = null;

  // Sample data
  const SAMPLE_ORIGINAL = `function calculateTotal(items, taxRate) {
  let subtotal = 0;
  for (let i = 0; i < items.length; i++) {
    subtotal += items[i].price;
  }

  // Calculate tax amount
  const tax = subtotal * taxRate;
  const total = subtotal + tax;

  return {
    subtotal: subtotal,
    tax: tax,
    grandTotal: total
  };
}`;

  const SAMPLE_CHANGED = `function calculateTotal(items, taxRate = 0.05, discountRate = 0) {
  let subtotal = 0;
  for (const item of items) {
    subtotal += item.price * (item.quantity || 1);
  }

  // Apply discount if provided
  const discount = subtotal * discountRate;
  const discountedSubtotal = subtotal - discount;

  // Calculate final tax & total
  const tax = discountedSubtotal * taxRate;
  const grandTotal = discountedSubtotal + tax;

  return {
    subtotal: subtotal,
    discount: discount,
    tax: tax,
    grandTotal: Math.round(grandTotal * 100) / 100
  };
}`;

  // Initialize
  function init() {
    initTheme();
    bindEvents();
    updateInputStats();
    updateWrapClass();
  }

  // Theme Management
  function initTheme() {
    const savedTheme = localStorage.getItem('diffchecker_theme');
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = savedTheme || (prefersDark ? 'dark' : 'light');
    setTheme(theme);
  }

  function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('diffchecker_theme', theme);

    if (theme === 'dark') {
      themeIconSun.style.display = 'block';
      themeIconMoon.style.display = 'none';
    } else {
      themeIconSun.style.display = 'none';
      themeIconMoon.style.display = 'block';
    }
  }

  function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    setTheme(currentTheme === 'dark' ? 'light' : 'dark');
  }

  // Event Listeners
  function bindEvents() {
    themeToggleBtn.addEventListener('click', toggleTheme);

    originalInput.addEventListener('input', () => {
      updateInputStats();
      invalidateCache();
    });

    changedInput.addEventListener('input', () => {
      updateInputStats();
      invalidateCache();
    });

    compareBtn.addEventListener('click', () => performDiff());

    swapTextsBtn.addEventListener('click', swapTexts);
    sampleBtn.addEventListener('click', loadSample);
    clearAllBtn.addEventListener('click', clearAll);

    clearOriginalBtn.addEventListener('click', () => {
      originalInput.value = '';
      updateInputStats();
      invalidateCache();
      resetDiffView();
    });

    clearChangedBtn.addEventListener('click', () => {
      changedInput.value = '';
      updateInputStats();
      invalidateCache();
      resetDiffView();
    });

    pasteOriginalBtn.addEventListener('click', () => pasteText(originalInput));
    pasteChangedBtn.addEventListener('click', () => pasteText(changedInput));
    copyResultBtn.addEventListener('click', copyDiffResults);

    // Mode Switcher Tabs (Word Diff vs Char Diff)
    tabButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const mode = btn.getAttribute('data-mode');
        switchMode(mode);
      });
    });

    // Options
    optIgnoreWhitespace.addEventListener('change', () => {
      invalidateCache();
      performDiff();
    });

    optIgnoreBlankLines.addEventListener('change', () => {
      invalidateCache();
      performDiff();
    });

    optIgnoreCase.addEventListener('change', () => {
      invalidateCache();
      performDiff();
    });

    optWrapLines.addEventListener('change', () => {
      updateWrapClass();
    });
  }

  function updateInputStats() {
    const origText = originalInput.value;
    const chgText = changedInput.value;

    const origLines = origText ? origText.split('\n').length : 0;
    const chgLines = chgText ? chgText.split('\n').length : 0;

    originalStats.textContent = `${origLines} ${origLines === 1 ? 'line' : 'lines'}, ${origText.length} chars`;
    changedStats.textContent = `${chgLines} ${chgLines === 1 ? 'line' : 'lines'}, ${chgText.length} chars`;
  }

  function invalidateCache() {
    cachedDiff = null;
  }

  function resetDiffView() {
    emptyState.style.display = 'flex';
    diffOutput.style.display = 'none';
    resultsHeader.style.display = 'none';
    diffOutput.innerHTML = '';
  }

  function switchMode(mode) {
    activeMode = mode;
    tabButtons.forEach(btn => {
      const isSelected = btn.getAttribute('data-mode') === mode;
      btn.classList.toggle('active', isSelected);
      btn.setAttribute('aria-selected', isSelected);
    });

    if (cachedDiff || (originalInput.value || changedInput.value)) {
      renderActiveView();
    }
  }

  function updateWrapClass() {
    if (optWrapLines.checked) {
      diffOutput.classList.add('wrap-lines');
      originalInput.style.whiteSpace = 'pre-wrap';
      changedInput.style.whiteSpace = 'pre-wrap';
    } else {
      diffOutput.classList.remove('wrap-lines');
      originalInput.style.whiteSpace = 'pre';
      changedInput.style.whiteSpace = 'pre';
    }
  }

  async function pasteText(targetTextarea) {
    try {
      const text = await navigator.clipboard.readText();
      targetTextarea.value = text;
      updateInputStats();
      invalidateCache();
      showToast('Pasted from clipboard');
    } catch (err) {
      targetTextarea.focus();
      showToast('Press Ctrl+V to paste');
    }
  }

  function swapTexts() {
    const temp = originalInput.value;
    originalInput.value = changedInput.value;
    changedInput.value = temp;

    updateInputStats();
    invalidateCache();

    if (originalInput.value || changedInput.value) {
      performDiff();
      showToast('Texts swapped');
    }
  }

  function loadSample() {
    originalInput.value = SAMPLE_ORIGINAL;
    changedInput.value = SAMPLE_CHANGED;
    updateInputStats();
    invalidateCache();
    performDiff();
    showToast('Loaded sample text');
  }

  function clearAll() {
    originalInput.value = '';
    changedInput.value = '';
    updateInputStats();
    invalidateCache();
    resetDiffView();
    showToast('Cleared all inputs');
  }

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => {
      toast.classList.remove('show');
    }, 2200);
  }

  function getOptions() {
    return {
      ignoreWhitespace: optIgnoreWhitespace.checked,
      ignoreBlankLines: optIgnoreBlankLines.checked,
      ignoreCase: optIgnoreCase.checked,
      diffMode: activeMode
    };
  }

  // Perform Diff Computation
  function performDiff() {
    const textA = originalInput.value;
    const textB = changedInput.value;

    if (!textA && !textB) {
      resetDiffView();
      return;
    }

    const options = getOptions();

    // Compute line diff
    const rawLineEdits = DiffEngine.computeLineDiff(textA, textB, options);
    const stats = DiffEngine.computeStats(rawLineEdits);

    cachedDiff = {
      textA,
      textB,
      options,
      rawLineEdits,
      stats
    };

    renderActiveView();
  }

  function renderActiveView() {
    if (!cachedDiff) {
      performDiff();
      return;
    }

    const { options, rawLineEdits, stats } = cachedDiff;
    options.diffMode = activeMode;

    emptyState.style.display = 'none';
    diffOutput.style.display = 'block';
    resultsHeader.style.display = 'flex';
    updateWrapClass();

    renderStatsSummary(stats);

    if (stats.isIdentical) {
      diffOutput.innerHTML = `
        <div class="identical-banner">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          <span>Texts are identical — no differences found.</span>
        </div>
      `;
      return;
    }

    renderSplitView(rawLineEdits, options);
  }

  function renderStatsSummary(stats) {
    if (stats.isIdentical) {
      statsSummary.innerHTML = `<span class="stat-pill stat-pill-equal">0 changes</span>`;
      return;
    }

    statsSummary.innerHTML = `
      <span class="stat-pill stat-pill-add">+${stats.additions} addition${stats.additions === 1 ? '' : 's'}</span>
      <span class="stat-pill stat-pill-del">-${stats.deletions} deletion${stats.deletions === 1 ? '' : 's'}</span>
      <span class="stat-pill stat-pill-equal">${stats.unchanged} unchanged</span>
    `;
  }

  // Render Split (Side-by-Side) View with intra-line word/char diffing
  function renderSplitView(rawLineEdits, options) {
    const alignedRows = DiffEngine.alignSplitDiff(rawLineEdits, options);

    let leftRowsHtml = '';
    let rightRowsHtml = '';

    for (let i = 0; i < alignedRows.length; i++) {
      const row = alignedRows[i];

      // Left Column (Original)
      if (row.left) {
        const rowClass = row.left.type === 'del' ? 'diff-row-del' : 'diff-row-equal';
        leftRowsHtml += `
          <div class="diff-row ${rowClass}">
            <div class="diff-gutter">${row.left.lineNum}</div>
            <div class="diff-line-content">${row.left.html || ' '}</div>
          </div>
        `;
      } else {
        leftRowsHtml += `
          <div class="diff-row diff-row-empty">
            <div class="diff-gutter">&nbsp;</div>
            <div class="diff-line-content">&nbsp;</div>
          </div>
        `;
      }

      // Right Column (Changed)
      if (row.right) {
        const rowClass = row.right.type === 'add' ? 'diff-row-add' : 'diff-row-equal';
        rightRowsHtml += `
          <div class="diff-row ${rowClass}">
            <div class="diff-gutter">${row.right.lineNum}</div>
            <div class="diff-line-content">${row.right.html || ' '}</div>
          </div>
        `;
      } else {
        rightRowsHtml += `
          <div class="diff-row diff-row-empty">
            <div class="diff-gutter">&nbsp;</div>
            <div class="diff-line-content">&nbsp;</div>
          </div>
        `;
      }
    }

    diffOutput.innerHTML = `
      <div class="diff-split-container">
        <div class="split-column" id="splitLeftColumn">
          <div class="split-column-header">Original</div>
          <div class="diff-table">${leftRowsHtml}</div>
        </div>
        <div class="split-column" id="splitRightColumn">
          <div class="split-column-header">Changed</div>
          <div class="diff-table">${rightRowsHtml}</div>
        </div>
      </div>
    `;

    // Synchronize horizontal & vertical scrolling
    setupSynchronizedScroll();
  }

  function setupSynchronizedScroll() {
    const leftCol = document.getElementById('splitLeftColumn');
    const rightCol = document.getElementById('splitRightColumn');
    if (!leftCol || !rightCol) return;

    let isSyncingLeft = false;
    let isSyncingRight = false;

    leftCol.addEventListener('scroll', () => {
      if (!isSyncingLeft) {
        isSyncingRight = true;
        rightCol.scrollTop = leftCol.scrollTop;
        rightCol.scrollLeft = leftCol.scrollLeft;
      }
      isSyncingLeft = false;
    });

    rightCol.addEventListener('scroll', () => {
      if (!isSyncingRight) {
        isSyncingLeft = true;
        leftCol.scrollTop = rightCol.scrollTop;
        leftCol.scrollLeft = rightCol.scrollLeft;
      }
      isSyncingRight = false;
    });
  }

  // Copy results helper
  function copyDiffResults() {
    const textToCopy = changedInput.value || originalInput.value;
    if (!textToCopy) {
      showToast('Nothing to copy');
      return;
    }

    navigator.clipboard.writeText(textToCopy)
      .then(() => showToast('Copied Changed text to clipboard'))
      .catch(() => showToast('Failed to copy to clipboard'));
  }

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();

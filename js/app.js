/**
 * Diffchecker Application Controller
 * Handles user interactions, split view rendering (word & char diff), theme toggling,
 * diff computation, and in-diff selection tooltip (Copy & In-place Replace).
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
  const copyOriginalBtn = document.getElementById('copyOriginalBtn');
  const copyChangedBtn = document.getElementById('copyChangedBtn');
  const pasteOriginalBtn = document.getElementById('pasteOriginalBtn');
  const pasteChangedBtn = document.getElementById('pasteChangedBtn');
  const clearOriginalBtn = document.getElementById('clearOriginalBtn');
  const clearChangedBtn = document.getElementById('clearChangedBtn');
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

  // Selection Tooltip & Replace Popover Elements
  const diffSelectionTooltip = document.getElementById('diffSelectionTooltip');
  const tooltipActions = document.getElementById('tooltipActions');
  const tooltipCopyBtn = document.getElementById('tooltipCopyBtn');
  const tooltipReplaceBtn = document.getElementById('tooltipReplaceBtn');
  const tooltipReplaceForm = document.getElementById('tooltipReplaceForm');
  const replaceFormTitle = document.getElementById('replaceFormTitle');
  const closeReplaceFormBtn = document.getElementById('closeReplaceFormBtn');
  const replaceInput = document.getElementById('replaceInput');
  const cancelReplaceBtn = document.getElementById('cancelReplaceBtn');
  const confirmReplaceBtn = document.getElementById('confirmReplaceBtn');

  // Application State
  let activeMode = 'word'; // 'word' | 'char'
  let cachedDiff = null;
  let currentSelectionInfo = null;

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
    bindSelectionEvents();
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

    copyOriginalBtn.addEventListener('click', () => copyInputText(originalInput, 'Original'));
    copyChangedBtn.addEventListener('click', () => copyInputText(changedInput, 'Changed'));
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

  // Selection Tooltip & In-place Replace Logic
  function bindSelectionEvents() {
    // Listen for text selections in diff output
    document.addEventListener('mouseup', handleDiffTextSelection);
    document.addEventListener('keyup', handleDiffTextSelection);

    // Copy from tooltip
    tooltipCopyBtn.addEventListener('click', () => {
      if (!currentSelectionInfo || !currentSelectionInfo.text) return;
      navigator.clipboard.writeText(currentSelectionInfo.text)
        .then(() => showToast('Copied to clipboard'))
        .catch(() => showToast('Failed to copy'));
      hideSelectionTooltip();
    });

    // Open Replace Form
    tooltipReplaceBtn.addEventListener('click', () => {
      if (!currentSelectionInfo) return;
      tooltipActions.style.display = 'none';
      tooltipReplaceForm.style.display = 'flex';
      replaceFormTitle.textContent = currentSelectionInfo.pane === 'original' ? 'Replace in Original' : 'Replace in Changed';
      replaceInput.value = currentSelectionInfo.text;
      replaceInput.focus();
      replaceInput.select();
      repositionTooltip();
    });

    // Close / Cancel Replace Form
    closeReplaceFormBtn.addEventListener('click', hideSelectionTooltip);
    cancelReplaceBtn.addEventListener('click', hideSelectionTooltip);

    // Confirm Replace
    confirmReplaceBtn.addEventListener('click', executeReplacement);

    // Replace textarea key handling
    replaceInput.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        executeReplacement();
      } else if (e.key === 'Escape') {
        hideSelectionTooltip();
      }
    });

    // Dismiss tooltip on click outside or escape
    document.addEventListener('mousedown', (e) => {
      if (diffSelectionTooltip.style.display === 'none') return;
      if (!diffSelectionTooltip.contains(e.target) && !diffOutput.contains(e.target)) {
        hideSelectionTooltip();
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        hideSelectionTooltip();
      }
    });

    window.addEventListener('scroll', () => {
      if (diffSelectionTooltip.style.display !== 'none' && tooltipReplaceForm.style.display === 'none') {
        hideSelectionTooltip();
      }
    }, { passive: true });
  }

  function handleDiffTextSelection(e) {
    // If user is interacting inside the replace popup itself, ignore
    if (diffSelectionTooltip.contains(e.target)) return;

    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
      if (tooltipReplaceForm.style.display === 'none') {
        hideSelectionTooltip();
      }
      return;
    }

    const selectedText = selection.toString();
    if (!selectedText || selectedText.trim() === '') {
      if (tooltipReplaceForm.style.display === 'none') {
        hideSelectionTooltip();
      }
      return;
    }

    const range = selection.getRangeAt(0);

    // Ensure selection is inside diffOutput and within one column
    const leftCol = document.getElementById('splitLeftColumn');
    const rightCol = document.getElementById('splitRightColumn');
    if (!leftCol || !rightCol) return;

    const isStartInLeft = leftCol.contains(range.startContainer);
    const isEndInLeft = leftCol.contains(range.endContainer);
    const isStartInRight = rightCol.contains(range.startContainer);
    const isEndInRight = rightCol.contains(range.endContainer);

    let pane = null;
    if (isStartInLeft && isEndInLeft) {
      pane = 'original';
    } else if (isStartInRight && isEndInRight) {
      pane = 'changed';
    } else {
      // Selection spans across columns or outside diff panes
      hideSelectionTooltip();
      return;
    }

    // Locate start and end line content elements
    const startRowContent = getLineContentElement(range.startContainer);
    const endRowContent = getLineContentElement(range.endContainer);

    if (!startRowContent || !endRowContent) {
      hideSelectionTooltip();
      return;
    }

    const startLine = parseInt(startRowContent.dataset.lineNum, 10);
    const endLine = parseInt(endRowContent.dataset.lineNum, 10);

    if (isNaN(startLine) || isNaN(endLine)) {
      hideSelectionTooltip();
      return;
    }

    // Calculate exact character offsets within the starting and ending lines
    const preStartRange = document.createRange();
    preStartRange.selectNodeContents(startRowContent);
    preStartRange.setEnd(range.startContainer, range.startOffset);
    const startCharOffset = preStartRange.toString().length;

    const preEndRange = document.createRange();
    preEndRange.selectNodeContents(endRowContent);
    preEndRange.setEnd(range.endContainer, range.endOffset);
    const endCharOffset = preEndRange.toString().length;

    const rect = range.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return;

    currentSelectionInfo = {
      pane,
      text: selectedText,
      startLine,
      endLine,
      startCharOffset,
      endCharOffset,
      rect
    };

    showSelectionTooltip(rect);
  }

  function getLineContentElement(node) {
    if (!node) return null;
    const el = node.nodeType === 1 ? node : node.parentElement;
    return el ? el.closest('.diff-line-content') : null;
  }

  function showSelectionTooltip(rect) {
    tooltipActions.style.display = 'flex';
    tooltipReplaceForm.style.display = 'none';
    diffSelectionTooltip.style.display = 'block';

    positionTooltipAtRect(rect);
  }

  function repositionTooltip() {
    if (!currentSelectionInfo || !currentSelectionInfo.rect) return;
    positionTooltipAtRect(currentSelectionInfo.rect);
  }

  function positionTooltipAtRect(rect) {
    const tooltipRect = diffSelectionTooltip.getBoundingClientRect();
    const tooltipWidth = tooltipRect.width || 140;
    const tooltipHeight = tooltipRect.height || 36;

    let top = rect.top - tooltipHeight - 8;
    let left = rect.left + (rect.width / 2) - (tooltipWidth / 2);

    // Keep within horizontal window bounds
    if (left < 10) left = 10;
    if (left + tooltipWidth > window.innerWidth - 10) {
      left = window.innerWidth - tooltipWidth - 10;
    }

    // If too close to top of viewport, position below selection
    if (top < 10) {
      top = rect.bottom + 8;
    }

    diffSelectionTooltip.style.top = `${top}px`;
    diffSelectionTooltip.style.left = `${left}px`;
  }

  function hideSelectionTooltip() {
    diffSelectionTooltip.style.display = 'none';
    tooltipReplaceForm.style.display = 'none';
    tooltipActions.style.display = 'flex';
    currentSelectionInfo = null;
  }

  function executeReplacement() {
    if (!currentSelectionInfo) return;

    const replacement = replaceInput.value;
    const { pane, startLine, endLine, startCharOffset, endCharOffset } = currentSelectionInfo;

    const targetInput = pane === 'original' ? originalInput : changedInput;
    const currentText = targetInput.value;
    const lines = currentText.split('\n');

    if (startLine > lines.length || endLine > lines.length || startLine < 1 || endLine < 1) {
      showToast('Could not locate line position');
      hideSelectionTooltip();
      return;
    }

    if (startLine === endLine) {
      // Single line replacement
      const lineIdx = startLine - 1;
      const lineText = lines[lineIdx];
      const before = lineText.slice(0, startCharOffset);
      const after = lineText.slice(endCharOffset);
      lines[lineIdx] = before + replacement + after;
    } else {
      // Multi-line replacement
      const startIdx = startLine - 1;
      const endIdx = endLine - 1;
      const before = lines[startIdx].slice(0, startCharOffset);
      const after = lines[endIdx].slice(endCharOffset);
      const combined = before + replacement + after;
      const newLines = combined.split('\n');
      lines.splice(startIdx, endIdx - startIdx + 1, ...newLines);
    }

    targetInput.value = lines.join('\n');
    updateInputStats();
    invalidateCache();
    hideSelectionTooltip();

    // Auto-update comparison
    performDiff();
    showToast(pane === 'original' ? 'Replaced in Original text' : 'Replaced in Changed text');
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
    hideSelectionTooltip();
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

  function copyInputText(targetInput, label) {
    const text = targetInput.value;
    if (!text) {
      showToast(`${label} text is empty`);
      return;
    }
    navigator.clipboard.writeText(text)
      .then(() => showToast(`Copied ${label} text to clipboard`))
      .catch(() => showToast('Failed to copy text'));
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

  // Render Split (Side-by-Side) View with intra-line word/char diffing & data-line attributes
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
          <div class="diff-row ${rowClass}" data-pane="original" data-line-num="${row.left.lineNum}">
            <div class="diff-gutter">${row.left.lineNum}</div>
            <div class="diff-line-content" data-pane="original" data-line-num="${row.left.lineNum}">${row.left.html || ' '}</div>
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
          <div class="diff-row ${rowClass}" data-pane="changed" data-line-num="${row.right.lineNum}">
            <div class="diff-gutter">${row.right.lineNum}</div>
            <div class="diff-line-content" data-pane="changed" data-line-num="${row.right.lineNum}">${row.right.html || ' '}</div>
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

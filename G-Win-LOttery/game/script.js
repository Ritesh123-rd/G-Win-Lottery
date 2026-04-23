/* ═══════════════════════════════════════════════════════════════
   script.js  –  Metro Lottery UI  (Fully Responsive)
═══════════════════════════════════════════════════════════════ */

/* ── Live Clock & Timer ─────────────────────────────────────────── */
let countdownSeconds = 0;

async function syncWithServerTimer() {
  if (!window.GWinAPI) return;
  try {
    const data = await window.GWinAPI.getTimerData();
    if (data && data.success) {
      // 1. Update Server Clock Display
      const serverTimeEl = document.getElementById('server-time');
      if (serverTimeEl) {
        // Format: DD-MM-YYYY HH:MM:SS AM/PM
        const parts = data.CurrentDate.split('-');
        const formattedDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
        serverTimeEl.textContent = `${formattedDate} ${data.CurrentTime}`;
      }

      // 2. Update Draw Time Display (Top Left)
      // Assuming first .info-item is Draw Time
      const infoItems = document.querySelectorAll('.info-item');
      if (infoItems.length > 0) {
        infoItems[0].textContent = `Draw Time: ${data.DrawTime}`;
      }

      // 3. Update Sync Countdown
      countdownSeconds = parseInt(data.time) || 0;
      updateCountdownDisplay();

      // Removed updateWinningNumbers() and updateDashboardHistory() from here
      // to call them only when countdown hits 0 as requested.
    }
  } catch (e) {
    console.warn('Timer sync failed:', e);
  }
}

async function updateDashboardHistory() {
  if (!window.GWinAPI || !window.GWinAPI.result6Wise) return;
  try {
    const res = await window.GWinAPI.result6Wise();
    // Handle both 'results' and 'data' fields just in case
    const historyData = res.results || res.data || [];

    if (res && res.status && historyData) {
      const grid = document.querySelector('.history-grid');
      if (grid) {
        grid.innerHTML = '';
        // Display the last 6 results provided by the API
        historyData.forEach(item => {
          const div = document.createElement('div');
          div.className = 'history-item';

          // Support both combined "result" string and separate big/small fields
          let big = '--', small = '--';
          if (item.result) {
            const parts = item.result.split(',');
            big = parts[0] ? parts[0].trim() : '--';
            small = parts[1] ? parts[1].trim() : '--';
          } else {
            big = item.big_result || '--';
            small = item.small_result || '--';
          }

          const displayTime = item.time ? item.time.replace(/AM|PM/gi, '').trim() : '--';
          div.innerHTML = `${displayTime}<br />${big}<br />${small}`;
          grid.appendChild(div);
        });
      }
    }
  } catch (e) {
    console.warn('Failed to update dashboard history:', e);
  }
}

let lastResultValue = null;
let isShowingResult = false; // Guard: ek saath ek hi popup

/* ─── Refresh pe sirf main reels update (no popup, no animation) ─── */
async function loadInitialResult() {
  if (!window.GWinAPI || !window.GWinAPI.result) return;
  try {
    const data = await window.GWinAPI.result();
    if (data && data.status && data.previous_result) {
      const parts = data.previous_result.split(',');
      const bigResult = parts[0].trim().substring(0, 3);
      const smallResult = parts[1] ? parts[1].trim() : '';
      lastResultValue = bigResult;
      spinWinningNumbers(bigResult, true); // instant snap, no popup
      const smallEl = document.getElementById('result-small-digit');
      if (smallEl) smallEl.textContent = smallResult;
    }
  } catch (e) {
    console.warn('Initial result load failed:', e);
  }
}

/* ─── Timer=0 par: popup + scroll + result ─── */
async function updateWinningNumbers() {
  // Guard: agar popup pehle se chal raha hai to naya mat kholo
  if (isShowingResult) return;

  // 1a. Check if any OTHER modal is currently open
  const otherOverlays = document.querySelectorAll('.modal-overlay:not(#winning-modal)');
  const anyOtherOpen = Array.from(otherOverlays).some(m => m.style.display === 'flex');

  if (anyOtherOpen) {
    console.log('Result suppressed: Another modal is open.');
    // Still update the main dashboard silently
    loadInitialResult();
    updateDashboardHistory();
    return;
  }

  if (!window.GWinAPI || !window.GWinAPI.result) {
    console.warn('GWinAPI.result not found');
    return;
  }

  isShowingResult = true;
  const winModal = document.getElementById('winning-modal');

  try {
    // 1. Popup kholo
    if (winModal) {
      winModal.classList.remove('modal-closing');
      winModal.style.display = 'flex';
    }

    // 2. Browser ko layout calculate karne do
    await new Promise(resolve => setTimeout(resolve, 100));

    // 3. Timer=0 ke baad naya result API se lo (tab hi server pe naya result hota hai)
    const data = await window.GWinAPI.result();
    console.log('Result API Response:', data);

    if (data && data.status && data.previous_result) {
      const parts = data.previous_result.split(',');
      const bigResult = parts[0].trim().substring(0, 3);
      const smallResult = parts[1] ? parts[1].trim() : '';

      lastResultValue = bigResult;

      // 4. Popup reels scroll karenge result pe (sirf ek baar)
      spinPopupReels(bigResult);

      // 5. Main reels instant snap (koi scroll nahi)
      spinWinningNumbers(bigResult, true);

      // 6. Small result
      const smallEl = document.getElementById('result-small-digit');
      if (smallEl) smallEl.textContent = smallResult;

      // 7. Reel 3 ka max spin time = 2.5 + 0.8 + 0.3 = 3.6s → 4s wait
      await new Promise(resolve => setTimeout(resolve, 4000));

      // 8. Timer 4:56 (296 sec) hone tak popup open rakho
      //    Max fallback: 12 seconds (agar timer sync nahi hua to)
      await new Promise(resolve => {
        const fallback = setTimeout(resolve, 12000);
        const poll = setInterval(() => {
          if (countdownSeconds > 0 && countdownSeconds <= 296) {
            clearInterval(poll);
            clearTimeout(fallback);
            resolve();
          }
        }, 300);
      });

      // 9. Popup slow motion me band (wapis jaha tha)
      if (winModal) {
        winModal.classList.add('modal-closing');
        setTimeout(() => {
          winModal.style.display = 'none';
          winModal.classList.remove('modal-closing');
          isShowingResult = false;
          
          // Soft reset instead of reload
          clearAllBets();
          const username = sessionStorage.getItem('username');
          if (username) {
            updateBalanceFromServer(username);
            updateDashboardHistory();
          }
        }, 1000);
      } else {
        isShowingResult = false;
        clearAllBets();
      }
    } else {
      console.warn('Invalid result data:', data);
      await new Promise(resolve => setTimeout(resolve, 1500));
      if (winModal) winModal.style.display = 'none';
      isShowingResult = false;
    }
  } catch (e) {
    console.warn('Winning numbers update failed:', e);
    if (winModal) winModal.style.display = 'none';
    isShowingResult = false;
  }
}


function updateCountdownDisplay() {
  const el = document.getElementById('prev-draw-time');
  if (!el) return;

  if (countdownSeconds <= 0) {
    el.textContent = '00:00';
    return;
  }

  const m = Math.floor(countdownSeconds / 60);
  const s = countdownSeconds % 60;
  el.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// Tick local countdown every second
setInterval(() => {
  if (countdownSeconds > 0) {
    countdownSeconds--;
    updateCountdownDisplay();

  } else {
    // Time = 0: popup + wheel animation
    syncWithServerTimer();
    updateWinningNumbers(); // uses prefetchedResult if available
    updateDashboardHistory();
    const username = sessionStorage.getItem('username');
    if (username) updateBalanceFromServer(username);
  }

  // Reload triggers at start of new cycle — lekin sirf jab popup na dikha raha ho AUR koi modal open na ho
  const anyOpen = Array.from(document.querySelectorAll('.modal-overlay')).some(m => m.style.display === 'flex');
  if ((countdownSeconds === 299 || countdownSeconds === 297) && !anyOpen) {
    location.reload();
  }

  // Hit API at specific intervals for accuracy: 100, 200, 300
  if ([100, 200, 300].includes(countdownSeconds)) {
    syncWithServerTimer();
  }
}, 1000);

// Sync with server every 30 seconds for general accuracy
setInterval(syncWithServerTimer, 30000);

/* 🔥 BACK / HISTORY FIX */
window.addEventListener("pageshow", function() {
  syncWithServerTimer();
  const username = sessionStorage.getItem('username');
  if (username) updateBalanceFromServer(username);
});

/* 🔥 TAB SWITCH FIX */
document.addEventListener("visibilitychange", function() {
  if (!document.hidden) {
    syncWithServerTimer();
    const username = sessionStorage.getItem('username');
    if (username) updateBalanceFromServer(username);
  }
});

function updateTime() {
  // Legacy function called by original code - redirect to sync if first call
  // Or just let the new intervals handle it.
}

/* ── Global State ─────────────────────────────────────────── */
let currentChipValue = 0;
let totalBetPoints = 0;
let selectedAdvanceTime = []; // Changed to array for multiple selection

// Satta Matka Sorting: 0 is considered the largest digit (value 10)
function sattaSort(a, b) {
  let v1 = parseInt(a) === 0 ? 10 : parseInt(a);
  let v2 = parseInt(b) === 0 ? 10 : parseInt(b);
  return v1 - v2;
}

/* ── FP & CP Logic State ─────────────────────────────────────────── */
let isFPOn = false;
let currentFPFamily = [];
const fpCorners = [0, 5, 50, 55]; // Last two digits

let isCPOn = false;
let currentCPFamily = [];

/**
 * CP (Cycle Pana) Logic: Returns a family of 10 panas sharing the same CP pair.
 * Based on Dpboss logic: CP is any two digits of a Pana. 
 * We use the first two digits of the clicked Pana as the CP pair.
 */
function getCPFamily(baseNum) {
  const s = String(baseNum).padStart(3, '0');
  const d1 = parseInt(s[0]);
  const d2 = parseInt(s[1]);
  
  const family = [];
  for (let z = 0; z <= 9; z++) {
    const sorted = [d1, d2, z].sort(sattaSort);
    family.push(sorted.join(''));
  }
  return [...new Set(family)]; 
}

/**
 * Returns the family of numbers based on mirror and transpose logic (FP)
 */
function getFPFamily(baseNum) {
  const num = parseInt(baseNum);
  if (isNaN(num)) return [baseNum];

  const rangeStart = Math.floor(num / 100) * 100;
  const n = num % 100;
  const r = Math.floor(n / 10);
  const c = n % 10;

  const rBase = r % 5;
  const cBase = c % 5;
  const family = [];

  // Standard 4-number mirror set
  family.push(rangeStart + (rBase * 10) + cBase);
  family.push(rangeStart + (rBase * 10) + cBase + 5);
  family.push(rangeStart + ((rBase + 5) * 10) + cBase);
  family.push(rangeStart + ((rBase + 5) * 10) + cBase + 5);

  // Transposed set if rBase != cBase
  if (rBase !== cBase) {
    family.push(rangeStart + (cBase * 10) + rBase);
    family.push(rangeStart + (cBase * 10) + rBase + 5);
    family.push(rangeStart + ((cBase + 5) * 10) + rBase);
    family.push(rangeStart + ((cBase + 5) * 10) + rBase + 5);
  }

  // Handle cross-grid mirrors if needed? 
  // In the original game, it seemed to stay within the same 100-range.
  // We'll keep it within the 100-range (rangeStart).
  
  return [...new Set(family)]; // Unique numbers only
}

/**
 * Highlights FP/CP corners and the currently focused family
 */
function updateModeVisuals() {
  const allElements = document.querySelectorAll('.grid-item, .header-cell');
  
  allElements.forEach(el => {
    const numEl = el.querySelector('.item-num, .header-num');
    if (!numEl) return;
    
    const numStr = numEl.textContent;
    const num = parseInt(numStr);
    const lastTwo = num % 100;
    
    // Reset classes
    el.classList.remove('fp-corner', 'fp-family', 'cp-family');
    
    if (isFPOn) {
      if (currentFPFamily.includes(num)) {
        el.classList.add('fp-family');
      } else if (fpCorners.includes(lastTwo) && currentFPFamily.length === 0) {
        el.classList.add('fp-corner');
      }
    } else if (isCPOn) {
      const sNum = numStr.split('').sort(sattaSort).join('');
      if (currentCPFamily.includes(sNum)) {
        el.classList.add('cp-family');
      }
    }
  });
}

// Cache for faster lookups
let elementCache = null;

function findElementByNum(num) {
  if (!elementCache) {
    elementCache = {};
    const all = document.querySelectorAll('.grid-item, .header-cell');
    all.forEach(el => {
      const nEl = el.querySelector('.item-num, .header-num');
      if (nEl) elementCache[parseInt(nEl.textContent)] = el;
    });
  }
  return elementCache[parseInt(num)] || null;
}

function updateTotalBetPoints(amount) {
  totalBetPoints += amount;
  refreshTotalDisplay();
}

/**
 * Updates the footer display with (Grid Points * Selected Draws)
 */
function refreshTotalDisplay() {
  const drawMultiplier = selectedAdvanceTime.length > 0 ? selectedAdvanceTime.length : 1;
  const displayTotal = totalBetPoints * drawMultiplier;

  const betPtsEl = document.querySelector('.points-bar .points-section:nth-child(2) span:last-child');
  if (betPtsEl) {
    betPtsEl.textContent = displayTotal;
  }
}

/* ── Grid Builder ───────────────────────────────────────────── */
function generateGrid(containerId, rows, headerNums, numList) {
  elementCache = null; // Clear cache for new grid
  const container = document.getElementById(containerId);
  if (!container) return;

  const header = document.createElement('div');
  header.className = 'grid-header';
  headerNums.forEach(num => {
    const cell = document.createElement('div');
    cell.className = 'header-cell';
    cell.innerHTML = `
      <span class="header-num">${num}</span>
      <span class="item-pts"></span>
    `;

    cell.addEventListener('click', (e) => {
      highlightSidebar('.akdax');
      if (isFPOn) {
        const family = getFPFamily(num);
        currentFPFamily = family;
        family.forEach(fNum => {
          const item = findElementByNum(fNum);
          if (item) handlePointAdjustment(item, currentChipValue);
        });
        updateModeVisuals();
      } else if (isCPOn) {
        const family = getCPFamily(num);
        currentCPFamily = family;
        family.forEach(fNum => {
          const item = findElementByNum(fNum);
          if (item) handlePointAdjustment(item, currentChipValue);
        });
        updateModeVisuals();
      } else {
        handlePointAdjustment(cell, currentChipValue);
      }
    });

    cell.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      highlightSidebar('.akdax');
      if (isFPOn) {
        const family = getFPFamily(num);
        currentFPFamily = family;
        family.forEach(fNum => {
          const item = findElementByNum(fNum);
          if (item) handlePointAdjustment(item, -currentChipValue);
        });
        updateModeVisuals();
      } else if (isCPOn) {
        const family = getCPFamily(num);
        currentCPFamily = family;
        family.forEach(fNum => {
          const item = findElementByNum(fNum);
          if (item) handlePointAdjustment(item, -currentChipValue);
        });
        updateModeVisuals();
      } else {
        handlePointAdjustment(cell, -currentChipValue);
      }
    });

    header.appendChild(cell);
  });
  container.appendChild(header);
  container.appendChild(buildDivider(true, 'SP', containerId)); // Restore triangles

  const column = document.createElement('div');
  column.className = 'grid-column';

  const total = rows * 5;

  for (let i = 0; i < total; i++) {
    if (i === 60) {
      const wrap = document.createElement('div');
      wrap.className = 'full-width-divider';
      wrap.appendChild(buildDivider(true, 'DP', containerId)); // Restore triangles
      column.appendChild(wrap);
    }
    if (i === total - 5) {
      const wrap = document.createElement('div');
      wrap.className = 'full-width-divider';
      wrap.appendChild(buildDivider(false, 'TRIPLE', containerId)); // Removed individual triangles
      column.appendChild(wrap);
    }

    const item = document.createElement('div');
    item.className = 'grid-item';
    const num = numList[i];
    item.innerHTML = `<span class="item-num">${num}</span><span class="item-pts"></span>`;

    // Determine type for sidebar feedback
    const type = getPanaType(num);
    item.setAttribute('data-type', type);

    item.addEventListener('click', (e) => {
      const sidebarClass = type === 'TRIPLE' ? '.title2' : (type === 'DP' ? '.title' : '.title1');
      highlightSidebar(sidebarClass);
      if (isFPOn) {
        const family = getFPFamily(num);
        currentFPFamily = family;
        family.forEach(fNum => {
          const fItem = findElementByNum(fNum);
          if (fItem) handlePointAdjustment(fItem, currentChipValue);
        });
        updateModeVisuals();
      } else if (isCPOn) {
        const family = getCPFamily(num);
        currentCPFamily = family;
        family.forEach(fNum => {
          const fItem = findElementByNum(fNum);
          if (fItem) handlePointAdjustment(fItem, currentChipValue);
        });
        updateModeVisuals();
      } else {
        handlePointAdjustment(item, currentChipValue);
      }
    });

    item.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      const sidebarClass = type === 'TRIPLE' ? '.title2' : (type === 'DP' ? '.title' : '.title1');
      highlightSidebar(sidebarClass);
      if (isFPOn) {
        const family = getFPFamily(num);
        currentFPFamily = family;
        family.forEach(fNum => {
          const fItem = findElementByNum(fNum);
          if (fItem) handlePointAdjustment(fItem, -currentChipValue);
        });
        updateModeVisuals();
      } else if (isCPOn) {
        const family = getCPFamily(num);
        currentCPFamily = family;
        family.forEach(fNum => {
          const fItem = findElementByNum(fNum);
          if (fItem) handlePointAdjustment(fItem, -currentChipValue);
        });
        updateModeVisuals();
      } else {
        handlePointAdjustment(item, -currentChipValue);
      }
    });

    column.appendChild(item);
  }

  container.appendChild(column);
}

function getPanaType(num) {
  if (num === "000") return 'TRIPLE';
  const s = String(num);
  if (s.length !== 3) return 'SP';
  const digits = s.split('').sort();
  if (digits[0] === digits[1] && digits[1] === digits[2]) return 'TRIPLE';
  if (digits[0] === digits[1] || digits[1] === digits[2]) return 'DP';
  return 'SP';
}

function highlightSidebar(selector) {
  document.querySelectorAll('.sidebar-btn').forEach(b => b.style.outline = '');
  const target = document.querySelector(`.right-sidebar ${selector}`);
  if (target) {
    target.style.outline = `2px solid #f0b344`;
  }
}

/**
 * Shared logic for adding/subtracting points
 * @param {HTMLElement} el The cell element
 * @param {number} amount Amount to add (positive) or subtract (negative)
 */
function handlePointAdjustment(el, amount) {
  const ptsEl = el.querySelector('.item-pts');
  if (!ptsEl) return;

  if (currentChipValue > 0) {
    let currentPts = parseInt(ptsEl.textContent) || 0;
    let newPts = currentPts + amount;

    // Prevent negative points on a cell
    if (newPts < 0) {
      // If we are subtracting and it goes below 0, just reduce the total by whatever was left
      if (currentPts > 0) {
        updateTotalBetPoints(-currentPts);
      }
      ptsEl.textContent = '';
      el.classList.remove('selected');
    } else if (newPts === 0) {
      updateTotalBetPoints(amount);
      ptsEl.textContent = '';
      el.classList.remove('selected');
    } else {
      updateTotalBetPoints(amount);
      ptsEl.textContent = newPts;
      el.classList.add('selected');
    }
  } else if (amount > 0) {
    // Regular toggle if no chip selected
    el.classList.toggle('selected');
  }
}

/* ── Divider factory ─────────────────────────────────────────── */
/* ── Divider factory ─────────────────────────────────────────── */
function buildDivider(withPointers, title, containerId) {
  const div = document.createElement('div');
  div.className = 'divider-line';

  /* Removed labels SP/DP/TRIPLE as requested */
  /*
  if (title) {
    const label = document.createElement('span');
    label.className = 'divider-label';
    label.textContent = title;
    div.appendChild(label);
  }
  */

  if (withPointers) {
    const wrap = document.createElement('div');
    wrap.className = 'pointer-row';
    for (let i = 0; i < 5; i++) {
      const p = document.createElement('div');
      p.className = 'pointer-tri';
      p.setAttribute('data-col', i);
      p.setAttribute('data-grid', containerId);

      p.addEventListener('click', () => {
        selectColumnInGrid(containerId, i, title, currentChipValue);
      });

      p.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        selectColumnInGrid(containerId, i, title, -currentChipValue);
      });

      wrap.appendChild(p);
    }
    div.appendChild(wrap);
  }
  return div;
}

/* ── Vertical Pointer Bar ────────────────────────────────────── */
function generateVerticalPointers(containerId) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = '';

  // 1. Header Segment (matches .grid-header)
  const headerPtr = document.createElement('div');
  headerPtr.className = 'ptr ptr-header'; // Re-added 'ptr' to show triangle icon
  headerPtr.setAttribute('data-row', 0);
  headerPtr.addEventListener('click', () => selectRowInBothGrids(0, currentChipValue));
  headerPtr.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    selectRowInBothGrids(0, -currentChipValue);
  });
  el.appendChild(headerPtr);

  // 2. SP Divider (matches the one BEFORE the grid-column)
  const spSpacer = document.createElement('div');
  spSpacer.className = 'ptr-spacer';
  el.appendChild(spSpacer);

  // 3. Body Segment (matches .grid-column)
  const body = document.createElement('div');
  body.className = 'ptr-body';

  // Section 1: 12 SP Rows
  for (let i = 0; i < 12; i++) {
    const p = document.createElement('div');
    p.className = 'ptr';
    p.setAttribute('data-row', i + 1);
    p.addEventListener('click', () => selectRowInBothGrids(i + 1, currentChipValue));
    p.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      selectRowInBothGrids(i + 1, -currentChipValue);
    });
    body.appendChild(p);
  }

  // Divider between SP and DP (matches i=60 in generateGrid)
  const dpSpacer = document.createElement('div');
  dpSpacer.className = 'ptr-spacer';
  body.appendChild(dpSpacer);

  // Section 2: 9 DP Rows
  for (let i = 0; i < 9; i++) {
    const p = document.createElement('div');
    p.className = 'ptr';
    p.setAttribute('data-row', 13 + i);
    p.addEventListener('click', () => selectRowInBothGrids(13 + i, currentChipValue));
    p.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      selectRowInBothGrids(13 + i, -currentChipValue);
    });
    body.appendChild(p);
  }

  // Divider between DP and Triple (matches i=total-5)
  const tripleSpacer = document.createElement('div');
  tripleSpacer.className = 'ptr-spacer';
  body.appendChild(tripleSpacer);

  // Section 3: 1 Triple Row
  const tPtr = document.createElement('div');
  tPtr.className = 'ptr';
  tPtr.setAttribute('data-row', 22);
  tPtr.addEventListener('click', () => selectRowInBothGrids(22, currentChipValue));
  tPtr.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    selectRowInBothGrids(22, -currentChipValue);
  });
  body.appendChild(tPtr);

  el.appendChild(body);
}

/* ── Select entire COLUMN in a grid (Section-Aware) ─────────── */
function selectColumnInGrid(gridId, colIndex, sectionTitle, amount) {
  const container = document.getElementById(gridId);
  if (!container) return;

  const sidebarClass = sectionTitle === 'TRIPLE' ? '.title2' : (sectionTitle === 'DP' ? '.title' : '.title1');
  highlightSidebar(sidebarClass);

  const allItems = container.querySelectorAll('.grid-column > .grid-item');
  const columnItems = [];

  allItems.forEach((item, idx) => {
    if (idx % 5 === colIndex) {
      const rowIndex = Math.floor(idx / 5);
      let inSection = false;

      // SP: Rows 0-11, DP: Rows 12-20, TRIPLE: Row 21
      if (sectionTitle === 'SP') inSection = (rowIndex >= 0 && rowIndex <= 11);
      else if (sectionTitle === 'DP') inSection = (rowIndex >= 12 && rowIndex <= 20);
      else if (sectionTitle === 'TRIPLE') inSection = (rowIndex === 21);
      else inSection = true;

      if (inSection) columnItems.push(item);
    }
  });

  columnItems.forEach(item => {
    handlePointAdjustment(item, amount);
  });
}

/* ── Select entire ROW across both grids ─────────────────────── */
function selectRowInBothGrids(rowIndex, amount) {
  if (rowIndex === 0) {
    ['left-grid', 'right-grid'].forEach(gridId => {
      selectHeaderRowInGrid(gridId, amount);
    });
  } else {
    ['left-grid', 'right-grid'].forEach(gridId => {
      selectRowInGrid(gridId, rowIndex - 1, amount);
    });
  }
}

function selectHeaderRowInGrid(gridId, amount) {
  const container = document.getElementById(gridId);
  if (!container) return;
  const headerCells = container.querySelectorAll('.grid-header .header-cell');

  headerCells.forEach(cell => {
    handlePointAdjustment(cell, amount);
  });
}

function selectRowInGrid(gridId, rowIndex, amount) {
  const container = document.getElementById(gridId);
  if (!container) return;
  const allItems = container.querySelectorAll('.grid-column > .grid-item');
  const startIdx = rowIndex * 5;
  const rowItems = [];
  for (let i = startIdx; i < startIdx + 5 && i < allItems.length; i++) {
    rowItems.push(allItems[i]);
  }

  rowItems.forEach(item => {
    handlePointAdjustment(item, amount);
  });
}

/* ── Select entire SECTION across both grids ──────────────────── */
function selectSectionInBothGrids(sectionType, amount) {
  ['left-grid', 'right-grid'].forEach(gridId => {
    const container = document.getElementById(gridId);
    if (!container) return;
    const allItems = container.querySelectorAll('.grid-column > .grid-item');
    allItems.forEach(item => {
      if (item.getAttribute('data-type') === sectionType) {
        handlePointAdjustment(item, amount);
      }
    });
  });
}

/* ── Chip Selection ──────────────────────────────────────────── */
function initChips() {
  const chips = document.querySelectorAll('.chip');
  chips.forEach(chip => {
    chip.addEventListener('click', () => {
      chips.forEach(c => c.classList.remove('selected'));
      chip.classList.add('selected');

      const valText = chip.querySelector('span').textContent;
      if (valText.toLowerCase().includes('k')) {
        currentChipValue = parseInt(valText) * 1000;
      } else {
        currentChipValue = parseInt(valText);
      }
    });
  });
}

/* ── Action Buttons ──────────────────────────────────────────── */
function initActionButtons() {

  document.querySelectorAll('.action-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const label = btn.title ? btn.title.toUpperCase() : '';
      console.log('Action Clicked:', label, btn.className);

      if (btn.classList.contains('clear')) {
        console.log('Clearing ALL bets...');
        clearAllBets();
      } else if (btn.classList.contains('buy')) {
        handleBuy();
      } else {
        console.log(`[${label}] functional trigger`);
      }
    });
  });
}

function clearAllBets() {
  document.querySelectorAll('.grid-item.selected, .header-cell.selected').forEach(el => {
    el.classList.remove('selected');
    const ptsEl = el.querySelector('.item-pts');
    if (ptsEl) ptsEl.textContent = '';
  });
  totalBetPoints = 0;
  updateTotalBetPoints(0);
  refreshTotalDisplay();

  const bc = document.querySelector('.barcode-input');
  if (bc) bc.value = '';
}

/**
 * Collect bets from the grid and call the placement API
 */
async function handleBuy() {
  const selectedItems = document.querySelectorAll('.grid-item.selected, .header-cell.selected');
  if (selectedItems.length === 0) {
    alert('Please select at least one number to place a bet.');
    return;
  }

  const username = sessionStorage.getItem('username');
  if (!username) {
    alert('User not logged in. Please login first.');
    window.location.href = '../index.html';
    return;
  }

  let totalAmount = 0;
  const betStrings = [];

  selectedItems.forEach(el => {
    const numEl = el.querySelector('.item-num, .header-num');
    const ptsEl = el.querySelector('.item-pts');
    if (numEl && ptsEl) {
      const num = numEl.textContent.trim();
      const pts = parseInt(ptsEl.textContent) || 0;
      if (pts > 0) {
        betStrings.push(`${num}X${pts}`);
        totalAmount += pts;
      }
    }
  });

  const payload = {
    username: username,
    all_datas12: betStrings.join(','),
    total_load_c_amount: totalBetPoints * (selectedAdvanceTime.length > 0 ? selectedAdvanceTime.length : 1),
    total_load_c_qty: 0,
    advancr_draw_time: selectedAdvanceTime.join(',') // Join multiple times with comma
  };

  const buyBtn = document.querySelector('.action-btn.buy');
  if (buyBtn) buyBtn.disabled = true;

  try {
    const result = await window.GWinAPI.placeBet(payload);
    if (result.status) {
      // alert(`Bet placed successfully!\nBarcode: ${result.barcodes[0]}\nDraw Time: ${result.drawtimes[0]}`);

      // Clear grid on success
      document.querySelectorAll('.grid-item.selected, .header-cell.selected').forEach(el => {
        el.classList.remove('selected');
        const ptsEl = el.querySelector('.item-pts');
        if (ptsEl) ptsEl.textContent = '';
      });
      totalBetPoints = 0;
      updateTotalBetPoints(0);

      // Update balance
      updateBalanceFromServer(username);
      updateLastDrawDetails(username);

      if (result.barcodes && result.barcodes.length > 0) {
        const lastTranIdEl = document.getElementById('last-tran-id');
        const centerTranIdEl = document.querySelector('.tran-id');
        if (lastTranIdEl) lastTranIdEl.textContent = result.barcodes[0];
        if (centerTranIdEl) centerTranIdEl.textContent = `Tran Id: ${result.barcodes[0]}`;

        // Print all barcodes at once in a single window
        printCustomTicket(username, result.barcodes);
      }

      // Reset advance draw selections
      selectedAdvanceTime = [];
      const advanceContainer = document.getElementById('advance-slots-container');
      if (advanceContainer) {
        advanceContainer.querySelectorAll('.slot-item').forEach(s => {
          s.classList.remove('selected');
          const cb = s.querySelector('input[type="checkbox"]');
          if (cb) cb.checked = false;
        });
      }
      if (advCountBadge) advCountBadge.textContent = '0';

    } else {
      alert('Failed to place bet: ' + (result.message || 'Unknown error'));
    }
  } catch (err) {
    console.error('Error placing bet:', err);
    alert('Network error while placing bet. Please try again.');
  } finally {
    if (buyBtn) buyBtn.disabled = false;
  }
}

/* ── Sidebar Button Highlight ────────────────────────────────── */
function initSidebar() {
  // Make the entire box clickable for SP, DP, and Triple
  const boxSelectors = [
    { box: '.sp-items', target: '.title1' },
    { box: '.dp-items', target: '.title' },
    { box: '.triple-items', target: '.title2' }
  ];

  boxSelectors.forEach(cfg => {
    const boxEl = document.querySelector(cfg.box);
    if (boxEl) {
      boxEl.style.cursor = 'pointer';
      boxEl.addEventListener('click', (e) => {
        // If the user clicked the box background (not a button directly), trigger the main button
        if (!e.target.closest('.sidebar-btn')) {
          const btn = boxEl.querySelector(cfg.target);
          if (btn) btn.click();
        }
      });

      // Right-click support for the whole box
      boxEl.addEventListener('contextmenu', (e) => {
        if (!e.target.closest('.sidebar-btn')) {
          e.preventDefault();
          const btn = boxEl.querySelector(cfg.target);
          if (btn) {
            const event = new MouseEvent('contextmenu', {
              bubbles: true,
              cancelable: true,
              view: window,
              button: 2
            });
            btn.dispatchEvent(event);
          }
        }
      });
    }
  });

  document.querySelectorAll('.sidebar-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      // Find a identifying class to pass to highlightSidebar
      const cls = Array.from(btn.classList).find(c => c !== 'sidebar-btn');
      if (cls) {
        highlightSidebar(`.${cls}`);
      }

      // SPECIAL: Clicking "AKdaX9" (akdax) selects all Header items
      if (btn.classList.contains('akdax')) {
        selectRowInBothGrids(0, currentChipValue);
      }

      // SPECIAL: Clicking "TripleX10" (title2) selects all Triple items
      if (btn.classList.contains('title2')) {
        selectRowInBothGrids(22, currentChipValue);
      }

      // Bulk Select SP
      if (btn.classList.contains('title1')) {
        selectSectionInBothGrids('SP', currentChipValue);
      }

      // Bulk Select DP
      if (btn.classList.contains('title')) {
        selectSectionInBothGrids('DP', currentChipValue);
      }
    });

    // Add right-click support to specific sidebar buttons
    btn.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      if (btn.classList.contains('akdax')) {
        selectRowInBothGrids(0, -currentChipValue);
      }
      if (btn.classList.contains('title2')) {
        selectRowInBothGrids(22, -currentChipValue);
      }
      if (btn.classList.contains('title1')) {
        selectSectionInBothGrids('SP', -currentChipValue);
      }
      if (btn.classList.contains('title')) {
        selectSectionInBothGrids('DP', -currentChipValue);
      }
    });
  });
}

/* ── F12 → focus barcode input ───────────────────────────────── */
/* ── F12 → focus barcode input ───────────────────────────────── */
function initFPAndCP() {
  const fpBtn = document.getElementById('fp-logic-btn');
  const cpBtn = document.querySelector('.action-btn.cp'); // Restored original selector

  if (fpBtn) {
    fpBtn.addEventListener('click', () => {
      isFPOn = !isFPOn;
      if (isFPOn) isCPOn = false; 
      fpBtn.classList.toggle('active', isFPOn);
      if (cpBtn) cpBtn.classList.remove('active');
      
      currentFPFamily = [];
      currentCPFamily = [];
      updateModeVisuals();
    });
  }

  if (cpBtn) {
    cpBtn.addEventListener('click', () => {
      isCPOn = !isCPOn;
      if (isCPOn) isFPOn = false; 
      cpBtn.classList.toggle('active', isCPOn); // Using .active to show high-gloss highlight
      if (fpBtn) fpBtn.classList.remove('active');
      
      currentFPFamily = [];
      currentCPFamily = [];
      updateModeVisuals();
    });
  }
}

/* ── Mobile Grid Toggle ──────────────────────────────────────── */
function initMobileGridToggle() {
  const leftBtn = document.getElementById('toggle-left-grid');
  const rightBtn = document.getElementById('toggle-right-grid');
  const leftWrap = document.getElementById('left-grid-wrapper');
  const rightWrap = document.getElementById('right-grid-wrapper');

  if (!leftBtn || !rightBtn) return;

  leftBtn.addEventListener('click', () => {
    const isOpen = leftWrap.classList.toggle('open');
    leftBtn.classList.toggle('active', isOpen);
    leftBtn.textContent = isOpen ? '▲ Hide Left Grid' : '▼ Left Grid (100–229)';
    // Close right if opening left
    if (isOpen && rightWrap.classList.contains('open')) {
      rightWrap.classList.remove('open');
      rightBtn.classList.remove('active');
      rightBtn.textContent = '▼ Right Grid (400–529)';
    }
  });

  rightBtn.addEventListener('click', () => {
    const isOpen = rightWrap.classList.toggle('open');
    rightBtn.classList.toggle('active', isOpen);
    rightBtn.textContent = isOpen ? '▲ Hide Right Grid' : '▼ Right Grid (400–529)';
    if (isOpen && leftWrap.classList.contains('open')) {
      leftWrap.classList.remove('open');
      leftBtn.classList.remove('active');
      leftBtn.textContent = '▼ Left Grid (100–229)';
    }
  });
}

/* ── Responsive Layout Manager ───────────────────────────────── */
function initResponsiveLayout() {
  const isMobile = () => window.innerWidth <= 767;

  function applyLayout() {
    const mainLayout = document.querySelector('.main-layout');
    if (!mainLayout) return;

    if (isMobile()) {
      // Ensure the wrappers exist and are structured for mobile
      const leftGrid = document.getElementById('left-grid');
      const rightGrid = document.getElementById('right-grid');

      if (leftGrid && !leftGrid.closest('.left-grid-wrapper')) {
        const wrap = document.createElement('div');
        wrap.className = 'panel grid-panel left-grid-wrapper';
        wrap.id = 'left-grid-wrapper';
        leftGrid.parentNode.insertBefore(wrap, leftGrid);
        wrap.appendChild(leftGrid);
      }
      if (rightGrid && !rightGrid.closest('.right-grid-wrapper')) {
        const wrap = document.createElement('div');
        wrap.className = 'panel grid-panel right-grid-wrapper';
        wrap.id = 'right-grid-wrapper';
        rightGrid.parentNode.insertBefore(wrap, rightGrid);
        wrap.appendChild(rightGrid);
      }
    }
  }

  applyLayout();
  window.addEventListener('resize', applyLayout);
}

/* ── Bootstrap ───────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', async () => {
  console.log('DOM Loaded. Initializing session...');

  // Debug helper to check storage
  const storedUser = sessionStorage.getItem('username');
  const storedBalance = sessionStorage.getItem('balance');
  console.log('Storage Check:', { storedUser, storedBalance });

  if (!storedUser) {
    console.warn('No active session found. Redirecting to login.');
    window.location.href = '../index.html';
    return;
  }

  if (storedUser) {
    const userIdEl = document.querySelector('.player-id');
    const pointsEl = document.getElementById('user-points');
    if (userIdEl) userIdEl.textContent = sessionStorage.getItem('user_id') || 'Unknown';
    if (pointsEl) pointsEl.textContent = Math.floor(parseFloat(storedBalance || 0));

    // Attempt live refresh
    if (window.GWinAPI) {
      updateBalanceFromServer(storedUser);
      setInterval(() => updateBalanceFromServer(storedUser), 30000);
    } else {
      console.warn('GWinAPI not available yet');
    }
  }

  const leftData = [
    128, 129, 120, 130, 140, 137, 138, 139, 149, 159, 146, 147, 148, 158, 168, 236, 156, 157, 167, 230,
    245, 237, 238, 239, 249, 290, 246, 247, 248, 258, 380, 345, 256, 257, 267, 470, 390, 346, 347, 348,
    489, 480, 490, 356, 357, 560, 570, 580, 590, 456, 579, 589, 670, 680, 690, 678, 679, 689, 789, 780,
    100, 110, 166, 112, 113, 119, 200, 229, 220, 122, 155, 228, 300, 266, 177, 227, 255, 337, 338, 339,
    335, 336, 355, 400, 366, 344, 499, 445, 446, 447, 399, 660, 599, 455, 500, 588, 688, 779, 699, 799,
    669, 778, 788, 770, 889, 777, 444, 111, 888, 555
  ];
  const rightData = [
    123, 124, 125, 126, 127, 150, 160, 134, 135, 136, 169, 179, 170, 180, 145, 178, 250, 189, 234, 190,
    240, 269, 260, 270, 235, 259, 278, 279, 289, 280, 268, 340, 350, 360, 370, 349, 359, 369, 379, 389,
    358, 368, 378, 450, 460, 367, 458, 459, 469, 479, 457, 467, 468, 478, 569, 790, 890, 567, 568, 578,
    114, 115, 116, 117, 118, 277, 133, 224, 144, 226, 330, 188, 233, 199, 244, 448, 223, 288, 225, 299,
    466, 377, 440, 388, 334, 556, 449, 477, 559, 488, 600, 557, 558, 577, 550, 880, 566, 800, 667, 668,
    899, 700, 990, 900, 677, 222, 999, 666, 333, "000"
  ];

  generateGrid('left-grid', 22, [1, 2, 3, 4, 5], leftData);
  generateGrid('right-grid', 22, [6, 7, 8, 9, 0], rightData);
  generateVerticalPointers('right-pointers');

  initChips();
  // Set default chip selection to '1'
  const firstChip = document.querySelector('.chip');
  if (firstChip) {
    firstChip.classList.add('selected');
    currentChipValue = 1;
  }

  initActionButtons();
  initFPAndCP();
  initSidebar();
  initMobileGridToggle();
  await initResponsiveLayout();

  // 1. Initialize Slot Machine FIRST
  initSlotMachine();

  // 2. Initialize Timer and Fetch Results
  syncWithServerTimer();
  loadInitialResult(); // Refresh pe: sirf main reels update, no popup, no animation
  updateDashboardHistory(); // Load initial history on page load

  initLogout();
  initRefresh();
  initUserSession();

  // Recalibrate on resize to keep numbers centered
  window.addEventListener('resize', () => {
    setTimeout(() => {
      if (lastTargetNumbers) {
        spinWinningNumbers(lastTargetNumbers, true); // true = instant recalibrate
      }
    }, 100);
  });
});

/* ── Slot Machine Animation ───────────────────────────────────── */
const slotSymbols = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
const totalSlotSpins = 5;
let lastTargetNumbers = '890';

function initSlotMachine() {
  const reels = document.querySelectorAll('.digit-strip');
  reels.forEach(reel => {
    let html = '';
    // Duplicate symbols for smooth spinning
    for (let i = 0; i < totalSlotSpins + 2; i++) {
      slotSymbols.forEach(num => {
        html += `<span>${num}</span>`;
      });
    }
    reel.innerHTML = html;
    reel.style.transform = 'translateY(0px)';
  });
}

/**
 * Internal helper — spins a given set of reels to targetString digits
 */
function _applySpinToReels(reelSet, targetString, instant) {
  const digits = targetString.split('');
  const refReel = reelSet.find(r => r !== null && r !== undefined);
  if (!refReel) return;

  // Get symbol height from computed style or direct measurement
  const getSymbolHeight = (reel) => {
    const span = reel.querySelector('span');
    if (span && span.offsetHeight > 0) return span.offsetHeight;
    
    // Fallback to CSS variable if hidden
    const style = getComputedStyle(reel.closest('.big-display'));
    const varH = style.getPropertyValue('--reel-inner-h');
    if (varH) {
      if (varH.includes('px')) return parseFloat(varH);
      // If it's a clamp or calc, we need a temporary measurement or reasonable fallback
    }
    
    // Last resort fallback based on common design
    return 100; 
  };

  const symbolHeight = getSymbolHeight(refReel);
  const mainH = 100; // Legacy unused

  reelSet.forEach((reel, index) => {
    if (!reel) return;
    const targetDigit = parseInt(digits[index]) || 0;
    const offset = (totalSlotSpins * slotSymbols.length + targetDigit) * symbolHeight;

    if (instant) {
      reel.style.transition = 'none';
      reel.style.transform = `translateY(-${offset}px)`;
    } else {
      const duration = 2.5 + (index * 0.4) + (Math.random() * 0.3);
      reel.style.transition = 'none';
      reel.style.transform = 'translateY(0px)';
      void reel.offsetHeight; // force reflow
      setTimeout(() => {
        reel.style.transition = `transform ${duration}s cubic-bezier(0.15, 0.85, 0.35, 1)`;
        reel.style.transform = `translateY(-${offset}px)`;
      }, 50);
    }
  });
}

/**
 * Main display reels — instant snap (no scroll on main screen)
 */
function spinWinningNumbers(targetString, instant = false) {
  lastTargetNumbers = targetString;
  const mainReels = [
    document.getElementById('reel-1'),
    document.getElementById('reel-2'),
    document.getElementById('reel-3')
  ];
  _applySpinToReels(mainReels, targetString, instant);
}

/**
 * Popup reels only — scroll animation (ek hi baar, sirf popup pe)
 */
function spinPopupReels(targetString) {
  const popupReels = [
    document.getElementById('popup-reel-1'),
    document.getElementById('popup-reel-2'),
    document.getElementById('popup-reel-3')
  ];
  _applySpinToReels(popupReels, targetString, false);
}


/* --- Reprint Modal Logic --- */
const reprintBtn = document.querySelector('.action-btn.reprint');
const reprintModal = document.getElementById('reprint-modal');

/* winning modal close */
const winModal = document.getElementById('winning-modal');
const closeWinBtn = document.getElementById('close-winning');
const winOkBtn = document.getElementById('winning-ok-btn');

if (closeWinBtn) closeWinBtn.addEventListener('click', () => { winModal.style.display = 'none'; });
if (winOkBtn) winOkBtn.addEventListener('click', () => { winModal.style.display = 'none'; });

async function loadReprintTickets() {
  const tbody = document.getElementById('reprint-tbody');
  if (!tbody) return;

  tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:16px;color:#555;">Loading...</td></tr>';

  const username = sessionStorage.getItem('username');
  if (!username) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:16px;color:#555;">Please login first.</td></tr>';
    return;
  }

  try {
    // Aaj ki date auto-set karke getBetHistory call karo
    const today = new Date().toISOString().split('T')[0];
    const result = await window.GWinAPI.getBetHistory(username, today);

    if (result && result.tickets && result.tickets.length > 0) {
      tbody.innerHTML = '';
      result.tickets.forEach(ticket => {
        const isActive = String(ticket.claim_status) === '0';
        const statusText = isActive ? 'Active' : 'Not Active';
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td><input type="checkbox" class="rp-check" data-barcode="${ticket.barcode}"></td>
          <td>${ticket.bet_time || '--'}</td>
          <td>${ticket.barcode || '--'}</td>
          <td>${ticket.barcode || '--'}</td>
          <td>${ticket.amount !== undefined ? ticket.amount : '--'}</td>
          <td>${statusText}</td>
        `;
        tbody.appendChild(tr);
      });
    } else {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:16px;color:#555;">No tickets found.</td></tr>';
    }
  } catch (err) {
    console.error('Reprint load error:', err);
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:16px;color:#555;">Error loading tickets.</td></tr>';
  }
}

// Open reprint modal
reprintBtn.addEventListener('click', () => {
  reprintModal.style.display = 'flex';
  loadReprintTickets();
});

// PRINT selected tickets
document.getElementById('rp-print-btn').addEventListener('click', () => {
  const username = sessionStorage.getItem('username');
  const checked = document.querySelectorAll('.rp-check:checked');
  if (checked.length === 0) {
    alert('Please select at least one ticket to print.');
    return;
  }
  const barcodes = Array.from(checked).map(cb => cb.getAttribute('data-barcode'));
  printCustomTicket(username, barcodes);
});

/* --- Smart Print Ticket Logic --- */
async function printCustomTicket(username, barcodes) {
  const barcodeList = Array.isArray(barcodes) ? barcodes.join(',') : barcodes;

  try {
    const data = await window.GWinAPI.getPrintTicketData(username, barcodeList);
    if (!data || !data.status || !data.tickets || data.tickets.length === 0) {
      alert("Could not load ticket data for printing.");
      return;
    }

    let allTicketsHtml = '';

    data.tickets.forEach((ticket, tIdx) => {
      // Build bet lines as "num*qty" groups of 3 per row separated by " | "
      const lines = ticket.bet_lines;
      let betRowsHtml = '';
      for (let i = 0; i < lines.length; i += 3) {
        const rowItems = [];
        for (let j = 0; j < 3; j++) {
          if (i + j < lines.length) {
            rowItems.push(`${lines[i + j].num}*${lines[i + j].qty}`);
          }
        }
        betRowsHtml += `<div class="bet-row">${rowItems.join(' | ')}</div>`;
      }

      const ticketHtml = `
        <div class="ticket" style="${tIdx > 0 ? 'page-break-before: always;' : ''}">
          <div class="t-brand">GwinP</div>
          <div class="t-amuse">[For Amusement Only]</div>
          <div class="t-info">NAME : ${ticket.username || '--'}</div>
          <div class="t-info">BARCODE : ${ticket.barcode || '--'}</div>
          <div class="t-info">Play Date : ${ticket.record_date || '--'}</div>
          <div class="t-info">Play Draw: ${ticket.draw_time || '--'}</div>
          <div class="t-section">METRO TIMER</div>
          <div class="bet-grid">${betRowsHtml}</div>
          <div class="t-total">Total Points: ${ticket.amount || '--'}</div>
          <div class="barcode-wrap">
            <img src="https://barcode.tec-it.com/barcode.ashx?data=${ticket.barcode}&code=Code128&dpi=96" alt="Barcode" />
            
          </div>
        </div>
      `;
      allTicketsHtml += ticketHtml;
    });

    const htmlContent = `
      <html>
      <head>
        <title>Print Tickets</title>
        <style>
          @media print {
            @page { size: 58mm auto; margin: 4mm; }
            body { margin: 0; padding: 0; }
          }
          body {
            font-family: 'Courier New', monospace;
            color: #000;
            font-size: 11px;
            margin: 0;
            padding: 0;
            background: #fff;
          }
          .ticket {
            width: 200px;
            margin: 0 auto;
            padding: 6px 4px 10px;
            text-align: center;
          }
          .t-brand {
            font-size: 18px;
            font-weight: bold;
            letter-spacing: 1px;
            margin-bottom: 1px;
          }
          .t-amuse {
            font-size: 10px;
            margin-bottom: 6px;
          }
          .t-info {
            text-align: center;
            font-size: 11px;
            line-height: 1.5;
          }
          .t-section {
            font-size: 12px;
            font-weight: bold;
            margin: 6px 0 4px;
            text-align: center;
          }
          .bet-grid {
            text-align: center;
          }
          .bet-row {
            font-size: 11px;
            line-height: 1.6;
          }
          .t-total {
            font-size: 12px;
            font-weight: bold;
            margin: 6px 0 4px;
            text-align: center;
          }
          .barcode-wrap {
            text-align: center;
            margin-top: 6px;
          }
          .barcode-wrap img {
            width: 180px;
            height: 50px;
          }
          .barcode-num {
            font-size: 11px;
            letter-spacing: 1px;
            margin-top: 2px;
          }
        </style>
      </head>
      <body>
        ${allTicketsHtml}
        <script>
          window.onload = function() {
            setTimeout(() => { window.print(); }, 400);
          }
        </script>
      </body>
      </html>
    `;

    // Direct Printing using hidden iframe
    let printFrame = document.getElementById('gw-print-frame');
    if (!printFrame) {
      printFrame = document.createElement('iframe');
      printFrame.id = 'gw-print-frame';
      printFrame.style.position = 'fixed';
      printFrame.style.right = '0';
      printFrame.style.bottom = '0';
      printFrame.style.width = '0';
      printFrame.style.height = '0';
      printFrame.style.border = '0';
      document.body.appendChild(printFrame);
    }

    const doc = printFrame.contentWindow.document;
    doc.open();
    doc.write(htmlContent);
    doc.close();

  } catch (err) {
    console.error("Print error:", err);
    alert("Failed to print ticket.");
  }
}

// close helpers
const hideModal = () => { reprintModal.style.display = 'none'; };

document.getElementById('close-reprint').addEventListener('click', hideModal);

window.addEventListener('click', (e) => {
  if (e.target === reprintModal) hideModal();
});


/* --- Cancle Model Logic --- */
const cancleBtn = document.querySelector('.action-btn.cancel');
const cancleModal = document.getElementById('cancel-modal');
const closeCancleBtn = document.getElementById('close-cancel');
const closeCancleFooter = document.getElementById('close-cancel-footer');

// Open
cancleBtn.addEventListener('click', async () => {
  cancleModal.style.display = 'flex';

  const listContainer = document.getElementById('cancel-list-container');
  if (listContainer) {
    listContainer.innerHTML = '<div style="color: #666; padding: 20px; text-align: center;">Loading tickets...</div>';
  }

  const username = sessionStorage.getItem('username');
  if (!username) {
    if (listContainer) listContainer.innerHTML = '<div style="color: #666; padding: 20px; text-align: center;">Please login first.</div>';
    return;
  }

  try {
    const result = await window.GWinAPI.getCurrentDrawHistory(username);
    if (result && result.tickets) {
      if (listContainer) {
        if (result.tickets.length === 0) {
          listContainer.innerHTML = '<div style="color: #666; padding: 20px; text-align: center;">No tickets found for current draws.</div>';
        } else {
          let tableHtml = `
            <table class="modal-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Barcode</th>
                  <th>Draw</th>
                  <th>Amount</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
          `;

          result.tickets.forEach(ticket => {
            tableHtml += `
                <tr>
                  <td style="color: rgba(0, 0, 0, 1); font-weight:800;">${ticket.bet_time || '--'}</td>
                  <td style="color: rgba(0, 0, 0, 1); font-weight:800;">${ticket.barcode || '--'}</td>
                  <td style="color: rgba(0, 0, 0, 1); font-weight:800;">${ticket.draw_times || '--'}</td>
                  <td style="color: rgba(0, 0, 0, 1); font-weight:800;">${ticket.amount !== undefined ? ticket.amount : '--'}</td>
                  <td><button class="cancel-row-btn" data-id="${ticket.id}">Cancel</button></td>
                </tr>
              `;
          });

          tableHtml += '</tbody></table>';
          listContainer.innerHTML = tableHtml;

          // Add event listeners for cancel buttons
          listContainer.querySelectorAll('.cancel-row-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
              const ticketId = e.target.getAttribute('data-id');
              if (confirm('Are you sure you want to cancel this ticket?')) {
                try {
                  const cancelResult = await window.GWinAPI.cancelTicket(ticketId);
                  if (cancelResult && cancelResult.status) {
                    alert('Ticket cancelled successfully.');
                    // Refresh the list after cancellation
                    cancleBtn.click();
                    // Update balance if cancellation returns points
                    updateBalanceFromServer(username);
                  } else {
                    alert('Failed to cancel ticket: ' + (cancelResult.message || 'Unknown error'));
                  }
                } catch (err) {
                  console.error('Cancel error:', err);
                  alert('Error cancelling ticket.');
                }
              }
            });
          });
        }
      }
    } else {
      if (listContainer) listContainer.innerHTML = '<div style="color: white; padding: 20px; text-align: center;">Failed to load history.</div>';
    }
  } catch (err) {
    console.error('Fetch history error:', err);
    if (listContainer) listContainer.innerHTML = '<div style="color: white; padding: 20px; text-align: center;">Error loading history.</div>';
  }
});

// close helpers
const hideCancleModal = () => { cancleModal.style.display = 'none'; };

closeCancleBtn.addEventListener('click', hideCancleModal);
closeCancleFooter.addEventListener('click', hideCancleModal);

window.addEventListener('click', (e) => {
  if (e.target === cancleModal) hideCancleModal();
});

/* ---Advance Modal Logic --- */
const advanceBtn = document.querySelector('.action-btn.advance');
const advanceModal = document.getElementById('advance-modal');
const closeAdvanceBtn = document.getElementById('close-advance');
const advanceCountInput = document.getElementById('advance-count-input');
const selectAllAdvanceBtn = document.getElementById('advance-select-all');
const advCountBadge = document.getElementById('adv-selected-count');

function updateAdvCountBadge() {
  if (advCountBadge) advCountBadge.textContent = selectedAdvanceTime.length;
}

function setSlotSelected(div, slot, isSelected) {
  const cb = div.querySelector('input[type="checkbox"]');
  if (isSelected) {
    div.classList.add('selected');
    if (cb) cb.checked = true;
    if (!selectedAdvanceTime.includes(slot)) selectedAdvanceTime.push(slot);
  } else {
    div.classList.remove('selected');
    if (cb) cb.checked = false;
    selectedAdvanceTime = selectedAdvanceTime.filter(s => s !== slot);
  }
}

// Enter Ad. Draw button — select by count input
if (selectAllAdvanceBtn) {
  selectAllAdvanceBtn.addEventListener('click', () => {
    const qty = parseInt(advanceCountInput ? advanceCountInput.value : 0) || 0;
    const slots = document.querySelectorAll('.slot-item');
    selectedAdvanceTime = [];
    slots.forEach((div, idx) => {
      const slot = div.getAttribute('data-slot');
      setSlotSelected(div, slot, idx < qty);
    });
    updateAdvCountBadge();
    refreshTotalDisplay();
  });
}

// Count input — auto select on Enter key
if (advanceCountInput) {
  advanceCountInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') selectAllAdvanceBtn && selectAllAdvanceBtn.click();
  });
}

// Open
advanceBtn.addEventListener('click', async () => {
  advanceModal.style.display = 'flex';
  if (advanceCountInput) advanceCountInput.value = '';

  const container = document.getElementById('advance-slots-container');
  if (container) {
    container.innerHTML = '<div style="color:#555; padding: 20px; text-align: center; grid-column: 1/-1;">Loading slots...</div>';
  }

  try {
    const result = await window.GWinAPI.getAdvanceDrawTimes();
    if (result && result.status && result.slots) {
      if (container) {
        container.innerHTML = '';
        result.slots.forEach(slot => {
          const div = document.createElement('div');
          div.className = 'slot-item';
          div.setAttribute('data-slot', slot);

          const cb = document.createElement('input');
          cb.type = 'checkbox';
          cb.tabIndex = -1;

          const label = document.createElement('span');
          label.textContent = slot;

          div.appendChild(cb);
          div.appendChild(label);

          if (selectedAdvanceTime.includes(slot)) {
            div.classList.add('selected');
            cb.checked = true;
          }

          div.addEventListener('click', () => {
            const isNowSelected = !div.classList.contains('selected');
            setSlotSelected(div, slot, isNowSelected);
            updateAdvCountBadge();
            refreshTotalDisplay();
          });

          container.appendChild(div);
        });
        updateAdvCountBadge();
      }
    } else {
      if (container) container.innerHTML = '<div style="color:#555; padding: 20px; text-align: center; grid-column: 1/-1;">Failed to load slots.</div>';
    }
  } catch (err) {
    console.error('Error fetching advance times:', err);
    if (container) container.innerHTML = '<div style="color:#555; padding: 20px; text-align: center; grid-column: 1/-1;">Error loading slots.</div>';
  }
});

// close helpers
const hideAdvanceModal = () => { advanceModal.style.display = 'none'; };

closeAdvanceBtn.addEventListener('click', hideAdvanceModal);

window.addEventListener('click', (e) => {
  if (e.target === advanceModal) hideAdvanceModal();
});

/* --- Logout Logic --- */
function initLogout() {
  const logoutBtn = document.getElementById('logoutBtn');
  const logoutModal = document.getElementById('logout-modal');
  const confirmLogout = document.getElementById('confirm-logout');
  const cancelLogout = document.getElementById('cancel-logout');
  const closeLogoutModal = document.getElementById('close-logout-modal');

  if (!logoutBtn || !logoutModal) {
    console.warn('Logout components not found');
    return;
  }

  logoutBtn.style.cursor = 'pointer';

  // Open Modal
  logoutBtn.addEventListener('click', () => {
    logoutModal.style.display = 'flex';
  });

  // Close Modal (Cancel)
  const hideModal = () => { logoutModal.style.display = 'none'; };
  cancelLogout.addEventListener('click', hideModal);
  closeLogoutModal.addEventListener('click', hideModal);

  // Close when clicking outside
  window.addEventListener('click', (e) => {
    if (e.target === logoutModal) hideModal();
  });

  // Confirm Logout Execution
  confirmLogout.addEventListener('click', async () => {
    const userId = sessionStorage.getItem('user_id');

    confirmLogout.textContent = 'Logging out...';
    confirmLogout.disabled = true;

    try {
      await window.GWinAPI.logout(userId || '0');
      // We proceed with local logout regardless of API response for better UX
      sessionStorage.clear();
      window.location.href = '../index.html';
    } catch (error) {
      console.error('Logout Error:', error);
      sessionStorage.clear();
      window.location.href = '../index.html';
    }
  });
}

function initRefresh() {
  const refreshBtn = document.getElementById('refreshBtn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      location.reload();
    });
  }
}

async function initUserSession() {
  const username = sessionStorage.getItem('username');
  const userId = sessionStorage.getItem('user_id');
  const balance = sessionStorage.getItem('balance');

  // Set Initial ID and Balance from login storage
  if (userId) {
    const userIdEl = document.querySelector('.player-id');
    if (userIdEl) userIdEl.textContent = userId;
  }

  if (balance) {
    const pointsEl = document.getElementById('user-points');
    if (pointsEl) pointsEl.textContent = Math.floor(parseFloat(balance));
  }

  if (username) {
    // Immediate fetch to get latest balance from server
    updateBalanceFromServer(username);
    updateLastDrawDetails(username);
    // Refresh balance every 30 seconds
    setInterval(() => updateBalanceFromServer(username), 30000);
  }
}

async function updateLastDrawDetails(username) {
  if (!window.GWinAPI) return;

  try {
    // 1. Update Points
    const result = await window.GWinAPI.getLastDrawBetAmount(username);
    if (result && result.status) {
      const lastPtsEl = document.getElementById('last-tran-pts');
      if (lastPtsEl) lastPtsEl.textContent = result.last_bet_amount || '0';
    }

    // 2. Update Barcode from History
    const history = await window.GWinAPI.getCurrentDrawHistory(username);
    if (history && history.tickets && history.tickets.length > 0) {
      const lastTicket = history.tickets[0]; // Assuming first is most recent
      const lastTranIdEl = document.getElementById('last-tran-id');
      const centerTranIdEl = document.querySelector('.tran-id');

      if (lastTranIdEl) lastTranIdEl.textContent = lastTicket.barcode;
      if (centerTranIdEl) centerTranIdEl.textContent = `Tran Id: ${lastTicket.barcode}`;
    }
  } catch (e) {
    console.warn('Could not update last draw details:', e);
  }
}

async function updateBalanceFromServer(username) {
  if (!window.GWinAPI) return;

  try {
    const result = await window.GWinAPI.getUserBalance(username);

    if (result && result.success && result.data) {
      const balance = result.data.balance;
      sessionStorage.setItem('balance', balance);

      const pointsEl = document.getElementById('user-points');
      if (pointsEl) pointsEl.textContent = Math.floor(parseFloat(balance));
    }
  } catch (e) {
    console.warn('Could not update balance from server, using local data.');
  }
}

/* --- Result History Modal Logic --- */
(function () {
  const resultBtn = document.querySelector('.action-btn.result');
  const resultModal = document.getElementById('result-modal');
  if (!resultBtn || !resultModal) return;

  const closeResultBtn = document.getElementById('close-result');
  const resultDateInput = document.getElementById('result-date-input');
  const resDisplayDate = document.getElementById('res-display-date');
  const resCalBtn = document.getElementById('res-cal-btn');
  const resPrevBtn = document.getElementById('res-prev-btn');
  const resNextBtn = document.getElementById('res-next-btn');
  const resultListContainer = document.getElementById('result-list-container');

  // Current date tracker
  let currentDate = new Date().toISOString().split('T')[0];

  function formatDisplayDate(dateStr) {
    return dateStr; // already YYYY-MM-DD like screenshot
  }

  function changeDate(offset) {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + offset);
    currentDate = d.toISOString().split('T')[0];
    resDisplayDate.textContent = formatDisplayDate(currentDate);
    fetchResults(currentDate);
  }

  async function fetchResults(dateVal) {
    resultListContainer.innerHTML = '<div class="res-loading">Loading...</div>';
    try {
      if (!window.GWinAPI || !window.GWinAPI.resultDateWise) throw new Error('API not found');
      const data = await window.GWinAPI.resultDateWise(dateVal);
      if (data && data.status && data.results && data.results.length > 0) {
        resultListContainer.innerHTML = '';
        data.results.forEach(item => {
          const parts = item.result ? item.result.split(',') : ['--', '--'];
          const big = (parts[0] || '--').trim().substring(0, 3);
          const small = (parts[1] || '--').trim();
          const card = document.createElement('div');
          card.className = 'res-card';
          card.innerHTML = `
            <span class="res-card-time">${item.time || '--'}</span>
            <span class="res-card-big">${big}</span>
            <span class="res-card-small">${small}</span>
          `;
          resultListContainer.appendChild(card);
        });
      } else {
        resultListContainer.innerHTML = '<div class="res-loading">No results found for this date.</div>';
      }
    } catch (err) {
      console.error('Fetch result error:', err);
      resultListContainer.innerHTML = '<div class="res-loading">Error connecting to server.</div>';
    }
  }

  // Open modal
  resultBtn.addEventListener('click', (e) => {
    e.preventDefault();
    currentDate = new Date().toISOString().split('T')[0];
    resDisplayDate.textContent = formatDisplayDate(currentDate);
    resultModal.style.display = 'flex';
    fetchResults(currentDate);
  });

  // Calendar icon opens native date picker
  if (resCalBtn && resultDateInput) {
    resCalBtn.addEventListener('click', () => { resultDateInput.showPicker(); });
    resultDateInput.addEventListener('change', () => {
      if (resultDateInput.value) {
        currentDate = resultDateInput.value;
        resDisplayDate.textContent = formatDisplayDate(currentDate);
        fetchResults(currentDate);
      }
    });
  }

  // Prev / Next day
  if (resPrevBtn) resPrevBtn.addEventListener('click', () => changeDate(-1));
  if (resNextBtn) resNextBtn.addEventListener('click', () => changeDate(1));

  // Close
  const hideResultModal = () => { resultModal.style.display = 'none'; };
  if (closeResultBtn) closeResultBtn.addEventListener('click', hideResultModal);
  window.addEventListener('click', (e) => { if (e.target === resultModal) hideResultModal(); });
})();




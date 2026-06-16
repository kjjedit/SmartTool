// ==========================================================================
// SMARTTOOL - main.js  v1.0
// ==========================================================================

let csInterface = new CSInterface();
let editMode    = false;
let draggedElement = null;

// ── Paramètres ──────────────────────────────────
let appSettings = JSON.parse(localStorage.getItem('smartTool_settings')) || {
    cellSize: 74, accentColor: '#5ac8fa'
};
function saveSettings() { localStorage.setItem('smartTool_settings', JSON.stringify(appSettings)); applySettings(); }
function applySettings() {
    CELL_SIZE_PX = appSettings.cellSize;
    document.documentElement.style.setProperty('--accent', appSettings.accentColor);
    document.documentElement.style.setProperty('--cell-size', appSettings.cellSize + 'px');
}

// ── Custom curve presets (persistants) ───────────────────────────────────
let customCurvePresets = JSON.parse(localStorage.getItem('smartTool_custom_presets')) || [];
function saveCustomCurvePresets() { localStorage.setItem('smartTool_custom_presets', JSON.stringify(customCurvePresets)); }

const CURVE_PRESETS_BUILTIN = [
    { name: 'Linear',      x1: 0,     y1: 0,     x2: 1,     y2: 1,     builtin: true },
    { name: 'Ease In',     x1: 0.45,  y1: 0,     x2: 1,     y2: 1,     builtin: true },
    { name: 'Ease Out',    x1: 0,     y1: 0,     x2: 0.55,  y2: 1,     builtin: true },
    { name: 'Ease',        x1: 0.45,  y1: 0,     x2: 0.55,  y2: 1,     builtin: true },
    { name: 'Fast',        x1: 0.17,  y1: 0.85,  x2: 0.85,  y2: 0.17,  builtin: true },
    { name: 'Circ In',     x1: 0.5,   y1: 0,     x2: 1,     y2: 0.5,   builtin: true },
    { name: 'Circ Out',    x1: 0,     y1: 0.5,   x2: 0.5,   y2: 1,     builtin: true },
    { name: 'Quart',       x1: 0.75,  y1: 0,     x2: 0.25,  y2: 1,     builtin: true },
];

function getAllCurvePresets() {
    const deleted = JSON.parse(localStorage.getItem('smartTool_deleted_builtins') || '[]');
    const builtins = CURVE_PRESETS_BUILTIN.filter(p => !deleted.includes(p.name));
    return [...builtins, ...customCurvePresets];
}

// ── Grille ────────────────────────────────────────────────────────────────
let CELL_SIZE_PX = appSettings.cellSize;
const CELL_GAP_PX = 10;
const GRID_PAD_PX = 12;
let GRID_COLS = 4;
let GRID_ROWS = 6;

function updateGridDimensions() {
    const pc = document.querySelector('.panel-container');
    if (!pc) return;
    const w = pc.clientWidth  - GRID_PAD_PX * 2;
    const h = pc.clientHeight - GRID_PAD_PX * 2;
    const nc = Math.max(3, Math.floor((w + CELL_GAP_PX) / (CELL_SIZE_PX + CELL_GAP_PX)));
    const nr = Math.max(3, Math.floor((h + CELL_GAP_PX) / (CELL_SIZE_PX + CELL_GAP_PX)));
    GRID_COLS = nc; GRID_ROWS = nr;
    renderGrid(); renderElements();
}
const panelResizeObserver = new ResizeObserver(() => updateGridDimensions());

// ── Données ───────────────────────────────────────────────────────────────
let elements = JSON.parse(localStorage.getItem('aeSmartPanel')) || [
    { id:1, type:'graph',    row:1, col:1, rowSpan:3, colSpan:3, curve:{x1:0.3,y1:0.1,x2:0.7,y2:0.9} },
    { id:2, type:'shortcut', row:1, col:4, rowSpan:1, colSpan:1, actionType:'base', action:'createSolid', label:'SLD' }
];

const baseActions = {
    'createSolid':           {label:'SLD',  name:'Create a Solid'},
    'createTextLayer':       {label:'TXT',  name:'Create a Text Layer'},
    'createShapeLayer':      {label:'SHP',  name:'Create a Shape'},
    'createAdjustmentLayer': {label:'ADJ',  name:'Create an Adjustment Layer'},
    'createNullLayer':       {label:'NULL', name:'Create a Null'},
    'createCamera':          {label:'CAM',  name:'Create a Camera'},
    'createLight':           {label:'LGT',  name:'Create a Light'},
    'precomposeLayers':      {label:'PRC',  name:'Pre-compose'},
    'reverseLayers':         {label:'REV',  name:'Reverse Layer Order'},
    'sequenceLayers':        {label:'SEQ',  name:'Sequence (1f)'},
    'adaptKeyframes':        {label:'AKF',  name:'Adapt Keyframes to Layer'},
};

// ── Init ──────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    applySettings();
    const pc = document.querySelector('.panel-container');
    if (pc) panelResizeObserver.observe(pc);
    renderGrid(); renderElements();

    document.getElementById('editBtn').addEventListener('click', toggleEditMode);
    document.getElementById('settingsBtn').addEventListener('click', openSettingsDrawer);

    const addTriggerBtn = document.getElementById('addTriggerBtn');
    const menu = document.getElementById('addButtons');
    addTriggerBtn.addEventListener('click', (e) => { e.stopPropagation(); menu.classList.toggle('open'); });

    const addActions = {
        'addShortcut':'shortcut','addGraph':'graph','addAnchor':'anchor','addTrends':'trends'
    };
    Object.keys(addActions).forEach(id => {
        const btn = document.getElementById(id);
        if (btn) btn.addEventListener('click', () => { addElement(addActions[id]); menu.classList.remove('open'); });
    });

    window.addEventListener('mousedown', (e) => {
        if (editMode && menu.classList.contains('open')
            && !menu.contains(e.target) && !addTriggerBtn.contains(e.target))
            menu.classList.remove('open');
    });
});

// ==========================================================================
// SETTINGS DRAWER
// ==========================================================================

function openSettingsDrawer() {
    const existing = document.getElementById('settingsDrawer');
    
    if (existing) { 
        existing.style.transform = 'translateY(100%)'; 
        setTimeout(() => existing.remove(), 380); 
        return; 
    }

    const drawer = document.createElement('div');
    drawer.id = 'settingsDrawer';
    drawer.style.cssText = `
        position:absolute; bottom:0; left:0; right:0;
        background:linear-gradient(180deg,#232325 0%,#1a1a1c 100%);
        border-radius:22px 22px 0 0;
        border-top:1px solid rgba(255,255,255,0.08);
        z-index:500;
        padding:10px 20px 28px;
        box-sizing:border-box;
        transform:translateY(100%);
        transition:transform 0.38s cubic-bezier(0.25,1,0.5,1);
        box-shadow:0 -6px 40px rgba(0,0,0,0.6);
    `;

    drawer.innerHTML = `
        <div style="width:38px;height:4px;background:rgba(255,255,255,0.18);border-radius:10px;margin:0 auto 18px auto;"></div>
        <div style="font-size:14px;font-weight:700;color:white;text-align:center;margin-bottom:20px;letter-spacing:0.3px;">Panel Settings</div>

        <div style="display:flex;flex-direction:column;gap:18px;">
            <div style="display:flex;flex-direction:column;gap:10px;">
                <div style="display:flex;justify-content:space-between;align-items:center;">
                    <span style="font-size:11px;font-weight:600;color:rgba(255,255,255,0.55);text-transform:uppercase;letter-spacing:0.5px;">Icon Size</span>
                    <span style="font-size:13px;font-weight:700;color:white;background:rgba(255,255,255,0.08);padding:2px 10px;border-radius:20px;" id="cellSizeVal">${appSettings.cellSize}px</span>
                </div>
                <div style="position:relative;height:28px;display:flex;align-items:center;">
                    <div style="position:absolute;left:0;right:0;height:4px;background:rgba(255,255,255,0.1);border-radius:2px;"></div>
                    <div id="sliderTrackFill" style="position:absolute;left:0;height:4px;background:var(--accent,#5ac8fa);border-radius:2px;transition:width 0.1s;"></div>
                    <input type="range" id="cellSizeSlider" min="55" max="110" step="1" value="${appSettings.cellSize}"
                        style="position:relative;z-index:1;width:100%;-webkit-appearance:none;appearance:none;background:transparent;cursor:pointer;height:28px;margin:0;">
                </div>
            </div>

            <div style="display:flex;flex-direction:column;gap:10px;">
                <span style="font-size:11px;font-weight:600;color:rgba(255,255,255,0.55);text-transform:uppercase;letter-spacing:0.5px;">Accent Color</span>
                <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
                    ${['#0cecdd','#5d00ff','#ff2e9A','#ff6f20','#cfff04','#ffffff'].map(c => `
                        <div class="s-swatch" data-color="${c}" style="
                            width:30px;height:30px;border-radius:50%;background:${c};cursor:pointer;
                            border:2.5px solid ${appSettings.accentColor===c?'white':'transparent'};
                            box-shadow:${appSettings.accentColor===c?`0 0 0 1px ${c}`:'none'};
                            transition:all 0.2s;flex-shrink:0;
                        "></div>`).join('')}
                </div>
            </div>
        </div>`;

    document.getElementById('app').appendChild(drawer);
    
    requestAnimationFrame(() => { 
        drawer.style.transform = 'translateY(0)'; 
    });

    const slider = drawer.querySelector('#cellSizeSlider');
    const fillEl = drawer.querySelector('#sliderTrackFill');
    const updateFill = () => {
        const pct = (slider.value - 55) / (110 - 55) * 100;
        fillEl.style.width = pct + '%';
    };
    updateFill();

    const style = document.createElement('style');
    style.textContent = `
        #cellSizeSlider::-webkit-slider-thumb {
            -webkit-appearance:none; width:18px; height:18px;
            border-radius:50%; background:white;
            box-shadow:0 1px 6px rgba(0,0,0,0.4); cursor:pointer;
        }`;
    drawer.appendChild(style);

    slider.oninput = (e) => {
        appSettings.cellSize = parseInt(e.target.value);
        drawer.querySelector('#cellSizeVal').textContent = appSettings.cellSize + 'px';
        updateFill();
        saveSettings(); updateGridDimensions(); renderGrid(); renderElements();
    };

    drawer.querySelectorAll('.s-swatch').forEach(sw => {
        sw.onclick = () => {
            appSettings.accentColor = sw.dataset.color;
            drawer.querySelectorAll('.s-swatch').forEach(s => {
                s.style.border = '2.5px solid transparent';
                s.style.boxShadow = 'none';
            });
            sw.style.border = '2.5px solid white';
            sw.style.boxShadow = `0 0 0 1px ${sw.dataset.color}`;
            saveSettings();
        };
    });

    setTimeout(() => {
        window.addEventListener('mousedown', function closeDrawer(e) {
            if (!drawer.contains(e.target) && e.target.id !== 'settingsBtn' && !document.getElementById('settingsBtn').contains(e.target)) {
                drawer.style.transform = 'translateY(100%)';
                setTimeout(() => drawer.remove(), 380);
                window.removeEventListener('mousedown', closeDrawer);
            }
        });
    }, 100);
}

// ==========================================================================
// RENDU GRILLE
// ==========================================================================
function renderGrid() {
    const grid = document.getElementById('grid');
    grid.innerHTML = '';
    grid.style.gridTemplateColumns = `repeat(${GRID_COLS}, ${CELL_SIZE_PX}px)`;
    grid.style.gridAutoRows        = `${CELL_SIZE_PX}px`;
    grid.style.gap                 = `${CELL_GAP_PX}px`;
    grid.style.padding             = `${GRID_PAD_PX}px`;

    const totalRows = GRID_ROWS;
    for (let r = 1; r <= totalRows; r++) {
        for (let c = 1; c <= GRID_COLS; c++) {
            const cell = document.createElement('div');
            cell.className = `grid-cell ${editMode ? 'edit-visible' : ''}`;
            cell.style.gridArea = `${r} / ${c}`;
            if (editMode) { cell.ondragover = (e)=>e.preventDefault(); cell.ondrop = (e)=>handleDrop(e,r,c); }
            grid.appendChild(cell);
        }
    }
}

// ==========================================================================
// RENDU ELEMENTS
// ==========================================================================
function renderElements() {
    document.querySelectorAll('.element').forEach(el => el.remove());
    const container = document.getElementById('grid');

    elements.forEach(el => {
        const minSpan = ['graph','anchor','trends'].includes(el.type) ? 2 : 1;
        const effectiveColSpan = Math.max(minSpan, Math.min(el.colSpan, GRID_COLS));
        const effectiveCol     = Math.max(1, Math.min(el.col, GRID_COLS - effectiveColSpan + 1));

        if (effectiveCol + effectiveColSpan - 1 > GRID_COLS) return;
        if (el.row + el.rowSpan - 1 > GRID_ROWS) return;

        const div = document.createElement('div');
        div.className      = `element ${el.type} ${editMode ? 'shaking' : ''}`;
        div.style.gridArea = `${el.row} / ${effectiveCol} / span ${el.rowSpan} / span ${effectiveColSpan}`;

        if (el.type === 'graph') {
            div.style.display        = 'flex';
            div.style.flexDirection  = 'column';
            div.style.alignItems     = 'stretch';
            div.style.justifyContent = 'flex-start';
            div.style.padding        = '0';
        }

        if      (el.type==='graph')       initGraphWidget(el, div);
        else if (el.type==='anchor')      initAnchorWidget(el, div);
        else if (el.type==='trends')      initTrendsWidget(el, div);
        else {
            const s = document.createElement('span');
            s.className   = 'shortcut-label';
            s.textContent = (el.actionType==='base' && baseActions[el.action])
                ? baseActions[el.action].label : (el.label||'◆');
            div.appendChild(s);
        }

        if (editMode) {
            const dragOverlay = document.createElement('div');
            dragOverlay.className = 'drag-overlay';
            dragOverlay.draggable = true;
            dragOverlay.ondragstart = (e) => {
                draggedElement = el;
                setTimeout(() => { div.style.opacity = "0.5"; }, 0);
            };
            dragOverlay.ondragend = () => { div.style.opacity = "1"; draggedElement = null; };
            div.appendChild(dragOverlay);

            const cb = document.createElement('div');
            cb.className = 'delete-badge'; cb.innerHTML = '−';
            cb.onclick = (e) => { e.stopPropagation(); deleteElement(el.id); };
            div.appendChild(cb);

            if (el.type==='shortcut' || el.type==='graph') {
                const cfg = document.createElement('div');
                cfg.className = 'config-badge';
                cfg.style.bottom = 'auto';
                cfg.style.top = '-6px';
                cfg.style.right = '-6px';
                cfg.innerHTML = '⋯';
                cfg.onclick = (e) => {
                    e.stopPropagation();
                    if (el.type==='shortcut') openConfigModal(el.id);
                    else if (el.type==='graph') openGraphPresetsModal(el.id);
                };
                div.appendChild(cfg);
            }

            const rh = document.createElement('div');
            rh.className = 'resize-badge';
            rh.innerHTML = `<svg viewBox="0 0 563 563" width="55%" height="55%"><path d="M112.6 450.6 L450.6 112.6 M281.6 450.6 l169-169 M450.6 450.6" stroke="white" stroke-width="101.4" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>`;
            rh.addEventListener('mousedown', (e) => { e.stopPropagation(); startFreeResize(e, el, div); });
            div.appendChild(rh);
            
        } else {
            if (!['graph','anchor','trends'].includes(el.type))
                div.onclick = () => executeAction(el);
        }
        container.appendChild(div);
    });
}

// ==========================================================================
// RESIZE LIBRE
// ==========================================================================
function startFreeResize(e, el, div) {
    e.preventDefault();
    const stepPx  = CELL_SIZE_PX + CELL_GAP_PX;
    const grid    = document.getElementById('grid');
    const gRect   = grid.getBoundingClientRect();
    const originX = GRID_PAD_PX + (el.col - 1) * stepPx;
    const originY = GRID_PAD_PX + (el.row - 1) * stepPx;
    div.style.opacity = "0.75";
    const onMove = (me) => {
        const min  = ['graph','anchor','trends'].includes(el.type) ? 2 : 1;
        const maxC = GRID_COLS - el.col + 1;
        const nc   = Math.max(min, Math.min(maxC, Math.round((me.clientX - gRect.left - originX + CELL_SIZE_PX/2) / stepPx)));
        const nr   = Math.max(min, Math.round((me.clientY - gRect.top - originY + CELL_SIZE_PX/2) / stepPx));
        if ((nc !== el.colSpan || nr !== el.rowSpan) && !isAreaOccupied(el.row, el.col, nr, nc, el.id)) {
            el.colSpan = nc; el.rowSpan = nr;
            div.style.gridArea = `${el.row}/${el.col}/span ${el.rowSpan}/span ${el.colSpan}`;
        }
    };
    const onUp = () => {
        div.style.opacity = "1";
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
        save(); renderGrid(); renderElements();
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
}

// ==========================================================================
// WIDGET GRAPH
// ==========================================================================
function initGraphWidget(el, container) {
    if (!el.curve) el.curve = {x1:0.3,y1:0.1,x2:0.7,y2:0.9};

    const extraRows  = Math.max(0, el.rowSpan - el.colSpan);
    const hasPresets = extraRows > 0;
    const presetsPerRow = 4;
    const hasExtraInfo = el.colSpan >= 3 && el.rowSpan >= 3;

    container.style.padding   = '5%';
    container.style.boxSizing = 'border-box';

    const allPresets = getAllCurvePresets();

    container.innerHTML = `
        <div class="canvas-parent" style="flex:1;width:100%;background:#0e0e0e;border-radius:10px;overflow:hidden;position:relative;min-height:0;">
            <canvas id="canvas-${el.id}" style="position:absolute;top:0;left:0;width:100%;height:100%;"></canvas>
            ${hasExtraInfo ? `<div id="cdo-${el.id}" style="position:absolute;bottom:4px;right:6px;font-size:9px;font-family:monospace;color:rgba(255,255,255,0.38);pointer-events:none;line-height:1.5;text-align:right;"></div>` : ''}
        </div>

        ${hasPresets ? (() => {
            let rowsHTML = '';
            for (let row = 0; row < extraRows; row++) {
                const start = row * 4;
                const rowPresets = allPresets.slice(start, start + 4);
                const isLastRow = (row === extraRows - 1);
                const lastRowPresets = isLastRow ? allPresets.slice(start) : rowPresets;

                rowsHTML += `
                <div class="preset-row" style="display:flex;gap:6px;overflow-x:auto;overflow-y:hidden;scrollbar-width:none;margin-top:${row===0?'4%':'3%'};flex-shrink:0;">
                    ${(isLastRow ? lastRowPresets : rowPresets).map((p, ri) => {
                        const i = start + ri;
                        return `<div class="preset-thumb" data-idx="${i}" title="${p.name}"
                            style="flex:0 0 calc(25% - 5px);min-width:0;aspect-ratio:1/1;background:#0e0e0e;border-radius:8px;cursor:pointer;position:relative;overflow:hidden;border:1.5px solid transparent;transition:border-color 0.15s;flex-shrink:0;">
                            <canvas id="ptc-${el.id}-${i}" style="position:absolute;top:0;left:0;width:100%;height:100%;"></canvas>
                            <div style="position:absolute;bottom:0;left:0;right:0;background:rgba(0,0,0,0.6);font-size:8px;font-weight:700;text-align:center;padding:2px 0;color:rgba(255,255,255,0.7);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${p.name}</div>
                        </div>`;
                    }).join('')}
                    ${isLastRow ? `
                    <div class="preset-add-btn" style="flex:0 0 calc(25% - 5px);min-width:0;aspect-ratio:1/1;background:#1a1a1c;border-radius:8px;cursor:pointer;display:flex;align-items:center;justify-content:center;border:1.5px dashed rgba(255,255,255,0.2);flex-shrink:0;">
                        <svg width="40%" height="40%" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                    </div>` : ''}
                </div>`;
            }
            return `<div class="preset-carousel-wrapper" style="flex:0 0 auto;">${rowsHTML}</div>`;
        })() : ''}

        <div class="graph-btn-container" style="flex:0 0 auto;display:flex;gap:3%;height:clamp(22px,${hasPresets?'9':'14'}%,34px);width:100%;align-items:center;justify-content:center;margin-top:3%;pointer-events:${editMode?'none':'auto'};">
            <button class="inv-btn" style="height:100%;aspect-ratio:1/1;background:#3a3a3c;border:none;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                <svg width="60%" height="60%" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"></polyline><polyline points="23 20 23 14 17 14"></polyline><path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"></path></svg>
            </button>
            <button class="reset-btn" style="height:100%;aspect-ratio:1/1;background:#3a3a3c;border:none;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                <svg width="60%" height="60%" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>
            </button>
            ${hasExtraInfo ? `
            <button class="copy-btn" title="Import curve from 2 selected keyframes" style="height:100%;aspect-ratio:1/1;background:#3a3a3c;border:none;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;"><svg width="60%" height="60%" viewBox="0 0 614.4 614.4"><g fill="none" stroke="#fff" stroke-width="64" stroke-linecap="round" stroke-linejoin="round"><rect x="243.5" y="204.4" width="250.5" height="328.5"/><polyline points="120.4 446.1 120.4 81.4 397.7 81.4"/></g></svg></button>` : ''}
            <button class="app-btn" style="flex-grow:1;height:100%;background:#3a3a3c;color:white;border:none;border-radius:999px;font-size:clamp(7px,2.5vw,10px);font-weight:bold;cursor:pointer;white-space:nowrap;padding:0 4px;">APPLY</button>
        </div>`;

    const canvas = container.querySelector('canvas');
    const ctx    = canvas.getContext('2d');
    const cdo    = container.querySelector(`#cdo-${el.id}`);

    function drawCurve(c, cx, x1,y1,x2,y2, accent, mini=false) {
        const w=c.width, h=c.height;
        if(w===0||h===0)return;
        cx.clearRect(0,0,w,h);
        if(!mini){
            cx.strokeStyle='#222';cx.lineWidth=1;
            for(let i=1;i<4;i++){cx.beginPath();cx.moveTo(i*(w/4),0);cx.lineTo(i*(w/4),h);cx.stroke();cx.beginPath();cx.moveTo(0,i*(h/4));cx.lineTo(w,i*(h/4));cx.stroke();}
        }
        cx.beginPath();cx.moveTo(0,h);
        cx.bezierCurveTo(x1*w,h-(y1*h),x2*w,h-(y2*h),w,0);
        cx.strokeStyle=accent;cx.shadowBlur=mini?2:4;cx.shadowColor=accent;
        cx.lineWidth=mini?1.5:3;cx.stroke();cx.shadowBlur=0;
        if(!mini){
            cx.strokeStyle='#FFF';cx.lineWidth=2;
            cx.beginPath();cx.moveTo(0,h);cx.lineTo(x1*w,h-(y1*h));cx.stroke();
            cx.beginPath();cx.moveTo(w,0);cx.lineTo(x2*w,h-(y2*h));cx.stroke();
            cx.fillStyle='#FFF';
            cx.beginPath();cx.arc(x1*w,h-(y1*h),3,0,Math.PI*2);cx.fill();
            cx.beginPath();cx.arc(x2*w,h-(y2*h),3,0,Math.PI*2);cx.fill();
        }
    }

    const draw = () => {
        const r=canvas.getBoundingClientRect();canvas.width=r.width;canvas.height=r.height;
        drawCurve(canvas,ctx,el.curve.x1,el.curve.y1,el.curve.x2,el.curve.y2,appSettings.accentColor);
        if(cdo)cdo.textContent=`(${el.curve.x1.toFixed(2)},${el.curve.y1.toFixed(2)})  (${el.curve.x2.toFixed(2)},${el.curve.y2.toFixed(2)})`;
        allPresets.forEach((p,i)=>{
            const tc=container.querySelector(`#ptc-${el.id}-${i}`);
            if(!tc)return;
            const tr=tc.getBoundingClientRect();
            if(tr.width===0||tr.height===0)return;
            tc.width=tr.width;tc.height=tr.height;
            const tcx=tc.getContext('2d');
            drawCurve(tc,tcx,p.x1,p.y1,p.x2,p.y2,appSettings.accentColor,true);
        });
    };

    new ResizeObserver(() => {
        draw();
        container.querySelectorAll('.preset-row').forEach(row => {
            row.style.overflowX = row.scrollWidth > row.clientWidth ? 'auto' : 'hidden';
        });
    }).observe(container);

    container.querySelectorAll('.preset-thumb').forEach(thumb => {
        thumb.onclick = (e) => {
            e.stopPropagation();
            const p = getAllCurvePresets()[parseInt(thumb.dataset.idx)];
            if(!p)return;
            el.curve.x1=p.x1;el.curve.y1=p.y1;el.curve.x2=p.x2;el.curve.y2=p.y2;
            container.querySelectorAll('.preset-thumb').forEach(t=>t.style.borderColor='transparent');
            thumb.style.borderColor='var(--accent)';
            draw();save();
        };
    });

    const addBtn = container.querySelector('.preset-add-btn');
    if(addBtn) addBtn.onclick = (e) => {
        e.stopPropagation();
        const name = prompt('Preset name:');
        if(!name||!name.trim())return;
        customCurvePresets.push({name:name.trim(),x1:el.curve.x1,y1:el.curve.y1,x2:el.curve.x2,y2:el.curve.y2,builtin:false});
        saveCustomCurvePresets();
        renderElements(); 
    };

    container.querySelector('.inv-btn').onclick = (e) => {
        e.stopPropagation();
        const o={...el.curve};
        el.curve.x1=1-o.x2;el.curve.y1=1-o.y2;el.curve.x2=1-o.x1;el.curve.y2=1-o.y1;
        draw();save();
    };
    container.querySelector('.reset-btn').onclick = (e) => {
        e.stopPropagation();
        el.curve.x1=0;el.curve.y1=0;el.curve.x2=1;el.curve.y2=1;
        draw();save();
    };

    const copyBtn = container.querySelector('.copy-btn');
    if(copyBtn) copyBtn.onclick = (e) => {
        e.stopPropagation();
        csInterface.evalScript('getCurveFromSelectedKeys()',(result)=>{
            if(!result||result==='NO_COMP'||result==='NO_KEYS'){csInterface.evalScript('nativeAlert("Select 2 keyframes on the same property to copy the curve.")');return;}
            try{const parts=result.split(',');el.curve.x1=parseFloat(parts[0]);el.curve.y1=parseFloat(parts[1]);el.curve.x2=parseFloat(parts[2]);el.curve.y2=parseFloat(parts[3]);draw();save();}catch(err){}
        });
    };

    const appBtn = container.querySelector('.app-btn');
    appBtn.onclick = (e) => {
        e.stopPropagation();
        appBtn.classList.add('flash-active');
        setTimeout(()=>appBtn.classList.remove('flash-active'),400);
        const x1=el.curve.x1.toFixed(3),y1=el.curve.y1.toFixed(3),x2=el.curve.x2.toFixed(3),y2=el.curve.y2.toFixed(3);
        csInterface.evalScript(`applyEaseToSelectedKeys(${x1},${y1},${x2},${y2})`,(r)=>{
            if(r==="NO_COMP")csInterface.evalScript('nativeAlert("Please select an active composition.")');
            else if(r==="NO_SELECTION")csInterface.evalScript('nativeAlert("Please select at least one property.")');
            else if(r==="NO_KEYS")csInterface.evalScript('nativeAlert("Please select at least two keyframes.")');
        });
    };

    canvas.onmousedown = (e) => {
        if(editMode)return;
        e.stopPropagation();e.preventDefault();
        const rect=canvas.getBoundingClientRect();
        const upd=(me)=>{
            const mx=Math.max(0,Math.min(1,(me.clientX-rect.left)/rect.width));
            const my=Math.max(0,Math.min(1,1-(me.clientY-rect.top)/rect.height));
            const d1=Math.hypot(mx-el.curve.x1,my-el.curve.y1);
            const d2=Math.hypot(mx-el.curve.x2,my-el.curve.y2);
            if(d1<d2){el.curve.x1=mx;el.curve.y1=my;}else{el.curve.x2=mx;el.curve.y2=my;}
            draw();
        };
        window.onmousemove=upd;
        window.onmouseup=()=>{window.onmousemove=null;save();};
    };
}


// ==========================================================================
// MODAL GESTION PRESETS COURBE
// ==========================================================================
function getAllCurvePresetsFiltered() {
    const deleted = JSON.parse(localStorage.getItem('smartTool_deleted_builtins') || '[]');
    const builtins = CURVE_PRESETS_BUILTIN.filter(p => !deleted.includes(p.name));
    return [...builtins, ...customCurvePresets];
}

function openGraphPresetsModal(elId) {
    function render() {
        const existing = document.getElementById('graphPresetsModal');
        if (existing) existing.remove();
        const modal = document.createElement('div');
        modal.id = 'graphPresetsModal';
        modal.className = 'config-modal';
        const allP = getAllCurvePresets();
        const rows = allP.length === 0
            ? '<div style="text-align:center;color:rgba(255,255,255,0.4);font-size:12px;padding:16px 0;">No presets. Save one with +.</div>'
            : allP.map((p, i) => {
                return '<div style="display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.08);">' +
                    '<span style="flex:1;font-size:13px;color:white;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + p.name + '</span>' +
                    '<button data-action="rename" data-idx="' + i + '" style="background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);border-radius:999px;color:white;font-size:11px;font-weight:600;padding:4px 10px;cursor:pointer;">Rename</button>' +
                    '<button data-action="delete" data-idx="' + i + '" style="background:rgba(255,59,48,0.15);border:1px solid rgba(255,59,48,0.4);border-radius:999px;color:#ff3b30;font-size:11px;font-weight:600;padding:4px 10px;cursor:pointer;">Delete</button>' +
                    '</div>';
            }).join('');
        modal.innerHTML = '<div class="config-modal-content"><h3>Curve Presets</h3><div style="max-height:260px;overflow-y:auto;margin-bottom:16px;">' + rows + '</div><div class="modal-buttons"><button id="gpResetBtn" class="modal-btn cancel-btn" style="font-size:11px;">Reset</button><button id="gpCloseBtn" class="modal-btn save-btn">Close</button></div></div>';
        document.body.appendChild(modal);
        modal.querySelector('#gpCloseBtn').onclick = () => modal.remove();
        modal.querySelector('#gpResetBtn').onclick = () => { localStorage.removeItem('smartTool_deleted_builtins'); renderElements(); render(); };
        modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
        modal.querySelectorAll('[data-action]').forEach(btn => {
            btn.onclick = (e) => {
                e.stopPropagation();
                const idx = parseInt(btn.dataset.idx);
                const preset = allP[idx];
                if (btn.dataset.action === 'delete') {
                    if (preset.builtin) {
                        const deleted = JSON.parse(localStorage.getItem('smartTool_deleted_builtins') || '[]');
                        if (!deleted.includes(preset.name)) deleted.push(preset.name);
                        localStorage.setItem('smartTool_deleted_builtins', JSON.stringify(deleted));
                    } else {
                        const ci = customCurvePresets.findIndex(p => p.name === preset.name);
                        if (ci !== -1) { customCurvePresets.splice(ci, 1); saveCustomCurvePresets(); }
                    }
                    renderElements(); render();
                } else {
                    const newName = prompt('New name:', preset.name);
                    if (newName && newName.trim()) {
                        if (preset.builtin) {
                            const deleted = JSON.parse(localStorage.getItem('smartTool_deleted_builtins') || '[]');
                            if (!deleted.includes(preset.name)) deleted.push(preset.name);
                            localStorage.setItem('smartTool_deleted_builtins', JSON.stringify(deleted));
                            customCurvePresets.unshift({...preset, builtin:false, name:newName.trim()});
                        } else {
                            const ci = customCurvePresets.findIndex(p => p.name === preset.name);
                            if (ci !== -1) customCurvePresets[ci].name = newName.trim();
                        }
                        saveCustomCurvePresets(); renderElements(); render();
                    }
                }
            };
        });
    }
    render();
}

// ==========================================================================
// WIDGET ANCHOR
// ==========================================================================
function initAnchorWidget(el, container) {
    const svgPaths = {
        tl: '<path d="M2.5,22.5v-7.5c6.4-1,11.4-6,12.5-12.4h7.5c1.4,0,2.5-1.1,2.5-2.4S25,0,25,0h-14.8c0,5.6-4.6,10.2-10.2,10.1H0v14.8H0c1.4,0,2.5-1.1,2.5-2.5h0Z"/>',
        tc: '<path d="M35,0h0c0,5.6-4.5,10.1-10.1,10.1S14.8,5.6,14.8,0H0c0,1.4,1.1,2.5,2.5,2.5h7.5c1.1,6.4,6.1,11.4,12.4,12.4v7.5c0,1.4,1.1,2.5,2.5,2.5s2.5-1.1,2.5-2.5v-7.5c6.4-1.1,11.4-6.1,12.4-12.4h7.5C48.7,2.5,49.8,1.4,49.8,0h-14.8Z"/>',
        tr: '<path d="M2.5,2.5h7.5c1,6.4,6,11.4,12.4,12.5v7.5c0,1.4,1.1,2.5,2.4,2.5s0,0,.1,0v-14.8h0c-5.6,0-10.1-4.6-10.1-10.2H0c0,1.3,1.1,2.4,2.5,2.4Z"/>',
        ml: '<path d="M0,14.8h0c5.6,0,10.1,4.5,10.1,10.1s-4.6,10.1-10.1,10.1h0v14.8h0c1.4,0,2.5-1.1,2.5-2.5v-7.5c6.4-1,11.4-6.1,12.4-12.4h7.5c1.4,0,2.5-1.1,2.5-2.5s-1.1-2.5-2.5-2.5h-7.5c-1.1-6.4-6.1-11.4-12.4-12.4V2.5c0-1.4-1.1-2.5-2.5-2.5h0v14.8Z"/>',
        mc: '<path d="M47.4,22.5h-7.5c-1-6.4-6.1-11.4-12.4-12.4V2.5c0-1.4-1.1-2.5-2.5-2.5s-2.5,1.1-2.5,2.5v7.5c-6.4,1.1-11.4,6.1-12.4,12.4H2.5c-1.4,0-2.5,1.1-2.5,2.5s1.1,2.5,2.5,2.5h7.5c1.1,6.4,6.1,11.4,12.4,12.4v7.5c0,1.4,1.1,2.5,2.5,2.5s2.5-1.1,2.5-2.5v-7.5c6.4-1,11.4-6.1,12.4-12.4h7.5c1.4,0,2.5-1.1,2.5-2.5s-1.1-2.5-2.5-2.5h0ZM24.9,35c-5.6,0-10.1-4.5-10.1-10.1s4.5-10.1,10.1-10.1,10.1,4.5,10.1,10.1-4.5,10.1-10.1,10.1Z"/>',
        mr: '<path d="M24.9,35h0c-5.6,0-10.1-4.5-10.1-10.1s4.5-10.1,10.1-10.1h0V0h0c-1.4,0-2.5,1.1-2.5,2.5v7.5c-6.4,1.1-11.4,6.1-12.4,12.4H2.5c-1.4,0-2.5,1.1-2.5,2.5s1.1,2.5,2.5,2.5h7.5c1.1,6.4,6.1,11.4,12.4,12.4v7.5c0,1.4,1.1,2.5,2.5,2.5h0v-14.8h0Z"/>',
        bl: '<path d="M22.5,22.5h-7.5c-1-6.4-6-11.4-12.4-12.5V2.5C2.6,1.1,1.5,0,.1,0s0,0-.1,0v14.8h0c5.6,0,10.1,4.6,10.1,10.2h14.8c0-1.3-1.1-2.4-2.5-2.4Z"/>',
        bc: '<path d="M14.8,24.9h0c0-5.6,4.6-10.1,10.2-10.1,5.6,0,10.1,4.6,10.1,10.2h14.8c0-1.3-1.1-2.4-2.5-2.4h-7.5c-1-6.4-6-11.4-12.4-12.5V2.5c0-1.4-1.1-2.5-2.4-2.5s-2.5,1.1-2.5,2.5v7.5c-6.4,1-11.4,6-12.5,12.4H2.5c-1.4,0-2.5,1.1-2.5,2.4h0s14.8,0,14.8,0Z"/>',
        br: '<path d="M22.5,2.5v7.5c-6.4,1-11.4,6-12.5,12.4H2.5c-1.4,0-2.5,1.1-2.5,2.4s0,0,0,.1h14.8c0-5.6,4.6-10.2,10.2-10.1h0V0h0c-1.4,0-2.5,1.1-2.5,2.5Z"/>'
    };

    const viewBoxes = {
        tl: '0 0 25 24.9',  tc: '0 0 49.8 24.9', tr: '0 0 24.9 25',
        ml: '0 0 24.9 49.8', mc: '0 0 49.8 49.8', mr: '0 0 24.9 49.8',
        bl: '0 0 24.9 25',   bc: '0 0 49.8 25',   br: '0 0 25 24.9'
    };

    const buttonsConfig = [
        {pos:'tl', transform:'scale(0.4)', origin:'top left'},
        {pos:'tc', transform:'scale(0.8) translate(0,-25%)', origin:'top center'},
        {pos:'tr', transform:'scale(0.4)', origin:'top right'},
        {pos:'ml', transform:'scale(0.8) translate(-25%,0)', origin:'center left'},
        {pos:'mc', transform:'scale(0.8)', origin:'center center'},
        {pos:'mr', transform:'scale(0.8) translate(25%,0)', origin:'center right'},
        {pos:'bl', transform:'scale(0.4)', origin:'bottom left'},
        {pos:'bc', transform:'scale(0.8) translate(0,25%)', origin:'bottom center'},
        {pos:'br', transform:'scale(0.4)', origin:'bottom right'}
    ];

    container.innerHTML = `
        <div style="width:100%;height:100%;display:grid;grid-template-columns:repeat(3,1fr);gap:4%;padding:8%;box-sizing:border-box;">
            ${buttonsConfig.map(p => `
                <button class="anchor-btn" data-pos="${p.pos}" style="background:#3a3a3c;border:none;border-radius:6px;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0;width:100%;aspect-ratio:1/1;">
                    <svg viewBox="${viewBoxes[p.pos]}" style="width:100%;height:100%;object-fit:contain;transform:${p.transform};transform-origin:${p.origin};">
                        <g fill="currentColor">${svgPaths[p.pos]}</g>
                    </svg>
                </button>`).join('')}
        </div>`;

    container.querySelectorAll('.anchor-btn').forEach(btn =>
        btn.onclick = (e) => { e.stopPropagation(); csInterface.evalScript(`setAnchorPoint("${btn.dataset.pos}")`); });
}


// ==========================================================================
// WIDGET TRENDS
// ==========================================================================
const TRENDS_JSON_URL = 'https://raw.githubusercontent.com/kjjedit/SmartTool/main/trends.json';
const trendsAudio = new Audio();
let trendsCurrentId = null;

function initTrendsWidget(el, container) {
    container.style.overflow = 'visible';

    const cached = el._trendsCache || null;
    renderTrendsUI(el, container, cached);

    const now = Date.now();
    if (!el._trendsFetchedAt || (now - el._trendsFetchedAt) > 600000) {
        fetch(TRENDS_JSON_URL + '?t=' + now)
            .then(r => r.json())
            .then(data => {
                el._trendsCache = data;
                el._trendsFetchedAt = now;
                renderTrendsUI(el, container, data);
            })
            .catch(() => {
                const errDiv = container.querySelector('.trends-status');
                if (errDiv) errDiv.textContent = 'Network error — check connection';
            });
    }
}

function renderTrendsUI(el, container, tracks) {
    container.innerHTML = `
        <div style="width:100%;height:100%;display:flex;flex-direction:column;box-sizing:border-box;overflow:hidden;border-radius:inherit;">
            <div style="flex:0 0 auto;padding:8% 8% 4% 8%;display:flex;align-items:center;justify-content:space-between;">
                <div style="display:flex;align-items:center;gap:6px;">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2.5"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>
                    <span style="font-size:11px;font-weight:700;color:white;letter-spacing:0.3px;">Trending Sound</span>
                </div>
            </div>
            <div class="trends-list" style="flex:1;overflow-y:auto;overflow-x:hidden;padding:0 5% 5% 5%;display:flex;flex-direction:column;gap:6px;scrollbar-width:none;">
                ${!tracks ? `<div class="trends-status" style="color:rgba(255,255,255,0.35);font-size:10px;text-align:center;padding:20% 0;">Loading…</div>` : ''}
                ${tracks ? tracks.map((t, i) => `
                    <div class="trend-row" data-id="${t.id}" data-url="${t.audio_url}" style="
                        display:flex;align-items:center;gap:8px;
                        padding:6px 8px;border-radius:10px;
                        background:rgba(255,255,255,0.04);
                        border:1px solid rgba(255,255,255,0.06);
                        cursor:pointer;transition:background 0.15s;flex-shrink:0;">
                        <div class="trend-play-btn" data-id="${t.id}" data-url="${t.audio_url}" style="
                            width:26px;height:26px;border-radius:50%;
                            background:rgba(255,255,255,0.08);
                            display:flex;align-items:center;justify-content:center;
                            flex-shrink:0;transition:background 0.15s;">
                            <svg class="ti-play" width="10" height="10" viewBox="0 0 24 24" fill="white"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                            <svg class="ti-pause" width="10" height="10" viewBox="0 0 24 24" fill="white" style="display:none;"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>
                            <svg class="ti-load" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" style="display:none;animation:spin 0.8s linear infinite;"><path d="M12 2a10 10 0 0 1 10 10"/></svg>
                        </div>
                        <div style="flex:1;min-width:0;overflow:hidden;">
                            <div style="font-size:clamp(8px,1.5vw,11px);font-weight:600;color:white;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${t.title}</div>
                        </div>
                        <button class="trend-import-btn" data-url="${t.audio_url}" data-title="${t.title.replace(/"/g,'&quot;')}" style="
                            flex-shrink:0;background:var(--accent);border:none;border-radius:6px;
                            color:white;font-size:9px;font-weight:700;padding:4px 7px;
                            cursor:pointer;transition:all 0.15s;white-space:nowrap;" 
                            title="Import into AE project">
                            + Import
                        </button>
                    </div>`).join('') : ''}
            </div>
        </div>`;

        container.querySelectorAll('.trend-play-btn').forEach(btn => {
        btn.onclick = (e) => {
            e.stopPropagation();
            const id  = btn.dataset.id;
            const url = btn.dataset.url;

            const allBtns = container.querySelectorAll('.trend-play-btn');
            const resetAll = () => allBtns.forEach(b => {
                b.querySelector('.ti-play').style.display   = 'block';
                b.querySelector('.ti-pause').style.display  = 'none';
                b.querySelector('.ti-load').style.display   = 'none';
                b.style.background = 'rgba(255,255,255,0.08)';
            });

            if (trendsCurrentId === id && !trendsAudio.paused) {
                trendsAudio.pause();
                resetAll();
                trendsCurrentId = null;
                return;
            }

            resetAll();
            trendsCurrentId = id;
            btn.querySelector('.ti-play').style.display  = 'none';
            btn.querySelector('.ti-load').style.display  = 'block';
            btn.style.background = `color-mix(in srgb,var(--accent) 30%,transparent)`;

            try {
                const https = window.require('https');
                const http  = window.require('http');

                function dlAudio(urlStr, redirectCount) {
                    if (redirectCount > 10) { resetAll(); trendsCurrentId = null; return; }
                    
                    const https = window.require('https');
                    const http  = window.require('http');
                    const fs    = window.require('fs');
                    const path  = window.require('path');
                    const os    = window.require('os');
                    const mod   = urlStr.startsWith('https') ? https : http;

                    mod.get(urlStr, { headers: { 'User-Agent': 'SmartTool-CEP' } }, (res) => {
                        if ([301, 302, 307, 308].includes(res.statusCode)) {
                            res.resume(); 
                            dlAudio(res.headers.location, redirectCount + 1); 
                            return;
                        }
                        
                        if (res.statusCode !== 200) { resetAll(); trendsCurrentId = null; return; }
                        
                        const chunks = [];
                        res.on('data', c => chunks.push(c));
                        res.on('end', () => {
                            if (trendsCurrentId !== id) return;
                            
                            try {
                                const buf = Buffer.concat(chunks);
                                
                                const tmpDir = path.join(os.tmpdir(), 'SmartTool_Cache');
                                if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
                                
                                const tempFilePath = path.join(tmpDir, `preview_${id}.wav`);
                                fs.writeFileSync(tempFilePath, buf);
                                trendsAudio.src = 'file://' + tempFilePath.replace(/\\/g, '/') + '?t=' + Date.now();
                                
                                trendsAudio.play().then(() => {
                                    btn.querySelector('.ti-load').style.display  = 'none';
                                    btn.querySelector('.ti-pause').style.display = 'block';
                                    btn.style.background = `color-mix(in srgb,var(--accent) 50%,transparent)`;
                                }).catch((err) => { 
                                    console.error("Erreur de lecture audio CEP:", err);
                                    resetAll(); 
                                    trendsCurrentId = null; 
                                });
                                
                                trendsAudio.onended = () => { 
                                    resetAll(); 
                                    trendsCurrentId = null; 
                                    try { fs.unlinkSync(tempFilePath); } catch(e){}
                                };

                            } catch(e) {
                                console.error("Erreur écriture cache audio:", e);
                                resetAll();
                                trendsCurrentId = null;
                            }
                        });
                        res.on('error', () => { resetAll(); trendsCurrentId = null; });
                    }).on('error', () => { resetAll(); trendsCurrentId = null; });
                }

                dlAudio(url, 0);
            } catch(e) {
                resetAll(); trendsCurrentId = null;
            }
        };
    });

    container.querySelectorAll('.trend-import-btn').forEach(btn => {
        btn.addEventListener('mouseover',  () => { btn.style.filter='brightness(1.2)'; btn.style.transform='scale(1.05)'; });
        btn.addEventListener('mouseout',   () => { btn.style.filter=''; btn.style.transform=''; });
        btn.onclick = (e) => {
            e.stopPropagation();
            const url   = btn.dataset.url;
            const title = btn.dataset.title;
            btn.textContent = '…';
            btn.style.opacity = '0.6';

            try {
                const https = window.require('https');
                const http  = window.require('http');
                const fs    = window.require('fs');
                const path  = window.require('path');
                const os    = window.require('os');

                const safeName = title.replace(/[^a-zA-Z0-9\-_ \[\]()]/g, '_') + '.wav';
                const tmpDir   = path.join(os.tmpdir(), 'SmartTool_Trends');
                if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
                const destPath = path.join(tmpDir, safeName);

                function download(urlStr, redirectCount) {
                    if (redirectCount > 10) {
                        btn.textContent = '✗ Redir'; btn.style.background='#ff3b30'; btn.style.opacity='1';
                        setTimeout(()=>{btn.textContent='+ Import';btn.style.background='var(--accent)';},3000);
                        return;
                    }
                    const mod = urlStr.startsWith('https') ? https : http;
                    mod.get(urlStr, { headers: { 'User-Agent': 'SmartTool-CEP' } }, (res) => {
                        if (res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 307 || res.statusCode === 308) {
                            res.resume();
                            download(res.headers.location, redirectCount + 1);
                            return;
                        }
                        if (res.statusCode !== 200) {
                            btn.textContent = '✗ ' + res.statusCode; btn.style.background='#ff3b30'; btn.style.opacity='1';
                            setTimeout(()=>{btn.textContent='+ Import';btn.style.background='var(--accent)';},3000);
                            return;
                        }
                        const chunks = [];
                        res.on('data', chunk => chunks.push(chunk));
                        res.on('end', () => {
                            try {
                                const buf = Buffer.concat(chunks);
                                fs.writeFileSync(destPath, buf);
                                const escaped = destPath.replace(/\\/g, '/').replace(/"/g, '\\"');
                                csInterface.evalScript(`importAudioFile("${escaped}")`, (result) => {
                                    if (result === 'OK') {
                                        btn.textContent = '✓'; btn.style.background='#30d158'; btn.style.opacity='1';
                                        setTimeout(()=>{btn.textContent='+ Import';btn.style.background='var(--accent)';},2000);
                                    } else {
                                        btn.textContent = '✗ AE'; btn.style.background='#ff3b30'; btn.style.opacity='1';
                                        setTimeout(()=>{btn.textContent='+ Import';btn.style.background='var(--accent)';},3000);
                                    }
                                });
                            } catch(e) {
                                btn.textContent = '✗ FS'; btn.style.background='#ff3b30'; btn.style.opacity='1';
                                setTimeout(()=>{btn.textContent='+ Import';btn.style.background='var(--accent)';},3000);
                            }
                        });
                        res.on('error', () => {
                            btn.textContent = '✗ Net'; btn.style.background='#ff3b30'; btn.style.opacity='1';
                            setTimeout(()=>{btn.textContent='+ Import';btn.style.background='var(--accent)';},3000);
                        });
                    }).on('error', () => {
                        btn.textContent = '✗ Net'; btn.style.background='#ff3b30'; btn.style.opacity='1';
                        setTimeout(()=>{btn.textContent='+ Import';btn.style.background='var(--accent)';},3000);
                    });
                }

                download(url, 0);

            } catch(err) {
                const escaped = url.replace(/"/g, '\\"');
                const safeTitle = title.replace(/"/g, '\\"');
                csInterface.evalScript(`importAudioFromUrl("${escaped}", "${safeTitle}")`, (result) => {
                    btn.style.opacity = '1';
                    if (result === 'OK') {
                        btn.textContent = '✓'; btn.style.background = '#30d158';
                        setTimeout(() => { btn.textContent = '+ Import'; btn.style.background = 'var(--accent)'; }, 2000);
                    } else {
                        btn.textContent = '✗'; btn.style.background = '#ff3b30';
                        setTimeout(() => { btn.textContent = '+ Import'; btn.style.background = 'var(--accent)'; }, 3000);
                    }
                });
            }
        };
    });
}


function handleDrop(e, row, col) {
    e.preventDefault();
    if(!draggedElement)return;
    const el=draggedElement;
    col=Math.max(1,Math.min(col,GRID_COLS-el.colSpan+1));
    row=Math.max(1,row);
    if(!isAreaOccupied(row,col,el.rowSpan,el.colSpan,el.id)){el.row=row;el.col=col;save();renderGrid();renderElements();}
}

// ==========================================================================
// MODE ÉDITION
// ==========================================================================
function toggleEditMode() {
    editMode=!editMode;
    document.getElementById('addTriggerBtn').style.display=editMode?'flex':'none';
    document.getElementById('addButtons').classList.remove('open');
    renderGrid();renderElements();
}

// ==========================================================================
// AJOUT D'ÉLÉMENTS
// ==========================================================================
function addElement(type) {
    const sz={graph:3,anchor:2,shortcut:1,trends:3};
    let rs=sz[type]||1;
    let cs=(type==='trends')?Math.min(3,GRID_COLS):(sz[type]||1);
    for(let r=1;r<=GRID_ROWS-rs+1;r++){
        for(let c=1;c<=GRID_COLS-cs+1;c++){
            if(!isAreaOccupied(r,c,rs,cs)){
                const n={id:Date.now(),type,row:r,col:c,rowSpan:rs,colSpan:cs};
                if(type==='shortcut'){n.actionType='base';n.action='createSolid';n.label='SLD';}
                if(type==='graph'){n.curve={x1:0.3,y1:0.1,x2:0.7,y2:0.9};}
                elements.push(n);save();renderGrid();renderElements();return;
            }
        }
    }
    csInterface.evalScript('nativeAlert("Not enough space!\\nEnlarge the panel or remove an element to add a new one.")');
}

function isAreaOccupied(r,c,rs,cs,excludeId){
    return elements.some(el=>{if(excludeId&&el.id===excludeId)return false;return c<el.col+el.colSpan&&c+cs>el.col&&r<el.row+el.rowSpan&&r+rs>el.row;});
}
function deleteElement(id){elements=elements.filter(el=>el.id!==id);save();renderGrid();renderElements();}
function save(){localStorage.setItem('aeSmartPanel',JSON.stringify(elements));}

// ==========================================================================
// EXÉCUTION ACTIONS
// ==========================================================================
function executeAction(el) {
    if(el.type!=='shortcut')return;
    if(el.actionType==='base'&&el.action){
        if(el.action==='createSolid'){
            const col=(el.solidColor||null);
            if(col){
                const c=col.replace('#','');
                const r=parseInt(c.substring(0,2),16)/255,g=parseInt(c.substring(2,4),16)/255,b=parseInt(c.substring(4,6),16)/255;
                csInterface.evalScript(`createSolidWithColor(${r},${g},${b})`,()=>{});
            } else {
                csInterface.evalScript('createSolid()',()=>{});
            }
        } else {
            csInterface.evalScript(`${el.action}()`,()=>{});
        }
    } else if(el.actionType==='preset'&&el.presetPath){
        const p=el.presetPath.replace(/\\/g,'\\\\').replace(/"/g,'\\"');
        csInterface.evalScript(`applyPreset("${p}")`,(r)=>{if(r&&(r.includes('Erreur')||r.includes('introuvable')||r.includes('Aucun')))csInterface.evalScript(`nativeAlert("${r}")`);});
    } else if(el.actionType==='custom'&&el.customCode){
        csInterface.evalScript(el.customCode,(r)=>{if(r&&r.startsWith&&r.startsWith('Error'))csInterface.evalScript(`nativeAlert("JSX Error: ${r.replace(/"/g,'\\"')}")`);});
    }
}

// ==========================================================================
// MODAL CONFIG SHORTCUT
// ==========================================================================
function openConfigModal(id) {
    const el=elements.find(e=>e.id===id); if(!el) return;
    const modal=document.createElement('div'); modal.className='config-modal';

    let currentAction = el.actionType==='preset' ? 'preset' : el.actionType==='custom' ? 'custom' : (el.action||'createSolid');

    modal.innerHTML=`
    <div class="config-modal-content" style="display:flex;flex-direction:column;max-height:90vh;overflow:hidden;">
        <h3 style="flex-shrink:0;margin-bottom:12px;">Shortcut Configuration</h3>
        <div style="flex:1;overflow-y:auto;min-height:0;padding-right:2px;">
            <label>Action:</label>
            <select id="actionSelect" style="width:100%;padding:10px 36px 10px 16px;background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);border-radius:999px;color:white;font-size:13px;font-weight:600;box-sizing:border-box;appearance:none;-webkit-appearance:none;cursor:pointer;background-image:url('data:image/svg+xml;charset=UTF-8,%3Csvg xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22 width%3D%2212%22 height%3D%2212%22 viewBox%3D%220 0 24 24%22 fill%3D%22none%22 stroke%3D%22white%22 stroke-width%3D%223%22 stroke-linecap%3D%22round%22 stroke-linejoin%3D%22round%22%3E%3Cpolyline points%3D%226 9 12 15 18 9%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E');background-repeat:no-repeat;background-position:right 14px center;background-size:12px;outline:none;">
                <option value="createSolid">Create a Solid (SLD)</option>
                <option value="createTextLayer">Create a Text (TXT)</option>
                <option value="createShapeLayer">Create a Shape (SHP)</option>
                <option value="createAdjustmentLayer">Create an Adjustment (ADJ)</option>
                <option value="createNullLayer">Create a Null (NULL)</option>
                <option value="createCamera">Create a Camera (CAM)</option>
                <option value="createLight">Create a Light (LGT)</option>
                <option value="precomposeLayers">Pre-compose (PRC)</option>
                <option value="reverseLayers">Reverse Layers (REV)</option>
                <option value="sequenceLayers">Sequence Layers (SEQ)</option>
                <option value="adaptKeyframes">Adapt Keyframes (AKF)</option>
                <option value="preset">Custom Preset (.ffx)</option>
                <option value="custom">Custom Script (.jsx)</option>
            </select>

            <div id="solidColorContainer" style="display:none;margin-top:8px;">
                <label style="display:flex;align-items:center;gap:8px;">
                    <input type="checkbox" id="useSolidColor" style="width:16px;height:16px;cursor:pointer;">
                    Custom Color
                </label>
                <div id="colorPickerWrapper" style="margin-top:8px;display:none;">
                    <div id="colorPreviewBar" style="width:100%;height:32px;border-radius:10px;border:1px solid rgba(255,255,255,0.15);box-sizing:border-box;"></div>                    <input type="color" id="solidColorPicker" value="${el.solidColor||'#ff0000'}" style="display:none;">
                    <div style="display:flex;align-items:center;gap:8px;margin-top:6px;">
                        <span style="font-size:11px;color:rgba(255,255,255,0.5);">#</span>
                        <input type="text" id="colorHexInput" maxlength="6" placeholder="ff0000"
                            style="flex:1;background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);border-radius:8px;color:white;font-size:12px;font-family:monospace;padding:6px 10px;outline:none;box-sizing:border-box;">
                    </div>
                </div>
            </div>
            <div id="presetContainer" style="display:none;margin-top:8px;">
                <label>Preset file:</label>
                <div class="file-input-group">
                    <input type="text" id="presetPathInput" readonly>
                    <button id="browseBtn" class="browse-btn">Browse</button>
                </div>
                <label>Label (3 letters):</label>
                <input type="text" id="customLabelInput" maxlength="3" placeholder="E.g.: GLW">
            </div>
            <div id="customJsxContainer" style="display:none;margin-top:8px;">
                <label>Label (3 letters):</label>
                <input type="text" id="jsxLabelInput" maxlength="3" placeholder="E.g.: RUN">
                <label>JSX Code:</label>
                <textarea id="jsxCodeInput" placeholder="// ExtendScript code" style="min-height:60px;resize:vertical;width:100%;box-sizing:border-box;"></textarea>
            </div>
        </div>
        <div class="modal-buttons" style="flex-shrink:0;margin-top:16px;">
            <button id="cancelBtn" class="modal-btn cancel-btn">Cancel</button>
            <button id="saveBtn"   class="modal-btn save-btn">Save</button>
        </div>
    </div>`;
    document.body.appendChild(modal);

    const sel = document.getElementById('actionSelect');
    sel.value = currentAction;
    if(el.actionType==='preset'){ document.getElementById('presetPathInput').value=el.presetPath||''; document.getElementById('customLabelInput').value=el.label||''; }
    else if(el.actionType==='custom'){ document.getElementById('jsxLabelInput').value=el.label||''; document.getElementById('jsxCodeInput').value=el.customCode||''; }
    else if(el.action==='createSolid'&&el.solidColor){
        document.getElementById('useSolidColor').checked=true;
        document.getElementById('solidColorPicker').value=el.solidColor;
    }

    const upd=()=>{
        currentAction = sel.value;
        document.getElementById('solidColorContainer').style.display=sel.value==='createSolid'?'block':'none';
        document.getElementById('presetContainer').style.display=sel.value==='preset'?'block':'none';
        document.getElementById('customJsxContainer').style.display=sel.value==='custom'?'block':'none';
    };
    sel.onchange=upd; upd();

    const useSolidColorCb  = document.getElementById('useSolidColor');
    const colorPickerWrapper = document.getElementById('colorPickerWrapper');
    const colorPreviewBar  = document.getElementById('colorPreviewBar');
    const solidColorPicker = document.getElementById('solidColorPicker');
    const colorHexInput    = document.getElementById('colorHexInput');

    const setColor = (hex) => {
        const clean = hex.replace('#','').padEnd(6,'0').slice(0,6);
        colorPreviewBar.style.background = '#' + clean;
        colorHexInput.value = clean;
        solidColorPicker.value = '#' + clean;
    };

    const initColor = el.solidColor || '#ff0000';
    setColor(initColor);

    useSolidColorCb.onchange = () => {
        colorPickerWrapper.style.display = useSolidColorCb.checked ? 'block' : 'none';
    };
    if (useSolidColorCb.checked) colorPickerWrapper.style.display = 'block';

    solidColorPicker.oninput = (e) => setColor(e.target.value);

    colorHexInput.oninput = (e) => {
        const val = e.target.value.replace(/[^0-9a-fA-F]/g,'');
        e.target.value = val;
        if (val.length === 6) {
            colorPreviewBar.style.background = '#' + val;
            solidColorPicker.value = '#' + val;
        }
    };

    document.getElementById('browseBtn').onclick=()=>csInterface.evalScript('selectPresetFile()',(r)=>{if(r&&r!=='null'&&r!=='')document.getElementById('presetPathInput').value=r;});
    document.getElementById('cancelBtn').onclick=()=>modal.remove();
    document.getElementById('saveBtn').onclick=()=>{
        const v=sel.value;
        if(v==='preset'){el.actionType='preset';el.presetPath=document.getElementById('presetPathInput').value;el.label=document.getElementById('customLabelInput').value||'FX';}
        else if(v==='custom'){el.actionType='custom';el.label=document.getElementById('jsxLabelInput').value||'JSX';el.customCode=document.getElementById('jsxCodeInput').value;}
        else{
            el.actionType='base';el.action=v;
            if(v==='createSolid'){
                const useColor=document.getElementById('useSolidColor').checked;
                el.solidColor=useColor?('#'+colorHexInput.value.padEnd(6,'0').slice(0,6)):null;
                el.label=useColor?'SLD+':'SLD';
            } else {
                delete el.solidColor;
                el.label=baseActions[v]?.label||v.slice(0,4).toUpperCase();
            }
        }
        save();renderElements();modal.remove();
    };
    modal.onclick=(e)=>{if(e.target===modal)modal.remove();};
}

// ==========================================================================
// VÉRIFICATION MISES À JOUR
// ==========================================================================
const URL_VERSION_GITHUB="https://raw.githubusercontent.com/kjjedit/SmartTool/refs/heads/main/version.json";
const VERSION_LOCALE="1.0.0";
async function verifierMiseAJour(){
    try{const rep=await fetch(URL_VERSION_GITHUB+"?t="+Date.now());const data=await rep.json();
        if(data.version!==VERSION_LOCALE){const msg="A new version ("+data.version+") of SmartTool is available.\\nWould you like to update now?";
            new CSInterface().evalScript("confirm('"+msg+"')",(r)=>{if(r==="true"){const url="https://github.com/kjjedit/SmartTool/archive/refs/heads/main.zip";if(window.cep)window.cep.util.openURLInDefaultBrowser(url);else window.open(url);}});
        }
    }catch(e){console.error("Update check error:",e);}
}
verifierMiseAJour();
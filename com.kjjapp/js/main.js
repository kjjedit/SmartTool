let csInterface = new CSInterface();
let editMode = false;
let draggedElement = null;

const GRID_COLS = 4;
const GRID_ROWS = 6;

let elements = JSON.parse(localStorage.getItem('aeSmartPanel')) || [
    { id: 1, type: 'graph', row: 1, col: 1, rowSpan: 3, colSpan: 3, curve: { x1: 0.3, y1: 0.1, x2: 0.7, y2: 0.9 } },
    { id: 2, type: 'shortcut', row: 1, col: 4, rowSpan: 1, colSpan: 1, actionType: 'base', action: 'createSolid', label: 'SOL', presetPath: null }
];

const baseActions = {
    'createSolid': { label: 'SOL', name: 'Create a Solid' },
    'createTextLayer': { label: 'TXT', name: 'Create a Text Layer' },
    'createShapeLayer': { label: 'SHP', name: 'Create a Shape' },
    'createAdjustmentLayer': { label: 'ADJ', name: 'Create an Adjustment Layer' },
    'createNullLayer': { label: 'NULL', name: 'Create a Null' },
    'createCamera': { label: 'CAM', name: 'Create a Camera' },
    'createLight': { label: 'LGT', name: 'Create a Light' },
    'precomposeLayers': { label: 'PRC', name: 'Pre-compose' }, 
    'reverseLayers': { label: 'REV', name: 'Reverse Layer Order' },
    'sequenceLayers': { label: 'SEQ', name: 'Sequence (1f)' }
};

document.addEventListener('DOMContentLoaded', () => {
    renderGrid();
    renderElements();
    document.getElementById('editBtn').addEventListener('click', toggleEditMode);
    document.getElementById('settingsBtn').addEventListener('click', openSettings);
    document.getElementById('addShortcut').addEventListener('click', () => addElement('shortcut'));
    document.getElementById('addGraph').addEventListener('click', () => addElement('graph'));
    document.getElementById('addAnchor').addEventListener('click', () => addElement('anchor'));
    document.getElementById('addAlign').addEventListener('click', () => addElement('align'));
});

function renderGrid() {
    const grid = document.getElementById('grid');
    grid.innerHTML = '';
    for (let r = 1; r <= GRID_ROWS; r++) {
        for (let c = 1; c <= GRID_COLS; c++) {
            const cell = document.createElement('div');
            cell.className = `grid-cell ${editMode ? 'edit-visible' : ''}`;
            cell.style.gridArea = `${r} / ${c}`;
            if (editMode) {
                cell.ondragover = (e) => e.preventDefault();
                cell.ondrop = (e) => handleDrop(e, r, c);
            }
            grid.appendChild(cell);
        }
    }
}

function renderElements() {
    document.querySelectorAll('.element').forEach(el => el.remove());
    const container = document.getElementById('grid');
    elements.forEach(el => {
        const div = document.createElement('div');
        div.className = `element ${el.type} ${editMode ? 'shaking' : ''}`;
        div.style.display = 'flex';
        div.style.flexDirection = 'column';
        div.style.gridArea = `${el.row} / ${el.col} / span ${el.rowSpan} / span ${el.colSpan}`;
        
        if (el.type === 'graph') {
            initGraphWidget(el, div); 
        } else if (el.type === 'anchor') {
            initAnchorWidget(el, div);
        } else if (el.type === 'align') {
            initAlignWidget(el, div);
        } else {
            const labelSpan = document.createElement('span');
            labelSpan.className = 'shortcut-label';
            labelSpan.textContent = (el.actionType === 'base' && el.action && baseActions[el.action]) ? baseActions[el.action].label : (el.label || '◆');
            div.appendChild(labelSpan);
        }

        if (editMode) {
            div.draggable = true;
            div.ondragstart = () => { draggedElement = el; div.style.opacity = "0.5"; };
            div.ondragend = () => { div.style.opacity = "1"; draggedElement = null; };
            
            // Control badges - positioned AFTER content
            const close = document.createElement('div');
            close.className = 'delete-badge'; close.innerHTML = '−';
            close.onclick = (e) => { e.stopPropagation(); deleteElement(el.id); };
            div.appendChild(close);

            if (el.type === 'shortcut') {
                const configBtn = document.createElement('div');
                configBtn.className = 'config-badge'; configBtn.innerHTML = '⋯';
                configBtn.onclick = (e) => { e.stopPropagation(); openConfigModal(el.id); };
                div.appendChild(configBtn);
            }
            if (el.type === 'graph' || el.type === 'anchor' || el.type === 'align') {
                const resizeBtn = document.createElement('div');
                resizeBtn.className = 'resize-badge';
                if (el.type === 'graph') {
                    resizeBtn.innerHTML = el.colSpan === 3 ? '↗' : '↙';
                    resizeBtn.onclick = (e) => { e.stopPropagation(); toggleGraphSize(el.id); };
                } else {
                    resizeBtn.innerHTML = el.colSpan === 2 ? '↗' : '↙';
                    resizeBtn.onclick = (e) => { e.stopPropagation(); toggleWidgetSize(el.id); };
                }
                div.appendChild(resizeBtn);
            }
        } else if (el.type !== 'graph' && el.type !== 'anchor' && el.type !== 'align') {
            div.onclick = () => executeAction(el);
        }
        container.appendChild(div);
    });
}

function initGraphWidget(el, container) {
    if (!el.curve) el.curve = { x1: 0.3, y1: 0.1, x2: 0.7, y2: 0.9 };
    
    container.style.aspectRatio = "1/1";
    container.style.width = "100%";
    container.style.height = "auto";
    container.style.justifySelf = "center";
    container.style.alignSelf = "center";
    
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.justifyContent = 'space-between';
    container.style.padding = '5%'; 
    container.style.boxSizing = 'border-box';

    container.innerHTML = `
        <div class="canvas-parent" style="flex-grow: 1; width: 100%; background:#0e0e0e; border-radius:10px; overflow:hidden; position:relative;">
            <canvas id="canvas-${el.id}" style="position:absolute; top:0; left:0; width:100%; height:100%;"></canvas>
        </div>
        <div class="graph-btn-container" style="display:flex; gap:4%; height:18%; width:100%; align-items:center; justify-content:center; margin-top:5%; pointer-events:${editMode ? 'none' : 'auto'};">
            <button class="inv-btn" style="height:100%; aspect-ratio:1/1; background:#3a3a3c; border:none; border-radius:50%; cursor:pointer; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                <svg width="60%" height="60%" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="1 4 1 10 7 10"></polyline>
                    <polyline points="23 20 23 14 17 14"></polyline>
                    <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"></path>
                </svg>
            </button>
            <button class="reset-btn" style="height:100%; aspect-ratio:1/1; background:#3a3a3c; border:none; border-radius:50%; cursor:pointer; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                <svg width="60%" height="60%" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="23 4 23 10 17 10"></polyline>
                    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
                </svg>
            </button>
            <button class="app-btn" style="flex-grow:1; height:100%; background:#3a3a3c; color:white; border:none; border-radius:999px; font-size: clamp(7px, 2.5vw, 10px); font-weight:bold; cursor:pointer; white-space:nowrap; padding:0 4px;">APPLY</button>
        </div>
    `;

    const canvas = container.querySelector('canvas');
    const ctx = canvas.getContext('2d');
    
    const draw = () => {
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;
        const w = canvas.width;
        const h = canvas.height;
        if (w === 0 || h === 0) return;
        
        ctx.clearRect(0, 0, w, h);
        ctx.strokeStyle = '#222'; 
        ctx.lineWidth = 1;
        for(let i = 1; i < 4; i++) {
            ctx.beginPath(); ctx.moveTo(i * (w / 4), 0); ctx.lineTo(i * (w / 4), h); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(0, i * (h / 4)); ctx.lineTo(w, i * (h / 4)); ctx.stroke();
        }
        
        ctx.beginPath();
        ctx.moveTo(0, h);
        ctx.bezierCurveTo(el.curve.x1 * w, h - (el.curve.y1 * h), el.curve.x2 * w, h - (el.curve.y2 * h), w, 0);
        ctx.strokeStyle = '#5ac8fa'; 
        ctx.shadowBlur = 4; ctx.shadowColor = '#5ac8fa';
        ctx.lineWidth = 3; ctx.stroke();
        ctx.shadowBlur = 0; 

        ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(0, h); ctx.lineTo(el.curve.x1 * w, h - (el.curve.y1 * h)); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(w, 0); ctx.lineTo(el.curve.x2 * w, h - (el.curve.y2 * h)); ctx.stroke();
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath(); ctx.arc(el.curve.x1 * w, h - (el.curve.y1 * h), 3, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(el.curve.x2 * w, h - (el.curve.y2 * h), 3, 0, Math.PI * 2); ctx.fill();
    };

    new ResizeObserver(draw).observe(container);

    container.querySelector('.inv-btn').onclick = (e) => {
        e.stopPropagation();
        const old = { ...el.curve };
        el.curve.x1 = 1 - old.x2; el.curve.y1 = 1 - old.y2;
        el.curve.x2 = 1 - old.x1; el.curve.y2 = 1 - old.y1;
        draw(); save();
    };
    
    container.querySelector('.reset-btn').onclick = (e) => {
        e.stopPropagation();
        el.curve.x1 = 0; el.curve.y1 = 0;
        el.curve.x2 = 1; el.curve.y2 = 1;
        draw(); save();
    };

    const appBtn = container.querySelector('.app-btn');
    appBtn.onclick = (e) => {
        e.stopPropagation();
        
        appBtn.classList.add('flash-active');
        setTimeout(() => appBtn.classList.remove('flash-active'), 400);

        const x1 = el.curve.x1.toFixed(3);
        const y1 = el.curve.y1.toFixed(3);
        const x2 = el.curve.x2.toFixed(3);
        const y2 = el.curve.y2.toFixed(3);
        const script = `applyEaseToSelectedKeys(${x1}, ${y1}, ${x2}, ${y2})`;
        
        csInterface.evalScript(script, (result) => {
            if (result === "NO_COMP") {
                csInterface.evalScript('No active composition")');
            return;
            } else if (result === "NO_SELECTION") {
                csInterface.evalScript('No selected property")');
            return;
            } else if (result === "NO_KEYS") {
                csInterface.evalScript('No keyframe found")');
            return;
            }
        });
    };

    canvas.onmousedown = (e) => {
        if (editMode) return;
        e.stopPropagation();
        e.preventDefault();
        const rect = canvas.getBoundingClientRect();
        const update = (me) => {
            const mx = Math.max(0, Math.min(1, (me.clientX - rect.left) / rect.width));
            const my = Math.max(0, Math.min(1, 1 - (me.clientY - rect.top) / rect.height));
            const d1 = Math.hypot(mx - el.curve.x1, my - el.curve.y1);
            const d2 = Math.hypot(mx - el.curve.x2, my - el.curve.y2);
            if (d1 < d2) { el.curve.x1 = mx; el.curve.y1 = my; } 
            else { el.curve.x2 = mx; el.curve.y2 = my; }
            draw();
        };
        window.onmousemove = update;
        window.onmouseup = () => { window.onmousemove = null; save(); };
    };
}

function initAnchorWidget(el, container) {
    container.style.boxSizing = 'border-box';
    container.style.padding = '8%';
    container.style.display = 'grid';
    container.style.gridTemplateColumns = 'repeat(3, 1fr)';
    container.style.gap = '4%';
    container.style.aspectRatio = "1/1";
    container.style.justifySelf = "center";
    container.style.alignSelf = "center";
    
    const positions = [
        {pos: 'tl', icon: 'anchor-tl.svg', transform: 'scale(0.4)', origin: 'top left'}, 
        {pos: 'tc', icon: 'anchor-tc.svg', transform: 'scale(0.8) translate(0, -25%)', origin: 'top center'}, 
        {pos: 'tr', icon: 'anchor-tr.svg', transform: 'scale(0.4)', origin: 'top right'},
        {pos: 'ml', icon: 'anchor-ml.svg', transform: 'scale(0.8) translate(-25%, 0)', origin: 'center left'}, 
        {pos: 'mc', icon: 'anchor-mc.svg', transform: 'scale(0.8)', origin: 'center center'}, 
        {pos: 'mr', icon: 'anchor-mr.svg', transform: 'scale(0.8) translate(25%, 0)', origin: 'center right'},
        {pos: 'bl', icon: 'anchor-bl.svg', transform: 'scale(0.4)', origin: 'bottom left'}, 
        {pos: 'bc', icon: 'anchor-bc.svg', transform: 'scale(0.8) translate(0, 25%)', origin: 'bottom center'}, 
        {pos: 'br', icon: 'anchor-br.svg', transform: 'scale(0.4)', origin: 'bottom right'}
    ];

    container.innerHTML = positions.map(p => `
        <button class="anchor-btn" data-pos="${p.pos}" 
            style="background:#3a3a3c; border:none; border-radius:clamp(4px, 1vw, 6px); cursor:pointer; display:flex; align-items:center; justify-content:center; padding:0; width:100%; aspect-ratio:1/1; position:relative;">
            <img src="./icons/${p.icon}" 
                 style="width:100%; height:100%; object-fit:contain; transform: ${p.transform}; transform-origin: ${p.origin}; filter: drop-shadow(0 0 3px #5ac8fa);">
        </button>
    `).join('');
    
    container.querySelectorAll('.anchor-btn').forEach(btn => {
        btn.onclick = (e) => { e.stopPropagation(); csInterface.evalScript(`setAnchorPoint("${btn.dataset.pos}")`); };
    });
}

function initAlignWidget(el, container) {
    container.style.boxSizing = 'border-box';
    container.style.padding = '8%';
    container.style.display = 'grid';
    container.style.gridTemplateColumns = 'repeat(3, 1fr)';
    container.style.gap = '4%';
    container.style.aspectRatio = "1/1";
    container.style.justifySelf = "center";
    container.style.alignSelf = "center";
    
    const aligns = ['tl', 'tc', 'tr', 'ml', 'mc', 'mr', 'bl', 'bc', 'br'];

    container.innerHTML = aligns.map(a => `
        <button class="align-grid-btn" data-align="${a}" style="width:100%; aspect-ratio:1/1; border-radius:clamp(4px, 1vw, 6px); border:none; background:#3a3a3c; cursor:pointer;"></button>
    `).join('');
    
    container.querySelectorAll('.align-grid-btn').forEach(btn => {
        btn.onclick = (e) => { e.stopPropagation(); csInterface.evalScript(`alignLayer("${btn.dataset.align}")`); };
    });
}

function handleDrop(e, row, col) {
    e.preventDefault();
    if (!draggedElement) return;
    if (col + draggedElement.colSpan - 1 > GRID_COLS) col = GRID_COLS - draggedElement.colSpan + 1;
    if (row + draggedElement.rowSpan - 1 > GRID_ROWS) row = GRID_ROWS - draggedElement.rowSpan + 1;
    const conflict = isAreaOccupied(row, col, draggedElement.rowSpan, draggedElement.colSpan, draggedElement.id);
    if (!conflict) { draggedElement.row = row; draggedElement.col = col; save(); renderElements(); }
}

function toggleEditMode() {
    editMode = !editMode;
    const addButtons = document.getElementById('addButtons');
    addButtons.style.display = editMode ? 'block' : 'none';
    renderGrid();
    renderElements();
}

function addElement(type) {
    let rs = type === 'graph' ? 3 : (type === 'anchor' || type === 'align' ? 2 : 1);
    let cs = type === 'graph' ? 3 : (type === 'anchor' || type === 'align' ? 2 : 1);
    for (let r = 1; r <= GRID_ROWS - rs + 1; r++) {
        for (let c = 1; c <= GRID_COLS - cs + 1; c++) {
            if (!isAreaOccupied(r, c, rs, cs)) {
                const newEl = { id: Date.now(), type, row: r, col: c, rowSpan: rs, colSpan: cs };
                if (type === 'shortcut') { newEl.actionType = 'base'; newEl.action = 'createSolid'; newEl.label = 'SOL'; }
                if (type === 'graph') { newEl.curve = { x1: 0.3, y1: 0.1, x2: 0.7, y2: 0.9 }; }
                elements.push(newEl); save(); renderElements(); return;
            }
        }
    }
    csInterface.evalScript('nativeAlert("No space left!\\n\\nImpossible to add a new element.")');
}

function isAreaOccupied(r, c, rs, cs, excludeId) {
    return elements.some(el => {
        if (excludeId && el.id === excludeId) return false;
        return c < el.col + el.colSpan && c + cs > el.col && r < el.row + el.rowSpan && r + rs > el.row;
    });
}

function toggleWidgetSize(id) {
    const el = elements.find(e => e.id === id);
    if (!el || (el.type !== 'anchor' && el.type !== 'align')) return;
    const newSize = el.colSpan === 2 ? 3 : 2;
    
    if (el.col + newSize - 1 > GRID_COLS || el.row + newSize - 1 > GRID_ROWS) {
        csInterface.evalScript('nativeAlert("Cannot resize!\\n\\nThe widget is too close to the grid edge. Move it to resize.")');
        return;
    }
    
    if (isAreaOccupied(el.row, el.col, newSize, newSize, el.id)) {
        csInterface.evalScript('nativeAlert("Space occupied!\\n\\nImpossible to resize because other elements are in the way. Move or delete them first.")');
        return;
    }
    
    el.rowSpan = newSize; el.colSpan = newSize; save(); renderElements();
}

function toggleGraphSize(id) {
    const el = elements.find(e => e.id === id);
    if (!el || el.type !== 'graph') return;
    const newSize = el.colSpan === 3 ? 4 : 3;
    
    if (el.col + newSize - 1 > GRID_COLS || el.row + newSize - 1 > GRID_ROWS) {
        csInterface.evalScript('nativeAlert("Cannot resize!\\n\\nThe widget is too close to the grid edge. Move it to resize.")');
        return;
    }
    
    if (isAreaOccupied(el.row, el.col, newSize, newSize, el.id)) {
        csInterface.evalScript('nativeAlert("Space occupied!\\n\\nImpossible to resize because other elements are in the way. Move or delete them first.")');
        return;
    }
    
    el.rowSpan = newSize; el.colSpan = newSize; save(); renderElements();
}

function deleteElement(id) {
    elements = elements.filter(el => el.id !== id);
    save(); renderElements();
}

function save() { 
    localStorage.setItem('aeSmartPanel', JSON.stringify(elements)); 
}

function executeAction(el) { 
    if(el.type === 'shortcut') {
        if (el.actionType === 'base' && el.action) {
            console.log('Executing base action:', el.action);
            csInterface.evalScript(`${el.action}()`, function(result) {
                console.log('Base action executed:', result);
            });
        } else if (el.actionType === 'preset' && el.presetPath) {
            var escapedPath = el.presetPath.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
            console.log('Attempting to apply preset:', escapedPath);
            csInterface.evalScript(`applyPreset("${escapedPath}")`, function(result) {
                console.log('Preset result:', result);
                if (result && result.indexOf('Erreur') === -1 && result.indexOf('introuvable') === -1 && result.indexOf('Aucun') === -1) {
                } else {
                    const msg = result || 'Unknown error while applying preset';
                    csInterface.evalScript(`nativeAlert("${msg}")`);
                }
            });
        }
    }
}

function openSettings() { alert('Settings panel coming soon...'); }

function openConfigModal(id) {
    const el = elements.find(e => e.id === id);
    if (!el) return;
    const modal = document.createElement('div');
    modal.className = 'config-modal';
modal.innerHTML = `
    <div class="config-modal-content">
        <h3>Shortcut Configuration</h3>
        <label>Action:</label>
        <select id="actionSelect">
            <option value="createSolid">Create a Solid (SOL)</option>
            <option value="createTextLayer">Create a Text (TXT)</option>
            <option value="createShapeLayer">Create a Shape (SHP)</option>
            <option value="createAdjustmentLayer">Create an Adjustment (ADJ)</option>
            <option value="createNullLayer">Create a Null (NULL)</option>
            <option value="createCamera">Create a Camera (CAM)</option>
            <option value="createLight">Create a Light (LGT)</option>
            <option value="precomposeLayers">Pre-compose (PRC)</option>
            <option value="reverseLayers">Reverse Layers (REV)</option>
            <option value="sequenceLayers">Sequence Layers (SEQ)</option>
            <option value="preset">Custom Preset</option>
        </select>
            <div id="presetContainer" style="display: none;">
                <label>Preset file:</label>
                <div class="file-input-group">
                    <input type="text" id="presetPathInput" readonly>
                    <button id="browseBtn" class="browse-btn">Browse</button>
                </div>
                <label>Custom Label (3 letters max):</label>
                <input type="text" id="customLabelInput" maxlength="3" placeholder="E.g.: GLW, BLR, CC">
            </div>
            <div class="modal-buttons">
                <button id="cancelBtn" class="modal-btn cancel-btn">Cancel</button>
                <button id="saveBtn" class="modal-btn save-btn">Save</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    const actionSelect = document.getElementById('actionSelect');
    if (el.actionType === 'preset') {
        actionSelect.value = 'preset';
        document.getElementById('presetPathInput').value = el.presetPath || '';
        document.getElementById('customLabelInput').value = el.label || '';
    } else { actionSelect.value = el.action || 'createSolid'; }

    const updatePresetContainer = () => { document.getElementById('presetContainer').style.display = actionSelect.value === 'preset' ? 'block' : 'none'; };
    actionSelect.onchange = updatePresetContainer;
    updatePresetContainer();

    document.getElementById('browseBtn').onclick = (e) => {
        console.log('Opening file selector...');
        csInterface.evalScript('selectPresetFile()', (result) => {
            console.log('File selected:', result);
            if (result && result !== 'null' && result !== '') {
                document.getElementById('presetPathInput').value = result;
            }
        });
    };
    document.getElementById('cancelBtn').onclick = () => modal.remove();
    document.getElementById('saveBtn').onclick = () => {
        if (actionSelect.value === 'preset') {
            el.actionType = 'preset'; 
            el.presetPath = document.getElementById('presetPathInput').value; 
            el.label = document.getElementById('customLabelInput').value || 'FX';
            console.log('Preset saved:', el);
        } else {
            el.actionType = 'base'; 
            el.action = actionSelect.value; 
            el.label = baseActions[actionSelect.value].label;
            console.log('Base action saved:', el);
        }
        save(); renderElements(); modal.remove();
    };
    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
}

function adjustColor(color, amount) {
    const num = parseInt(color.replace('#', ''), 16);
    const r = Math.max(0, Math.min(255, (num >> 16) + amount));
    const g = Math.max(0, Math.min(255, ((num >> 8) & 0x00FF) + amount));
    const b = Math.max(0, Math.min(255, (num & 0x0000FF) + amount));
    return '#' + (0x1000000 + (r << 16) + (g << 8) + b).toString(16).slice(1);
}
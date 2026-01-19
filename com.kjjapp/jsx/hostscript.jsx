function createSolid() {
    app.beginUndoGroup("Create Solid");
    var comp = app.project.activeItem;
    if (!comp || !(comp instanceof CompItem)) return;

    var sel = comp.selectedLayers;
    var w = comp.width;
    var h = comp.height;
    var startTime = 0;
    var duration = comp.duration;

    if (sel.length > 0) {
        var ref = sel[0];
        if (ref.hasVideo) {
            w = ref.width;
            h = ref.height;
        }
        startTime = ref.inPoint;
        duration = ref.outPoint - ref.inPoint;
    }

    var solid = comp.layers.addSolid([1, 0, 0], "Solid", w, h, comp.pixelAspect, comp.duration);
    
    if (sel.length > 0) {
        var ref = sel[0];
        solid.moveBefore(ref);
        solid.startTime = ref.startTime;
        solid.inPoint = ref.inPoint;
        solid.outPoint = ref.outPoint;

        if (ref.hasVideo && ref.property("ADBE Transform Group").property("ADBE Position")) {
            solid.property("Position").setValue(ref.property("Position").value);
        }
    }
    app.endUndoGroup();
}

function applyPreset(presetPath) {
    app.beginUndoGroup("Apply Preset");
    try {
        var comp = app.project.activeItem;
        if (!comp || !(comp instanceof CompItem)) {
            app.endUndoGroup();
            return "No active composition";
        }
        
        var selectedLayers = comp.selectedLayers;
        if (selectedLayers.length === 0) {
            app.endUndoGroup();
            return "No layer selected";
        }
        
        var presetFile = new File(presetPath);
        if (!presetFile.exists) {
            app.endUndoGroup();
            return "Preset file not found: " + presetPath;
        }
        
        selectedLayers[0].applyPreset(presetFile);
        app.endUndoGroup();
        return "Preset applied successfully";
        
    } catch (e) {
        app.endUndoGroup();
        return "Error: " + e.toString();
    }
}

function selectPresetFile() {
    try {
        var presetFile = File.openDialog("Select a preset (.ffx)", "*.ffx");
        if (presetFile && presetFile.exists) {
            return presetFile.fsName;
        }
    } catch (e) { }
    return "";
}

function createShapeLayer() {
    app.beginUndoGroup("Create Shape Layer");
    var comp = app.project.activeItem;
    
    if (comp && comp instanceof CompItem) {
        var selectedLayers = comp.selectedLayers;
        
        if (selectedLayers.length > 0) {
            var refLayer = selectedLayers[0];
            var layerInPoint = refLayer.inPoint;
            var layerOutPoint = refLayer.outPoint;
            
            var shapeLayer = comp.layers.addShape();
            shapeLayer.moveBefore(refLayer);
            shapeLayer.startTime = layerInPoint;
            shapeLayer.inPoint = layerInPoint;
            shapeLayer.outPoint = layerOutPoint;
            
            shapeLayer.property("ADBE Transform Group").property("ADBE Position").setValue(
                refLayer.property("ADBE Transform Group").property("ADBE Position").value
            );
        } else {
            comp.layers.addShape();
        }
    }
    
    app.endUndoGroup();
}

function createTextLayer(textContent) {
    app.beginUndoGroup("Create Text Layer");
    var comp = app.project.activeItem;
    
    if (comp && comp instanceof CompItem) {
        var selectedLayers = comp.selectedLayers;
        
        if (selectedLayers.length > 0) {
            var refLayer = selectedLayers[0];
            var layerInPoint = refLayer.inPoint;
            var layerOutPoint = refLayer.outPoint;
            
            var textLayer = comp.layers.addText(textContent || "New Text");
            textLayer.moveBefore(refLayer);
            textLayer.startTime = layerInPoint;
            textLayer.inPoint = layerInPoint;
            textLayer.outPoint = layerOutPoint;
            
            textLayer.property("ADBE Transform Group").property("ADBE Position").setValue(
                refLayer.property("ADBE Transform Group").property("ADBE Position").value
            );
        } else {
            comp.layers.addText(textContent || "New Text");
        }
    }
    
    app.endUndoGroup();
}

function createAdjustmentLayer() {
    app.beginUndoGroup("Create Adjustment Layer");
    var comp = app.project.activeItem;
    if (!comp) return;

    var sel = comp.selectedLayers;
    var w = comp.width;
    var h = comp.height;

    if (sel.length > 0 && sel[0].hasVideo) {
        w = sel[0].width;
        h = sel[0].height;
    }

    var adj = comp.layers.addSolid([1, 1, 1], "Adjustment Layer", w, h, comp.pixelAspect);
    adj.adjustmentLayer = true;

    if (sel.length > 0) {
        var ref = sel[0];
        adj.moveBefore(ref);
        adj.startTime = ref.startTime;
        adj.inPoint = ref.inPoint;
        adj.outPoint = ref.outPoint;
        
        if (ref.hasVideo) {
            adj.property("Position").setValue(ref.property("Position").value);
        }
    }
    app.endUndoGroup();
}

function createNullLayer() {
    app.beginUndoGroup("Create Null");
    var comp = app.project.activeItem;
    
    if (comp && comp instanceof CompItem) {
        var selectedLayers = comp.selectedLayers;
        
        if (selectedLayers.length > 0) {
            var refLayer = selectedLayers[0];
            var layerInPoint = refLayer.inPoint;
            var layerOutPoint = refLayer.outPoint;
            
            var nullLayer = comp.layers.addNull();
            nullLayer.moveBefore(refLayer);
            nullLayer.startTime = layerInPoint;
            nullLayer.inPoint = layerInPoint;
            nullLayer.outPoint = layerOutPoint;
            
            nullLayer.property("ADBE Transform Group").property("ADBE Position").setValue(
                refLayer.property("ADBE Transform Group").property("ADBE Position").value
            );
        } else {
            comp.layers.addNull();
        }
    }
    
    app.endUndoGroup();
}

function createCamera() {
    app.beginUndoGroup("Create Camera");
    var comp = app.project.activeItem;
    
    if (comp && comp instanceof CompItem) {
        var selectedLayers = comp.selectedLayers;
        
        if (selectedLayers.length > 0) {
            var refLayer = selectedLayers[0];
            var layerInPoint = refLayer.inPoint;
            var layerOutPoint = refLayer.outPoint;
            
            var camera = comp.layers.addCamera("Camera", [comp.width/2, comp.height/2]);
            camera.moveBefore(refLayer);
            camera.startTime = layerInPoint;
            camera.inPoint = layerInPoint;
            camera.outPoint = layerOutPoint;
        } else {
            comp.layers.addCamera("Camera", [comp.width/2, comp.height/2]);
        }
    }
    
    app.endUndoGroup();
}

function createLight() {
    app.beginUndoGroup("Create Light");
    var comp = app.project.activeItem;
    
    if (comp && comp instanceof CompItem) {
        var selectedLayers = comp.selectedLayers;
        
        if (selectedLayers.length > 0) {
            var refLayer = selectedLayers[0];
            var layerInPoint = refLayer.inPoint;
            var layerOutPoint = refLayer.outPoint;
            
            var light = comp.layers.addLight("Light", [comp.width/2, comp.height/2]);
            light.moveBefore(refLayer);
            light.startTime = layerInPoint;
            light.inPoint = layerInPoint;
            light.outPoint = layerOutPoint;
        } else {
            comp.layers.addLight("Light", [comp.width/2, comp.height/2]);
        }
    }
    
    app.endUndoGroup();
}

function precomposeLayers() {
    app.beginUndoGroup("Précomposer avec durée des calques");
    
    try {
        var comp = app.project.activeItem;
        if (!comp || !(comp instanceof CompItem)) {
            alert("Please select an active composition.");
            return;
        }
        
        var selectedLayers = comp.selectedLayers;
        if (!selectedLayers || selectedLayers.length === 0) {
            alert("Please select at least one layer.");
            return;
        }
        
        var minInPoint = selectedLayers[0].inPoint;
        var maxOutPoint = selectedLayers[0].outPoint;
        
        for (var i = 1; i < selectedLayers.length; i++) {
            if (selectedLayers[i].inPoint < minInPoint) {
                minInPoint = selectedLayers[i].inPoint;
            }
            if (selectedLayers[i].outPoint > maxOutPoint) {
                maxOutPoint = selectedLayers[i].outPoint;
            }
        }
        
        var precompDuration = maxOutPoint - minInPoint;
        
        var layerIndices = [];
        for (var i = 0; i < selectedLayers.length; i++) {
            layerIndices.push(selectedLayers[i].index);
        }
        
        var precompName = "Precomp " + (comp.numLayers + 1);
        
        var precomp = comp.layers.precompose(
            layerIndices,
            precompName,
            true
        );
        
        precomp.duration = precompDuration;
        
        for (var i = 1; i <= precomp.numLayers; i++) {
            var layer = precomp.layer(i);
            layer.startTime = layer.startTime - minInPoint;
        }
        
        var precompLayer = comp.layer(precompName);
        precompLayer.startTime = minInPoint;
        
    } catch (error) {
        alert("Error: " + error.toString());
    }
    
    app.endUndoGroup();
}

precomposeWithLayerDuration();

function reverseLayers() {
    app.beginUndoGroup("Reverse Layers Order");
    var comp = app.project.activeItem;
    if (!comp || !(comp instanceof CompItem)) return "NO_COMP";
    
    var sel = [];
    for(var i=0; i<comp.selectedLayers.length; i++) {
        sel.push(comp.selectedLayers[i]);
    }
    
    if (sel.length < 2) return "NEED_MORE_LAYERS";

    sel.sort(function(a, b) { return a.index - b.index; });
    
    var firstIndex = sel[0].index;
    
    for (var i = 1; i < sel.length; i++) {
        sel[i].moveBefore(comp.layer(firstIndex));
    }
    
    app.endUndoGroup();
    return "OK";
}

function sequenceLayers() {
    app.beginUndoGroup("Sequence Trimmed Layers");
    var comp = app.project.activeItem;
    if (!comp || !(comp instanceof CompItem)) return "NO_COMP";
    
    var sel = [];
    for(var i=0; i<comp.selectedLayers.length; i++) {
        sel.push(comp.selectedLayers[i]);
    }
    
    if (sel.length < 2) return "NEED_MORE_LAYERS";

    sel.sort(function(a, b) { return b.index - a.index; });

    for (var i = 1; i < sel.length; i++) {
        var prevLayer = sel[i-1];
        var currentLayer = sel[i];
        
        var delta = prevLayer.outPoint - currentLayer.inPoint;
        
        currentLayer.startTime += delta;
    }
    
    app.endUndoGroup();
    return "OK";
}

function applyEaseToSelectedKeys(x1, y1, x2, y2) {
    app.beginUndoGroup("SmartTool: Flow Precision");
    
    var comp = app.project.activeItem;
    if (!comp || !(comp instanceof CompItem)) return "NO_COMP";
    
    var selectedProps = comp.selectedProperties;
    if (selectedProps.length === 0) return "NO_SELECTION";
    
    var keysFound = false;
    
    for (var i = 0; i < selectedProps.length; i++) {
        var prop = selectedProps[i];
        if (!prop.numKeys || prop.numKeys < 2) continue;

        var selectedKeys = prop.selectedKeys;
        if (selectedKeys.length < 2) continue;
        
        keysFound = true;
        
        var selectedKeysMap = {};
        for (var s = 0; s < selectedKeys.length; s++) {
            selectedKeysMap[selectedKeys[s]] = true;
        }
        
        for (var k = 0; k < selectedKeys.length; k++) {
            var keyIdx = selectedKeys[k];
            var nextKeyIdx = keyIdx + 1;
            
            if (nextKeyIdx <= prop.numKeys && selectedKeysMap[nextKeyIdx]) {
                try {
                    var curTime = prop.keyTime(keyIdx);
                    var nextTime = prop.keyTime(nextKeyIdx);
                    var duration = nextTime - curTime;
                    var val1 = prop.keyValue(keyIdx);
                    var val2 = prop.keyValue(nextKeyIdx);

                    var diff = 0;
                    if (val1 instanceof Array) {
                        var maxDiff = 0;
                        for(var d=0; d<val1.length; d++) {
                            var dDiff = val2[d] - val1[d];
                            if(Math.abs(dDiff) > Math.abs(maxDiff)) maxDiff = dDiff;
                        }
                        diff = maxDiff; 
                    } else {
                        diff = val2 - val1;
                    }
                    var averageSpeed = diff / duration;

                    var influenceOut = Math.max(0.1, x1 * 100);
                    var influenceIn = Math.max(0.1, (1 - x2) * 100);
                    var speedOut = (y1 / Math.max(0.001, x1)) * averageSpeed;
                    var speedIn = ((1 - y2) / Math.max(0.001, 1 - x2)) * averageSpeed;

                    var easeOut = new KeyframeEase(speedOut, influenceOut);
                    var easeIn = new KeyframeEase(speedIn, influenceIn);

                    var dims = (val1 instanceof Array) ? val1.length : 1;
                    var easeOutArray = [], easeInArray = [];
                    for(var n=0; n<dims; n++) {
                        easeOutArray.push(easeOut);
                        easeInArray.push(easeIn);
                    }
                    
                    prop.setTemporalEaseAtKey(keyIdx, prop.keyInTemporalEase(keyIdx), easeOutArray);
                    prop.setTemporalEaseAtKey(nextKeyIdx, easeInArray, prop.keyOutTemporalEase(nextKeyIdx));

                } catch (e) { }
            }
        }
    }
    
    app.endUndoGroup();
    return keysFound ? "OK" : "NO_KEYS";
}

function setAnchorPoint(positionStr) {
    app.beginUndoGroup("Set Anchor Point");
    
    var comp = app.project.activeItem;
    if (!comp || !(comp instanceof CompItem)) {
        app.endUndoGroup();
        return "Error: No active composition";
    }
    
    var selectedLayers = comp.selectedLayers;
    if (selectedLayers.length === 0) {
        app.endUndoGroup();
        return "Error: No layer selected";
    }
    
    for (var i = 0; i < selectedLayers.length; i++) {
        var layer = selectedLayers[i];
        
        var rect = layer.sourceRectAtTime(comp.time, false);
        var l = rect.left;
        var t = rect.top;
        var w = rect.width;
        var h = rect.height;
        
        var anchorProp = layer.property("ADBE Transform Group").property("ADBE Anchor Point");
        var posProp = layer.property("ADBE Transform Group").property("ADBE Position");
        
        var currentAnchor = anchorProp.value;
        var currentPos = posProp.value;
        var newAnchor = [0, 0];
        
        switch(positionStr) {
            case "tl": newAnchor = [l, t]; break;
            case "tc": newAnchor = [l + w / 2, t]; break;
            case "tr": newAnchor = [l + w, t]; break;
            case "ml": newAnchor = [l, t + h / 2]; break;
            case "mc": newAnchor = [l + w / 2, t + h / 2]; break;
            case "mr": newAnchor = [l + w, t + h / 2]; break;
            case "bl": newAnchor = [l, t + h]; break;
            case "bc": newAnchor = [l + w / 2, t + h]; break;
            case "br": newAnchor = [l + w, t + h]; break;
        }
        
        var s = layer.property("ADBE Transform Group").property("ADBE Scale").value / 100;
        
        var deltaX = (newAnchor[0] - currentAnchor[0]) * s[0];
        var deltaY = (newAnchor[1] - currentAnchor[1]) * s[1];
        
        anchorProp.setValue(newAnchor);
        posProp.setValue([currentPos[0] + deltaX, currentPos[1] + deltaY]);
    }
    
    app.endUndoGroup();
    return "OK";
}

function alignLayer(alignment) {
    app.beginUndoGroup("Align Layer Precise");
    
    var comp = app.project.activeItem;
    if (!comp || !(comp instanceof CompItem)) {
        app.endUndoGroup();
        return;
    }
    
    var selectedLayers = comp.selectedLayers;
    if (selectedLayers.length === 0) {
        app.endUndoGroup();
        return;
    }
    
    for (var i = 0; i < selectedLayers.length; i++) {
        var layer = selectedLayers[i];
        
        if (!layer.hasVideo) continue;

        var rect = layer.sourceRectAtTime(comp.time, false);
        var anchor = layer.property("ADBE Transform Group").property("ADBE Anchor Point").value;
        var scale = layer.property("ADBE Transform Group").property("ADBE Scale").value / 100;
        
        var left = (anchor[0] - rect.left) * scale[0];
        var top = (anchor[1] - rect.top) * scale[1];
        var right = (rect.width + rect.left - anchor[0]) * scale[0];
        var bottom = (rect.height + rect.top - anchor[1]) * scale[1];
        var centerX = (rect.width / 2 + rect.left - anchor[0]) * scale[0];
        var centerY = (rect.height / 2 + rect.top - anchor[1]) * scale[1];

        var newPos = [0, 0];

        switch(alignment) {
            // --- TOP ---
            case "tl": newPos = [left, top]; break;
            case "tc": newPos = [comp.width / 2 - centerX, top]; break;
            case "tr": newPos = [comp.width - right, top]; break;

            // --- MIDDLE ---
            case "ml": newPos = [left, comp.height / 2 - centerY]; break;
            case "mc": newPos = [comp.width / 2 - centerX, comp.height / 2 - centerY]; break;
            case "mr": newPos = [comp.width - right, comp.height / 2 - centerY]; break;

            // --- BOTTOM ---
            case "bl": newPos = [left, comp.height - bottom]; break;
            case "bc": newPos = [comp.width / 2 - centerX, comp.height - bottom]; break;
            case "br": newPos = [comp.width - right, comp.height - bottom]; break;
        }
        
        layer.property("ADBE Transform Group").property("ADBE Position").setValue(newPos);
    }
    
    app.endUndoGroup();
}

function nativeAlert(message) {
    alert(message);
}
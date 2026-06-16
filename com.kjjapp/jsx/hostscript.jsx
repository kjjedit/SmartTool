// ==========================================================================
// SMARTTOOL — hostscript.jsx  v1.0
// ==========================================================================

function createSolid() {
    app.beginUndoGroup("Create Solid");
    var comp=app.project.activeItem;if(!comp||!(comp instanceof CompItem)){app.endUndoGroup();return;}
    var sel=comp.selectedLayers;
    var solid=comp.layers.addSolid([1,0,0],"Solid",comp.width,comp.height,comp.pixelAspect,comp.duration);
    if(sel.length>0){var ref=sel[0];solid.moveBefore(ref);solid.startTime=ref.startTime;solid.inPoint=ref.inPoint;solid.outPoint=ref.outPoint;if(ref.hasVideo)solid.property("Position").setValue(ref.property("Position").value);}
    app.endUndoGroup();
}

function createSolidWithColor(r,g,b){
    app.beginUndoGroup("Create Solid (Custom Color)");
    var comp=app.project.activeItem;if(!comp||!(comp instanceof CompItem)){app.endUndoGroup();return;}
    var sel=comp.selectedLayers;
    var solid=comp.layers.addSolid([r,g,b],"Solid",comp.width,comp.height,comp.pixelAspect,comp.duration);
    if(sel.length>0){var ref=sel[0];solid.moveBefore(ref);solid.startTime=ref.startTime;solid.inPoint=ref.inPoint;solid.outPoint=ref.outPoint;if(ref.hasVideo)solid.property("Position").setValue(ref.property("Position").value);}
    app.endUndoGroup();
}

function applyPreset(presetPath){
    app.beginUndoGroup("Apply Preset");
    try{
        var comp=app.project.activeItem;if(!comp||!(comp instanceof CompItem)){app.endUndoGroup();return"No active composition";}
        var sel=comp.selectedLayers;if(sel.length===0){app.endUndoGroup();return"No layer selected";}
        var pf=new File(presetPath);if(!pf.exists){app.endUndoGroup();return"Preset file not found: "+presetPath;}
        sel[0].applyPreset(pf);app.endUndoGroup();return"OK";
    }catch(e){app.endUndoGroup();return"Error: "+e.toString();}
}

function selectPresetFile(){try{var f=File.openDialog("Select a preset (.ffx)","*.ffx");if(f&&f.exists)return f.fsName;}catch(e){}return"";}

function createShapeLayer(){
    app.beginUndoGroup("Create Shape Layer");
    var comp=app.project.activeItem;
    if(comp&&comp instanceof CompItem){var sel=comp.selectedLayers;if(sel.length>0){var ref=sel[0],sl=comp.layers.addShape();sl.moveBefore(ref);sl.startTime=ref.inPoint;sl.inPoint=ref.inPoint;sl.outPoint=ref.outPoint;sl.property("ADBE Transform Group").property("ADBE Position").setValue(ref.property("ADBE Transform Group").property("ADBE Position").value);}else comp.layers.addShape();}
    app.endUndoGroup();
}

function createTextLayer(tc){
    app.beginUndoGroup("Create Text Layer");
    var comp=app.project.activeItem;
    if(comp&&comp instanceof CompItem){var sel=comp.selectedLayers;if(sel.length>0){var ref=sel[0],tl=comp.layers.addText(tc||"New Text");tl.moveBefore(ref);tl.startTime=ref.inPoint;tl.inPoint=ref.inPoint;tl.outPoint=ref.outPoint;tl.property("ADBE Transform Group").property("ADBE Position").setValue(ref.property("ADBE Transform Group").property("ADBE Position").value);}else comp.layers.addText(tc||"New Text");}
    app.endUndoGroup();
}

function createAdjustmentLayer(){
    app.beginUndoGroup("Create Adjustment Layer");
    var comp=app.project.activeItem;if(!comp)return;
    var sel=comp.selectedLayers;
    var adj=comp.layers.addSolid([1,1,1],"Adjustment Layer",comp.width,comp.height,comp.pixelAspect);adj.adjustmentLayer=true;
    if(sel.length>0){var ref=sel[0];adj.moveBefore(ref);adj.startTime=ref.startTime;adj.inPoint=ref.inPoint;adj.outPoint=ref.outPoint;if(ref.hasVideo)adj.property("Position").setValue(ref.property("Position").value);}
    app.endUndoGroup();
}

function createNullLayer(){
    app.beginUndoGroup("Create Null");
    var comp=app.project.activeItem;
    if(comp&&comp instanceof CompItem){var sel=comp.selectedLayers;if(sel.length>0){var ref=sel[0],nl=comp.layers.addNull();nl.moveBefore(ref);nl.startTime=ref.inPoint;nl.inPoint=ref.inPoint;nl.outPoint=ref.outPoint;nl.property("ADBE Transform Group").property("ADBE Position").setValue(ref.property("ADBE Transform Group").property("ADBE Position").value);}else comp.layers.addNull();}
    app.endUndoGroup();
}

function createCamera(){
    app.beginUndoGroup("Create Camera");
    var comp=app.project.activeItem;
    if(comp&&comp instanceof CompItem){var sel=comp.selectedLayers;if(sel.length>0){var ref=sel[0],cam=comp.layers.addCamera("Camera",[comp.width/2,comp.height/2]);cam.moveBefore(ref);cam.startTime=ref.inPoint;cam.inPoint=ref.inPoint;cam.outPoint=ref.outPoint;}else comp.layers.addCamera("Camera",[comp.width/2,comp.height/2]);}
    app.endUndoGroup();
}

function createLight(){
    app.beginUndoGroup("Create Light");
    var comp=app.project.activeItem;
    if(comp&&comp instanceof CompItem){var sel=comp.selectedLayers;if(sel.length>0){var ref=sel[0],lt=comp.layers.addLight("Light",[comp.width/2,comp.height/2]);lt.moveBefore(ref);lt.startTime=ref.inPoint;lt.inPoint=ref.inPoint;lt.outPoint=ref.outPoint;}else comp.layers.addLight("Light",[comp.width/2,comp.height/2]);}
    app.endUndoGroup();
}

function precomposeLayers(){
    app.beginUndoGroup("Precompose Layers");
    try{
        var comp=app.project.activeItem;if(!comp||!(comp instanceof CompItem)){alert("Please select an active composition.");app.endUndoGroup();return;}
        var sel=comp.selectedLayers;if(!sel||sel.length===0){alert("Please select at least one layer.");app.endUndoGroup();return;}
        var minIn=sel[0].inPoint,maxOut=sel[0].outPoint;
        for(var i=1;i<sel.length;i++){if(sel[i].inPoint<minIn)minIn=sel[i].inPoint;if(sel[i].outPoint>maxOut)maxOut=sel[i].outPoint;}
        var indices=[];for(var i=0;i<sel.length;i++)indices.push(sel[i].index);
        var name="Precomp "+(comp.numLayers+1);
        var pc=comp.layers.precompose(indices,name,true);pc.duration=maxOut-minIn;
        for(var i=1;i<=pc.numLayers;i++)pc.layer(i).startTime-=minIn;
        comp.layer(name).startTime=minIn;
    }catch(e){alert("Error: "+e.toString());}
    app.endUndoGroup();
}

function reverseLayers(){
    app.beginUndoGroup("Reverse Layers Order");
    var comp=app.project.activeItem;if(!comp||!(comp instanceof CompItem)){app.endUndoGroup();return"NO_COMP";}
    var sel=[];for(var i=0;i<comp.selectedLayers.length;i++)sel.push(comp.selectedLayers[i]);
    if(sel.length<2){app.endUndoGroup();return"NEED_MORE_LAYERS";}
    sel.sort(function(a,b){return a.index-b.index;});var first=sel[0].index;
    for(var i=1;i<sel.length;i++)sel[i].moveBefore(comp.layer(first));
    app.endUndoGroup();return"OK";
}

function sequenceLayers(){
    app.beginUndoGroup("Sequence Trimmed Layers");
    var comp=app.project.activeItem;if(!comp||!(comp instanceof CompItem)){app.endUndoGroup();return"NO_COMP";}
    var sel=[];for(var i=0;i<comp.selectedLayers.length;i++)sel.push(comp.selectedLayers[i]);
    if(sel.length<2){app.endUndoGroup();return"NEED_MORE_LAYERS";}
    sel.sort(function(a,b){return b.index-a.index;});
    for(var i=1;i<sel.length;i++)sel[i].startTime+=sel[i-1].outPoint-sel[i].inPoint;
    app.endUndoGroup();return"OK";
}

// ==========================================================================
// CURVE EDITOR — NE PAS MODIFIER
// ==========================================================================
function applyEaseToSelectedKeys(x1,y1,x2,y2){
    app.beginUndoGroup("SmartTool: Flow Precision");
    var comp=app.project.activeItem;if(!comp||!(comp instanceof CompItem)){app.endUndoGroup();return"NO_COMP";}
    var selectedProps=comp.selectedProperties;if(selectedProps.length===0){app.endUndoGroup();return"NO_SELECTION";}
    var keysFound=false;
    for(var i=0;i<selectedProps.length;i++){
        var prop=selectedProps[i];if(!prop.numKeys||prop.selectedKeys.length<2)continue;
        var selectedKeys=prop.selectedKeys,selMap={};
        for(var s=0;s<selectedKeys.length;s++)selMap[selectedKeys[s]]=true;
        keysFound=true;
        for(var k=0;k<selectedKeys.length;k++){
            var keyIdx=selectedKeys[k],nextKeyIdx=keyIdx+1;
            if(nextKeyIdx<=prop.numKeys&&selMap[nextKeyIdx]){
                try{
                    var nextOutInterp=prop.keyOutInterpolationType(nextKeyIdx);
                    prop.setTemporalContinuousAtKey(keyIdx,false);prop.setTemporalContinuousAtKey(nextKeyIdx,false);
                    var dur=prop.keyTime(nextKeyIdx)-prop.keyTime(keyIdx);
                    var v1=prop.keyValue(keyIdx),v2=prop.keyValue(nextKeyIdx),diff=0;
                    if(v1 instanceof Array){var md=0;for(var d=0;d<v1.length;d++){var dd=v2[d]-v1[d];if(Math.abs(dd)>Math.abs(md))md=dd;}diff=md;}else diff=v2-v1;
                    var avgSpd=diff/dur;
                    var inflOut=Math.max(0.1,x1*100),inflIn=Math.max(0.1,(1-x2)*100);
                    var spdOut=(y1/Math.max(0.001,x1))*avgSpd,spdIn=((1-y2)/Math.max(0.001,1-x2))*avgSpd;
                    var eOut=new KeyframeEase(spdOut,inflOut),eIn=new KeyframeEase(spdIn,inflIn);
                    if(prop.propertyValueType===PropertyValueType.TwoD_SPATIAL||prop.propertyValueType===PropertyValueType.ThreeD_SPATIAL){
                        prop.setTemporalEaseAtKey(keyIdx,prop.keyInTemporalEase(keyIdx),[eOut]);
                        prop.setTemporalEaseAtKey(nextKeyIdx,[eIn],prop.keyOutTemporalEase(nextKeyIdx));
                    }else{
                        var dims=(v1 instanceof Array)?v1.length:1,oa=[],ia=[];
                        for(var n=0;n<dims;n++){oa.push(eOut);ia.push(eIn);}
                        prop.setTemporalEaseAtKey(keyIdx,prop.keyInTemporalEase(keyIdx),oa);
                        prop.setTemporalEaseAtKey(nextKeyIdx,ia,prop.keyOutTemporalEase(nextKeyIdx));
                    }
                    prop.setInterpolationTypeAtKey(nextKeyIdx,KeyframeInterpolationType.BEZIER,nextOutInterp);
                }catch(e){}
            }
        }
    }
    app.endUndoGroup();return keysFound?"OK":"NO_KEYS";
}

// ==========================================================================
// COPY CURVE
// ==========================================================================
function getCurveFromSelectedKeys(){
    var comp=app.project.activeItem;if(!comp||!(comp instanceof CompItem))return"NO_COMP";
    var props=comp.selectedProperties;
    for(var i=0;i<props.length;i++){
        var prop=props[i];if(!prop.numKeys||prop.selectedKeys.length<2)continue;
        var k1=prop.selectedKeys[0],k2=prop.selectedKeys[1];
        try{
            var dur=prop.keyTime(k2)-prop.keyTime(k1);if(dur<=0)continue;
            var v1=prop.keyValue(k1),v2=prop.keyValue(k2),diff=0;
            if(v1 instanceof Array){var md=0;for(var d=0;d<v1.length;d++){var dd=v2[d]-v1[d];if(Math.abs(dd)>Math.abs(md))md=dd;}diff=md;}else diff=v2-v1;
            var avgSpd=(diff===0)?1:(diff/dur);
            var outEases=prop.keyOutTemporalEase(k1),inEases=prop.keyInTemporalEase(k2);
            var eOut=outEases[0],eIn=inEases[0];
            var x1=eOut.influence/100,x2=1-eIn.influence/100;
            var y1=(x1===0)?0:(eOut.speed*x1/avgSpd),y2=1-(eIn.speed*(1-x2)/avgSpd);
            x1=Math.max(0,Math.min(1,x1));y1=Math.max(-0.5,Math.min(1.5,y1));
            x2=Math.max(0,Math.min(1,x2));y2=Math.max(-0.5,Math.min(1.5,y2));
            return x1+","+y1+","+x2+","+y2;
        }catch(e){}
    }
    return"NO_KEYS";
}

// ==========================================================================
// ADAPT KEYFRAMES TO LAYER
// ==========================================================================
function adaptKeyframes(){
    app.beginUndoGroup("Adapt Keyframes to Layer");
    var comp = app.project.activeItem;
    if(!comp || !(comp instanceof CompItem)){ app.endUndoGroup(); return "NO_COMP"; }
    var sel = comp.selectedLayers;
    if(sel.length === 0){ app.endUndoGroup(); return "NO_LAYER"; }

    var allPropsToProcess = [];

    for(var li = 0; li < sel.length; li++){
        var layer = sel[li];
        var layerIn = layer.inPoint;
        var layerOut = layer.outPoint;
        var layerDur = layerOut - layerIn;
        if(layerDur <= 0) continue;

        var propsToProcess = [];
        collectSelectedKeyProps(layer, propsToProcess);

        for(var pi = 0; pi < propsToProcess.length; pi++){
            var prop = propsToProcess[pi];
            var selectedKeyIndices = prop.selectedKeys;
            if(!selectedKeyIndices || selectedKeyIndices.length < 2) continue;

            var kData = [];
            for(var k = 0; k < selectedKeyIndices.length; k++){
                var ki = selectedKeyIndices[k];
                var kd = {
                    idx: ki,
                    time: prop.keyTime(ki),
                    value: prop.keyValue(ki),
                    inInterp: KeyframeInterpolationType.BEZIER,
                    outInterp: KeyframeInterpolationType.BEZIER,
                    inTemporal: null, outTemporal: null,
                    continuous: false
                };
                try{ kd.inInterp = prop.keyInInterpolationType(ki); }catch(e){}
                try{ kd.outInterp = prop.keyOutInterpolationType(ki); }catch(e){}
                try{ kd.inTemporal = prop.keyInTemporalEase(ki); }catch(e){}
                try{ kd.outTemporal = prop.keyOutTemporalEase(ki); }catch(e){}
                try{ kd.continuous = prop.keyTemporalContinuous(ki); }catch(e){}
                kData.push(kd);
            }

            if(kData.length < 2) continue;

            var origFirst = kData[0].time;
            var origLast = kData[kData.length - 1].time;
            var origDur = origLast - origFirst;
            if(origDur <= 0) continue;

            var speedRatio = origDur / layerDur; 

            for(var k = 0; k < kData.length; k++){
                var ratio = (kData[k].time - origFirst) / origDur;
                kData[k].newTime = layerIn + (ratio * layerDur);

                if(kData[k].inTemporal){
                    var newInEase = [];
                    for(var e = 0; e < kData[k].inTemporal.length; e++){
                        var oldEase = kData[k].inTemporal[e];
                        newInEase.push(new KeyframeEase(oldEase.speed * speedRatio, oldEase.influence));
                    }
                    kData[k].inTemporal = newInEase;
                }
                if(kData[k].outTemporal){
                    var newOutEase = [];
                    for(var e = 0; e < kData[k].outTemporal.length; e++){
                        var oldEase = kData[k].outTemporal[e];
                        newOutEase.push(new KeyframeEase(oldEase.speed * speedRatio, oldEase.influence));
                    }
                    kData[k].outTemporal = newOutEase;
                }
            }

            allPropsToProcess.push({
                prop: prop,
                kData: kData
            });
        }
    }

    if(allPropsToProcess.length === 0){ app.endUndoGroup(); return "NO_KEYS"; }

    for(var i = 0; i < allPropsToProcess.length; i++){
        var item = allPropsToProcess[i];
        var prop = item.prop;
        var kData = item.kData;

        for(var k = kData.length - 1; k >= 0; k--){
            try{ prop.removeKey(kData[k].idx); }catch(e){}
        }

        for(var k = 0; k < kData.length; k++){
            try{ prop.setValueAtTime(kData[k].newTime, kData[k].value); }catch(e){}
        }

        for(var k = 0; k < kData.length; k++){
            var targetTime = kData[k].newTime;
            var closestIdx = -1, minDist = 999999;
            for(var ki2 = 1; ki2 <= prop.numKeys; ki2++){
                var dist = Math.abs(prop.keyTime(ki2) - targetTime);
                if(dist < minDist){ minDist = dist; closestIdx = ki2; }
            }
            if(closestIdx < 1) continue;

            try{
                prop.setInterpolationTypeAtKey(closestIdx, kData[k].inInterp, kData[k].outInterp);
            }catch(e){}

            var inLin   = kData[k].inInterp === KeyframeInterpolationType.LINEAR;
            var outLin  = kData[k].outInterp === KeyframeInterpolationType.LINEAR;
            var outHold = kData[k].outInterp === KeyframeInterpolationType.HOLD;
            
            if(!inLin && !outLin && !outHold){
                try{
                    if(kData[k].inTemporal && kData[k].outTemporal)
                        prop.setTemporalEaseAtKey(closestIdx, kData[k].inTemporal, kData[k].outTemporal);
                }catch(e){}
            }

            try{ prop.setTemporalContinuousAtKey(closestIdx, kData[k].continuous); }catch(e){}
        }
    }

    app.endUndoGroup();
    return "OK";
}

function collectSelectedKeyProps(propGroup, result){
    try{
        for(var i = 1; i <= propGroup.numProperties; i++){
            var p = propGroup.property(i);
            if(!p) continue;
            if(p.propertyType === PropertyType.PROPERTY){
                if(p.numKeys > 0 && p.selectedKeys && p.selectedKeys.length >= 2){
                    result.push(p);
                }
            } else {
                collectSelectedKeyProps(p, result);
            }
        }
    }catch(e){}
}

// ==========================================================================
// ANCHOR POINT
// ==========================================================================
function setAnchorPoint(positionStr){
    app.beginUndoGroup("Set Anchor Point");
    var comp=app.project.activeItem;if(!comp||!(comp instanceof CompItem)){app.endUndoGroup();return"Error: No active comp";}
    var sel=comp.selectedLayers;if(sel.length===0){app.endUndoGroup();return"Error: No layer";}
    for(var i=0;i<sel.length;i++){
        var layer=sel[i],rect=layer.sourceRectAtTime(comp.time,false);
        var l=rect.left,t=rect.top,w=rect.width,h=rect.height;
        var ap=layer.property("ADBE Transform Group").property("ADBE Anchor Point");
        var pp=layer.property("ADBE Transform Group").property("ADBE Position");
        var ca=ap.value,cp=pp.value,na=[0,0];
        switch(positionStr){
            case"tl":na=[l,t];break;case"tc":na=[l+w/2,t];break;case"tr":na=[l+w,t];break;
            case"ml":na=[l,t+h/2];break;case"mc":na=[l+w/2,t+h/2];break;case"mr":na=[l+w,t+h/2];break;
            case"bl":na=[l,t+h];break;case"bc":na=[l+w/2,t+h];break;case"br":na=[l+w,t+h];break;
        }
        var s=layer.property("ADBE Transform Group").property("ADBE Scale").value/100;
        ap.setValue(na);pp.setValue([cp[0]+(na[0]-ca[0])*s[0],cp[1]+(na[1]-ca[1])*s[1]]);
    }
    app.endUndoGroup();return"OK";
}

// ==========================================================================
// UTILS
// ==========================================================================
function nativeAlert(message){alert(message);}

// ==========================================================================
// IMPORT AUDIO FILE DIRECTEMENT DANS LA COMPOSITION ACTIVE
// ==========================================================================
function importAudioFile(filePath) {
    app.beginUndoGroup("Import Trend Sound to Comp");
    try {
        var f = new File(filePath);
        if (!f.exists) { app.endUndoGroup(); return "FILE_NOT_FOUND: " + filePath; }
        
        var opts = new ImportOptions(f);
        opts.importAs = ImportAsType.FOOTAGE;
        var importedItem = app.project.importFile(opts);
        
        var comp = app.project.activeItem;
        if (comp && comp instanceof CompItem) {
            var newLayer = comp.layers.add(importedItem);
            newLayer.startTime = comp.time; 
        }
        
        app.endUndoGroup();
        return "OK";
    } catch (err) {
        app.endUndoGroup();
        return "ERROR: " + err.toString();
    }
}
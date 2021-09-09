/*

This is the interface for the dataset builder.

Author: Simon Thomas
Date: 01 Mar 2021

*/

let IMG_SRC;
let ROT = document.getElementById("rot");
let DIST = document.getElementById("distance");
let LIGHT = document.getElementById("indicator");
let POINTS = [];
const OPTIONS = { scale: 100 }; // seems to work
const GLOBAL_COLOR = "yellow";
let currentPoint;


/*
    This instantiates the OpenSeadragon Canvas.
    These settings can be tweaked to suit.
*/
let viewer = new OpenSeadragon({
    id: "view",
    tileSources: "/slide.dzi",
    prefixUrl: "/static/images/",
    showNavigator: false,
    showRotationControl: true,
    animationTime: 0.5,
    blendTime: 0.1,
    constrainDuringPan: true,
    maxZoomPixelRatio: 2,
    minZoomLevel: 1,
    visibilityRatio: 1,
    zoomPerScroll: 2,
    timeout: 120000,
});

// Remove clickToZoom
viewer.gestureSettingsMouse.clickToZoom = false;

viewer.addHandler("open", function() {
    // To improve load times, ignore the lowest-resolution Deep Zoom
    // levels.  This is a hack: we can't configure the minLevel via
    // OpenSeadragon configuration options when the viewer is created
    // from DZI XML.
    viewer.source.minLevel = 8;
});


// Build the FabricJS overlay
let overlay = viewer.fabricjsOverlay(OPTIONS);

// Draw and Line settings
overlay.fabricCanvas().freeDrawingBrush.color=GLOBAL_COLOR;
overlay.fabricCanvas().freeDrawingBrush.width=1;

let clickStatus = true;
let drawStatus = false;

// INTERACTION FUNCTIONS

let rotate = function(degrees){
    ROT.style.transform = "rotate(" + degrees + "deg)";
};

let slide_rotate = function(value) {
    viewer.viewport.setRotation(value);
}

// Pointers to buttons
let toggle_button = document.getElementById("toggleDraw");
let reset_button = document.getElementById("reset");
let process_button = document.getElementById("process");
let save_button = document.getElementById("save");


toggle_button.onclick = function(){
    // toggle
    drawStatus = !drawStatus;
    // Change to update view
    console.log("Draw Status: " + drawStatus);
    // Update states
    overlay.fabricCanvas().isDrawingMode=drawStatus;
    viewer.setMouseNavEnabled(!drawStatus);
    viewer.outerTracker.setTracking(!drawStatus);
}


reset_button.onclick = function(){
    POINTS = [];
    overlay.fabricCanvas().clear();
}

function sendReq(point) {
    http = new XMLHttpRequest();
    http.open("POST", "/getTileFromPoint", true);
    http.setRequestHeader('Content-type', 'application/json');
    http.onload = function(){
        let img = document.getElementById("rot");
        if (http.status == 200) {
            img.src = http.response;
        } else {
            console.log("failed to get image");
            img.src = "";
        }
    }
    http.send(JSON.stringify(point));
}

process_button.onclick = function(){

    // get point at front of array
    currentPoint = POINTS.shift()

    // Get image from server
    sendReq(currentPoint);

    // remove point from canvas
    let objects = overlay.fabricCanvas().getObjects();
    overlay.fabricCanvas().remove(objects[0]);
    overlay.fabricCanvas().renderAll();
}

// SAVE IMAGE
function saveRequest(data){
    http = new XMLHttpRequest();
    http.open("POST", "/saveTileFromData", true);
    http.setRequestHeader('Content-type', 'application/json');
    http.onload = function(){
        if (http.status == 200) {
            // add more output if necessary
            console.log("save successful.")
        } else {
            console.log("failed to save image");
        }
    }
    http.send(JSON.stringify(data));

    document.getElementById("angle").focus();
}


save_button.onclick = function(){

    // get current rotation
    let angle = document.getElementById("angle").value;

    // Send angle and point to server to save
    data = { "x" : currentPoint["x"],
             "y" : currentPoint["y"],
             "angle" : angle
    }
    saveRequest(data);

    // Automatically fetch next point
    process_button.click()

    // Set focus on slider
    document.getElementById("angle").focus();

}

overlay.fabricCanvas().on("mouse:down", function(event) {

    let webPoint = new OpenSeadragon.Point(x = event.pointer.x, y = event.pointer.y);

    var viewportPoint = viewer.viewport.pointFromPixel(webPoint);

    // Convert from viewport coordinates to image coordinates.
    var imagePoint = viewer.viewport.viewportToImageCoordinates(viewportPoint);

    // Show the results.
    //console.log("Canvas: " + webPoint  + " Real: " + imagePoint.toString());

    // Save Points
    POINTS.push({x: imagePoint.x, y: imagePoint.y});
})

// Key Presses !
document.addEventListener('keypress', event => {
    if (event.code == "KeyT"){
        toggle_button.click();
    }

    if (event.code === "Enter" | event.code === "NumpadEnter") {
        save_button.click();
    }

    if (event.code === "KeyP") {
        process_button.click();
    }

    if (event.code === "KeyR") {
        reset_button.click();
    }

});


// MOUSE TRACKING
overlay.fabricCanvas().on("mouse:move", function(event) {

    let webPoint = new OpenSeadragon.Point(x = event.pointer.x, y = event.pointer.y);

    var viewportPoint = viewer.viewport.pointFromPixel(webPoint);

    // Convert from viewport coordinates to image coordinates.
    var imagePoint = viewer.viewport.viewportToImageCoordinates(viewportPoint);

    // Show the results.
    //console.log("Canvas: " + webPoint  + " Real: " + imagePoint.toString());

    // Calculate distane from last point
    if (POINTS.length > 0) {
        let i = POINTS.length - 1;
        let dist = Math.sqrt((POINTS[i].x - imagePoint.x)**2 + (POINTS[i].y - imagePoint.y)**2);
        DIST.innerText = "Dist: " + dist;

        LIGHT.style.top =  webPoint.y + "px";
        LIGHT.style.left = webPoint.x + "px";

        if (dist <= 350) {
            LIGHT.style.background = "yellow";
            overlay.fabricCanvas().style.cursor = "url('./stack/yellow_cursor.png')";

        }

        if (dist > 350 && dist < 400 ) {
            LIGHT.style.background = "#30FF00";
            overlay.style.cursor = "url('./stack/green_cursor.png')";
        }
        if (dist > 400) {
            LIGHT.style.background = "red";
            overlay.style.cursor = "url('./stack/red_cursor.png')";
        }
    }

    // Save Points
    //POINTS.push({x: imagePoint.x, y: imagePoint.y});
})


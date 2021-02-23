
let IMG_SRC;

let rot = document.getElementById("rot");

let rotate = function(degrees){
    rot.style.transform = "rotate(" + degrees + "deg)";
};

let OUT = document.getElementById("output");

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

const options = {
                  scale: 100,
                };

let overlay = viewer.fabricjsOverlay(options);

// Draw and Line settings
let globalColor = "yellow";
overlay.fabricCanvas().freeDrawingBrush.color=globalColor;
overlay.fabricCanvas().freeDrawingBrush.width=1;

let POINTS = [];

let clickStatus = true;
let drawStatus = false;

let b1 = document.getElementById("toggleDraw");
let b2 = document.getElementById("points");
let b3 = document.getElementById("reset");
let b4 = document.getElementById("process");
let b5 = document.getElementById("save");

b1.onclick = function(){
    console.log("Click Status: " + !clickStatus);

    clickStatus = !clickStatus;
}

b1.onclick = function(){
    // toggle
    drawStatus = !drawStatus;
    // Change to update view
    console.log("Draw Status: " + drawStatus);
    // Update states
    overlay.fabricCanvas().isDrawingMode=drawStatus;
    viewer.setMouseNavEnabled(!drawStatus);
    viewer.outerTracker.setTracking(!drawStatus);
}

b2.onclick = function(){
    console.log(POINTS);
}

b3.onclick = function(){
    POINTS = [];
    overlay.fabricCanvas().clear();
}

function sendReq(point) {
    http = new XMLHttpRequest();
    http.open("POST", "/getTileFromPoint", true);
    http.setRequestHeader('Content-type', 'application/json');
    http.onload = function(){
        if (http.status == 200) {
            let img = document.getElementById("rot");
            img.src = http.response;
        } else {
            console.log("failed to get image");
        }
    }
    http.send(JSON.stringify(point));
}

let currentPoint;
b4.onclick = function(){

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
b5.onclick = function(){

    // get current rotation
    let angle = document.getElementById("angle").value;

    // Send angle and point to server to save
    // TODO

    // Update

}




// VIEWR ----------


// Get coords
viewer.addHandler('canvas-click', function(event) {

    let points = [ event.position.x, event.position.y, event.position.x, event.position.y ];
    line = new fabric.Line(points, {
        strokeWidth: 1,
        fill: globalColor,
        stroke: globalColor,
        originX: 'center',
        originY: 'center'
    });
    overlay.fabricCanvas().add(line);

    let webPoint = new OpenSeadragon.Point(x = event.position.x, y = event.position.y);

    var viewportPoint = viewer.viewport.pointFromPixel(webPoint);

    // Convert from viewport coordinates to image coordinates.
    var imagePoint = viewer.viewport.viewportToImageCoordinates(viewportPoint);

    // Show the results.
    console.log(imagePoint.toString());

    // Save Points
    POINTS.push({x: imagePoint.x, y: imagePoint.y});


});

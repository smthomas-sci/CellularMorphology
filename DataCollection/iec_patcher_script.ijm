/*
 * This script will automate the selection and rotation of
 * image window grabs along the epidermis.
 * 
 * Can be any size between 512 and 2048.
 * 
 */
var DIM = 1024*2;
var GRAB = 1024*2*2;
var STEP = DIM / 12;

// Oriengtation
var UP = 360;
var DOWN = 180;
var LEFT = 90;
var RIGHT = 270;
 
run("Interpolate", "interval=" + STEP);
 
getSelectionCoordinates(xpoints, ypoints);

//Array.print(xpoints);
//Array.print(ypoints);

//Table.create("Points");
//Table.setColumn("X", xpoints);
//Table.setColumn("Y", ypoints);


var FNAME = "17H28008_1A_IEC";
selectWindow(FNAME + ".png");

var PATH = "/home/simon/PycharmProjects/CellularMorphology/DataCollection/out/";
var OUT_DIR = PATH + FNAME + "/";
File.makeDirectory(OUT_DIR);

for (var i = 1; i<xpoints.length-1;i++){
	// Grab rectangle around point
	makeRectangle(xpoints[i]-(GRAB/2), ypoints[i]-(GRAB/2), GRAB, GRAB);
	// Copy to new image
	run("Copy");
	newImage("test", "RGB", GRAB, GRAB, 1);
	run("Paste");

	// Calculate angle
	angle = tan((ypoints[i] - ypoints[i-1])/(xpoints[i] - xpoints[i-1]));
	ANGLE = angle * 180/PI;
	
	// ROTATE
	run("Rotate... ", "angle=" + (180-ANGLE) + " grid=1 interpolation=Bilinear");

	// Take an inner crop to remove artefacts
	WINDOW = 1362;
	makeRectangle(DIM/2, DIM/2, WINDOW, WINDOW);
	run("Crop");

	run("Size...", "width=" + 1024 + " height=" + 1024 +" depth=1 constrain average interpolation=Bilinear");
	
	//wait(1000);

	
	saveAs("jpeg", OUT_DIR + "image_" + i + ".jpg");
	
	close();
	
}




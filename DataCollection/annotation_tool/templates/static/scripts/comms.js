
let CURRENT_CASE;
let CURRENT_IMAGE = 0;
let IMAGE_ARRAY;

let THING;
function get_image(idx){

    fetch("/get_image", {method: "POST", body: JSON.stringify(idx), headers: { 'Content-type': 'application/json; charset=UTF-8'}})
            .then( response => { return response.json()})
            .then ( data => {
                let encoding = data[0];
                // Set image as source
                document.getElementById('image').src = "data:image/jpeg;base64," + encoding;
            })
            .catch(error => {console.log(error);})
}


async function update_case_selection(event){
    let id = event.target.id;

    if (CURRENT_CASE) {
        // Turn off previous
        document.getElementById(CURRENT_CASE).style.background = "";

        // Turn on current
        CURRENT_CASE = id;
        document.getElementById(CURRENT_CASE).style.background = "lightgrey";

    } else {
    // Turn on current
        CURRENT_CASE = id;
        document.getElementById(CURRENT_CASE).style.background = "lightgrey";
    }

    console.log("CASE ID: " + id);

    // Update UX
    IMAGE_ARRAY = await fetch("/get_available_images", {
        method: "POST",
        body: JSON.stringify(id),
        headers: { 'Content-type': 'application/json; charset=UTF-8'}
    }).then(response => {
        return response.json();
    }).catch(error => {console.log(error)});

    // Update length and first image
    get_image(IMAGE_ARRAY[0]);
    document.getElementById("tally").innerHTML = CURRENT_CASE + " - " + IMAGE_ARRAY[0] + " (" + 1 + " of " + IMAGE_ARRAY.length + ")";
    CURRENT_IMAGE = 0;

    // With the image array, update visuals
    el = document.getElementById("image_array");
    el.innerHTML = "";

    // previous button
    let b = document.createElement("button");
    b.innerHTML = "<";
    b.id = "previous";
    b.addEventListener("click", function(event){
            let new_value;

            if (CURRENT_IMAGE == 0) {
                CURRENT_IMAGE = IMAGE_ARRAY.length - 1;
            } else {
                CURRENT_IMAGE -= 1;
            }
            // update visual
            get_image(IMAGE_ARRAY[CURRENT_IMAGE]);
            document.getElementById("tally").innerHTML = CURRENT_CASE + " - " + IMAGE_ARRAY[CURRENT_IMAGE] + " (" + (CURRENT_IMAGE+1) + " of " + IMAGE_ARRAY.length + ")";
    });
    el.appendChild(b);


    // image specific buttons
    for (let i=0;i<IMAGE_ARRAY.length;i++){
        let b = document.createElement("button")
        b.innerHTML = IMAGE_ARRAY[i];
        b.id = "img" + i;
        b.addEventListener("click", function(event){
            let idx =  parseInt(event.target.id.substring(3));
            CURRENT_IMAGE = idx;
            get_image(IMAGE_ARRAY[CURRENT_IMAGE]);
            // update visual
            document.getElementById("tally").innerHTML = CURRENT_CASE + " - " + IMAGE_ARRAY[CURRENT_IMAGE] + " (" + (i+1) + " of " + IMAGE_ARRAY.length + ")";
        });
        el.appendChild(b);
    }
    // next button
    b = document.createElement("button");
    b.innerHTML = ">";
    b.id = "next";
    b.addEventListener("click", function(event){
            let new_value;

            if (CURRENT_IMAGE == (IMAGE_ARRAY.length - 1)) {
                CURRENT_IMAGE = 0;
            } else {
                CURRENT_IMAGE += 1;
            }
            // update visual
            get_image(IMAGE_ARRAY[CURRENT_IMAGE]);
            document.getElementById("tally").innerHTML = CURRENT_CASE + " - " + IMAGE_ARRAY[CURRENT_IMAGE] + " (" + (CURRENT_IMAGE+1) + " of " + IMAGE_ARRAY.length + ")";
    });
    el.appendChild(b);

    // Update Annotations
    fetch(url="/get_available_annotations",
         {method: "POST",
          body: JSON.stringify(CURRENT_CASE),
          headers: {'Content-type': 'application/json; charset=UTF-8'} })
        .then(response => { return response.json() } )
        .then(data => {

            document.getElementById("all_annotations").innerHTML = "";
            // Add annotations
            for (let i=0;i<data.length;i++){
                load_annotation(i, data[i]);
            }

            // reset save status
            document.getElementById("save_status").innerText = "";
        })
        .catch(error => { console.log(error);})

}

/*
    Gets the list of cases
*/
function get_cases() {
    fetch('/get_cases', {method: "POST"})
    .then(response => { return response.json() })
    .then( data => {
        // add data to page

        let div = document.getElementById("cases_list");
        div.innerHTML = "";

        for (let i=0;i<data.length;i++){
            let li = document.createElement("li");
            li.innerText = data[i];
            li.id = data[i];
            li.selectable = false;
            div.appendChild(li);

            li.addEventListener("click", update_case_selection);
        }

        // Setup first
        document.getElementById(data[0]).click();

    }).catch(err => {console.log(err)})
}


/* adds the selected suggestion to the annotation.
*/
function select_suggestion(event) {
    let element = event.target;
    element.style.border = "1px solid lightblue";

    let text_to_add = element.innerText;

    console.log(text_to_add);

    document.getElementById("annotation_text").value = "";
    document.getElementById("suggestions").innerHTML = "";

    // add sentence to annotation
    let el = document.getElementById("annotation");
    let text = el.value;
    el.value = text + " " + text_to_add;

}

// gets suggestions from input prompt
async function get_suggestions(query) {
    let result = await fetch('/get_suggestions', {
        method: "POST",
        body: JSON.stringify(query),
	    headers: { 'Content-type': 'application/json; charset=UTF-8'}
    })
    .then(response => { return response.json() })
    .then(data => {
        // Get holder
        suggestions = document.getElementById("suggestions");
        suggestions.innerHTML = "";

        if (query.length < 1) {
            return
        }

	    let insert = "<span class='highlight'>" + query + "</span>";

        for (let i=0;i<data.length;i++){
            let li = document.createElement("li");

            let idx = data[i].indexOf(query);

            let text_start = data[i].substr(0, idx);
            let text_end = data[i].substr(idx+query.length);

            li.innerHTML = text_start  + insert  + text_end + "."
            li.id = "s"+i;
            li.className = "suggest";
            suggestions.appendChild(li);

            // add event listener
            li.addEventListener("click", select_suggestion);
        }
    })
    .catch(error => {console.log(error);})
    return result;
}

function id_click(el_id){
    let el = document.getElementById(el_id);
    el.click();
}


function load_annotation(i, text) {

    let p = document.createElement("p");
    p.innerHTML = "<a onclick=id_click('img" + i + "')>" + IMAGE_ARRAY[i] + ": " + text + "</a>"
    p.setAttribute("contenteditable", "true");
    p.className = "anno";

    let dest = document.getElementById("all_annotations");
    dest.appendChild(p);
}

function submit_annotation() {
    let el  = document.getElementById("annotation");
    let text = el.value;
    el.value = '';

    // CHECK IF UNDEFINED (no matching image)
    if (IMAGE_ARRAY[CURRENT_IMAGE] === undefined) {return}

    // otherwise
    let p = document.createElement("p");
    p.innerHTML = "<a onclick=id_click('img" + CURRENT_IMAGE + "')>" + IMAGE_ARRAY[CURRENT_IMAGE] + ":" + text + "</a>"
    p.setAttribute("contenteditable", "true");
    p.className = "anno";
    let dest = document.getElementById("all_annotations");
    dest.appendChild(p);

    // Move to next image
    CURRENT_IMAGE += 1;
    document.getElementById("img" + CURRENT_IMAGE).click();

    // Copy text to clipboard
    navigator.clipboard.writeText(text).then(function() {
        console.log('Async: Copying to clipboard was successful!');
        }).catch(error => {
          console.error('Async: Could not copy text: ', error);
        });

    // Focus the annotation div
    el.focus();
}

function save_annotation() {

    let case_id = CURRENT_CASE;
    let ps = [...document.getElementById("all_annotations").children];
    let text = [];
    ps.forEach( function(item){ text.push(item.innerText); });

    data = {'case_id': case_id, "text": text}

    fetch("/save_annotations", {
            method: "POST",
            body: JSON.stringify(data),
            headers: { 'Content-type': 'application/json; charset=UTF-8'}
    }).then(response => {return response.json();})
    .then(data => {
        // Show save status
        let el = document.getElementById("save_status");
        if (data["result"] == 1) {
            el.innerText = "save successful!"
            el.classList.toggle("success");
        } else {
            el.innerText = "error occurred while saving - requires manual fix!"
            el.classList.toggle("success");
        }

    }).catch(error => {console.log(error);})


}

// ADD EVENT LISTENERS
function text_submit(event) {
    let ta = document.getElementById("annotation_text");
    let query = ta.value
    let data = get_suggestions(query);
}

let textArea = document.getElementById("annotation_text");
textArea.addEventListener('input', text_submit);



let annotation = document.getElementById("annotation");
annotation.addEventListener("keypress", function(event){

//    // EPIDERMIS
//    if (event.key === "1") { annotation.value = " The epidermis appears normal."}
//    else if (event.key === "2") { annotation.value = " The epidermis shows mild dysplasia."}
//    else if (event.key === "3") { annotation.value = " The epidermis shows moderate dysplasia."}
//    else if (event.key === "4") { annotation.value = " The epidermis shows severe dysplasia."}
//    else if (event.key === "5") { annotation.value = " The epidermis shows full-thickness dysplasia."}
//    else {return}

    // DERMIS
    if (event.key === "1") { annotation.value = " The dermis appears normal."}
    else if (event.key === "2") { annotation.value = " The dermis appears solar damaged."}
    else if (event.key === "3") { annotation.value = " The dermis shows inflammation."}
    else if (event.key === "4") { annotation.value = " The dermis appears abnormal."}
    else if (event.key === "5") { annotation.value = " The dermis has been displaced."}
    else {return}

    // hit submit button
    submit_annotation();

    // clear
    annotation.value = "";

    let aa = document.getElementById("all_annotations");
    aa.scrollTop = aa.scrollHeight;
});

// ------------- MAIN
window.onload = function() {
    get_cases();
}


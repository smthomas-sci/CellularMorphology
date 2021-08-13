import os
import json
import re
import io

from PIL import Image
import base64

from flask import Flask, render_template, url_for, request


# Directories
ANNOTATION_DIR = '/home/simon/PycharmProjects/CellularMorphology/DataCollection/annotations'
IMAGE_DIR = '/home/simon/PycharmProjects/CellularMorphology/DataCollection/cleaned_data'
CASE_ID = None

annotations = os.listdir(ANNOTATION_DIR)

lines = []
for a in annotations:
    with open(os.path.join(ANNOTATION_DIR, a), "r") as f:
        lines.extend([(a, l) for l in f.readlines()])

sentences = []
for line in lines:
    if len(line[1]) < 2:
        continue
    try:
        line = line[1].split(": ")[1]
    except Exception as e:
        print(e, line[0], line[1])
    for s in line[1].split("."):
        if len(s) > 2:
            sentences.append(s.strip())

sentences = set(sentences)
sentences = list(sentences)
sentences = sorted(sentences)


# --------------------------- #

def list_cases():
    return sorted(os.listdir(IMAGE_DIR))

def suggestions(word):
    pattern = ".*" + word
    results = []
    for search_string in sentences:
        match = re.match(pattern, search_string)
        if match:
            results.append(search_string)
    return results

def build_app():
    app = Flask('app', static_folder='templates/static')

    @app.route("/save_annotations", methods=["POST"])
    def save_annotations():
        data = request.json

        case_id = data["case_id"]
        lines = data["text"]

        fname = os.path.join(ANNOTATION_DIR, case_id) + ".txt"

        try:
            with open(fname, "w") as f:
                for line in lines:
                    f.write(line + "\n")
            print("save successful - ", fname)
            return json.dumps({"result": 1})

        except Exception as e:
            print(e, "- failed to save!")
            return json.dumps({"result": -1})

    @app.route("/get_available_annotations", methods=["POST"])
    def get_available_annotations():
        case_id = request.json

        fname = os.path.join(ANNOTATION_DIR, case_id) + ".txt"
        if os.path.exists(fname):

            with open(fname, "r") as f:
                lines = f.readlines()

            result = {}
            for i, line in enumerate(lines):
                result[i] = line.split(": ")[-1]

            result["length"] = i+1

            return json.dumps(result)

        else:
            print("Annotation doesn't exist for", case_id)
            return json.dumps(-1)



    @app.route("/get_available_images", methods=["POST"])
    def get_available_images():
        case_id = request.json

        # save case id
        global CASE_ID
        CASE_ID = case_id

        # Get images
        files = os.listdir(os.path.join(IMAGE_DIR, case_id))
        files = sorted([int(f.split("_")[-1].split(".")[0]) for f in files])

        return json.dumps(files)

    @app.route("/get_image", methods=["POST"])
    def get_image():
        idx = request.json

        fname = os.path.join(os.path.join(IMAGE_DIR, CASE_ID), CASE_ID + "_" + str(idx) + ".jpg")

        image = Image.open(fname, mode='r')
        imgByteArr = io.BytesIO()
        image.save(imgByteArr, format=image.format)
        imgByteArr = imgByteArr.getvalue()
        img_base64 = base64.b64encode(imgByteArr)

        return json.dumps({0: img_base64.decode()})

    @app.route("/get_cases", methods=["POST"])
    def get_cases():
        cases = list_cases()
        return json.dumps(cases)

    @app.route("/get_suggestions", methods=["POST"])
    def get_suggestions():
        data = request.json

        return json.dumps(suggestions(data))

    @app.route('/')
    def root():
        return render_template("index.html")

    @app.route('/demo')
    def other():
        return 'things'

    return app


if __name__ == '__main__':
    app = build_app()
    app.run(debug=True)




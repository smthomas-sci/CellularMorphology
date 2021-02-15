import openslide
import os
import matplotlib.pyplot as plt
import numpy as np

DATA_DIR = "/media/simon/UNTITLED/MyLab_WSI_20x/20x/"
FILES = os.listdir(DATA_DIR)
# Sort IECs and SEBK
IECs = []
for file in FILES:
    if "IEC" in file:
        IECs.append(file)

    if "SEB" in file:
        IECs.append(file)

print("Files:", len(IECs))

# Loop through files
for i, file in enumerate(IECs):
    fname = os.path.join(DATA_DIR, file)

    slide = openslide.OpenSlide(fname)
    w, h = slide.dimensions

    print(f"{i+1} of {len(IECs)}", file, (w, h))

    img = slide.read_region(location=(0, 0), level=0, size=(w, h))

    img.save("./out/" + fname.split("/")[-1].split(".")[0] + ".png")

    slide.close()

    if i > 10:
        break


import subprocess
import os

data_dir = "/media/simon/UNTITLED/MyLab_WSI_20x/20x/"


# -----------  INIT FILE NAMES  ------------------- #
# # Comment all of this out after running once
#
# files = os.listdir(data_dir)
#
# # filter IEC and SEBK
# files = [f for f in files if "IEC" in f or "SEBK" in f]
#
# with open("./slide_history.txt", "w") as fh:
#     for file in files:
#         fh.write(file + "\n")
# os.system("cat ./slide_history.txt")
# ---------------------------------------------------- #

with open("slide_history.txt", "r") as fh:
    files = [f.strip() for f in fh.readlines()]
f = files.pop()
# Save the rest back to the file
with open("slide_history.txt", "w") as fh:
    for slide in files:
        fh.write(slide + "\n")

print("running for ", f)

args = "./deepzoom/deepzoom_custom.py " + data_dir + f

os.system("python " + args)

















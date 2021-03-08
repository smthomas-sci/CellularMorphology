#!/usr/bin/env python
#
# deepzoom_server - Example web application for serving whole-slide images
#
# Copyright (c) 2010-2015 Carnegie Mellon University
#
# This library is free software; you can redistribute it and/or modify it
# under the terms of version 2.1 of the GNU Lesser General Public License
# as published by the Free Software Foundation.
#
# This library is distributed in the hope that it will be useful, but
# WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY
# or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU Lesser General Public
# License for more details.
#
# You should have received a copy of the GNU Lesser General Public License
# along with this library; if not, write to the Free Software Foundation,
# Inc., 51 Franklin Street, Fifth Floor, Boston, MA 02110-1301 USA.
#

from flask import Flask, abort, make_response, render_template, url_for, request
from flask import send_file
from io import BytesIO
import base64
import openslide
from openslide import ImageSlide, open_slide
from openslide.deepzoom import DeepZoomGenerator
from optparse import OptionParser
import re
from unicodedata import normalize

import numpy as np
import skimage.io as io
from skimage.transform import resize
import os


DEEPZOOM_SLIDE = None
DEEPZOOM_FORMAT = 'jpeg'
DEEPZOOM_TILE_SIZE = 254
DEEPZOOM_OVERLAP = 1
DEEPZOOM_LIMIT_BOUNDS = True
DEEPZOOM_TILE_QUALITY = 75
SLIDE_NAME = 'slide'

app = Flask(__name__)
app.config.from_object(__name__)
app.config.from_envvar('DEEPZOOM_TILER_SETTINGS', silent=True)

global_count = 0


class PILBytesIO(BytesIO):
    def fileno(self):
        '''Classic PIL doesn't understand io.UnsupportedOperation.'''
        raise AttributeError('Not supported')


@app.before_first_request
def load_slide():
    slidefile = app.config['DEEPZOOM_SLIDE']
    if slidefile is None:
        raise ValueError('No slide file specified')
    config_map = {
        'DEEPZOOM_TILE_SIZE': 'tile_size',
        'DEEPZOOM_OVERLAP': 'overlap',
        'DEEPZOOM_LIMIT_BOUNDS': 'limit_bounds',
    }
    opts = dict((v, app.config[k]) for k, v in config_map.items())
    slide = open_slide(slidefile)
    app.slides = {
        SLIDE_NAME: DeepZoomGenerator(slide, **opts)
    }
    app.associated_images = []
    app.slide_properties = slide.properties
    for name, image in slide.associated_images.items():
        app.associated_images.append(name)
        slug = slugify(name)
        app.slides[slug] = DeepZoomGenerator(ImageSlide(image), **opts)
    try:
        mpp_x = slide.properties[openslide.PROPERTY_NAME_MPP_X]
        mpp_y = slide.properties[openslide.PROPERTY_NAME_MPP_Y]
        app.slide_mpp = (float(mpp_x) + float(mpp_y)) / 2
    except (KeyError, ValueError):
        app.slide_mpp = 0


# ----- CUSTOM CALLS ---- #
@app.route('/getTileFromPoint', methods=["POST"])
def get_tile_from_point():
    data = request.json

    # Access slide
    slide = app.slides["slide"]._osr

    # parse data
    x = int(data["x"])
    y = int(data["y"])

    # Access thumb
    #tile = slide.get_thumbnail((100,100))

    # Read slide
    DIM = 1024*2*2
    tile = slide.read_region(location=(x-(DIM//2), y-(DIM//2)),
                             level=0,
                             size=(DIM, DIM))

    tile = tile.resize((256, 256))

    buffer = PILBytesIO()
    tile.save(buffer, "png")
    img_string = "data:image/png;base64,"
    img_string += base64.b64encode(buffer.getvalue()).decode("utf-8")

    return img_string

# ----------------------- #
@app.route('/saveTileFromData', methods=["POST"])
def save_tile_from_data():
    # parse data
    data = request.json
    x = int(data["x"])
    y = int(data["y"])
    angle = int(data["angle"])

    # Access slide
    slide = app.slides["slide"]._osr

    # Access thumb
    # tile = slide.get_thumbnail((100,100))

    # Read slide
    DIM = 1024 * 2 * 2
    tile = slide.read_region(location=(x - (DIM // 2), y - (DIM // 2)),
                             level=0,
                             size=(DIM, DIM))

    # Rotate
    tile = tile.rotate(-angle)


    # Crop
    WINDOW = 1362
    tile = np.array(tile)

    p = (DIM // 2) - (WINDOW // 2)
    offset = 256  # seems right?
    tile = tile[(p+offset):(p+offset)+WINDOW, p:p+WINDOW]

    # Resize
    tile = resize(tile, (1024, 1024))

    # Save
    global global_count
    global_count += 1

    slide_name = slide._filename.split("/")[-1].split(".")[0]
    fname = f"{slide_name}_{global_count}.jpg"

    DIR = "./out/" + slide._filename.split("/")[-1].split(".")[0]
    os.system("mkdir -p " + DIR)

    fname = os.path.join(DIR, fname)

    io.imsave(fname, (tile*255.).astype("uint8")[..., 0:3])
    print("saved ...", fname)

    return "success."


@app.route('/')
def index():
    slide_url = url_for('dzi', slug=SLIDE_NAME)
    associated_urls = dict((name, url_for('dzi', slug=slugify(name)))
            for name in app.associated_images)
    return render_template('slide-custom.html', slide_url=slide_url,
            associated=associated_urls, properties=app.slide_properties,
            slide_mpp=app.slide_mpp)


@app.route('/<slug>.dzi')
def dzi(slug):
    format = app.config['DEEPZOOM_FORMAT']
    try:
        resp = make_response(app.slides[slug].get_dzi(format))
        resp.mimetype = 'application/xml'
        return resp
    except KeyError:
        # Unknown slug
        abort(404)


@app.route('/<slug>_files/<int:level>/<int:col>_<int:row>.<format>')
def tile(slug, level, col, row, format):
    format = format.lower()
    if format != 'jpeg' and format != 'png':
        # Not supported by Deep Zoom
        abort(404)
    try:
        tile = app.slides[slug].get_tile(level, (col, row))
    except KeyError:
        # Unknown slug
        abort(404)
    except ValueError:
        # Invalid level or coordinates
        abort(404)
    buf = PILBytesIO()
    tile.save(buf, format, quality=app.config['DEEPZOOM_TILE_QUALITY'])
    resp = make_response(buf.getvalue())
    resp.mimetype = 'image/%s' % format
    return resp


def slugify(text):
    text = normalize('NFKD', text.lower()).encode('ascii', 'ignore').decode()
    return re.sub('[^a-z0-9]+', '-', text)


if __name__ == '__main__':
    parser = OptionParser(usage='Usage: %prog [options] [slide]')
    parser.add_option('-B', '--ignore-bounds', dest='DEEPZOOM_LIMIT_BOUNDS',
                default=True, action='store_false',
                help='display entire scan area')
    parser.add_option('-c', '--config', metavar='FILE', dest='config',
                help='config file')
    parser.add_option('-d', '--debug', dest='DEBUG', action='store_true',
                help='run in debugging mode (insecure)')
    parser.add_option('-e', '--overlap', metavar='PIXELS',
                dest='DEEPZOOM_OVERLAP', type='int',
                help='overlap of adjacent tiles [1]')
    parser.add_option('-f', '--format', metavar='{jpeg|png}',
                dest='DEEPZOOM_FORMAT',
                help='image format for tiles [jpeg]')
    parser.add_option('-l', '--listen', metavar='ADDRESS', dest='host',
                default='127.0.0.1',
                help='address to listen on [127.0.0.1]')
    parser.add_option('-p', '--port', metavar='PORT', dest='port',
                type='int', default=5000,
                help='port to listen on [5000]')
    parser.add_option('-Q', '--quality', metavar='QUALITY',
                dest='DEEPZOOM_TILE_QUALITY', type='int',
                help='JPEG compression quality [75]')
    parser.add_option('-s', '--size', metavar='PIXELS',
                dest='DEEPZOOM_TILE_SIZE', type='int',
                help='tile size [254]')

    (opts, args) = parser.parse_args()
    # Load config file if specified
    if opts.config is not None:
        app.config.from_pyfile(opts.config)
    # Overwrite only those settings specified on the command line
    for k in dir(opts):
        if not k.startswith('_') and getattr(opts, k) is None:
            delattr(opts, k)
    app.config.from_object(opts)
    # Set slide file
    try:
        app.config['DEEPZOOM_SLIDE'] = args[0]
    except IndexError:
        if app.config['DEEPZOOM_SLIDE'] is None:
            parser.error('No slide file specified')

    app.run(host=opts.host, port=opts.port, threaded=True)

/**
 * Put an object into left, right or both eyes.
 * If it's a video sphere, take care of correct stereo mapping for both eyes (if full dome)
 * or half the sphere (if half dome)
 */
var stereoComponent = {
  schema: {
    eye: {
      type: 'string',
      default: 'left',
      oneOf: ['left', 'right', 'both']
    },
    mode: {
      type: 'string',
      default: 'full',
      oneOf: ['half', 'full']
    },
    split: {
      type: 'string',
      default: 'horizontal',
      oneOf: ['horizontal', 'vertical']
    }
  },

  init: function () {
    var data = this.data;
    var el = this.el;

    var materialAttribute = el.getAttribute('material');
    if (materialAttribute === null) return;

    // In A-Frame 0.2.0, objects are all groups so sphere is the first children
    var object3D = el.object3D.children[0];

    // Check if it's a sphere w/ video material, and if so
    // Note that in A-Frame 0.2.0, sphere entities are THREE.SphereBufferGeometry, while in A-Frame 0.3.0,
    // sphere entities are THREE.BufferGeometry.
    var validGeometries = [THREE.SphereGeometry, THREE.SphereBufferGeometry, THREE.BufferGeometry];
    var isValidGeometry = validGeometries.some(function (geometry) {
      return object3D.geometry instanceof geometry;
    });
    if (!isValidGeometry) return;

    // if half-dome mode, rebuild geometry (with default 100, radius, 64 width segments and 64 height segments)
    var geoDef = el.getAttribute('geometry');
    var radius = geoDef.radius || 100;
    var segmentsWidth = geoDef.segmentsWidth || 64;
    var segmentsHeight = geoDef.segmentsHeight || 64;

    if (data.mode === 'half') {
      var geometry = new THREE.SphereGeometry(radius, segmentsWidth, segmentsHeight, Math.PI / 2, Math.PI, 0, Math.PI);
    } else {
      var geometry = new THREE.SphereGeometry(radius, segmentsWidth, segmentsHeight);
    }

    // If left eye is set, and the split is horizontal, take the left half of the video texture. If the split
    // is set to vertical, take the top/upper half of the video texture.
    if (data.eye === 'left') {
      var uvs = geometry.faceVertexUvs[0];
      var axis = data.split === 'vertical' ? 'y' : 'x';
      for (var i = 0; i < uvs.length; i++) {
        for (var j = 0; j < 3; j++) {
          if (axis == 'x') {
            uvs[i][j][axis] *= 0.5;
          } else {
            uvs[i][j][axis] *= 0.5;
            uvs[i][j][axis] += 0.5;
          }
        }
      }
    }

    // If right eye is set, and the split is horizontal, take the right half of the video texture. If the split
    // is set to vertical, take the bottom/lower half of the video texture.
    if (data.eye === 'right') {
      var uvs = geometry.faceVertexUvs[0];
      var axis = data.split === 'vertical' ? 'y' : 'x';
      for (var i = 0; i < uvs.length; i++) {
        for (var j = 0; j < 3; j++) {
          if (axis == 'x') {
            uvs[i][j][axis] *= 0.5;
            uvs[i][j][axis] += 0.5;
          } else {
            uvs[i][j][axis] *= 0.5;
          }
        }
      }
    }

    // As AFrame 0.2.0 builds bufferspheres from sphere entities, transform
    // into buffergeometry for coherence
    object3D.geometry = new THREE.BufferGeometry().fromGeometry(geometry);
  },

  /**
   *  On element update, put in the right layer, 0:both, 1:left, 2:right (spheres or not)
   */
  update: function (oldData) {
    var object3D = this.el.object3D.children[0];
    var data = this.data;

    if (data.eye === 'both') {
      object3D.layers.set(0);
    } else {
      object3D.layers.set(data.eye === 'left' ? 1 : 2);
    }
  }
};

/**
 *  Sets the 'default' eye viewed by camera in non-VR mode
 */
var stereoCamComponent = {
  schema: {
    eye: {
      type: 'string',
      default: 'left',
      oneOf: ['left', 'right', 'both']
    }
  },

  /**
   * Cam is not attached on init, so use a flag to do this once at 'tick'
   * Use update every tick if flagged as 'not changed yet'
   */
  init: function () {
    // Flag to register if cam layer has already changed
    this.layerChanged = false;
  },

  tick: function (time) {
    var data = this.data;

    // If layer never changed
    if (!this.layerChanged) {
      // because stereocam component should be attached to an a-camera element
      // need to get down to the root PerspectiveCamera before addressing layers
      // Gather the children of this a-camera and identify types
      var childrenTypes = [];

      this.el.object3D.children.forEach(function (item, index, array) {
        childrenTypes[index] = item.type;
      });

      // Retrieve the PerspectiveCamera
      var rootIndex = childrenTypes.indexOf('PerspectiveCamera');
      var rootCam = this.el.object3D.children[rootIndex];

      if (data.eye === 'both') {
        rootCam.layers.enable(1);
        rootCam.layers.enable(2);
      } else {
        rootCam.layers.enable(data.eye === 'left' ? 1 : 2);
      }
    }
  }
};

module.exports = {
  'stereo_component': stereoComponent,
  'stereocam_component': stereoCamComponent
};

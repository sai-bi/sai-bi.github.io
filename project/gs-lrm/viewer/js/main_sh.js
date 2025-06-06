let cameras = [
    {
        id: 0,
        img_name: "00001",
        width: 1959,
        height: 1090,
        // worldToCam: [
        //     0.7071067336835231, -0.2418447478777454, 0.6644630179132355, 0.0, 
        //     -0.7071067336835231, -0.2418447478777454, 0.6644630179132355, 0.0, 
        //     0.0, -0.9396926425729166, -0.34202011447291336, 0.0, 
        //     1.2344237603869143e-16, 6.441155304133191e-08, 2.7000000234438857, 1.0], 
        worldToCam: [
                    0.7071067336835231, -0.707106733683523, -3.92523088301468e-17, 1.6385117771444577e-16,
                    -0.24184474787774538, -0.24184474787774538, -0.9396926425729167, 6.441155315947938e-08,
                    0.6644630179132355, 0.6644630179132355, -0.3420201144729133, 2.7000000234438852,
                    0.0, 0.0, 0.0, 1.0
                ],
        fy: 1164.6601287484507 / 2,
        fx: 1159.5880733038064 / 2,
    },
    {
        id: 1,
        img_name: "00002",
        width: 904 * 2,
        height: 512 * 2,
        // fx: 452.36956787109375 * 2,
        // fy: 455.4832763671875 * 2, 
        fx: 452.36956787109375 * 2,
        fy: 455.4832763671875 * 2, 
        worldToCam: [
                    0.9999071955680847, 0.003145491238683462, -0.013254744932055473, -0.05207660049200058,
                    -0.0031783170998096466, 0.9999918937683105, -0.002456201007589698, -0.18505729734897614,
                    0.013246911577880383, 0.0024981009773910046, 0.9999091029167175, 0.7018542885780334,
                    0.0, 0.0, 0.0, 1.0
                ]
    }
];

const sh_order = 3;
let rowLength = 3 * 4 + 3 * 4 + 4 + 4 + ((sh_order+ 1)**2-1) * 4 * 4; 
// originally its  ((sh_order+ 1)**2-1) * 3 * 4, we pad another another 4 bytes to make it easier to access in shader 

// see generateTexture
let float_per_row = rowLength / 4;
float_per_row = float_per_row % 4 == 0 ? float_per_row : (Math.floor(float_per_row / 4) + 1) * 4;
let byte_per_row = float_per_row * 4;



function getProjectionMatrix(fx, fy, width, height) {
    const znear = 0.2;
    const zfar = 500;
    return [
        [(2 * fx) / width, 0, 0, 0],
        [0, -(2 * fy) / height, 0, 0],
        [0, 0, zfar / (zfar - znear), 1],
        [0, 0, -(zfar * znear) / (zfar - znear), 0],
    ].flat();
}

function getViewMatrix(camera) {
  // this is not camToWorld, this is worldToCam !!!

  //   const R = camera.rotation.flat();
  //   const t = camera.position;
    let m = camera.worldToCam;
    console.log(m);
    const worldToCam = [
      m[0], m[4], m[8], m[12],
      m[1], m[5], m[9], m[13],
      m[2], m[6], m[10], m[14],
      m[3], m[7], m[11], m[15]
    ];
    return worldToCam;
}



function multiply4(a, b) {
  return [
    b[0] * a[0] + b[1] * a[4] + b[2] * a[8] + b[3] * a[12],
    b[0] * a[1] + b[1] * a[5] + b[2] * a[9] + b[3] * a[13],
    b[0] * a[2] + b[1] * a[6] + b[2] * a[10] + b[3] * a[14],
    b[0] * a[3] + b[1] * a[7] + b[2] * a[11] + b[3] * a[15],
    b[4] * a[0] + b[5] * a[4] + b[6] * a[8] + b[7] * a[12],
    b[4] * a[1] + b[5] * a[5] + b[6] * a[9] + b[7] * a[13],
    b[4] * a[2] + b[5] * a[6] + b[6] * a[10] + b[7] * a[14],
    b[4] * a[3] + b[5] * a[7] + b[6] * a[11] + b[7] * a[15],
    b[8] * a[0] + b[9] * a[4] + b[10] * a[8] + b[11] * a[12],
    b[8] * a[1] + b[9] * a[5] + b[10] * a[9] + b[11] * a[13],
    b[8] * a[2] + b[9] * a[6] + b[10] * a[10] + b[11] * a[14],
    b[8] * a[3] + b[9] * a[7] + b[10] * a[11] + b[11] * a[15],
    b[12] * a[0] + b[13] * a[4] + b[14] * a[8] + b[15] * a[12],
    b[12] * a[1] + b[13] * a[5] + b[14] * a[9] + b[15] * a[13],
    b[12] * a[2] + b[13] * a[6] + b[14] * a[10] + b[15] * a[14],
    b[12] * a[3] + b[13] * a[7] + b[14] * a[11] + b[15] * a[15],
  ];
}

function invert4(a) {
  let b00 = a[0] * a[5] - a[1] * a[4];
  let b01 = a[0] * a[6] - a[2] * a[4];
  let b02 = a[0] * a[7] - a[3] * a[4];
  let b03 = a[1] * a[6] - a[2] * a[5];
  let b04 = a[1] * a[7] - a[3] * a[5];
  let b05 = a[2] * a[7] - a[3] * a[6];
  let b06 = a[8] * a[13] - a[9] * a[12];
  let b07 = a[8] * a[14] - a[10] * a[12];
  let b08 = a[8] * a[15] - a[11] * a[12];
  let b09 = a[9] * a[14] - a[10] * a[13];
  let b10 = a[9] * a[15] - a[11] * a[13];
  let b11 = a[10] * a[15] - a[11] * a[14];
  let det =
    b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
  if (!det) return null;
  return [
    (a[5] * b11 - a[6] * b10 + a[7] * b09) / det,
    (a[2] * b10 - a[1] * b11 - a[3] * b09) / det,
    (a[13] * b05 - a[14] * b04 + a[15] * b03) / det,
    (a[10] * b04 - a[9] * b05 - a[11] * b03) / det,
    (a[6] * b08 - a[4] * b11 - a[7] * b07) / det,
    (a[0] * b11 - a[2] * b08 + a[3] * b07) / det,
    (a[14] * b02 - a[12] * b05 - a[15] * b01) / det,
    (a[8] * b05 - a[10] * b02 + a[11] * b01) / det,
    (a[4] * b10 - a[5] * b08 + a[7] * b06) / det,
    (a[1] * b08 - a[0] * b10 - a[3] * b06) / det,
    (a[12] * b04 - a[13] * b02 + a[15] * b00) / det,
    (a[9] * b02 - a[8] * b04 - a[11] * b00) / det,
    (a[5] * b07 - a[4] * b09 - a[6] * b06) / det,
    (a[0] * b09 - a[1] * b07 + a[2] * b06) / det,
    (a[13] * b01 - a[12] * b03 - a[14] * b00) / det,
    (a[8] * b03 - a[9] * b01 + a[10] * b00) / det,
  ];
}

function rotate4(a, rad, x, y, z) {
  let len = Math.hypot(x, y, z);
  x /= len;
  y /= len;
  z /= len;
  let s = Math.sin(rad);
  let c = Math.cos(rad);
  let t = 1 - c;
  let b00 = x * x * t + c;
  let b01 = y * x * t + z * s;
  let b02 = z * x * t - y * s;
  let b10 = x * y * t - z * s;
  let b11 = y * y * t + c;
  let b12 = z * y * t + x * s;
  let b20 = x * z * t + y * s;
  let b21 = y * z * t - x * s;
  let b22 = z * z * t + c;
  return [
    a[0] * b00 + a[4] * b01 + a[8] * b02,
    a[1] * b00 + a[5] * b01 + a[9] * b02,
    a[2] * b00 + a[6] * b01 + a[10] * b02,
    a[3] * b00 + a[7] * b01 + a[11] * b02,
    a[0] * b10 + a[4] * b11 + a[8] * b12,
    a[1] * b10 + a[5] * b11 + a[9] * b12,
    a[2] * b10 + a[6] * b11 + a[10] * b12,
    a[3] * b10 + a[7] * b11 + a[11] * b12,
    a[0] * b20 + a[4] * b21 + a[8] * b22,
    a[1] * b20 + a[5] * b21 + a[9] * b22,
    a[2] * b20 + a[6] * b21 + a[10] * b22,
    a[3] * b20 + a[7] * b21 + a[11] * b22,
    ...a.slice(12, 16),
  ];
}

function translate4(a, x, y, z) {
  return [
    ...a.slice(0, 12),
    a[0] * x + a[4] * y + a[8] * z + a[12],
    a[1] * x + a[5] * y + a[9] * z + a[13],
    a[2] * x + a[6] * y + a[10] * z + a[14],
    a[3] * x + a[7] * y + a[11] * z + a[15],
  ];
}

function createWorker(self) {
  let buffer;
  let vertexCount = 0;
  let viewProj;
  // 6*4 + 4 + 4 = 8*4
  // XYZ - Position (Float32)
  // XYZ - Scale (Float32)
  // RGBA - colors (uint8)
  // IJKL - quaternion/rot (uint8)
  // const rowLength = 3 * 4 + 3 * 4 + 4 + 4;
  const sh_order = 3;
  const rowLength = 3 * 4 + 3 * 4 + 4 + 4 + ((sh_order+ 1)**2-1) * 4 * 4;
  var ori_float_per_row = rowLength / 4;
  var ori_byte_per_row = rowLength;


  let lastProj = [];
  let depthIndex = new Uint32Array();
  let lastVertexCount = 0;

  var _floatView = new Float32Array(1);
  var _int32View = new Int32Array(_floatView.buffer);

  function floatToHalf(float) {
    _floatView[0] = float;
    var f = _int32View[0];

    var sign = (f >> 31) & 0x0001;
    var exp = (f >> 23) & 0x00ff;
    var frac = f & 0x007fffff;

    var newExp;
    if (exp == 0) {
      newExp = 0;
    } else if (exp < 113) {
      newExp = 0;
      frac |= 0x00800000;
      frac = frac >> (113 - exp);
      if (frac & 0x01000000) {
        newExp = 1;
        frac = 0;
      }
    } else if (exp < 142) {
      newExp = exp - 112;
    } else {
      newExp = 31;
      frac = 0;
    }

    return (sign << 15) | (newExp << 10) | (frac >> 13);
  }

  function packHalf2x16(x, y) {
    return (floatToHalf(x) | (floatToHalf(y) << 16)) >>> 0;
  }

  function generateTexture() {
    if (!buffer) return;
    const f_buffer = new Float32Array(buffer);
    const u_buffer = new Uint8Array(buffer);

    // var texwidth = 1024 * 2; // Set to your desired width
    // var texheight = Math.ceil((2 * vertexCount) / texwidth); // Set to your desired height

    // var float_per_row = Math.ceil(rowLength / 4);  
    // the smallest number > rowLength that can be divided by 4

    var float_per_row = rowLength / 4;
    // var float_per_row = 8;
    float_per_row = float_per_row % 4 == 0 ? float_per_row : (Math.floor(float_per_row / 4) + 1) * 4;
    var byte_per_row = float_per_row * 4;


    
    var texwidth = 256 * float_per_row / 4; // Set to your desired width
    var texheight = Math.ceil((float_per_row / 4 * vertexCount) / texwidth); // Set to your desired height

    // var texdata = new Uint32Array(texwidth * texheight * 4); // 4 components per pixel (RGBA)
    var texdata = new Uint32Array(texwidth * texheight * 4); // 4 components per pixel (RGBA)

    var texdata_c = new Uint8Array(texdata.buffer);
    var texdata_f = new Float32Array(texdata.buffer);

    // Here we convert from a .splat file buffer into a texture
    // With a little bit more foresight perhaps this texture file
    // should have been the native format as it'd be very easy to
    // load it into webgl.
    console.log("ori_float_per_row: ", ori_float_per_row);
    console.log("ori_byte_per_row: ", ori_byte_per_row);
    console.log("float_per_row: ", float_per_row);
    console.log("textwidth: ", texwidth);
    console.log("textheight: ", texheight);

    for (let i = 0; i < vertexCount; i++) {
      // x, y, z
      texdata_f[float_per_row * i + 0] = f_buffer[ori_float_per_row * i + 0];
      texdata_f[float_per_row * i + 1] = f_buffer[ori_float_per_row * i + 1];
      texdata_f[float_per_row * i + 2] = f_buffer[ori_float_per_row * i + 2];

      // r, g, b, a
      texdata_c[4 * (float_per_row * i + 7) + 0] = u_buffer[ori_byte_per_row * i + 24 + 0];
      texdata_c[4 * (float_per_row * i + 7) + 1] = u_buffer[ori_byte_per_row * i + 24 + 1];
      texdata_c[4 * (float_per_row * i + 7) + 2] = u_buffer[ori_byte_per_row * i + 24 + 2];
      texdata_c[4 * (float_per_row * i + 7) + 3] = u_buffer[ori_byte_per_row * i + 24 + 3];

      // quaternions
      let scale = [
        f_buffer[ori_float_per_row * i + 3 + 0],
        f_buffer[ori_float_per_row * i + 3 + 1],
        f_buffer[ori_float_per_row * i + 3 + 2],
      ];
      let rot = [
        (u_buffer[ori_byte_per_row * i + 28 + 0] - 128) / 128,
        (u_buffer[ori_byte_per_row * i + 28 + 1] - 128) / 128,
        (u_buffer[ori_byte_per_row * i + 28 + 2] - 128) / 128,
        (u_buffer[ori_byte_per_row * i + 28 + 3] - 128) / 128,
      ];

      // Compute the matrix product of S and R (M = S * R)
      const M = [
        1.0 - 2.0 * (rot[2] * rot[2] + rot[3] * rot[3]),
        2.0 * (rot[1] * rot[2] + rot[0] * rot[3]),
        2.0 * (rot[1] * rot[3] - rot[0] * rot[2]),

        2.0 * (rot[1] * rot[2] - rot[0] * rot[3]),
        1.0 - 2.0 * (rot[1] * rot[1] + rot[3] * rot[3]),
        2.0 * (rot[2] * rot[3] + rot[0] * rot[1]),

        2.0 * (rot[1] * rot[3] + rot[0] * rot[2]),
        2.0 * (rot[2] * rot[3] - rot[0] * rot[1]),
        1.0 - 2.0 * (rot[1] * rot[1] + rot[2] * rot[2]),
      ].map((k, i) => k * scale[Math.floor(i / 3)]);

      const sigma = [
        M[0] * M[0] + M[3] * M[3] + M[6] * M[6],
        M[0] * M[1] + M[3] * M[4] + M[6] * M[7],
        M[0] * M[2] + M[3] * M[5] + M[6] * M[8],
        M[1] * M[1] + M[4] * M[4] + M[7] * M[7],
        M[1] * M[2] + M[4] * M[5] + M[7] * M[8],
        M[2] * M[2] + M[5] * M[5] + M[8] * M[8],
      ];

      texdata[float_per_row * i + 4] = packHalf2x16(4 * sigma[0], 4 * sigma[1]);
      texdata[float_per_row * i + 5] = packHalf2x16(4 * sigma[2], 4 * sigma[3]);
      texdata[float_per_row * i + 6] = packHalf2x16(4 * sigma[4], 4 * sigma[5]);


      if (sh_order > 0) {
        for (var j = 0; j < ((sh_order + 1)**2 - 1) * 4; j++) {
          texdata_f[float_per_row * i + 8 + j] = f_buffer[ori_float_per_row * i + 8 + j];
        }
      }
    }

    // print the first 10 rows
    // for (let i = 0; i < 10; i++) {
    //   console.log(texdata.slice(i * float_per_row, i * float_per_row + 10));
    // }

    self.postMessage({ texdata, texwidth, texheight }, [texdata.buffer]);
  }

  function runSort(viewProj) {
    if (!buffer) return;
    const f_buffer = new Float32Array(buffer);
    if (lastVertexCount == vertexCount) {
      let dot =
        lastProj[2] * viewProj[2] +
        lastProj[6] * viewProj[6] +
        lastProj[10] * viewProj[10];
      if (Math.abs(dot - 1) < 0.01) {
        return;
      }
    } else {
      generateTexture();
      lastVertexCount = vertexCount;
    }

    console.time("sort");
    let maxDepth = -Infinity;
    let minDepth = Infinity;
    let sizeList = new Int32Array(vertexCount);
    for (let i = 0; i < vertexCount; i++) {
      let depth =
        ((viewProj[2] * f_buffer[ori_float_per_row * i + 0] +
          viewProj[6] * f_buffer[ori_float_per_row * i + 1] +
          viewProj[10] * f_buffer[ori_float_per_row * i + 2]) *
          4096) |
        0;
      sizeList[i] = depth;
      if (depth > maxDepth) maxDepth = depth;
      if (depth < minDepth) minDepth = depth;
    }

    // This is a 16 bit single-pass counting sort
    let depthInv = (256 * 256) / (maxDepth - minDepth);
    let counts0 = new Uint32Array(256 * 256);
    for (let i = 0; i < vertexCount; i++) {
      sizeList[i] = ((sizeList[i] - minDepth) * depthInv) | 0;
      counts0[sizeList[i]]++;
    }
    let starts0 = new Uint32Array(256 * 256);
    for (let i = 1; i < 256 * 256; i++)
      starts0[i] = starts0[i - 1] + counts0[i - 1];
    depthIndex = new Uint32Array(vertexCount);
    for (let i = 0; i < vertexCount; i++)
      depthIndex[starts0[sizeList[i]]++] = i;

    console.timeEnd("sort");

    lastProj = viewProj;
    self.postMessage({ depthIndex, viewProj, vertexCount }, [
      depthIndex.buffer,
    ]);
  }

  function processPlyBuffer(inputBuffer) {
    const ubuf = new Uint8Array(inputBuffer);
    // 10KB ought to be enough for a header...
    const header = new TextDecoder().decode(ubuf.slice(0, 1024 * 10));
    const header_end = "end_header\n";
    const header_end_index = header.indexOf(header_end);
    if (header_end_index < 0)
      throw new Error("Unable to read .ply file header");
    const vertexCount = parseInt(/element vertex (\d+)\n/.exec(header)[1]);
    console.log("Vertex Count", vertexCount);

    let row_offset = 0,
      offsets = {},
      types = {};
    const TYPE_MAP = {
      double: "getFloat64",
      int: "getInt32",
      uint: "getUint32",
      float: "getFloat32",
      short: "getInt16",
      ushort: "getUint16",
      uchar: "getUint8",
    };
    for (let prop of header
      .slice(0, header_end_index)
      .split("\n")
      .filter((k) => k.startsWith("property "))) {
      const [p, type, name] = prop.split(" ");
      const arrayType = TYPE_MAP[type] || "getInt8";
      types[name] = arrayType;
      offsets[name] = row_offset;
      row_offset += parseInt(arrayType.replace(/[^\d]/g, "")) / 8;
    }
    console.log("Bytes per row", row_offset, types, offsets);

    let dataView = new DataView(
      inputBuffer,
      header_end_index + header_end.length
    );
    let row = 0;
    const attrs = new Proxy(
      {},
      {
        get(target, prop) {
          if (!types[prop]) throw new Error(prop + " not found");
          return dataView[types[prop]](row * row_offset + offsets[prop], true);
        },
      }
    );

    console.time("calculate importance");
    let sizeList = new Float32Array(vertexCount);
    let sizeIndex = new Uint32Array(vertexCount);
    for (row = 0; row < vertexCount; row++) {
      sizeIndex[row] = row;
      if (!types["scale_0"]) continue;
      const size =
        Math.exp(attrs.scale_0) *
        Math.exp(attrs.scale_1) *
        Math.exp(attrs.scale_2);
      const opacity = 1 / (1 + Math.exp(-attrs.opacity));
      sizeList[row] = size * opacity;
    }
    console.timeEnd("calculate importance");

    console.time("sort");
    sizeIndex.sort((b, a) => sizeList[a] - sizeList[b]);
    console.timeEnd("sort");

    // 6*4 + 4 + 4 = 8*4
    // XYZ - Position (Float32)
    // XYZ - Scale (Float32)
    // RGBA - colors (uint8)
    // IJKL - quaternion/rot (uint8)
    // sh features - (Float32)  (sh_order + 1) ** 2 * 3 * 4  
    // const rowLength = 3 * 4 + 3 * 4 + 4 + 4 + ((sh_order + 1)**2 - 1) * 3 * 4;
    const buffer = new ArrayBuffer(rowLength * vertexCount);

 

    console.time("build buffer");
    console.log("rowLength: ", rowLength);
    for (let j = 0; j < vertexCount; j++) {
      row = sizeIndex[j];
      
      const position = new Float32Array(buffer, j * rowLength, 3);
      const scales = new Float32Array(buffer, j * rowLength + 4 * 3, 3);
      const rgba = new Uint8ClampedArray(
        buffer,
        j * rowLength + 4 * 3 + 4 * 3,
        4
      );
      const rot = new Uint8ClampedArray(
        buffer,
        j * rowLength + 4 * 3 + 4 * 3 + 4,
        4
      );
      
      // here the sh coef is changed from 3 to 4 to make it easier to access in shader 
      const sh_feature = new Float32Array(buffer, j * rowLength + 4 * 3 + 4 * 3 + 4 + 4, ((sh_order + 1)**2 - 1) * 4);

      if (types["scale_0"]) {
        const qlen = Math.sqrt(
          attrs.rot_0 ** 2 +
            attrs.rot_1 ** 2 +
            attrs.rot_2 ** 2 +
            attrs.rot_3 ** 2
        );

        rot[0] = (attrs.rot_0 / qlen) * 128 + 128;
        rot[1] = (attrs.rot_1 / qlen) * 128 + 128;
        rot[2] = (attrs.rot_2 / qlen) * 128 + 128;
        rot[3] = (attrs.rot_3 / qlen) * 128 + 128;

        scales[0] = Math.exp(attrs.scale_0);
        scales[1] = Math.exp(attrs.scale_1);
        scales[2] = Math.exp(attrs.scale_2);
      } else {
        scales[0] = 0.01;
        scales[1] = 0.01;
        scales[2] = 0.01;

        rot[0] = 255;
        rot[1] = 0;
        rot[2] = 0;
        rot[3] = 0;
      }

      position[0] = attrs.x;
      position[1] = attrs.y;
      position[2] = attrs.z;

      if (types["f_dc_0"]) {
        const SH_C0 = 0.28209479177387814;
        rgba[0] = (0.5 + SH_C0 * attrs.f_dc_0) * 255;
        rgba[1] = (0.5 + SH_C0 * attrs.f_dc_1) * 255;
        rgba[2] = (0.5 + SH_C0 * attrs.f_dc_2) * 255;

        // sh_feature[0] = attrs.f_dc_0;
        // sh_feature[1] = attrs.f_dc_1;
        // sh_feature[2] = attrs.f_dc_2;
      } else {
        rgba[0] = attrs.red;
        rgba[1] = attrs.green;
        rgba[2] = attrs.blue;
        console.log("something is wrong!")
      }

      if (types["f_rest_0"]) {
        for (let i = 0; i < ((sh_order + 1)**2-1); i++) {
          sh_feature[4*i] = attrs[`f_rest_${3*i}`];
          sh_feature[4*i+1] = attrs[`f_rest_${3*i+1}`];
          sh_feature[4*i+2] = attrs[`f_rest_${3*i+2}`];
          sh_feature[4*i+3] = 0;
        }

        if (j == 0) {
          console.log(attrs.f_rest_3);
          console.log(attrs.f_rest_4);
          console.log(attrs.f_rest_5);
          console.log("sh_feature: ", sh_feature);
        }
      }     

      if (types["opacity"]) {
        rgba[3] = (1 / (1 + Math.exp(-attrs.opacity))) * 255;
      } else {
        rgba[3] = 255;
      }
    }
    console.timeEnd("build buffer");
    return buffer;
  }

  const throttledSort = () => {
    if (!sortRunning) {
      sortRunning = true;
      let lastView = viewProj;
      runSort(lastView);
      setTimeout(() => {
        sortRunning = false;
        if (lastView !== viewProj) {
          throttledSort();
        }
      }, 0);
    }
  };

  let sortRunning;
  self.onmessage = (e) => {
    if (e.data.ply) {
      vertexCount = 0;
      runSort(viewProj);
      buffer = processPlyBuffer(e.data.ply);
      vertexCount = Math.floor(buffer.byteLength / rowLength);
      postMessage({ buffer: buffer });
    } else if (e.data.buffer) {
      buffer = e.data.buffer;
      vertexCount = e.data.vertexCount;
    } else if (e.data.vertexCount) {
      vertexCount = e.data.vertexCount;
    } else if (e.data.view) {
      viewProj = e.data.view;
      throttledSort();
    }
  };
}

const vertexShaderSource = `
#version 300 es
precision highp float;
precision highp int;

uniform highp usampler2D u_texture;
uniform mat4 projection, view;
uniform vec2 focal;
uniform vec2 viewport;

in vec2 position;
in int index;

out vec4 vColor;
out vec2 vPosition;


float C0 = 0.28209479177387814;
float C1 = 0.4886025119029199;
float C2[5] = float[](
    1.0925484305920792,
    -1.0925484305920792,
    0.31539156525252005,
    -1.0925484305920792,
    0.5462742152960396
);
float C3[7] = float[](
    -0.5900435899266435,
    2.890611442640554,
    -0.4570457994644658,
    0.3731763325901154,
    -0.4570457994644658,
    1.445305721320277,
    -0.5900435899266435
);
float C4[9] = float[](
    2.5033429417967046,
    -1.7701307697799304,
    0.9461746957575601,
    -0.6690465435572892,
    0.10578554691520431,
    -0.6690465435572892,
    0.47308734787878004,
    -1.7701307697799304,
    0.6258357354491761
);


void main () {

    uint temp = 255u; 
    uvec4 cen = texelFetch(u_texture, ivec2((uint(index) & temp) * ${float_per_row/4}u, uint(index) >> 8), 0);
    vec4 cam = view * vec4(uintBitsToFloat(cen.xyz), 1);
    vec4 pos2d = projection * cam;

    float clip = 1.2 * pos2d.w;
    if (pos2d.z < -clip || pos2d.x < -clip || pos2d.x > clip || pos2d.y < -clip || pos2d.y > clip) {
        gl_Position = vec4(0.0, 0.0, 2.0, 1.0);
        return;
    }

    // uint temp = 0x3ffu;

    uvec4 cov = texelFetch(u_texture, ivec2(((uint(index) & temp) * ${float_per_row/4}u + 1u), uint(index) >> 8), 0);
    vec2 u1 = unpackHalf2x16(cov.x), u2 = unpackHalf2x16(cov.y), u3 = unpackHalf2x16(cov.z);
    mat3 Vrk = mat3(u1.x, u1.y, u2.x, u1.y, u2.y, u3.x, u2.x, u3.x, u3.y);

    mat3 J = mat3(
        focal.x / cam.z, 0., -(focal.x * cam.x) / (cam.z * cam.z), 
        0., -focal.y / cam.z, (focal.y * cam.y) / (cam.z * cam.z), 
        0., 0., 0.
    );

    mat3 T = transpose(mat3(view)) * J;
    mat3 cov2d = transpose(T) * Vrk * T;

    float mid = (cov2d[0][0] + cov2d[1][1]) / 2.0;
    float radius = length(vec2((cov2d[0][0] - cov2d[1][1]) / 2.0, cov2d[0][1]));
    float lambda1 = mid + radius, lambda2 = mid - radius;

    if(lambda2 < 0.0) return;
    vec2 diagonalVector = normalize(vec2(cov2d[0][1], lambda1 - cov2d[0][0]));
    vec2 majorAxis = min(sqrt(2.0 * lambda1), 1024.0) * diagonalVector;
    vec2 minorAxis = min(sqrt(2.0 * lambda2), 1024.0) * vec2(diagonalVector.y, -diagonalVector.x);

    
    vec3 splat_pos = vec3(uintBitsToFloat(cen.xyz));
    vec3 cam_pos = (inverse(view) * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
    // mat3 viewModelDir = mat3(view);
    // vec3 cam_pos = -transpose(viewModelDir) * view[3].xyz;



    vec3 dirs = normalize(splat_pos - cam_pos);

    // vec3 diffuse = clamp(pos2d.z/pos2d.w+1.0, 0.0, 1.0)  * vec3((cov.w) & 0xffu, (cov.w >> 8) & 0xffu, (cov.w >> 16) & 0xffu) / 255.0;

    vColor = clamp(pos2d.z/pos2d.w+1.0, 0.0, 1.0) * vec4((cov.w) & 0xffu, (cov.w >> 8) & 0xffu, (cov.w >> 16) & 0xffu, (cov.w >> 24) & 0xffu) / 255.0;
    vec3 dep = vec3(0.0, 0.0, 0.0);

    vec4 sh_coef; 
    uint offset = 2u;


    if (${sh_order}u > 0u) {
        float x = dirs.x;
        float y = dirs.y;
        float z = dirs.z;
        float xx = x * x;
        float yy = y * y;
        float zz = z * z;
        float xy = x * y;
        float yz = y * z;
        float xz = x * z;


        float coefs[24] = float[](
          // SH_1
          -C1 * y,
          C1 * z,
          -C1 * x,
          // SH_2
          + C2[0] * xy, 
          + C2[1] * yz, 
          + C2[2] * (2.0 * zz - xx - yy), 
          + C2[3] * xz, 
          + C2[4] * (xx - yy), 
          // SH_3,
          + C3[0] * y * (3.0 * xx - yy),
          + C3[1] * xy * z, 
          + C3[2] * y * (4.0 * zz - xx - yy), 
          + C3[3] * z * (2.0 * zz - 3.0 * xx - 3.0 * yy), 
          + C3[4] * x * (4.0 * zz - xx - yy), 
          + C3[5] * z * (xx - yy), 
          + C3[6] * x * (xx - 3.0 * yy),
          // SH_4
          + C4[0] * xy * (xx - yy),
          + C4[1] * yz * (3.0 * xx - yy),
          + C4[2] * xy * (7.0 * zz - 1.0),
          + C4[3] * yz * (7.0 * zz - 3.0), 
          + C4[4] * (zz * (35.0 * zz - 30.0) + 3.0),
          + C4[5] * xz * (7.0 * zz - 3.0),
          + C4[6] * (xx - yy) * (7.0 * zz - 1.0), 
          + C4[7] * xz * (xx - 3.0 * yy), 
          + C4[8] * (xx * (xx - 3.0 * yy) - yy * (3.0 * xx - yy))
      );

      
      for (uint i = 0u; i < (${sh_order}u + 1u) * (${sh_order}u + 1u) - 1u; i++) {
          // sh_coef = uintBitsToFloat(texelFetch(u_texture, ivec2(2u, 0u), 0)); 
          sh_coef = uintBitsToFloat(texelFetch(u_texture, ivec2(((uint(index) & temp) * ${float_per_row/4}u + offset), uint(index) >> 8), 0)); 
          offset = offset + 1u;
          dep = dep + coefs[i] * sh_coef.xyz;
          // break;
      }
    }

    // vColor = clamp(pos2d.z/pos2d.w+1.0, 0.0, 1.0)  * vec4(diffuse + dep, float((cov.w >> 24) & 0xffu) / 255.0); 
    // vColor = clamp(pos2d.z/pos2d.w+1.0, 0.0, 1.0)  * vec4(diffuse + dep, float((cov.w >> 24) & 0xffu) / 255.0); 
    // vColor = diffuse + dep;
    vColor.rgb = vColor.rgb + dep;
    // vColor.rgb = clamp(sh_coef.xyz + 0.5, 0.0, 1.0);  
    // vColor.w = 1.0;
 
    // vColor = clamp(pos2d.z/pos2d.w+1.0, 0.0, 1.0) * vec4((cov.w) & 0xffu, (cov.w >> 8) & 0xffu, (cov.w >> 16) & 0xffu, (cov.w >> 24) & 0xffu) / 255.0;

    vPosition = position;

    vec2 vCenter = vec2(pos2d) / pos2d.w;
    gl_Position = vec4(
        vCenter 
        + position.x * majorAxis / viewport 
        + position.y * minorAxis / viewport, 0.0, 1.0);

}
`.trim();

const fragmentShaderSource = `
#version 300 es
precision highp float;

in vec4 vColor;
in vec2 vPosition;

out vec4 fragColor;

void main () {
    float A = -dot(vPosition, vPosition);
    if (A < -4.0) discard;
    float B = exp(A) * vColor.a;
    fragColor = vec4(B * vColor.rgb, B);
}

`.trim();

// let defaultViewMatrix = [
//     0.47, 0.04, 0.88, 0, -0.11, 0.99, 0.02, 0, -0.88, -0.11, 0.47, 0, 0.07,
//     0.03, 6.55, 1,
// ];

// let defaultViewMatrix = [
//   0.7071068286895752, -0.7071068286895752, -0.0, 0.0, -0.24184474349021917,
//   -0.24184474349021914, -0.9396926164627075, 0.0, 0.6644630432128906,
//   0.6644630432128907, -0.3420201241970063, 0.0, -1.794050216674805,
//   -1.794050216674805, 0.9234544038772584, 1.0,
// ];

// let defaultViewMatrix = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 3, 0, 1];
// let viewMatrix = defaultViewMatrix;

const params = new URLSearchParams(location.search);

let temp = params.get("is_object") || "true";

let defaultViewMatrix = getViewMatrix(cameras[0]);
// if (temp == "true") {
//   defaultViewMatrix = getViewMatrix(cameras[0]);
// }
// else {
//   defaultViewMatrix = getViewMatrix(cameras[1]);
// }
let viewMatrix = defaultViewMatrix;
let currentCameraIndex = 0

async function main() {
  let carousel = false;
  const params = new URLSearchParams(location.search);
  try {
    viewMatrix = JSON.parse(decodeURIComponent(location.hash.slice(1)));
    carousel = false;
  } catch (err) {}

  let base_url = window.location.href;
  let params_url =  params.get("url")  || "assets/demo.ply";

  let url = "";
  if (params_url.startsWith("http")) {
    url = new URL(params_url);
  } 
  else {
    url = new URL(
      params.get("url")  || "assets/demo.ply",
      base_url
    );
  }

  // get the parent URL of window.location.href
  console.log(base_url);
  console.log(url);
 
  is_object = params.get("is_object") || "true";

  if (is_object == "true") {
    console.log("load object");
    cameras = [cameras[0]];
  }
  else {
    console.log("load scene");
    cameras = [cameras[1]];
  }
  camera = cameras[currentCameraIndex];

  camera.fx = params.get("fx") || camera.fx;
  camera.fy = params.get("fy") || camera.fy; 

  let pass_in_w2c = params.get("w2c");
  try {
      pass_in_w2c = pass_in_w2c ? pass_in_w2c.split(",").map(parseFloat) : camera.worldToCam;
      console.log("pass_in_w2c", pass_in_w2c);
  }
  catch (err) {
    console.log(err);
  }
  console.log(camera.worldToCam);

  defaultViewMatrix = getViewMatrix(camera);
  viewMatrix = defaultViewMatrix;

  



  const req = await fetch(url, {
    mode: "cors", // no-cors, *cors, same-origin
    credentials: "omit", // include, *same-origin, omit
  });
  console.log(req);
  if (req.status != 200)
    throw new Error(req.status + " Unable to load " + req.url);

  // const rowLength = 3 * 4 + 3 * 4 + 4 + 4;
  const rowLength = 3 * 4 + 3 + 3 * 4 + ((sh_order+1)**2 - 1) * 3 * 4 + 8 * 4 + 2; // for our format
  // const rowLength = 3 * 4 + 3 + 3 * 4 + 45 * 4 + 8 * 4 + 2; // for our format
  const reader = req.body.getReader();
  let splatData = new Uint8Array(req.headers.get("content-length"));

  // const downsample =
  //   splatData.length / rowLength > 500000 ? 1 : 1 / devicePixelRatio;
  // console.log(splatData.length / rowLength, downsample);
  const downsample = 1;

  const worker = new Worker(
    URL.createObjectURL(
      new Blob(["(", createWorker.toString(), ")(self)"], {
        type: "application/javascript",
      })
    )
  );

  // worker.postMessage({ ply: splatData.buffer });

  const canvas = document.getElementById("canvas");
  const fps = document.getElementById("fps");
  const camid = document.getElementById("camid");

  let projectionMatrix;

  const gl = canvas.getContext("webgl2", {
    antialias: false,
  });

  const vertexShader = gl.createShader(gl.VERTEX_SHADER);
  gl.shaderSource(vertexShader, vertexShaderSource);
  gl.compileShader(vertexShader);
  if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS))
    console.error(gl.getShaderInfoLog(vertexShader));

  const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(fragmentShader, fragmentShaderSource);
  gl.compileShader(fragmentShader);
  if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS))
    console.error(gl.getShaderInfoLog(fragmentShader));

  const program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  gl.useProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS))
    console.error(gl.getProgramInfoLog(program));

  gl.disable(gl.DEPTH_TEST); // Disable depth testing

  // Enable blending
  gl.enable(gl.BLEND);
  gl.blendFuncSeparate(
    gl.ONE_MINUS_DST_ALPHA,
    gl.ONE,
    gl.ONE_MINUS_DST_ALPHA,
    gl.ONE
  );
  gl.blendEquationSeparate(gl.FUNC_ADD, gl.FUNC_ADD);

  const u_projection = gl.getUniformLocation(program, "projection");
  const u_viewport = gl.getUniformLocation(program, "viewport");
  const u_focal = gl.getUniformLocation(program, "focal");
  const u_view = gl.getUniformLocation(program, "view");

  // positions
  const triangleVertices = new Float32Array([-2, -2, 2, -2, 2, 2, -2, 2]);
  const vertexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, triangleVertices, gl.STATIC_DRAW);
  const a_position = gl.getAttribLocation(program, "position");
  gl.enableVertexAttribArray(a_position);
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  gl.vertexAttribPointer(a_position, 2, gl.FLOAT, false, 0, 0);

  var texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);

  var u_textureLocation = gl.getUniformLocation(program, "u_texture");
  gl.uniform1i(u_textureLocation, 0);

  const indexBuffer = gl.createBuffer();
  const a_index = gl.getAttribLocation(program, "index");
  gl.enableVertexAttribArray(a_index);
  gl.bindBuffer(gl.ARRAY_BUFFER, indexBuffer);
  gl.vertexAttribIPointer(a_index, 1, gl.INT, false, 0, 0);
  gl.vertexAttribDivisor(a_index, 1);

  const resize = () => {
    gl.uniform2fv(u_focal, new Float32Array([camera.fx, camera.fy]));

    projectionMatrix = getProjectionMatrix(
      camera.fx,
      camera.fy,
      innerWidth,
      innerHeight
    );

    gl.uniform2fv(u_viewport, new Float32Array([innerWidth, innerHeight]));

    gl.canvas.width = Math.round(innerWidth / downsample);
    gl.canvas.height = Math.round(innerHeight / downsample);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    gl.uniformMatrix4fv(u_projection, false, projectionMatrix);
  };

  window.addEventListener("resize", resize);
  resize();

  worker.onmessage = (e) => {
    if (e.data.buffer) {
      // splatData = new Uint8Array(e.data.buffer);
      // const blob = new Blob([splatData.buffer], {
      //     type: "application/octet-stream",
      // });
      // const link = document.createElement("a");
      // link.download = "model.splat";
      // link.href = URL.createObjectURL(blob);
      // document.body.appendChild(link);
      // link.click();
    } else if (e.data.texdata) {
      const { texdata, texwidth, texheight } = e.data;
      // console.log(texdata)
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA32UI,
        texwidth,
        texheight,
        0,
        gl.RGBA_INTEGER,
        gl.UNSIGNED_INT,
        texdata
      );
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texture);
    } else if (e.data.depthIndex) {
      const { depthIndex, viewProj } = e.data;
      gl.bindBuffer(gl.ARRAY_BUFFER, indexBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, depthIndex, gl.DYNAMIC_DRAW);
      vertexCount = e.data.vertexCount;
    }
  };

  let activeKeys = [];
  // let currentCameraIndex = 0;

  window.addEventListener("keydown", (e) => {
    // if (document.activeElement != document.body) return;
    carousel = false;
    if (!activeKeys.includes(e.code)) activeKeys.push(e.code);
    if (/\d/.test(e.key)) {
      currentCameraIndex = parseInt(e.key);
      camera = cameras[currentCameraIndex];
      viewMatrix = getViewMatrix(camera);
    }
    if (["-", "_"].includes(e.key)) {
      currentCameraIndex =
        (currentCameraIndex + cameras.length - 1) % cameras.length;
      viewMatrix = getViewMatrix(cameras[currentCameraIndex]);
    }
    if (["+", "="].includes(e.key)) {
      currentCameraIndex = (currentCameraIndex + 1) % cameras.length;
      viewMatrix = getViewMatrix(cameras[currentCameraIndex]);
    }
    camid.innerText = "cam  " + currentCameraIndex;
    if (e.code == "KeyV") {
      location.hash =
        "#" + JSON.stringify(viewMatrix.map((k) => Math.round(k * 100) / 100));
      camid.innerText = "";
    } else if (e.code === "KeyP") {
      carousel = true;
      camid.innerText = "";
    }
  });
  window.addEventListener("keyup", (e) => {
    activeKeys = activeKeys.filter((k) => k !== e.code);
  });
  window.addEventListener("blur", () => {
    activeKeys = [];
  });

  window.addEventListener(
    "wheel",
    (e) => {
      carousel = false;
      e.preventDefault();
      const lineHeight = 10;
      const scale =
        e.deltaMode == 1 ? lineHeight : e.deltaMode == 2 ? innerHeight : 1;
      let inv = invert4(viewMatrix);

    //   if (e.shiftKey) {
    //     inv = translate4(
    //       inv,
    //       (e.deltaX * scale) / innerWidth,
    //       (e.deltaY * scale) / innerHeight,
    //       0
    //     );
    //   } else if (e.ctrlKey || e.metaKey) {
    //     // inv = rotate4(inv,  (e.deltaX * scale) / innerWidth,  0, 0, 1);
    //     // inv = translate4(inv,  0, (e.deltaY * scale) / innerHeight, 0);
    //     // let preY = inv[13];
    //     inv = translate4(inv, 0, 0, (-10 * (e.deltaY * scale)) / innerHeight);
    //     // inv[13] = preY;
    //   } else {
    //     let d = 4;
    //     inv = translate4(inv, 0, 0, d);
    //     inv = rotate4(inv, -(e.deltaX * scale) / innerWidth, 0, 1, 0);
    //     inv = rotate4(inv, (e.deltaY * scale) / innerHeight, 1, 0, 0);
    //     inv = translate4(inv, 0, 0, -d);
    //   }
    //   viewMatrix = invert4(inv);
        let val = (-5 * (e.deltaY * scale)) / innerHeight;
        inv = translate4(inv, 0, 0, val);
        viewMatrix = invert4(inv);
    },
    { passive: false }
  );

  let startX, startY, down;
  canvas.addEventListener("mousedown", (e) => {
    carousel = false;
    e.preventDefault();
    startX = e.clientX;
    startY = e.clientY;
    down = e.ctrlKey || e.metaKey ? 2 : 1;
  });
  canvas.addEventListener("contextmenu", (e) => {
    carousel = false;
    e.preventDefault();
    startX = e.clientX;
    startY = e.clientY;
    down = 2;
  });

  canvas.addEventListener("mousemove", (e) => {
    e.preventDefault();
    if (down == 1) {
      if (is_object) {
        let inv = invert4(viewMatrix);

        let dx = (5 * (e.clientX - startX)) / innerWidth;
        let dy = (5 * (e.clientY - startY)) / innerHeight;
        let d = 0;

        inv = translate4(inv, viewMatrix[12], viewMatrix[13], viewMatrix[14]);
        inv = rotate4(inv, dx, 0, 1, 0);
        inv = rotate4(inv, -dy, 1, 0, 0);
        inv = translate4(inv, -viewMatrix[12], -viewMatrix[13], -viewMatrix[14]);

        viewMatrix = invert4(inv);
        startX = e.clientX;
        startY = e.clientY;
         
      }
      else {
        let inv = invert4(viewMatrix);

        let dx = (5 * (e.clientX - startX)) / innerWidth;
        let dy = (5 * (e.clientY - startY)) / innerHeight;
        let d = 4;

        inv = translate4(inv, 0, 0, d);
        inv = rotate4(inv, dx, 0, 1, 0);
        inv = rotate4(inv, -dy, 1, 0, 0);
        inv = translate4(inv, 0, 0, -d);

        viewMatrix = invert4(inv);

        startX = e.clientX;
        startY = e.clientY;
      }
    } else if (down == 2) {
      let inv = invert4(viewMatrix);
      // inv = rotateY(inv, );
      // let preY = inv[13];
      inv = translate4(
        inv,
        (-10 * (e.clientX - startX)) / innerWidth,
        0,
        (10 * (e.clientY - startY)) / innerHeight
      );
      // inv[13] = preY;
      viewMatrix = invert4(inv);

      startX = e.clientX;
      startY = e.clientY;
    }
  });
  canvas.addEventListener("mouseup", (e) => {
    e.preventDefault();
    down = false;
    startX = 0;
    startY = 0;
  });

  let altX = 0,
    altY = 0;
  canvas.addEventListener(
    "touchstart",
    (e) => {
      e.preventDefault();
      if (e.touches.length === 1) {
        carousel = false;
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        down = 1;
      } else if (e.touches.length === 2) {
        // console.log('beep')
        carousel = false;
        startX = e.touches[0].clientX;
        altX = e.touches[1].clientX;
        startY = e.touches[0].clientY;
        altY = e.touches[1].clientY;
        down = 1;
      }
    },
    { passive: false }
  );
  canvas.addEventListener(
    "touchmove",
    (e) => {
      e.preventDefault();
      if (e.touches.length === 1 && down) {
        let inv = invert4(viewMatrix);
        let dx = (4 * (e.touches[0].clientX - startX)) / innerWidth;
        let dy = (4 * (e.touches[0].clientY - startY)) / innerHeight;

        let d = 4;
        inv = translate4(inv, 0, 0, d);
        // inv = translate4(inv,  -x, -y, -z);
        // inv = translate4(inv,  x, y, z);
        inv = rotate4(inv, dx, 0, 1, 0);
        inv = rotate4(inv, -dy, 1, 0, 0);
        inv = translate4(inv, 0, 0, -d);

        viewMatrix = invert4(inv);

        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
      } else if (e.touches.length === 2) {
        // alert('beep')
        const dtheta =
          Math.atan2(startY - altY, startX - altX) -
          Math.atan2(
            e.touches[0].clientY - e.touches[1].clientY,
            e.touches[0].clientX - e.touches[1].clientX
          );
        const dscale =
          Math.hypot(startX - altX, startY - altY) /
          Math.hypot(
            e.touches[0].clientX - e.touches[1].clientX,
            e.touches[0].clientY - e.touches[1].clientY
          );
        const dx =
          (e.touches[0].clientX + e.touches[1].clientX - (startX + altX)) / 2;
        const dy =
          (e.touches[0].clientY + e.touches[1].clientY - (startY + altY)) / 2;
        let inv = invert4(viewMatrix);
        // inv = translate4(inv,  0, 0, d);
        inv = rotate4(inv, dtheta, 0, 0, 1);

        inv = translate4(inv, -dx / innerWidth, -dy / innerHeight, 0);

        // let preY = inv[13];
        inv = translate4(inv, 0, 0, 3 * (1 - dscale));
        // inv[13] = preY;

        viewMatrix = invert4(inv);

        startX = e.touches[0].clientX;
        altX = e.touches[1].clientX;
        startY = e.touches[0].clientY;
        altY = e.touches[1].clientY;
      }
    },
    { passive: false }
  );
  canvas.addEventListener(
    "touchend",
    (e) => {
      e.preventDefault();
      down = false;
      startX = 0;
      startY = 0;
    },
    { passive: false }
  );

  let jumpDelta = 0;
  let vertexCount = 0;

  let lastFrame = 0;
  let avgFps = 0;
  let start = 0;

  window.addEventListener("gamepadconnected", (e) => {
    const gp = navigator.getGamepads()[e.gamepad.index];
    console.log(
      `Gamepad connected at index ${gp.index}: ${gp.id}. It has ${gp.buttons.length} buttons and ${gp.axes.length} axes.`
    );
  });
  window.addEventListener("gamepaddisconnected", (e) => {
    console.log("Gamepad disconnected");
  });

  let leftGamepadTrigger, rightGamepadTrigger;

  const frame = (now) => {
    let inv = invert4(viewMatrix);
    let shiftKey =
      activeKeys.includes("Shift") ||
      activeKeys.includes("ShiftLeft") ||
      activeKeys.includes("ShiftRight");

    if (activeKeys.includes("ArrowUp")) {
      if (shiftKey) {
        inv = translate4(inv, 0, -0.03, 0);
      } else {
        inv = translate4(inv, 0, 0, 0.1);
      }
    }
    if (activeKeys.includes("ArrowDown")) {
      if (shiftKey) {
        inv = translate4(inv, 0, 0.03, 0);
      } else {
        inv = translate4(inv, 0, 0, -0.1);
      }
    }
    if (activeKeys.includes("ArrowLeft")) inv = translate4(inv, -0.03, 0, 0);
    //
    if (activeKeys.includes("ArrowRight")) inv = translate4(inv, 0.03, 0, 0);
    // inv = rotate4(inv, 0.01, 0, 1, 0);

    if (activeKeys.includes("KeyA")) inv = rotate4(inv, -0.01, 0, 1, 0);
    if (activeKeys.includes("KeyD")) inv = rotate4(inv, 0.01, 0, 1, 0);
    if (activeKeys.includes("KeyQ")) inv = rotate4(inv, 0.01, 0, 0, 1);
    if (activeKeys.includes("KeyE")) inv = rotate4(inv, -0.01, 0, 0, 1);
    if (activeKeys.includes("KeyW")) inv = rotate4(inv, 0.005, 1, 0, 0);
    if (activeKeys.includes("KeyS")) inv = rotate4(inv, -0.005, 1, 0, 0);

    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    let isJumping = activeKeys.includes("Space");
    for (let gamepad of gamepads) {
      if (!gamepad) continue;

      const axisThreshold = 0.1; // Threshold to detect when the axis is intentionally moved
      const moveSpeed = 0.06;
      const rotateSpeed = 0.02;

      // Assuming the left stick controls translation (axes 0 and 1)
      if (Math.abs(gamepad.axes[0]) > axisThreshold) {
        inv = translate4(inv, moveSpeed * gamepad.axes[0], 0, 0);
        carousel = false;
      }
      if (Math.abs(gamepad.axes[1]) > axisThreshold) {
        inv = translate4(inv, 0, 0, -moveSpeed * gamepad.axes[1]);
        carousel = false;
      }
      if (gamepad.buttons[12].pressed || gamepad.buttons[13].pressed) {
        inv = translate4(
          inv,
          0,
          -moveSpeed *
            (gamepad.buttons[12].pressed - gamepad.buttons[13].pressed),
          0
        );
        carousel = false;
      }

      if (gamepad.buttons[14].pressed || gamepad.buttons[15].pressed) {
        inv = translate4(
          inv,
          -moveSpeed *
            (gamepad.buttons[14].pressed - gamepad.buttons[15].pressed),
          0,
          0
        );
        carousel = false;
      }

      // Assuming the right stick controls rotation (axes 2 and 3)
      if (Math.abs(gamepad.axes[2]) > axisThreshold) {
        inv = rotate4(inv, rotateSpeed * gamepad.axes[2], 0, 1, 0);
        carousel = false;
      }
      if (Math.abs(gamepad.axes[3]) > axisThreshold) {
        inv = rotate4(inv, -rotateSpeed * gamepad.axes[3], 1, 0, 0);
        carousel = false;
      }

      let tiltAxis = gamepad.buttons[6].value - gamepad.buttons[7].value;
      if (Math.abs(tiltAxis) > axisThreshold) {
        inv = rotate4(inv, rotateSpeed * tiltAxis, 0, 0, 1);
        carousel = false;
      }
      if (gamepad.buttons[4].pressed && !leftGamepadTrigger) {
        camera = cameras[(cameras.indexOf(camera) + 1) % cameras.length];
        inv = invert4(getViewMatrix(camera));
        carousel = false;
      }
      if (gamepad.buttons[5].pressed && !rightGamepadTrigger) {
        camera =
          cameras[
            (cameras.indexOf(camera) + cameras.length - 1) % cameras.length
          ];
        inv = invert4(getViewMatrix(camera));
        carousel = false;
      }
      leftGamepadTrigger = gamepad.buttons[4].pressed;
      rightGamepadTrigger = gamepad.buttons[5].pressed;
      if (gamepad.buttons[0].pressed) {
        isJumping = true;
        carousel = false;
      }
      if (gamepad.buttons[3].pressed) {
        carousel = true;
      }
    }

    if (["KeyJ", "KeyK", "KeyL", "KeyI"].some((k) => activeKeys.includes(k))) {
      if (is_object) {
        // let d = 4;
        inv = translate4(inv, viewMatrix[12], viewMatrix[13], viewMatrix[14]);
        inv = rotate4(
            inv,
            activeKeys.includes("KeyJ")
            ? -0.05
            : activeKeys.includes("KeyL")
            ? 0.05
            : 0,
            0,
            1,
            0
        );
        inv = rotate4(
            inv,
            activeKeys.includes("KeyI")
            ? 0.05
            : activeKeys.includes("KeyK")
            ? -0.05
            : 0,
            1,
            0,
            0
        );
        // inv = translate4(inv, 0, 0, -d);
        inv = translate4(inv, -viewMatrix[12], -viewMatrix[13], -viewMatrix[14]);
      }
      else {
        let d = 4;
        inv = translate4(inv, 0, 0, d);
        inv = rotate4(
            inv,
            activeKeys.includes("KeyJ")
            ? -0.05
            : activeKeys.includes("KeyL")
            ? 0.05
            : 0,
            0,
            1,
            0
        );
        inv = rotate4(
            inv,
            activeKeys.includes("KeyI")
            ? 0.05
            : activeKeys.includes("KeyK")
            ? -0.05
            : 0,
            1,
            0,
            0
        );
        inv = translate4(inv, 0, 0, -d);
      }
    }

    viewMatrix = invert4(inv);

    if (carousel) {
      let inv = invert4(defaultViewMatrix);

      const t = Math.sin((Date.now() - start) / 5000);
      inv = translate4(inv, 2.5 * t, 0, 6 * (1 - Math.cos(t)));
      inv = rotate4(inv, -0.6 * t, 0, 1, 0);

      viewMatrix = invert4(inv);
    }

    if (isJumping) {
      jumpDelta = Math.min(1, jumpDelta + 0.05);
    } else {
      jumpDelta = Math.max(0, jumpDelta - 0.05);
    }

    let inv2 = invert4(viewMatrix);
    inv2 = translate4(inv2, 0, -jumpDelta, 0);
    inv2 = rotate4(inv2, -0.1 * jumpDelta, 1, 0, 0);
    let actualViewMatrix = invert4(inv2);

    const viewProj = multiply4(projectionMatrix, actualViewMatrix);
    worker.postMessage({ view: viewProj });

    const currentFps = 1000 / (now - lastFrame) || 0;
    avgFps = avgFps * 0.9 + currentFps * 0.1;

    // if (vertexCount > 0) {
    //   document.getElementById("spinner").style.display = "none";
    //   gl.uniformMatrix4fv(u_view, false, actualViewMatrix);
    //   gl.clear(gl.COLOR_BUFFER_BIT);
    //   gl.drawArraysInstanced(gl.TRIANGLE_FAN, 0, 4, vertexCount);
    // } else {
    //   gl.clear(gl.COLOR_BUFFER_BIT);
    //   document.getElementById("spinner").style.display = "";
    //   start = Date.now() + 2000;
    // }

    const progress = (100 * vertexCount) / (splatData.length / rowLength);
    if (progress < 100) {
      document.getElementById("progress").style.width = progress + "%";
      console.log("progress: ", progress, vertexCount, splatData.length / rowLength);
      
      gl.clear(gl.COLOR_BUFFER_BIT);
      document.getElementById("spinner").style.display = "";
      start = Date.now() + 2000;
    } else {
      document.getElementById("progress").style.display = "none";

      document.getElementById("spinner").style.display = "none";
      gl.uniformMatrix4fv(u_view, false, actualViewMatrix);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArraysInstanced(gl.TRIANGLE_FAN, 0, 4, vertexCount);
    }

    fps.innerText = Math.round(avgFps) + " fps";
    if (isNaN(currentCameraIndex)) {
      camid.innerText = "";
    }
    lastFrame = now;
    requestAnimationFrame(frame);
  };

  frame();

  const selectFile = (file) => {
    const fr = new FileReader();
    if (/\.json$/i.test(file.name)) {
      fr.onload = () => {
        cameras = JSON.parse(fr.result);
        viewMatrix = getViewMatrix(cameras[0]);
        projectionMatrix = getProjectionMatrix(
          camera.fx / downsample,
          camera.fy / downsample,
          canvas.width,
          canvas.height
        );
        gl.uniformMatrix4fv(u_projection, false, projectionMatrix);

        console.log("Loaded Cameras");
      };
      fr.readAsText(file);
    } else {
      stopLoading = true;
      fr.onload = () => {
        splatData = new Uint8Array(fr.result);
        console.log("Loaded", Math.floor(splatData.length / rowLength));

        if (
          splatData[0] == 112 &&
          splatData[1] == 108 &&
          splatData[2] == 121 &&
          splatData[3] == 10
        ) {
          // ply file magic header means it should be handled differently
          worker.postMessage({ ply: splatData.buffer });
        } else {
          worker.postMessage({
            buffer: splatData.buffer,
            vertexCount: Math.floor(splatData.length / rowLength),
          });
        }
      };
      fr.readAsArrayBuffer(file);
    }
  };

  window.addEventListener("hashchange", (e) => {
    try {
      viewMatrix = JSON.parse(decodeURIComponent(location.hash.slice(1)));
      carousel = false;
    } catch (err) {}
  });

  const preventDefault = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };
  document.addEventListener("dragenter", preventDefault);
  document.addEventListener("dragover", preventDefault);
  document.addEventListener("dragleave", preventDefault);
  document.addEventListener("drop", (e) => {
    e.preventDefault();
    e.stopPropagation();
    selectFile(e.dataTransfer.files[0]);
  });

  let bytesRead = 0;
  let lastVertexCount = -1;
  let stopLoading = false;

  while (true) {
    const { done, value } = await reader.read();
    if (done || stopLoading) break;

    splatData.set(value, bytesRead);
    bytesRead += value.length;

    // if (vertexCount > lastVertexCount) {
    //   worker.postMessage({
    //     // buffer: splatData.buffer,
    //     // ply: splatData.buffer,
    //     vertexCount: Math.floor(bytesRead / rowLength),
    //   });
    //   lastVertexCount = vertexCount;
    // }
    vertexCount = Math.floor(bytesRead / rowLength);
    // console.log("vertexCount: ", vertexCount);
  }
  if (!stopLoading)
    worker.postMessage({
      // buffer: splatData.buffer,
      ply: splatData.buffer,
      vertexCount: Math.floor(bytesRead / rowLength),
    });
}

main().catch((err) => {
    document.getElementById("spinner").style.display = "none";
    document.getElementById("message").innerText = err.toString();
});

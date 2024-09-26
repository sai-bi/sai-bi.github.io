

vec3 diffuse = vec4((cov.w) & 0xffu, (cov.w >> 8) & 0xffu, (cov.w >> 16) & 0xffu) / 255.0;

vec3 dep = vec3(0.0, 0.0, 0.0);


uvec4 sh_coef; = texelFetch(u_texture, ivec2(((uint(index) & 0x3ffu) * ${float_per_row/4}u + 1u), uint(index) >> 10), 0);
uint offset = 2;



float coefs[25] = float[](
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
    + C3[0] * y * (3 * xx - yy),
    + C3[1] * xy * z, 
    + C3[2] * y * (4 * zz - xx - yy), 
    + C3[3] * z * (2 * zz - 3 * xx - 3 * yy), 
    + C3[4] * x * (4 * zz - xx - yy), 
    + C3[5] * z * (xx - yy), 
    + C3[6] * x * (xx - 3 * yy),
    // SH_4
    + C4[0] * xy * (xx - yy),
    + C4[1] * yz * (3 * xx - yy),
    + C4[2] * xy * (7 * zz - 1),
    + C4[3] * yz * (7 * zz - 3), 
    + C4[4] * (zz * (35 * zz - 30) + 3),
    + C4[5] * xz * (7 * zz - 3),
    + C4[6] * (xx - yy) * (7 * zz - 1), 
    + C4[7] * xz * (xx - 3 * yy), 
    + C4[8] * (xx * (xx - 3 * yy) - yy * (3 * xx - yy))
);

for (int i = 0; i < (sh_order + 1u) * (sh_order + 1u) - 1u; i++) {
    sh_coef = uintBitsToFloat(texelFetch(u_texture, ivec2(((uint(index) & 0x3ffu) * ${float_per_row/4}u + offset), uint(index) >> 10), 0)); 
    offset = offset + 1u;
    dep = dep + coefs[i] * sh_coef.xyz; 
}



C0 = 0.28209479177387814
C1 = 0.4886025119029199
C2 = [
    1.0925484305920792,
    -1.0925484305920792,
    0.31539156525252005,
    -1.0925484305920792,
    0.5462742152960396,
]
C3 = [
    -0.5900435899266435,
    2.890611442640554,
    -0.4570457994644658,
    0.3731763325901154,
    -0.4570457994644658,
    1.445305721320277,
    -0.5900435899266435,
]
C4 = [
    2.5033429417967046,
    -1.7701307697799304,
    0.9461746957575601,
    -0.6690465435572892,
    0.10578554691520431,
    -0.6690465435572892,
    0.47308734787878004,
    -1.7701307697799304,
    0.6258357354491761,
]



vColor = clamp(pos2d.z/pos2d.w+1.0, 0.0, 1.0) * vec4((cov.w) & 0xffu, (cov.w >> 8) & 0xffu, (cov.w >> 16) & 0xffu, (cov.w >> 24) & 0xffu) / 255.0;
vPosition = position;

precision highp float;

attribute vec3 vtxPos;
attribute vec3 vtxNrm;
attribute vec3 vtxRGB;
attribute vec2 vtxTex;
attribute vec4 vtxJnt;
attribute vec4 vtxWgt;

uniform mat4 prmSkinMtx[30];
uniform mat4 prmViewProj;

varying vec3 pixPos;
varying vec3 pixNrm;
varying vec3 pixRGB;
varying vec2 pixTex;

void main() {
	mat4 wm = prmSkinMtx[int(vtxJnt.x)] * vtxWgt.x;
	wm     += prmSkinMtx[int(vtxJnt.y)] * vtxWgt.y;
	wm     += prmSkinMtx[int(vtxJnt.z)] * vtxWgt.z;
	wm     += prmSkinMtx[int(vtxJnt.w)] * vtxWgt.w;
	pixPos = (vec4(vtxPos, 1.0) * wm).xyz;
	pixNrm = (vec4(vtxNrm, 0.0) * wm).xyz;
	pixRGB = vtxRGB;
	pixTex = vtxTex;
	gl_Position = vec4(pixPos, 1.0) * prmViewProj;
}

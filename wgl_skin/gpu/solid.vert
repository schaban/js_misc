precision highp float;

attribute vec3 vtxPos;
attribute vec3 vtxNrm;
attribute vec3 vtxRGB;
attribute vec2 vtxTex;

uniform mat4 prmWorld;
uniform mat4 prmViewProj;

varying vec3 pixPos;
varying vec3 pixNrm;
varying vec3 pixRGB;
varying vec2 pixTex;

void main() {
	mat4 wm = prmWorld;
	pixPos = (vec4(vtxPos, 1.0) * wm).xyz;
	pixNrm = (vec4(vtxNrm, 0.0) * wm).xyz;
	pixRGB = vtxRGB;
	pixTex = vtxTex;
	gl_Position = vec4(pixPos, 1.0) * prmViewProj;
}

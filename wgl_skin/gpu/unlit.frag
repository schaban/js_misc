precision highp float;

varying vec3 pixPos;
varying vec3 pixNrm;
varying vec3 pixRGB;
varying vec2 pixTex;

uniform vec3 prmBaseColor;

uniform sampler2D smpBase;

void main() {
	vec4 tex = texture2D(smpBase, pixTex);
	tex.rgb *= prmBaseColor;
	vec3 clr = tex.rgb * pixRGB;
	gl_FragColor = vec4(clr, tex.a);
}


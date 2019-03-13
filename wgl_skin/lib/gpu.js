// Author: Sergey Chaban <sergey.chaban@gmail.com>

function compileShader(src, type) {
	let s = null;
	const gl = scene.gl;
	if (gl && src) {
		s = gl.createShader(type);
		if (s) {
			gl.shaderSource(s, src);
			gl.compileShader(s);
			if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
				console.log(gl.getShaderInfoLog(s));
				gl.deleteShader(s);
				s = null;
			}
		}
	}
	return s;
}

function compileVertShader(src) {
	const gl = scene.gl;
	return gl ? compileShader(src, gl.VERTEX_SHADER) : null;
}

function compileFragShader(src) {
	const gl = scene.gl;
	return compileShader(src, gl.FRAGMENT_SHADER);
}

function ckAttLoc(loc) {
	return (typeof loc === "number") && (loc >= 0);
}

function setVtxAttr(gl, loc, nelems, offs, stride) {
	if (ckAttLoc(loc)) {
		gl.enableVertexAttribArray(loc);
		gl.vertexAttribPointer(loc, nelems, gl.FLOAT, false, stride, offs);
	}
	return offs + nelems*4;
}

function setPrmMtx(gl, loc, mtx) {
	if (loc) gl.uniformMatrix4fv(loc, false, mtx.e);
}


class GPU_PROG {
	constructor(descr) {
		this.vert = null;
		this.frag = null;
		this.prog = null;
		this.natt = 0;
		this.nprm = 0;
		this.nsmp = 0;
		const gl = scene.gl;
		if (gl && typeof descr === "string") {
			const lines = descr.split(/\r?\n|\r/);
			if (lines.length >= 2) {
				const vs = scene.vertShaders[lines[0]];
				const fs = scene.fragShaders[lines[1]];
				if (vs && fs) {
					this.prog = gl.createProgram();
					if (this.prog) {
						gl.attachShader(this.prog, vs);
						gl.attachShader(this.prog, fs);
						gl.linkProgram(this.prog);
						if (!gl.getProgramParameter(this.prog, gl.LINK_STATUS)) {
							console.log(gl.getProgramInfoLog(this.prog));
							gl.deleteProgram(this.prog);
							this.prog = null;
						} else {
							this.vert = vs;
							this.frag = fs;
						}
					}
				}
				if (this.valid()) {
					if (lines.length >= 3 && lines[2].length > 0) {
						const attrs = lines[2].split(' ');
						this.natt = attrs.length;
						for (const attr of attrs) {
							this[`attLoc${attr}`] = gl.getAttribLocation(this.prog, `vtx${attr}`);
							//console.log(attr, "@", eval(`this.attLoc${attr}`));
						}
					}
					if (lines.length >= 4 && lines[3].length > 0) {
						const params = lines[3].split(' ');
						this.nprm = params.length;
						for (const prm of params) {
							this[`prmLoc${prm}`] = gl.getUniformLocation(this.prog, `prm${prm}`);
							if (prm === "SkinMtx") {
								for (let i = 0; i < 64; ++i) {
									this[`prmLoc${prm}${i}`] = gl.getUniformLocation(this.prog, `prm${prm}[${i}]`);
								}
							}
						}
					}
					if (lines.length >= 5 && lines[4].length > 0) {
						const smps = lines[4].split(' ');
						this.nsmp = smps.length;
						for (const smp of smps) {
							this[`smpLoc${smp}`] = gl.getUniformLocation(this.prog, `smp${smp}`);
						}
					}
					//console.log("#att:" + this.natt + ", #prm:", this.nprm + ", #smp:" + this.nsmp);
				}
			}
		}
	}

	use(gl) {
		if (!gl) gl = scene.gl;
		if (gl) gl.useProgram(this.prog);
	}

	valid() { return this.prog != null; }

	get hasPos() { return ckAttLoc(this.attLocPos); }
	get hasNrm() { return ckAttLoc(this.attLocNrm); }
	get hasRGB() { return ckAttLoc(this.attLocRGB); }
	get hasTex() { return ckAttLoc(this.attLocTex); }
	get hasJnt() { return ckAttLoc(this.attLocJnt); }
	get hasWgt() { return ckAttLoc(this.attLocWgt); }
}

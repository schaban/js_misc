// Author: Sergey Chaban <sergey.chaban@gmail.com>

class TEX {
	constructor(buf) {
		if (!isTextureData(buf)) return;

		const gl = scene.gl;
		if (!gl) return;

		const dat = new DataView(buf);
		this.name = datStr(dat, 0x10);
		this.w = datI32(dat, 4);
		this.h = datI32(dat, 8);
		const offs = datI32(dat, 0xC);
		this.handle = gl.createTexture();
		if (!this.handle) return;
		gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
		gl.bindTexture(gl.TEXTURE_2D, this.handle);
		const n = this.w*this.h*4;
		const pix = new Uint8Array(n);
		for (let i = 0; i < n; ++i) {
			pix[i] = dat.getUint8(offs + i);
		}
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.w, this.h, 0, gl.RGBA, gl.UNSIGNED_BYTE, pix);
		gl.generateMipmap(gl.TEXTURE_2D);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
		gl.bindTexture(gl.TEXTURE_2D, null);
	}
}

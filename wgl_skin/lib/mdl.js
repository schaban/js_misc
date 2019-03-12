// Author: Sergey Chaban <sergey.chaban@gmail.com>


class SKEL {
	constructor(mdl) {
		if (!mdl) return;
		if (!mdl.hasSkel) return;

		this.mdl = mdl;
		const n = mdl.nskl;
		this.lmtx = new Array(n);
		this.wmtx = new Array(n);
		for (let i = 0; i < n; ++i) {
			this.lmtx[i] = mcpy(mdl.getLocalMtx(i));
			this.wmtx[i] = munit();
		}
		if (mdl.hasSkin) {
			this.jmtx = new Array(mdl.nskn);
			for (let i = 0; i < mdl.nskn; ++i) {
				this.jmtx[i] = munit();
			}
		}
		this.calcWorld();
		this.map = {};
		for (let i = 0; i < n; ++i) {
			this.map[mdl.skelNames[i]] = i;
		}
	}

	getSkinNum() {
		return this.mdl ? this.mdl.nskn : 0;
	}

	getDefLocalMtxByName(name) {
		if (this.mdl) {
			const idx = this.map[name];
			if (idx) {
				return this.mdl.getLocalMtx(idx);
			}
		}
		return null;
	}

	getLocalMtxByName(name) {
		if (this.map) {
			const idx = this.map[name];
			if (idx) {
				return this.lmtx[idx];
			}
		}
		return null;
	}

	getWorldMtxByName(name) {
		if (this.map) {
			const idx = this.map[name];
			if (idx) {
				return this.wmtx[idx];
			}
		}
		return null;
	}

	animate(anm, frm) {
		const mdl = this.mdl;
		if (!this.mdl) return;
		if (!mdl.hasSkel) return;
		const n = mdl.nskl;
		for (let i = 0; i < n; ++i) {
			const name = mdl.skelNames[i];
			if (anm.getNode(name)) {
				const mtx = anm.evalNodeMtx(name, frm, mdl.getLocalMtx(i));
				this.lmtx[i].copy(mtx);
			}
		}
	}

	calcWorld() {
		const mdl = this.mdl;
		if (!this.mdl) return;
		if (!mdl.hasSkel) return;
		const n = mdl.nskl;
		for (let i = 0; i < n; ++i) {
			const parentId = mdl.skelParents[i];
			if (parentId < 0) {
				this.wmtx[i].copy(this.lmtx[i]);
			} else {
				this.wmtx[i].mul(this.wmtx[parentId], this.lmtx[i]);
			}
		}
	}

	calcSkin() {
		const mdl = this.mdl;
		if (!this.mdl) return;
		if (!mdl.hasSkel) return;
		if (!mdl.hasSkin) return;
		const n = mdl.nskn;
		for (let i = 0; i < n; ++i) {
			const iskl = mdl.skinToSkel[i];
			if (iskl >= 0) {
				const wmtx = this.wmtx[iskl];
				const imtx = mdl.getInvWorldMtx(iskl);
				this.jmtx[i].mul(wmtx, imtx);
			}
		}
	}
}

class MTL {
	constructor(dat, offs, strsTop) {
		const nameOffs = datI32(dat, offs);
		this.name = nameOffs < 0 ? "$mtl" : datStr(dat, strsTop + nameOffs);
		const baseMapOffs = datI32(dat, offs + 4);
		this.baseMap = baseMapOffs < 0 ? null : datStr(dat, strsTop + baseMapOffs);
		this.triOrg = datI32(dat, offs + 8);
		this.triNum = datI32(dat, offs + 0xC);
		this.baseColor = vread(dat, offs + 0x10);
		this.baseTex = null;
		this.linkTex();
	}

	linkTex() {
		if (this.baseMap) {
			this.baseTex = scene.textures[this.baseMap];
		}
	}
}

class MDL {
	constructor(buf) {
		if (!isModelData(buf)) return;

		const gl = scene.gl;
		if (!gl) return;

		const dat = new DataView(buf);
		this.npnt = datU32(dat, 4);
		this.ntri = datU32(dat, 8);
		this.nmtl = datU32(dat, 0xC);
		this.nskn = datU32(dat, 0x10);
		this.nskl = datU32(dat, 0x14);
		const strsTop = datU32(dat, 0x18);
		const strsSize = datU32(dat, 0x1C);
		const nameOffs = datI32(dat, 0x20);
		this.name = nameOffs < 0 ? "$mdl" : datStr(dat, strsTop + nameOffs);

		const pntOffs = datU32(dat, 0x24);
		const mtlOffs = datU32(dat, 0x28);
		const idxOffs = datU32(dat, 0x2C);
		const sknOffs = datU32(dat, 0x30);
		const sklOffs = datU32(dat, 0x34);

		if (0) {
			console.log("name:", this.name);
			console.log("#pnt:", this.npnt);
			console.log("#tri:", this.ntri);
			console.log("#mtl:", this.nmtl);
			console.log("#skn:", this.nskn);
			console.log("pnt @ 0x" + hex(pntOffs));
			console.log("mtl @ 0x" + hex(mtlOffs));
			console.log("idx @ 0x" + hex(idxOffs));
			console.log("skn @ 0x" + hex(sknOffs));
			console.log("skl @ 0x" + hex(sklOffs));
		}

		this.hasSkin = sknOffs > 0;
		this.hasSkel = sklOffs > 0;


		this.vb = gl.createBuffer();
		if (!this.vb) return;

		this.ib = gl.createBuffer();
		if (!this.ib) return;

		let nattrs = 11;
		if (this.hasSkin) nattrs += 8;
		this.nattrs = nattrs;
		const vbSize = this.npnt * nattrs;
		const vbData = new Float32Array(vbSize);
		for (let i = 0; i < this.npnt; ++i) {
			const ipnt = i * nattrs;
			for (let j = 0; j < nattrs; ++j) {
				vbData[ipnt + j] = datF32(dat, pntOffs + ipnt*4 + j*4);
			}
		}
		gl.bindBuffer(gl.ARRAY_BUFFER, this.vb);
		gl.bufferData(gl.ARRAY_BUFFER, vbData, gl.STATIC_DRAW);

		const ibSize = this.ntri * 3;
		const ibData = new Uint16Array(ibSize);
		for (let i = 0; i < ibSize; ++i) {
			ibData[i] = datU16(dat, idxOffs + i*2);
		}

		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.ib);
		gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, ibData, gl.STATIC_DRAW);


		gl.bindBuffer(gl.ARRAY_BUFFER, null);
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);

		this.mtls = new Array(this.nmtl);
		for (let i = 0; i < this.nmtl; ++i) {
			this.mtls[i] = new MTL(dat, mtlOffs + i*0x1C, strsTop);
		}

		if (this.hasSkin) {
			this.skinNames = new Array(this.nskn);
			for (let i = 0; i < this.nskn; ++i) {
				const offs = datU32(dat, sknOffs + i*4);
				this.skinNames[i] = datStr(dat, strsTop + offs);
			}
			this.skinToSkel = new Array(this.nskn);
			for (let i = 0; i < this.nskn; ++i) {
				this.skinToSkel[i] = datI32(dat, sknOffs + this.nskn*4 + i*4);
			}
		}

		if (this.hasSkel) {
			const nmtx = this.nskl * 2;
			this.skelMtx = new Array(nmtx);
			for (let i = 0; i < nmtx; ++i) {
				this.skelMtx[i] = mread(dat, sklOffs + i*16*4);
			}

			this.skelNames = new Array(this.nskl);
			const namesTop = sklOffs + nmtx*16*4;
			for (let i = 0; i < this.nskl; ++i) {
				const offs = datU32(dat, namesTop + i*4);
				this.skelNames[i] = offs < 0 ? null : datStr(dat, strsTop + offs);
			}

			this.skelParents = new Int32Array(this.nskl);
			const parentsTop = namesTop + this.nskl*4;
			for (let i = 0; i < this.nskl; ++i) {
				this.skelParents[i] = datI32(dat, parentsTop + i*4);
			}
		}
	}

	allocSkel() {
		return new SKEL(this);
	}

	ckSkelIdx(idx) {
		return this.hasSkel && idx >= 0 && idx < this.nskl;
	}

	getLocalMtx(idx) {
		return this.ckSkelIdx(idx) ? this.skelMtx[idx] : null;
	}

	getInvWorldMtx(idx) {
		return this.ckSkelIdx(idx) ? this.skelMtx[this.nskl + idx] : null;
	}

	getParentIdx(idx) {
		return this.ckSkelIdx(idx) ? this.skelParents[idx] : -1;
	}

	ckMtlIdx(idx) {
		return idx >= 0 && idx < this.nmtl;
	}

	bindBuffers(gl, prog) {
		if (!gl) gl = scene.gl;
		if (!gl) return;

		gl.bindBuffer(gl.ARRAY_BUFFER, this.vb);
		const stride = this.nattrs * 4;
		let offs = 0;
		offs = setVtxAttr(gl, prog.attLocPos, 3, offs, stride);
		offs = setVtxAttr(gl, prog.attLocNrm, 3, offs, stride);
		offs = setVtxAttr(gl, prog.attLocRGB, 3, offs, stride);
		offs = setVtxAttr(gl, prog.attLocTex, 2, offs, stride);
		offs = setVtxAttr(gl, prog.attLocJnt, 4, offs, stride);
		offs = setVtxAttr(gl, prog.attLocWgt, 4, offs, stride);

		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.ib);
	}

	drawMtl(idx, prog, skel) {
		if (!prog) return;
		if (!prog.valid()) return;
		if (!this.ckMtlIdx(idx)) return;
		if (!(this.vb && this.ib)) return;

		const gl = scene.gl;
		if (!gl) return;
		const cam = scene.cam;

		prog.use(gl);
		this.bindBuffers(gl, prog);
		if (cam) {
			cam.set(prog);
		}
		if (skel) {
			const nskn = skel.getSkinNum();
			if (nskn) {
				for (let i = 0; i < nskn; ++i) {
					gl.uniformMatrix4fv(prog[`prmLocSkinMtx${i}`], false, skel.jmtx[i].e);
				}
			}
		} else {
			if (prog.prmLocWorld) {
				setPrmMtx(gl, prog.prmLocWorld, munit());
			}
		}
		const mtl = this.mtls[idx];
		if (prog.prmLocBaseColor) {
			gl.uniform3fv(prog.prmLocBaseColor, mtl.baseColor.e);
		}
		if (mtl.baseTex) {
			if (prog.smpLocBase) {
				gl.activeTexture(gl.TEXTURE0);
				gl.bindTexture(gl.TEXTURE_2D, mtl.baseTex.handle);
				gl.uniform1i(prog.smpLocBase, 0);
			}
		}
		gl.drawElements(gl.TRIANGLES, mtl.triNum*3, gl.UNSIGNED_SHORT, mtl.triOrg*3*2);
	}

	draw(prog, skel) {
		for (let i = 0; i < this.nmtl; ++i) {
			this.drawMtl(i, prog, skel);
		}
	}

}

// Author: Sergey Chaban <sergey.chaban@gmail.com>


function frmInfo(frm, nfrm) {
	const f = Math.abs(frm) % nfrm;
	const i0 = Math.floor(f);
	const t = f - i0;
	const i1 = i0 < nfrm - 1 ? i0 + 1 : 0;
	return [f, t, i0, i1];
}

function frmEval(data, f, t, i0, i1) {
	let val = 0.0;
	if (t) {
		val = lerp(data[i0], data[i1], t);
	} else {
		val = data[i0];
	}
	return val;
}

class ANM_NODE {
	constructor(dat, offs, strsTop, nfrm) {
		const nameOffs = datI32(dat, offs);
		this.name = nameOffs < 0 ? "$anode" : datStr(dat, strsTop + nameOffs);
		const txOffs = datU32(dat, offs + 4);
		const tyOffs = datU32(dat, offs + 8);
		const tzOffs = datU32(dat, offs + 0xC);
		const rxOffs = datU32(dat, offs + 0x10);
		const ryOffs = datU32(dat, offs + 0x14);
		const rzOffs = datU32(dat, offs + 0x18);
		for (let ch of ["tx", "ty", "tz", "rx", "ry", "rz"]) {
			let offs = eval(`${ch}Offs`);
			this[ch] = offs > 0 ? datF32Ary(dat, offs, nfrm) : null;
		}
	}

	eval(ch, frm) {
		let val = 0.0;
		const data = this[ch];
		if (data) {
			const nfrm = data.length;
			let [f, t, i0, i1] = frmInfo(frm, nfrm);
			val = frmEval(data, f, t, i0, i1);
		}
		return val;
	}

	evalRotMtx(frm) {
		const rx = this.eval("rx", frm);
		const ry = this.eval("ry", frm);
		const rz = this.eval("rz", frm);
		const mtx = mdegz(rz).mul(mdegy(ry)).mul(mdegx(rx));
		return mtx;
	}

	evalMtx(frm, lmtx) {
		const mtx = this.evalRotMtx(frm);
		if (this.tx || this.ty || this.tz) {
			const tx = this.eval("tx", frm);
			const ty = this.eval("ty", frm);
			const tz = this.eval("tz", frm);
			mtx.xlat(tx, ty, tz);
		} else if (lmtx) {
			mtx.xlatCpy(lmtx);
		}
		return mtx;
	}
}

class ANM {

	constructor(buf) {
		if (!isAnimationData(buf)) return;

		const dat = new DataView(buf);
		this.fps = datF32(dat, 4);
		this.nfrm = datI32(dat, 8);
		this.nnodes = datI32(dat, 0xC);
		const strsTop = datU32(dat, 0x10);
		const nameOffs = datI32(dat, 0x18);
		this.name = nameOffs < 0 ? "$anm" : datStr(dat, strsTop + nameOffs);
		const nodesOffs = datU32(dat, 0x1C);
		this.nodes = new Array(this.nnodes);
		for (let i = 0; i < this.nnodes; ++i) {
			this.nodes[i] = new ANM_NODE(dat, nodesOffs + i*0x20, strsTop, this.nfrm);
		}
		this.map = {};
		for (let i = 0; i < this.nnodes; ++i) {
			const node = this.nodes[i];
			this.map[node.name] = node;
		}
	}

	getNode(name) {
		return this.map[name];
	}

	evalNodeCh(name, ch, frm) {
		let val = 0.0;
		const node = this.getNode(name);
		if (node) {
			val = node.eval(ch, frm);
		}
		return val;
	}

	evalNodeTX(name, frm) { return this.evalNodeCh(name, "tx", frm); }
	evalNodeTY(name, frm) { return this.evalNodeCh(name, "ty", frm); }
	evalNodeTZ(name, frm) { return this.evalNodeCh(name, "tz", frm); }
	evalNodeRX(name, frm) { return this.evalNodeCh(name, "rx", frm); }
	evalNodeRY(name, frm) { return this.evalNodeCh(name, "ry", frm); }
	evalNodeRZ(name, frm) { return this.evalNodeCh(name, "rz", frm); }

	evalNodeMtx(name, frm, lmtx) {
		const node = this.getNode(name);
		if (node) {
			return node.evalMtx(frm, lmtx);
		}
		return lmtx ? lmtx : munit();
	}
}

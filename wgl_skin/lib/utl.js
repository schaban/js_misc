// Author: Sergey Chaban <sergey.chaban@gmail.com>

function degToRad(d) {
	return d * (Math.PI / 180.0);
}

function radToDeg(r) {
	return r * (180.0 / Math.PI);
}

function lerp(a, b, t) {
	return a + (b - a)*t;
}

function hex(x) {
	return x.toString(16);
}

function millis() {
	return performance.now();
}

function dbgmsg(msg = "") {
	const dbg = document.getElementById("dbgmsg");
	if (dbg) {
		dbg.innerHTML += msg + "<br>";
	} else {
		console.log(msg);
	}
}

function getFileName(fpath) {
	return fpath.substring(fpath.lastIndexOf("/")+1);
}

function dataReq(path, cb = null, txt = false) {
	let req = new XMLHttpRequest();
	req.overrideMimeType(txt ? "text/plain" : "application/octet-stream");
	req.responseType = txt ? "text" : "arraybuffer";
	let res = null;
	req.onreadystatechange = function() {
		if (req.readyState === 4 && req.status !== 404) {
			res = txt ? req.responseText : req.response;
			if (cb) {
				cb(res, path);
			}
		}
	};
	req.open('GET', path, cb != null);
	req.send(null);
	return res;
}

function parseHexPk(hexpk) {
	if (!hexpk) return null;
	const sig = hexpk.substring(0, 4);
	if (sig !== "$HEX") return null;
	const hlen = parseInt(hexpk.substring(4, 8), 16);
	const info = [];
	for (const istr of hexpk.substring(8, 8 + hlen).split(';')) {
		if (istr && istr.length > 0) {
			const estr = istr.split(',');
			info.push({ path:estr[0], offs:parseInt(estr[1],16), size:parseInt(estr[2],16) });
		}
	}
	const ary = [];
	let cnt = 0;
	let val = 0;
	for (let i = 8 + hlen; i < hexpk.length; ++i) {
		let c = hexpk.charCodeAt(i);
		const dflg = c >= 0x30 && c <= 0x39;
		if (dflg || (c >= 0x41 && c <= 0x46)) {
			if (dflg) c -= 0x30;
			else c = (c - 0x41) + 0xA;
			if (cnt) val <<= 4;
			val += c;
			++cnt;
			if (cnt == 2) {
				ary.push(val);
				val = 0;
				cnt = 0;
			}
		}
	}
	return { type: "hexpk", info: info, data: new Uint8Array(ary) };
}

function parseHexPkElem(elemName = "hexpk") {
	const el = document.getElementById(elemName);
	if (!el) return null;
	return parseHexPk(el.text);
}

function isHexPk(obj) {
	return obj && ("type" in obj) && (obj.type == "hexpk");
}

function dataKind(data) {
	let kind = "$nil";
	if (data) {
		if (typeof data === "string") {
			kind = "$txt";
		} else if (data instanceof ArrayBuffer) {
			const dv = new DataView(data);
			kind = "";
			for (let i = 0; i < 4; ++i) {
				kind += String.fromCharCode(dv.getUint8(i));
			}
		}
	}
	return kind;
}

function isModelData(data) { return dataKind(data) === "$MDD"; }
function isTextureData(data) { return dataKind(data) === "$TXD"; }
function isAnimationData(data) { return dataKind(data) === "$ANM"; }


// DataView
function datI32(dat, offs) {
	return dat.getInt32(offs, true);
}

function datU32(dat, offs) {
	return dat.getUint32(offs, true);
}

function datF32(dat, offs) {
	return dat.getFloat32(offs, true);
}

function datI16(dat, offs) {
	return dat.getInt16(offs, true);
}

function datU16(dat, offs) {
	return dat.getUint16(offs, true);
}

function datStr(dat, offs) {
	let str = "";
	let i = offs;
	while (true) {
		const ch = dat.getUint8(i++);
		if (ch === 0) break;
		str += String.fromCharCode(ch);
	}
	return str;
}

function datStrN(dat, offs, n) {
	let str = "";
	for (let i = offs; i < offs + n; ++i) {
		const ch = dat.getUint8(i);
		str += String.fromCharCode(ch);
	}
	return str;
}

function datF32Ary(dat, offs, n) {
	const ary = new Float32Array(n);
	for (let i = 0; i < n; ++i) {
		ary[i] = datF32(dat, offs + i*4);
	}
	return ary;
}

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

function datF32Ary(dat, offs, n) {
	const ary = new Float32Array(n);
	for (let i = 0; i < n; ++i) {
		ary[i] = datF32(dat, offs + i*4);
	}
	return ary;
}

// Author: Sergey Chaban <sergey.chaban@gmail.com>

class SCN {
	constructor() {
	}

	init(canvasId = "canvas") {
		const c = document.getElementById(canvasId);
		if (!c) {
			console.log("SCN: !canvas");
			return;
		}

		this.gl = null;
		try { this.gl = c.getContext("webgl"); } catch(e) {}
		if (!this.gl) {
			console.log("SCN: !webgl");
			return;
		}

		this.cam = new CAM(c.width, c.height);
	}

	clear() {
		this.files = null;
		this.vertShaders = {};
		this.fragShaders = {};
		this.progs = {};
		this.models = {};
		this.textures = {};
		this.anims = {};
	}

	initResources(files) {
		this.files = files;
		for (const fname in this.files) {
			if (fname.endsWith(".vert")) {
				this.vertShaders[fname] = compileVertShader(this.files[fname]);
			} else if (fname.endsWith(".frag")) {
				this.fragShaders[fname] = compileFragShader(this.files[fname]);
			} else if (isTextureData(this.files[fname])) {
				const tex = new TEX(this.files[fname]);
				this.textures[tex.name] = tex;
			} else if (isAnimationData(this.files[fname])) {
				const anm = new ANM(this.files[fname]);
				this.anims[anm.name] = anm;
			}
		}
		for (const fname in this.files) {
			if (fname.endsWith(".prog")) {
				let prog = new GPU_PROG(this.files[fname]);
				this.progs[fname] = prog;
			} else if (isModelData(this.files[fname])) {
				const mdl = new MDL(this.files[fname]);
				this.models[mdl.name] = mdl;
			}
		}
	}

	load(flst, cb) {
		this.clear();
		if (!this.gl) {
			return;
		}
		const txtExts = ["vert", "frag", "prog"];
		const files = {};
		if (isHexPk(flst)) {
			const dat = new DataView(flst.data.buffer);
			for (const inf of flst.info) {
				const path = inf.path;
				const offs = inf.offs;
				const size = inf.size;
				const name = getFileName(path);
				let isTxt = false;
				for (const ext of txtExts) {
					if (path.endsWith("." + ext)) {
						isTxt = true;
						break;
					}
				}
				if (isTxt) {
					files[name] = datStrN(dat, offs, size);
				} else {
					files[name] = flst.data.slice(offs, offs + size).buffer;
				}
			}
			this.initResources(files);
			cb();
		} else {
			for (const fpath of flst) {
				const fname = getFileName(fpath);
				files[fname] = null;
			}
			for (const fpath of flst) {
				let isTxt = false;
				for (const ext of txtExts) {
					if (fpath.endsWith("." + ext)) {
						isTxt = true;
						break;
					}
				}
				dataReq(fpath, (data, path) => { files[getFileName(path)] = data; }, isTxt);
			}
			let wait = setInterval(() => {
				let loadDone = true;
				for (const fpath of flst) {
					loadDone = !!files[getFileName(fpath)];
					if (!loadDone) break;
				}
				if (loadDone) {
					clearInterval(wait);
					this.initResources(files);
					cb();
				}
			}, 100);
		}
	}

	printFiles() {
		if (!this.files) return;
		dbgmsg("Scene files:");
		for (const fname in this.files) {
			dbgmsg((typeof this.files[fname] === "string" ? "txt" : "bin") + " " + dataKind(this.files[fname]) + ": " + fname);
		}
	}
}

const scene = new SCN();

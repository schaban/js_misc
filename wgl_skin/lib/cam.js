// Author: Sergey Chaban <sergey.chaban@gmail.com>

class CAM {
	constructor(width, height) {
		this.width = width;
		this.height = height;
		this.aspect = width / height;
		this.eye = vset(0.0, 0.0, 0.0);
		this.tgt = vset(0.0, 0.0, -1.0);
		this.up = vset(0.0, 1.0, 0.0);
		this.zoom = 2.5;
		this.near = 0.01;
		this.far = 100.0;
		this.view = new MTX();
		this.proj = new MTX();
		this.viewProj = new MTX();
	}

	update() {
		const eye = this.eye;
		const tgt = this.tgt;
		const up = this.up;
		let vz = vsub(tgt, eye).normalize();
		let vx = vcross(up, vz).normalize();
		let vy = vcross(vx, vz).normalize();
		let vt = vset(vdot(eye, vx), vdot(eye, vy), vdot(eye, vz));
		vx.neg();
		vy.neg();
		vz.neg();
		this.view.identity();
		this.view.setRowVec(0, vx, 0.0);
		this.view.setRowVec(1, vy, 0.0);
		this.view.setRowVec(2, vz, 0.0);
		this.view.setColVec(3, vt, 1.0);

		let hfovy = Math.atan2(1.0, this.zoom * this.aspect);
		let c = 1.0 / Math.tan(hfovy);
		let q = this.far / (this.far - this.near);
		this.proj.setCol(0, c / this.aspect, 0.0, 0.0, 0.0);
		this.proj.setCol(1, 0.0, c, 0.0, 0.0);
		this.proj.setCol(2, 0.0, 0.0, -q, -1.0);
		this.proj.setCol(3, 0.0, 0.0, -q * this.near, 0.0);

		this.viewProj.mul(this.proj, this.view);
	}

	set(prog) {
		const gl = scene.gl;
		if (!gl) return;
		if (prog) {
			setPrmMtx(gl, prog.prmLocViewProj, this.viewProj);
		}
	}

}


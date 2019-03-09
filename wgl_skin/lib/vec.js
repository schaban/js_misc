// Author: Sergey Chaban <sergey.chaban@gmail.com>

class VEC {
	constructor() {
		this.e = new Float32Array(3);
	}

	get x()  { return this.e[0]; }
	set x(x) { this.e[0] = x; }
	get y()  { return this.e[1]; }
	set y(y) { this.e[1] = y; }
	get z()  { return this.e[2]; }
	set z(z) { this.e[2] = z; }

	set(x, y, z) {
		this.e[0] = x;
		this.e[1] = y;
		this.e[2] = z;
		return this;
	}

	copy(v) {
		for (let i = 0; i < 3; ++i) {
			this.e[i] = v.e[i];
		}
		return this;
	}

	fill(s) {
		this.e.fill(s);
		return this;
	}

	add(v1, v2) {
		const e1 = v2 ? v1.e : this.e;
		const e2 = v2 ? v2.e : v1.e;
		for (let i = 0; i < 3; ++i) {
			this.e[i] = e1[i] + e2[i];
		}
		return this;
	}

	sub(v1, v2) {
		const e1 = v2 ? v1.e : this.e;
		const e2 = v2 ? v2.e : v1.e;
		for (let i = 0; i < 3; ++i) {
			this.e[i] = e1[i] - e2[i];
		}
		return this;
	}

	mul(v1, v2) {
		const e1 = v2 ? v1.e : this.e;
		const e2 = v2 ? v2.e : v1.e;
		for (let i = 0; i < 3; ++i) {
			this.e[i] = e1[i] * e2[i];
		}
		return this;
	}

	scl(s) {
		for (let i = 0; i < 3; ++i) {
			this.e[i] *= s;
		}
		return this;
	}

	neg(v) {
		const e = v ? v.e : this.e;
		for (let i = 0; i < 3; ++i) {
			this.e[i] = -e[i];
		}
		return this;
	}

	dot(v1, v2) {
		const e1 = v2 ? (v1 ? v1.e : this.e) : this.e;
		const e2 = v2 ? v2.e : (v1 ? v1.e : this.e);
		let d = 0.0;
		for (let i = 0; i < 3; ++i) {
			d += e1[i] * e2[i];
		}
		return d;
	}

	cross(v1, v2) {
		const a = v2 ? v1 : this;
		const b = v2 ? v2 : v1;
		const x = a.y*b.z - a.z*b.y;
		const y = a.z*b.x - a.x*b.z;
		const z = a.x*b.y - a.y*b.x;
		this.set(x, y, z);
		return this;
	}

	get mag2() {
		return this.dot();
	}

	get mag() {
		let m = this.mag2;
		if (m > 0) {
			m = Math.sqrt(m);
		}
		return m;
	}

	normalize(v) {
		if (v) {
			this.copy(v);
		}
		const m = this.mag;
		if (m > 0) {
			this.scl(1.0 / m);
		}
		return this;
	}

	read(dat, offs) {
		for (let i = 0; i < 3; ++i) {
			this.e[i] = datF32(dat, offs + i*4);
		}
		return this;
	}

	print() {
		console.log(`<${this.x}, ${this.y}, ${this.z}>`);
	}
}

function vset(x, y, z)  { return (new VEC()).set(x, y, z); }
function vcpy(v)        { return (new VEC()).copy(v); }
function vfill(s)       { return (new VEC()).fill(s); }
function vadd(v1, v2)   { return (new VEC()).add(v1, v2); }
function vsub(v1, v2)   { return (new VEC()).sub(v1, v2); }
function vmul(v1, v2)   { return (new VEC()).mul(v1, v2); }
function vscl(v, s)     { return vcpy(v).scl(s); }
function vneg(v)        { return vcpy(v).neg(); }
function vdot(v1, v2)   { return v1.dot(v2); }
function vcross(v1, v2) { return (new VEC()).cross(v1, v2); }
function vnrm(v)        { return vcpy(v).normalize(); }
function vread(d, o)    { return (new VEC()).read(d, o); }

let g_frame = 0;
let g_frm = 0.0;
let g_mdl = null;
let g_skl = null;

function loop() {
	const gl = scene.gl;

	gl.colorMask(true, true, true, true);
	gl.clearColor(0.077, 0.072, 0.066, 1.0);
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT | gl.STENCIL_BUFFER_BIT);
	gl.depthMask(true);
	gl.enable(gl.DEPTH_TEST);
	gl.depthFunc(gl.LEQUAL);

	const cam = scene.cam;
	const anm = scene.anims["walk"];
	const prg = scene.progs[anm ? "skin_unlit.prog" : "solid_unlit.prog"];
	const mdl = g_mdl;
	const skl = anm ? g_skl : null;
	if (cam && prg && mdl) {
		cam.eye.set(-1.8 + 2, 1.25, 3.2);
		cam.tgt.set(0.0, 0.9, 0.0);
		cam.update();

		if (anm && skl) {
			let frm = g_frm;
			skl.animate(anm, frm);
			skl.calcWorld();
			skl.calcSkin();
			frm += 0.5;
			if (frm >= anm.nfrm) frm = 0.0;
			g_frm = frm;
		}

		mdl.draw(prg, skl);
	}

	++g_frame;
	requestAnimationFrame(loop);
}

function start() {
	scene.printFiles();

	const mdl = scene.models["YWM"];
	const skl = mdl.allocSkel();
	g_mdl = mdl;
	g_skl = skl;

	requestAnimationFrame(loop);
}


function main() {
	console.clear();

	const pk = parseHexPkElem();

	scene.init();
	scene.load(pk ? pk : [
		"dat/YWM.mdd",
		"dat/Eye_BASE.txd",
		"dat/Head_BASE.txd",
		"dat/Body_BASE.txd",
		"dat/Garment_BASE.txd",
		"dat/walk.anm",
		"gpu/skin.vert", "gpu/unlit.frag", "gpu/skin_unlit.prog",
		"gpu/solid.vert", "gpu/solid_unlit.prog"
	], start);
}

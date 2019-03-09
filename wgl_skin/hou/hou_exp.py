# Author: Sergey Chaban <sergey.chaban@gmail.com>
# execfile(hou.expandString("$HIP/hou_exp.py"))

import os
import sys
import imp
import hou
import time
import math
import array
import struct

try: xrange
except: xrange = range

def dbgmsg(msg):
	sys.stdout.write(str(msg) + "\n")

def fpatch(f, offs, val):
	pos = f.tell()
	f.seek(offs)
	f.write(struct.pack("I", val))
	f.seek(pos)

def align(x, a):
	return ((x + (a - 1)) // a) * a


def clr8lst(data, gamma = 2.2, rgba = False):
	n = len(data) / 4
	fmt = str(n) + "f"
	lst = list(struct.unpack(fmt, data))
	if gamma > 0.0 and gamma != 1.0:
		igamma = 1.0 / gamma
		if rgba:
			igv = [igamma, igamma, igamma, 1.0]
			res = [int(round((min(max(lst[i], 0.0), 1.0) ** igv[i % 4]) * 255.0)) for i in xrange(n)]
		else:
			res = [int(round((min(max(lst[i], 0.0), 1.0) ** igamma) * 255.0)) for i in xrange(n)]
	else:
		res = [int(round(min(max(lst[i], 0.0), 1.0) * 255.0)) for i in xrange(n)]
	return res

def clr8(data, gamma = 2.2, rgba = False):
	return array.array("B", clr8lst(data, gamma, rgba)).tostring()


def saveTXD(path, cop):
	w = cop.xRes()
	h = cop.yRes()
	dfmt = hou.imageDepth.Float32
	esize = 4
	c = cop.allPixelsAsString(plane="C", depth=dfmt)
	if "A" in cop.planes():
		a = cop.allPixelsAsString(plane="A", depth=dfmt)
	else:
		a = ""
		for i in xrange(w*h):
			a += struct.pack("f", 1.0)
	f = open(path, "wb")
	if not f: return
	f.write(struct.pack("4siii", "$TXD", w, h, 0))
	f.write(cop.name())
	f.write(struct.pack("B", 0))
	f.seek(align(f.tell(), 0x10))
	fpatch(f, 0xC, f.tell())
	for y in xrange(h):
		idx = (h - 1 - y) * w
		lc = c[idx*esize*3 : (idx + w) * esize*3]
		la = a[idx*esize : (idx + w) * esize]
		for x in xrange(w):
			rgba = lc[x*esize*3 : (x + 1) * esize*3]
			rgba += la[x*esize : (x + 1) * esize]
			f.write(clr8(rgba));
	f.close()


def encodeTup(t):
	s = ""
	for x in t: s += struct.pack("f", x)
	return s

def encodeMtx(mtx):
	return encodeTup(mtx.transposed().asTuple())

class Strings:
        def __init__(self):
		self.data = ""
		self.strToOffs = {}
		self.offs = 0

	def add(self, s):
		if not s in self.strToOffs:
			offs = self.offs
			self.strToOffs[s] = offs
			n = len(s) + 1;
			self.data += struct.pack(str(n)+"s", s)
			self.offs += n
		return self.strToOffs[s]


class SkelNode:
	def __init__(self, mdl, hnode):
		self.mdl = mdl
		self.hnode = hnode
		self.nameOffs = mdl.strs.add(self.hnode.name())
		self.wmtx = self.hnode.worldTransform()
		self.lmtx = self.hnode.localTransform()
		self.imtx = self.wmtx.inverted()
		inp = self.hnode.inputConnectors()[0]
		if len(inp):
			self.parent = inp[0].inputNode()
		else:
			self.parent = None

class Tri:
	def __init__(self, mdl, prim):
		self.mdl = mdl
		self.prim = prim
		self.mtlId = 0
		self.pts = []
		for vtx in prim.vertices():
			self.pts.append(vtx.point().number())

class Material:
	def __init__(self, mdl, path):
		self.mdl = mdl
		self.path = path
		self.nameOffs = -1
		self.setDefaultParams()
		self.node = None
		self.tris = None
		self.name = self.path
		if path:
			sep = self.name.rfind("/")
			if sep >= 0: self.name = self.name[sep+1:]
			self.node = hou.node(path)
			self.tris = []
			if self.node:
				mtlType = self.node.type().name()
				if mtlType == "classicshader":
					if self.node.parm("diff_colorUseTexture").evalAsInt():
						self.baseMap = self.node.parm("diff_colorTexture").evalAsString()
					self.baseColor = self.node.parmTuple("diff_color").eval()
				elif mtlType == "principledshader":
					if self.node.parm("basecolor_useTexture").evalAsInt():
						self.baseMap = self.node.parm("basecolor_texture").evalAsString()
					self.baseColor = self.node.parmTuple("basecolor").eval()
				if self.baseMap:
					sep = self.baseMap.rfind("/")
					if sep >= 0: self.baseMap = self.baseMap[sep+1:]
					self.baseMapOffs = self.mdl.strs.add(self.baseMap)
		self.triOrg = -1

	def getNumTris(self):
		if self.tris: return len(self.tris)
		return len(self.mdl.tris)

	def setDefaultParams(self):
		self.baseColor = [1.0, 1.0, 1.0]
		self.baseMap = None
		self.baseMapOffs = -1

	def getName(self):
		if self.name: return self.name
		return "$default"

	def write(self, f):
		f.write(struct.pack("i", self.nameOffs)) # 00
		f.write(struct.pack("i", self.baseMapOffs)) # 04
		f.write(struct.pack("i", self.triOrg)) # 08
		f.write(struct.pack("i", self.getNumTris())) # 0C
		f.write(struct.pack("fff", self.baseColor[0], self.baseColor[1], self.baseColor[2])) # 10
		# 1C


class ModelData:
	def __init__(self, sop, skelRootPath = "/obj/ANIM/root"):
		self.sop = sop
		self.geo = sop.geometry()
		self.pts = self.geo.points()
		self.strs = Strings()
		self.name = self.sop.parent().name()
		self.nameOffs = self.strs.add(self.name)

		self.tris = []
		for prim in self.geo.prims():
			if prim.type() == hou.primType.Polygon and len(prim.vertices()) == 3:
				self.tris.append(Tri(self, prim))
		if len(self.tris) < 1:
			dbgmsg("!tris")
			return

		self.mtls = []
		mtlAttr = self.geo.findPrimAttrib("shop_materialpath")
		if mtlAttr:
			self.mtlMap = {}
			for tri in self.tris:
				mtlPath = tri.prim.attribValue(mtlAttr)
				if not mtlPath in self.mtlMap:
					mtlId = len(self.mtls)
					self.mtlMap[mtlPath] = mtlId
					tri.mtlId = mtlId
					self.mtls.append(Material(self, mtlPath))
				else:
					tri.mtlId = self.mtlMap[mtlPath]
			for i, tri in enumerate(self.tris):
				self.mtls[tri.mtlId].tris.append(i)
		else:
			self.mtls.append(Material(self, None))

		itri = 0
		for mtl in self.mtls:
			mtl.nameOffs = self.strs.add(mtl.getName())
			ntri = mtl.getNumTris()
			mtl.triOrg = itri
			itri += ntri

		self.skinNodeNames = None
		skinAttr = self.geo.findPointAttrib("boneCapture")
		if skinAttr:
			self.skinNodeNames = []
			self.skinNodeNameToOffs = {}
			self.skinNodeNameToId = {}
			tbl = skinAttr.indexPairPropertyTables()[0]
			n = tbl.numIndices()
			for i in xrange(n):
				name = tbl.stringPropertyValueAtIndex("pCaptPath", i)
				name = name.split("/cregion")[0]
				nameOffs = self.strs.add(name)
				self.skinNodeNameToOffs[name] = nameOffs
				self.skinNodeNameToId[name] = len(self.skinNodeNames)
				self.skinNodeNames.append(name)
			self.skinData = []
			for ipnt, pnt in enumerate(self.pts):
				skin = pnt.floatListAttribValue(skinAttr)
				nwgt = len(skin) / 2
				iw = []
				for i in xrange(nwgt):
					idx = int(skin[i*2])
					if idx >= 0: iw.append([idx, skin[i*2 + 1]])
				iw.sort(key = lambda iw: -abs(iw[1]))
				if len(iw) > 4:
					dbgmsg("Warning: too many weights at point {}".format(ipnt))
					iw = iw[:4]
				self.skinData.append(iw)
		else:
			skelRootPath = None

		self.skelNodes = None
		self.skelCHOPs = None
		if skelRootPath:
			skelRoot = hou.node(skelRootPath)
			if skelRoot:
				self.skelCHOPs = []
				self.skelTreeCHOPs(skelRoot)
				for chop in self.skelCHOPs: chop.setExportFlag(False)
				self.skelNodes = []
				self.skelNodeMap = {}
				self.skelTree(skelRoot)
				for skelNode in self.skelNodes:
					if skelNode.parent:
						skelNode.parentId = self.skelNodeMap[skelNode.parent.name()]
					else:
						skelNode.parentId = -1
				for chop in self.skelCHOPs: chop.setExportFlag(True)

	def skelTreeCHOPs(self, node):
		path = node.path()
		for ch in ["t", "r"]:
			ct = hou.parmTuple(path + "/" + ch)
			if ct:
				for c in ct:
					trk = c.overrideTrack()
					if trk:
						chop = trk.chopNode()
						if not chop in self.skelCHOPs:
							self.skelCHOPs.append(chop)
		for link in node.outputConnectors()[0]:
			self.skelTreeCHOPs(link.outputNode())

	def skelTree(self, node):
		self.skelNodeMap[node.name()] = len(self.skelNodes)
		self.skelNodes.append(SkelNode(self, node))
		for link in node.outputConnectors()[0]:
			self.skelTree(link.outputNode())

	def getSkinNum(self):
		if self.skinNodeNames: return len(self.skinNodeNames)
		return 0

	def getSkelNum(self):
		if self.skelNodes: return len(self.skelNodes)
		return 0

	def write(self, f):
		npnt = len(self.pts) # +04
		ntri = len(self.tris) # +08
		nmtl = len(self.mtls) # +0C
		nskn = self.getSkinNum() # +10
		nskl = self.getSkelNum() # +14
		f.write(struct.pack("4siiiii", "$MDD", npnt, ntri, nmtl, nskn, nskl))
		f.write(struct.pack("I", 0)) # +18 -> strs
		f.write(struct.pack("I", len(self.strs.data))) # +1C
		f.write(struct.pack("i", self.nameOffs)) # +20
		f.write(struct.pack("I", 0)) # +24 -> pnt
		f.write(struct.pack("I", 0)) # +28 -> mtl
		f.write(struct.pack("I", 0)) # +2C -> idx
		f.write(struct.pack("I", 0)) # +30 -> skn
		f.write(struct.pack("I", 0)) # +34 -> skl

		f.seek(align(f.tell(), 0x10))
		fpatch(f, 0x24, f.tell()) # -> pnt
		nmAttr = self.geo.findPointAttrib("N")
		cdAttr = self.geo.findPointAttrib("Cd")
		uvAttr = self.geo.findPointAttrib("uv")
		for ipnt, pnt in enumerate(self.pts):
			pos = pnt.position()

			if nmAttr:
				nrm = pnt.attribValue(nmAttr)
			else:
				nrm = [0.0, 1.0, 0.0]

			if cdAttr:
				linRGB = pnt.attribValue(cdAttr)
				rgb = [linRGB[i] ** (1 / 2.2) for i in xrange(3)]
			else:
				rgb = [1.0, 1.0, 1.0]

			if uvAttr:
				uv = pnt.attribValue(uvAttr)
			else:
				uv = [0.0, 0.0]

			f.write(struct.pack(
				"fffffffffff",
				pos[0], pos[1], pos[2],
				nrm[0], nrm[1], nrm[2],
				rgb[0], rgb[1], rgb[2],
				uv[0], 1.0 - uv[1]
			))

			if self.skinData:
				iw = self.skinData[ipnt]
				nwgt = len(iw)
				jidx = [0.0 for i in xrange(4)]
				jwgt = [0.0 for i in xrange(4)]
				wsum = 0.0
				for i in xrange(nwgt):
					jidx[i] = iw[i][0]
					jwgt[i] = iw[i][1]
					wsum += jwgt[i]
				if wsum != 1.0:
					jwgt[nwgt-1] = 1.0 - sum(jwgt[:nwgt-1])
				f.write(struct.pack("ffff", jidx[0], jidx[1], jidx[2], jidx[3]))
				f.write(struct.pack("ffff", jwgt[0], jwgt[1], jwgt[2], jwgt[3]))

		fpatch(f, 0x28, f.tell()) # -> mtls
		for mtl in self.mtls: mtl.write(f)

		fpatch(f, 0x2C, f.tell()) # -> idx
		for mtl in self.mtls:
			if mtl.tris: tris = mtl.tris
			else: tris = xrange(len(self.tris))
			for triIdx in tris:
				for idx in self.tris[triIdx].pts:
					f.write(struct.pack("H", idx))

		if nskn > 0:
			f.seek(align(f.tell(), 0x10))
			fpatch(f, 0x30, f.tell()) # -> skn
			for skinName in self.skinNodeNames:
				offs = self.skinNodeNameToOffs[skinName]
				f.write(struct.pack("I", offs))
			# skin -> skel mapping
			for skinName in self.skinNodeNames:
				skelIdx = -1
				if self.skelNodes:
					skelIdx = self.skelNodeMap[skinName]
				f.write(struct.pack("i", skelIdx))

		if nskl > 0:
			f.seek(align(f.tell(), 0x10))
			fpatch(f, 0x34, f.tell()) # -> skel
			mdata = ""
			for skelNode in self.skelNodes:
				mdata += encodeMtx(skelNode.lmtx)
			for skelNode in self.skelNodes:
				mdata += encodeMtx(skelNode.imtx)
			f.write(mdata)
			for skelNode in self.skelNodes:
				f.write(struct.pack("i", skelNode.nameOffs))
			for skelNode in self.skelNodes:
				f.write(struct.pack("i", skelNode.parentId))


		fpatch(f, 0x18, f.tell()) # -> strs
		f.write(self.strs.data)

	def save(self, fpath):
		if len(self.tris) < 1: return
		try:
			f = open(fpath, "wb")
		except IOError:
			dbgmsg("Can't create output file: " + fpath)
		else:
			self.write(f)
			f.close()

class AnmNode:
	def __init__(self, name):
		self.name = name
		self.tx = None
		self.ty = None
		self.tz = None
		self.rx = None
		self.ry = None
		self.rz = None
		self.nameOffs = -1

	def writeInfo(self, f):
		f.write(struct.pack("i", self.nameOffs)) # 00
		f.write(struct.pack("I", 0)) # 04 tx
		f.write(struct.pack("I", 0)) # 08 ty
		f.write(struct.pack("I", 0)) # 0C tz
		f.write(struct.pack("I", 0)) # 10 rx
		f.write(struct.pack("I", 0)) # 14 ry
		f.write(struct.pack("I", 0)) # 18 rz
		f.write(struct.pack("I", 0)) # 1C reserved

	def writeData(self, f, infoTop):
		if self.tx:
			fpatch(f, infoTop + 4, f.tell())
			f.write(encodeTup(self.tx))
		if self.ty:
			fpatch(f, infoTop + 8, f.tell())
			f.write(encodeTup(self.ty))
		if self.tz:
			fpatch(f, infoTop + 0xC, f.tell())
			f.write(encodeTup(self.tz))
		if self.rx:
			fpatch(f, infoTop + 0x10, f.tell())
			f.write(encodeTup(self.rx))
		if self.ry:
			fpatch(f, infoTop + 0x14, f.tell())
			f.write(encodeTup(self.ry))
		if self.rz:
			fpatch(f, infoTop + 0x18, f.tell())
			f.write(encodeTup(self.rz))

def saveANM(outDir, chop):
	if not chop: return
	fps = chop.sampleRate()
	srange = chop.sampleRange()
	fstart = chop.samplesToFrame(srange[0])
	fend = chop.samplesToFrame(srange[1])
	name = chop.name()
	strs = Strings()
	nameOffs = strs.add(name)
	nodes = {}
	for itrk, trk in enumerate(chop.tracks()):
		trkName = trk.name()
		chSep = trkName.rfind(":")
		chName = trkName[chSep+1:]
		nodePath = trkName[:chSep]
		nodeName =  nodePath[nodePath.rfind("/")+1:]
		if not nodeName in nodes:
			node = AnmNode(nodeName)
			nodes[nodeName] = node
			node.nameOffs = strs.add(nodeName)
		node = nodes[nodeName]
		data = trk.allSamples()
		if   chName == "tx": node.tx = data
		elif chName == "ty": node.ty = data
		elif chName == "tz": node.tz = data
		elif chName == "rx": node.rx = data
		elif chName == "ry": node.ry = data
		elif chName == "rz": node.rz = data

	f = open(outDir + "/" + name + ".anm", "wb")
	if not f: return

	nfrm = fend - fstart + 1
	f.write(struct.pack("4s", "$ANM"))
	f.write(struct.pack("f", fps)) # +04 FPS
	f.write(struct.pack("i", nfrm)) # +08 #frm
	f.write(struct.pack("i", len(nodes))) # +0C #nodes
	f.write(struct.pack("I", 0)) # +10 -> strs
	f.write(struct.pack("I", len(strs.data))) # +14
	f.write(struct.pack("i", nameOffs)) # +18 name
	f.write(struct.pack("I", 0)) # +1C -> nodes

	f.seek(align(f.tell(), 0x10))
	nodesTop = f.tell()
	fpatch(f, 0x1C, nodesTop) # -> nodes

	for nodeName in nodes:
		node = nodes[nodeName]
		node.writeInfo(f)

	top = nodesTop
	for nodeName in nodes:
		node = nodes[nodeName]
		node.writeData(f, top)
		top += 0x20

	fpatch(f, 0x10, f.tell()) # -> strs
	f.write(strs.data)

	f.close()


def texExp(outDir):
	dbgmsg("Exporting textures:")
	for tname in ["Head", "Eye", "Body", "Garment"]:
		name = "{}_BASE".format(tname)
		dbgmsg(" " + name)
		cop = hou.node("/obj/YWM/TEX/{}".format(name))
		saveTXD("{}/{}.txd".format(outDir, name), cop)

def mdlExp(outDir):
	sop = hou.node("/obj/YWM/EXP")
	mdd = ModelData(sop)
	dbgmsg("Exporting model: " + mdd.name)
	mdd.save("{}/{}.mdd".format(outDir, mdd.name))

def anmExp(outDir):
	chop = hou.node("/obj/MOT/walk")
	dbgmsg("Exporting animation: " + chop.name())
	saveANM(outDir, chop)

if __name__=="__main__":
	outDir = hou.expandString("$HIP/../dat");
	texExp(outDir)
	mdlExp(outDir)
	anmExp(outDir)


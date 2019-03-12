using System;
using System.IO;
using System.Globalization;

class HexPk {

	public static void Main(string[] args) {
		System.Threading.Thread.CurrentThread.CurrentCulture = CultureInfo.InvariantCulture;
		if (args == null || args.Length < 1) {
			return;
		}

		string lstPath = args[0];
		string baseDir = "..";
		StreamReader sr = File.OpenText(lstPath);
		string lstText = sr.ReadToEnd();
		sr.Close();
		string[] pathLst = lstText.Split(new char[]{' ', '\t', '\r', '\n'}, StringSplitOptions.RemoveEmptyEntries);
		object[] dataLst = new object[pathLst.Length];
		int idx = 0;
		foreach (string path in pathLst) {
			string srcPath = baseDir + "/" + path;
			FileInfo fi = new FileInfo(srcPath);
			int size = 0;
			if (fi.Exists) {
				FileStream fs = File.OpenRead(srcPath);
				BinaryReader br = new BinaryReader(fs);
				byte[] data = br.ReadBytes((int)fi.Length);
				br.Close();
				dataLst[idx] = data;
				size = data.Length;
			}
			Console.WriteLine("{0}: 0x{1:X} bytes", path, size);
			++idx;
		}

		string headStr = "";
		idx = 0;
		int offs = 0;
		foreach (string path in pathLst) {
			if (dataLst[idx] != null) {
				int size = ((byte[])dataLst[idx]).Length;
				headStr += String.Format("{0},{1:X},{2:X};", path, offs, size);
				offs += size;
			}
			++idx;
		}

		headStr = String.Format("$HEX{0:X4}{1}", headStr.Length, headStr);

		string outName = "pk.hex";
		FileStream ofs = new FileStream(outName, FileMode.Create);
		TextWriter tw = new StreamWriter(ofs);
		tw.WriteLine(headStr);
		idx = 0;
		foreach (string path in pathLst) {
			if (dataLst[idx] != null) {
				int size = ((byte[])dataLst[idx]).Length;
				headStr += String.Format("{0},{1:X},{2:X};", path, offs, size);
				offs += size;
			}
			++idx;
		}
		int ptr = 0;
		foreach (byte[] data in dataLst) {
			if (data != null) {
				Console.Write(".");
				foreach (byte b in data) {
					tw.Write("{0:X2}", b);
					++ptr;
					if ((ptr % 0x30) == 0) {
						tw.WriteLine();
					}
				}
			}
		}
		Console.WriteLine();
		tw.Close();
	}

}

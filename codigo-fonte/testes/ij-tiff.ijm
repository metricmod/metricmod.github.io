// Lê no ImageJ os TIFF de 1, 16 e 32 bits e com paleta, e grava os valores para comparar com o MetricMod (test-tiff-ij.mjs).
// O ImageJ não abre TIFF em blocos (tiles) com Deflate; g16-tiles-zlib.tif é comparado com a leitura do ImageJ de g16.tif (mesmos dados).
dir=File.getParent(getInfo("macro.filepath"))+"/";
f=newArray("g16.tif","f32.tif","bin1.tif","pal.tif");
for(i=0;i<f.length;i++){ open(dir+"tif/"+f[i]); if(bitDepth()==32) saveAs("Raw Data", dir+"rel/tif-"+f[i]+".raw"); else saveAs("Text Image", dir+"rel/tif-"+f[i]+".txt");
  if(f[i]=="pal.tif"||f[i]=="bin1.tif"){ run("RGB Color"); saveAs("PNG", dir+"rel/tif-"+f[i]+".png"); } close(); }

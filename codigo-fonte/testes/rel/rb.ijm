dir=File.getParent(File.getParent(getInfo("macro.filepath")))+"/";
for(r=60;r<=150;r+=90){ open(dir+"placa-luz.jpg"); run("8-bit"); run("Subtract Background...", "rolling="+r); saveAs("Text Image", dir+"rel/rbd"+r+".txt"); close(); }
open(dir+"encostados.png"); run("8-bit"); setAutoThreshold("Otsu"); getThreshold(lo,hi); getHistogram(v,c,256); s=""+hi+"\n"; for(i=0;i<256;i++) if(c[i]>0) s=s+i+":"+c[i]+" "; File.saveString(s, dir+"rel/enc.txt");

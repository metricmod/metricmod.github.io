dir=File.getParent(File.getParent(getInfo("macro.filepath")))+"/";
out="";
imgs=newArray("foto-teste.png","placa.jpg","placa-luz.jpg","fenda.png","gel.png","dificil.png","encostados.png");
for(i=0;i<imgs.length;i++){
  open(dir+imgs[i]); run("8-bit");
  saveAs("Text Image", dir+"rel/g"+i+".txt");
  setAutoThreshold("Otsu"); getThreshold(lo,hi);
  out=out+imgs[i]+","+lo+","+hi+"\n"; close();
}
File.saveString(out, dir+"rel/otsu_ij.csv");
// rolling ball na placa com luz irregular
open(dir+"placa-luz.jpg"); run("8-bit");
run("Subtract Background...", "rolling=60 light");
saveAs("Text Image", dir+"rel/rb60.txt"); close();
open(dir+"placa-luz.jpg"); run("8-bit");
run("Subtract Background...", "rolling=150 light");
saveAs("Text Image", dir+"rel/rb150.txt"); close();
// gel: densidade integrada com fundo (procedimento manual usual no ImageJ)
open(dir+"gel.png"); run("8-bit"); run("Invert");
s="";
for(k=0;k<4;k++){
  x=35+k*110; y=112; w=90; h=46;
  makeRectangle(x,y,w,h); raw=getValue("RawIntDen"); a=getValue("Area");
  makeRectangle(x-2,y-2,w+4,h+4); rawO=getValue("RawIntDen"); aO=getValue("Area");
  bg=(rawO-raw)/(aO-a);
  s=s+raw+","+a+","+bg+","+(raw-a*bg)+"\n";
}
File.saveString(s, dir+"rel/gel_ij.csv");

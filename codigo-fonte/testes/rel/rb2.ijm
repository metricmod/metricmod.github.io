dir=File.getParent(File.getParent(getInfo("macro.filepath")))+"/";
rs=newArray(5,20,60,150);
for(i=0;i<rs.length;i++){ r=rs[i];
  open(dir+"placa-luz.jpg"); run("8-bit"); run("Subtract Background...", "rolling="+r); saveAs("Text Image", dir+"rel/rbD"+r+".txt"); close();
  open(dir+"foto-teste.png"); run("8-bit"); run("Subtract Background...", "rolling="+r+" light"); saveAs("Text Image", dir+"rel/rbL"+r+".txt"); close();
}
open(dir+"placa-luz.jpg"); run("Subtract Background...", "rolling=60 separate"); saveAs("PNG", dir+"rel/rbRGB60.png"); close();
open(dir+"foto-teste.png"); run("Subtract Background...", "rolling=80 light separate"); saveAs("PNG", dir+"rel/rbRGBL80.png"); close();

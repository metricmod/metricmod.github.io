// Porcentagem de pixels escuros e claros pelo limiar de Otsu no ImageJ (referência de test-cobertura.js).
dir=File.getParent(getInfo("macro.filepath"))+"/";
imgs=newArray("foto-teste.png","placa.jpg","fenda.png","gel.png");
s="";
for(i=0;i<imgs.length;i++){ open(dir+imgs[i]); run("8-bit"); getHistogram(v,c,256); n=getWidth()*getHeight();
  setAutoThreshold("Otsu"); getThreshold(lo,hi); d=0; for(k=lo;k<=hi;k++) d+=c[k];
  setAutoThreshold("Otsu dark"); getThreshold(lo2,hi2); l=0; for(k=lo2;k<=hi2;k++) l+=c[k];
  s=s+imgs[i]+","+d2s(100*d/n,6)+","+d2s(100*l/n,6)+"\n"; close(); }
File.saveString(s, dir+"ij_cobertura.csv");
// com seleção (elipse): o limiar de Otsu é calculado só dentro dela
open(dir+"foto-teste.png"); run("8-bit"); makeOval(300,300,401,233);
setAutoThreshold("Otsu"); getThreshold(lo,hi); getHistogram(v,c,256); n=0; d=0; for(k=0;k<256;k++){ n+=c[k]; if(k>=lo&&k<=hi) d+=c[k]; }
File.saveString("elipse,"+d2s(100*d/n,6)+","+lo+","+hi, dir+"ij_cobertura_roi.csv"); close();

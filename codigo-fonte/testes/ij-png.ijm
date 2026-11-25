// Como o ImageJ lê PNG com transparência, 16 bits, paleta e entrelaçado (referência de test-png).
dir=File.getParent(getInfo("macro.filepath"))+"/png/";
f=newArray("rgba.png","rgb.png","la.png","g16.png","g16-inter.png","pal.png","inter.png");
for(i=0;i<f.length;i++){ open(dir+f[i]); print(f[i]+" bits="+bitDepth()); if(bitDepth()==24) saveAs("Raw Data", dir+"ij-"+f[i]+".raw"); else saveAs("Text Image", dir+"ij-"+f[i]+".txt"); close("*"); }

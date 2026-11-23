dir=File.getParent(File.getParent(getInfo("macro.filepath")))+"/"; s=""; run("Set Measurements...", "area centroid redirect=None decimal=1");
imgs=newArray("placa.jpg","placa-luz.jpg");
for(i=0;i<2;i++){ for(ws=0;ws<2;ws++){
  open(dir+imgs[i]); run("8-bit"); makeOval(700-440,550-440,880,880);
  setAutoThreshold("Otsu dark"); run("Convert to Mask"); 
  if(ws==1) run("Watershed");
  makeOval(700-440,550-440,880,880);
  run("Analyze Particles...", "size=30-Infinity circularity=0.50-1.00 clear");
  s=s+imgs[i]+",watershed="+ws+","+nResults; for(k=0;k<nResults;k++) s=s+";"+round(getResult("X",k))+" "+round(getResult("Y",k)); s=s+"\n"; close(); } }
File.saveString(s, dir+"rel/col_ij.csv");

// Perfil de linha e histograma no ImageJ (referência de test-perfil.js).
dir=File.getParent(getInfo("macro.filepath"))+"/";
open(dir+"foto-teste.png");
s="";
lines=newArray(100,200,600,450, 1050.5,190.5,1260.25,330.75, 300,800,300,1000);
for(i=0;i<3;i++){ makeLine(lines[i*4],lines[i*4+1],lines[i*4+2],lines[i*4+3]); p=getProfile(); s=s+"L"+i; for(k=0;k<p.length;k++) s=s+","+d2s(p[k],6); s=s+"\n"; }
makeOval(300,300,401,233); getHistogram(v,c,256); s=s+"H"; for(k=0;k<256;k++) s=s+","+c[k]; s=s+"\n";
run("Select None"); getHistogram(v,c,256); s=s+"HT"; for(k=0;k<256;k++) s=s+","+c[k]; s=s+"\n";
File.saveString(s, dir+"ij_perfil.csv");

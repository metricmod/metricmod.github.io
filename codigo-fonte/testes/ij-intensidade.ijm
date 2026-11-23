// Intensidade e ângulo no ImageJ (referência de test-int.js). Grava ij_int.csv na pasta desta macro.
dir=File.getParent(getInfo("macro.filepath"))+"/";
open(dir+"foto-teste.png");
run("Set Measurements...", "area mean standard min integrated redirect=None decimal=4");
s="";
names=newArray("oval","oval2","poly");
for(i=0;i<3;i++){
  if(i==0) makeOval(1050,190,200,120);
  if(i==1) makeOval(300,300,401,233);
  if(i==2) makePolygon(1100,450,1350,500,1300,620,1150,600);
  s=s+names[i]+","+getValue("Area")+","+d2s(getValue("Perim."),4)+","+d2s(getValue("Mean"),4)+","+d2s(getValue("StdDev"),4)+","+getValue("Min")+","+getValue("Max")+","+getValue("IntDen")+","+getValue("RawIntDen")+"\n";
}
makeSelection("angle",newArray(100,300,500),newArray(100,400,150));
s=s+"angle,"+d2s(getValue("Angle"),4)+"\n";
File.saveString(s, dir+"ij_int.csv");

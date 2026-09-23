import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const code = `
from PIL import Image, ImageDraw

def draw(w, h):
    bg=(243,226,199); cup=(201,123,74); inner=(233,201,163); steam=(181,137,95); leaf=(138,155,111)
    img=Image.new('RGBA',(w,h),bg); d=ImageDraw.Draw(img); cx,cy=w//2,int(h*0.46)
    for dx,dy,oh in [(-int(w*0.06),-int(h*0.30),h*0.20),(0,-int(h*0.34),h*0.24),(int(w*0.06),-int(h*0.30),h*0.20)]:
        d.arc([cx+dx-int(w*0.04),cy+int(h*0.05)+dy,cx+dx+int(w*0.04),cy+int(h*0.05)+dy+oh],200,340,fill=steam,width=max(3,w//40))
    rw,rh=int(w*0.34),int(h*0.30)
    d.rounded_rectangle([cx-rw,cy-rh//2,cx+rw,cy+rh//2],radius=int(w*0.06),fill=cup,outline=inner,width=max(3,w//50))
    iw=int(w*0.28)
    d.rounded_rectangle([cx-iw,cy-rh//2+int(h*0.10),cx+iw,cy-rh//2+int(h*0.20)],radius=int(w*0.04),fill=inner)
    d.arc([cx+rw-int(w*0.12),cy-int(w*0.10),cx+rw+int(w*0.06),cy+int(w*0.12)],-60,240,fill=cup,width=max(4,w//40))
    for lx,ly in [(int(w*0.12),int(h*0.14)),(int(w*0.86),int(h*0.18))]:
        d.ellipse([lx,ly,lx+int(w*0.06),ly+int(w*0.06)],fill=leaf)
    return img

for w,name in [(192,'icon-192.png'),(512,'icon-512.png'),(180,'apple-touch-icon-180.png')]:
    draw(w,w).save(f'icons/{name}')
img=Image.new('RGBA',(512,512),(243,226,199))
sub=draw(512,512).crop((72,72,440,440)).resize((368,368), Image.LANCZOS)
img.paste(sub,(72,72),sub); img.save('icons/maskable-512.png')
print('icons regenerated')
`;
const root = dirname(fileURLToPath(import.meta.url));
try {
  execSync(`python3 -c ${JSON.stringify(code)}`, { stdio: 'inherit', cwd: root });
} catch {
  process.exit(1);
}

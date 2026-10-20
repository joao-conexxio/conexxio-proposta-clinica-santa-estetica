// Recorta o logo (traço branco sobre gradiente rosa) da foto de perfil e compõe
// um lockup horizontal: borboleta à esquerda, "Santa / ESTÉTICA" à direita.
// Gera duas cores: uma para fundo claro e uma branca para fundo escuro.
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync } from 'node:fs';
const require = createRequire(process.env.HOME + '/Dev/Conexxio/proposta-kit/package.json');
const { chromium } = require('playwright');

const [src, outDir] = process.argv.slice(2);
const b64 = readFileSync(src).toString('base64');
const CORES = { 'logo-roxo': [96, 26, 110], 'logo-branco': [255, 255, 255] };

const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 1 });
await page.setContent('<canvas id=c></canvas>');
for (const [nome, cor] of Object.entries(CORES)) {
  const url = await page.evaluate(async ({ b64, cor }) => {
    const img = new Image();
    img.src = 'data:image/png;base64,' + b64;
    await img.decode();
    const c = document.getElementById('c');
    c.width = img.width; c.height = img.height;
    const ctx = c.getContext('2d');
    ctx.drawImage(img, 0, 0);
    const d = ctx.getImageData(0, 0, c.width, c.height);
    const px = d.data;
    // o fundo é rosa/lilás saturado: o menor canal dele fica bem abaixo de 255
    let t0 = 0;
    for (const [x, y] of [[4, 4], [c.width - 5, 4], [4, c.height - 5], [c.width - 5, c.height - 5], [c.width >> 1, 4], [4, c.height >> 1]]) {
      const i = (y * c.width + x) * 4;
      t0 = Math.max(t0, Math.min(px[i], px[i + 1], px[i + 2]));
    }
    t0 += 12;
    for (let i = 0; i < px.length; i += 4) {
      const m = Math.min(px[i], px[i + 1], px[i + 2]);
      const a = Math.min(1, Math.max(0, (m - t0) / (250 - t0)));
      px[i] = cor[0]; px[i + 1] = cor[1]; px[i + 2] = cor[2]; px[i + 3] = Math.round(a * 255);
    }
    ctx.putImageData(d, 0, 0);
    const caixa = (y0, y1) => {
      let minX = 1e9, minY = 1e9, maxX = 0, maxY = 0;
      for (let y = y0; y < y1; y++) for (let x = 0; x < c.width; x++) {
        if (px[(y * c.width + x) * 4 + 3] > 80) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
      }
      return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
    };
    const H = c.height;
    const borb = caixa(0, Math.round(H * 0.55));
    const palavra = caixa(Math.round(H * 0.55), H);
    const escala = 1;
    const gap = Math.round(palavra.h * 0.28);
    const alturaBorb = Math.round(palavra.h * 1.0);
    const larguraBorb = Math.round(borb.w * alturaBorb / borb.h);
    const o = document.createElement('canvas');
    const pad = 4;
    o.width = larguraBorb + gap + palavra.w + pad * 2;
    o.height = Math.max(alturaBorb, palavra.h) + pad * 2;
    const g = o.getContext('2d');
    g.imageSmoothingQuality = 'high';
    g.drawImage(c, borb.x, borb.y, borb.w, borb.h, pad, pad + (o.height - pad * 2 - alturaBorb) / 2, larguraBorb, alturaBorb);
    g.drawImage(c, palavra.x, palavra.y, palavra.w, palavra.h, pad + larguraBorb + gap, pad + (o.height - pad * 2 - palavra.h) / 2, palavra.w, palavra.h);
    return o.toDataURL('image/png');
  }, { b64, cor });
  writeFileSync(`${outDir}/${nome}.png`, Buffer.from(url.split(',')[1], 'base64'));
}
await browser.close();
console.log('ok');

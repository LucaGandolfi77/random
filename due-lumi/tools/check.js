/* Valida larghezze delle sprite e sintassi JS. Uso: node tools/check.js */
const fs = require('fs');
const path = require('path');

let ok = true;
const bad = [];

function checkWidths(){
  const src = fs.readFileSync(path.join(__dirname, '..', 'js', 'sprites.js'), 'utf8');
  // crude parse: find defSprite calls with string-array rows
  const re = /defSprite\('([^']+)',\s*\[([\s\S]*?)\](\s*,\s*\{[\s\S]*?\})?\s*\);/g;
  let m;
  while((m = re.exec(src))){
    const name = m[1];
    const arrSrc = m[2];
    const rows = [];
    const rowRe = /'([^']*)'/g;
    let r;
    while((r = rowRe.exec(arrSrc))) rows.push(r[1]);
    const w = rows[0] ? rows[0].length : 0;
    rows.forEach((row, i) => {
      if(row.length !== w){
        bad.push(`SPRITE "${name}" row ${i}: len ${row.length} != ${w}  ${JSON.stringify(row)}`);
        ok = false;
      }
    });
  }
}

function checkRooms(){
  const src = fs.readFileSync(path.join(__dirname, '..', 'js', 'tiles.js'), 'utf8');
  const re = /room\('([^']+)',\s*\{\s*zone:\s*'[^']*',\s*map:\s*\[([\s\S]*?)\](\s*,\s*\{[\s\S]*?\})?/g;
  let m;
  while((m = re.exec(src))){
    const name = m[1];
    const arrSrc = m[2];
    const rows = [];
    const rowRe = /'([^']*)'/g;
    let r;
    while((r = rowRe.exec(arrSrc))) rows.push(r[1]);
    if(!rows.length) continue;
    const w = rows[0].length;
    rows.forEach((row, i) => {
      if(row.length !== w){
        bad.push(`ROOM "${name}" row ${i}: len ${row.length} != ${w}  ${JSON.stringify(row)}`);
        ok = false;
      }
    });
  }
}

function checkSyntax(file){
  try {
    new Function(fs.readFileSync(path.join(__dirname, '..', 'js', file), 'utf8'));
  } catch(e){
    bad.push(`SYNTAX ${file}: ${e.message}`);
    ok = false;
  }
}

checkWidths();
checkRooms();
['palette.js','font.js','sprites.js','audio.js','input.js','engine.js','tiles.js','items.js','dialogue.js','ui.js','overworld.js','battle.js','story.js','main.js']
  .forEach(checkSyntax);

if(ok){ console.log('OK: tutte le sprite e la sintassi sono valide.'); }
else { console.log(bad.join('\n')); process.exit(1); }
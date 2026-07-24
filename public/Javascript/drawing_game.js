
const main    = document.getElementById('mainCanvas');
const overlay = document.getElementById('overlayCanvas');
const mc      = main.getContext('2d');
const oc      = overlay.getContext('2d');
const wrap    = document.getElementById('wrap');
const statusEl = document.getElementById('status');

// ── Resize ──────────────────────────────────────────────
function resize() {
  const w = wrap.clientWidth;
  const h = wrap.clientHeight;
  const tmp = document.createElement('canvas');
  tmp.width  = main.width  || w;
  tmp.height = main.height || h;
  tmp.getContext('2d').drawImage(main, 0, 0);
  main.width  = overlay.width  = w;
  main.height = overlay.height = h;
  main.style.width  = overlay.style.width  = w + 'px';
  main.style.height = overlay.style.height = h + 'px';
  mc.drawImage(tmp, 0, 0);
}

// Use ResizeObserver so toolbar height changes also trigger resize
const ro = new ResizeObserver(resize);
ro.observe(wrap);
resize();

// ── State ────────────────────────────────────────────────
let tool = 'pen', color = '#000000', size = 5, doFill = false;
let drawing = false, sx = 0, sy = 0;
let history = [], redoStack = [];

// ── Tool ─────────────────────────────────────────────────
function setTool(t) {
  tool = t;
  document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
  const b = document.getElementById('btn-' + t);
  if (b) b.classList.add('active');
  document.body.className = 'tool-' + t;
}

// ── Color ────────────────────────────────────────────────
function setSwatch(el) {
  color = el.dataset.color;
  document.querySelectorAll('.swatch').forEach(s => s.classList.remove('active'));
  el.classList.add('active');
  document.getElementById('colorPicker').value = color;
  updateDot();
}
function setCustomColor(val) {
  color = val;
  document.querySelectorAll('.swatch').forEach(s => s.classList.remove('active'));
  updateDot();
}

// ── Size ─────────────────────────────────────────────────
function setSize(val) {
  size = val;
  document.getElementById('sizeNum').textContent = val;
  updateDot();
}
function updateDot() {
  const d = document.getElementById('sizeDot');
  const s = Math.max(4, Math.min(size, 32));
  d.style.width  = s + 'px';
  d.style.height = s + 'px';
  d.style.background = color;
}

// ── History ──────────────────────────────────────────────
function snap() {
  redoStack = [];
  if (history.length > 40) history.shift();
  history.push(main.toDataURL());
}
function restoreURL(url) {
  const img = new Image();
  img.onload = () => { mc.clearRect(0,0,main.width,main.height); mc.drawImage(img,0,0); };
  img.src = url;
}
function undo() { if (!history.length) return; redoStack.push(main.toDataURL()); restoreURL(history.pop()); }
function redo() { if (!redoStack.length) return; history.push(main.toDataURL()); restoreURL(redoStack.pop()); }

// ── Clear / Save ─────────────────────────────────────────
function clearAll() { snap(); mc.clearRect(0,0,main.width,main.height); }
function saveImg() {
  const tmp = document.createElement('canvas');
  tmp.width = main.width; tmp.height = main.height;
  const tc = tmp.getContext('2d');
  tc.fillStyle = '#fff'; tc.fillRect(0,0,tmp.width,tmp.height);
  tc.drawImage(main,0,0);
  const a = document.createElement('a');
  a.download = 'drawing.png'; a.href = tmp.toDataURL(); a.click();
}

// ── Coords ───────────────────────────────────────────────
function getXY(e) {
  const r = overlay.getBoundingClientRect();
  const s = e.touches ? e.touches[0] : e;
  return { x: s.clientX - r.left, y: s.clientY - r.top };
}

// ── Draw helpers ─────────────────────────────────────────
function clearOverlay() { oc.clearRect(0,0,overlay.width,overlay.height); }

function applyStyle(ctx) {
  ctx.strokeStyle = color; ctx.fillStyle = color;
  ctx.lineWidth = size; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
}

function drawShape(ctx, ex, ey) {
  applyStyle(ctx);
  const dx = ex-sx, dy = ey-sy;
  ctx.beginPath();
  if (tool==='line') {
    ctx.moveTo(sx,sy); ctx.lineTo(ex,ey); ctx.stroke();
  } else if (tool==='rect') {
    doFill ? ctx.fillRect(sx,sy,dx,dy) : ctx.strokeRect(sx,sy,dx,dy);
  } else if (tool==='circle') {
    const rx=Math.abs(dx)/2, ry=Math.abs(dy)/2;
    ctx.ellipse(sx+dx/2,sy+dy/2,Math.max(rx,1),Math.max(ry,1),0,0,Math.PI*2);
    doFill ? ctx.fill() : ctx.stroke();
  } else if (tool==='triangle') {
    ctx.moveTo(sx+dx/2,sy); ctx.lineTo(sx+dx,sy+dy); ctx.lineTo(sx,sy+dy);
    ctx.closePath(); doFill ? ctx.fill() : ctx.stroke();
  } else if (tool==='arrow') {
    const len=Math.hypot(dx,dy), hLen=Math.max(10,Math.min(28,len*0.3)), ang=Math.atan2(dy,dx);
    ctx.moveTo(sx,sy); ctx.lineTo(ex,ey); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(ex,ey);
    ctx.lineTo(ex-hLen*Math.cos(ang-0.4),ey-hLen*Math.sin(ang-0.4));
    ctx.lineTo(ex-hLen*Math.cos(ang+0.4),ey-hLen*Math.sin(ang+0.4));
    ctx.closePath(); ctx.fill();
  }
}

// ── Flood fill ───────────────────────────────────────────
function hexToRgba(hex) {
  return [parseInt(hex.slice(1,3),16),parseInt(hex.slice(3,5),16),parseInt(hex.slice(5,7),16),255];
}
function floodFill(px,py) {
  const tmp=document.createElement('canvas');
  tmp.width=main.width; tmp.height=main.height;
  const tc=tmp.getContext('2d');
  tc.fillStyle='#fff'; tc.fillRect(0,0,tmp.width,tmp.height); tc.drawImage(main,0,0);
  const imgData=tc.getImageData(0,0,tmp.width,tmp.height);
  const d=imgData.data, W=tmp.width, H=tmp.height;
  const i0=(py*W+px)*4;
  const tgt=[d[i0],d[i0+1],d[i0+2],d[i0+3]], fill=hexToRgba(color);
  if(tgt.every((v,i)=>v===fill[i])) return;
  const match=i=>d[i]===tgt[0]&&d[i+1]===tgt[1]&&d[i+2]===tgt[2]&&d[i+3]===tgt[3];
  const paint=i=>{d[i]=fill[0];d[i+1]=fill[1];d[i+2]=fill[2];d[i+3]=fill[3];};
  const stack=[px+py*W];
  while(stack.length){
    const pos=stack.pop(), x=pos%W, y=~~(pos/W), i=pos*4;
    if(x<0||x>=W||y<0||y>=H||!match(i)) continue;
    paint(i); stack.push(pos+1,pos-1,pos+W,pos-W);
  }
  mc.putImageData(imgData,0,0);
}

// ── Events ───────────────────────────────────────────────
overlay.addEventListener('mousedown',  onDown);
overlay.addEventListener('mousemove',  onMove);
overlay.addEventListener('mouseup',    onUp);
overlay.addEventListener('mouseleave', onLeave);
overlay.addEventListener('touchstart', e=>{e.preventDefault();onDown(e);},{passive:false});
overlay.addEventListener('touchmove',  e=>{e.preventDefault();onMove(e);},{passive:false});
overlay.addEventListener('touchend',   e=>{e.preventDefault();onUp(e);},  {passive:false});

function onDown(e) {
  const {x,y}=getXY(e); sx=x; sy=y;
  if(tool==='fill')  { snap(); floodFill(Math.round(x),Math.round(y)); return; }
  if(tool==='text')  { showText(x,y); return; }
  drawing=true; snap();
  if(tool==='pen'||tool==='eraser') { applyStyle(mc); mc.beginPath(); mc.moveTo(x,y); }
}
function onMove(e) {
  const {x,y}=getXY(e);
  statusEl.textContent=`x:${Math.round(x)} y:${Math.round(y)}`;
  if(!drawing) return;
  if(tool==='pen') {
    applyStyle(mc); mc.lineTo(x,y); mc.stroke();
  } else if(tool==='eraser') {
    mc.save(); mc.globalCompositeOperation='source-over';
    mc.strokeStyle='#fff'; mc.lineWidth=size*2.5;
    mc.lineCap='round'; mc.lineJoin='round';
    mc.lineTo(x,y); mc.stroke(); mc.restore();
  } else { clearOverlay(); drawShape(oc,x,y); }
}
function onUp(e) {
  if(!drawing) return; drawing=false;
  if(['line','rect','circle','triangle','arrow'].includes(tool)) {
    const {x,y}=getXY(e); drawShape(mc,x,y); clearOverlay();
  }
  mc.beginPath();
}
function onLeave(e) {
  if(drawing&&(tool==='pen'||tool==='eraser')) { drawing=false; mc.beginPath(); }
}

// ── Text ─────────────────────────────────────────────────
let textPx=0, textPy=0;
function showText(x,y) {
  textPx=x; textPy=y;
  const box=document.getElementById('textBox');
  const inp=document.getElementById('textInput');
  const r=overlay.getBoundingClientRect();
  box.style.display='block';
  box.style.left=(r.left+x)+'px';
  box.style.top=(r.top+y-22)+'px';
  inp.style.fontSize=Math.max(14,size*2.5)+'px';
  inp.style.color=color; inp.value='';
  setTimeout(()=>inp.focus(),0);
}
document.getElementById('textInput').addEventListener('keydown',e=>{
  if(e.key==='Enter'){
    const v=e.target.value.trim();
    if(v){ snap(); mc.fillStyle=color; mc.font=`${Math.max(14,size*2.5)}px "DM Sans",sans-serif`; mc.fillText(v,textPx,textPy); }
    document.getElementById('textBox').style.display='none';
  }
  if(e.key==='Escape') document.getElementById('textBox').style.display='none';
  e.stopPropagation();
});

document.getElementById('fillShape').addEventListener('change',e=>{ doFill=e.target.checked; });

document.addEventListener('keydown',e=>{
  if(e.target.tagName==='INPUT') return;
  const map={p:'pen',e:'eraser',l:'line',r:'rect',c:'circle',t:'triangle',a:'arrow',x:'text',f:'fill'};
  if(map[e.key.toLowerCase()]){ setTool(map[e.key.toLowerCase()]); return; }
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){ e.preventDefault(); undo(); }
  if((e.ctrlKey||e.metaKey)&&(e.key.toLowerCase()==='y'||e.key==='Z')){ e.preventDefault(); redo(); }
});

setSize(5); updateDot();

import { uiIcon } from './icons.js'

// Isolated presentation prototype: no run state, saves or combat rules are used.
const kinds = { combat:['attack','전투'], elite:['attack','위험 전투'], workshop:['settings','정비 · 치료'], event:['eye','랜덤 사건'], boss:['exhaust','최종 전투'] }
const nodes = [
  {id:'start',step:1,x:100,y:385,name:'문 닫힌 편의점',kind:'combat',to:['parking','alley'],enemies:'배회자',reward:'첫 전투'},
  {id:'parking',step:2,x:285,y:245,name:'지하 주차장',kind:'combat',to:['metro','workshop'],enemies:'역관절 질주자 · 봉합된 감염체',reward:'전리품',risk:'빠른 연타 · 감염',description:'램프 아래로 발자국이 이어진다. 출구 표지판은 모두 꺼졌다.'},
  {id:'alley',step:2,x:285,y:530,name:'봉쇄된 골목',kind:'event',to:['workshop','storage'],reward:'랜덤 사건 · 스킬 획득 / 동전 장비 보급 등',risk:'도착 전에는 사건을 알 수 없음',description:'철제 울타리 너머 누군가 불빛을 흔든다. 가까이 가야 얼굴을 볼 수 있다.'},
  {id:'metro',step:3,x:475,y:160,name:'멈춘 지하철',kind:'combat',to:['hospital'],enemies:'울부짖는 것 · 기어오는 것',reward:'전리품',risk:'소음 · 붙잡힘',description:'열린 차문 사이로 소리가 새어 나온다. 선로를 따라 병동으로 갈 수 있다.'},
  {id:'workshop',step:3,x:475,y:385,name:'폐정비소',kind:'workshop',to:['hospital','water'],reward:'치료 / 장비 강화',risk:'이번 구역에서는 전리품 없음',description:'문을 걸어 잠그고 상처를 돌보거나 작업대에서 장비를 손볼 수 있다.'},
  {id:'storage',step:3,x:475,y:610,name:'창고 뒤편',kind:'event',to:['water'],reward:'랜덤 사건 · 스킬 획득 / 동전 장비 보급 등',risk:'도착 전에는 사건을 알 수 없음',description:'뜯긴 포장 상자가 바닥에 쌓여 있다. 안쪽에서 누군가 움직이는 소리가 들린다.'},
  {id:'hospital',step:4,x:655,y:255,name:'이름 없는 병동',kind:'elite',to:['shelter','checkpoint'],enemies:'문지기 · 배회자',reward:'상위 전리품 후보',risk:'사지 강타 · 동전 판정',description:'출입문이 안쪽에서 찌그러졌다. 병동을 가로지르면 출구로 가는 길이 짧아진다.'},
  {id:'water',step:4,x:655,y:520,name:'수문 관리소',kind:'combat',to:['shelter','armory'],enemies:'부풀어 오른 것 · 기어오는 것',reward:'전리품',risk:'재생 · 붙잡힘',description:'검은 물이 발목까지 차오른다. 관리소의 계단은 검문소 뒤편으로 이어진다.'},
  {id:'shelter',step:5,x:840,y:160,name:'임시 은신처',kind:'workshop',to:['gate'],reward:'치료 / 장비 강화',risk:'이번 구역에서는 전리품 없음',description:'아직 무너지지 않은 방 하나. 잠깐 상처와 장비를 돌볼 여유가 생겼다.'},
  {id:'checkpoint',step:5,x:840,y:385,name:'돌아보는 검문소',kind:'elite',to:['gate'],enemies:'봉합된 감염체 · 역관절 질주자 · 울부짖는 것',reward:'상위 전리품 후보',risk:'다수 전투 · 소음',description:'바리케이드 사이에 서 있던 것들이 일제히 고개를 돌린다.'},
  {id:'armory',step:5,x:840,y:610,name:'버려진 초소',kind:'event',to:['gate'],reward:'랜덤 사건 · 스킬 획득 / 동전 장비 보급 등',risk:'도착 전에는 사건을 알 수 없음',description:'찢긴 군용 천막 아래 작은 불빛이 보인다. 누가 남아 있는지는 알 수 없다.'},
  {id:'gate',step:6,x:1020,y:385,name:'출구 앞 대기실',kind:'workshop',to:['boss'],reward:'치료 / 장비 강화 · 가방 정리',description:'흩어졌던 길이 여기서 만난다. 문을 열기 전 마지막으로 상처와 장비를 돌본다.'},
  {id:'boss',step:7,x:1160,y:385,name:'숨 쉬는 출구',kind:'boss',to:[],enemies:'최종 보스 · 이름 미정',reward:'다음 막으로',risk:'되돌아갈 수 없음',description:'모든 경로의 끝. 문 너머에서 무언가 숨을 쉬고 있다.'},
]
const byId = new Map(nodes.map(n=>[n.id,n]))
let path=['start'], selected=null, arrivalTimer
const $=id=>document.getElementById(id)
const svgNS='http://www.w3.org/2000/svg'
function svg(tag,attrs,parent){const el=document.createElementNS(svgNS,tag);Object.entries(attrs).forEach(([k,v])=>el.setAttribute(k,v));parent.append(el);return el}
const terrain=$('terrain')
// Draw the city plan directly: blocks, an arterial road, rail lines and a canal.
for(let row=0;row<8;row++)for(let col=0;col<14;col++){
  const x=32+col*88+(row%2)*12,y=46+row*87,w=42+(col*7+row*13)%29,h=32+(col*11+row*3)%24
  if((col+row)%7!==0)svg('path',{d:`M${x} ${y}h${w}v${h}h-${w}z`,class:'terrain-block',transform:`rotate(${(col%3-1)*4} ${x} ${y})`},terrain)
}
svg('path',{d:'M-20 470L160 436L390 445L550 390L735 410L940 350L1260 365',class:'terrain-street'},terrain)
svg('path',{d:'M-20 700L290 678L500 712L820 672L1050 710L1260 670L1260 760H-20Z',class:'terrain-water'},terrain)
for(const offset of [0,7])svg('path',{d:`M60 ${76+offset}L360 ${94+offset}L580 ${55+offset}L930 ${84+offset}L1240 ${34+offset}`,fill:'none',stroke:'#697257','stroke-width':1,opacity:'.35'},terrain)
for(const [x,y,value]of [[70,130,'봉쇄 구역'],[470,90,'지하철'],[645,650,'배수로'],[950,245,'출구']]){const t=svg('text',{x,y,class:'terrain-text'},terrain);t.textContent=value}
const links=[]
for(const node of nodes)for(const next of node.to){const target=byId.get(next);const mid=(node.x+target.x)/2;links.push({from:node.id,to:next,el:svg('path',{d:`M${node.x} ${node.y}C${mid} ${node.y} ${mid} ${target.y} ${target.x} ${target.y}`,class:'connection'},$('connections'))})}
const buttons=new Map()
for(const node of nodes){
  const b=document.createElement('button');b.className='node';b.style.left=`${node.x/1240*100}%`;b.style.top=`${node.y/760*100}%`
  const mark=document.createElement('span');mark.className='mark';mark.append(uiIcon(kinds[node.kind][0]));b.append(mark)
  const name=document.createElement('span');name.className='name';name.textContent=node.name;b.append(name)
  b.addEventListener('click',()=>{selected=node.id;render()});buttons.set(node.id,b);$('nodes').append(b)
}
function render(){
  const current=byId.get(path.at(-1)),available=current.to
  $('progress').textContent=`${String(current.step).padStart(2,'0')} / 07`
  for(const node of nodes){const b=buttons.get(node.id);const status=node.id===current.id?'current':path.includes(node.id)?'visited':available.includes(node.id)?'available':node.step<=current.step?'passed':'locked';b.className=`node ${status} ${node.kind==='boss'?'boss':''} ${selected===node.id?'selected':''}`;b.disabled=!available.includes(node.id);b.setAttribute('aria-label',`${node.name} · ${kinds[node.kind][1]} · ${status==='available'?'移動可能'.replace('移動可能','이동 가능'):status==='current'?'현재 위치':'이동 불가'}`);b.setAttribute('aria-pressed',String(selected===node.id));b.querySelector('.position-tag')?.remove();if(status==='current'){const t=document.createElement('span');t.className='position-tag';t.textContent='현재 위치';b.append(t)}}
  for(const link of links){const visited=path.some((id,i)=>id===link.from&&path[i+1]===link.to);link.el.setAttribute('class',`connection ${visited?'visited':link.from===current.id?'available':''}`)}
  const n=byId.get(selected),details=$('details');details.replaceChildren()
  const add=(tag,cls,text)=>{const el=document.createElement(tag);el.className=cls;el.textContent=text;details.append(el);return el}
  if(n){add('h2','',n.name);add('p','description',n.description)}
  else if(!available.length){add('h2','',current.name);add('p','description',current.description)}
  $('travel').disabled=!n;$('travel').textContent=n?'이동':available.length?'목적지 선택':'도착'
}
$('travel').addEventListener('click',()=>{if(!selected||!byId.get(path.at(-1)).to.includes(selected))return;const n=byId.get(selected);path.push(selected);selected=null;render();$('arrival').textContent=`${n.name} 도착 · ${kinds[n.kind][1]}`;$('arrival').classList.add('visible');clearTimeout(arrivalTimer);arrivalTimer=setTimeout(()=>$('arrival').classList.remove('visible'),2200)})
$('reset').addEventListener('click',()=>{path=['start'];selected=null;$('arrival').classList.remove('visible');render()})
render()

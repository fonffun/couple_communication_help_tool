const $ = (sel, root=document) => root.querySelector(sel);
const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));
const app = $('#app');
const pageTitle = $('#pageTitle');
const toastEl = $('#toast');

const LS = 'couple-toolbox-session-v1';
const state = {
  route: 'home',
  session: JSON.parse(localStorage.getItem(LS) || 'null'),
  topics: [],
  rules: [],
  questions: { questions: [], answers: [], comments: [] },
  activeTopicId: localStorage.getItem('activeTopicId') || '',
  monthKey: new Date().toISOString().slice(0,7),
  temp: {}
};

const TOPIC_TYPES = [
  ['emotion','情绪表达'],['misunderstanding','误解澄清'],['habit','生活习惯协商'],['care','日常关心与陪伴'],['boundary','边界问题'],['work','工作压力相关'],['body','身体状态/PMS相关'],['old_wound','旧问题修复'],['future','未来计划讨论'],['other','其他']
];
const NEEDS = ['想先被心疼','想被认真听完','想听到理解','想得到道歉','想得到解释','想要一个承诺','想要具体行动','想要陪伴','想要边界感','想要共同解决方案'];
const TRIGGERS = ['被忽略','被误解','没有被心疼','对方先解释','语气太硬','主话题被打断','旧问题被触发','身体状态没有被重视','疲惫时没有被照顾','感觉不被放在心上'];
const FEELINGS = ['委屈','失落','难过','生气','不安','害怕','孤单','无力','被否定','不被珍惜'];
const HOPES = ['先抱抱/安抚','先说心疼','先复述理解','先承认影响','先不要解释','先不要给方案','先给一点时间','先确认还在乎这段关系','先道歉','先一起约定后续处理时间'];
const B_PITFALLS = ['立刻解释','立刻讲道理','觉得对方反应太大','只关注事实对错','忽略对方要的是态度','用疲惫作为全部理由','打断主话题','反过来表达自己的委屈','说话太硬','急于结束话题'];
const B_IMPACTS = ['确实让对方难受了','没有第一时间接住情绪','语气不够柔和','解释太早','忽略了对方需要态度','让旧问题被重新触发','在疲惫时回应质量下降'];
const REPAIRS = ['先表达心疼','先认真复述','给出明确道歉','解释前先确认是否适合解释','安排后续时间继续聊','做一个具体行动','写入下次规则','对旧问题单独开专题修复','工作日疲惫时先安抚后讨论'];

const SCORE_GROUPS = [
  { id:'prep', title:'事前准备度', weight:15, desc:'是否适合聊、话题是否清晰、特殊状态是否被识别。', items:[
    ['topic_clear','主话题清晰，只聚焦一件事'], ['state_checked','双方精力与情绪被确认'], ['time_ok','时间场景适合本次沟通'], ['special_seen','疲惫/PMS/旧伤等特殊状态被识别']
  ]},
  { id:'a_expr', title:'A 方表达质量', weight:20, desc:'表达方是否把感受和需求讲清楚，而不是只进行指责。', items:[
    ['fact_clear','事实描述具体，不泛化攻击'], ['feeling_named','清楚表达感受'], ['need_named','清楚表达核心需求'], ['request_specific','提出具体可执行请求'], ['no_attack','避免攻击、讽刺、绝对化语言'], ['old_wound_control','旧问题没有淹没当前话题'], ['a_empathy','表达时给了承接方理解空间']
  ]},
  { id:'b_hold', title:'B 方承接质量', weight:20, desc:'承接方是否先接住影响，再进入解释或方案。', items:[
    ['reflect','复述了对方真正难受的点'], ['validate','表达理解、心疼或在乎'], ['impact','承认行为造成的影响'], ['explain_timing','控制了解释时机'], ['repair','提出了具体修复动作'], ['tone_soft','语气柔和，没有反击'], ['responsibility','承担了可承担的部分']
  ]},
  { id:'process', title:'沟通过程质量', weight:25, desc:'谈话是否能保护主线、处理误解、避免升级。', items:[
    ['topic_protect','主话题被保护，没有频繁跑题'], ['no_interrupt','打断较少，轮流表达'], ['misunderstanding_repair','出现误解时及时澄清'], ['pause_return','需要时使用暂停并返回'], ['safe_words','避免危险表达和伤人话'], ['need_solution_distinguish','区分了态度需求和方案需求'], ['deescalate','情绪升高时有降级动作'], ['balanced_turn','双方都有表达和被听见的机会']
  ]},
  { id:'result', title:'结果与修复质量', weight:20, desc:'是否形成理解、行动、规则和后续安排。', items:[
    ['understood','双方至少部分感到被理解'], ['consensus','对核心问题形成初步共识'], ['emotion_repaired','情绪得到一定修复'], ['next_rule','形成了下次规则'], ['follow_up','需要继续聊的部分有安排'], ['trust','关系安全感没有被进一步破坏'], ['safety','没有留下需要立即停止沟通的高风险状态']
  ]}
];

function saveSession(){ localStorage.setItem(LS, JSON.stringify(state.session)); }
function toast(msg){ toastEl.textContent = msg; toastEl.classList.add('show'); clearTimeout(toastEl.t); toastEl.t=setTimeout(()=>toastEl.classList.remove('show'),2200); }
function esc(s){ return String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
function partnerName(role){ if(!state.session) return role; return role==='A' ? state.session.partnerAName : state.session.partnerBName; }
function other(role){ return role === 'A' ? 'B' : 'A'; }
function activeTopic(){ return state.topics.find(t=>t.id===state.activeTopicId) || state.topics[0] || null; }
function payload(t){ return t?.payload || {}; }
function nav(route){ state.route = route; render(); window.scrollTo({top:0,behavior:'smooth'}); }
function setTitle(text){ pageTitle.textContent = text; $$('.navItem').forEach(b=>b.classList.toggle('active', b.dataset.route===state.route)); }
function monthNow(){ return new Date().toISOString().slice(0,7); }

async function api(path, body={}, method='POST'){
  const headers = { 'Content-Type':'application/json' };
  if(state.session){ headers['X-Room-Code']=state.session.roomCode; headers['X-Room-Pin']=state.session.pin; }
  const res = await fetch(`/api/${path}`, { method, headers, body: method==='GET' ? undefined : JSON.stringify({ ...body, roomCode: state.session?.roomCode, pin: state.session?.pin }) });
  const data = await res.json().catch(()=>({ok:false,message:'Invalid response'}));
  if(!res.ok || !data.ok) throw new Error(data.message || '请求失败');
  return data;
}

async function loadAll(){
  if(!state.session) return;
  try{
    const [topics, rules, qs] = await Promise.all([
      api('topics',{action:'list'}), api('rules',{action:'list'}), api(`questions?monthKey=${encodeURIComponent(state.monthKey)}`,{},'GET')
    ]);
    state.topics = topics.topics || [];
    state.rules = rules.rules || [];
    state.questions = {questions:qs.questions||[], answers:qs.answers||[], comments:qs.comments||[]};
    if(!state.activeTopicId && state.topics[0]) state.activeTopicId=state.topics[0].id;
    if(state.activeTopicId) localStorage.setItem('activeTopicId', state.activeTopicId);
  }catch(e){ toast(e.message); }
}

function choiceHTML(name, options, value, multi=false){
  const vals = Array.isArray(value) ? value : (value ? [value] : []);
  return `<div class="chips" data-choice="${name}" data-multi="${multi?'1':'0'}">${options.map(o=>`<button type="button" class="chip ${vals.includes(o)?'active':''}" data-val="${esc(o)}">${esc(o)}</button>`).join('')}</div>`;
}
function bindChoices(root=document){
  $$('[data-choice]', root).forEach(box=>{
    box.addEventListener('click', e=>{
      const btn=e.target.closest('.chip'); if(!btn) return;
      if(box.dataset.multi==='1') btn.classList.toggle('active');
      else { $$('.chip', box).forEach(b=>b.classList.remove('active')); btn.classList.add('active'); }
      const ev = new CustomEvent('choicechange', { bubbles:true, detail:{name:box.dataset.choice, value:getChoice(box)} });
      box.dispatchEvent(ev);
    });
  });
}
function getChoice(box){
  const vals = $$('.chip.active', box).map(b=>b.dataset.val);
  return box.dataset.multi==='1' ? vals : (vals[0] || '');
}
function collectChoices(root=document){
  const out={}; $$('[data-choice]', root).forEach(box=> out[box.dataset.choice]=getChoice(box)); return out;
}
function selectHTML(options, value=''){
  return options.map(([v,l])=>`<option value="${esc(v)}" ${v===value?'selected':''}>${esc(l)}</option>`).join('');
}

function setupScreen(){
  setTitle('基础信息设置');
  app.innerHTML = `
    <section class="card hero"><h2>建立一个双方共享的沟通空间</h2><p class="muted">创建房间后，双方使用同一个房间码和 PIN 进入。基础信息只用于区分 A/B 两个当次角色。</p></section>
    <section class="card">
      <div class="miniNav"><button class="active" data-tab="create">创建房间</button><button data-tab="join">加入房间</button></div>
      <div id="setupCreate">
        <div class="field"><label class="label">A 方姓名</label><input id="aName" placeholder="例如：Joya" /></div>
        <div class="field"><label class="label">B 方姓名</label><input id="bName" placeholder="例如：伴侣昵称" /></div>
        <div class="field"><label class="label">共享 PIN（至少 4 位，双方都需要知道）</label><input id="pinCreate" type="password" placeholder="例如：5200" /></div>
        <button class="btn full" id="createRoom">创建共享房间</button>
      </div>
      <div id="setupJoin" class="hidden">
        <div class="field"><label class="label">房间码</label><input id="roomCode" placeholder="例如：A7K9Q2" /></div>
        <div class="field"><label class="label">共享 PIN</label><input id="pinJoin" type="password" /></div>
        <div class="field"><label class="label">本机默认身份</label><select id="meRole"><option value="A">A 方</option><option value="B">B 方</option></select></div>
        <button class="btn full" id="joinRoom">加入共享房间</button>
      </div>
    </section>
    <section class="card"><h3>数据共享说明</h3><p class="muted">同一房间内的话题卡、评分、问题栏、回答、评论和共同规则会同步。PIN 是轻量访问控制，不适合作为高敏感数据保险箱。</p></section>`;
  $$('.miniNav button').forEach(btn=>btn.onclick=()=>{ $$('.miniNav button').forEach(b=>b.classList.remove('active')); btn.classList.add('active'); $('#setupCreate').classList.toggle('hidden',btn.dataset.tab!=='create'); $('#setupJoin').classList.toggle('hidden',btn.dataset.tab!=='join'); });
  $('#createRoom').onclick = async()=>{
    try{
      const partnerAName=$('#aName').value.trim()||'A'; const partnerBName=$('#bName').value.trim()||'B'; const pin=$('#pinCreate').value.trim();
      const data=await api('room',{action:'create',partnerAName,partnerBName,pin});
      state.session={...data.room,pin,meRole:'A'}; saveSession(); toast(`房间已创建：${data.room.roomCode}`); await loadAll(); nav('home');
    }catch(e){ toast(e.message); }
  };
  $('#joinRoom').onclick = async()=>{
    try{
      const roomCode=$('#roomCode').value.trim().toUpperCase(); const pin=$('#pinJoin').value.trim(); const meRole=$('#meRole').value;
      const data=await api('room',{action:'join',roomCode,pin}); state.session={...data.room,pin,meRole}; saveSession(); await loadAll(); nav('home');
    }catch(e){ toast(e.message); }
  };
}

function render(){ if(!state.session) return setupScreen(); ({home:homeScreen,start:startScreen,assist:assistScreen,review:reviewScreen,records:recordsScreen}[state.route]||homeScreen)(); }

function homeScreen(){
  setTitle('伴侣沟通工具箱');
  const t=activeTopic();
  app.innerHTML = `
    <section class="card hero"><div class="between"><div><h2>${esc(state.session.partnerAName)} × ${esc(state.session.partnerBName)}</h2><p class="muted">房间码：${esc(state.session.roomCode)} ｜ 本机身份：${partnerName(state.session.meRole)}</p></div><button class="btn secondary sm" id="editNames">设置</button></div></section>
    <section class="grid wide2">
      <button class="card btn secondary" data-go="start"><h3>开始一个话题</h3><p class="muted">沟通前准备：话题、状态、A/B 角色和建议路径。</p></button>
      <button class="card btn secondary" data-go="assist"><h3>沟通中辅助</h3><p class="muted">谈话卡住时，快速获得下一句话、暂停和主线保护。</p></button>
      <button class="card btn secondary" data-go="review"><h3>结束后复盘</h3><p class="muted">完整评分、卡点诊断、下次规则和复盘卡。</p></button>
      <button class="card btn secondary" id="openToolbox"><h3>关系工具箱</h3><p class="muted">表达、承接、特殊情境、危险表达替换与周复盘。</p></button>
    </section>
    <section class="card"><div class="between"><h3>当前话题卡</h3><button class="btn ghost sm" id="newTopicQuick">新建</button></div>${t?topicPreview(t):'<div class="empty">还没有话题卡，可以从“开始一个话题”创建。</div>'}</section>
    <section class="card"><div class="between"><h3>本月问题栏</h3><button class="btn secondary sm" id="openBoard">查看</button></div><p class="muted">双方每月各提出一个问题，对方回答后可以继续评论和回复。</p>${questionSummary()}</section>
    <section class="card"><h3>共同规则库</h3>${state.rules.length?state.rules.slice(0,3).map(r=>`<p class="pill">${esc(r.rule_text)}</p>`).join(''):'<p class="muted">复盘后可把有效规则加入共同规则库。</p>'}</section>`;
  $$('[data-go]').forEach(b=>b.onclick=()=>nav(b.dataset.go));
  $('#newTopicQuick').onclick=()=>nav('start'); $('#openBoard').onclick=()=>showQuestionBoard(); $('#openToolbox').onclick=()=>showToolbox();
  $('#editNames').onclick=()=>showSettings();
}
function topicPreview(t){ const p=payload(t); const total=computeScore(t.scores||{}).total; return `<div class="topicItem"><div class="between"><strong>${esc(t.title)}</strong><span class="tag">${esc(topicTypeLabel(t.topic_type))}</span></div><p class="muted">A 方：${partnerName(t.a_role)} ｜ B 方：${partnerName(t.b_role)} ｜ 状态：${esc(t.status)}</p>${p.recommendation?`<div class="status ${p.recommendation.level}">${esc(p.recommendation.title)}：${esc(p.recommendation.text)}</div>`:''}<div class="row" style="margin-top:10px"><button class="btn sm" onclick="state.activeTopicId='${t.id}';localStorage.setItem('activeTopicId','${t.id}');nav('review')">复盘</button><button class="btn secondary sm" onclick="state.activeTopicId='${t.id}';localStorage.setItem('activeTopicId','${t.id}');nav('assist')">进行中辅助</button>${total?`<span class="pill">评分 ${total}</span>`:''}</div></div>`; }
function topicTypeLabel(v){ return (TOPIC_TYPES.find(x=>x[0]===v)||['',v])[1]; }
function questionSummary(){ const count=state.questions.questions.length; return `<p class="pill">${state.monthKey}</p><p class="pill">已提出 ${count}/2 个问题</p>`; }

function startScreen(){
  setTitle('开始一个话题');
  const t=activeTopic(); const p=payload(t)||{};
  app.innerHTML = `
  <section class="card"><h2>沟通前准备</h2><p class="muted">目标是判断现在怎么聊，而不是证明谁对谁错。每次只聚焦一个主话题。</p></section>
  <section class="card" id="startForm">
    <div class="field"><label class="label">话题类型</label><select id="topicType">${selectHTML(TOPIC_TYPES,p.topicType||'emotion')}</select></div>
    <div class="field"><label class="label">一句话主话题</label><textarea id="topicTitle" placeholder="例如：希望身体不舒服时，先收到心疼，再讨论作息调整。">${esc(t?.title||'')}</textarea></div>
    <div class="field"><label class="label">本次 A 方（表达方）</label><select id="aRole"><option value="A" ${t?.a_role!=='B'?'selected':''}>A：${esc(state.session.partnerAName)}</option><option value="B" ${t?.a_role==='B'?'selected':''}>B：${esc(state.session.partnerBName)}</option></select></div>
    <div class="grid grid2"><div class="field"><label class="label">精力状态</label>${choiceHTML('energy',['精力充足','有点累','很疲惫','几乎无法认真思考'],p.energy)}</div><div class="field"><label class="label">情绪状态</label>${choiceHTML('emotion',['平稳','有点委屈','明显难受','情绪很满','快要失控'],p.emotion)}</div></div>
    <div class="field"><label class="label">时间状态</label>${choiceHTML('time',['有充足时间','只有十分钟','工作/学习间隙','已经很晚','不适合长聊'],p.time)}</div>
    <div class="field"><label class="label">特殊状态</label>${choiceHTML('special',['PMS/经前情绪','身体不舒服','工作压力大','睡眠不足','旧问题被触发','没有特殊状态'],p.special||[],true)}</div>
    <div class="field"><label class="label">当前更需要</label>${choiceHTML('primaryNeed',['安抚','理解','解释','方案','道歉','陪伴','边界','暂缓'],p.primaryNeed)}</div>
    <div id="recommendationBox"></div>
    <button class="btn full" id="saveTopic">保存话题卡</button>
  </section>
  <section class="card"><h2>A 方表达面板</h2><p class="muted">表达方的任务：说清触发点、感受、需求和希望对方先做什么。</p><div class="field"><label class="label">触发点</label>${choiceHTML('aTriggers',TRIGGERS,p.aTriggers||[],true)}</div><div class="field"><label class="label">感受</label>${choiceHTML('aFeelings',FEELINGS,p.aFeelings||[],true)}</div><div class="field"><label class="label">核心需求</label>${choiceHTML('aNeeds',NEEDS,p.aNeeds||[],true)}</div><div class="field"><label class="label">希望 B 方先做什么</label>${choiceHTML('aHopes',HOPES,p.aHopes||[],true)}</div><button class="btn secondary full" id="genA">生成 A 方表达话术</button><div id="aScript" class="copyBox" style="margin-top:10px">${esc(p.aScript||'')}</div></section>
  <section class="card"><h2>B 方承接面板</h2><p class="muted">承接方的任务：先接住影响，再解释本意或提出方案。</p><div class="field"><label class="label">容易踩的回应坑</label>${choiceHTML('bPitfalls',B_PITFALLS,p.bPitfalls||[],true)}</div><div class="field"><label class="label">愿意承认的影响</label>${choiceHTML('bImpacts',B_IMPACTS,p.bImpacts||[],true)}</div><div class="field"><label class="label">修复动作</label>${choiceHTML('bRepairs',REPAIRS,p.bRepairs||[],true)}</div><button class="btn secondary full" id="genB">生成 B 方承接话术</button><div id="bScript" class="copyBox" style="margin-top:10px">${esc(p.bScript||'')}</div></section>`;
  bindChoices();
  const updateRec=()=>{ const c=collectStartData(); const r=recommend(c); $('#recommendationBox').innerHTML=`<div class="status ${r.level}"><strong>${r.title}</strong><br>${r.text}</div>`; };
  $('#startForm').addEventListener('choicechange',updateRec); ['topicType','topicTitle','aRole'].forEach(id=>$('#'+id).addEventListener('input',updateRec)); updateRec();
  $('#genA').onclick=()=>{ const c=collectStartData(); $('#aScript').textContent=makeAScript(c); };
  $('#genB').onclick=()=>{ const c=collectStartData(); $('#bScript').textContent=makeBScript(c); };
  $('#saveTopic').onclick=saveStartTopic;
}
function collectStartData(){ return { ...collectChoices(), topicType:$('#topicType')?.value, title:$('#topicTitle')?.value.trim(), aRole:$('#aRole')?.value, aScript:$('#aScript')?.textContent.trim(), bScript:$('#bScript')?.textContent.trim() }; }
function recommend(c){
  const special=c.special||[]; let score=0; if(['很疲惫','几乎无法认真思考'].includes(c.energy)) score+=2; if(['情绪很满','快要失控'].includes(c.emotion)) score+=2; if(['已经很晚','不适合长聊'].includes(c.time)) score+=1; if(special.includes('旧问题被触发')) score+=1; if(special.includes('PMS/经前情绪')||special.includes('身体不舒服')) score+=1;
  if(c.primaryNeed==='安抚' || c.primaryNeed==='陪伴') score+=1;
  if(score>=5) return {level:'red',title:'建议暂停并预约返回',text:'当前不适合深入讨论。优先确认关系安全、表达在乎，并约定一个更适合的时间继续。'};
  if(score>=3) return {level:'amber',title:'适合先安抚，不适合争论',text:'当前更需要情绪承接。先表达理解、心疼、在乎和陪伴，暂缓分析原因或给方案。'};
  if(score>=1) return {level:'amber',title:'适合轻量沟通',text:'可以聊，但不适合展开太多细节。先确认感受和主要需求，复杂部分后续继续。'};
  return {level:'green',title:'适合认真沟通',text:'双方状态基本可承接。建议 A 方先表达事实、感受和需求，B 方先复述和承接，再进入解释或方案。'};
}
function makeAScript(c){ const need=(c.aNeeds||[]).slice(0,2).join('、')||c.primaryNeed||'被理解'; const feel=(c.aFeelings||[]).slice(0,2).join('、')||'难受'; const trig=(c.aTriggers||[]).slice(0,2).join('、')||'刚才这件事'; const hope=(c.aHopes||[]).slice(0,2).join('、')||'先听我说完'; return `我想认真说一下这件事。让我比较难受的点是：${trig}。这让我感觉${feel}。我真正需要的不是争输赢，而是${need}。如果可以的话，我希望先收到：${hope}。等这个部分被接住之后，我们再一起看怎么处理。`; }
function makeBScript(c){ const impact=(c.bImpacts||[]).slice(0,2).join('、')||'我的回应让你难受了'; const repair=(c.bRepairs||[]).slice(0,2).join('、')||'先认真听你说'; return `我听到这件事对你有影响，也能理解你会难受。即使我的本意不是这样，但我愿意承认：${impact}。我会先${repair}。等你感觉被接住之后，我再补充我的本意或背景。`; }
async function saveStartTopic(){ try{ const c=collectStartData(); c.recommendation=recommend(c); const title=c.title||'未命名沟通话题'; const body={ title, topicType:c.topicType, aRole:c.aRole, status:'preparing', payload:c }; let data; if(activeTopic()){ body.id=activeTopic().id; body.action='update'; data=await api('topics',body); } else { body.action='create'; data=await api('topics',body); } state.activeTopicId=data.topic.id; localStorage.setItem('activeTopicId',data.topic.id); await loadAll(); toast('话题卡已保存'); }catch(e){ toast(e.message); } }

function assistScreen(){ setTitle('沟通中辅助'); const t=activeTopic(); const buttons=[['感觉被误解了','我想先澄清一下，我不是想逃避这个话题，而是担心刚才那句话被理解偏了。我可以先用一句话说明本意，然后我们继续回到主话题。'],['需要先被心疼','现在更需要先被理解和心疼，而不是马上分析怎么解决。等情绪被接住之后，再一起讨论办法会更容易。'],['想解释但怕被认为狡辩','可以先承认影响，再解释本意。顺序建议是：先说“我知道这让你难受”，再说“我的本意是……”，最后说“以后我会……”。'],['主话题被打断了','这个新问题也重要，可以先放进停车场。当前先回到原来的主话题，避免两个问题混在一起越聊越乱。'],['现在太累了','当前精力不足时，不适合处理复杂话题。可以先确认关系安全，再预约具体时间继续。'],['情绪开始升级','建议暂停 20 分钟。暂停不是逃避，而是为了避免说出伤害关系的话。暂停前需要约定返回时间。'],['需要暂停','现在继续说下去可能会让双方更受伤。先暂停一下，并约定具体返回时间继续。'],['回到沟通','刚才暂停是为了冷静，不是为了回避。现在可以继续处理刚才的主话题。']];
  app.innerHTML=`<section class="card hero"><h2>即时辅助</h2><p class="muted">进行中不做长表格，只提供下一步动作、可复制话术和主话题保护。</p></section><section class="card"><h3>当前话题</h3>${t?topicPreview(t):'<p class="muted">尚未选择话题，也可以直接使用快捷话术。</p>'}</section><section class="grid">${buttons.map(([label,text])=>`<button class="card btn secondary assistBtn" data-text="${esc(text)}"><h3>${esc(label)}</h3><p class="muted">点击生成可复制话术</p></button>`).join('')}</section><section class="card"><h3>主话题停车场</h3><p class="muted">把新冒出来的问题先放在这里，避免打断当前主线。</p><textarea id="parking" placeholder="例如：关于作息调整，另约时间讨论。">${esc(payload(t).parking||'')}</textarea><button class="btn full" id="saveParking">保存到话题卡</button></section>`;
  $$('.assistBtn').forEach(b=>b.onclick=()=>copyModal(b.querySelector('h3').textContent,b.dataset.text));
  $('#saveParking').onclick=async()=>{ if(!t) return toast('请先创建话题卡'); const p=payload(t); p.parking=$('#parking').value.trim(); try{ await api('topics',{action:'update',id:t.id,payload:p}); await loadAll(); toast('停车场已保存'); }catch(e){toast(e.message)} };
}
function copyModal(title,text){ app.insertAdjacentHTML('beforeend',`<div class="modalBackdrop" id="copyModal"><div class="modal"><div class="between"><h2>${esc(title)}</h2><button class="btn secondary sm" onclick="$('#copyModal').remove()">关闭</button></div><div class="copyBox" id="copyText">${esc(text)}</div><button class="btn full" style="margin-top:12px" id="copyNow">复制话术</button></div></div>`); $('#copyNow').onclick=async()=>{ try{ await navigator.clipboard.writeText(text); toast('已复制'); }catch(e){ toast('可长按文本复制'); } }; }

function reviewScreen(){ setTitle('结束后复盘'); const t=activeTopic(); if(!t){ app.innerHTML='<section class="card"><div class="empty">请先创建或选择一个话题卡。</div><button class="btn full" onclick="nav(\'start\')">开始一个话题</button></section>'; return; } const scores=t.scores||{}; const cs=computeScore(scores); app.innerHTML=`<section class="card hero"><h2>完整评分体系</h2><p class="muted">评分不是互相扣分，而是诊断本次沟通过程卡在哪里。</p><div class="row"><span class="pill">总分 ${cs.total||0}</span><span class="pill">${scoreLabel(cs.total)}</span></div></section><section class="card"><h3>${esc(t.title)}</h3><p class="muted">A 方：${partnerName(t.a_role)} ｜ B 方：${partnerName(t.b_role)}</p><div class="progress"><span style="width:${cs.total||0}%"></span></div></section><section class="card" id="scoreForm">${SCORE_GROUPS.map(g=>scoreGroupHTML(g,scores)).join('')}</section><section class="card"><h3>复盘结果</h3><div class="field"><label class="label">本次卡住的位置</label>${choiceHTML('stuck',['话题一开始没有说清','情绪没有先被承接','解释太早','语气太重','主话题被打断','旧问题混入','疲惫影响回应质量','态度需求被当成方案需求','没有形成具体行动'],payload(t).stuck||[],true)}</div><div class="field"><label class="label">本次有效做法</label>${choiceHTML('worked',['主动放慢语气','复述了对方感受','承认了影响','提出暂停','把话题拉回主线','表达了心疼','愿意继续修复','提出具体行动'],payload(t).worked||[],true)}</div><div class="field"><label class="label">下次规则</label><textarea id="ruleText">${esc(t.rule_text||autoRule(t))}</textarea></div><button class="btn full" id="saveReview">保存复盘与评分</button><button class="btn secondary full" style="margin-top:8px" id="addRule">加入共同规则库</button></section><section class="card"><h3>自动诊断</h3><div id="diagnosis">${diagnosisHTML(cs)}</div></section>`; bindChoices(); bindScoreButtons(); $('#saveReview').onclick=saveReview; $('#addRule').onclick=addRuleFromReview; }
function scoreGroupHTML(g,scores){ const avg=groupScore(g,scores); return `<details open><summary class="between"><strong>${g.title}</strong><span class="pill">权重 ${g.weight}% ｜ ${avg}/4</span></summary><p class="muted">${g.desc}</p>${g.items.map(([id,label])=>`<div class="scoreLine"><div class="scoreTitle"><div><strong>${label}</strong><p class="muted small">0=未做到，1=较弱，2=一般，3=较好，4=很好</p></div><span class="scoreNum" id="num_${id}">${scores[id]??2}</span></div><div class="seg" data-score="${id}">${[0,1,2,3,4].map(n=>`<button type="button" class="${(scores[id]??2)==n?'active':''}" data-v="${n}">${n}</button>`).join('')}</div></div>`).join('')}</details>`; }
function bindScoreButtons(){ $$('[data-score]').forEach(box=>box.onclick=e=>{ const b=e.target.closest('button'); if(!b)return; $$('button',box).forEach(x=>x.classList.remove('active')); b.classList.add('active'); $('#num_'+box.dataset.score).textContent=b.dataset.v; }); }
function collectScores(){ const out={}; $$('[data-score]').forEach(box=>{ const b=$('button.active',box); out[box.dataset.score]=Number(b?.dataset.v||0); }); return out; }
function groupScore(g,scores){ const vals=g.items.map(([id])=>Number(scores[id]??2)); return (vals.reduce((a,b)=>a+b,0)/vals.length).toFixed(1); }
function computeScore(scores){ if(!scores||!Object.keys(scores).length) return {total:0, groups:{}}; let total=0, groups={}; SCORE_GROUPS.forEach(g=>{ const avg=Number(groupScore(g,scores)); groups[g.id]=avg; total += (avg/4)*g.weight; }); return { total: Math.round(total), groups }; }
function scoreLabel(v){ if(v>=85)return '沟通质量稳定'; if(v>=70)return '整体可用，有少量卡点'; if(v>=55)return '需要修复关键流程'; if(v>0)return '建议先降低强度再沟通'; return '尚未评分'; }
function diagnosisHTML(cs){ if(!cs.total) return '<p class="muted">完成评分后会自动生成卡点诊断。</p>'; const lows=Object.entries(cs.groups).sort((a,b)=>a[1]-b[1]).slice(0,2).map(([id])=>SCORE_GROUPS.find(g=>g.id===id).title); return `<div class="status ${cs.total>=70?'green':cs.total>=55?'amber':'red'}"><strong>${scoreLabel(cs.total)}</strong><br>优先改进：${lows.join('、')}。建议下次只选择一个最小行动进行调整。</div>`; }
function autoRule(t){ const p=payload(t); if((p.special||[]).includes('PMS/经前情绪')||t.topic_type==='body') return '当一方身体不舒服或情绪低落时，另一方先表达心疼和理解，再讨论生活习惯或解决方案。'; if((p.stuck||[]).includes('主话题被打断')) return '当对话开始跑题时，把新问题放入停车场，先完成当前主话题。'; if((p.stuck||[]).includes('解释太早')) return '当一方表达难受时，先复述和承认影响，再询问是否适合解释。'; return '下次遇到类似情况时，先确认感受和需求，再进入解释或方案。'; }
async function saveReview(){ const t=activeTopic(); if(!t)return; const p={...payload(t),...collectChoices()}; const ruleText=$('#ruleText').value.trim(); try{ await api('topics',{action:'update',id:t.id,status:'reviewed',payload:p,scores:collectScores(),ruleText}); await loadAll(); toast('复盘已保存'); render(); }catch(e){toast(e.message)} }
async function addRuleFromReview(){ const t=activeTopic(); const ruleText=$('#ruleText').value.trim(); if(!ruleText)return toast('请先填写下次规则'); try{ await api('rules',{action:'create',ruleText,topicId:t.id}); await loadAll(); toast('已加入共同规则库'); }catch(e){toast(e.message)} }

function recordsScreen(){ setTitle('记录'); const scored=state.topics.map(t=>computeScore(t.scores||{}).total).filter(Boolean); const avg=scored.length?Math.round(scored.reduce((a,b)=>a+b,0)/scored.length):0; app.innerHTML=`<section class="card hero"><h2>历史记录与长期模式</h2><p class="muted">查看话题卡、评分趋势、共同规则和本月问题栏。</p></section><section class="grid grid2"><div class="metric"><strong>${state.topics.length}</strong><p class="muted">话题卡</p></div><div class="metric"><strong>${avg||'-'}</strong><p class="muted">平均评分</p></div><div class="metric"><strong>${state.rules.length}</strong><p class="muted">共同规则</p></div><div class="metric"><strong>${state.questions.questions.length}/2</strong><p class="muted">本月问题</p></div></section><section class="card"><div class="between"><h3>本月问题栏</h3><button class="btn sm" id="boardBtn">打开</button></div><p class="muted">每月每人一个问题，另一方回答，双方可继续评论和回复。</p></section><section class="card"><div class="between"><h3>话题卡</h3><button class="btn secondary sm" id="exportCsv">导出 CSV</button></div>${state.topics.length?state.topics.map(t=>`<div class="topicItem"><div class="between"><strong>${esc(t.title)}</strong><span class="tag">${computeScore(t.scores||{}).total||'-'} 分</span></div><p class="muted">${topicTypeLabel(t.topic_type)} ｜ ${new Date(t.updated_at).toLocaleString()}</p><button class="btn secondary sm" onclick="state.activeTopicId='${t.id}';localStorage.setItem('activeTopicId','${t.id}');nav('review')">查看/复盘</button></div>`).join(''):'<div class="empty">暂无记录</div>'}</section><section class="card"><h3>共同规则库</h3>${state.rules.length?state.rules.map(r=>`<div class="topicItem"><p>${esc(r.rule_text)}</p><p class="muted small">${new Date(r.created_at).toLocaleDateString()}</p></div>`).join(''):'<p class="muted">暂无共同规则。</p>'}</section><section class="card"><h3>数据备份</h3><div class="grid grid2"><button class="btn secondary" id="exportJson">导出 JSON</button><button class="btn danger" id="logout">退出本机</button></div></section>`; $('#boardBtn').onclick=()=>showQuestionBoard(); $('#exportCsv').onclick=exportCSV; $('#exportJson').onclick=exportJSON; $('#logout').onclick=()=>{localStorage.removeItem(LS);location.reload()}; }

function showQuestionBoard(){ const me=state.session.meRole; const month=state.monthKey; const qs=state.questions.questions; const html=`<div class="modalBackdrop" id="board"><div class="modal"><div class="between"><div><h2>本月问题栏</h2><p class="muted">${month} ｜ 每人每月可提出一个问题</p></div><button class="btn secondary sm" onclick="$('#board').remove()">关闭</button></div><section class="card"><h3>${partnerName(me)} 提出本月问题</h3><textarea id="newQuestion" placeholder="这个月最想请对方回答的一个问题是什么？"></textarea><button class="btn full" id="submitQuestion">提交/保存问题</button></section>${qs.map(q=>questionCard(q)).join('')||'<div class="empty">本月还没有问题。</div>'}</div></div>`; app.insertAdjacentHTML('beforeend',html); $('#submitQuestion').onclick=async()=>{ const text=$('#newQuestion').value.trim(); if(!text)return toast('请先填写问题'); try{ await api('questions',{action:'createQuestion',monthKey:month,proposerRole:me,questionText:text}); await loadAll(); $('#board').remove(); showQuestionBoard(); toast('问题已提交'); }catch(e){ toast(e.message.includes('duplicate')?'本月已经提出过一个问题':e.message); } }; $$('#board [data-answer]').forEach(btn=>btn.onclick=async()=>{ const qid=btn.dataset.answer; const txt=$(`#answer_${qid}`).value.trim(); if(!txt)return toast('请填写回答'); try{ await api('questions',{action:'answerQuestion',questionId:qid,responderRole:me,answerText:txt}); await loadAll(); $('#board').remove(); showQuestionBoard(); toast('回答已保存'); }catch(e){toast(e.message)} }); $$('#board [data-comment]').forEach(btn=>btn.onclick=async()=>{ const qid=btn.dataset.comment; const parent=btn.dataset.parent||''; const txt=$(`#comment_${qid}_${parent||'root'}`).value.trim(); if(!txt)return toast('请填写评论'); try{ await api('questions',{action:'addComment',questionId:qid,parentId:parent,authorRole:me,commentText:txt}); await loadAll(); $('#board').remove(); showQuestionBoard(); toast('评论已保存'); }catch(e){toast(e.message)} }); }
function questionCard(q){ const answers=state.questions.answers.filter(a=>a.question_id===q.id); const comments=state.questions.comments.filter(c=>c.question_id===q.id); const responder=other(q.proposer_role); const existing=answers.find(a=>a.responder_role===responder); return `<section class="card"><span class="tag">${partnerName(q.proposer_role)} 的问题</span><h3>${esc(q.question_text)}</h3><p class="muted small">${new Date(q.created_at).toLocaleString()}</p><div class="field"><label class="label">${partnerName(responder)} 的回答</label><textarea id="answer_${q.id}" placeholder="回答这个问题">${esc(existing?.answer_text||'')}</textarea><button class="btn secondary full" data-answer="${q.id}">保存回答</button></div><h3>评论与回复</h3>${comments.map(c=>`<div class="comment ${c.parent_id?'reply':''}"><strong>${partnerName(c.author_role)}</strong><p>${esc(c.comment_text)}</p><textarea id="comment_${q.id}_${c.id}" placeholder="回复这条评论"></textarea><button class="btn secondary sm" data-comment="${q.id}" data-parent="${c.id}">回复</button></div>`).join('')||'<p class="muted">暂无评论。</p>'}<textarea id="comment_${q.id}_root" placeholder="添加评论"></textarea><button class="btn sm" data-comment="${q.id}">添加评论</button></section>`; }

function showToolbox(){ const html=`<div class="modalBackdrop" id="toolbox"><div class="modal"><div class="between"><h2>关系工具箱</h2><button class="btn secondary sm" onclick="$('#toolbox').remove()">关闭</button></div>${['沟通前：确认状态、主话题、A/B 角色和需求类型。','A 方：事实—感受—需求—请求，避免一次性翻出所有旧账。','B 方：复述理解—表达心疼—承认影响—询问是否适合解释。','进行中：使用暂停、停车场、危险表达替换和主线保护。','特殊情境：疲惫、身体不适/PMS、旧伤触发时优先降低沟通强度。','复盘：不追责，沉淀一个下次规则。'].map(x=>`<section class="card"><p>${esc(x)}</p></section>`).join('')}</div></div>`; app.insertAdjacentHTML('beforeend',html); }
function showSettings(){ const s=state.session; const html=`<div class="modalBackdrop" id="settings"><div class="modal"><div class="between"><h2>基础信息设置</h2><button class="btn secondary sm" onclick="$('#settings').remove()">关闭</button></div><div class="field"><label class="label">A 方姓名</label><input id="setA" value="${esc(s.partnerAName)}"></div><div class="field"><label class="label">B 方姓名</label><input id="setB" value="${esc(s.partnerBName)}"></div><div class="field"><label class="label">本机默认身份</label><select id="setMe"><option value="A" ${s.meRole==='A'?'selected':''}>A 方</option><option value="B" ${s.meRole==='B'?'selected':''}>B 方</option></select></div><button class="btn full" id="saveSettings">保存设置</button></div></div>`; app.insertAdjacentHTML('beforeend',html); $('#saveSettings').onclick=async()=>{ try{ const partnerAName=$('#setA').value.trim()||'A'; const partnerBName=$('#setB').value.trim()||'B'; const data=await api('room',{action:'updateNames',partnerAName,partnerBName}); state.session={...state.session,...data.room,meRole:$('#setMe').value}; saveSession(); $('#settings').remove(); toast('设置已保存'); render(); }catch(e){toast(e.message)} }; }

function exportCSV(){ const rows=[['title','type','status','a_role','b_role','score','rule','updated_at'],...state.topics.map(t=>[t.title,topicTypeLabel(t.topic_type),t.status,partnerName(t.a_role),partnerName(t.b_role),computeScore(t.scores||{}).total,t.rule_text||'',t.updated_at])]; download('communication_topics.csv', rows.map(r=>r.map(v=>`"${String(v??'').replace(/"/g,'""')}"`).join(',')).join('\n'), 'text/csv;charset=utf-8'); }
function exportJSON(){ download('couple_toolbox_backup.json', JSON.stringify({session:{...state.session,pin:'***'},topics:state.topics,rules:state.rules,questions:state.questions},null,2), 'application/json'); }
function download(name,text,type){ const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([text],{type})); a.download=name; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),500); }

$$('.navItem').forEach(b=>b.onclick=()=>nav(b.dataset.route)); $('#syncBtn').onclick=async()=>{ await loadAll(); render(); toast('已同步'); };
if('serviceWorker' in navigator){ navigator.serviceWorker.register('/sw.js').catch(()=>{}); }
(async()=>{ await loadAll(); render(); })();

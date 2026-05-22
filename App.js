 // ═══════════════════════════════════
//   FLOW APP — app.js
// ═══════════════════════════════════

import{initializeApp}from"https://www.gstatic.com/firebasejs/12.12.1/firebase-app.js";
import{getAuth,createUserWithEmailAndPassword,signInWithEmailAndPassword,sendPasswordResetEmail,signOut,onAuthStateChanged,updateProfile,updatePassword}from"https://www.gstatic.com/firebasejs/12.12.1/firebase-auth.js";
import{getFirestore,collection,addDoc,doc,setDoc,getDoc,getDocs,onSnapshot,query,orderBy,limit,where,serverTimestamp,updateDoc,arrayUnion,arrayRemove,deleteDoc,increment}from"https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js";
import{getStorage,ref as sref,uploadBytes,getDownloadURL}from"https://www.gstatic.com/firebasejs/12.12.1/firebase-storage.js";

// ── FIREBASE ──
const app = initializeApp({
  apiKey:"AIzaSyB8ry72u7k41XXQaER_T5irtZJ8YnfCwag",
  authDomain:"oktob-dbf07.firebaseapp.com",
  projectId:"oktob-dbf07",
  storageBucket:"oktob-dbf07.firebasestorage.app",
  messagingSenderId:"435898775970",
  appId:"1:435898775970:web:2c0ddf38cfe471bcaddafb"
});
const auth = getAuth(app), db = getFirestore(app), storage = getStorage(app);

// ── STATE ──
let ME = null, activeSrv = null, activeCh = null;
let unsubMsgs = null, unsubSrvs = null;
let allFriends = [], pendingReqs = [], viewedUID = null;
let chatFile = null, chatFileType = null;
let dmFile = null, dmFileType = null;
let compImgFile = null;
let mediaRec = null, recChunks = [], recTimer = null, recSeconds = 0;
let localStream = null, peerConns = {}, vcChannel = null;
let vcMuted = false, vcDeafened = false;
let vcRoomUnsub = null, vcSigUnsub = null;
let currentDMFriend = null, currentLang = 'en';
let selectedGender = null, selectedType = null;
let setupAvaFile = null, setupCoverFile = null;
let pendingRanks = [
  {name:'Member',color:'#1a1a2e'},
  {name:'Moderator',color:'#f5a623'},
  {name:'Admin',color:'#e94560'}
];
let srvImgFile = null;

// ── CONSTANTS ──
const ICE_SERVERS = {
  iceServers:[
    {urls:'stun:stun.l.google.com:19302'},
    {urls:'stun:stun1.l.google.com:19302'},
    {urls:'turn:openrelay.metered.ca:80',username:'openrelayproject',credential:'openrelayproject'},
    {urls:'turn:openrelay.metered.ca:443',username:'openrelayproject',credential:'openrelayproject'}
  ]
};
const EMOJIS = ['👍','❤️','😂','😮','😢','😡','🔥','🎉','💯','✅','👏','🙏','💪','🤔','😎','🥳','🫡','💀','🤣','⭐'];
const COLORS = ['#1a1a2e','#e94560','#ef4444','#f5a623','#22c55e','#06b6d4','#9333ea','#f97316'];

// ── HELPERS ──
const cof = s => { let h=0; for(const c of(s||'x')) h=(h*31+c.charCodeAt(0))%COLORS.length; return COLORS[h]; };
const iof = s => (s||'?')[0].toUpperCase();
const rid = () => Math.random().toString(36).slice(2,8).toUpperCase();
const esc = t => (t||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>');
const G = id => document.getElementById(id);

// ── UI HELPERS ──
function showScr(id){ document.querySelectorAll('.screen').forEach(s=>s.classList.add('hidden')); G(id).classList.remove('hidden'); }
window.openSheet = id => G(id).classList.remove('hidden');
window.closeSheet = id => G(id).classList.add('hidden');
document.querySelectorAll('.overlay').forEach(el => el.addEventListener('click', e => { if(e.target===el) el.classList.add('hidden'); }));

function toast(m){
  document.querySelectorAll('.toast').forEach(t=>t.remove());
  const el = document.createElement('div');
  el.className = 'toast'; el.textContent = m;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2600);
}

async function upload(file, path){
  const r = sref(storage, path);
  await uploadBytes(r, file);
  return getDownloadURL(r);
}

// ── TRANSLATIONS ──
const L = {
  en:{
    login:'Login',signup:'Sign Up',home:'Home',messages:'Messages',profile:'Profile',
    whats:"What's on your mind?",posts:'Posts',followers:'Followers',following:'Following',
    direct:'Direct',servers:'Servers',friends:'Friends',
    createSrv:'Create Server',joinSrv:'Join Server',
    edit:'Edit Profile',save:'Save',cancel:'Cancel',back:'Back',
    connecting:'Connecting...',connected:'Connected',
    male:'Male',female:'Female',other:'Other',personal:'Personal',pro:'Professional',
    setupTitle:'Set up your profile',getStarted:'Get Started',
    forgotPass:'Forgot password?',or:'or',phoneTxt:'Continue with Phone',
    createAcc:'Create Account',addCover:'Add Cover',
    nameReq:'Name is required',genderReq:'Please select gender',
    typeReq:'Please select account type',wrongCred:'Wrong credentials',
    emailUsed:'Email already used',passShort:'Password must be 6+ characters',
    noFriends:'No friends yet',noMessages:'No messages',noPosts:'No posts yet',
    noServers:'No servers',follow:'Follow',message:'Message',addFriend:'Add Friend',
    publish:'Publish',newPost:'New Post',photo:'Photo',
    searchPlaceholder:'Search users...',invitePeople:'Invite People',
    members:'Members',copy:'Copy',close:'Close',srvSettings:'Server Settings',
    deleteSrv:'Delete Server',leaveSrv:'Leave Server',newChannel:'New Channel',
    sendLink:'Send Link',resetPass:'Reset Password',
    personalDesc:'Connect with friends, join servers, follow creators',
    proDesc:'Create servers, grow followers, open channels & groups'
  },
  ar:{
    login:'دخول',signup:'حساب جديد',home:'الرئيسية',messages:'الرسائل',profile:'ملفي',
    whats:'ما الذي يدور في ذهنك؟',posts:'منشورات',followers:'متابعون',following:'يتابع',
    direct:'الخاص',servers:'السيرفرات',friends:'الأصدقاء',
    createSrv:'إنشاء سيرفر',joinSrv:'الانضمام',
    edit:'تعديل الملف',save:'حفظ',cancel:'إلغاء',back:'رجوع',
    connecting:'جارٍ الاتصال...',connected:'متصل',
    male:'ذكر',female:'أنثى',other:'آخر',personal:'شخصي',pro:'احترافي',
    setupTitle:'إعداد ملفك الشخصي',getStarted:'ابدأ الآن',
    forgotPass:'نسيت كلمة المرور؟',or:'أو',phoneTxt:'متابعة برقم الهاتف',
    createAcc:'إنشاء حساب',addCover:'إضافة غلاف',
    nameReq:'الاسم مطلوب',genderReq:'اختر الجنس',
    typeReq:'اختر نوع الحساب',wrongCred:'بيانات خاطئة',
    emailUsed:'البريد مستخدم',passShort:'كلمة المرور 6 أحرف على الأقل',
    noFriends:'لا يوجد أصدقاء بعد',noMessages:'لا توجد رسائل',noPosts:'لا توجد منشورات',
    noServers:'لا توجد سيرفرات',follow:'متابعة',message:'رسالة',addFriend:'إضافة صديق',
    publish:'نشر',newPost:'منشور جديد',photo:'صورة',
    searchPlaceholder:'ابحث عن مستخدمين...',invitePeople:'دعوة أشخاص',
    members:'الأعضاء',copy:'نسخ',close:'إغلاق',srvSettings:'إعدادات السيرفر',
    deleteSrv:'حذف السيرفر',leaveSrv:'مغادرة السيرفر',newChannel:'قناة جديدة',
    sendLink:'إرسال الرابط',resetPass:'استعادة كلمة المرور',
    personalDesc:'تواصل مع الأصدقاء، انضم للسيرفرات، تابع صناع المحتوى',
    proDesc:'أنشئ سيرفرات، اكسب متابعين، افتح قنوات ومجموعات'
  },
  fr:{
    login:'Connexion',signup:"S'inscrire",home:'Accueil',messages:'Messages',profile:'Profil',
    whats:'À quoi pensez-vous?',posts:'Posts',followers:'Abonnés',following:'Abonnements',
    direct:'Direct',servers:'Serveurs',friends:'Amis',
    createSrv:'Créer serveur',joinSrv:'Rejoindre',
    edit:'Modifier profil',save:'Enregistrer',cancel:'Annuler',back:'Retour',
    connecting:'Connexion...',connected:'Connecté',
    male:'Homme',female:'Femme',other:'Autre',personal:'Personnel',pro:'Professionnel',
    setupTitle:'Configurer votre profil',getStarted:'Commencer',
    forgotPass:'Mot de passe oublié?',or:'ou',phoneTxt:'Continuer avec téléphone',
    createAcc:'Créer un compte',addCover:'Ajouter couverture',
    nameReq:'Le nom est requis',genderReq:'Sélectionnez le genre',
    typeReq:'Sélectionnez le type',wrongCred:'Informations incorrectes',
    emailUsed:'Email déjà utilisé',passShort:'6+ caractères requis',
    noFriends:'Aucun ami',noMessages:'Aucun message',noPosts:'Aucun post',
    noServers:'Aucun serveur',follow:'Suivre',message:'Message',addFriend:'Ajouter ami',
    publish:'Publier',newPost:'Nouveau post',photo:'Photo',
    searchPlaceholder:'Rechercher des utilisateurs...',invitePeople:'Inviter',
    members:'Membres',copy:'Copier',close:'Fermer',srvSettings:'Paramètres',
    deleteSrv:'Supprimer serveur',leaveSrv:'Quitter serveur',newChannel:'Nouveau canal',
    sendLink:'Envoyer lien',resetPass:'Réinitialiser',
    personalDesc:'Connectez avec amis, rejoignez serveurs',
    proDesc:'Créez serveurs, gagnez abonnés'
  }
};
const T = k => L[currentLang]?.[k] || L.en[k] || k;

// ── LANGUAGE ──
window.setLang = lang => {
  currentLang = lang;
  const isAr = lang === 'ar';
  document.documentElement.lang = isAr ? 'ar' : lang === 'fr' ? 'fr' : 'en';
  document.documentElement.dir = isAr ? 'rtl' : 'ltr';
  document.body.style.fontFamily = isAr ? "'Cairo','Inter',sans-serif" : "'Inter',sans-serif";
  ['langEn','langAr','langFr'].forEach(id => G(id).classList.remove('on'));
  G(lang==='en'?'langEn':lang==='ar'?'langAr':'langFr').classList.add('on');
  applyLang();
};

function applyLang(){
  const pairs = {
    'tLogin':T('login'),'tReg':T('signup'),
    'navHomeTxt':T('home'),'navMsgsTxt':T('messages'),'navProfTxt':T('profile'),
    'composePh':T('whats'),
    'statPostsTxt':T('posts'),'statFollowersTxt':T('followers'),'statFollowingTxt':T('following'),
    'tabDMs':T('direct'),'tabSrvs':T('servers'),
    'setupDoneBtn':T('getStarted'),'setupTitle':T('setupTitle'),
    'addCoverTxt':T('addCover'),
    'gMale':T('male'),'gFemale':T('female'),'gOther':T('other'),
    'tPersonal':T('personal'),'tPro':T('pro'),
    'tPersonalDesc':T('personalDesc'),'tProDesc':T('proDesc'),
    'loginBtn':T('login'),'regBtn':T('createAcc'),
    'phoneBtnTxt':T('phoneTxt'),'orTxt':T('or'),
    'forgotLnk':T('forgotPass'),'editProfBtn':T('edit'),
    'friendsTxt':T('friends'),'joinSrvTxt':T('joinSrv'),
    'createSrvTxt':T('createSrv'),'globalSearchInp':null
  };
  for(const [id,txt] of Object.entries(pairs)){
    const el = G(id);
    if(el && txt !== null) el.textContent = txt;
  }
  if(G('globalSearchInp')) G('globalSearchInp').placeholder = T('searchPlaceholder');
}

// ── AUTH ──
window.swAuthTab = tab => {
  G('tLogin').classList.toggle('on', tab==='login');
  G('tReg').classList.toggle('on', tab==='reg');
  G('loginForm').style.display = tab==='login' ? '' : 'none';
  G('regForm').style.display = tab==='reg' ? '' : 'none';
};

G('loginBtn').onclick = async () => {
  const e = G('lEmail').value.trim(), p = G('lPass').value;
  if(!e||!p) return toast(T('login'));
  try{ await signInWithEmailAndPassword(auth,e,p); }
  catch(e){ toast(e.code==='auth/invalid-credential' ? T('wrongCred') : e.message); }
};

G('phoneBtn').onclick = () => toast('Phone auth coming soon');

G('regBtn').onclick = async () => {
  const e = G('rEmail').value.trim(), p = G('rPass').value;
  if(!e||!p) return toast(T('nameReq'));
  if(p.length<6) return toast(T('passShort'));
  try{
    await createUserWithEmailAndPassword(auth,e,p);
    showScr('setupScreen');
  }catch(e){ toast(e.code==='auth/email-already-in-use' ? T('emailUsed') : e.message); }
};

G('btnForgot').onclick = async () => {
  const e = G('fEmail').value.trim();
  if(!e) return;
  try{ await sendPasswordResetEmail(auth,e); toast('Link sent!'); closeSheet('forgotSheet'); }
  catch(e){ toast(e.message); }
};

// ── SETUP PROFILE ──
window.selGender = btn => {
  document.querySelectorAll('.gender-btn').forEach(b=>b.classList.remove('on'));
  btn.classList.add('on'); selectedGender = btn.dataset.val;
};

window.selType = card => {
  document.querySelectorAll('.type-card').forEach(c=>c.classList.remove('on'));
  card.classList.add('on'); selectedType = card.dataset.val;
};

G('setupCoverPick').onclick = () => G('setupCoverFI').click();
G('setupAvaPick').onclick = () => G('setupAvaFI').click();

G('setupCoverFI').addEventListener('change', e => {
  setupCoverFile = e.target.files[0];
  if(setupCoverFile){
    const url = URL.createObjectURL(setupCoverFile);
    const old = G('setupCoverPick').querySelector('img'); if(old) old.remove();
    const img = new Image(); img.src = url;
    img.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:cover';
    G('setupCoverPick').insertBefore(img, G('setupCoverPick').firstChild);
  }
});

G('setupAvaFI').addEventListener('change', e => {
  setupAvaFile = e.target.files[0];
  if(setupAvaFile) G('setupAvaPick').innerHTML = `<img src="${URL.createObjectURL(setupAvaFile)}">`;
});

G('setupName').addEventListener('input', () => {
  const n = G('setupName').value.trim();
  if(n && !setupAvaFile){
    G('setupAvaPick').style.background = cof(n);
    G('setupAvaInit').textContent = iof(n);
  }
});

G('setupDoneBtn').onclick = async () => {
  const name = G('setupName').value.trim();
  if(!name) return toast(T('nameReq'));
  if(!selectedGender) return toast(T('genderReq'));
  if(!selectedType) return toast(T('typeReq'));
  const bio = G('setupBio').value.trim();
  const user = auth.currentUser; if(!user) return;
  toast('Setting up...');
  try{
    let photoURL='', coverURL='';
    if(setupAvaFile) photoURL = await upload(setupAvaFile, `avatars/${user.uid}`);
    if(setupCoverFile) coverURL = await upload(setupCoverFile, `covers/${user.uid}`);
    await updateProfile(user, {displayName:name, photoURL});
    await setDoc(doc(db,'users',user.uid), {
      name, email:user.email, bio, gender:selectedGender,
      accountType:selectedType, photoURL, coverURL,
      followers:0, following:0, posts:0, createdAt:serverTimestamp()
    });
    toast('Welcome to Flow!');
  }catch(e){ toast('Error: '+e.message); }
};

// ── AUTH STATE ──
onAuthStateChanged(auth, async user => {
  ME = user;
  if(user){
    const snap = await getDoc(doc(db,'users',user.uid));
    if(!snap.exists() || !snap.data().gender){
      showScr('setupScreen');
      if(user.displayName) G('setupAvaInit').textContent = iof(user.displayName);
    } else {
      ME = {...ME, ...snap.data(), uid:user.uid};
      showScr('mainScreen');
      updateAvas();
      loadFeed();
      loadDMList();
      loadServers();
      loadFriends();
      loadMyProfile();
      setOnline(true);
    }
  } else {
    showScr('authScreen');
    if(unsubSrvs){ unsubSrvs(); unsubSrvs=null; }
    if(unsubMsgs){ unsubMsgs(); unsubMsgs=null; }
  }
});

function updateAvas(){
  if(!ME) return;
  const ca = G('composeAva');
  if(ME.photoURL){ ca.innerHTML = `<img src="${ME.photoURL}">`; }
  else{ ca.style.background = cof(ME.uid); G('composeAvaInit').textContent = iof(ME.displayName); }
}

// ── NAV ──
window.swNav = tab => {
  ['navHome','navMsgs','navProf'].forEach(id => G(id).classList.remove('on'));
  ['homePanel','msgsPanel','profilePanel'].forEach(id => G(id).classList.add('hidden'));
  if(tab==='home'){ G('navHome').classList.add('on'); G('homePanel').classList.remove('hidden'); }
  else if(tab==='msgs'){ G('navMsgs').classList.add('on'); G('msgsPanel').classList.remove('hidden'); }
  else if(tab==='profile'){ G('navProf').classList.add('on'); G('profilePanel').classList.remove('hidden'); }
};

window.swMsgTab = tab => {
  G('tabDMs').classList.toggle('on', tab==='dms');
  G('tabSrvs').classList.toggle('on', tab==='srvs');
  G('dmsList').classList.toggle('hidden', tab!=='dms');
  G('srvsList').classList.toggle('hidden', tab!=='srvs');
  G('btnCreateSrv').style.display = (tab==='srvs' && ME?.accountType==='pro') ? '' : 'none';
};

// ── FEED ──
async function loadFeed(){
  G('feedWrap').innerHTML = '<div style="padding:20px;text-align:center;color:var(--ink4)">Loading...</div>';
  try{
    const snap = await getDocs(query(collection(db,'posts'), orderBy('createdAt','desc'), limit(20)));
    const posts = []; snap.forEach(d => posts.push({id:d.id,...d.data()}));
    renderFeed(posts);
  }catch(e){ G('feedWrap').innerHTML = `<div style="padding:20px;text-align:center;color:var(--ink4)">${e.message}</div>`; }
}

function renderFeed(posts){
  const wrap = G('feedWrap'); wrap.innerHTML = '';
  if(!posts.length){
    wrap.innerHTML = `<div class="empty-box"><svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg><div class="empty-ttl">${T('noPosts')}</div><div class="empty-sub">Be the first to post!</div></div>`;
    return;
  }
  posts.forEach(p => wrap.appendChild(buildPost(p)));
}

function buildPost(p){
  const card = document.createElement('div'); card.className = 'post-card';
  const date = p.createdAt?.toDate ? p.createdAt.toDate() : new Date();
  const time = date.toLocaleDateString('en-US',{day:'numeric',month:'short'});
  const color = cof(p.userId||'x');
  const liked = (p.likedBy||[]).includes(ME?.uid||'');
  card.innerHTML = `
    <div class="post-head">
      <div class="post-ava" style="background:${color}" data-uid="${p.userId||''}">${p.userPhoto?`<img src="${p.userPhoto}">`:`${iof(p.userName)}`}</div>
      <div class="post-meta">
        <div class="post-author" data-uid="${p.userId||''}">${esc(p.userName||'?')}${p.accountType==='pro'?'<span class="post-badge">PRO</span>':''}</div>
        <div class="post-time">${time}</div>
      </div>
    </div>
    <div class="post-body">
      ${p.text?`<div class="post-text">${esc(p.text)}</div>`:''}
      ${p.imageURL?`<img class="post-img" src="${p.imageURL}" alt="">`:''}
    </div>
    <div class="post-actions">
      <button class="post-act${liked?' liked':''}" data-pid="${p.id}">
        <svg viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
        ${p.likes||0}
      </button>
      <button class="post-act">
        <svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
        ${p.comments||0}
      </button>
      <button class="post-act">
        <svg viewBox="0 0 24 24"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
      </button>
    </div>`;
  card.querySelectorAll('[data-uid]').forEach(el => {
    el.addEventListener('click', () => { const uid = el.getAttribute('data-uid'); if(uid) openUserProfile(uid); });
  });
  const img = card.querySelector('.post-img');
  if(img) img.addEventListener('click', () => { G('imgFSSrc').src = p.imageURL; G('imgFS').classList.remove('hidden'); });
  card.querySelector('.post-act').addEventListener('click', () => toggleLike(p));
  return card;
}

async function toggleLike(post){
  if(!ME) return;
  const ref = doc(db,'posts',post.id);
  const liked = (post.likedBy||[]).includes(ME.uid);
  try{
    await updateDoc(ref, {likes:increment(liked?-1:1), likedBy:liked?arrayRemove(ME.uid):arrayUnion(ME.uid)});
    loadFeed();
  }catch(e){ toast(e.message); }
}

window.refreshFeed = () => loadFeed();

// ── COMPOSE ──
G('btnComposeImg').onclick = () => G('composeImgFI').click();
G('composeImgFI').addEventListener('change', e => {
  compImgFile = e.target.files[0];
  if(compImgFile){ G('composeImgPrev').style.display=''; G('composeImgThumb').src=URL.createObjectURL(compImgFile); }
});
window.clearComposeImg = () => { compImgFile=null; G('composeImgPrev').style.display='none'; G('composeImgFI').value=''; };

G('btnPublish').onclick = async () => {
  const text = G('composeText').value.trim();
  if(!text && !compImgFile) return toast('Write something first');
  toast('Publishing...');
  try{
    let imageURL = '';
    if(compImgFile) imageURL = await upload(compImgFile, `posts/${Date.now()}`);
    await addDoc(collection(db,'posts'), {
      text, imageURL, userId:ME.uid, userName:ME.displayName||ME.email,
      userPhoto:ME.photoURL||'', accountType:ME.accountType||'personal',
      likes:0, comments:0, likedBy:[], createdAt:serverTimestamp()
    });
    await updateDoc(doc(db,'users',ME.uid), {posts:increment(1)});
    closeSheet('composeSheet'); G('composeText').value=''; clearComposeImg();
    toast('Posted!'); loadFeed();
  }catch(e){ toast(e.message); }
};

// ── MY PROFILE ──
async function loadMyProfile(){
  if(!ME) return;
  const snap = await getDoc(doc(db,'users',ME.uid));
  const data = snap.data()||{};
  ME = {...ME, ...data};
  // cover
  const cov = G('myPCover');
  const oi = cov.querySelector('img'); if(oi) oi.remove();
  cov.style.background = `linear-gradient(135deg,${cof(ME.uid)},var(--acc))`;
  if(ME.coverURL){
    const img = new Image(); img.src = ME.coverURL;
    img.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:cover;pointer-events:none';
    cov.insertBefore(img, cov.firstChild);
  }
  // avatar
  const ava = G('myPAva');
  const hint = `<div class="p-ava-hint"><svg viewBox="0 0 24 24" style="width:16px;height:16px;stroke:white;fill:none;stroke-width:2;stroke-linecap:round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></div>`;
  if(ME.photoURL){ ava.innerHTML = `<img src="${ME.photoURL}" style="width:100%;height:100%;object-fit:cover;pointer-events:none">${hint}`; }
  else{ ava.style.background = cof(ME.uid); ava.innerHTML = `<span style="font-size:22px;font-weight:700;color:#fff">${iof(ME.displayName)}</span>${hint}`; }
  G('myPName').textContent = ME.displayName||'—';
  G('myPBio').textContent = ME.bio||'';
  G('myPTypeBadge').textContent = ME.accountType==='pro' ? '⭐ Professional' : '👤 Personal';
  G('myPosts').textContent = data.posts||0;
  G('myFollowers').textContent = data.followers||0;
  G('myFollowing').textContent = data.following||0;
  // rows
  const rows = G('myPRows'); rows.innerHTML = '';
  [
    {ic:`<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>`, txt:T('edit'), sub:ME.displayName, act:()=>{G('editName').value=ME.displayName||'';G('editBio').value=ME.bio||'';openSheet('editProfSheet');}},
    {ic:`<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>`, txt:'Change Password', sub:'', act:()=>openSheet('editPassSheet')},
    {ic:`<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>`, txt:'Logout', sub:'', act:async()=>{setOnline(false);await signOut(auth);}, danger:true}
  ].forEach(r => {
    const d = document.createElement('div'); d.className = 'p-row'+(r.danger?' danger':'');
    d.innerHTML = `<div class="p-row-l"><div class="p-row-ic"><svg viewBox="0 0 24 24" style="width:16px;height:16px;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round">${r.ic}</svg></div><div><div class="p-row-txt">${r.txt}</div>${r.sub?`<div class="p-row-sub">${esc(r.sub)}</div>`:''}</div></div><span class="p-row-chev">›</span>`;
    d.onclick = r.act; rows.appendChild(d);
  });
  G('myPCover').onclick = () => G('coverFI').click();
  G('myPAva').onclick = () => G('avatarFI').click();
}

G('avatarFI').addEventListener('change', async e => {
  const f = e.target.files[0]; if(!f||!ME) return;
  toast('Uploading...'); try{
    const url = await upload(f, `avatars/${ME.uid}`);
    await updateProfile(ME, {photoURL:url});
    await updateDoc(doc(db,'users',ME.uid), {photoURL:url});
    ME.photoURL = url; loadMyProfile(); updateAvas(); toast('Photo updated!');
  }catch(e){ toast(e.message); }
});

G('coverFI').addEventListener('change', async e => {
  const f = e.target.files[0]; if(!f||!ME) return;
  toast('Uploading...'); try{
    const url = await upload(f, `covers/${ME.uid}`);
    await updateDoc(doc(db,'users',ME.uid), {coverURL:url});
    ME.coverURL = url; loadMyProfile(); toast('Cover updated!');
  }catch(e){ toast(e.message); }
});

G('btnSaveProf').onclick = async () => {
  const n = G('editName').value.trim(), b = G('editBio').value.trim();
  if(!n) return toast(T('nameReq'));
  try{
    await updateProfile(ME, {displayName:n});
    await updateDoc(doc(db,'users',ME.uid), {name:n, bio:b});
    ME.displayName=n; ME.bio=b; closeSheet('editProfSheet'); loadMyProfile(); updateAvas(); toast('Saved!');
  }catch(e){ toast(e.message); }
};

G('btnSavePass').onclick = async () => {
  const p = G('newPInp').value, c = G('confPInp').value;
  if(!p||!c) return; if(p!==c) return toast('Passwords do not match');
  if(p.length<6) return toast(T('passShort'));
  try{ await updatePassword(ME,p); closeSheet('editPassSheet'); toast('Password updated!'); }
  catch(e){ toast(e.code==='auth/requires-recent-login'?'Please re-login first':e.message); }
};

// ── USER PROFILE ──
async function openUserProfile(uid){
  if(!uid) return;
  if(uid === ME?.uid){ swNav('profile'); return; }
  viewedUID = uid;
  try{
    const snap = await getDoc(doc(db,'users',uid));
    const u = snap.data()||{};
    G('upTitle').textContent = u.name||uid;
    G('upName').textContent = u.name||uid;
    G('upBio').textContent = u.bio||'';
    G('upPosts').textContent = u.posts||0;
    G('upFollowers').textContent = u.followers||0;
    G('upFollowing').textContent = u.following||0;
    const ava = G('upAva'); ava.style.background = cof(uid);
    ava.innerHTML = u.photoURL ? `<img src="${u.photoURL}">` : `<span>${iof(u.name)}</span>`;
    const cov = G('upCover'); cov.style.background = `linear-gradient(135deg,${cof(uid)},var(--acc))`;
    cov.innerHTML = u.coverURL ? `<img src="${u.coverURL}" style="width:100%;height:100%;object-fit:cover">` : '';
    const pSnap = await getDocs(query(collection(db,'posts'),where('userId','==',uid),orderBy('createdAt','desc'),limit(10)));
    const pFeed = G('upFeed'); pFeed.innerHTML = '';
    pSnap.forEach(d => pFeed.appendChild(buildPost({id:d.id,...d.data()})));
    G('btnBackUP').onclick = () => showScr('mainScreen');
    showScr('userProfScreen');
  }catch(e){ toast(e.message); }
}
window.openUserProfile = openUserProfile;

G('btnFollowUser').onclick = async () => {
  if(!viewedUID||!ME) return;
  try{ await updateDoc(doc(db,'users',viewedUID),{followers:increment(1)}); await updateDoc(doc(db,'users',ME.uid),{following:increment(1)}); toast('Following!'); }
  catch(e){ toast(e.message); }
};
G('btnMsgUser').onclick = async () => {
  if(!viewedUID) return;
  const snap = await getDoc(doc(db,'users',viewedUID));
  if(snap.exists()) startDM({id:viewedUID,...snap.data()});
};
G('btnAddFrUser').onclick = async () => {
  if(!viewedUID) return;
  try{ await addDoc(collection(db,'friendRequests'),{from:ME.uid,to:viewedUID,fromName:ME.displayName||ME.email,fromEmail:ME.email,fromId:ME.uid,status:'pending',createdAt:serverTimestamp()}); toast('Friend request sent!'); }
  catch(e){ toast(e.message); }
};
G('btnViewDMUser').onclick = () => { if(currentDMFriend) openUserProfile(currentDMFriend.id); };

// ── FRIENDS ──
function loadFriends(){
  if(!ME) return;
  onSnapshot(collection(db,'users',ME.uid,'friends'), snap => {
    allFriends=[]; snap.forEach(d=>allFriends.push({id:d.id,...d.data()})); renderFrList(''); loadDMList();
  });
  onSnapshot(query(collection(db,'friendRequests'),where('to','==',ME.uid),where('status','==','pending')), snap => {
    pendingReqs=[]; snap.forEach(d=>pendingReqs.push({id:d.id,...d.data()}));
    renderFreqBar(); G('msgBadge').classList.toggle('hidden', pendingReqs.length===0);
  });
}

function renderFreqBar(){
  const bar=G('freqBar'), sc=G('freqScroll');
  if(!pendingReqs.length){ bar.style.display='none'; return; }
  bar.style.display=''; sc.innerHTML=`<span class="freq-lbl">Requests</span>`;
  pendingReqs.forEach(r => {
    const el=document.createElement('div'); el.className='freq-item';
    el.innerHTML=`<div class="freq-ava" style="background:${cof(r.fromId)}">${iof(r.fromName)}</div><div class="freq-nm">${esc(r.fromName)}</div><div class="freq-acts"><button class="fac ok"><svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg></button><button class="fac no"><svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></div>`;
    el.querySelector('.ok').onclick=()=>acceptFr(r); el.querySelector('.no').onclick=()=>rejectFr(r);
    sc.appendChild(el);
  });
}

window.openFriendsSheet = () => {
  const inp=G('frSearch'); inp.value=''; G('frResults').innerHTML='';
  renderFrList(''); inp.oninput=()=>renderFrList(inp.value.trim());
  openSheet('friendsSheet');
};

function renderFrList(f){
  const el=G('frList'); el.innerHTML='';
  const list=f?allFriends.filter(x=>(x.name||'').toLowerCase().includes(f.toLowerCase())):allFriends;
  if(!list.length){ el.innerHTML=`<div style="text-align:center;color:var(--ink3);padding:14px;font-size:13px">${f?'No results':T('noFriends')}</div>`; return; }
  list.forEach(x => {
    const d=document.createElement('div'); d.className='fr-item';
    d.innerHTML=`<div class="fr-ava" style="background:${cof(x.id)}">${x.photoURL?`<img src="${x.photoURL}">`:`${iof(x.name)}`}</div><div class="fr-nm">${esc(x.name)}</div><button style="background:var(--a);border:none;cursor:pointer;color:#fff;padding:6px 12px;border-radius:8px;font-family:'Syne',sans-serif;font-size:12px;font-weight:700;flex-shrink:0">Chat</button>`;
    d.onclick=e=>{if(!e.target.closest('button'))openUserProfile(x.id)};
    d.querySelector('button').onclick=e=>{e.stopPropagation();closeSheet('friendsSheet');startDM(x)};
    el.appendChild(d);
  });
}

G('btnSendFr').onclick = async () => {
  const name=G('addFrInp').value.trim(); if(!name) return;
  const res=G('frResults'); res.innerHTML='<div style="color:var(--ink3);padding:6px;font-size:13px">Searching...</div>';
  try{
    const snap=await getDocs(collection(db,'users')); const results=[];
    snap.forEach(d=>{const data=d.data();if(d.id!==ME.uid&&(data.name||'').toLowerCase().includes(name.toLowerCase()))results.push({id:d.id,...data})});
    if(!results.length){ res.innerHTML=`<div style="text-align:center;color:var(--ink3);padding:12px;font-size:13px">No user found</div>`; return; }
    res.innerHTML='';
    results.forEach(u => {
      const d=document.createElement('div'); d.className='fr-item';
      d.innerHTML=`<div class="fr-ava" style="background:${cof(u.id)}">${u.photoURL?`<img src="${u.photoURL}">`:`${iof(u.name)}`}</div><div class="fr-nm">${esc(u.name)}</div><button style="background:var(--a);border:none;cursor:pointer;color:#fff;padding:6px 12px;border-radius:8px;font-family:'Syne',sans-serif;font-size:12px;font-weight:700;flex-shrink:0">Add</button>`;
      d.querySelector('button').onclick=async e=>{e.stopPropagation();await addDoc(collection(db,'friendRequests'),{from:ME.uid,to:u.id,fromName:ME.displayName||ME.email,fromEmail:ME.email,fromId:ME.uid,status:'pending',createdAt:serverTimestamp()});toast('Request sent to '+u.name);G('addFrInp').value='';res.innerHTML='';};
      d.onclick=e=>{if(!e.target.closest('button'))openUserProfile(u.id)};
      res.appendChild(d);
    });
  }catch(e){ toast(e.message); }
};

async function acceptFr(req){
  try{
    await updateDoc(doc(db,'friendRequests',req.id),{status:'accepted'});
    await setDoc(doc(db,'users',ME.uid,'friends',req.fromId),{name:req.fromName,email:req.fromEmail,id:req.fromId});
    await setDoc(doc(db,'users',req.fromId,'friends',ME.uid),{name:ME.displayName,email:ME.email,id:ME.uid});
    toast('Accepted '+req.fromName);
  }catch(e){ toast(e.message); }
}
async function rejectFr(req){
  try{ await updateDoc(doc(db,'friendRequests',req.id),{status:'rejected'}); toast('Rejected'); }
  catch(e){ toast(e.message); }
}

// ── DM ──
function loadDMList(){
  const el=G('dmsList'); el.innerHTML='';
  if(!allFriends.length){
    el.innerHTML=`<div class="empty-box"><svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg><div class="empty-ttl">${T('noMessages')}</div><div class="empty-sub">Add friends to start chatting</div></div>`;
    return;
  }
  allFriends.forEach(f => {
    const d=document.createElement('div'); d.className='dm-item';
    d.innerHTML=`<div class="dm-ava" style="background:${cof(f.id)}">${f.photoURL?`<img src="${f.photoURL}">`:`${iof(f.name)}`}<div class="dm-online"></div></div><div class="dm-info"><div class="dm-nm">${esc(f.name)}</div><div class="dm-last">Tap to chat</div></div>`;
    d.onclick=()=>startDM(f); el.appendChild(d);
  });
}

async function startDM(friend){
  currentDMFriend=friend;
  const dmId='DM_'+[ME.uid,friend.id].sort().join('_');
  try{
    const snap=await getDoc(doc(db,'servers',dmId));
    if(!snap.exists()){
      await setDoc(doc(db,'servers',dmId),{name:friend.name,isDM:true,members:[ME.uid,friend.id],createdAt:serverTimestamp()});
      await setDoc(doc(db,'servers',dmId,'channels','main'),{name:'main',type:'text',category:'dm',createdAt:serverTimestamp()});
    }
  }catch{}
  activeSrv={id:dmId,name:friend.name}; activeCh={id:'main',name:friend.name,desc:''};
  G('dmChatNm').textContent=friend.name;
  G('dmMsgList').innerHTML=''; G('dmChatTa').value='';
  G('btnBackDM').onclick=()=>{activeCh=null;activeSrv=null;if(unsubMsgs){unsubMsgs();unsubMsgs=null;}showScr('mainScreen');swNav('msgs');};
  clearDmAttach(); showScr('dmChatScreen'); loadMsgsIn('dmMsgList','dmMsgsWrap');
  setTimeout(()=>G('dmChatTa').focus(),300);
}

// ── SERVERS ──
function loadServers(){
  if(unsubSrvs) unsubSrvs();
  unsubSrvs=onSnapshot(collection(db,'servers'), snap=>{
    const list=[];
    snap.forEach(d=>{const data=d.data();if(!data.isDM&&(data.members||[]).includes(ME.uid))list.push({id:d.id,...data})});
    renderSrvList(list);
  });
}

function renderSrvList(list){
  const el=G('srvsList'); el.innerHTML='';
  if(!list.length){
    el.innerHTML=`<div class="empty-box"><svg viewBox="0 0 24 24"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg><div class="empty-ttl">${T('noServers')}</div><div class="empty-sub">Create or join a server</div></div>`;
    return;
  }
  list.forEach(s => {
    const d=document.createElement('div'); d.className='srv-item';
    d.innerHTML=`<div class="srv-ava" style="background:${cof(s.id)}">${s.imageURL?`<img src="${s.imageURL}">`:`${iof(s.name)}`}</div><div class="srv-info"><div class="srv-nm">${esc(s.name)}</div><div class="srv-mt">${(s.members||[]).length} members</div></div><button class="srv-menu-btn"><svg viewBox="0 0 24 24"><circle cx="12" cy="5" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="12" cy="19" r="1.2"/></svg></button>`;
    d.querySelector('.srv-menu-btn').onclick=e=>{e.stopPropagation();openSrvSet(s)};
    d.onclick=()=>openServer(s); el.appendChild(d);
  });
}

window.openCreateSrv = () => {
  pendingRanks=[{name:'Member',color:'#1a1a2e'},{name:'Mod',color:'#f5a623'},{name:'Admin',color:'#e94560'}];
  renderRanks(); G('nSrvNm').value=''; G('nSrvDc').value=''; srvImgFile=null;
  G('srvImgPick').innerHTML=`<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg><span>Image</span>`;
  openSheet('createSrvSheet');
};

G('srvImgPick').onclick=()=>G('srvImgFI').click();
G('srvImgFI').addEventListener('change',e=>{srvImgFile=e.target.files[0];if(srvImgFile)G('srvImgPick').innerHTML=`<img src="${URL.createObjectURL(srvImgFile)}">`});

function renderRanks(){
  const el=G('rankListEl'); el.innerHTML='';
  pendingRanks.forEach((r,i)=>{
    const row=document.createElement('div'); row.className='rank-row';
    row.innerHTML=`<div class="rank-dot" style="background:${r.color}"></div><div class="rank-nm">${esc(r.name)}</div><button class="rank-del">×</button>`;
    row.querySelector('.rank-del').onclick=()=>{pendingRanks.splice(i,1);renderRanks()};
    el.appendChild(row);
  });
}
G('btnAddRank').onclick=()=>{const n=G('nRankNm').value.trim(),c=G('nRankCl').value;if(!n)return;pendingRanks.push({name:n,color:c});G('nRankNm').value='';renderRanks()};

G('btnDoCreateSrv').onclick=async()=>{
  const name=G('nSrvNm').value.trim(); if(!name) return toast('Name required');
  const desc=G('nSrvDc').value.trim(), ic=rid();
  try{
    let imageURL=''; if(srvImgFile){toast('Uploading...');imageURL=await upload(srvImgFile,`servers/${Date.now()}`);}
    const ref=await addDoc(collection(db,'servers'),{name,desc,imageURL,inviteCode:ic,ownerId:ME.uid,members:[ME.uid],ranks:pendingRanks,isDM:false,createdAt:serverTimestamp()});
    for(const ch of[{name:'general',type:'text',category:'Text Channels',desc:''},{name:'rules',type:'announce',category:'Info',desc:''},{name:'Voice',type:'voice',category:'Voice Channels',desc:''}])
      await addDoc(collection(db,'servers',ref.id,'channels'),{...ch,createdAt:serverTimestamp()});
    closeSheet('createSrvSheet'); toast('Server created!');
  }catch(e){ toast(e.message); }
};

G('btnDoJoin').onclick=async()=>{
  const code=G('joinCode').value.trim().toUpperCase(); if(!code) return;
  try{
    const snap=await getDocs(query(collection(db,'servers'),where('inviteCode','==',code)));
    if(snap.empty) return toast('Invalid code');
    const d=snap.docs[0],found={id:d.id,...d.data()};
    if((found.members||[]).includes(ME.uid)) return toast('Already a member');
    await updateDoc(doc(db,'servers',found.id),{members:arrayUnion(ME.uid)});
    closeSheet('joinSrvSheet'); toast('Joined '+found.name);
  }catch(e){ toast(e.message); }
};

// ── SERVER SCREEN ──
function openServer(srv){
  activeSrv=srv; G('srvTitleEl').textContent=srv.name; G('invCode').textContent=srv.inviteCode||'------';
  showScr('srvScreen'); loadChannels(srv.id);
}
G('btnBackMain').onclick=()=>{activeSrv=null;activeCh=null;showScr('mainScreen');swNav('msgs');swMsgTab('srvs')};
G('btnSrvInv').onclick=()=>openSheet('invSheet');
G('btnCpCode').onclick=()=>{navigator.clipboard.writeText(G('invCode').textContent||'');toast('Copied!')};

function openSrvSet(srv){
  activeSrv=srv; const isOwner=srv.ownerId===ME?.uid;
  G('srvEditNm').value=srv.name;
  G('ownerSetDiv').style.display=isOwner?'':'none';
  G('memberSetDiv').style.display=isOwner?'none':'';
  openSheet('srvSetSheet');
}
G('btnSrvSet').onclick=()=>{if(activeSrv)openSrvSet(activeSrv)};
G('btnSaveSrvNm').onclick=async()=>{const n=G('srvEditNm').value.trim();if(!n||!activeSrv)return;try{await updateDoc(doc(db,'servers',activeSrv.id),{name:n});activeSrv.name=n;G('srvTitleEl').textContent=n;closeSheet('srvSetSheet');toast('Saved!')}catch(e){toast(e.message)}};
G('btnDelSrv').onclick=async()=>{if(!activeSrv||activeSrv.ownerId!==ME.uid)return;if(!confirm('Delete this server?'))return;try{const chs=await getDocs(collection(db,'servers',activeSrv.id,'channels'));for(const ch of chs.docs){const msgs=await getDocs(collection(db,'servers',activeSrv.id,'channels',ch.id,'messages'));for(const m of msgs.docs)await deleteDoc(m.ref);await deleteDoc(ch.ref)}await deleteDoc(doc(db,'servers',activeSrv.id));closeSheet('srvSetSheet');activeSrv=null;showScr('mainScreen');swNav('msgs')}catch(e){toast(e.message)}};
G('btnLeaveSrv').onclick=async()=>{if(!activeSrv)return;if(!confirm('Leave?'))return;try{await updateDoc(doc(db,'servers',activeSrv.id),{members:arrayRemove(ME.uid)});closeSheet('srvSetSheet');activeSrv=null;showScr('mainScreen');swNav('msgs')}catch(e){toast(e.message)}};

// ── CHANNELS ──
function loadChannels(srvId){
  onSnapshot(query(collection(db,'servers',srvId,'channels'),orderBy('createdAt','asc')),snap=>{
    const chs=[]; snap.forEach(d=>chs.push({id:d.id,...d.data()})); renderChannels(chs);
  });
}
const CHIC={
  text:`<svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`,
  voice:`<svg viewBox="0 0 24 24"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/></svg>`,
  announce:`<svg viewBox="0 0 24 24"><path d="M22 17H2a3 3 0 0 0 3-3V9a7 7 0 0 1 14 0v5a3 3 0 0 0 3 3z"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>`
};
function renderChannels(chs){
  const wrap=G('chSecEl'); wrap.innerHTML='';
  const cats={}; chs.forEach(c=>{const k=c.category||'Channels';if(!cats[k])cats[k]=[];cats[k].push(c)});
  for(const [cat,list] of Object.entries(cats)){
    const sec=document.createElement('div');
    const hdr=document.createElement('div'); hdr.className='ch-cat';
    hdr.innerHTML=`<span class="ch-cat-lbl">${esc(cat)}</span><button class="ch-cat-add"><svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></button>`;
    hdr.querySelector('.ch-cat-add').onclick=()=>{G('chCat').value=cat;G('chNm').value='';G('chDc').value='';openSheet('addChSheet')};
    sec.appendChild(hdr);
    list.forEach(ch=>{
      const btn=document.createElement('button'); btn.className='chbtn';
      btn.innerHTML=(CHIC[ch.type]||CHIC.text)+`<span>${esc(ch.name)}</span>`;
      btn.onclick=ch.type==='voice'?()=>joinVoice(ch):()=>openChat(ch);
      sec.appendChild(btn);
    });
    wrap.appendChild(sec);
  }
  const foot=document.createElement('div'); foot.className='ch-cat';
  foot.innerHTML=`<span class="ch-cat-lbl">New Category</span><button class="ch-cat-add"><svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></button>`;
  foot.querySelector('.ch-cat-add').onclick=()=>{G('chCat').value='';G('chNm').value='';openSheet('addChSheet')};
  wrap.appendChild(foot);
}
G('btnDoAddCh').onclick=async()=>{if(!activeSrv)return;const n=G('chNm').value.trim(),t=G('chType').value,d=G('chDc').value.trim(),c=G('chCat').value.trim()||'Channels';if(!n)return;await addDoc(collection(db,'servers',activeSrv.id,'channels'),{name:n,type:t,desc:d,category:c,createdAt:serverTimestamp()});closeSheet('addChSheet');toast('Channel created!')};

// ── CHAT OPEN ──
function openChat(ch){
  activeCh=ch; G('chatNmEl').textContent=ch.name; G('cwt').textContent=ch.name; G('cwd').textContent=ch.desc||'Start of #'+ch.name;
  G('msgListEl').innerHTML=''; G('chatTa').value=''; G('chatTa').style.height='auto';
  G('btnBackSrv').onclick=()=>{activeCh=null;if(unsubMsgs){unsubMsgs();unsubMsgs=null;}showScr('srvScreen')};
  G('btnMembers').style.display='';
  clearChatAttach(); showScr('chatScreen'); loadMsgsIn('msgListEl','msgsWrap');
  setTimeout(()=>G('chatTa').focus(),300);
}
G('btnMembers').onclick=async()=>{
  if(!activeSrv)return;
  try{
    const snap=await getDoc(doc(db,'servers',activeSrv.id)); const members=(snap.data()?.members)||[];
    const wrap=G('membersBody'); wrap.innerHTML='';
    for(const uid of members){try{const u=(await getDoc(doc(db,'users',uid))).data()||{};const el=document.createElement('div');el.className='fr-item';el.innerHTML=`<div class="fr-ava" style="background:${cof(uid)}">${u.photoURL?`<img src="${u.photoURL}">`:`${iof(u.name)}`}</div><div class="fr-nm">${esc(u.name||uid)}</div>`;el.onclick=()=>{closeSheet('membersSheet');openUserProfile(uid)};wrap.appendChild(el)}catch{}}
    openSheet('membersSheet');
  }catch(e){toast(e.message)}
};

// ── LOAD MESSAGES ──
function loadMsgsIn(listId, wrapId){
  if(unsubMsgs){unsubMsgs();unsubMsgs=null;}
  if(!activeSrv||!activeCh) return;
  const ref=collection(db,'servers',activeSrv.id,'channels',activeCh.id,'messages');
  unsubMsgs=onSnapshot(query(ref,orderBy('createdAt','asc'),limit(100)),snap=>{
    G(listId).innerHTML=''; let lastDay=null;
    snap.forEach(d=>{
      const m={id:d.id,...d.data()};
      const date=m.createdAt?.toDate?m.createdAt.toDate():new Date();
      const day=date.toLocaleDateString('en-US',{day:'numeric',month:'long'});
      if(day!==lastDay){const dv=document.createElement('div');dv.className='msg-date';dv.textContent=day;G(listId).appendChild(dv);lastDay=day;}
      G(listId).appendChild(buildMsg(m,date));
    });
    const w=G(wrapId); w.scrollTop=w.scrollHeight;
  });
}

function buildMsg(m, date){
  const el=document.createElement('div'); el.className='msg-row';
  const color=cof(m.userId||'x');
  const time=date.toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'});
  const reacts=m.reactions||{};
  let reactsHTML='';
  for(const [emoji,uids] of Object.entries(reacts)){
    if(!uids||!uids.length) continue;
    const mine=(uids||[]).includes(ME?.uid||'');
    reactsHTML+=`<span class="react-chip${mine?' mine':''}" data-emoji="${emoji}" data-mid="${m.id}">${emoji}<span class="cnt">${uids.length}</span></span>`;
  }
  el.innerHTML=`
    <div class="msg-ava" style="background:${color}" data-uid="${m.userId||''}">${m.userPhoto?`<img src="${m.userPhoto}">`:`${iof(m.userName)}`}</div>
    <div class="msg-body">
      <div class="msg-meta">
        <span class="msg-author" style="color:${color}" data-uid="${m.userId||''}">${esc(m.userName||'?')}</span>
        <span class="msg-time">${time}</span>
      </div>
      ${m.text?`<div class="msg-text">${esc(m.text)}</div>`:''}
      ${m.imageURL?`<img class="msg-img" src="${m.imageURL}" alt="">`:''}
      ${m.voiceURL?`<div class="voice-msg"><button class="vplay-btn" data-url="${m.voiceURL}"><svg viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"/></svg></button><div class="vdur">${m.voiceDuration||0}s</div></div>`:''}
      ${reactsHTML?`<div class="msg-reactions">${reactsHTML}</div>`:''}
      <button class="react-btn" data-mid="${m.id}">+ React</button>
    </div>`;
  el.querySelectorAll('[data-uid]').forEach(e=>{e.style.cursor='pointer';e.addEventListener('click',ev=>{ev.stopPropagation();const uid=e.getAttribute('data-uid');if(uid)openUserProfile(uid)})});
  const img=el.querySelector('.msg-img'); if(img) img.addEventListener('click',()=>{G('imgFSSrc').src=m.imageURL;G('imgFS').classList.remove('hidden')});
  const vbtn=el.querySelector('.vplay-btn'); if(vbtn) vbtn.addEventListener('click',()=>playVoice(vbtn));
  el.querySelector('.react-btn').addEventListener('click',ev=>{ev.preventDefault();ev.stopPropagation();showReactPicker(m.id,ev.currentTarget)});
  el.querySelectorAll('.react-chip').forEach(chip=>{chip.addEventListener('click',ev=>{ev.stopPropagation();toggleReaction(m.id,chip.getAttribute('data-emoji'))})});
  return el;
}

let curAudio=null;
function playVoice(btn){
  const url=btn.getAttribute('data-url');
  if(curAudio&&!curAudio.paused){curAudio.pause();curAudio=null;btn.innerHTML='<svg viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"/></svg>';return;}
  curAudio=new Audio(url); curAudio.play();
  btn.innerHTML='<svg viewBox="0 0 24 24" fill="white"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>';
  curAudio.onended=()=>{btn.innerHTML='<svg viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"/></svg>';curAudio=null;};
}

// ── REACTIONS ──
let activePopEl=null;
function showReactPicker(msgId,anchor){
  if(activePopEl){activePopEl.remove();activePopEl=null;return;}
  const pop=document.createElement('div'); pop.className='emoji-popup';
  EMOJIS.forEach(e=>{const b=document.createElement('button');b.textContent=e;b.addEventListener('click',ev=>{ev.stopPropagation();toggleReaction(msgId,e);pop.remove();activePopEl=null;});pop.appendChild(b)});
  document.body.appendChild(pop); activePopEl=pop;
  const rect=anchor.getBoundingClientRect(); let top=rect.top-120; if(top<8)top=rect.bottom+8;
  pop.style.top=Math.max(8,Math.min(window.innerHeight-130,top))+'px';
  pop.style.left=Math.max(8,Math.min(window.innerWidth-240,rect.left))+'px';
  setTimeout(()=>document.addEventListener('click',function h(){pop.remove();activePopEl=null;document.removeEventListener('click',h);}),150);
}
async function toggleReaction(msgId,emoji){
  if(!ME||!activeCh||!activeSrv)return;
  const ref=doc(db,'servers',activeSrv.id,'channels',activeCh.id,'messages',msgId);
  try{const snap=await getDoc(ref);const reacts=snap.data()?.reactions||{};const uids=reacts[emoji]||[];await updateDoc(ref,{[`reactions.${emoji}`]:uids.includes(ME.uid)?uids.filter(u=>u!==ME.uid):[...uids,ME.uid]});}
  catch(e){toast(e.message);}
}

// ── EMOJI INPUT ──
function setupEmojiTray(trayId,taId){
  const t=G(trayId); if(t.children.length)return;
  EMOJIS.forEach(e=>{const b=document.createElement('button');b.textContent=e;b.addEventListener('click',()=>{const ta=G(taId);ta.value+=e;ta.focus()});t.appendChild(b)});
}
G('btnEmoji').addEventListener('click',()=>{const t=G('emojiTray');t.classList.toggle('show');if(t.classList.contains('show'))setupEmojiTray('emojiTray','chatTa')});
G('btnDmEmoji').addEventListener('click',()=>{const t=G('dmEmojiTray');t.classList.toggle('show');if(t.classList.contains('show'))setupEmojiTray('dmEmojiTray','dmChatTa')});

// ── ATTACH ──
function clearChatAttach(){chatFile=null;chatFileType=null;G('imgPrevBar').classList.remove('show');G('imgPrevThumb').src='';G('chatImgFI').value='';}
function clearDmAttach(){dmFile=null;dmFileType=null;G('dmImgPrevBar').classList.remove('show');G('dmImgPrevThumb').src='';G('dmImgFI').value='';}
G('btnRmImg').onclick=clearChatAttach; G('btnDmRmImg').onclick=clearDmAttach;
G('btnImg').addEventListener('click',()=>G('chatImgFI').click());
G('chatImgFI').addEventListener('change',e=>{const f=e.target.files[0];if(!f)return;chatFile=f;chatFileType='image';G('imgPrevThumb').src=URL.createObjectURL(f);G('attachLbl').textContent='Image ready';G('imgPrevBar').classList.add('show')});
G('btnDmImg').addEventListener('click',()=>G('dmImgFI').click());
G('dmImgFI').addEventListener('change',e=>{const f=e.target.files[0];if(!f)return;dmFile=f;dmFileType='image';G('dmImgPrevThumb').src=URL.createObjectURL(f);G('dmAttachLbl').textContent='Image ready';G('dmImgPrevBar').classList.add('show')});

// ── VOICE RECORDING ──
function setupVoiceBtn(btnId,barId,lblId,setFile,setType){
  G(btnId).addEventListener('click',async()=>{
    if(!activeCh||!activeSrv) return toast('Select a channel first');
    if(mediaRec&&mediaRec.state==='recording'){mediaRec.stop();clearInterval(recTimer);G(btnId).style.color='';G(btnId).style.background='none';return;}
    try{
      const stream=await navigator.mediaDevices.getUserMedia({audio:true});
      recChunks=[];recSeconds=0;
      const mime=MediaRecorder.isTypeSupported('audio/webm;codecs=opus')?'audio/webm;codecs=opus':MediaRecorder.isTypeSupported('audio/webm')?'audio/webm':'audio/mp4';
      mediaRec=new MediaRecorder(stream,{mimeType:mime});
      mediaRec.ondataavailable=e=>{if(e.data&&e.data.size>0)recChunks.push(e.data)};
      mediaRec.onstop=async()=>{
        stream.getTracks().forEach(t=>t.stop());
        const ext=mime.includes('mp4')?'mp4':'webm';
        const blob=new Blob(recChunks,{type:mime});
        const file=new File([blob],`voice_${Date.now()}.${ext}`,{type:mime});
        setFile(file);setType('voice');G(barId).classList.add('show');
        G(lblId).textContent=`🎙 ${recSeconds}s — tap send`;
        G(btnId).style.color='';G(btnId).style.background='none';mediaRec=null;
      };
      mediaRec.start(100);
      G(btnId).style.color='var(--red)';G(btnId).style.background='rgba(239,68,68,.1)';
      G(barId).classList.add('show');G(lblId).textContent='🔴 Recording... tap again to stop';
      recTimer=setInterval(()=>{recSeconds++;G(lblId).textContent=`🔴 ${recSeconds}s... tap again to stop`;if(recSeconds>=120){mediaRec.stop();clearInterval(recTimer);}},1000);
    }catch(err){toast(err.name==='NotAllowedError'?'Allow microphone access':'Mic error: '+err.message);}
  });
}
setupVoiceBtn('btnRec','imgPrevBar','attachLbl',f=>{chatFile=f},t=>{chatFileType=t});
setupVoiceBtn('btnDmRec','dmImgPrevBar','dmAttachLbl',f=>{dmFile=f},t=>{dmFileType=t});

// ── SEND ──
async function sendMsg(taId,getFile,getType,clearFn,sendBtnId){
  const ta=G(taId); const text=ta.value.trim();
  if(!text&&!getFile()) return;
  if(!activeCh||!activeSrv){toast('Select a channel first');return;}
  const file=getFile(); const type=getType();
  ta.value='';ta.style.height='auto';G(sendBtnId).disabled=true;clearFn();
  try{
    let imageURL='',voiceURL='',voiceDuration=0;
    if(file){
      toast('Uploading...');
      if(type==='image') imageURL=await upload(file,`chat/img_${Date.now()}`);
      else if(type==='voice'){
        voiceURL=await upload(file,`chat/voice_${Date.now()}`);
        try{const a=new Audio(URL.createObjectURL(file));await new Promise(r=>{a.onloadedmetadata=r;a.onerror=r;setTimeout(r,2000)});voiceDuration=Math.round(a.duration)||0;}catch{}
      }
    }
    await addDoc(collection(db,'servers',activeSrv.id,'channels',activeCh.id,'messages'),{
      text,imageURL,voiceURL,voiceDuration,
      userId:ME.uid,userName:ME.displayName||ME.email.split('@')[0],
      userPhoto:ME.photoURL||'',reactions:{},createdAt:serverTimestamp()
    });
  }catch(e){toast('Failed: '+e.message);ta.value=text;}
  finally{G(sendBtnId).disabled=false;ta.focus();}
}

G('btnSend').addEventListener('click',()=>sendMsg('chatTa',()=>chatFile,()=>chatFileType,clearChatAttach,'btnSend'));
G('chatTa').addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();G('btnSend').click();}});
G('chatTa').addEventListener('input',function(){this.style.height='auto';this.style.height=Math.min(this.scrollHeight,96)+'px'});

G('btnDmSend').addEventListener('click',()=>sendMsg('dmChatTa',()=>dmFile,()=>dmFileType,clearDmAttach,'btnDmSend'));
G('dmChatTa').addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();G('btnDmSend').click();}});
G('dmChatTa').addEventListener('input',function(){this.style.height='auto';this.style.height=Math.min(this.scrollHeight,96)+'px'});

// ── VOICE CHANNELS (WebRTC) ──
async function joinVoice(ch){
  vcChannel=ch; G('vcNmEl').textContent=ch.name; G('vcNmBig').textContent=ch.name; G('vcSrv').textContent=activeSrv?.name||'';
  G('vcGrid').innerHTML=''; G('vcStatus').textContent=T('connecting'); peerConns={}; showScr('voiceScreen');
  try{
    localStream=await navigator.mediaDevices.getUserMedia({audio:true,video:false});
    const roomRef=doc(db,'servers',activeSrv.id,'voiceRooms',ch.id);
    await setDoc(roomRef,{[ME.uid]:{name:ME.displayName||ME.email,photo:ME.photoURL||'',joined:serverTimestamp()}},{merge:true});
    addVoiceMember(ME.uid,ME.displayName||ME.email,ME.photoURL,true);
    G('vcStatus').textContent=T('connected');
    vcRoomUnsub=onSnapshot(roomRef,async snap=>{
      const data=snap.data()||{};
      for(const uid of Object.keys(data)){if(uid!==ME.uid&&!peerConns[uid]){addVoiceMember(uid,data[uid].name,data[uid].photo,false);await createPC(uid,true,roomRef);}}
      for(const uid of Object.keys(peerConns)){if(!data[uid]){peerConns[uid].close();delete peerConns[uid];const el=G('vmc_'+uid);if(el)el.remove();}}
    });
    vcSigUnsub=onSnapshot(collection(db,'servers',activeSrv.id,'voiceRooms',ch.id,'signals',ME.uid,'inbox'),async snap=>{
      for(const change of snap.docChanges()){if(change.type==='added'){await handleSig(change.doc.data(),roomRef);await deleteDoc(change.doc.ref);}}
    });
  }catch(e){ G('vcStatus').textContent='Error: '+(e.name==='NotAllowedError'?'Allow mic access':e.message); }
}

async function createPC(remoteUid,isInit,roomRef){
  const pc=new RTCPeerConnection(ICE_SERVERS); peerConns[remoteUid]=pc;
  localStream.getTracks().forEach(t=>pc.addTrack(t,localStream));
  pc.ontrack=e=>{const old=document.getElementById('vaudio_'+remoteUid);if(old)old.remove();const a=document.createElement('audio');a.id='vaudio_'+remoteUid;a.srcObject=e.streams[0];a.autoplay=true;a.muted=vcDeafened;document.body.appendChild(a);a.play().catch(()=>{});};
  pc.onicecandidate=async e=>{if(e.candidate)try{await addDoc(collection(db,'servers',activeSrv.id,'voiceRooms',vcChannel.id,'signals',remoteUid,'inbox'),{type:'candidate',candidate:e.candidate.toJSON(),from:ME.uid});}catch{}};
  if(isInit){const offer=await pc.createOffer({offerToReceiveAudio:true});await pc.setLocalDescription(offer);await addDoc(collection(db,'servers',activeSrv.id,'voiceRooms',vcChannel.id,'signals',remoteUid,'inbox'),{type:'offer',sdp:pc.localDescription.sdp,from:ME.uid});}
  return pc;
}
async function handleSig(sig,roomRef){
  const from=sig.from; if(!from||from===ME.uid)return;
  try{
    if(sig.type==='offer'){if(!peerConns[from]){addVoiceMember(from,'...',null,false);await createPC(from,false,roomRef);}const pc=peerConns[from];await pc.setRemoteDescription(new RTCSessionDescription({type:'offer',sdp:sig.sdp}));const ans=await pc.createAnswer({offerToReceiveAudio:true});await pc.setLocalDescription(ans);await addDoc(collection(db,'servers',activeSrv.id,'voiceRooms',vcChannel.id,'signals',from,'inbox'),{type:'answer',sdp:pc.localDescription.sdp,from:ME.uid});}
    else if(sig.type==='answer'){const pc=peerConns[from];if(pc&&pc.signalingState==='have-local-offer')await pc.setRemoteDescription(new RTCSessionDescription({type:'answer',sdp:sig.sdp}));}
    else if(sig.type==='candidate'){const pc=peerConns[from];if(pc&&pc.remoteDescription)await pc.addIceCandidate(new RTCIceCandidate(sig.candidate)).catch(()=>{});}
  }catch(e){console.error(e);}
}
function addVoiceMember(uid,name,photo,isMe){
  if(G('vmc_'+uid))return;
  const card=document.createElement('div');card.className='vm-card';card.id='vmc_'+uid;
  card.innerHTML=`<div class="vm-ava" id="vma_${uid}" style="background:${cof(uid)}">${photo?`<img src="${photo}" style="width:100%;height:100%;object-fit:cover">`:`<span style="font-size:24px;font-weight:700;color:#fff">${iof(name||'?')}</span>`}</div><div class="vm-name">${esc(name||'...')}${isMe?' (you)':''}</div>`;
  G('vcGrid').appendChild(card);
}
async function leaveVoice(){
  for(const uid in peerConns)peerConns[uid].close(); peerConns={};
  if(localStream){localStream.getTracks().forEach(t=>t.stop());localStream=null;}
  document.querySelectorAll('[id^="vaudio_"]').forEach(a=>a.remove());
  if(vcRoomUnsub){vcRoomUnsub();vcRoomUnsub=null;} if(vcSigUnsub){vcSigUnsub();vcSigUnsub=null;}
  if(activeSrv&&vcChannel){try{const ref=doc(db,'servers',activeSrv.id,'voiceRooms',vcChannel.id);const snap=await getDoc(ref);if(snap.exists()){const data=snap.data();delete data[ME.uid];await setDoc(ref,data);}}catch{}}
  vcChannel=null;vcMuted=false;vcDeafened=false;G('btnMic').classList.remove('off');G('btnSpk').classList.remove('off');
}
G('btnLeaveVc').onclick=async()=>{await leaveVoice();showScr('srvScreen')};
G('btnBackVoice').onclick=async()=>{await leaveVoice();showScr('srvScreen')};
G('btnMic').onclick=()=>{vcMuted=!vcMuted;G('btnMic').classList.toggle('off',vcMuted);if(localStream)localStream.getAudioTracks().forEach(t=>t.enabled=!vcMuted);G('micIco').innerHTML=vcMuted?`<line x1="1" y1="1" x2="23" y2="23"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>`:` <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>`};
G('btnSpk').onclick=()=>{vcDeafened=!vcDeafened;G('btnSpk').classList.toggle('off',vcDeafened);document.querySelectorAll('[id^="vaudio_"]').forEach(a=>a.muted=vcDeafened)};

// ── SEARCH ──
G('globalSearchInp').addEventListener('input',async()=>{
  const q=G('globalSearchInp').value.trim(); const res=G('searchResults');
  if(!q){res.innerHTML='';return;}
  res.innerHTML='<div style="color:var(--ink3);padding:8px;font-size:13px">Searching...</div>';
  try{
    const snap=await getDocs(collection(db,'users')); const results=[];
    snap.forEach(d=>{const data=d.data();if((data.name||'').toLowerCase().includes(q.toLowerCase()))results.push({id:d.id,...data})});
    res.innerHTML='';
    if(!results.length){res.innerHTML='<div style="text-align:center;color:var(--ink3);padding:10px;font-size:13px">No results</div>';return;}
    results.forEach(u=>{const d=document.createElement('div');d.className='fr-item';d.innerHTML=`<div class="fr-ava" style="background:${cof(u.id)}">${u.photoURL?`<img src="${u.photoURL}">`:`${iof(u.name)}`}</div><div class="fr-nm">${esc(u.name)}</div>`;d.onclick=()=>{closeSheet('searchSheet');openUserProfile(u.id)};res.appendChild(d)});
  }catch(e){res.innerHTML=`<div style="color:var(--red);padding:8px;font-size:13px">${e.message}</div>`;}
});

// ── ONLINE ──
function setOnline(v){if(!ME)return;updateDoc(doc(db,'users',ME.uid),{online:v,lastSeen:serverTimestamp()}).catch(()=>{});}
document.addEventListener('visibilitychange',()=>setOnline(!document.hidden));
window.addEventListener('beforeunload',()=>setOnline(false));

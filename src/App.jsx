import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { initializeApp } from "firebase/app";
import {
  getAuth, onAuthStateChanged,
  signInWithEmailAndPassword, createUserWithEmailAndPassword,
  signInWithPopup, GoogleAuthProvider, reauthenticateWithPopup,
  sendPasswordResetEmail, updateProfile, signOut,
  setPersistence, browserLocalPersistence, browserSessionPersistence,
} from "firebase/auth";
import { getFirestore, doc, setDoc, getDoc, updateDoc, deleteField } from "firebase/firestore";

const firebaseApp = initializeApp({
  apiKey: "AIzaSyAunCnV2lla9DVIy_4A-ngR1W23dZNRUKU",
  authDomain: "nexus-rpg-app.firebaseapp.com",
  projectId: "nexus-rpg-app",
  storageBucket: "nexus-rpg-app.firebasestorage.app",
  messagingSenderId: "947645487813",
  appId: "1:947645487813:web:ab4b81ff1a37b8b65c2eac",
});
const auth = getAuth(firebaseApp);
const db = getFirestore(firebaseApp);
const googleProvider = new GoogleAuthProvider();

/* ── Firestore helpers (fail-silent so app still works if Firestore not enabled) ── */
const fsSetMusicLink = async (uid, svc, data) => {
  try { await setDoc(doc(db, "users", uid), { musicLinks: { [svc]: data } }, { merge: true }); } catch (_) {}
};
const fsDeleteMusicLink = async (uid, svc) => {
  try { await updateDoc(doc(db, "users", uid), { [`musicLinks.${svc}`]: deleteField() }); } catch (_) {}
};
const fsGetMusicLinks = async (uid) => {
  try { const snap = await getDoc(doc(db, "users", uid)); return snap.exists() ? (snap.data().musicLinks || {}) : {}; } catch (_) { return {}; }
};

/* ─── FONTS & GLOBAL CSS ─── */
const G = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Cinzel+Decorative:wght@400;700;900&family=Cinzel:wght@400;500;600;700&family=Crimson+Pro:ital,wght@0,300;0,400;0,600;1,300;1,400&display=swap');
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    html{-webkit-text-size-adjust:100%}
    :root{
      --bg:#0d0d0d;
      --surface:#131313;
      --card:#1a1a1a;
      --card2:#202020;
      --border:rgba(201,168,76,0.18);
      --border2:rgba(201,168,76,0.32);
      --gold:#c9a84c;
      --gold2:#e8c96d;
      --gold3:#a07830;
      --gold-glow:rgba(201,168,76,0.22);
      --gold-dim:rgba(201,168,76,0.09);
      --text:#f0e8d4;
      --muted:#9c8e70;
      --muted2:#c8b48e;
      --danger:#8b2020;
    }
    body{background:var(--bg);font-family:'Crimson Pro',serif;overflow-x:hidden}
    ::-webkit-scrollbar{width:3px}
    ::-webkit-scrollbar-thumb{background:var(--gold3);border-radius:2px}

    input[type=number]::-webkit-inner-spin-button,input[type=number]::-webkit-outer-spin-button{-webkit-appearance:none;margin:0}
    input[type=number]{-moz-appearance:textfield}
    @keyframes fadeIn{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
    @keyframes glow{0%,100%{box-shadow:0 0 20px rgba(201,168,76,0.15)}50%{box-shadow:0 0 40px rgba(201,168,76,0.35)}}
    @keyframes spin{to{transform:rotate(360deg)}}
    @keyframes shimmer{0%{background-position:-200% center}100%{background-position:200% center}}
    @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
    @keyframes flicker{0%,100%{opacity:1}92%{opacity:1}93%{opacity:0.7}94%{opacity:1}97%{opacity:.85}98%{opacity:1}}
    @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
    @keyframes borderGlow{0%,100%{border-color:rgba(201,168,76,0.2)}50%{border-color:rgba(201,168,76,0.6)}}
    @keyframes critAura{0%,100%{box-shadow:0 0 8px 3px rgba(255,215,0,0.9),0 0 22px 8px rgba(255,180,0,0.55),0 0 44px 16px rgba(201,168,76,0.25);color:#ffe86a}50%{box-shadow:0 0 16px 6px rgba(255,215,0,1),0 0 40px 14px rgba(255,180,0,0.8),0 0 70px 28px rgba(201,168,76,0.45);color:#fff5a0}}
    @keyframes eyeBlink{
      0%,83%  {transform:scaleX(1);animation-timing-function:cubic-bezier(0.4,0,1,0.4)}
      87%     {transform:scaleX(0.04);animation-timing-function:linear}
      89%     {transform:scaleX(0.04);animation-timing-function:cubic-bezier(0,0.6,0.4,1)}
      95%     {transform:scaleX(1)}
      100%    {transform:scaleX(1)}
    }
    .eye-blink-group{transform-box:view-box;transform-origin:60px 60px;animation:eyeBlink 6s linear infinite}

    .fade{animation:fadeIn 0.5s ease forwards}

    .btn-gold{
      font-family:'Cinzel',serif;font-size:11px;letter-spacing:3px;text-transform:uppercase;
      padding:13px 28px;border-radius:4px;cursor:pointer;transition:all 0.25s;
      background:linear-gradient(135deg,#c9a84c,#e8c96d,#a07830);
      border:none;color:#050505;font-weight:700;
      box-shadow:0 4px 20px rgba(201,168,76,0.3);
    }
    .btn-gold:hover{transform:translateY(-1px);box-shadow:0 6px 30px rgba(201,168,76,0.5)}
    .btn-ghost{
      font-family:'Cinzel',serif;font-size:10px;letter-spacing:2px;text-transform:uppercase;
      padding:11px 22px;border-radius:4px;cursor:pointer;transition:all 0.25s;
      background:transparent;border:1px solid var(--border2);color:var(--gold);
    }
    .btn-ghost:hover{background:var(--gold-dim);border-color:var(--gold)}
    .nav-item{
      font-family:'Cinzel',serif;font-size:10px;letter-spacing:2px;text-transform:uppercase;
      padding:8px 14px;border-radius:3px;cursor:pointer;border:none;
      background:transparent;color:var(--muted2);transition:all 0.2s;display:flex;align-items:center;gap:7px;
    }
    .nav-item:hover{background:var(--gold-dim)}
    .nav-item.active{color:var(--gold);background:var(--gold-dim);border-left:2px solid var(--gold)}
    input,textarea{
      font-family:'Crimson Pro',serif;font-size:15px;
      background:var(--card2);border:1px solid var(--border);border-radius:5px;
      color:var(--text);outline:none;transition:border-color 0.2s;
      padding:11px 14px;width:100%;
    }
    input:focus,textarea:focus{border-color:rgba(201,168,76,0.5)}
    input::placeholder{color:var(--muted)}

    /* ── MOBILE BOTTOM NAV ── */
    .sidebar-desktop{display:flex}
    .bottomnav{display:none}

    /* ── RESPONSIVE LAYOUTS ── */
    .sheet-grid{display:grid;grid-template-columns:300px 1fr 1fr;gap:14px;align-items:start}
    .dash-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}
    .dash-sessions{display:grid;grid-template-columns:1fr 1fr;gap:10px}
    .creator-attrs{display:grid;grid-template-columns:1fr 1fr;gap:32px;align-items:start}
    .creator-classes{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
    .system-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:16px}
    .topbar-sys{display:flex}
    .main-pad{padding:28px}
    .step-bar{display:flex}
    .step-bar-mobile{display:none}
    .char-meta{display:grid;grid-template-columns:repeat(4,1fr);gap:4px 16px}

    @media(max-width:768px){
      .sidebar-desktop{display:none !important}
      .bottomnav{
        display:flex;position:fixed;bottom:0;left:0;right:0;z-index:200;
        background:rgba(5,5,5,0.97);border-top:1px solid var(--border);
        backdrop-filter:blur(12px);padding:0;
      }
      .bottomnav button{
        flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;
        gap:3px;padding:10px 4px;background:none;border:none;cursor:pointer;
        font-family:'Cinzel',serif;font-size:7px;letter-spacing:1px;text-transform:uppercase;
        color:var(--muted2);transition:all 0.2s;
      }
      .bottomnav button.active{color:var(--gold)}
      .bottomnav button span.icon{font-size:18px}
      .sheet-grid{grid-template-columns:1fr !important}
      .dash-stats{grid-template-columns:repeat(2,1fr)}
      .dash-sessions{grid-template-columns:1fr}
      .creator-attrs{grid-template-columns:1fr}
      .creator-classes{grid-template-columns:1fr}
      .system-grid{grid-template-columns:1fr}
      .topbar-sys{display:none}
      .main-pad{padding:16px 12px;padding-bottom:80px}
      .step-bar{display:none}
      .step-bar-mobile{display:flex;overflow-x:auto;gap:0;padding:0 16px;scrollbar-width:none}
      .step-bar-mobile::-webkit-scrollbar{display:none}
      .char-meta{grid-template-columns:repeat(2,1fr)}
      .btn-gold{padding:12px 18px;font-size:10px;letter-spacing:2px}
      .btn-ghost{padding:10px 16px}
      .login-card{padding:28px 20px !important;max-width:100% !important}
    }

    @media(max-width:480px){
      .dash-stats{grid-template-columns:repeat(2,1fr)}
      .char-meta{grid-template-columns:1fr 1fr}
    }

    /* ── DESKTOP LOGIN LAYOUT ── */
    .login-layout{display:flex;min-height:100vh}
    .login-left{display:none;flex-direction:column;justify-content:center;width:56%;padding:80px 64px;position:relative;overflow-y:auto;border-right:1px solid var(--border)}
    .login-right{flex:1;display:flex;align-items:center;justify-content:center;padding:40px 20px}

    @media(min-width:1024px){
      .login-left{display:flex}
      .login-right{padding:60px 48px}
      .login-card{max-width:400px !important;width:100% !important}
      .login-logo-mobile{display:none !important}
      .login-quote-mobile{display:none !important}
    }
  `}</style>
);

/* ─── LOGO SVG — ALL-SEEING EYE ─── */
const NexusLogo = ({ size = 40, animate = false }) => (
  <svg width={size} height={size} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg"
    style={animate ? { animation: "glow 3s ease-in-out infinite", display:"block" } : { display:"block" }}>
    <defs>
      <radialGradient id="eyeGold" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#f0d878" />
        <stop offset="50%" stopColor="#c9a84c" />
        <stop offset="100%" stopColor="#7a5510" />
      </radialGradient>
      <radialGradient id="irisGrad" cx="50%" cy="40%" r="55%">
        <stop offset="0%" stopColor="#1a0e00" />
        <stop offset="60%" stopColor="#0a0800" />
        <stop offset="100%" stopColor="#050400" />
      </radialGradient>
      <radialGradient id="pupilGrad" cx="40%" cy="35%" r="60%">
        <stop offset="0%" stopColor="#c9a84c" stopOpacity="0.35" />
        <stop offset="100%" stopColor="#000000" />
      </radialGradient>
      <radialGradient id="glintGrad" cx="30%" cy="30%" r="60%">
        <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
        <stop offset="100%" stopColor="#e8c96d" stopOpacity="0" />
      </radialGradient>
      <filter id="outerGlow" x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur stdDeviation="3" result="blur" />
        <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
      </filter>
      <filter id="softGlow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="1.5" result="blur" />
        <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
      </filter>
      <filter id="strongGlow" x="-40%" y="-40%" width="180%" height="180%">
        <feGaussianBlur stdDeviation="4" result="blur" />
        <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
      </filter>
      <clipPath id="eyeClip">
        <path d="M60 35 Q90 60 60 85 Q30 60 60 35 Z" />
      </clipPath>
    </defs>

    {/* ── Outer ring with tick marks ── */}
    <circle cx="60" cy="60" r="56" stroke="#c9a84c" strokeWidth="0.5" strokeOpacity="0.25" fill="none" />
    <circle cx="60" cy="60" r="52" stroke="#c9a84c" strokeWidth="0.3" strokeOpacity="0.15" fill="none" />

    {/* 24 tick marks around outer ring */}
    {Array.from({length:24}).map((_,i) => {
      const angle = (i * 15) * Math.PI / 180;
      const isMain = i % 6 === 0;
      const isMed  = i % 3 === 0;
      const r1 = 56, r2 = isMain ? 48 : isMed ? 50 : 52;
      return (
        <line key={i}
          x1={60 + r1 * Math.cos(angle)} y1={60 + r1 * Math.sin(angle)}
          x2={60 + r2 * Math.cos(angle)} y2={60 + r2 * Math.sin(angle)}
          stroke="#c9a84c" strokeWidth={isMain ? 1.2 : isMed ? 0.8 : 0.4}
          strokeOpacity={isMain ? 0.9 : isMed ? 0.5 : 0.25}
        />
      );
    })}

    {/* ── 8 ornamental rays behind eye ── */}
    {Array.from({length:8}).map((_,i) => {
      const angle = (i * 45 - 90) * Math.PI / 180;
      const r1 = 18, r2 = 44;
      return (
        <line key={i}
          x1={60 + r1*Math.cos(angle)} y1={60 + r1*Math.sin(angle)}
          x2={60 + r2*Math.cos(angle)} y2={60 + r2*Math.sin(angle)}
          stroke="url(#eyeGold)" strokeWidth="0.7" strokeOpacity="0.4"
          filter="url(#softGlow)"
        />
      );
    })}

    {/* ── Triangle / pyramid frame ── */}
    <polygon
      points="60,14 100,78 20,78"
      fill="none" stroke="url(#eyeGold)" strokeWidth="1.5"
      filter="url(#outerGlow)" strokeOpacity="0.85"
    />
    {/* Inner triangle */}
    <polygon
      points="60,24 93,72 27,72"
      fill="none" stroke="#c9a84c" strokeWidth="0.6" strokeOpacity="0.3"
    />

    {/* Triangle corner diamonds */}
    {[[60,14],[100,78],[20,78]].map(([x,y],i)=>(
      <g key={i} transform={`translate(${x},${y})`}>
        <polygon points="0,-4 3,0 0,4 -3,0" fill="#c9a84c" filter="url(#softGlow)" />
      </g>
    ))}

    {/* ── Eye (blink animation group) ── */}
    <g className="eye-blink-group">

    {/* ── Eye white / sclera glow ── */}
    <path d="M60 36 Q92 60 60 84 Q28 60 60 36 Z"
      fill="#1a1000" stroke="url(#eyeGold)" strokeWidth="1.5"
      filter="url(#outerGlow)" />

    {/* ── Iris ── */}
    <circle cx="60" cy="60" r="16" fill="url(#irisGrad)" />
    {/* Iris texture rings */}
    <circle cx="60" cy="60" r="16" fill="none" stroke="#c9a84c" strokeWidth="0.8" strokeOpacity="0.5" />
    <circle cx="60" cy="60" r="12" fill="none" stroke="#c9a84c" strokeWidth="0.4" strokeOpacity="0.3" />
    {/* Iris fibre lines */}
    {Array.from({length:16}).map((_,i) => {
      const a = (i * 22.5) * Math.PI / 180;
      return (
        <line key={i}
          x1={60 + 6*Math.cos(a)} y1={60 + 6*Math.sin(a)}
          x2={60 + 15*Math.cos(a)} y2={60 + 15*Math.sin(a)}
          stroke="#c9a84c" strokeWidth="0.4" strokeOpacity="0.35"
        />
      );
    })}

    {/* ── Pupil ── */}
    <circle cx="60" cy="60" r="7" fill="url(#pupilGrad)" />
    <circle cx="60" cy="60" r="7" fill="none" stroke="#c9a84c" strokeWidth="0.5" strokeOpacity="0.6" />

    {/* ── Gold vertical slit ── */}
    <ellipse cx="60" cy="60" rx="2.5" ry="6.5" fill="#c9a84c" filter="url(#strongGlow)" opacity="0.9" />

    {/* ── Specular glint ── */}
    <ellipse cx="55" cy="55" rx="3.5" ry="2" fill="url(#glintGrad)" opacity="0.7" transform="rotate(-25,55,55)" />
    <ellipse cx="64" cy="64" rx="1.2" ry="0.7" fill="#ffffff" opacity="0.3" transform="rotate(-25,64,64)" />

    {/* ── Eye lashes / upper lid stroke ── */}
    <path d="M60 36 Q92 60 60 84" fill="none" stroke="url(#eyeGold)" strokeWidth="2" filter="url(#softGlow)" />
    <path d="M60 36 Q28 60 60 84" fill="none" stroke="url(#eyeGold)" strokeWidth="2" filter="url(#softGlow)" />

    {/* ── Eyelash ticks upper ── */}
    {[[-30,-18,-8,0,8,18,30]].flat().map((deg,i) => {
      const angle = (deg) * Math.PI / 180;
      const ex = 60 + 26*Math.sin(angle);
      const ey = 60 - 24*Math.cos(angle);
      const ex2 = 60 + 29*Math.sin(angle);
      const ey2 = 60 - 27*Math.cos(angle);
      return <line key={i} x1={ex} y1={ey} x2={ex2} y2={ey2} stroke="#c9a84c" strokeWidth="1" strokeOpacity="0.7" filter="url(#softGlow)" />;
    })}

    </g>


    {/* ── Corner ornaments ── */}
    {/* Top center dot */}
    <circle cx="60" cy="6" r="2.5" fill="#c9a84c" filter="url(#softGlow)" />
    {/* Side dots on triangle */}
    <circle cx="100" cy="78" r="2" fill="#c9a84c" filter="url(#softGlow)" />
    <circle cx="20"  cy="78" r="2" fill="#c9a84c" filter="url(#softGlow)" />

    {/* ── Bottom decorative line ── */}
    <line x1="30" y1="84" x2="90" y2="84" stroke="#c9a84c" strokeWidth="0.6" strokeOpacity="0.4" />
    <line x1="40" y1="87" x2="80" y2="87" stroke="#c9a84c" strokeWidth="0.4" strokeOpacity="0.2" />
  </svg>
);

/* ─── DECORATIVE LINES ─── */
const Deco = () => (
  <div style={{position:"fixed",inset:0,pointerEvents:"none",zIndex:0,overflow:"hidden"}}>
    <div style={{position:"absolute",top:0,left:"50%",width:1,height:"100%",background:"linear-gradient(to bottom,transparent,rgba(201,168,76,0.05),transparent)"}}/>
    <div style={{position:"absolute",top:"50%",left:0,width:"100%",height:1,background:"linear-gradient(to right,transparent,rgba(201,168,76,0.04),transparent)"}}/>
    {/* Corner ornaments */}
    {[["top:0,left:0","0,0,20,0 0,0 0,20"],["top:0,right:0","100,0 80,0 100,0 100,20"],["bottom:0,left:0","0,100 20,100 0,100 0,80"],["bottom:0,right:0","100,100 80,100 100,100 100,80"]].map(([pos],i)=>(
      <div key={i} style={{position:"absolute",...Object.fromEntries(pos.split(",").map(p=>p.split(":"))),width:40,height:40}}>
        <svg width="40" height="40" viewBox="0 0 40 40"><polyline points={["0,0 20,0 0,0 0,20","40,0 20,0 40,0 40,20","0,40 20,40 0,40 0,20","40,40 20,40 40,40 40,20"][i]} fill="none" stroke="rgba(201,168,76,0.2)" strokeWidth="1"/></svg>
      </div>
    ))}
  </div>
);

/* ═══════════════════════════════
   LOGIN PAGE
═══════════════════════════════ */
const NEXUS_QUOTES = [
  { text: "O Outro Lado sempre existiu. Agora você tem as ferramentas para enfrentá-lo.", author: "Nexus · Protocolo de Iniciação" },
  { text: "Cada ficha é um agente. Cada agente carrega o peso do que não pode ser esquecido.", author: "Nexus · Arquivo 001" },
  { text: "A névoa não some — você apenas aprende a caminhar através dela.", author: "Nexus · Manual do Mestre" },
  { text: "Nenhuma sessão é igual. Nenhum horror se repete da mesma forma. Esteja preparado.", author: "Nexus · Diretriz de Campo" },
  { text: "O sistema não joga por você. Ele apenas garante que você não enfrente o escuro sozinho.", author: "Nexus · Fundação" },
  { text: "Conhecimento é a única proteção real. Documente tudo. Esqueça nada.", author: "Nexus · Protocolo Ordo" },
  { text: "Entre agentes, o silêncio é tão importante quanto a narração.", author: "Nexus · Código de Mesa" },
];

function NexusQuote() {
  const [idx, setIdx] = useState(() => Math.floor(Math.random() * NEXUS_QUOTES.length));
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIdx(i => (i + 1) % NEXUS_QUOTES.length);
        setVisible(true);
      }, 600);
    }, 7000);
    return () => clearInterval(interval);
  }, []);

  const q = NEXUS_QUOTES[idx];

  return (
    <div style={{
      marginTop: 28,
      position: "relative",
    }}>
      {/* Divider ornament */}
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:20 }}>
        <div style={{ flex:1, height:"1px", background:"linear-gradient(to right, transparent, rgba(201,168,76,0.3))" }} />
        <div style={{ display:"flex", gap:5, alignItems:"center" }}>
          <div style={{ width:3, height:3, borderRadius:"50%", background:"var(--gold)", opacity:0.4 }} />
          <div style={{ width:5, height:5, borderRadius:"50%", background:"var(--gold)", opacity:0.7 }} />
          <div style={{ width:3, height:3, borderRadius:"50%", background:"var(--gold)", opacity:0.4 }} />
        </div>
        <div style={{ flex:1, height:"1px", background:"linear-gradient(to left, transparent, rgba(201,168,76,0.3))" }} />
      </div>

      {/* Quote block */}
      <div style={{
        position:"relative",
        padding:"20px 24px",
        background:"linear-gradient(135deg, rgba(201,168,76,0.04), rgba(201,168,76,0.02))",
        border:"1px solid rgba(201,168,76,0.15)",
        borderLeft:"3px solid rgba(201,168,76,0.5)",
        borderRadius:"0 8px 8px 0",
        transition:"opacity 0.5s ease",
        opacity: visible ? 1 : 0,
        minHeight: 90,
      }}>
        {/* Quote icon */}
        <div style={{
          position:"absolute", top:-10, left:16,
          fontFamily:"'Cinzel Decorative',serif", fontSize:28,
          color:"var(--gold)", opacity:0.3, lineHeight:1,
          pointerEvents:"none", userSelect:"none",
        }}>"</div>

        <p style={{
          fontFamily:"Crimson Pro,serif", fontSize:15, fontStyle:"italic",
          color:"var(--text)", lineHeight:1.75, margin:"0 0 10px",
          paddingLeft:8,
        }}>{q.text}</p>

        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <div style={{ width:16, height:"1px", background:"rgba(201,168,76,0.4)" }} />
          <span style={{
            fontFamily:"Cinzel,serif", fontSize:8, letterSpacing:2,
            color:"var(--gold)", textTransform:"uppercase", opacity:0.7,
          }}>{q.author}</span>
        </div>

        {/* Progress dots */}
        <div style={{ display:"flex", gap:5, justifyContent:"center", marginTop:14 }}>
          {NEXUS_QUOTES.map((_,i) => (
            <div key={i} onClick={() => { setVisible(false); setTimeout(()=>{ setIdx(i); setVisible(true); },300); }}
              style={{
                width: i===idx ? 16 : 5, height:5, borderRadius:3,
                background: i===idx ? "var(--gold)" : "rgba(201,168,76,0.2)",
                transition:"all 0.4s ease", cursor:"pointer",
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState("login");
  const [error, setError] = useState("");
  const [resetSent, setResetSent] = useState(false);
  const [keepLoggedIn, setKeepLoggedIn] = useState(() => localStorage.getItem("nx_keep") !== "0");

  const applyPersistence = () => {
    const persistence = keepLoggedIn ? browserLocalPersistence : browserSessionPersistence;
    localStorage.setItem("nx_keep", keepLoggedIn ? "1" : "0");
    return setPersistence(auth, persistence);
  };

  const friendlyError = (code) => {
    if (["auth/invalid-credential","auth/wrong-password","auth/user-not-found","auth/invalid-login-credentials"].includes(code))
      return "E-mail ou senha incorretos.";
    if (code === "auth/email-already-in-use") return "Este e-mail já está em uso.";
    if (code === "auth/weak-password") return "Senha muito fraca (mínimo 6 caracteres).";
    if (code === "auth/invalid-email") return "E-mail inválido.";
    if (code === "auth/too-many-requests") return "Muitas tentativas. Tente novamente mais tarde.";
    if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") return "Login com Google cancelado.";
    if (code === "auth/network-request-failed") return "Erro de conexão. Verifique sua internet.";
    return "Ocorreu um erro. Tente novamente.";
  };

  const handle = async () => {
    setError("");
    if (!email || !pass) return;
    setLoading(true);
    try {
      await applyPersistence();
      if (tab === "login") {
        await signInWithEmailAndPassword(auth, email, pass);
      } else {
        const cred = await createUserWithEmailAndPassword(auth, email, pass);
        if (name) await updateProfile(cred.user, { displayName: name });
      }
      onLogin();
    } catch (e) {
      console.error("auth error:", e.code, e.message);
      setError(friendlyError(e.code));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError("");
    setLoading(true);
    try {
      await applyPersistence();
      await signInWithPopup(auth, googleProvider);
      onLogin();
    } catch (e) {
      setError(friendlyError(e.code));
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    if (!email) { setError("Digite seu e-mail para recuperar a senha."); return; }
    try {
      await sendPasswordResetEmail(auth, email);
      setResetSent(true);
      setError("");
    } catch (e) {
      setError(friendlyError(e.code));
    }
  };

  return (
    <div style={{minHeight:"100vh", background:"var(--bg)", position:"relative", overflow:"hidden"}}>
      <Deco />

      <div className="login-layout">

        {/* ── LEFT PANEL (desktop only) ── */}
        <div className="login-left">
          <div style={{position:"absolute",inset:0,background:"radial-gradient(ellipse at 60% 50%,rgba(201,168,76,0.07) 0%,transparent 65%)",pointerEvents:"none"}}/>
          <div style={{position:"relative",zIndex:1}}>
            <div style={{display:"flex",justifyContent:"center",marginBottom:28,animation:"float 4s ease-in-out infinite"}}>
              <NexusLogo size={110} animate />
            </div>
            <div style={{textAlign:"center",marginBottom:52}}>
              <div style={{fontFamily:"'Cinzel Decorative',serif",fontSize:44,fontWeight:700,
                background:"linear-gradient(135deg,#c9a84c,#e8c96d,#a07830)",
                WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",
                backgroundClip:"text",letterSpacing:8,marginBottom:10}}>NEXUS</div>
              <div style={{fontFamily:"Cinzel,serif",fontSize:10,letterSpacing:4,color:"var(--muted)",textTransform:"uppercase"}}>
                Sistemas de RPG · Inteligência Sobrenatural
              </div>
            </div>

            <div style={{display:"flex",flexDirection:"column",gap:22,marginBottom:52}}>
              {[
                {icon:"◈",title:"Fichas Digitais",desc:"Gerencie personagens com atributos, perícias e inventário completos"},
                {icon:"◉",title:"Ajudante do Mestre",desc:"Narração assistida por inteligência artificial para suas campanhas"},
                {icon:"⬙",title:"Mapas Interativos",desc:"Crie e explore mapas colaborativos com sua mesa"},
                {icon:"♪",title:"Trilhas Sonoras",desc:"Atmosfera imersiva com músicas e ambientações para cada cena"},
              ].map(({icon,title,desc})=>(
                <div key={title} style={{display:"flex",gap:16,alignItems:"flex-start"}}>
                  <div style={{width:40,height:40,borderRadius:8,background:"rgba(201,168,76,0.08)",border:"1px solid var(--border)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:17,flexShrink:0,color:"var(--gold)"}}>
                    {icon}
                  </div>
                  <div>
                    <div style={{fontFamily:"Cinzel,serif",fontSize:11,color:"var(--gold2)",letterSpacing:1,marginBottom:4}}>{title}</div>
                    <div style={{fontFamily:"Crimson Pro,serif",fontSize:14,color:"var(--muted2)",lineHeight:1.55}}>{desc}</div>
                  </div>
                </div>
              ))}
            </div>

            <NexusQuote />
          </div>
        </div>

        {/* ── RIGHT PANEL (form) ── */}
        <div className="login-right">
          <div style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",
            width:600,height:600,borderRadius:"50%",
            background:"radial-gradient(circle,rgba(201,168,76,0.04) 0%,transparent 70%)",
            pointerEvents:"none"}}/>

          <div className="fade login-card" style={{
            width:"100%", maxWidth:440,
            background:"var(--card)", border:"1px solid var(--border2)",
            borderRadius:12, padding:"44px 48px", position:"relative", zIndex:1,
            boxShadow:"0 0 60px rgba(201,168,76,0.08), 0 40px 80px rgba(0,0,0,0.8)",
            animation:"borderGlow 4s ease-in-out infinite",
          }}>
            {/* Logo block — hidden on desktop */}
            <div className="login-logo-mobile" style={{textAlign:"center", marginBottom:32}}>
              <div style={{display:"flex", justifyContent:"center", marginBottom:14, animation:"float 4s ease-in-out infinite"}}>
                <NexusLogo size={72} animate />
              </div>
              <div style={{fontFamily:"'Cinzel Decorative',serif", fontSize:26, fontWeight:700,
                background:"linear-gradient(135deg,#c9a84c,#e8c96d,#a07830)",
                WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent",
                backgroundClip:"text", letterSpacing:4, marginBottom:4}}>NEXUS</div>
              <div style={{fontFamily:"Cinzel,serif", fontSize:9, letterSpacing:4, color:"var(--muted)", textTransform:"uppercase"}}>
                Sistemas de RPG · Inteligência Sobrenatural
              </div>
            </div>

            {/* Tabs */}
            <div style={{display:"flex", borderBottom:"1px solid var(--border)", marginBottom:28}}>
              {["login","register"].map(t => (
                <button key={t} onClick={()=>setTab(t)} style={{
                  flex:1, padding:"10px 0", background:"none", border:"none", cursor:"pointer",
                  fontFamily:"Cinzel,serif", fontSize:10, letterSpacing:2, textTransform:"uppercase",
                  color: tab===t?"var(--gold)":"var(--muted)",
                  borderBottom: tab===t?"2px solid var(--gold)":"2px solid transparent",
                  transition:"all 0.2s", marginBottom:-1,
                }}>{t==="login"?"Entrar":"Criar Conta"}</button>
              ))}
            </div>

            <div style={{display:"flex", flexDirection:"column", gap:14}}>
              {tab==="register" && (
                <div>
                  <div style={{fontFamily:"Cinzel,serif", fontSize:9, letterSpacing:2, color:"var(--muted)", textTransform:"uppercase", marginBottom:7}}>Nome de Agente</div>
                  <input value={name} onChange={e=>setName(e.target.value)} placeholder="Seu nome ou codinome" />
                </div>
              )}
              <div>
                <div style={{fontFamily:"Cinzel,serif", fontSize:9, letterSpacing:2, color:"var(--muted)", textTransform:"uppercase", marginBottom:7}}>E-mail</div>
                <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="agente@ordo.com" onKeyDown={e=>e.key==="Enter"&&handle()} />
              </div>
              <div>
                <div style={{fontFamily:"Cinzel,serif", fontSize:9, letterSpacing:2, color:"var(--muted)", textTransform:"uppercase", marginBottom:7}}>Senha</div>
                <input type="password" value={pass} onChange={e=>setPass(e.target.value)} placeholder="••••••••" onKeyDown={e=>e.key==="Enter"&&handle()} />
              </div>
              {tab==="login" && (
                <div style={{display:"flex", justifyContent:"space-between", alignItems:"center"}}>
                  <label style={{display:"flex", alignItems:"center", gap:7, cursor:"pointer", userSelect:"none"}}
                    onClick={() => setKeepLoggedIn(v => !v)}>
                    <div style={{
                      width:16, height:16, borderRadius:3, border:"1.5px solid",
                      borderColor: keepLoggedIn ? "var(--gold)" : "var(--border2)",
                      background: keepLoggedIn ? "rgba(201,168,76,0.15)" : "transparent",
                      display:"flex", alignItems:"center", justifyContent:"center",
                      flexShrink:0, transition:"all 0.15s",
                    }}>
                      {keepLoggedIn && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 3.5L4 6.5L9 1" stroke="var(--gold)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                    </div>
                    <span style={{fontFamily:"Cinzel,serif", fontSize:9, letterSpacing:1, color: keepLoggedIn ? "var(--gold2)" : "var(--muted)"}}>Manter conectado</span>
                  </label>
                  <span onClick={handleReset} style={{fontFamily:"Cinzel,serif", fontSize:9, letterSpacing:1, color:"var(--muted)", cursor:"pointer", textDecoration:"underline"}}>Esqueci minha senha</span>
                </div>
              )}
              {resetSent && <div style={{fontFamily:"Cinzel,serif",fontSize:10,color:"#7aad6e",textAlign:"center"}}>E-mail de recuperação enviado!</div>}
              {error && <div style={{fontFamily:"Cinzel,serif",fontSize:10,color:"#c96a6a",textAlign:"center"}}>{error}</div>}
              <button className="btn-gold" onClick={handle} disabled={loading} style={{marginTop:8, width:"100%", display:"flex", alignItems:"center", justifyContent:"center", gap:8}}>
                {loading ? (
                  <div style={{width:16,height:16,border:"2px solid rgba(0,0,0,0.3)",borderTopColor:"#050505",borderRadius:"50%",animation:"spin 0.7s linear infinite"}}/>
                ) : (tab==="login"?"Acessar o Nexus":"Registrar Agente")}
              </button>
              <div style={{display:"flex", gap:10, alignItems:"center", margin:"4px 0"}}>
                <div style={{flex:1, height:1, background:"var(--border)"}}/><span style={{fontFamily:"Cinzel,serif", fontSize:9, color:"var(--muted)"}}>ou</span><div style={{flex:1, height:1, background:"var(--border)"}}/>
              </div>
              <button className="btn-ghost" onClick={handleGoogle} disabled={loading} style={{width:"100%"}}>☢ Continuar com Google</button>
            </div>

            {/* Quote — hidden on desktop */}
            <div className="login-quote-mobile">
              <NexusQuote />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

/* ═══════════════════════════════
   SIDEBAR
═══════════════════════════════ */
const navItems = [
  { id:"dashboard", icon:"⬡", label:"Painel" },
  { id:"sheet",     icon:"◈", label:"Fichas" },
  { id:"map",       icon:"⬙", label:"Mapas" },
  { id:"master",    icon:"◉", label:"Ajudante do Mestre" },
  { id:"music",     icon:"♪", label:"Trilhas" },
  { id:"party",     icon:"◎", label:"Grupo" },
];

function Sidebar({ active, onNav, collapsed, setCollapsed, system, onChangeSystem, onLogout }) {
  const [profilePhoto, setProfilePhoto] = useState(() => localStorage.getItem("nexus_profile_photo") || "");
  const [profileName, setProfileName] = useState(() => localStorage.getItem("nexus_profile_name") || "Agente");
  const [editingProfile, setEditingProfile] = useState(false);
  const [editName, setEditName] = useState("");
  const fileInputRef = useRef(null);
  const [pendingPhoto, setPendingPhoto] = useState("");

  const openEdit = () => { setEditName(profileName); setPendingPhoto(profilePhoto); setEditingProfile(true); };
  const closeEdit = () => setEditingProfile(false);
  const saveEdit = () => {
    const name = editName.trim() || "Agente";
    setProfileName(name);
    setProfilePhoto(pendingPhoto);
    localStorage.setItem("nexus_profile_name", name);
    localStorage.setItem("nexus_profile_photo", pendingPhoto);
    setEditingProfile(false);
  };
  const handlePhotoFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setPendingPhoto(ev.target.result);
    reader.readAsDataURL(file);
  };
  const avatarLetter = profileName.trim().charAt(0).toUpperCase() || "A";

  return (
    <div style={{
      width: collapsed ? 60 : 220,
      background:"var(--surface)", borderRight:"1px solid var(--border)",
      display:"flex", flexDirection:"column",
      transition:"width 0.3s ease", overflow:"hidden",
      position:"sticky", top:0, height:"100vh", flexShrink:0,
    }}>
      {/* Logo */}
      <div style={{
        padding: collapsed?"16px 0":"20px 20px",
        borderBottom:"1px solid var(--border)",
        display:"flex", alignItems:"center",
        justifyContent: collapsed?"center":"flex-start",
        gap:12, cursor:"pointer",
      }} onClick={()=>setCollapsed(c=>!c)}>
        <NexusLogo size={32} />
        {!collapsed && (
          <div>
            <div style={{fontFamily:"'Cinzel Decorative',serif", fontSize:14, fontWeight:700,
              background:"linear-gradient(135deg,#c9a84c,#e8c96d)",
              WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", backgroundClip:"text",
              letterSpacing:2}}>NEXUS</div>
            <div style={{fontFamily:"Cinzel,serif", fontSize:7, letterSpacing:2, color:"var(--muted)", textTransform:"uppercase"}}>RPG System</div>
          </div>
        )}
      </div>

      {/* Active system pill */}
      {system && !collapsed && (
        <div style={{
          margin:"12px 12px 4px",
          padding:"8px 12px",
          background:`${system.accent}12`,
          border:`1px solid ${system.accent}35`,
          borderRadius:6,
          display:"flex", alignItems:"center", gap:8,
        }}>
          <span style={{display:"flex",alignItems:"center"}}>{system.svgIcon ? system.svgIcon(false) : system.icon}</span>
          <div style={{flex:1, overflow:"hidden"}}>
            <div style={{fontFamily:"Cinzel,serif", fontSize:9, letterSpacing:1, color:system.accent, textTransform:"uppercase", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis"}}>{system.name}</div>
          </div>
          <button onClick={onChangeSystem} title="Trocar sistema" style={{
            background:"none", border:"none", cursor:"pointer",
            color:"var(--muted)", fontSize:13, padding:"0 2px",
            transition:"color 0.2s",
          }} onMouseEnter={e=>e.target.style.color=system.accent}
             onMouseLeave={e=>e.target.style.color="var(--muted)"}>⇄</button>
        </div>
      )}
      {system && collapsed && (
        <div style={{display:"flex", justifyContent:"center", padding:"8px 0 4px"}} title={system.name}>
          <span style={{display:"flex",alignItems:"center"}}>
            {system.id==="op" ? <OPEnergyIcon size={22}/> : system.id==="dnd" ? <DnDDemonIcon size={22}/> : <span style={{fontSize:16}}>{system.icon}</span>}
          </span>
        </div>
      )}

      {/* Nav */}
      <nav style={{flex:1, padding:"10px 0", display:"flex", flexDirection:"column", gap:2}}>
        {navItems.map(item => (
          <button key={item.id} className={`nav-item ${active===item.id?"active":""}`}
            onClick={()=>onNav(item.id)}
            style={{justifyContent: collapsed?"center":"flex-start", paddingLeft: collapsed?0:14, borderLeft: active===item.id&&!collapsed?"2px solid var(--gold)":"2px solid transparent"}}
            title={collapsed?item.label:""}>
            <span style={{fontSize:16, minWidth:20, textAlign:"center"}}>{item.icon}</span>
            {!collapsed && item.label}
          </button>
        ))}
      </nav>

      {/* User */}
      {collapsed ? (
        <div style={{
          padding:"12px 0", borderTop:"1px solid var(--border)",
          display:"flex", flexDirection:"column", alignItems:"center", gap:8,
        }}>
          <div onClick={openEdit} title="Editar perfil" style={{
            width:32, height:32, borderRadius:"50%",
            background:"linear-gradient(135deg,rgba(201,168,76,0.3),rgba(201,168,76,0.1))",
            border:"2px solid var(--border2)",
            display:"flex", alignItems:"center", justifyContent:"center",
            fontFamily:"Cinzel,serif", fontSize:13, color:"var(--gold)",
            cursor:"pointer", overflow:"hidden", flexShrink:0,
            transition:"border-color 0.2s",
          }}
            onMouseEnter={e=>e.currentTarget.style.borderColor="var(--gold)"}
            onMouseLeave={e=>e.currentTarget.style.borderColor="var(--border2)"}
          >
            {profilePhoto
              ? <img src={profilePhoto} alt="perfil" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
              : avatarLetter}
          </div>
          <button onClick={onLogout} title="Sair da conta" style={{
            background:"none", border:"1px solid rgba(201,168,76,0.2)", borderRadius:6,
            cursor:"pointer", color:"var(--muted2)", padding:"5px",
            display:"flex", alignItems:"center", justifyContent:"center",
            transition:"all 0.2s", width:32, height:28,
          }}
            onMouseEnter={e=>{e.currentTarget.style.color="#e07070";e.currentTarget.style.borderColor="rgba(200,80,80,0.5)";e.currentTarget.style.background="rgba(200,60,60,0.08)";}}
            onMouseLeave={e=>{e.currentTarget.style.color="var(--muted2)";e.currentTarget.style.borderColor="rgba(201,168,76,0.2)";e.currentTarget.style.background="none";}}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
          </button>
        </div>
      ) : (
        <div style={{
          padding:"14px 16px", borderTop:"1px solid var(--border)",
          display:"flex", alignItems:"center", gap:10,
        }}>
          <div onClick={openEdit} title="Editar perfil" style={{
            width:34, height:34, borderRadius:"50%",
            background:"linear-gradient(135deg,rgba(201,168,76,0.3),rgba(201,168,76,0.1))",
            border:"2px solid var(--border2)",
            display:"flex", alignItems:"center", justifyContent:"center",
            fontFamily:"Cinzel,serif", fontSize:13, color:"var(--gold)", flexShrink:0,
            cursor:"pointer", overflow:"hidden", transition:"border-color 0.2s",
          }}
            onMouseEnter={e=>e.currentTarget.style.borderColor="var(--gold)"}
            onMouseLeave={e=>e.currentTarget.style.borderColor="var(--border2)"}
          >
            {profilePhoto
              ? <img src={profilePhoto} alt="perfil" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
              : avatarLetter}
          </div>
          <div style={{overflow:"hidden", flex:1, cursor:"pointer"}} onClick={openEdit} title="Editar perfil">
            <div style={{fontFamily:"Cinzel,serif", fontSize:11, color:"var(--text)", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis"}}>{profileName}</div>
            <div style={{fontFamily:"Cinzel,serif", fontSize:8, letterSpacing:1, color:"var(--gold)", textTransform:"uppercase"}}>✦ Pro</div>
          </div>
          <button onClick={onLogout} title="Sair da conta" style={{
            background:"none", border:"1px solid rgba(201,168,76,0.2)", borderRadius:6,
            cursor:"pointer", color:"var(--muted2)", padding:"5px",
            display:"flex", alignItems:"center", justifyContent:"center",
            transition:"all 0.2s", flexShrink:0,
          }}
            onMouseEnter={e=>{e.currentTarget.style.color="#e07070";e.currentTarget.style.borderColor="rgba(200,80,80,0.5)";e.currentTarget.style.background="rgba(200,60,60,0.08)";}}
            onMouseLeave={e=>{e.currentTarget.style.color="var(--muted2)";e.currentTarget.style.borderColor="rgba(201,168,76,0.2)";e.currentTarget.style.background="none";}}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
          </button>
        </div>
      )}

      {/* Profile edit modal */}
      {editingProfile && createPortal(
        <div onClick={closeEdit} style={{
          position:"fixed", inset:0, background:"rgba(0,0,0,0.7)", zIndex:9999,
          display:"flex", alignItems:"center", justifyContent:"center",
        }}>
          <div onClick={e=>e.stopPropagation()} style={{
            background:"var(--surface)", border:"1px solid var(--border2)",
            borderRadius:12, padding:"28px 28px 24px", width:300,
            display:"flex", flexDirection:"column", alignItems:"center", gap:20,
            boxShadow:"0 20px 60px rgba(0,0,0,0.6)",
          }}>
            <div style={{fontFamily:"Cinzel,serif", fontSize:13, letterSpacing:2, color:"var(--muted)", textTransform:"uppercase"}}>Editar Perfil</div>

            {/* Avatar clicável */}
            <div style={{position:"relative", cursor:"pointer"}} onClick={()=>fileInputRef.current?.click()}>
              <div style={{
                width:80, height:80, borderRadius:"50%",
                background:"linear-gradient(135deg,rgba(201,168,76,0.3),rgba(201,168,76,0.1))",
                border:"2px solid var(--gold)",
                display:"flex", alignItems:"center", justifyContent:"center",
                fontFamily:"Cinzel,serif", fontSize:28, color:"var(--gold)",
                overflow:"hidden",
              }}>
                {pendingPhoto
                  ? <img src={pendingPhoto} alt="perfil" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                  : (editName.trim().charAt(0).toUpperCase() || "A")}
              </div>
              <div style={{
                position:"absolute", inset:0, borderRadius:"50%",
                background:"rgba(0,0,0,0.45)", display:"flex", alignItems:"center", justifyContent:"center",
                opacity:0, transition:"opacity 0.2s",
              }}
                onMouseEnter={e=>e.currentTarget.style.opacity=1}
                onMouseLeave={e=>e.currentTarget.style.opacity=0}
              >
                <span style={{fontSize:18}}>📷</span>
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" style={{display:"none"}} onChange={handlePhotoFile}/>
            </div>
            <div style={{fontSize:11, color:"var(--muted)", fontFamily:"Cinzel,serif", letterSpacing:1, marginTop:-12}}>Clique para trocar</div>

            {/* Nome */}
            <div style={{width:"100%"}}>
              <div style={{fontFamily:"Cinzel,serif", fontSize:9, letterSpacing:2, color:"var(--muted)", textTransform:"uppercase", marginBottom:6}}>Nome do Agente</div>
              <input
                value={editName}
                onChange={e=>setEditName(e.target.value)}
                onKeyDown={e=>{ if(e.key==="Enter") saveEdit(); if(e.key==="Escape") closeEdit(); }}
                maxLength={32}
                placeholder="Agente"
                autoFocus
                style={{
                  width:"100%", boxSizing:"border-box",
                  background:"rgba(255,255,255,0.05)", border:"1px solid var(--border2)",
                  borderRadius:6, padding:"9px 12px",
                  fontFamily:"Cinzel,serif", fontSize:13, color:"var(--text)",
                  outline:"none",
                }}
              />
            </div>

            {/* Botões */}
            <div style={{display:"flex", gap:10, width:"100%"}}>
              <button onClick={closeEdit} style={{
                flex:1, padding:"9px 0", borderRadius:6, cursor:"pointer",
                background:"rgba(255,255,255,0.05)", border:"1px solid var(--border)",
                fontFamily:"Cinzel,serif", fontSize:10, letterSpacing:1, color:"var(--muted)",
                transition:"all 0.2s",
              }}>Cancelar</button>
              <button onClick={saveEdit} className="btn-gold" style={{flex:1, padding:"9px 0", fontSize:11, letterSpacing:1}}>Salvar</button>
            </div>
          </div>
        </div>
      , document.body)}
    </div>
  );
}

/* ═══════════════════════════════
   DASHBOARD
═══════════════════════════════ */
function Dashboard({ system, onCreateChar, characters, sessions, onSelectChar }) {
  const accent = system?.accent || "var(--gold)";
  const accentText = system?.accentText || system?.accent || "var(--gold)";

  const stats = [
    { label:"Fichas Criadas", val: String(characters.length),   icon:"◈", color: accent },
    { label:"Mapas",          val: "0",                          icon:"⬙", color:"#7a9ed4" },
    { label:"Sessões com IA", val: String(sessions.length),      icon:"◉", color:"#8e6dbf" },
    { label:"Horas Jogadas",  val: "0h",                         icon:"◎", color:"#6aaa7a" },
  ];

  /* ── Empty state helpers ── */
  const EmptyChars = () => (
    <div style={{
      display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
      padding:"36px 20px", gap:14, textAlign:"center",
      background:"var(--card)", border:"1px dashed rgba(201,168,76,0.15)",
      borderRadius:8,
    }}>
      <div style={{fontSize:40, opacity:0.3}}>◈</div>
      <div style={{fontFamily:"Cinzel,serif", fontSize:14, letterSpacing:2, color:"var(--muted)", textTransform:"uppercase"}}>
        Nenhum personagem criado
      </div>
      <div style={{fontFamily:"Crimson Pro,serif", fontSize:17, color:"var(--muted)", fontStyle:"italic", maxWidth:280}}>
        Crie sua primeira ficha de agente e ela aparecerá aqui.
      </div>
      <button className="btn-gold" onClick={onCreateChar} style={{fontSize:13, padding:"10px 22px", marginTop:4}}>
        + Criar Primeiro Agente
      </button>
    </div>
  );

  const EmptySessions = () => (
    <div style={{
      display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
      padding:"28px 20px", gap:10, textAlign:"center",
      background:"var(--card)", border:"1px dashed rgba(201,168,76,0.1)",
      borderRadius:8,
    }}>
      <div style={{fontSize:32, opacity:0.3}}>◉</div>
      <div style={{fontFamily:"Cinzel,serif", fontSize:14, letterSpacing:2, color:"var(--muted)", textTransform:"uppercase"}}>Nenhuma sessão ainda</div>
      <div style={{fontFamily:"Crimson Pro,serif", fontSize:16, color:"var(--muted)", fontStyle:"italic"}}>
        Use o Ajudante do Mestre para iniciar sua primeira sessão.
      </div>
    </div>
  );

  return (
    <div className="fade" style={{display:"flex", flexDirection:"column", gap:24}}>

      {/* System banner */}
      <div style={{
        padding:"16px 20px",
        background:`linear-gradient(135deg, ${system?.accent}12, transparent)`,
        border:`1px solid ${system?.accent}30`,
        borderRadius:8, display:"flex", alignItems:"center", gap:14, flexWrap:"wrap",
      }}>
        <span style={{fontSize:28}}>{system?.svgIcon ? system.svgIcon(false) : system?.icon}</span>
        <div>
          <div style={{fontFamily:"Cinzel,serif", fontSize:13, letterSpacing:2, color:accentText, textTransform:"uppercase", marginBottom:3}}>{system?.subtitle}</div>
          <div style={{fontFamily:"'Cinzel Decorative',serif", fontSize:20, color:"var(--text)"}}>{system?.name}</div>
        </div>
        <div style={{marginLeft:"auto", fontFamily:"Crimson Pro,serif", fontSize:16, color:"var(--muted2)", fontStyle:"italic", maxWidth:320, textAlign:"right"}}>
          {system?.desc}
        </div>
      </div>

      {/* Header */}
      <div style={{display:"flex", justifyContent:"space-between", alignItems:"flex-end", flexWrap:"wrap", gap:12}}>
        <div>
          <div style={{fontFamily:"Cinzel,serif", fontSize:12, letterSpacing:3, color:"var(--muted)", textTransform:"uppercase", marginBottom:6}}>Bem-vindo de volta</div>
          <h1 style={{fontFamily:"'Cinzel Decorative',serif", fontSize:24, fontWeight:700,
            background:`linear-gradient(135deg,${accent},#e8c96d)`,
            WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", backgroundClip:"text"}}>Painel do Agente</h1>
        </div>
        <button
          className="btn-gold"
          style={{fontSize:13, padding:"10px 22px", opacity: characters.length >= 5 ? 0.45 : 1, cursor: characters.length >= 5 ? "not-allowed" : "pointer"}}
          onClick={characters.length < 5 ? onCreateChar : undefined}
          disabled={characters.length >= 5}
          title={characters.length >= 5 ? "Limite de 5 fichas atingido" : ""}
        >
          {characters.length >= 5 ? `Limite atingido (5/5)` : "+ Nova Ficha"}
        </button>
      </div>

      {/* Stats */}
      <div style={{display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12}}>
        {stats.map(s=>(
          <div key={s.label} style={{
            background:"var(--card)", border:"1px solid var(--border)",
            borderRadius:8, padding:"18px 16px", display:"flex", gap:12, alignItems:"center",
          }}>
            <div style={{
              width:40, height:40, borderRadius:8, flexShrink:0,
              background:`${s.color}15`, border:`1px solid ${s.color}30`,
              display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, color:s.color,
            }}>{s.icon}</div>
            <div>
              <div style={{fontFamily:"Cinzel,serif", fontSize:12, letterSpacing:2, color:"var(--muted)", textTransform:"uppercase", marginBottom:3}}>{s.label}</div>
              <div style={{fontFamily:"'Cinzel Decorative',serif", fontSize:26, color:s.color}}>{s.val}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Characters */}
      <div>
        <div style={{fontFamily:"Cinzel,serif", fontSize:14, letterSpacing:2, color:accentText, textTransform:"uppercase", marginBottom:14}}>
          Seus Personagens
        </div>
        {characters.length === 0 ? <EmptyChars/> : (
          <div style={{display:"flex", flexDirection:"column", gap:10}}>
            {characters.map((c,i)=>(
              <div key={i} style={{
                background:"var(--card)", border:"1px solid var(--border)", borderRadius:8,
                padding:"14px 18px", display:"flex", alignItems:"center", gap:16,
                cursor:"pointer", transition:"border-color 0.2s",
              }} onClick={()=>onSelectChar && onSelectChar(c)}
                 onMouseEnter={e=>e.currentTarget.style.borderColor=system?.accent+"60"}
                 onMouseLeave={e=>e.currentTarget.style.borderColor="var(--border)"}>
                <div style={{
                  width:72, height:72, borderRadius:8, flexShrink:0,
                  background:`${accent}18`, border:`1px solid ${accent}30`,
                  display:"flex", alignItems:"center", justifyContent:"center", fontSize:30,
                  overflow:"hidden",
                }}>
                  {c.form?.avatar
                    ? <img src={c.form.avatar} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                    : "🕵️"}
                </div>
                <div style={{flex:1, minWidth:0}}>
                  <div style={{fontFamily:"Cinzel,serif", fontSize:17, color:"var(--text)", marginBottom:4, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>
                    {c.form?.personagem || "Sem nome"}
                  </div>
                  <div style={{fontFamily:"Cinzel,serif", fontSize:12, letterSpacing:1, color:"var(--muted)", textTransform:"uppercase"}}>
                    {c.classe?.name || "—"} · {c.origem?.name || "—"} · {system?.name}
                  </div>
                </div>
                {/* NEX mini bar */}
                <div style={{display:"flex", flexDirection:"column", gap:4, minWidth:100}}>
                  <span style={{fontFamily:"Cinzel,serif", fontSize:11, color:"var(--muted)"}}>NEX {c.nex ?? 5}%</span>
                  <div style={{height:4, background:"rgba(255,255,255,0.06)", borderRadius:2}}>
                    <div style={{height:"100%", width:`${c.nex ?? 5}%`, background:`linear-gradient(90deg,${system?.accent||"var(--gold3)"},var(--gold))`, borderRadius:2}}/>
                  </div>
                </div>
                <span style={{fontFamily:"Cinzel,serif", fontSize:11, color:accent, opacity:0.5, flexShrink:0}}>→</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Sessions */}
      <div>
        <div style={{fontFamily:"Cinzel,serif", fontSize:14, letterSpacing:2, color:accentText, textTransform:"uppercase", marginBottom:14}}>
          Últimas Sessões com Ajudante do Mestre
        </div>
        {sessions.length === 0 ? <EmptySessions/> : (
          <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:10}}>
            {sessions.map((s,i)=>(
              <div key={i} style={{
                background:"var(--card)", border:"1px solid var(--border)",
                borderRadius:8, padding:18, cursor:"pointer", transition:"border-color 0.2s",
              }} onMouseEnter={e=>e.currentTarget.style.borderColor=system?.accent+"50"}
                 onMouseLeave={e=>e.currentTarget.style.borderColor="var(--border)"}>
                <div style={{fontSize:28, marginBottom:10}}>{s.icon}</div>
                <div style={{fontFamily:"Cinzel,serif", fontSize:16, color:"var(--text)", marginBottom:6}}>{s.title}</div>
                <div style={{fontFamily:"Cinzel,serif", fontSize:12, letterSpacing:1, color:"var(--muted)"}}>{s.date}</div>
                <div style={{marginTop:10, display:"inline-block", padding:"4px 12px", border:`1px solid ${accent}40`, borderRadius:20, fontFamily:"Cinzel,serif", fontSize:11, color:accent}}>{s.mood}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════
   SHEET LIST — Agent Grid
═══════════════════════════════ */
function SheetList({ characters, system, onCreateChar, onSelectChar }) {
  const [search, setSearch] = useState("");
  const purple = "#7c3aed";
  const purpleHover = "#6d28d9";

  const filtered = characters.filter(c =>
    (c.form?.personagem || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fade" style={{display:"flex", flexDirection:"column", gap:20}}>

      {/* Header row */}
      <div style={{display:"flex", justifyContent:"space-between", alignItems:"center"}}>
        <h2 style={{fontFamily:"Cinzel,serif", fontSize:20, fontWeight:700, color:"var(--text)", letterSpacing:1}}>
          Agentes: {characters.length}/5
        </h2>
        <button onClick={characters.length < 5 ? onCreateChar : undefined} disabled={characters.length >= 5} style={{
          fontFamily:"Cinzel,serif", fontSize:10, letterSpacing:2, textTransform:"uppercase",
          padding:"9px 20px", borderRadius:6, cursor: characters.length >= 5 ? "not-allowed" : "pointer",
          background:"rgba(255,255,255,0.07)", border:"1px solid rgba(255,255,255,0.14)",
          color: characters.length >= 5 ? "var(--muted)" : "var(--text)", transition:"all 0.2s",
          opacity: characters.length >= 5 ? 0.5 : 1,
        }}
          onMouseEnter={e=>{ if(characters.length < 5) e.currentTarget.style.background="rgba(255,255,255,0.12)" }}
          onMouseLeave={e=>{ if(characters.length < 5) e.currentTarget.style.background="rgba(255,255,255,0.07)" }}
          title={characters.length >= 5 ? "Limite de 5 fichas atingido" : ""}>
          {characters.length >= 5 ? "Limite atingido" : "Novo Agente"}
        </button>
      </div>

      {/* Search */}
      <div style={{position:"relative"}}>
        <span style={{position:"absolute", left:14, top:"50%", transform:"translateY(-50%)", color:"var(--muted)", fontSize:17, pointerEvents:"none"}}>🔍</span>
        <input
          placeholder="Buscar"
          value={search}
          onChange={e=>setSearch(e.target.value)}
          style={{paddingLeft:44, borderRadius:8, fontSize:15, background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.07)"}}
        />
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div style={{display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"60px 20px", gap:16, textAlign:"center"}}>
          <div style={{fontSize:48, opacity:0.2}}>🕵️</div>
          <div style={{fontFamily:"Cinzel,serif", fontSize:13, letterSpacing:2, color:"var(--muted)", textTransform:"uppercase"}}>
            {search ? "Nenhum agente encontrado" : "Nenhum agente criado"}
          </div>
          {!search && (
            <button className="btn-gold" onClick={onCreateChar} style={{fontSize:12, padding:"10px 24px", marginTop:4}}>
              + Criar Agente
            </button>
          )}
        </div>
      )}

      {/* Cards grid */}
      {filtered.length > 0 && (
        <div style={{display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:14}}>
          {filtered.map((c, i) => (
            <div key={i} style={{
              background:"var(--card)", borderRadius:10,
              border:"1px solid rgba(255,255,255,0.06)",
              position:"relative", overflow:"hidden",
              transition:"border-color 0.2s, transform 0.2s",
            }}
              onMouseEnter={e=>{e.currentTarget.style.borderColor="rgba(124,58,237,0.45)"; e.currentTarget.style.transform="translateY(-2px)"}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor="rgba(255,255,255,0.06)"; e.currentTarget.style.transform="translateY(0)"}}>

              {/* Gear */}
              <div style={{position:"absolute", top:10, right:12, fontSize:17, color:"rgba(255,255,255,0.3)", cursor:"pointer", zIndex:1}}
                title="Configurações">⚙</div>

              {/* Card body */}
              <div style={{display:"flex", gap:14, padding:"18px 16px 0"}}>
                {/* Avatar */}
                <div style={{
                  width:82, height:82, borderRadius:8, flexShrink:0,
                  background:"rgba(124,58,237,0.12)", border:"1px solid rgba(124,58,237,0.25)",
                  display:"flex", alignItems:"center", justifyContent:"center", fontSize:34,
                  overflow:"hidden",
                }}>
                  {c.form?.avatar
                    ? <img src={c.form.avatar} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                    : "🕵️"}
                </div>

                <div style={{flex:1, minWidth:0, paddingRight:24}}>
                  <div style={{fontFamily:"Cinzel,serif", fontSize:17, fontWeight:700, color:"#fff", marginBottom:5, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>
                    {c.form?.personagem || "Sem nome"}
                  </div>
                  <div style={{fontFamily:"Crimson Pro,serif", fontSize:14, color:"rgba(255,255,255,0.55)", marginBottom:5}}>
                    {c.classe?.name || "—"}
                  </div>
                  <div style={{fontFamily:"Crimson Pro,serif", fontSize:12, color:"rgba(255,255,255,0.3)"}}>
                    Registrado em {c.createdAt || "—"}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div style={{display:"flex", justifyContent:"flex-end", padding:"14px 16px"}}>
                <button onClick={()=>onSelectChar(c)} style={{
                  background:purple, color:"#fff", border:"none",
                  borderRadius:6, padding:"8px 20px",
                  fontFamily:"Cinzel,serif", fontSize:10, letterSpacing:1.5,
                  textTransform:"uppercase", cursor:"pointer", transition:"background 0.2s",
                }}
                  onMouseEnter={e=>{e.currentTarget.style.background=purpleHover}}
                  onMouseLeave={e=>{e.currentTarget.style.background=purple}}>
                  Acessar Ficha
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════
   CHARACTER SHEET
═══════════════════════════════ */
function Sheet({ system }) {
  const accent = system?.accent || "var(--gold)";
  const isOP = system?.id === "op";
  const isDnD = system?.id === "dnd";
  const [hp, setHp] = useState(isOP ? 18 : isDnD ? 58 : 18);
  const [pe, setPe] = useState(isOP ? 12 : 10);
  const [san, setSan] = useState(isOP ? 9 : 10);
  const hpMax = isOP ? 24 : isDnD ? 72 : 24;
  const peMax = isOP ? 16 : 12;
  const sanMax = isOP ? 12 : 10;

  const Ctrl = ({val, set, max, color, label, icon}) => (
    <div style={{background:"var(--card)", border:"1px solid var(--border)", borderRadius:8, padding:16}}>
      <div style={{display:"flex", gap:6, alignItems:"center", marginBottom:8}}>
        <span>{icon}</span>
        <span style={{fontFamily:"Cinzel,serif", fontSize:8, letterSpacing:2, color:"var(--muted)", textTransform:"uppercase"}}>{label}</span>
      </div>
      <div style={{display:"flex", alignItems:"baseline", gap:4, marginBottom:10}}>
        <span style={{fontFamily:"'Cinzel Decorative',serif", fontSize:30, color}}>{val}</span>
        <span style={{fontFamily:"Cinzel,serif", fontSize:14, color:"var(--muted)"}}>/{max}</span>
      </div>
      <div style={{height:5, background:"rgba(255,255,255,0.06)", borderRadius:3, marginBottom:10, overflow:"hidden"}}>
        <div style={{height:"100%", width:`${(val/max)*100}%`, background:color, borderRadius:3, transition:"width 0.3s"}}/>
      </div>
      <div style={{display:"flex", gap:6}}>
        {[-1,+1].map(d=>(
          <button key={d} onClick={()=>set(v=>Math.max(0,Math.min(max,v+d)))} style={{
            flex:1, padding:"5px 0", cursor:"pointer",
            background:"rgba(255,255,255,0.03)", border:"1px solid var(--border)",
            borderRadius:4, color:"var(--text)", fontFamily:"Cinzel,serif", fontSize:14,
            transition:"all 0.15s",
          }}>{d<0?"−":"+"}</button>
        ))}
      </div>
    </div>
  );

  const attrs = isOP
    ? [{n:"Força",v:12},{n:"Agilidade",v:15},{n:"Intelecto",v:17},{n:"Presença",v:9},{n:"Vigor",v:11}]
    : isDnD
    ? [{n:"Força",v:16},{n:"Destreza",v:14},{n:"Constituição",v:15},{n:"Inteligência",v:10},{n:"Sabedoria",v:12},{n:"Carisma",v:8}]
    : [{n:"Atributo 1",v:12},{n:"Atributo 2",v:10},{n:"Atributo 3",v:14}];

  const skills2 = isOP
    ? [{n:"Investigação",b:"+4",p:4},{n:"Ocultismo",b:"+3",p:3},{n:"Percepção",b:"+3",p:3},{n:"Furtividade",b:"+2",p:2},{n:"Medicina",b:"+2",p:2},{n:"Atletismo",b:"+1",p:1},{n:"Persuasão",b:"+1",p:1}]
    : isDnD
    ? [{n:"Percepção",b:"+5",p:4},{n:"Sobrevivência",b:"+4",p:3},{n:"Atletismo",b:"+5",p:3},{n:"Furtividade",b:"+4",p:2},{n:"Natureza",b:"+2",p:2},{n:"Persuasão",b:"+1",p:1}]
    : [{n:"Perícia 1",b:"+3",p:3},{n:"Perícia 2",b:"+2",p:2},{n:"Perícia 3",b:"+1",p:1}];

  return (
    <div className="fade" style={{display:"flex", flexDirection:"column", gap:20}}>
      {/* Hero */}
      <div style={{
        background:"var(--card)", border:"1px solid var(--border2)",
        borderRadius:10, padding:24, display:"flex", gap:20, position:"relative", overflow:"hidden",
      }}>
        <div style={{position:"absolute",top:0,right:0,width:300,height:"100%",
          background:"linear-gradient(to left,rgba(201,168,76,0.03),transparent)",pointerEvents:"none"}}/>
        <div style={{
          width:76, height:76, borderRadius:10, flexShrink:0,
          background:"linear-gradient(135deg,rgba(201,168,76,0.2),rgba(201,168,76,0.05))",
          border:"2px solid var(--border2)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:32,
          boxShadow:"0 0 24px rgba(201,168,76,0.15)",
        }}>🕵️</div>
        <div style={{flex:1}}>
          <div style={{fontFamily:"Cinzel,serif", fontSize:8, letterSpacing:3, color:"var(--muted)", textTransform:"uppercase", marginBottom:5}}>
            {isOP ? "Agente · Ordem Paranormal · NEEx São Paulo" : isDnD ? "Herói · D&D 5ª Edição · Campanha do Rei Sombrio" : `Personagem · ${system?.name}`}
          </div>
          <div style={{fontFamily:"'Cinzel Decorative',serif", fontSize:20, color:"var(--text)", marginBottom:4, animation:"flicker 8s infinite"}}>Dra. Helena Voss</div>
          <div style={{fontFamily:"Crimson Pro,serif", fontSize:14, color:"var(--muted2)", fontStyle:"italic", marginBottom:10}}>Pesquisadora do Sobrenatural · Trilha: Especialista</div>
          <div style={{display:"flex", gap:6}}>
            {["NEX 45%","Veterana","Paranóica"].map(t=>(
              <span key={t} style={{
                fontFamily:"Cinzel,serif", fontSize:8, letterSpacing:1,
                padding:"3px 10px", borderRadius:20,
                border:"1px solid var(--border2)", color:"var(--gold)",
              }}>{t}</span>
            ))}
          </div>
        </div>
        <div style={{textAlign:"center"}}>
          <div style={{fontFamily:"Cinzel,serif", fontSize:8, color:"var(--muted)", letterSpacing:2, textTransform:"uppercase", marginBottom:4}}>XP</div>
          <div style={{fontFamily:"'Cinzel Decorative',serif", fontSize:28, color:"var(--gold)"}}>3.2k</div>
          <div style={{fontFamily:"Cinzel,serif", fontSize:8, color:"var(--muted)"}}>/ 4.000</div>
        </div>
      </div>

      {/* Vitals */}
      <div style={{display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12}}>
        <Ctrl val={hp} set={setHp} max={hpMax} color="#b03020" label="Pontos de Vida" icon="❤️"/>
        <Ctrl val={pe} set={setPe} max={peMax} color={accent} label={isOP?"Pontos de Esforço":"Pontos de Magia"} icon="⚡"/>
        <Ctrl val={san} set={setSan} max={sanMax} color="#7a5ea8" label={isOP?"Sanidade":"Inspiração"} icon={isOP?"🧠":"✨"}/>
      </div>

      {/* Attrs + Skills */}
      <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:14}}>
        <div style={{background:"var(--card)", border:"1px solid var(--border)", borderRadius:8, padding:18}}>
          <div style={{fontFamily:"Cinzel,serif", fontSize:9, letterSpacing:2, color:"var(--gold)", textTransform:"uppercase", marginBottom:14}}>Atributos</div>
          {attrs.map(a=>(
            <div key={a.n} style={{marginBottom:10}}>
              <div style={{display:"flex", justifyContent:"space-between", marginBottom:4}}>
                <span style={{fontFamily:"Crimson Pro,serif", fontSize:14, color:"var(--text)"}}>{a.n}</span>
                <span style={{fontFamily:"Cinzel,serif", fontSize:12, color:"var(--gold)"}}>{a.v}</span>
              </div>
              <div style={{height:4, background:"rgba(255,255,255,0.05)", borderRadius:2, overflow:"hidden"}}>
                <div style={{height:"100%", width:`${(a.v/20)*100}%`, background:"linear-gradient(90deg,var(--gold3),var(--gold2))", borderRadius:2}}/>
              </div>
            </div>
          ))}
        </div>
        <div style={{background:"var(--card)", border:"1px solid var(--border)", borderRadius:8, padding:18}}>
          <div style={{fontFamily:"Cinzel,serif", fontSize:9, letterSpacing:2, color:"var(--gold)", textTransform:"uppercase", marginBottom:14}}>Perícias</div>
          {skills2.map(s=>(
            <div key={s.n} style={{display:"flex", alignItems:"center", gap:8, marginBottom:9}}>
              <div style={{width:6, height:6, borderRadius:"50%", background: s.p>2?"var(--gold)":"var(--muted)", flexShrink:0}}/>
              <span style={{fontFamily:"Crimson Pro,serif", fontSize:14, color:"var(--text)", flex:1}}>{s.n}</span>
              <span style={{fontFamily:"Cinzel,serif", fontSize:11, color:"var(--gold)", minWidth:24}}>{s.b}</span>
              <div style={{display:"flex", gap:2}}>
                {[0,1,2,3,4].map(i=>(
                  <div key={i} style={{width:7, height:7, borderRadius:1, background: i<s.p?"var(--gold)":"rgba(255,255,255,0.06)"}}/>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Rituais */}
      <div style={{background:"var(--card)", border:"1px solid rgba(201,168,76,0.2)", borderRadius:8, padding:18}}>
        <div style={{fontFamily:"Cinzel,serif", fontSize:9, letterSpacing:2, color:"var(--gold)", textTransform:"uppercase", marginBottom:14}}>Rituais Conhecidos</div>
        <div style={{display:"flex", flexDirection:"column", gap:8}}>
          {[{n:"Visão do Além",c:"2 PE",d:"Enxerga entidades e rastros do Outro Lado por 1 cena."},{n:"Escudo Paranormal",c:"3 PE",d:"Barreira etérea que absorve dano de entidades."},{n:"Âncora Espiritual",c:"4 PE",d:"Impede manifestação de entidades por toda a cena."}].map(r=>(
            <div key={r.n} style={{
              display:"flex", gap:14, padding:"10px 14px",
              background:"rgba(201,168,76,0.04)", border:"1px solid rgba(201,168,76,0.12)",
              borderRadius:6,
            }}>
              <span style={{fontFamily:"Cinzel,serif", fontSize:9, color:"var(--gold)", border:"1px solid var(--border2)", borderRadius:3, padding:"3px 8px", height:"fit-content", whiteSpace:"nowrap"}}>{r.c}</span>
              <div>
                <div style={{fontFamily:"Cinzel,serif", fontSize:12, color:"var(--text)", marginBottom:2}}>{r.n}</div>
                <div style={{fontFamily:"Crimson Pro,serif", fontSize:13, color:"var(--muted2)", fontStyle:"italic"}}>{r.d}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════
   PLACEHOLDER SCREENS
═══════════════════════════════ */
function PlaceholderScreen({ icon, title, desc, badge }) {
  return (
    <div className="fade" style={{
      display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
      minHeight:400, gap:20, textAlign:"center",
    }}>
      <div style={{fontSize:64, animation:"float 4s ease-in-out infinite"}}>{icon}</div>
      <div>
        <div style={{fontFamily:"'Cinzel Decorative',serif", fontSize:22,
          background:"linear-gradient(135deg,#c9a84c,#e8c96d)",
          WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", backgroundClip:"text",
          marginBottom:8}}>{title}</div>
        <div style={{fontFamily:"Crimson Pro,serif", fontSize:16, color:"var(--muted2)", maxWidth:400, lineHeight:1.7}}>{desc}</div>
      </div>
      {badge && <div style={{padding:"6px 18px", borderRadius:20, border:"1px solid var(--border2)", fontFamily:"Cinzel,serif", fontSize:9, letterSpacing:2, color:"var(--gold)", textTransform:"uppercase"}}>{badge}</div>}
    </div>
  );
}

/* ── Novidades (editado pelos devs) ── */
const NEWS_ITEMS = [
  {
    id: 1, isNew: true,
    title: "Guilda C.R.I.S. no Portal RPG!",
    image: null,
    desc: "Criamos nossa Guilda no Portal RPG! Entre agora para receber skins exclusivas!",
    link: null, linkLabel: "Veja mais aqui!",
  },
  {
    id: 2, isNew: true,
    title: "Marcas Fragmentadas está no CRIS!",
    image: null,
    desc: "A campanha Marcas Fragmentadas chegou ao CRIS com novos conteúdos exclusivos para os membros.",
    link: null, linkLabel: "Saiba mais",
  },
  {
    id: 3, isNew: true,
    title: "@ArquivosConfidenciais vazados no cris!",
    image: null,
    desc: "Documentos sigilosos foram vazados nos arquivos do CRIS. Confira o conteúdo exclusivo!",
    link: null, linkLabel: "Ver arquivos",
  },
  {
    id: 4, isNew: true,
    title: "O @CultodaCriacao chegou no CRIS!",
    image: null,
    desc: "O Culto da Criação fez sua presença marcada no CRIS. Fique atento às novidades.",
    link: null, linkLabel: "Ver mais",
  },
  {
    id: 5, isNew: true,
    title: "Novas armas chegaram no CRIS!",
    image: null,
    desc: "Um novo arsenal está disponível no CRIS. Confira as armas inéditas que chegaram!",
    link: null, linkLabel: "Ver arsenal",
  },
  {
    id: 6, isNew: true,
    title: "A @TocaDosMonstros está no CRIS!",
    image: null,
    desc: "A Toca dos Monstros chegou ao CRIS trazendo criaturas e encontros inéditos.",
    link: null, linkLabel: "Explorar",
  },
  {
    id: 7, isNew: false,
    title: "Criaturas invadem o CRIS!",
    image: null,
    desc: "Uma nova leva de criaturas foi avistada nos arredores do CRIS. Prepare-se, agente.",
    link: null, linkLabel: "Ver criaturas",
  },
];

/* ═══════════════════════════════
   TOPBAR
═══════════════════════════════ */
function Topbar({ screen, system, onChangeSystem, onLogout }) {
  const labels = { dashboard:"Painel", sheet:"Fichas de Personagem", map:"Editor de Mapas", master:"Ajudante do Mestre", music:"Trilhas Sonoras", party:"Grupo de Agentes" };
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const fileInputRef = useRef(null);

  const [profilePhoto, setProfilePhoto] = useState(() => localStorage.getItem("nexus_profile_photo") || "");
  const [profileName,  setProfileName]  = useState(() => localStorage.getItem("nexus_profile_name")  || "Agente");
  const [editingProfile, setEditingProfile] = useState(false);
  const [editName,    setEditName]    = useState("");
  const [pendingPhoto, setPendingPhoto] = useState("");

  const [notifOpen, setNotifOpen] = useState(false);
  const [selectedNews, setSelectedNews] = useState(NEWS_ITEMS[0]);
  const notifCount = NEWS_ITEMS.filter(n => n.isNew).length;

  const avatarLetter = profileName.trim().charAt(0).toUpperCase() || "A";

  const openProfile = () => {
    setEditName(profileName);
    setPendingPhoto(profilePhoto);
    setMenuOpen(false);
    setEditingProfile(true);
  };
  const closeProfile = () => setEditingProfile(false);
  const saveProfile = () => {
    const name = editName.trim() || "Agente";
    setProfileName(name);
    setProfilePhoto(pendingPhoto);
    localStorage.setItem("nexus_profile_name", name);
    localStorage.setItem("nexus_profile_photo", pendingPhoto);
    setEditingProfile(false);
  };
  const handlePhotoFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setPendingPhoto(ev.target.result);
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    if (!menuOpen) return;
    const close = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [menuOpen]);

  return (
    <>
    <div style={{
      height:56, background:"rgba(8,8,8,0.95)", borderBottom:"1px solid var(--border2)",
      display:"flex", alignItems:"center", padding:"0 24px", gap:16,
      position:"sticky", top:0, zIndex:50, backdropFilter:"blur(12px)",
    }}>
      <div style={{fontFamily:"Cinzel,serif", fontSize:13, color:"var(--gold2)", letterSpacing:0.5}}>{labels[screen]}</div>
      <div style={{height:1, flex:1, background:"var(--border2)"}}/>
      <div style={{display:"flex", gap:14, alignItems:"center"}}>
        {system && (
          <button onClick={onChangeSystem} className="topbar-sys" style={{
            alignItems:"center", gap:8, cursor:"pointer",
            padding:"6px 14px", borderRadius:24,
            background:`linear-gradient(135deg,${system.accent}38,${system.accent}18)`,
            border:`1px solid ${system.accentText}90`,
            fontFamily:"Cinzel,serif", fontSize:9, letterSpacing:2,
            color:system.accentText, textTransform:"uppercase",
            transition:"all 0.25s",
            boxShadow:`0 0 12px ${system.accent}55, inset 0 1px 0 ${system.accentText}25`,
          }}
            onMouseEnter={e=>{e.currentTarget.style.boxShadow=`0 0 20px ${system.accent}99, inset 0 1px 0 ${system.accentText}40`;e.currentTarget.style.borderColor=system.accentText;}}
            onMouseLeave={e=>{e.currentTarget.style.boxShadow=`0 0 12px ${system.accent}55, inset 0 1px 0 ${system.accentText}25`;e.currentTarget.style.borderColor=`${system.accentText}90`;}}
            title="Trocar sistema"
          >
            <span style={{display:"flex",alignItems:"center",filter:`drop-shadow(0 0 4px ${system.accent})`}}>{system?.svgIcon ? system.svgIcon(false) : system?.icon}</span>
            <span style={{textShadow:`0 0 8px ${system.accent}`}}>{system.name}</span>
            <span style={{opacity:0.8, fontSize:11}}>⇄</span>
          </button>
        )}
        <div style={{display:"flex", gap:6, alignItems:"center"}}>
          <div style={{width:6, height:6, borderRadius:"50%", background:"#4caf50", boxShadow:"0 0 6px #4caf50", animation:"pulse 2s infinite"}}/>
          <span style={{fontFamily:"Cinzel,serif", fontSize:8, letterSpacing:2, color:"var(--muted2)", textTransform:"uppercase"}}>Online</span>
        </div>
        <div style={{
          padding:"4px 12px", borderRadius:20,
          background:"linear-gradient(135deg,rgba(201,168,76,0.25),rgba(201,168,76,0.08))",
          border:"1px solid var(--border2)",
          fontFamily:"Cinzel,serif", fontSize:8, letterSpacing:2, color:"var(--gold2)", textTransform:"uppercase",
        }}>✦ Plano Pro</div>

        {/* Avatar + dropdown */}
        <div ref={menuRef} style={{position:"relative"}}>
          <div style={{position:"relative", display:"inline-block"}}>
            <button onClick={()=>setMenuOpen(o=>!o)} style={{
              width:44, height:44, borderRadius:"50%", padding:0,
              background:"none", border:"2px solid var(--border2)",
              cursor:"pointer", overflow:"hidden", display:"block",
              transition:"border-color 0.2s",
            }}
              onMouseEnter={e=>e.currentTarget.style.borderColor="var(--gold2)"}
              onMouseLeave={e=>e.currentTarget.style.borderColor="var(--border2)"}
            >
              {profilePhoto
                ? <img src={profilePhoto} alt="avatar" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                : <span style={{
                    display:"flex",alignItems:"center",justifyContent:"center",
                    width:"100%",height:"100%",
                    fontFamily:"Cinzel,serif", fontSize:14, fontWeight:700,
                    background:"linear-gradient(135deg,rgba(140,60,220,0.5),rgba(100,30,180,0.3))",
                    color:"var(--gold2)",
                  }}>{avatarLetter}</span>
              }
            </button>
            {notifCount > 0 && (
              <span style={{
                position:"absolute", bottom:-5, right:-5,
                background:"#e03333", color:"#fff",
                borderRadius:"50%", minWidth:20, height:20,
                padding:"0 3px",
                fontSize:11, fontWeight:700, fontFamily:"Cinzel,serif",
                display:"flex", alignItems:"center", justifyContent:"center",
                border:"2px solid #0e0e14",
                boxShadow:"0 0 8px rgba(220,50,50,0.8)",
                pointerEvents:"none",
              }}>{notifCount}</span>
            )}
          </div>

          {menuOpen && (
            <div style={{
              position:"absolute", top:"calc(100% + 10px)", right:0,
              background:"rgba(18,12,30,0.97)", border:"1px solid var(--border2)",
              borderRadius:12, padding:"8px 0", minWidth:200,
              boxShadow:"0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)",
              backdropFilter:"blur(16px)", zIndex:200,
            }}>
              {[
                { icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>, label:"Ver Perfil", badge:0, action: openProfile },
                { icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>, label:"Notificações", badge:notifCount, action:()=>{ setMenuOpen(false); setSelectedNews(NEWS_ITEMS[0]); setNotifOpen(true); } },
                { icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>, label:"Desconectar", badge:0, action:()=>{ setMenuOpen(false); onLogout(); }, danger:true },
              ].map(({ icon, label, badge, action, danger }) => (
                <button key={label} onClick={action} style={{
                  display:"flex", alignItems:"center", gap:12,
                  width:"100%", padding:"10px 18px",
                  background:"none", border:"none", cursor:"pointer",
                  color: danger ? "#e07070" : "var(--muted2)",
                  fontFamily:"Cinzel,serif", fontSize:10, letterSpacing:1,
                  textTransform:"uppercase", textAlign:"left",
                  transition:"background 0.15s, color 0.15s",
                }}
                  onMouseEnter={e=>{ e.currentTarget.style.background="rgba(255,255,255,0.05)"; if(!danger) e.currentTarget.style.color="#fff"; }}
                  onMouseLeave={e=>{ e.currentTarget.style.background="none"; e.currentTarget.style.color=danger?"#e07070":"var(--muted2)"; }}
                >
                  <span style={{
                    width:30, height:30, borderRadius:"50%",
                    background: danger ? "rgba(220,80,80,0.15)" : "rgba(140,60,220,0.2)",
                    display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0,
                  }}>{icon}</span>
                  <span style={{flex:1}}>{label}</span>
                  {badge > 0 && (
                    <span style={{
                      background:"#e05555", color:"#fff", borderRadius:10,
                      padding:"1px 7px", fontSize:9, fontWeight:700,
                    }}>{badge}</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>

    {/* Notifications modal */}
    {notifOpen && createPortal(
      <div onClick={()=>setNotifOpen(false)} style={{
        position:"fixed", inset:0, background:"rgba(0,0,0,0.8)", zIndex:9999,
        display:"flex", alignItems:"center", justifyContent:"center",
      }}>
        <div onClick={e=>e.stopPropagation()} style={{
          width:"min(900px, 95vw)", height:"min(560px, 90vh)",
          background:"#0e0e14", border:"1px solid rgba(140,60,220,0.4)",
          borderRadius:16, overflow:"hidden", display:"flex",
          boxShadow:"0 24px 80px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.04)",
        }}>
          {/* Left — lista */}
          <div style={{
            width:260, borderRight:"1px solid rgba(140,60,220,0.25)",
            display:"flex", flexDirection:"column", flexShrink:0,
          }}>
            <div style={{
              padding:"20px 20px 14px",
              borderBottom:"1px solid rgba(140,60,220,0.2)",
              fontFamily:"Cinzel,serif", fontSize:15, color:"#fff", letterSpacing:1,
            }}>Novidades</div>
            <div style={{flex:1, overflowY:"auto", padding:"8px 0"}}>
              {NEWS_ITEMS.map(item => (
                <button key={item.id} onClick={()=>setSelectedNews(item)} style={{
                  width:"100%", padding:"12px 18px",
                  background: selectedNews?.id===item.id ? "rgba(140,60,220,0.15)" : "none",
                  border:"none", borderLeft: selectedNews?.id===item.id ? "3px solid rgba(140,60,220,0.8)" : "3px solid transparent",
                  cursor:"pointer", textAlign:"left",
                  display:"flex", alignItems:"center", gap:10,
                  transition:"background 0.15s",
                }}
                  onMouseEnter={e=>{ if(selectedNews?.id!==item.id) e.currentTarget.style.background="rgba(255,255,255,0.04)"; }}
                  onMouseLeave={e=>{ if(selectedNews?.id!==item.id) e.currentTarget.style.background="none"; }}
                >
                  <span style={{
                    fontFamily:"Cinzel,serif", fontSize:11, color: selectedNews?.id===item.id ? "#c8a8f0" : "rgba(255,255,255,0.7)",
                    lineHeight:1.4, flex:1,
                  }}>{item.title}</span>
                  {item.isNew && <span style={{width:8, height:8, borderRadius:"50%", background:"#e05555", flexShrink:0}}/>}
                </button>
              ))}
            </div>
          </div>

          {/* Right — conteúdo */}
          <div style={{flex:1, display:"flex", flexDirection:"column", overflowY:"auto"}}>
            {/* Close */}
            <div style={{display:"flex", justifyContent:"flex-end", padding:"14px 18px 0"}}>
              <button onClick={()=>setNotifOpen(false)} style={{
                background:"none", border:"none", cursor:"pointer",
                color:"rgba(255,255,255,0.4)", fontSize:20, lineHeight:1,
                transition:"color 0.2s",
              }}
                onMouseEnter={e=>e.currentTarget.style.color="#fff"}
                onMouseLeave={e=>e.currentTarget.style.color="rgba(255,255,255,0.4)"}
              >✕</button>
            </div>

            {selectedNews && (
              <div style={{padding:"0 32px 32px", display:"flex", flexDirection:"column", gap:20}}>
                <a href={selectedNews.link||"#"} target="_blank" rel="noopener noreferrer" style={{
                  fontFamily:"Cinzel,serif", fontSize:18, color:"#a070e8",
                  textDecoration:"underline", textDecorationColor:"rgba(160,112,232,0.4)",
                  lineHeight:1.3,
                }}>{selectedNews.title}</a>

                {selectedNews.image && (
                  <div style={{borderRadius:10, overflow:"hidden", maxWidth:460, alignSelf:"center"}}>
                    <img src={selectedNews.image} alt={selectedNews.title} style={{width:"100%", display:"block"}}/>
                  </div>
                )}

                <p style={{
                  fontFamily:"Crimson Pro,serif", fontSize:15, color:"rgba(255,255,255,0.85)",
                  lineHeight:1.7, margin:0,
                }}>{selectedNews.desc}</p>

                {selectedNews.linkLabel && (
                  <a href={selectedNews.link||"#"} target="_blank" rel="noopener noreferrer" style={{
                    fontFamily:"Cinzel,serif", fontSize:13, color:"#a070e8",
                    textDecoration:"underline",
                  }}>{selectedNews.linkLabel}</a>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    , document.body)}

    {/* Profile modal */}
    {editingProfile && createPortal(
      <div onClick={closeProfile} style={{
        position:"fixed", inset:0, background:"rgba(0,0,0,0.75)", zIndex:9999,
        display:"flex", alignItems:"center", justifyContent:"center",
      }}>
        <div onClick={e=>e.stopPropagation()} style={{
          background:"var(--surface)", border:"1px solid var(--border2)",
          borderRadius:14, padding:"28px 28px 24px", width:320,
          display:"flex", flexDirection:"column", alignItems:"center", gap:20,
          boxShadow:"0 20px 60px rgba(0,0,0,0.7)",
        }}>
          <div style={{fontFamily:"Cinzel,serif", fontSize:13, letterSpacing:2, color:"var(--muted)", textTransform:"uppercase"}}>Editar Perfil</div>

          {/* Avatar clicável */}
          <div style={{position:"relative", cursor:"pointer"}} onClick={()=>fileInputRef.current?.click()}>
            <div style={{
              width:88, height:88, borderRadius:"50%",
              background:"linear-gradient(135deg,rgba(201,168,76,0.3),rgba(201,168,76,0.1))",
              border:"2px solid var(--gold)",
              display:"flex", alignItems:"center", justifyContent:"center",
              fontFamily:"Cinzel,serif", fontSize:30, color:"var(--gold)",
              overflow:"hidden",
            }}>
              {pendingPhoto
                ? <img src={pendingPhoto} alt="perfil" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                : (editName.trim().charAt(0).toUpperCase() || "A")}
            </div>
            <div style={{
              position:"absolute", inset:0, borderRadius:"50%",
              background:"rgba(0,0,0,0.45)", display:"flex", alignItems:"center", justifyContent:"center",
              opacity:0, transition:"opacity 0.2s",
            }}
              onMouseEnter={e=>e.currentTarget.style.opacity=1}
              onMouseLeave={e=>e.currentTarget.style.opacity=0}
            >
              <span style={{fontSize:20}}>📷</span>
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" style={{display:"none"}} onChange={handlePhotoFile}/>
          </div>
          <div style={{fontSize:11, color:"var(--muted)", fontFamily:"Cinzel,serif", letterSpacing:1, marginTop:-12}}>Clique para trocar</div>

          {/* Nome */}
          <div style={{width:"100%"}}>
            <div style={{fontFamily:"Cinzel,serif", fontSize:9, letterSpacing:2, color:"var(--muted)", textTransform:"uppercase", marginBottom:6}}>Nome do Agente</div>
            <input
              value={editName}
              onChange={e=>setEditName(e.target.value)}
              onKeyDown={e=>{ if(e.key==="Enter") saveProfile(); if(e.key==="Escape") closeProfile(); }}
              maxLength={32}
              placeholder="Agente"
              autoFocus
              style={{
                width:"100%", boxSizing:"border-box",
                background:"rgba(255,255,255,0.05)", border:"1px solid var(--border2)",
                borderRadius:6, padding:"9px 12px",
                fontFamily:"Cinzel,serif", fontSize:13, color:"var(--text)",
                outline:"none",
              }}
            />
          </div>

          {/* Botões */}
          <div style={{display:"flex", gap:10, width:"100%"}}>
            <button onClick={closeProfile} style={{
              flex:1, padding:"9px 0", borderRadius:6, cursor:"pointer",
              background:"rgba(255,255,255,0.05)", border:"1px solid var(--border)",
              fontFamily:"Cinzel,serif", fontSize:10, letterSpacing:1, color:"var(--muted)",
              transition:"all 0.2s",
            }}>Cancelar</button>
            <button onClick={saveProfile} className="btn-gold" style={{flex:1, padding:"9px 0", fontSize:11, letterSpacing:1}}>Salvar</button>
          </div>
        </div>
      </div>
    , document.body)}
    </>
  );
}

/* ─── ORDEM PARANORMAL — ÍCONE DE ENERGIA ─── */
const OPEnergyIcon = ({ size = 48, glow = false }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg"
    style={{ display:"block", filter: glow ? "drop-shadow(0 0 8px rgba(180,60,220,0.9)) drop-shadow(0 0 20px rgba(140,30,200,0.5))" : "drop-shadow(0 0 4px rgba(180,60,220,0.5))" }}>
    <defs>
      <radialGradient id="opGrad" cx="50%" cy="45%" r="55%">
        <stop offset="0%" stopColor="#e060f0" />
        <stop offset="50%" stopColor="#b030d8" />
        <stop offset="100%" stopColor="#6010a0" />
      </radialGradient>
      <radialGradient id="opGlow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#c040e8" stopOpacity="0.3" />
        <stop offset="100%" stopColor="#8020c0" stopOpacity="0" />
      </radialGradient>
      <filter id="opBlur">
        <feGaussianBlur stdDeviation="1.2" result="b"/>
        <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
    </defs>

    {/* Ambient glow behind */}
    <circle cx="50" cy="52" r="30" fill="url(#opGlow)" />

    {/* Flores estilizadas na base */}
    {/* Caule central */}
    <path d="M50 88 Q50 72 50 62" stroke="url(#opGrad)" strokeWidth="1.5" strokeLinecap="round" opacity="0.6"/>
    {/* Caules laterais */}
    <path d="M50 80 Q44 74 38 70" stroke="url(#opGrad)" strokeWidth="1.2" strokeLinecap="round" opacity="0.5"/>
    <path d="M50 80 Q56 74 62 70" stroke="url(#opGrad)" strokeWidth="1.2" strokeLinecap="round" opacity="0.5"/>
    <path d="M50 76 Q42 72 35 72" stroke="url(#opGrad)" strokeWidth="1" strokeLinecap="round" opacity="0.4"/>
    <path d="M50 76 Q58 72 65 72" stroke="url(#opGrad)" strokeWidth="1" strokeLinecap="round" opacity="0.4"/>
    {/* Pétalas esquerda */}
    <ellipse cx="35" cy="68" rx="5" ry="3" fill="none" stroke="#b030d8" strokeWidth="1" opacity="0.6" transform="rotate(-30,35,68)"/>
    <ellipse cx="38" cy="65" rx="4" ry="2.5" fill="none" stroke="#c040e8" strokeWidth="0.8" opacity="0.5" transform="rotate(20,38,65)"/>
    {/* Pétalas direita */}
    <ellipse cx="65" cy="68" rx="5" ry="3" fill="none" stroke="#b030d8" strokeWidth="1" opacity="0.6" transform="rotate(30,65,68)"/>
    <ellipse cx="62" cy="65" rx="4" ry="2.5" fill="none" stroke="#c040e8" strokeWidth="0.8" opacity="0.5" transform="rotate(-20,62,65)"/>
    {/* Botão floral central base */}
    <circle cx="50" cy="88" r="2.5" fill="#b030d8" opacity="0.7" filter="url(#opBlur)"/>
    <circle cx="38" cy="70" r="2" fill="#9020c0" opacity="0.6"/>
    <circle cx="62" cy="70" r="2" fill="#9020c0" opacity="0.6"/>

    {/* Raios de energia — as chamas serpenteantes */}
    {/* Raio esquerdo */}
    <path d="M36 60 Q30 48 34 36 Q38 24 32 14"
      stroke="url(#opGrad)" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.55" filter="url(#opBlur)"/>
    {/* Raio direito */}
    <path d="M64 60 Q70 48 66 36 Q62 24 68 14"
      stroke="url(#opGrad)" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.55" filter="url(#opBlur)"/>
    {/* Raio central secundário */}
    <path d="M50 60 Q46 48 50 36 Q54 26 48 16"
      stroke="#c040e8" strokeWidth="1" strokeLinecap="round" fill="none" opacity="0.35" filter="url(#opBlur)"/>

    {/* ── Símbolo principal — forma geométrica angular (V+seta+chama) ── */}
    {/* Flecha/chama central superior */}
    <path d="M50 14 L44 26 L48 24 L44 38 L50 30 L56 38 L52 24 L56 26 Z"
      fill="url(#opGrad)" filter="url(#opBlur)" opacity="0.95"/>
    {/* Corpo do V */}
    <path d="M38 34 L50 54 L62 34"
      stroke="url(#opGrad)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" filter="url(#opBlur)"/>
    {/* Traço horizontal/asa esquerda */}
    <path d="M32 40 L44 40" stroke="#d050f0" strokeWidth="2" strokeLinecap="round" opacity="0.8" filter="url(#opBlur)"/>
    {/* Traço horizontal/asa direita */}
    <path d="M56 40 L68 40" stroke="#d050f0" strokeWidth="2" strokeLinecap="round" opacity="0.8" filter="url(#opBlur)"/>
    {/* Gancho esquerdo */}
    <path d="M32 40 Q28 46 32 52" stroke="#b030d8" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.7"/>
    {/* Gancho direito */}
    <path d="M68 40 Q72 46 68 52" stroke="#b030d8" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.7"/>

    {/* Ponto central brilhante */}
    <circle cx="50" cy="54" r="3" fill="#e060f0" filter="url(#opBlur)"/>
    <circle cx="50" cy="54" r="1.5" fill="#ffffff" opacity="0.8"/>

    {/* Micro partículas */}
    {[[40,20],[60,18],[34,30],[66,28],[43,50],[57,50]].map(([x,y],i)=>(
      <circle key={i} cx={x} cy={y} r="1" fill="#d050f0" opacity={0.4 + (i%3)*0.15} filter="url(#opBlur)"/>
    ))}
  </svg>
);

/* ═══════════════════════════════
   SYSTEM SELECT
═══════════════════════════════ */
/* ─── D&D — ÍCONE D20 DEMONÍACO ─── */
const DnDDemonIcon = ({ size = 48, glow = false }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg"
    style={{ display:"block", filter: glow
      ? "drop-shadow(0 0 8px rgba(220,60,60,0.95)) drop-shadow(0 0 22px rgba(180,30,30,0.6))"
      : "drop-shadow(0 0 4px rgba(200,50,50,0.55))" }}>
    <defs>
      <radialGradient id="dndFace" cx="50%" cy="45%" r="55%">
        <stop offset="0%" stopColor="#f07040"/>
        <stop offset="45%" stopColor="#c03020"/>
        <stop offset="100%" stopColor="#6a0808"/>
      </radialGradient>
      <radialGradient id="dndEye" cx="42%" cy="38%" r="58%">
        <stop offset="0%" stopColor="#ffe080"/>
        <stop offset="40%" stopColor="#e0a020"/>
        <stop offset="100%" stopColor="#804000"/>
      </radialGradient>
      <radialGradient id="dndGlow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#c03020" stopOpacity="0.35"/>
        <stop offset="100%" stopColor="#800010" stopOpacity="0"/>
      </radialGradient>
      <radialGradient id="demonGlow" cx="50%" cy="20%" r="50%">
        <stop offset="0%" stopColor="#ff4040" stopOpacity="0.5"/>
        <stop offset="100%" stopColor="#800010" stopOpacity="0"/>
      </radialGradient>
      <filter id="dndBlur">
        <feGaussianBlur stdDeviation="1" result="b"/>
        <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
      <filter id="dndSoft">
        <feGaussianBlur stdDeviation="0.6" result="b"/>
        <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
    </defs>

    {/* Ambient red glow */}
    <circle cx="50" cy="55" r="36" fill="url(#dndGlow)"/>
    {/* Demon glow top */}
    <ellipse cx="50" cy="18" rx="28" ry="16" fill="url(#demonGlow)"/>

    {/* ── Demon creature top ── */}
    {/* Head silhouette */}
    <ellipse cx="50" cy="16" rx="10" ry="8" fill="#1a0a0a" filter="url(#dndSoft)"/>
    {/* Left wing */}
    <path d="M40 16 Q28 8 18 12 Q24 18 30 20 Q22 20 16 26 Q26 22 36 22"
      fill="#1a0a0a" filter="url(#dndSoft)"/>
    {/* Right wing */}
    <path d="M60 16 Q72 8 82 12 Q76 18 70 20 Q78 20 84 26 Q74 22 64 22"
      fill="#1a0a0a" filter="url(#dndSoft)"/>
    {/* Glowing red eyes */}
    <circle cx="46" cy="14" r="2.5" fill="#ff2020" filter="url(#dndBlur)"/>
    <circle cx="54" cy="14" r="2.5" fill="#ff2020" filter="url(#dndBlur)"/>
    <circle cx="46" cy="14" r="1.2" fill="#ffaaaa"/>
    <circle cx="54" cy="14" r="1.2" fill="#ffaaaa"/>

    {/* ── Tentacles ── */}
    {/* Left tentacles */}
    <path d="M30 48 Q18 42 14 50 Q10 58 16 62" stroke="#1e0808" strokeWidth="3.5" strokeLinecap="round" fill="none" filter="url(#dndSoft)"/>
    <path d="M32 56 Q20 55 16 64 Q14 72 20 74" stroke="#1e0808" strokeWidth="3" strokeLinecap="round" fill="none" filter="url(#dndSoft)"/>
    <path d="M34 64 Q24 68 22 78 Q24 84 20 88" stroke="#1e0808" strokeWidth="2.5" strokeLinecap="round" fill="none" filter="url(#dndSoft)"/>
    {/* Curl ends left */}
    <path d="M16 62 Q12 66 16 68 Q20 70 18 66" stroke="#1e0808" strokeWidth="2" strokeLinecap="round" fill="none"/>
    <path d="M20 74 Q16 80 20 82 Q24 82 22 78" stroke="#1e0808" strokeWidth="1.8" strokeLinecap="round" fill="none"/>
    {/* Right tentacles */}
    <path d="M70 48 Q82 42 86 50 Q90 58 84 62" stroke="#1e0808" strokeWidth="3.5" strokeLinecap="round" fill="none" filter="url(#dndSoft)"/>
    <path d="M68 56 Q80 55 84 64 Q86 72 80 74" stroke="#1e0808" strokeWidth="3" strokeLinecap="round" fill="none" filter="url(#dndSoft)"/>
    <path d="M66 64 Q76 68 78 78 Q76 84 80 88" stroke="#1e0808" strokeWidth="2.5" strokeLinecap="round" fill="none" filter="url(#dndSoft)"/>
    {/* Curl ends right */}
    <path d="M84 62 Q88 66 84 68 Q80 70 82 66" stroke="#1e0808" strokeWidth="2" strokeLinecap="round" fill="none"/>
    <path d="M80 74 Q84 80 80 82 Q76 82 78 78" stroke="#1e0808" strokeWidth="1.8" strokeLinecap="round" fill="none"/>

    {/* ── D20 icosahedron ── */}
    {/* Outer polygon — 20-sided approximated as layered shapes */}
    {/* Main d20 shape — icosahedron front face */}
    <polygon points="50,24 72,34 78,56 64,74 36,74 22,56 28,34"
      fill="url(#dndFace)" stroke="#2a0808" strokeWidth="1.5" filter="url(#dndSoft)"/>
    {/* Inner edge structure */}
    {/* Top triangle */}
    <polygon points="50,28 68,38 32,38"
      fill="none" stroke="#2a0808" strokeWidth="1.2" opacity="0.8"/>
    {/* Middle band lines */}
    <line x1="32" y1="38" x2="22" y2="56" stroke="#2a0808" strokeWidth="1.2" opacity="0.8"/>
    <line x1="68" y1="38" x2="78" y2="56" stroke="#2a0808" strokeWidth="1.2" opacity="0.8"/>
    <line x1="22" y1="56" x2="36" y2="74" stroke="#2a0808" strokeWidth="1.2" opacity="0.8"/>
    <line x1="78" y1="56" x2="64" y2="74" stroke="#2a0808" strokeWidth="1.2" opacity="0.8"/>
    <line x1="36" y1="74" x2="64" y2="74" stroke="#2a0808" strokeWidth="1.2" opacity="0.8"/>
    {/* Center vertical */}
    <line x1="50" y1="28" x2="50" y2="74" stroke="#2a0808" strokeWidth="1" opacity="0.5"/>
    {/* Horizontal mid */}
    <line x1="22" y1="56" x2="78" y2="56" stroke="#2a0808" strokeWidth="1" opacity="0.5"/>
    {/* Diagonals from mid-top */}
    <line x1="32" y1="38" x2="64" y2="74" stroke="#2a0808" strokeWidth="0.8" opacity="0.4"/>
    <line x1="68" y1="38" x2="36" y2="74" stroke="#2a0808" strokeWidth="0.8" opacity="0.4"/>

    {/* ── Central triangle with eye ── */}
    <polygon points="50,32 66,56 34,56"
      fill="#2a0808" stroke="#e08020" strokeWidth="1" filter="url(#dndBlur)" opacity="0.9"/>
    {/* Eye white glow */}
    <ellipse cx="50" cy="46" rx="10" ry="6" fill="#e09020" filter="url(#dndBlur)" opacity="0.8"/>
    {/* Iris */}
    <ellipse cx="50" cy="46" rx="7" ry="5" fill="url(#dndEye)"/>
    <ellipse cx="50" cy="46" rx="7" ry="5" fill="none" stroke="#c07010" strokeWidth="0.8" opacity="0.7"/>
    {/* Slit pupil */}
    <ellipse cx="50" cy="46" rx="2" ry="4.5" fill="#1a0800"/>
    <ellipse cx="50" cy="46" rx="2" ry="4.5" fill="none" stroke="#c07010" strokeWidth="0.5" opacity="0.6"/>
    {/* Glint */}
    <ellipse cx="47" cy="43.5" rx="2" ry="1.2" fill="#ffffff" opacity="0.6" transform="rotate(-20,47,43.5)"/>

    {/* ── Numbers on d20 faces ── */}
    <text x="50" y="35" textAnchor="middle" fontFamily="serif" fontSize="4" fill="#f0c060" opacity="0.9" fontWeight="bold">20</text>
    <text x="26" y="50" textAnchor="middle" fontFamily="serif" fontSize="4" fill="#f0c060" opacity="0.8">12</text>
    <text x="74" y="50" textAnchor="middle" fontFamily="serif" fontSize="4" fill="#f0c060" opacity="0.8">14</text>
    <text x="38" y="69" textAnchor="middle" fontFamily="serif" fontSize="4" fill="#f0c060" opacity="0.8">8</text>
    <text x="62" y="69" textAnchor="middle" fontFamily="serif" fontSize="4" fill="#f0c060" opacity="0.8">16</text>
    <text x="50" y="73" textAnchor="middle" fontFamily="serif" fontSize="3.5" fill="#f0c060" opacity="0.7">10</text>

    {/* ── Blood drips ── */}
    <path d="M42 74 Q41 80 42 85 Q43 88 42 92" stroke="#800010" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.8"/>
    <path d="M50 74 Q50 82 49 88 Q48 92 50 95" stroke="#800010" strokeWidth="1.8" strokeLinecap="round" fill="none" opacity="0.7"/>
    <path d="M58 74 Q59 80 58 84 Q57 86 58 88" stroke="#800010" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.6"/>
    <ellipse cx="42" cy="92" rx="2" ry="1.5" fill="#800010" opacity="0.7"/>
    <ellipse cx="49" cy="95" rx="1.8" ry="1.2" fill="#800010" opacity="0.6"/>
  </svg>
);

const SYSTEMS = [
  {
    id: "op",
    name: "Ordem Paranormal",
    subtitle: "Ordem Paranormal",
    icon: null,
    svgIcon: (glow) => <OPEnergyIcon size={48} glow={glow} />,
    desc: "Enfrente o Outro Lado. Investigue o inexplicável. Sobreviva ao horror sobrenatural.",
    tags: ["Terror","Investigação","Sobrenatural"],
    accent: "#b030d8",
    accentText: "#d870f8",
    accentGlow: "rgba(180,50,220,0.35)",
    available: true,
  },
  {
    id: "dnd",
    name: "Dungeons & Dragons",
    subtitle: "5ª Edição",
    icon: null,
    svgIcon: (glow) => <DnDDemonIcon size={48} glow={glow} />,
    desc: "A aventura épica de fantasia mais jogada do mundo. Masmorras, dragões e heróis lendários.",
    tags: ["Fantasia","Combate","Épico"],
    accent: "#4a6fa5",
    accentText: "#7ab8f5",
    accentGlow: "rgba(74,111,165,0.25)",
    available: true,
  },
  {
    id: "3det",
    name: "3D&T Alpha",
    subtitle: "Sistema Nacional",
    icon: "🎌",
    desc: "O clássico sistema brasileiro inspirado em anime e mangá. Simples, rápido e cheio de estilo.",
    tags: ["Anime","Ação","Nacional"],
    accent: "#7a4fa0",
    accentText: "#b87ee0",
    accentGlow: "rgba(122,79,160,0.25)",
    available: true,
  },
  {
    id: "call",
    name: "Call of Cthulhu",
    subtitle: "7ª Edição",
    icon: "🐙",
    desc: "Mergulhe na ficção lovecraftiana. Investigadores frágeis contra horrores cósmicos indescritíveis.",
    tags: ["Lovecraft","Horror","Investigação"],
    accent: "#3a6e5a",
    accentText: "#5ec4a0",
    accentGlow: "rgba(58,110,90,0.25)",
    available: false,
  },
  {
    id: "vampire",
    name: "Vampire: The Masquerade",
    subtitle: "5ª Edição",
    icon: "🩸",
    desc: "Política, traição e sobrevivência entre as trevas eternas da noite. Você é a criatura das sombras.",
    tags: ["Vampiro","Político","Dark"],
    accent: "#6b1a1a",
    accentText: "#d04545",
    accentGlow: "rgba(107,26,26,0.25)",
    available: false,
  },
  {
    id: "custom",
    name: "Sistema Personalizado",
    subtitle: "Em Breve",
    icon: "⚙️",
    desc: "Crie seu próprio sistema do zero. Defina atributos, mecânicas e regras como quiser.",
    tags: ["Custom","Livre","Beta"],
    accent: "#5a5a3a",
    accentText: "#a8a870",
    accentGlow: "rgba(90,90,58,0.2)",
    available: false,
  },
];

function SystemSelect({ onSelect, onLogout }) {
  const [hovered, setHovered] = useState(null);
  const [selected, setSelected] = useState(null);
  const [entering, setEntering] = useState(false);

  const handleSelect = (sys) => {
    if (!sys.available) return;
    setSelected(sys.id);
    setEntering(true);
    setTimeout(() => onSelect(sys), 900);
  };

  return (
    <div style={{
      minHeight:"100vh", background:"var(--bg)", display:"flex", flexDirection:"column",
      alignItems:"center", justifyContent:"center", padding:"40px 20px",
      position:"relative", overflow:"hidden",
    }}>
      <Deco/>

      <button onClick={onLogout} title="Sair da conta" style={{
        position:"fixed", top:20, right:24, zIndex:10,
        background:"rgba(13,13,13,0.85)", border:"1px solid rgba(201,168,76,0.2)",
        borderRadius:8, cursor:"pointer", color:"var(--muted)",
        padding:"7px 14px", display:"flex", alignItems:"center", gap:7,
        fontFamily:"Cinzel,serif", fontSize:9, letterSpacing:1, textTransform:"uppercase",
        backdropFilter:"blur(8px)", transition:"all 0.2s",
      }}
        onMouseEnter={e=>{e.currentTarget.style.color="#c96a6a";e.currentTarget.style.borderColor="rgba(201,100,100,0.4)";}}
        onMouseLeave={e=>{e.currentTarget.style.color="var(--muted)";e.currentTarget.style.borderColor="rgba(201,168,76,0.2)";}}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
        </svg>
        Sair
      </button>

      {/* Ambient glow based on hover */}
      <div style={{
        position:"fixed", inset:0, pointerEvents:"none", zIndex:0,
        background: hovered
          ? `radial-gradient(ellipse at center, ${SYSTEMS.find(s=>s.id===hovered)?.accentGlow||"transparent"} 0%, transparent 65%)`
          : "radial-gradient(ellipse at center, rgba(201,168,76,0.03) 0%, transparent 60%)",
        transition:"background 0.6s ease",
      }}/>

      <div style={{position:"relative", zIndex:1, width:"100%", maxWidth:860}}>

        {/* Header */}
        <div style={{textAlign:"center", marginBottom:48}}>
          <div style={{display:"flex", justifyContent:"center", marginBottom:18, animation:"float 4s ease-in-out infinite"}}>
            <NexusLogo size={56} animate/>
          </div>
          <div style={{fontFamily:"'Cinzel Decorative',serif", fontSize:11, letterSpacing:5,
            color:"var(--muted)", textTransform:"uppercase", marginBottom:10}}>
            Bem-vindo ao Nexus
          </div>
          <h1 style={{
            fontFamily:"'Cinzel Decorative',serif", fontSize:"clamp(20px,4vw,32px)", fontWeight:700,
            background:"linear-gradient(135deg,#c9a84c,#e8c96d,#a07830)",
            WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", backgroundClip:"text",
            letterSpacing:2, marginBottom:12,
          }}>Escolha seu Sistema</h1>
          <p style={{fontFamily:"Crimson Pro,serif", fontSize:16, color:"var(--muted2)", fontStyle:"italic", lineHeight:1.6}}>
            Cada mundo tem suas próprias leis. Qual você vai enfrentar hoje?
          </p>
        </div>

        {/* Grid of systems */}
        <div style={{display:"grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap:16}}>
          {SYSTEMS.map((sys, i) => {
            const isHov = hovered === sys.id;
            const isSel = selected === sys.id;
            return (
              <div
                key={sys.id}
                onMouseEnter={() => sys.available && setHovered(sys.id)}
                onMouseLeave={() => setHovered(null)}
                onClick={() => handleSelect(sys)}
                style={{
                  position:"relative", borderRadius:10, overflow:"hidden",
                  border:`1px solid ${isHov || isSel ? sys.accent+"80" : "rgba(201,168,76,0.1)"}`,
                  background: isHov
                    ? `linear-gradient(135deg, ${sys.accent}12, rgba(5,5,5,0.95))`
                    : "var(--card)",
                  cursor: sys.available ? "pointer" : "not-allowed",
                  opacity: sys.available ? 1 : 0.45,
                  transition:"all 0.3s ease",
                  transform: isHov ? "translateY(-3px)" : "none",
                  boxShadow: isHov ? `0 12px 40px ${sys.accentGlow}, 0 0 0 1px ${sys.accent}40` : "none",
                  animation: `fadeIn 0.4s ease ${i * 0.07}s both`,
                }}
              >
                {/* Not available badge */}
                {!sys.available && (
                  <div style={{
                    position:"absolute", top:12, right:12,
                    fontFamily:"Cinzel,serif", fontSize:7, letterSpacing:2,
                    color:"var(--muted)", textTransform:"uppercase",
                    border:"1px solid rgba(255,255,255,0.08)", borderRadius:20,
                    padding:"2px 8px",
                  }}>Em breve</div>
                )}

                {/* Selected pulse overlay */}
                {isSel && (
                  <div style={{
                    position:"absolute", inset:0,
                    background:`radial-gradient(circle, ${sys.accent}30, transparent 70%)`,
                    animation:"glow 0.8s ease infinite",
                    pointerEvents:"none",
                  }}/>
                )}

                {/* Accent top line */}
                <div style={{
                  height:2,
                  background: isHov || isSel
                    ? `linear-gradient(90deg, transparent, ${sys.accent}, transparent)`
                    : "transparent",
                  transition:"background 0.3s",
                }}/>

                <div style={{padding:"22px 20px 20px"}}>
                  {/* Icon + title */}
                  <div style={{display:"flex", gap:14, alignItems:"flex-start", marginBottom:14}}>
                    <div style={{
                      width:48, height:48, borderRadius:10, flexShrink:0,
                      background: sys.svgIcon ? "rgba(80,0,120,0.2)" : `${sys.accent}18`,
                      border:`1px solid ${sys.svgIcon ? "rgba(180,60,220,0.35)" : sys.accent+"40"}`,
                      display:"flex", alignItems:"center", justifyContent:"center",
                      fontSize:24, overflow:"hidden",
                      boxShadow: isHov
                        ? sys.svgIcon
                          ? "0 0 20px rgba(180,60,220,0.5), 0 0 40px rgba(140,30,200,0.25)"
                          : `0 0 16px ${sys.accentGlow}`
                        : "none",
                      transition:"box-shadow 0.3s",
                    }}>
                      {sys.svgIcon ? sys.svgIcon(isHov || isSel) : sys.icon}
                    </div>
                    <div>
                      <div style={{
                        fontFamily:"Cinzel,serif", fontSize:13, fontWeight:600,
                        color: isHov ? "var(--text)" : "var(--text)",
                        marginBottom:3, lineHeight:1.3,
                      }}>{sys.name}</div>
                      <div style={{fontFamily:"Cinzel,serif", fontSize:8, letterSpacing:1.5,
                        color: isHov ? sys.accent : "var(--muted)", textTransform:"uppercase",
                        transition:"color 0.3s",
                      }}>{sys.subtitle}</div>
                    </div>
                  </div>

                  {/* Description */}
                  <p style={{
                    fontFamily:"Crimson Pro,serif", fontSize:14, color:"var(--muted2)",
                    lineHeight:1.65, marginBottom:14, fontStyle:"italic",
                  }}>{sys.desc}</p>

                  {/* Tags */}
                  <div style={{display:"flex", gap:5, flexWrap:"wrap", marginBottom:16}}>
                    {sys.tags.map(t => (
                      <span key={t} style={{
                        fontFamily:"Cinzel,serif", fontSize:7, letterSpacing:1.5,
                        textTransform:"uppercase", padding:"3px 8px", borderRadius:20,
                        border:`1px solid ${isHov ? sys.accent+"60" : "rgba(201,168,76,0.12)"}`,
                        color: isHov ? sys.accent : "var(--muted)",
                        transition:"all 0.3s",
                      }}>{t}</span>
                    ))}
                  </div>

                  {/* CTA */}
                  {sys.available && (
                    <div style={{
                      display:"flex", alignItems:"center", justifyContent:"space-between",
                      borderTop:`1px solid ${isHov ? sys.accent+"30" : "rgba(255,255,255,0.04)"}`,
                      paddingTop:12, transition:"border-color 0.3s",
                    }}>
                      <span style={{
                        fontFamily:"Cinzel,serif", fontSize:9, letterSpacing:2,
                        textTransform:"uppercase",
                        color: isSel ? sys.accent : isHov ? "var(--text)" : "var(--muted)",
                        transition:"color 0.3s",
                      }}>
                        {isSel ? "Entrando..." : "Acessar sistema"}
                      </span>
                      <span style={{
                        fontSize:16, color: isHov ? sys.accent : "var(--muted)",
                        transition:"all 0.3s",
                        transform: isHov ? "translateX(3px)" : "none",
                      }}>
                        {isSel
                          ? <span style={{display:"inline-block", width:14, height:14, border:`2px solid ${sys.accent}`, borderTopColor:"transparent", borderRadius:"50%", animation:"spin 0.7s linear infinite", verticalAlign:"middle"}}/>
                          : "→"}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div style={{textAlign:"center", marginTop:36}}>
          <p style={{fontFamily:"Cinzel,serif", fontSize:9, letterSpacing:2, color:"var(--muted)", textTransform:"uppercase"}}>
            Mais sistemas chegando · Sugira no Discord
          </p>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════
   CHARACTER CREATOR — OP NEXUS
═══════════════════════════════ */

/* ══════════════════════════════════════════
   DICE ROLL POPUP — OP rule: N d20, pega o maior
   (se atributo 0: rola 2d20, pega o PIOR)
══════════════════════════════════════════ */
function rollOP(attrVal) {
  const n = attrVal === 0 ? 2 : attrVal;
  const rolls = Array.from({ length: n }, () => Math.floor(Math.random() * 20) + 1);
  const result = attrVal === 0 ? Math.min(...rolls) : Math.max(...rolls);
  return { rolls, result, worst: attrVal === 0, crit: rolls.includes(20), dice: "D20" };
}

/* ── Attribute Diagram SVG — clickable nodes with roll popup ── */
const AttrDiagram = ({ attrs, onChange, onEdit, onRoll, readOnly = false }) => {
  const [editing, setEditing] = useState(null);
  const [inputVal, setInputVal] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const positions = {
    AGI: { x:160, y:30  },
    FOR: { x:50,  y:145 },
    INT: { x:270, y:145 },
    PRE: { x:90,  y:260 },
    VIG: { x:230, y:260 },
  };
  const center = { x:160, y:178 };
  const LABELS = { AGI:"AGILIDADE", FOR:"FORÇA", INT:"INTELECTO", PRE:"PRESENÇA", VIG:"VIGOR" };

  const startEdit = (key) => {
    setEditing(key);
    setInputVal(String(attrs[key]));
  };

  const commitEdit = () => {
    if (!editing) return;
    const parsed = parseInt(inputVal, 10);
    const newVal = isNaN(parsed) ? attrs[editing] : Math.max(0, Math.min(99, parsed));
    if (onEdit) onEdit(editing, newVal);
    setEditing(null);
  };

  const RUNES = "ᚠᚢᚦᚨᚱ·ᚲᚷᚹᚺᚾ·ᛁᛃᛇᛈᛉ·ᛊᛏᛒᛖᛗ·ᛚᛜᛞᛟ·";
  const circPath = (cx, cy, r) =>
    `M ${cx - r} ${cy} a ${r} ${r} 0 1 1 ${2*r} 0 a ${r} ${r} 0 1 1 ${-2*r} 0`;
  /* Pentagon order: AGI → INT → VIG → PRE → FOR (clockwise) */
  const pentOrder = ["AGI","INT","VIG","PRE","FOR"];

  return (
    <svg viewBox="-10 -28 340 390" style={{display:"block",width:"100%",height:"auto"}}>
      <defs>
        <radialGradient id="cg-center" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="#f5e07a" stopOpacity="1"/>
          <stop offset="55%"  stopColor="#c9a84c" stopOpacity="1"/>
          <stop offset="100%" stopColor="#7a5c18" stopOpacity="1"/>
        </radialGradient>
        <radialGradient id="cg-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="#c9a84c" stopOpacity="0.35"/>
          <stop offset="100%" stopColor="#c9a84c" stopOpacity="0"/>
        </radialGradient>
        <filter id="ag2"><feGaussianBlur stdDeviation="2.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        <filter id="glow-soft"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        {Object.entries(positions).map(([k,p])=>(
          <path key={k} id={`rp-${k}`} d={circPath(p.x, p.y, 47)} fill="none"/>
        ))}
        <path id="rp-center" d={circPath(center.x, center.y, 59)} fill="none"/>
      </defs>

      <style>{`
        @keyframes sigil-pulse {
          0%, 55%, 100% { fill: rgba(201,168,76,0.60); filter: none; }
          60%  { fill: rgba(255,235,90,1);   filter: drop-shadow(0 0 7px rgba(255,210,60,1)) drop-shadow(0 0 14px rgba(201,168,76,0.7)); }
          72%  { fill: rgba(255,215,65,0.85); filter: drop-shadow(0 0 4px rgba(255,190,40,0.6)); }
          88%  { fill: rgba(201,168,76,0.65); filter: none; }
        }
        .sigil-ring { animation: sigil-pulse 8s ease-in-out infinite; }
        @keyframes sigil-center-pulse {
          0%, 60%, 100% { fill: rgba(30,18,4,0.65); }
          65%  { fill: rgba(80,45,5,1); filter: drop-shadow(0 0 5px rgba(180,120,20,0.6)); }
          80%  { fill: rgba(30,18,4,0.65); filter: none; }
        }
        .sigil-center { animation: sigil-center-pulse 10s ease-in-out infinite; }
      `}</style>

      {/* Pentagon outline between adjacent nodes */}
      <polygon
        points={pentOrder.map(k=>`${positions[k].x},${positions[k].y}`).join(" ")}
        fill="none" stroke="rgba(201,168,76,0.28)" strokeWidth="1.2"/>

      {/* Radial spokes from center to each node */}
      {Object.entries(positions).map(([k,p])=>(
        <line key={k} x1={center.x} y1={center.y} x2={p.x} y2={p.y}
          stroke="rgba(201,168,76,0.32)" strokeWidth="1.2"/>
      ))}

      {/* Center glow halo */}
      <circle cx={center.x} cy={center.y} r="66" fill="url(#cg-glow)"/>

      {/* Center — bright golden fill like the reference image */}
      <circle cx={center.x} cy={center.y} r="52" fill="url(#cg-center)"
        stroke="rgba(201,168,76,0.9)" strokeWidth="1.5" filter="url(#glow-soft)"/>
      <circle cx={center.x} cy={center.y} r="49" fill="none"
        stroke="rgba(255,240,160,0.35)" strokeWidth="0.75"/>
      {/* Rune ring just outside the center circle */}
      <text fontSize="10" className="sigil-center" letterSpacing="2.5">
        <textPath href="#rp-center">{RUNES.repeat(3)}</textPath>
      </text>
      <text x={center.x} y={center.y-5} textAnchor="middle" fontFamily="Cinzel,serif"
        fontSize="11" fill="#1a1004" letterSpacing="2" fontWeight="700">ATRIBUTOS</text>
      <text x={center.x} y={center.y+10} textAnchor="middle" fontFamily="Cinzel,serif"
        fontSize="7" fill="#3a2808" letterSpacing="1">ORDEM PARANORMAL</text>
      <text x={center.x} y={center.y+22} textAnchor="middle" fontFamily="Cinzel,serif"
        fontSize="6.5" fill="#3a2808">Clique p/ rolar</text>

      {/* Attribute nodes */}
      {Object.entries(positions).map(([key,p], i)=>{
        const val = attrs[key];
        const isEditing = editing === key;
        return (
          <g key={key}>
            {/* Outer sigil ring (solid thin border + rune text) */}
            <circle cx={p.x} cy={p.y} r="56" fill="none"
              stroke="rgba(201,168,76,0.20)" strokeWidth="0.75"/>
            <text fontSize="10" className="sigil-ring"
              style={{animationDelay:`${i * 1.6}s`}} letterSpacing="2.5">
              <textPath href={`#rp-${key}`}>{RUNES.repeat(2)}</textPath>
            </text>
            {/* Inner dashed accent ring */}
            <circle cx={p.x} cy={p.y} r="36" fill="none"
              stroke="rgba(201,168,76,0.30)" strokeWidth="0.75" strokeDasharray="1.5,3.5"/>
            {/* Main dark circle */}
            <circle cx={p.x} cy={p.y} r="33" fill="rgba(5,5,5,0.97)"
              stroke={isEditing ? "rgba(201,168,76,0.9)" : "rgba(201,168,76,0.6)"}
              strokeWidth={isEditing ? "2" : "1.5"} filter="url(#ag2)"
              style={{cursor: onRoll && !isEditing ? "pointer" : "default"}}
              onClick={()=> !isEditing && onRoll && onRoll(key)}/>
            <circle cx={p.x} cy={p.y} r="27" fill="#060606"
              stroke="rgba(201,168,76,0.2)" strokeWidth="1"
              style={{cursor: onRoll && !isEditing ? "pointer" : "default"}}
              onClick={()=> !isEditing && onRoll && onRoll(key)}/>
            {/* Value */}
            {isEditing ? (
              <foreignObject x={p.x-21} y={p.y-19} width="42" height="26">
                <input
                  ref={inputRef}
                  type="number" min="0" max="99"
                  value={inputVal}
                  onChange={e => setInputVal(e.target.value)}
                  onBlur={commitEdit}
                  onKeyDown={e => {
                    if (e.key === "Enter") commitEdit();
                    if (e.key === "Escape") setEditing(null);
                  }}
                  style={{
                    width:"100%", height:"100%", textAlign:"center",
                    background:"rgba(0,0,0,0.95)",
                    border:"1px solid rgba(201,168,76,0.85)",
                    color:"#e8c96d",
                    fontFamily:"'Cinzel Decorative',serif",
                    fontSize:"15px", fontWeight:"700",
                    borderRadius:"3px", padding:0, outline:"none",
                    boxSizing:"border-box",
                    MozAppearance:"textfield",
                  }}
                />
              </foreignObject>
            ) : (
              <text x={p.x} y={p.y-2} textAnchor="middle"
                fontFamily="Cinzel Decorative,serif" fontSize="20"
                fill="#e8c96d" fontWeight="700"
                style={{cursor: onEdit ? "text" : onRoll ? "pointer" : "default"}}
                onClick={e => { e.stopPropagation(); onEdit ? startEdit(key) : onRoll && onRoll(key); }}>
                {val}
              </text>
            )}
            <text x={p.x} y={p.y+11} textAnchor="middle" fontFamily="Cinzel,serif"
              fontSize="6.5" fill="#b0a07a" letterSpacing="1"
              style={{cursor: onRoll && !isEditing ? "pointer" : "default"}}
              onClick={()=> !isEditing && onRoll && onRoll(key)}>{LABELS[key]}</text>
            <text x={p.x} y={p.y+21} textAnchor="middle" fontFamily="Cinzel,serif"
              fontSize="10" fill="#c9a84c" fontWeight="600"
              style={{cursor: onRoll && !isEditing ? "pointer" : "default"}}
              onClick={()=> !isEditing && onRoll && onRoll(key)}>{key}</text>
            {/* +/- only in creator mode */}
            {!readOnly && onChange && (
              <>
                <rect x={p.x-27} y={p.y+24} width="18" height="12" rx="3" fill="rgba(201,168,76,0.1)" stroke="rgba(201,168,76,0.3)" strokeWidth="1" style={{cursor:"pointer"}} onClick={()=>onChange(key,-1)}/>
                <text x={p.x-18} y={p.y+33} textAnchor="middle" fontFamily="sans-serif" fontSize="11" fill="#c9a84c" style={{cursor:"pointer"}} onClick={()=>onChange(key,-1)}>−</text>
                <rect x={p.x+9}  y={p.y+24} width="18" height="12" rx="3" fill="rgba(201,168,76,0.1)" stroke="rgba(201,168,76,0.3)" strokeWidth="1" style={{cursor:"pointer"}} onClick={()=>onChange(key,+1)}/>
                <text x={p.x+18} y={p.y+33} textAnchor="middle" fontFamily="sans-serif" fontSize="11" fill="#c9a84c" style={{cursor:"pointer"}} onClick={()=>onChange(key,+1)}>+</text>
              </>
            )}
          </g>
        );
      })}
    </svg>
  );
};

/* ── Step progress bar ── */
const StepBar = ({ current }) => {
  const steps = ["Atributos","Origem","Classe","Toques Finais"];
  return (
    <div style={{display:"flex", alignItems:"center", justifyContent:"center", gap:0, marginBottom:36}}>
      {steps.map((s,i)=>(
        <div key={s} style={{display:"flex", alignItems:"center"}}>
          <div style={{
            fontFamily:"Cinzel,serif", fontSize:12, letterSpacing:1.5,
            color: i===current?"var(--gold)":i<current?"var(--muted2)":"var(--muted)",
            fontWeight: i===current?"600":"400",
            borderBottom: i===current?"2px solid var(--gold)":"2px solid transparent",
            paddingBottom:4, transition:"all 0.3s",
          }}>{s}</div>
          {i<steps.length-1 && (
            <div style={{width:50,height:1,margin:"0 14px",background:i<current?"rgba(201,168,76,0.5)":"rgba(201,168,76,0.15)"}}/>
          )}
        </div>
      ))}
    </div>
  );
};

const ORIGENS = [
  { id:"academico",    name:"Acadêmico",              skills:["Ciências","Investigação"],      power:"Saber é Poder. Quando faz um teste usando Intelecto, pode gastar 2 PE para receber +5 nesse teste." },
  { id:"saude",        name:"Agente de Saúde",         skills:["Intuição","Medicina"],          power:"Técnica Medicinal. Sempre que cura um personagem, adiciona seu Intelecto no total de PV curados." },
  { id:"artista",      name:"Artista",                 skills:["Artes","Enganação"],            power:"Magnum Opus. Uma vez por missão, pode fazer um personagem te reconhecer, recebendo +5 em testes de Presença contra ele." },
  { id:"atleta",       name:"Atleta",                  skills:["Acrobacia","Atletismo"],        power:"110%. Quando faz um teste de perícia usando Força ou Agilidade (exceto Luta e Pontaria) pode gastar 2 PE para receber +5." },
  { id:"criminoso",    name:"Criminoso",               skills:["Crime","Furtividade"],          power:"O Crime Compensa. No final de uma missão, escolha um item encontrado. Na próxima missão, inclua-o no inventário sem contar no limite." },
  { id:"cultista",     name:"Cultista Arrependido",    skills:["Ocultismo","Religião"],         power:"Traços do Outro Lado. Você possui um poder paranormal à sua escolha. Porém, começa com metade da Sanidade normal." },
  { id:"desgarrado",   name:"Desgarrado",              skills:["Fortitude","Sobrevivência"],    power:"Calejado. Você recebe +1 PV para cada 5% de NEX." },
  { id:"engenheiro",   name:"Engenheiro",              skills:["Profissão","Tecnologia"],       power:"Ferramenta Favorita. Um item à sua escolha (exceto armas) conta como uma categoria abaixo." },
  { id:"executivo",    name:"Executivo",               skills:["Diplomacia","Profissão"],       power:"Processo Otimizado. Em testes estendidos ou para revisar documentos, pode gastar 2 PE para receber +5." },
  { id:"investigador", name:"Investigador",            skills:["Investigação","Percepção"],     power:"Faro para Pistas. Uma vez por cena, quando procurar pistas, pode gastar 1 PE para receber +5 no teste." },
  { id:"lutador",      name:"Lutador",                 skills:["Luta","Reflexos"],              power:"Mão Pesada. Você recebe +2 em rolagens de dano com ataques corpo a corpo." },
  { id:"magnata",      name:"Magnata",                 skills:["Diplomacia","Pilotagem"],       power:"Patrocinador da Ordem. Seu limite de crédito é sempre considerado um acima do atual." },
  { id:"mercenario",   name:"Mercenário",              skills:["Iniciativa","Intimidação"],     power:"Posição de Combate. No primeiro turno de cada cena de ação, pode gastar 2 PE para receber uma ação de movimento adicional." },
  { id:"militar",      name:"Militar",                 skills:["Pontaria","Tática"],            power:"Para Bellum. Você recebe +2 em rolagens de dano com armas de fogo." },
  { id:"policial",     name:"Policial",                skills:["Percepção","Pontaria"],         power:"Patrulha. Você recebe +2 em Defesa." },
  { id:"religioso",    name:"Religioso",               skills:["Religião","Vontade"],           power:"Acalentar. Recebe +5 em testes de Religião para acalmar. Quando acalma uma pessoa, ela recebe 1d6 + Presença de SAN." },
  { id:"ti",           name:"T.I.",                    skills:["Investigação","Tecnologia"],    power:"Motor de Busca. Com acesso à internet, pode gastar 2 PE para substituir qualquer perícia por um teste de Tecnologia." },
  { id:"universitario",name:"Universitário",           skills:["Atualidades","Investigação"],  power:"Dedicação. Recebe +1 PE, mais 1 PE a cada NEX ímpar. Seu limite de PE por turno aumenta em 1." },
  { id:"vitima",       name:"Vítima",                  skills:["Reflexos","Vontade"],           power:"Cicatrizes Psicológicas. Você recebe +1 de Sanidade para cada 5% de NEX." },
  { id:"amnésico",     name:"Amnésico",                skills:["À escolha","À escolha"],        power:"Vislumbres do Passado. Uma vez por sessão, teste de Intelecto (DT 10) para reconhecer pessoas/lugares. Se passar, recebe 1d4 PE temporários." },
];

const CLASSES = [
  {
    id:"combatente", name:"Combatente", icon:"⚔️",
    desc:"Treinado para lutar com todo tipo de armas, e com a força e a coragem para encarar os perigos de frente.",
    detail:"Do mercenário especialista em armas de fogo até o perito em espadas, combatentes apresentam uma gama enorme de habilidades e técnicas especiais que aprimoram sua eficiência no campo de batalha.",
    bonus:"PV +4 · Ataque +2 · Resistência Física",
  },
  {
    id:"especialista", name:"Especialista", icon:"🔬",
    desc:"Um agente que confia mais em esperteza do que em força bruta. Se vale de conhecimento técnico e raciocínio rápido.",
    detail:"Cientistas, inventores, pesquisadores e técnicos de vários tipos são exemplos de especialistas, tão variados quanto as áreas do conhecimento e da tecnologia.",
    bonus:"PE +4 · Perícia +2 · Conhecimento Amplo",
  },
  {
    id:"ocultista", name:"Ocultista", icon:"🌀",
    desc:"O Outro Lado é misterioso, perigoso e, de certa forma, cativante. Possui talento para se conectar com elementos paranormais.",
    detail:"Ao contrário da crença popular, ocultistas não são intrinsecamente malignos. São agentes que buscam compreender e dominar os mistérios paranormais para usá-los contra o próprio Outro Lado.",
    bonus:"SAN +4 · Rituais +2 · Afinidade Paranormal",
  },
];

function CharacterCreator({ onFinish, onCancel }) {
  const [step, setStep] = useState(0);
  const [attrs, setAttrs] = useState({ AGI:1, FOR:1, INT:1, PRE:1, VIG:1 });
  const [pontos, setPontos] = useState(4);
  const [origem, setOrigem] = useState(null);
  const [classe, setClasse] = useState(null);
  const [form, setForm] = useState({ personagem:"", jogador:"", aparencia:"", personalidade:"", historico:"", objetivo:"", avatar:"" });
  const avatarInputRef = useRef(null);
  const handleAvatarFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setForm(f => ({ ...f, avatar: ev.target.result }));
    reader.readAsDataURL(file);
  };

  const totalUsed = Object.values(attrs).reduce((a,b)=>a+b,0) - 5;
  const pontosRestantes = 4 - totalUsed;

  const changeAttr = (key, delta) => {
    const next = attrs[key] + delta;
    if (next < 0 || next > 3) return;  // max 3 na criação (regra do livro)
    if (delta > 0 && pontosRestantes <= 0) return;
    setAttrs(a => ({ ...a, [key]: next }));
  };

  const S = { // shared styles
    section: { background:"var(--card)", border:"1px solid var(--border)", borderRadius:10, padding:24 },
    label: { fontFamily:"Cinzel,serif", fontSize:9, letterSpacing:2, color:"var(--muted)", textTransform:"uppercase", marginBottom:6, display:"block" },
    h2: { fontFamily:"'Cinzel Decorative',serif", fontSize:24, background:"linear-gradient(135deg,#c9a84c,#e8c96d)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", backgroundClip:"text", marginBottom:14 },
    desc: { fontFamily:"Crimson Pro,serif", fontSize:18, color:"var(--muted2)", lineHeight:1.8, fontStyle:"italic" },
  };

  /* STEP 0 — ATRIBUTOS */
  const StepAtributos = () => (
    <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:32, alignItems:"start"}}>
      <div>
        <div style={S.h2}>Distribua seus Atributos</div>
        <p style={S.desc}>
          Quando você cria um personagem, todos os seus atributos começam em <strong style={{color:"var(--gold)"}}>1</strong> e você recebe <strong style={{color:"var(--gold)"}}>4 pontos</strong> para distribuir entre eles como quiser. Você também pode reduzir um atributo para 0 para receber <strong style={{color:"var(--gold)"}}>1 ponto adicional</strong>. O valor máximo inicial que você pode ter em cada atributo é <strong style={{color:"var(--gold)"}}>3</strong>.<br/><br/>
          <em>Ao rolar um teste, você rola N dados d20 iguais ao valor do atributo e usa o <strong style={{color:"var(--gold)"}}>maior resultado</strong>. Se o atributo for 0, rola 2d20 e usa o <strong style={{color:"#c05050"}}>pior</strong>.</em>
        </p>
        <div style={{marginTop:24, display:"flex", flexDirection:"column", gap:12}}>
          {/* Points remaining */}
          <div style={{
            display:"flex", alignItems:"center", gap:12,
            padding:"12px 16px", borderRadius:8,
            background: pontosRestantes > 0 ? "rgba(201,168,76,0.07)" : pontosRestantes === 0 ? "rgba(76,175,80,0.07)" : "rgba(139,32,32,0.1)",
            border: `1px solid ${pontosRestantes > 0 ? "rgba(201,168,76,0.3)" : pontosRestantes === 0 ? "rgba(76,175,80,0.3)" : "rgba(200,50,50,0.4)"}`,
          }}>
            <div style={{fontFamily:"'Cinzel Decorative',serif", fontSize:28, color: pontosRestantes>0?"var(--gold)":pontosRestantes===0?"#4caf50":"#c03020"}}>{Math.max(0,pontosRestantes)}</div>
            <div>
              <div style={{fontFamily:"Cinzel,serif", fontSize:13, letterSpacing:2, color:"var(--muted)", textTransform:"uppercase"}}>Pontos Restantes</div>
              <div style={{fontFamily:"Crimson Pro,serif", fontSize:16, color:"var(--muted2)", fontStyle:"italic"}}>
                {pontosRestantes>0?"Distribua os pontos nos atributos →":pontosRestantes===0?"✓ Todos os pontos distribuídos":"Você reduziu atributos, ganhou pontos extras"}
              </div>
            </div>
          </div>
          {/* Attr list for mobile/reference */}
          {Object.entries(attrs).map(([k,v])=>{
            const labels = { AGI:"Agilidade", FOR:"Força", INT:"Intelecto", PRE:"Presença", VIG:"Vigor" };
            return (
              <div key={k} style={{display:"flex", alignItems:"center", gap:10}}>
                <span style={{fontFamily:"Cinzel,serif", fontSize:13, color:"var(--gold)", width:36}}>{k}</span>
                <span style={{fontFamily:"Crimson Pro,serif", fontSize:17, color:"var(--muted2)", flex:1}}>{labels[k]}</span>
                <div style={{display:"flex", alignItems:"center", gap:8}}>
                  <button onClick={()=>changeAttr(k,-1)} style={{width:30,height:30,borderRadius:4,border:"1px solid var(--border2)",background:"transparent",color:"var(--gold)",cursor:"pointer",fontFamily:"serif",fontSize:18,display:"flex",alignItems:"center",justifyContent:"center"}}>−</button>
                  <div style={{width:36,textAlign:"center",fontFamily:"Cinzel,serif",fontSize:20,color:"var(--text)",fontWeight:600}}>{v}</div>
                  <button onClick={()=>changeAttr(k,+1)} style={{width:30,height:30,borderRadius:4,border:"1px solid var(--border2)",background:"transparent",color:"var(--gold)",cursor:"pointer",fontFamily:"serif",fontSize:18,display:"flex",alignItems:"center",justifyContent:"center"}}>+</button>
                </div>
                <div style={{width:60,height:4,borderRadius:2,background:"rgba(255,255,255,0.06)",overflow:"hidden"}}>
                  <div style={{height:"100%",width:`${(v/5)*100}%`,background:"linear-gradient(90deg,var(--gold3),var(--gold2))",borderRadius:2,transition:"width 0.2s"}}/>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {/* SVG Diagram */}
      <div style={{display:"flex", flexDirection:"column", alignItems:"center", gap:16}}>
        <AttrDiagram attrs={attrs} onChange={changeAttr} onRoll={null}/>
        <div style={{fontFamily:"Cinzel,serif", fontSize:11, letterSpacing:2, color:"var(--muted)", textTransform:"uppercase", textAlign:"center"}}>
          Clique nos botões do diagrama ou use a lista
        </div>
      </div>
    </div>
  );

  /* STEP 1 — ORIGEM */
  const StepOrigem = () => {
    const [search, setSearch] = useState("");
    const filtered = ORIGENS.filter(o=>o.name.toLowerCase().includes(search.toLowerCase()));
    return (
      <div className="fade" style={{display:"flex", flexDirection:"column", gap:20}}>
        <div>
          <div style={S.h2}>Escolha sua Origem</div>
          <p style={S.desc}>
            O que seu personagem fazia antes de se envolver com o paranormal e ingressar na Ordem da Realidade? A origem representa como a vida pregressa influencia sua carreira de investigador.<br/>
            <strong style={{color:"var(--gold)", fontStyle:"normal"}}>Ao escolher uma origem, você recebe duas perícias treinadas e um poder da origem.</strong>
          </p>
          <div style={{marginTop:16, padding:"10px 14px", background:"var(--gold-dim)", border:"1px solid var(--border)", borderRadius:6}}>
            <span style={{fontFamily:"Cinzel,serif", fontSize:9, letterSpacing:1, color:"var(--muted2)"}}>Perícias concedidas serão adicionadas automaticamente. Perícias opcionais podem ser adicionadas ao agente após sua criação.</span>
          </div>
        </div>
        {/* Search */}
        <div style={{position:"relative"}}>
          <span style={{position:"absolute", left:14, top:"50%", transform:"translateY(-50%)", color:"var(--muted)", fontSize:16}}>⌕</span>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar origem..." style={{paddingLeft:38}}/>
        </div>
        {/* Origem cards */}
        <div style={{display:"flex", flexDirection:"column", gap:8}}>
          {filtered.map(o=>{
            const isSelected = origem?.id === o.id;
            return (
              <div key={o.id} style={{
                borderRadius:8, overflow:"hidden",
                border:`1px solid ${isSelected?"rgba(201,168,76,0.5)":"var(--border)"}`,
                background: isSelected?"rgba(201,168,76,0.05)":"var(--card)",
                transition:"all 0.2s",
              }}>
                <div style={{
                  display:"flex", alignItems:"center", gap:12,
                  padding:"14px 18px", cursor:"pointer",
                }} onClick={()=>setOrigem(o)}>
                  <div style={{
                    width:8, height:8, borderRadius:"50%",
                    background: isSelected?"var(--gold)":"var(--muted)",
                    transition:"background 0.2s", flexShrink:0,
                  }}/>
                  <span style={{fontFamily:"Cinzel,serif", fontSize:14, color:"var(--text)", flex:1}}>{o.name}</span>
                  <div style={{display:"flex", gap:6}}>
                    {o.skills.map(s=>(
                      <span key={s} style={{fontFamily:"Cinzel,serif", fontSize:8, letterSpacing:1, padding:"2px 8px", borderRadius:20, border:"1px solid rgba(201,168,76,0.2)", color:"var(--muted2)"}}>{s}</span>
                    ))}
                  </div>
                  <button style={{
                    padding:"6px 16px", fontFamily:"Cinzel,serif", fontSize:9, letterSpacing:2,
                    textTransform:"uppercase", cursor:"pointer", borderRadius:4, transition:"all 0.2s",
                    background: isSelected?"linear-gradient(135deg,#c9a84c,#e8c96d,#a07830)":"transparent",
                    border: isSelected?"none":"1px solid var(--border2)",
                    color: isSelected?"#050505":"var(--gold)",
                    fontWeight: isSelected?"700":"400",
                  }} onClick={(e)=>{e.stopPropagation();setOrigem(o);}}>
                    {isSelected?"✓ Escolhida":"Escolher"}
                  </button>
                </div>
                {/* Expanded info */}
                {isSelected && (
                  <div style={{padding:"0 18px 14px 38px", borderTop:"1px solid var(--border)"}}>
                    <div style={{paddingTop:12, fontFamily:"Crimson Pro,serif", fontSize:14, color:"var(--muted2)", fontStyle:"italic", lineHeight:1.65}}>
                      <strong style={{color:"var(--gold)", fontStyle:"normal"}}>Poder: </strong>{o.power}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  /* STEP 2 — CLASSE */
  const ClassIcon = ({id}) => {
    if (id === "combatente") return (
      <svg viewBox="0 0 80 96" width="68" height="68" fill="none">
        {/* left wing */}
        <path d="M38 44 C30 36 16 33 4 18 C13 23 21 23 27 30 C19 21 13 11 16 3 C23 14 28 23 34 35" fill="#8B1A1A"/>
        <path d="M34 35 C28 28 20 26 14 30 C20 30 27 33 35 40" fill="#7B1414" opacity="0.7"/>
        {/* right wing */}
        <path d="M42 44 C50 36 64 33 76 18 C67 23 59 23 53 30 C61 21 67 11 64 3 C57 14 52 23 46 35" fill="#8B1A1A"/>
        <path d="M46 35 C52 28 60 26 66 30 C60 30 53 33 45 40" fill="#7B1414" opacity="0.7"/>
        {/* blade */}
        <polygon points="40,3 44,46 40,55 36,46" fill="#C0392B"/>
        {/* blood drip tip */}
        <path d="M40 55 L37 60 L40 68 L43 60 Z" fill="#E74C3C" opacity="0.85"/>
        {/* cross guard */}
        <path d="M26 48 C33 45 47 45 54 48 C47 51 33 51 26 48Z" fill="#922B21"/>
        {/* handle */}
        <rect x="38" y="51" width="4" height="18" rx="2" fill="#7B241C"/>
        {/* pommel */}
        <ellipse cx="40" cy="72" rx="6" ry="5" fill="#922B21"/>
        <ellipse cx="40" cy="72" rx="3" ry="2.5" fill="#C0392B" opacity="0.6"/>
      </svg>
    );
    if (id === "especialista") return (
      <svg viewBox="0 0 80 80" width="68" height="68" fill="none">
        {/* outer star / sunburst */}
        <polygon points="40,2 43,28 62,14 49,34 76,34 52,44 68,66 42,52 44,78 40,54 36,78 38,52 12,66 28,44 4,34 31,34 18,14 37,28" fill="none" stroke="#7B2FBE" strokeWidth="1.2" opacity="0.8"/>
        {/* inner ring */}
        <circle cx="40" cy="40" r="14" fill="none" stroke="#9B59B6" strokeWidth="1.5"/>
        {/* eye outline */}
        <path d="M26 40 Q40 28 54 40 Q40 52 26 40Z" fill="#4A235A" stroke="#9B59B6" strokeWidth="1"/>
        {/* iris */}
        <circle cx="40" cy="40" r="7" fill="#7B2FBE"/>
        {/* pupil */}
        <circle cx="40" cy="40" r="4" fill="#1a0828"/>
        {/* spiral in pupil */}
        <path d="M40 38 Q42 38 42 40 Q42 42 40 42 Q38 42 38 40 Q38 39 39 38.5" fill="none" stroke="#9B59B6" strokeWidth="0.8"/>
        {/* corner glows */}
        <circle cx="40" cy="4"  r="2" fill="#A569BD" opacity="0.7"/>
        <circle cx="76" cy="40" r="2" fill="#A569BD" opacity="0.7"/>
        <circle cx="40" cy="76" r="2" fill="#A569BD" opacity="0.7"/>
        <circle cx="4"  cy="40" r="2" fill="#A569BD" opacity="0.7"/>
      </svg>
    );
    /* ocultista */
    return (
      <svg viewBox="0 0 80 80" width="68" height="68" fill="none">
        {/* outer rune ring */}
        <circle cx="40" cy="40" r="37" stroke="#6C3483" strokeWidth="1" strokeDasharray="3 4" opacity="0.9"/>
        <circle cx="40" cy="40" r="31" stroke="#7D3C98" strokeWidth="0.8" opacity="0.6"/>
        {/* dark void */}
        <circle cx="40" cy="40" r="11" fill="#12052a"/>
        <circle cx="40" cy="40" r="11" stroke="#8E44AD" strokeWidth="1.5"/>
        {/* cardinal flame spikes */}
        <path d="M40 29 C37 23 32 18 35 11 C38 18 40 23 40 29Z" fill="#7B2FBE"/>
        <path d="M40 29 C43 23 48 18 45 11 C42 18 40 23 40 29Z" fill="#6C3483"/>
        <path d="M51 40 C57 37 62 32 69 35 C62 38 57 40 51 40Z" fill="#7B2FBE"/>
        <path d="M51 40 C57 43 62 48 69 45 C62 42 57 40 51 40Z" fill="#6C3483"/>
        <path d="M40 51 C37 57 32 62 35 69 C38 62 40 57 40 51Z" fill="#7B2FBE"/>
        <path d="M40 51 C43 57 48 62 45 69 C42 62 40 57 40 51Z" fill="#6C3483"/>
        <path d="M29 40 C23 37 18 32 11 35 C18 38 23 40 29 40Z" fill="#7B2FBE"/>
        <path d="M29 40 C23 43 18 48 11 45 C18 42 23 40 29 40Z" fill="#6C3483"/>
        {/* diagonal spikes */}
        <path d="M32 32 C26 25 23 18 17 17 C22 23 27 28 32 32Z" fill="#8E44AD" opacity="0.8"/>
        <path d="M48 32 C54 25 57 18 63 17 C58 23 53 28 48 32Z" fill="#8E44AD" opacity="0.8"/>
        <path d="M48 48 C54 55 57 62 63 63 C58 57 53 52 48 48Z" fill="#8E44AD" opacity="0.8"/>
        <path d="M32 48 C26 55 23 62 17 63 C22 57 27 52 32 48Z" fill="#8E44AD" opacity="0.8"/>
        {/* rune ticks on outer ring */}
        {[0,30,60,90,120,150,180,210,240,270,300,330].map(a=>(
          <line key={a}
            x1={40+34*Math.cos(a*Math.PI/180)} y1={40+34*Math.sin(a*Math.PI/180)}
            x2={40+37*Math.cos(a*Math.PI/180)} y2={40+37*Math.sin(a*Math.PI/180)}
            stroke="#9B59B6" strokeWidth="1.5" opacity="0.7"/>
        ))}
      </svg>
    );
  };

  const StepClasse = () => (
    <div className="fade" style={{display:"flex", flexDirection:"column", gap:20}}>
      <div>
        <div style={S.h2}>Escolha sua Classe</div>
        <p style={S.desc}>
          Sua classe indica o treinamento que você recebeu na Ordem para enfrentar os perigos do Outro Lado. Em termos de jogo, é a sua característica mais importante, pois define o que você faz e qual é o seu papel no grupo de investigadores.
        </p>
        <p style={{...S.desc, marginTop:10}}>
          <strong style={{color:"var(--gold)", fontStyle:"normal"}}>Perícias concedidas serão adicionadas automaticamente.</strong> Como uma alternativa, você pode não escolher uma classe e começar como <span style={{color:"var(--gold)"}}>Mundano</span>.
        </p>
      </div>
      <div style={{display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:16}}>
        {CLASSES.map(c=>{
          const isSel = classe?.id === c.id;
          return (
            <div key={c.id} onClick={()=>setClasse(c)} style={{
              background: isSel?"rgba(201,168,76,0.06)":"var(--card)",
              border:`1px solid ${isSel?"rgba(201,168,76,0.5)":"var(--border)"}`,
              borderRadius:10, padding:22, cursor:"pointer",
              transition:"all 0.25s",
              transform: isSel?"translateY(-2px)":"none",
              boxShadow: isSel?"0 8px 30px rgba(201,168,76,0.1)":"none",
              position:"relative", overflow:"hidden",
            }}>
              {isSel && <div style={{position:"absolute",top:0,left:0,right:0,height:2,background:"linear-gradient(90deg,transparent,var(--gold),transparent)"}}/>}
              <div style={{marginBottom:14}}><ClassIcon id={c.id}/></div>
              <div style={{fontFamily:"Cinzel,serif", fontSize:20, fontWeight:600, color:"var(--text)", marginBottom:8, borderBottom:`1px solid ${isSel?"rgba(201,168,76,0.3)":"var(--border)"}`, paddingBottom:10}}>{c.name}</div>
              <p style={{fontFamily:"Crimson Pro,serif", fontSize:16, color:"var(--text)", fontWeight:600, lineHeight:1.65, marginBottom:10}}>{c.desc}</p>
              <p style={{fontFamily:"Crimson Pro,serif", fontSize:15, color:"var(--muted2)", lineHeight:1.7, marginBottom:14, fontStyle:"italic"}}>{c.detail}</p>
              <div style={{fontFamily:"Cinzel,serif", fontSize:11, letterSpacing:1.5, color:"var(--gold)", textTransform:"uppercase", padding:"8px 12px", borderRadius:4, border:"1px solid rgba(201,168,76,0.2)", background:"rgba(201,168,76,0.05)"}}>{c.bonus}</div>
              {isSel && (
                <div style={{marginTop:12}}>
                  <button className="btn-gold" style={{width:"100%", padding:"8px 0", fontSize:11, letterSpacing:2}}>✓ Classe Selecionada</button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  /* STEP 3 — TOQUES FINAIS — renderizado inline para evitar perda de foco */
  const renderStepFinal = () => (
    <div className="fade" style={{display:"flex", flexDirection:"column", gap:20}}>
      <div style={{display:"flex", flexWrap:"wrap", justifyContent:"space-between", alignItems:"flex-start", gap:12}}>
        <div style={{flex:1, minWidth:200}}>
          <div style={S.h2}>Toques Finais</div>
          <p style={S.desc}>
            Até aqui, você definiu as características mecânicas de sua ficha — mas um bom personagem é mais do que apenas números. Agora, vamos trabalhar na descrição de seu agente, definindo aspectos como nome, gênero e idade.
          </p>
        </div>
        <button className="btn-gold" onClick={()=>{ if(form.personagem) onFinish({attrs,origem,classe,form}); }} style={{flexShrink:0}}>
          Finalizar Ficha
        </button>
      </div>

      {/* Avatar upload */}
      <div style={{display:"flex", alignItems:"center", gap:20}}>
        <input ref={avatarInputRef} type="file" accept="image/*" style={{display:"none"}} onChange={handleAvatarFile}/>
        <div
          onClick={()=>avatarInputRef.current?.click()}
          style={{
            width:100, height:100, borderRadius:10, flexShrink:0,
            background:"rgba(201,168,76,0.08)", border:"2px dashed rgba(201,168,76,0.35)",
            display:"flex", alignItems:"center", justifyContent:"center",
            cursor:"pointer", overflow:"hidden", transition:"border-color 0.2s",
            position:"relative",
          }}
          onMouseEnter={e=>e.currentTarget.style.borderColor="rgba(201,168,76,0.7)"}
          onMouseLeave={e=>e.currentTarget.style.borderColor="rgba(201,168,76,0.35)"}
          title="Clique para enviar imagem do personagem"
        >
          {form.avatar ? (
            <img src={form.avatar} alt="avatar" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
          ) : (
            <div style={{textAlign:"center"}}>
              <div style={{fontSize:32}}>🕵️</div>
              <div style={{fontFamily:"Cinzel,serif",fontSize:9,color:"var(--muted2)",letterSpacing:1,marginTop:4}}>FOTO</div>
            </div>
          )}
        </div>
        <div>
          <div style={{fontFamily:"Cinzel,serif",fontSize:13,color:"var(--gold)",marginBottom:4}}>Imagem do Personagem</div>
          <div style={{fontFamily:"Crimson Pro,serif",fontSize:13,color:"var(--muted2)",marginBottom:10}}>
            Clique no quadro para enviar uma foto ou ilustração do seu agente.
          </div>
          {form.avatar && (
            <button onClick={()=>setForm(f=>({...f,avatar:""}))} style={{
              background:"none", border:"1px solid rgba(255,255,255,0.12)", borderRadius:4,
              color:"var(--muted2)", cursor:"pointer", fontFamily:"Cinzel,serif",
              fontSize:10, letterSpacing:1, padding:"5px 12px",
            }}>Remover imagem</button>
          )}
        </div>
      </div>

      <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:14}}>
        <div>
          <label style={S.label}>Personagem</label>
          <input value={form.personagem} onChange={e=>setForm(f=>({...f,personagem:e.target.value}))} placeholder="Nome do personagem"/>
        </div>
        <div>
          <label style={S.label}>Jogador</label>
          <input value={form.jogador} onChange={e=>setForm(f=>({...f,jogador:e.target.value}))} placeholder="Nome do jogador"/>
        </div>
      </div>
      <div>
        <label style={S.label}>Aparência</label>
        <textarea value={form.aparencia} onChange={e=>setForm(f=>({...f,aparencia:e.target.value}))} placeholder="Nome, gênero, idade, descrição física..." rows={4} style={{resize:"vertical"}}/>
      </div>
      <div>
        <label style={S.label}>Personalidade</label>
        <textarea value={form.personalidade} onChange={e=>setForm(f=>({...f,personalidade:e.target.value}))} placeholder="Traços marcantes, opiniões, ideais..." rows={4} style={{resize:"vertical"}}/>
      </div>
      <div>
        <label style={S.label}>Histórico</label>
        <textarea value={form.historico} onChange={e=>setForm(f=>({...f,historico:e.target.value}))} placeholder="Infância, relação com a família, contato com o Paranormal, eventos bons e ruins..." rows={4} style={{resize:"vertical"}}/>
      </div>
      <div>
        <label style={S.label}>Objetivo</label>
        <textarea value={form.objetivo} onChange={e=>setForm(f=>({...f,objetivo:e.target.value}))} placeholder="Por que ele faz parte da Ordem? Por que luta contra o Outro Lado?" rows={3} style={{resize:"vertical"}}/>
      </div>
    </div>
  );

  const canNext = [
    pontosRestantes === 0,
    origem !== null,
    classe !== null,
    true,
  ][step];

  return (
    <div style={{ minHeight:"100vh", background:"var(--bg)", overflowY:"auto" }}>
      {/* Header */}
      <div style={{
        padding:"18px 32px", borderBottom:"1px solid var(--border2)",
        display:"flex", alignItems:"center", gap:16,
        background:"rgba(8,8,8,0.97)", backdropFilter:"blur(10px)",
        position:"sticky", top:0, zIndex:50,
      }}>
        <NexusLogo size={28}/>
        <div style={{fontFamily:"Cinzel,serif", fontSize:13, color:"var(--gold2)", letterSpacing:1}}>Nova Ficha de Agente</div>
        <div style={{height:1, flex:1, background:"var(--border2)"}}/>
        <span style={{fontFamily:"Cinzel,serif", fontSize:9, letterSpacing:2, color:"#d870f8", textTransform:"uppercase", textShadow:"0 0 10px rgba(180,50,220,0.7)"}}>
          🌀 Ordem Paranormal · 2ª Ed.
        </span>
        <button onClick={onCancel} style={{background:"none", border:"1px solid var(--border2)", borderRadius:4, color:"var(--muted2)", cursor:"pointer", fontFamily:"Cinzel,serif", fontSize:9, letterSpacing:2, textTransform:"uppercase", padding:"6px 14px", transition:"all 0.2s"}}
          onMouseEnter={e=>{e.currentTarget.style.color="var(--gold)";e.currentTarget.style.borderColor="var(--gold)";}}
          onMouseLeave={e=>{e.currentTarget.style.color="var(--muted2)";e.currentTarget.style.borderColor="var(--border2)";}}
        >Cancelar</button>
      </div>

      <div style={{maxWidth:900, margin:"0 auto", padding:"40px 28px"}}>
        <StepBar current={step}/>

        {/* Step content */}
        <div style={{marginBottom:32}}>
          {step===0 && <StepAtributos/>}
          {step===1 && <StepOrigem/>}
          {step===2 && <StepClasse/>}
          {step===3 && renderStepFinal()}
        </div>

        {/* Navigation */}
        <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", paddingTop:24, borderTop:"1px solid var(--border)"}}>
          <button onClick={()=>step>0&&setStep(s=>s-1)} style={{
            background:"none", border:"1px solid var(--border)", borderRadius:4,
            color: step>0?"var(--muted2)":"var(--muted)", cursor: step>0?"pointer":"not-allowed",
            fontFamily:"Cinzel,serif", fontSize:10, letterSpacing:2, textTransform:"uppercase", padding:"10px 20px",
            opacity: step>0?1:0.3,
          }}>← Voltar</button>

          <div style={{display:"flex", gap:8}}>
            {[0,1,2,3].map(i=>(
              <div key={i} style={{width:i===step?20:6,height:6,borderRadius:3,background:i<=step?"var(--gold)":"rgba(201,168,76,0.2)",transition:"all 0.3s"}}/>
            ))}
          </div>

          {step < 3 ? (
            <button onClick={()=>canNext&&setStep(s=>s+1)} className={canNext?"btn-gold":""} style={!canNext?{
              background:"rgba(201,168,76,0.05)", border:"1px solid rgba(201,168,76,0.15)", borderRadius:4,
              color:"var(--muted)", cursor:"not-allowed", fontFamily:"Cinzel,serif", fontSize:10,
              letterSpacing:2, textTransform:"uppercase", padding:"10px 24px",
            }:{}}>
              Próximo →
            </button>
          ) : (
            <button className="btn-gold" onClick={()=>{ if(form.personagem) onFinish({attrs,origem,classe,form}); }}
              style={{opacity: form.personagem?1:0.4, cursor:form.personagem?"pointer":"not-allowed"}}>
              Criar Agente ✦
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── NEX progression (Ordem Paranormal 2ª Ed.) ── */
const NEX_STEPS = [5,10,15,20,25,30,35,40,45,50,55,60,65,70,75,80,85,90,95,99];
function nexStats(nexVal, classId, attrs) {
  const base = {
    combatente:   { pv: 20 + attrs.VIG, san: 12, pe: 2 + attrs.PRE },
    especialista: { pv: 16 + attrs.VIG, san: 16, pe: 3 + attrs.PRE },
    ocultista:    { pv: 12 + attrs.VIG, san: 20, pe: 4 + attrs.PRE },
  }[classId] ?? { pv: 12 + attrs.VIG, san: 20, pe: 4 + attrs.PRE };
  const perNex = {
    combatente:   { pv: 4 + attrs.VIG, san: 3, pe: 2 + attrs.PRE },
    especialista: { pv: 3 + attrs.VIG, san: 4, pe: 3 + attrs.PRE },
    ocultista:    { pv: 2 + attrs.VIG, san: 5, pe: 4 + attrs.PRE },
  }[classId] ?? { pv: 2 + attrs.VIG, san: 5, pe: 4 + attrs.PRE };
  const lvl = nexVal === 99 ? 19 : (nexVal - 5) / 5;
  return { pv: base.pv + lvl*perNex.pv, san: base.san + lvl*perNex.san, pe: base.pe + lvl*perNex.pe };
}

/* ── Aura sound (Web Audio API) ── */
function startAuraSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();

    // Master gain — fade in over 1.5 s
    const master = ctx.createGain();
    master.gain.setValueAtTime(0, ctx.currentTime);
    master.gain.linearRampToValueAtTime(0.13, ctx.currentTime + 1.5);
    master.connect(ctx.destination);

    // Simple reverb via feedback delay
    const delay = ctx.createDelay(1.0);
    delay.delayTime.value = 0.35;
    const fbGain = ctx.createGain();
    fbGain.gain.value = 0.45;
    delay.connect(fbGain);
    fbGain.connect(delay);
    delay.connect(master);

    // LFO — slow shimmer at 0.7 Hz
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.type = "sine";
    lfo.frequency.value = 0.7;
    lfoGain.gain.value = 0.04;
    lfo.connect(lfoGain);
    lfo.start();

    // Chord: A3 · C#4 · E4 · A4 · E5 (golden major chord)
    const freqs = [220, 277.18, 329.63, 440, 659.25];
    const detunes = [0, 1.5, -1.2, 0.8, -0.6];
    const oscs = freqs.map((freq, i) => {
      const osc = ctx.createOscillator();
      const g   = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq + detunes[i];
      g.gain.value = 0.22 / freqs.length;
      lfoGain.connect(g.gain);
      osc.connect(g);
      g.connect(delay);
      g.connect(master);
      osc.start();
      return osc;
    });

    return { ctx, oscs, lfo, master };
  } catch { return null; }
}

function stopAuraSound(sound) {
  if (!sound) return;
  const { ctx, oscs, lfo, master } = sound;
  master.gain.cancelScheduledValues(ctx.currentTime);
  master.gain.setValueAtTime(master.gain.value, ctx.currentTime);
  master.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.8);
  setTimeout(() => { oscs.forEach(o => { try { o.stop(); } catch {} }); try { lfo.stop(); } catch {} ctx.close(); }, 900);
}

// ── Dual-layer animated bar: lead (fast) + ghost trail (delayed on damage)
function Bar({val, set, max, setMax, color, label}) {
  const [editVal,    setEditVal]    = useState(false);
  const [editMax,    setEditMax]    = useState(false);
  const [displayVal, setDisplayVal] = useState(val);
  const [leadPct,    setLeadPct]    = useState(max > 0 ? val / max : 0);
  const [trailPct,   setTrailPct]   = useState(max > 0 ? val / max : 0);

  const curLeadRef  = useRef(max > 0 ? val / max : 0);
  const curTrailRef = useRef(max > 0 ? val / max : 0);
  const curNumRef   = useRef(val);
  const leadRaf  = useRef(null);
  const trailRaf = useRef(null);
  const numRaf   = useRef(null);

  useEffect(() => {
    const target   = max > 0 ? val / max : 0;
    const isDamage = target < curLeadRef.current - 0.001;

    cancelAnimationFrame(leadRaf.current);
    const lFrom = curLeadRef.current, lDur = 380, lT0 = performance.now();
    const animLead = (now) => {
      const t = Math.min((now - lT0) / lDur, 1);
      const e = 1 - Math.pow(1 - t, 3);
      const v = lFrom + (target - lFrom) * e;
      curLeadRef.current = v; setLeadPct(v);
      if (t < 1) leadRaf.current = requestAnimationFrame(animLead);
    };
    leadRaf.current = requestAnimationFrame(animLead);

    cancelAnimationFrame(trailRaf.current);
    const tFrom = curTrailRef.current, delay = isDamage ? 520 : 0, tDur = isDamage ? 950 : 420, tT0 = performance.now();
    const animTrail = (now) => {
      const elapsed = now - tT0;
      if (elapsed < delay) { trailRaf.current = requestAnimationFrame(animTrail); return; }
      const t = Math.min((elapsed - delay) / tDur, 1);
      const e = t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t + 2, 3) / 2;
      const v = tFrom + (target - tFrom) * e;
      curTrailRef.current = v; setTrailPct(v);
      if (t < 1) trailRaf.current = requestAnimationFrame(animTrail);
    };
    trailRaf.current = requestAnimationFrame(animTrail);

    cancelAnimationFrame(numRaf.current);
    const nFrom = curNumRef.current, nT0 = performance.now();
    const animNum = (now) => {
      const t = Math.min((now - nT0) / lDur, 1);
      const e = 1 - Math.pow(1 - t, 3);
      const v = nFrom + (val - nFrom) * e;
      curNumRef.current = v; setDisplayVal(Math.round(v));
      if (t < 1) numRaf.current = requestAnimationFrame(animNum);
    };
    numRaf.current = requestAnimationFrame(animNum);

    return () => { cancelAnimationFrame(leadRaf.current); cancelAnimationFrame(trailRaf.current); cancelAnimationFrame(numRaf.current); };
  }, [val, max]);

  const commitVal = (raw) => { const v = parseInt(raw); if (!isNaN(v) && v >= 0) set(v); setEditVal(false); };
  const commitMax = (raw) => { const v = parseInt(raw); if (!isNaN(v) && v > 0) setMax(v); setEditMax(false); };

  const leadFill  = leadPct > 0.6 ? color : leadPct > 0.3 ? color+"bb" : leadPct > 0.1 ? color+"77" : color+"44";
  const inpStyle  = {textAlign:"center",fontFamily:"Cinzel,serif",fontSize:13,fontWeight:700,color:"white",background:"transparent",border:"none",outline:"2px solid rgba(255,255,255,0.35)",borderRadius:2,height:"70%",minWidth:0,MozAppearance:"textfield"};
  const btnL = {background:"rgba(0,0,0,0.3)",border:"none",borderRight:"1px solid rgba(255,255,255,0.06)",color:"white",cursor:"pointer",padding:"0 8px",height:"100%",fontSize:13,flexShrink:0};
  const btnR = {background:"rgba(0,0,0,0.3)",border:"none",borderLeft:"1px solid rgba(255,255,255,0.06)",color:"white",cursor:"pointer",padding:"0 8px",height:"100%",fontSize:13,flexShrink:0};

  return (
    <div style={{marginBottom:10}}>
      <div style={{display:"flex",justifyContent:"center",marginBottom:3}}>
        <span style={{fontFamily:"Cinzel,serif",fontSize:10,letterSpacing:2,color:"var(--muted2)",textTransform:"uppercase"}}>{label}</span>
      </div>
      <div style={{position:"relative",height:34,borderRadius:4,overflow:"hidden",background:"rgba(0,0,0,0.6)",border:"1px solid rgba(255,255,255,0.05)"}}>
        {/* Ghost trail — stays behind, drains slowly on damage */}
        <div style={{position:"absolute",inset:0,width:`${trailPct*100}%`,background:color+"44",transition:"background 0.4s"}}/>
        {/* Lead bar — fast response */}
        <div style={{position:"absolute",inset:0,width:`${leadPct*100}%`,background:leadFill,transition:"background 0.4s",minWidth:val>0?3:0}}/>
        <div style={{position:"relative",zIndex:1,display:"flex",alignItems:"center",height:"100%"}}>
          <button onClick={()=>set(v=>Math.max(0,v-5))} style={btnL}>«</button>
          <button onClick={()=>set(v=>Math.max(0,v-1))} style={{...btnL,borderRight:"1px solid rgba(255,255,255,0.04)"}}>‹</button>
          <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:4,height:"100%"}}>
            {editVal ? (
              <input autoFocus type="number" defaultValue={val}
                onBlur={e=>commitVal(e.target.value)}
                onKeyDown={e=>{if(e.key==="Enter")commitVal(e.target.value);if(e.key==="Escape")setEditVal(false);}}
                onClick={e=>e.stopPropagation()} style={{...inpStyle,width:60}}/>
            ) : (
              <span onClick={()=>setEditVal(true)} style={{fontFamily:"Cinzel,serif",fontSize:13,fontWeight:700,color:"white",textShadow:"0 1px 6px rgba(0,0,0,0.9)",cursor:"pointer",userSelect:"none",borderBottom:"1px dashed rgba(255,255,255,0.35)",lineHeight:1.3}}>{displayVal}</span>
            )}
            <span style={{fontFamily:"Cinzel,serif",fontSize:13,fontWeight:700,color:"rgba(255,255,255,0.45)",userSelect:"none"}}>/</span>
            {editMax ? (
              <input autoFocus type="number" defaultValue={max}
                onBlur={e=>commitMax(e.target.value)}
                onKeyDown={e=>{if(e.key==="Enter")commitMax(e.target.value);if(e.key==="Escape")setEditMax(false);}}
                onClick={e=>e.stopPropagation()} style={{...inpStyle,width:60}}/>
            ) : (
              <span onClick={()=>setEditMax(true)} style={{fontFamily:"Cinzel,serif",fontSize:13,fontWeight:700,color:"rgba(255,255,255,0.7)",textShadow:"0 1px 6px rgba(0,0,0,0.9)",cursor:"pointer",userSelect:"none",borderBottom:"1px dashed rgba(255,255,255,0.25)",lineHeight:1.3}}>{max}</span>
            )}
          </div>
          <button onClick={()=>set(v=>Math.min(max,v+1))} style={{...btnR,borderLeft:"1px solid rgba(255,255,255,0.04)"}}>›</button>
          <button onClick={()=>set(v=>Math.min(max,v+5))} style={btnR}>»</button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════
   FICHA COMPLETA — NEXUS SHEET
   Layout inspirado no CRIS com
   identidade visual Nexus
═══════════════════════════════ */
function FullSheet({ character, onBack, onUpdate }) {
  const { attrs: initAttrs } = character;
  const [attrs,  setAttrs]  = useState(initAttrs);
  const [origem, setOrigem] = useState(character.origem ?? null);
  const [classe, setClasse] = useState(character.classe ?? null);
  const [form,   setForm]   = useState(character.form   ?? {});
  const [skillTreino, setSkillTreino] = useState(character.skillTreino ?? {});
  const [skillOutros, setSkillOutros] = useState(character.skillOutros ?? {});
  const [treinoOpen, setTreinoOpen] = useState(null);
  const [outrosEditing, setOutrosEditing] = useState(null);
  const [skillAttr, setSkillAttr] = useState(character.skillAttr ?? {});
  const [attrOpen, setAttrOpen] = useState(null);
  const [pdBonus, setPdBonus] = useState(character.pdBonus ?? 0);
  const [pdEditing, setPdEditing] = useState(false);
  const handleAttrEdit = (key, val) => setAttrs(a => ({ ...a, [key]: val }));

  // ── Base stats at saved NEX (or 5% for new characters)
  const initNex = character.nex ?? 5;
  const cs0 = nexStats(initNex, classe?.id, initAttrs);

  const [pvMax,  setPvMax]  = useState(cs0.pv);
  const [sanMax, setSanMax] = useState(cs0.san);
  const [peMax,  setPeMax]  = useState(cs0.pe);
  const [hp,  setHp]  = useState(cs0.pv);
  const [san, setSan] = useState(cs0.san);
  const [pe,  setPe]  = useState(cs0.pe);
  const [nex, setNex] = useState(initNex);
  const [showNexMenu, setShowNexMenu] = useState(false);
  const nexBtnRef = useRef(null);
  const auraRef   = useRef(null);
  const [activeTab, setActiveTab] = useState("combate");
  const [diceInput, setDiceInput] = useState("");
  const [rollPopup, setRollPopup] = useState(null);
  const [attacks, setAttacks] = useState([]);
  const [showNewAtk, setShowNewAtk] = useState(false);
  const [newAtk, setNewAtk] = useState({ name:"", dmg:"", crit:"x2" });
  const [desc, setDesc] = useState({
    anotacoes: form.anotacoes || "",
    aparencia: form.aparencia || "",
    personalidade: form.personalidade || "",
    historico: form.historico || "",
  });

  useEffect(() => {
    if (rollPopup?.crit) {
      auraRef.current = startAuraSound();
    } else {
      stopAuraSound(auraRef.current);
      auraRef.current = null;
    }
    return () => { stopAuraSound(auraRef.current); auraRef.current = null; };
  }, [rollPopup?.crit]);

  // derived
  const defesa   = 10 + attrs.AGI;
  const esquiva  = attrs.AGI;
  const bloqueio = 0;
  const peturno  = 1 + (nex === 99 ? 19 : (nex - 5) / 5);
  const desl     = `${6 + attrs.AGI}m / ${4 + attrs.AGI}q`;

  const handleAttrRoll = (key) => {
    const res = rollOP(attrs[key]);
    const LABEL = { AGI:"Agilidade", FOR:"Força", INT:"Intelecto", PRE:"Presença", VIG:"Vigor" };
    setRollPopup({ attr: LABEL[key], key, ...res });
  };

  const handleNexChange = (newNex) => {
    const ns = nexStats(newNex, classe?.id, attrs);
    setPvMax(ns.pv);  setHp(v  => Math.min(v, ns.pv));
    setSanMax(ns.san); setSan(v => Math.min(v, ns.san));
    setPeMax(ns.pe);  setPe(v  => Math.min(v, ns.pe));
    setNex(newNex);
    setShowNexMenu(false);
    onUpdate?.({ ...character, nex: newNex });
  };

  const rollFreeInput = () => {
    const match = diceInput.match(/^(\d+)?[dD](\d+)([+-]\d+)?$/);
    if (!match) { setRollPopup({ attr:"Erro", rolls:[], result:"Ex: 1d20+3", worst:false }); return; }
    const n=parseInt(match[1]||"1"), d=parseInt(match[2]), mod=parseInt(match[3]||"0");
    const rolls=Array.from({length:n},()=>Math.floor(Math.random()*d)+1);
    const crit=d===20&&rolls.includes(20);
    setRollPopup({ attr:diceInput.toUpperCase(), rolls, result:rolls.reduce((a,b)=>a+b,0)+mod, worst:false, crit, dice:`D${d}` });
  };

  // perícias
  const pericias = [
    {n:"Acrobacia+",    attr:"AGI"},{n:"Adestramento*",attr:"PRE"},{n:"Artes*",       attr:"PRE"},
    {n:"Atletismo",     attr:"FOR"},{n:"Atualidades",  attr:"INT"},{n:"Ciências*",    attr:"INT"},
    {n:"Crime*+",       attr:"AGI"},{n:"Diplomacia",   attr:"PRE"},{n:"Enganação",    attr:"PRE"},
    {n:"Fortitude",     attr:"VIG"},{n:"Furtividade+", attr:"AGI"},{n:"Iniciativa",   attr:"AGI"},
    {n:"Intimidação",   attr:"PRE"},{n:"Intuição",     attr:"PRE"},{n:"Investigação", attr:"INT"},
    {n:"Luta",          attr:"FOR"},{n:"Medicina*",    attr:"INT"},{n:"Ocultismo*",   attr:"INT"},
    {n:"Percepção",     attr:"PRE"},{n:"Pilotagem*",   attr:"AGI"},{n:"Pontaria",     attr:"AGI"},
    {n:"Profissão*",    attr:"INT"},{n:"Reflexos",     attr:"AGI"},{n:"Religião*",    attr:"PRE"},
    {n:"Sobrevivência*",attr:"INT"},{n:"Tática*",      attr:"INT"},{n:"Tecnologia*",  attr:"INT"},
    {n:"Vontade",       attr:"PRE"},
  ];

  const trainedSkills = new Set([
    ...(origem?.skills?.map(s=>s.replace(/[*+]/g,""))||[]),
    ...(classe?.id==="combatente"?["Luta","Pontaria","Iniciativa","Atletismo","Reflexos"]:
        classe?.id==="especialista"?["Investigação","Ciências","Tecnologia","Percepção"]:
        ["Ocultismo","Vontade","Religião","Intuição"]),
  ]);
  const treinoColor = v => v===5?"#4ade80":v===10?"#60a5fa":v===15?"#c9a84c":"var(--muted)";
  const getT = (n) => {
    const base = n.replace(/[*+]/g,"");
    const defaultVal = trainedSkills.has(base) ? 5 : 0;
    const val = skillTreino[base] ?? defaultVal;
    return val > 0 ? { bonus: val, color:"#7a5fd4" } : { bonus:0, color:"var(--muted)" };
  };

  useEffect(() => {
    if (!treinoOpen) return;
    const close = () => setTreinoOpen(null);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [treinoOpen]);

  useEffect(() => {
    if (!attrOpen) return;
    const close = () => setAttrOpen(null);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [attrOpen]);

  const tabs = ["combate","habilidades","rituais","inventário","descrição"];

  /* ── left col width */
  const isMobile = window.innerWidth < 768;
  const leftW = isMobile ? "100%" : 310;

  return (
    <div style={{display:"flex",flexDirection:"column",gap:0,position:"relative",fontFamily:"Crimson Pro,serif"}}>

      {/* ── NEX dropdown (fixed, escapes overflow:hidden) ── */}
      {showNexMenu && (() => {
        const r = nexBtnRef.current?.getBoundingClientRect() ?? {bottom:0,left:0,width:80};
        return (
          <div style={{position:"fixed",top:r.bottom+4,left:r.left,width:Math.max(r.width,72),zIndex:9998,background:"var(--card2)",border:"1px solid rgba(201,168,76,0.5)",borderRadius:6,boxShadow:"0 6px 24px rgba(0,0,0,0.9)",maxHeight:220,overflowY:"auto"}}
            onMouseLeave={()=>setShowNexMenu(false)}>
            {NEX_STEPS.map(v=>(
              <div key={v} onClick={()=>handleNexChange(v)}
                style={{padding:"7px 10px",fontFamily:"Cinzel,serif",fontSize:11,textAlign:"center",cursor:"pointer",
                  color: v===nex?"var(--gold)":"var(--muted2)",
                  background: v===nex?"rgba(201,168,76,0.14)":"transparent",
                  borderLeft: v===nex?"2px solid var(--gold)":"2px solid transparent",
                  transition:"background 0.15s"}}
                onMouseEnter={e=>e.currentTarget.style.background="rgba(201,168,76,0.08)"}
                onMouseLeave={e=>e.currentTarget.style.background=v===nex?"rgba(201,168,76,0.14)":"transparent"}>
                {v}%
              </div>
            ))}
          </div>
        );
      })()}

      {/* ── Roll popup ── */}
      {rollPopup && (
        <div style={{position:"fixed",bottom:16,right:16,zIndex:9999,background:rollPopup.crit?"rgba(20,15,0,0.97)":"var(--card)",border:`1px solid ${rollPopup.crit?"rgba(255,215,0,0.8)":"rgba(201,168,76,0.5)"}`,borderRadius:10,padding:"12px 16px",minWidth:190,boxShadow:"0 6px 32px rgba(0,0,0,0.9)",animation:"fadeIn 0.25s ease",display:"flex",gap:10,alignItems:"center"}}>
          <div style={{width:38,height:38,borderRadius:6,background:rollPopup.crit?"rgba(255,200,0,0.18)":"rgba(201,168,76,0.12)",border:`1px solid ${rollPopup.crit?"rgba(255,215,0,0.9)":"rgba(201,168,76,0.4)"}`,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",flexShrink:0,animation:rollPopup.crit?"critAura 1.2s ease-in-out infinite":undefined,gap:1}}>
            <span style={{fontSize:rollPopup.crit?15:13,color:rollPopup.crit?"#ffe86a":"var(--gold)",lineHeight:1}}>⬡</span>
            <span style={{fontFamily:"Cinzel,serif",fontSize:7,color:rollPopup.crit?"#ffe86a":"var(--muted2)",letterSpacing:0.5,lineHeight:1,fontWeight:700}}>{rollPopup.dice||"D?"}</span>
          </div>
          <div style={{flex:1}}>
            <div style={{fontFamily:"Cinzel,serif",fontSize:10,color:"var(--gold)",marginBottom:2,fontWeight:600}}>{rollPopup.attr}</div>
            <div style={{fontFamily:"Crimson Pro,serif",fontSize:11,color:"var(--muted2)",marginBottom:3}}>[{rollPopup.rolls.join(", ")}]{rollPopup.worst?" → pior":" → maior"}</div>
            <div style={{display:"flex",alignItems:"baseline",gap:5}}>
              <span style={{fontSize:11,color:"var(--muted2)"}}>=</span>
              <span style={{fontFamily:"'Cinzel Decorative',serif",fontSize:28,color:"var(--gold2)",fontWeight:700,lineHeight:1}}>{rollPopup.result}</span>
            </div>
          </div>
          <button onClick={()=>setRollPopup(null)} style={{position:"absolute",top:5,right:7,background:"none",border:"none",color:"var(--muted)",cursor:"pointer",fontSize:13}}>✕</button>
        </div>
      )}

      {/* ── Top header bar ── */}
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12,padding:"8px 12px",background:"var(--card)",border:"1px solid var(--border)",borderRadius:8}}>
        <div style={{width:72,height:72,borderRadius:8,background:"rgba(201,168,76,0.08)",border:"1px solid var(--border2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:32,flexShrink:0,overflow:"hidden"}}>
          {form.avatar
            ? <img src={form.avatar} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
            : "🕵️"}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"3px 16px",flex:1,minWidth:0}}>
          {/* PERSONAGEM */}
          <div>
            <div style={{fontFamily:"Cinzel,serif",fontSize:8,color:"var(--muted2)",letterSpacing:2,textTransform:"uppercase",marginBottom:2}}>Personagem</div>
            <input
              value={form.personagem}
              onChange={e=>{ const f={...form,personagem:e.target.value}; setForm(f); onUpdate?.({...character,form:f,origem,classe}); }}
              placeholder="—"
              style={{
                width:"100%", boxSizing:"border-box",
                background:"transparent", border:"none", borderBottom:"1px solid transparent",
                fontFamily:"Cinzel,serif", fontSize:13, color:"var(--gold)",
                outline:"none", padding:"1px 0", cursor:"text",
                transition:"border-color 0.2s",
              }}
              onFocus={e=>e.target.style.borderBottomColor="rgba(201,168,76,0.5)"}
              onBlur={e=>e.target.style.borderBottomColor="transparent"}
            />
          </div>
          {/* JOGADOR */}
          <div>
            <div style={{fontFamily:"Cinzel,serif",fontSize:8,color:"var(--muted2)",letterSpacing:2,textTransform:"uppercase",marginBottom:2}}>Jogador</div>
            <input
              value={form.jogador}
              onChange={e=>{ const f={...form,jogador:e.target.value}; setForm(f); onUpdate?.({...character,form:f,origem,classe}); }}
              placeholder="—"
              style={{
                width:"100%", boxSizing:"border-box",
                background:"transparent", border:"none", borderBottom:"1px solid transparent",
                fontFamily:"Cinzel,serif", fontSize:13, color:"var(--gold)",
                outline:"none", padding:"1px 0", cursor:"text",
                transition:"border-color 0.2s",
              }}
              onFocus={e=>e.target.style.borderBottomColor="rgba(201,168,76,0.5)"}
              onBlur={e=>e.target.style.borderBottomColor="transparent"}
            />
          </div>
          {/* ORIGEM */}
          <div>
            <div style={{fontFamily:"Cinzel,serif",fontSize:8,color:"var(--muted2)",letterSpacing:2,textTransform:"uppercase",marginBottom:2}}>Origem</div>
            <select
              value={origem?.id || ""}
              onChange={e=>{ const o=ORIGENS.find(o=>o.id===e.target.value)||null; setOrigem(o); onUpdate?.({...character,form,origem:o,classe}); }}
              style={{
                width:"100%", background:"transparent", border:"none",
                borderBottom:"1px solid transparent",
                fontFamily:"Cinzel,serif", fontSize:13, color:"var(--gold)",
                outline:"none", padding:"1px 0", cursor:"pointer",
                transition:"border-color 0.2s", appearance:"none",
              }}
              onFocus={e=>e.target.style.borderBottomColor="rgba(201,168,76,0.5)"}
              onBlur={e=>e.target.style.borderBottomColor="transparent"}
            >
              <option value="" style={{background:"#1a1a2e",color:"#aaa"}}>—</option>
              {ORIGENS.map(o=>(
                <option key={o.id} value={o.id} style={{background:"#1a1a2e",color:"var(--gold)"}}>{o.name}</option>
              ))}
            </select>
          </div>
          {/* CLASSE */}
          <div>
            <div style={{fontFamily:"Cinzel,serif",fontSize:8,color:"var(--muted2)",letterSpacing:2,textTransform:"uppercase",marginBottom:2}}>Classe</div>
            <select
              value={classe?.id || ""}
              onChange={e=>{ const c=CLASSES.find(c=>c.id===e.target.value)||null; setClasse(c); onUpdate?.({...character,form,origem,classe:c}); }}
              style={{
                width:"100%", background:"transparent", border:"none",
                borderBottom:"1px solid transparent",
                fontFamily:"Cinzel,serif", fontSize:13, color:"var(--gold)",
                outline:"none", padding:"1px 0", cursor:"pointer",
                transition:"border-color 0.2s", appearance:"none",
              }}
              onFocus={e=>e.target.style.borderBottomColor="rgba(201,168,76,0.5)"}
              onBlur={e=>e.target.style.borderBottomColor="transparent"}
            >
              <option value="" style={{background:"#1a1a2e",color:"#aaa"}}>—</option>
              {CLASSES.map(c=>(
                <option key={c.id} value={c.id} style={{background:"#1a1a2e",color:"var(--gold)"}}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>
        <button onClick={onBack} className="btn-ghost" style={{fontSize:8,padding:"5px 12px",flexShrink:0}}>← Voltar</button>
      </div>

      {/* ── Main 3-col layout ── */}
      <div style={{display:"grid",gridTemplateColumns:"340px 1fr 1fr",gap:10,alignItems:"start"}}>

        {/* ════ LEFT COL ════ */}
        <div style={{display:"flex",flexDirection:"column",gap:10}}>

          {/* Attribute diagram */}
          <div style={{background:"var(--card)",border:"1px solid var(--border)",borderRadius:8,padding:"10px 6px 14px",overflow:"hidden"}}>
            <div style={{fontFamily:"Cinzel,serif",fontSize:9,letterSpacing:2,color:"var(--muted2)",textTransform:"uppercase",textAlign:"center",marginBottom:4}}>Número: editar · Círculo: rolar</div>
            <AttrDiagram attrs={attrs} onRoll={handleAttrRoll} onEdit={handleAttrEdit}/>
            {/* NEX + PD/turno + Deslocamento */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:5,marginTop:10,padding:"0 8px"}}>
              {/* NEX — clicável */}
              <div ref={nexBtnRef} onClick={()=>setShowNexMenu(v=>!v)}
                style={{background:"var(--card2)",border:`1px solid ${showNexMenu?"rgba(201,168,76,0.7)":"var(--border)"}`,borderRadius:4,padding:"7px 4px",textAlign:"center",cursor:"pointer",userSelect:"none",position:"relative"}}>
                <div style={{fontFamily:"Cinzel,serif",fontSize:8,color:"var(--muted2)",letterSpacing:1,textTransform:"uppercase"}}>NEX ▾</div>
                <div style={{fontFamily:"Cinzel,serif",fontSize:13,color:"var(--gold)",fontWeight:600}}>{nex}%</div>
              </div>
              {/* PD/turno + Desl estáticos */}
              <div style={{background:"var(--card2)",border:"1px solid var(--border)",borderRadius:4,padding:"7px 4px",textAlign:"center"}}>
                <div style={{fontFamily:"Cinzel,serif",fontSize:8,color:"var(--muted2)",letterSpacing:1,textTransform:"uppercase"}}>PD / TURNO</div>
                {pdEditing ? (
                  <input
                    autoFocus type="number" min={0} max={999}
                    defaultValue={pdBonus}
                    onBlur={e=>{const v=Math.max(0,Math.min(999,parseInt(e.target.value)||0));setPdBonus(v);onUpdate?.({...character,form,origem,classe,skillTreino,skillOutros,skillAttr,pdBonus:v});setPdEditing(false);}}
                    onKeyDown={e=>{if(e.key==="Enter"||e.key==="Escape"){const v=Math.max(0,Math.min(999,parseInt(e.target.value)||0));setPdBonus(v);onUpdate?.({...character,form,origem,classe,skillTreino,skillOutros,skillAttr,pdBonus:v});setPdEditing(false);}}}
                    style={{width:"100%",background:"transparent",border:"none",borderBottom:"1px solid var(--gold)",textAlign:"center",fontFamily:"Cinzel,serif",fontSize:13,color:"var(--gold)",fontWeight:600,padding:0,outline:"none",MozAppearance:"textfield"}}
                  />
                ) : (
                  <div onClick={()=>setPdEditing(true)} style={{fontFamily:"Cinzel,serif",fontSize:13,color:"var(--gold)",fontWeight:600,cursor:"pointer",userSelect:"none"}}>{peturno+pdBonus}</div>
                )}
              </div>
              <div style={{background:"var(--card2)",border:"1px solid var(--border)",borderRadius:4,padding:"7px 4px",textAlign:"center"}}>
                <div style={{fontFamily:"Cinzel,serif",fontSize:8,color:"var(--muted2)",letterSpacing:1,textTransform:"uppercase"}}>DESLOCAMENTO</div>
                <div style={{fontFamily:"Cinzel,serif",fontSize:13,color:"var(--gold)",fontWeight:600}}>{desl}</div>
              </div>
            </div>
          </div>

          {/* Bars */}
          <div style={{background:"var(--card)",border:"1px solid var(--border)",borderRadius:8,padding:"12px 12px 6px"}}>
            <Bar val={hp}  set={setHp}  max={pvMax}  setMax={setPvMax}  color="#8b2020" label="VIDA"/>
            <Bar val={san} set={setSan} max={sanMax} setMax={setSanMax} color="#5a2090" label="DETERMINAÇÃO"/>
            <Bar val={pe}  set={setPe}  max={peMax}  setMax={setPeMax}  color="#0e7a8a" label="ESFORÇO"/>
          </div>

          {/* Defense block */}
          <div style={{background:"var(--card)",border:"1px solid var(--border)",borderRadius:8,padding:"12px 14px"}}>
            {/* DEFESA main badge */}
            <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:12}}>
              <div style={{
                width:54,height:54,borderRadius:8,flexShrink:0,
                background:"rgba(201,168,76,0.08)",border:"2px solid rgba(201,168,76,0.4)",
                display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
                boxShadow:"0 0 12px rgba(201,168,76,0.1)",
              }}>
                <span style={{fontFamily:"'Cinzel Decorative',serif",fontSize:20,color:"var(--gold)",lineHeight:1,fontWeight:700}}>{defesa}</span>
              </div>
              <div>
                <div style={{fontFamily:"Cinzel,serif",fontSize:11,letterSpacing:2,color:"var(--gold)",textTransform:"uppercase",marginBottom:4}}>DEFESA</div>
                <div style={{fontFamily:"Crimson Pro,serif",fontSize:14,color:"var(--muted2)"}}>= 10 + AGI <span style={{color:"var(--gold)"}}>+{attrs.AGI}</span></div>
                <div style={{display:"flex",gap:16,marginTop:4}}>
                  <div>
                    <div style={{fontFamily:"Cinzel,serif",fontSize:9,letterSpacing:1,color:"var(--muted2)",textTransform:"uppercase"}}>BLOQUEIO</div>
                    <div style={{fontFamily:"Cinzel,serif",fontSize:16,color:"var(--text)",fontWeight:600}}>{bloqueio}</div>
                  </div>
                  <div>
                    <div style={{fontFamily:"Cinzel,serif",fontSize:9,letterSpacing:1,color:"var(--muted2)",textTransform:"uppercase"}}>ESQUIVA</div>
                    <div style={{fontFamily:"Cinzel,serif",fontSize:16,color:"var(--text)",fontWeight:600}}>{esquiva}</div>
                  </div>
                </div>
              </div>
            </div>
            {/* Proteção / Resistências / Proficiências */}
            {[{l:"PROTEÇÃO",v:"—"},{l:"RESISTÊNCIAS",v:"—"},{l:"PROFICIÊNCIAS",v:`+${Math.floor(nex/20)+2}`}].map(({l,v})=>(
              <div key={l} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"7px 0",borderTop:"1px solid var(--border)"}}>
                <span style={{fontFamily:"Cinzel,serif",fontSize:10,letterSpacing:1.5,color:"var(--muted2)",textTransform:"uppercase"}}>{l}</span>
                <span style={{fontFamily:"Cinzel,serif",fontSize:13,color:"var(--text)"}}>{v}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ════ CENTER — Perícias ════ */}
        <div style={{background:"var(--card)",border:"1px solid var(--border)",borderRadius:8,display:"flex",flexDirection:"column"}}>
          {/* Header */}
          <div style={{display:"grid",gridTemplateColumns:"22px 1fr 50px 42px 44px 42px",gap:"0 4px",padding:"9px 10px",borderBottom:"1px solid var(--border)",background:"rgba(201,168,76,0.06)"}}>
            <div/>
            <div style={{fontFamily:"Cinzel,serif",fontSize:11,letterSpacing:2,color:"var(--gold)",textTransform:"uppercase"}}>PERÍCIA</div>
            {["DADOS","BÔNUS","Treino","Outros"].map(h=>(
              <div key={h} style={{fontFamily:"Cinzel,serif",fontSize:8,color:"var(--muted2)",letterSpacing:1,textTransform:"uppercase",textAlign:"center"}}>{h}</div>
            ))}
          </div>
          {/* Rows */}
          <div>
            {pericias.map((p,i)=>{
              const base = p.n.replace(/[*+]/g,"");
              const cur = skillTreino[base] ?? (trainedSkills.has(base)?5:0);
              const attrKey = skillAttr[base] ?? p.attr;
              const t = getT(p.n);
              const outros = skillOutros[base] ?? 0;
              const totalBonus = t.bonus + outros;
              const isTrained = t.bonus>0;
              return (
                <div key={p.n}
                  style={{display:"grid",gridTemplateColumns:"22px 1fr 50px 42px 44px 42px",gap:"0 4px",alignItems:"center",padding:"6px 10px",background:i%2===0?"transparent":"rgba(255,255,255,0.018)",borderBottom:"1px solid rgba(201,168,76,0.05)",cursor:"pointer",transition:"background 0.15s"}}
                  onMouseEnter={e=>e.currentTarget.style.background="rgba(201,168,76,0.08)"}
                  onMouseLeave={e=>e.currentTarget.style.background=i%2===0?"transparent":"rgba(255,255,255,0.018)"}
                  onClick={()=>{
                    const res=rollOP(attrs[attrKey]);
                    const total=res.result+totalBonus;
                    setRollPopup({attr:`${base} (${attrKey})`,rolls:res.rolls,result:total,worst:res.worst,crit:res.crit,dice:res.dice});
                  }}>
                  <span style={{fontSize:11,color:treinoColor(cur),textAlign:"center"}}>⬡</span>
                  <span style={{fontFamily:"Crimson Pro,serif",fontSize:15,color:cur>0?treinoColor(cur):"var(--text)",userSelect:"none"}}>{p.n}</span>
                  {(()=>{
                    const isOpen=attrOpen===base;
                    return (
                      <div style={{position:"relative",textAlign:"center"}}>
                        <span
                          onClick={e=>{e.stopPropagation();setAttrOpen(isOpen?null:base);}}
                          style={{fontFamily:"Cinzel,serif",fontSize:10,color:cur>0?treinoColor(cur):"var(--muted2)",cursor:"pointer",userSelect:"none"}}
                        >({attrKey})</span>
                        {isOpen&&(
                          <div onClick={e=>e.stopPropagation()} style={{position:"absolute",zIndex:200,left:"50%",transform:"translateX(-50%)",top:"100%",marginTop:4,background:"var(--card)",border:"1px solid var(--border)",borderRadius:6,overflow:"hidden",minWidth:52,boxShadow:"0 4px 16px rgba(0,0,0,0.5)"}}>
                            {["AGI","FOR","INT","PRE","VIG"].map(a=>(
                              <div key={a}
                                onClick={e=>{
                                  e.stopPropagation();
                                  const updated={...skillAttr,[base]:a};
                                  setSkillAttr(updated);
                                  onUpdate?.({...character,form,origem,classe,skillTreino,skillOutros,skillAttr:updated});
                                  setAttrOpen(null);
                                }}
                                onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,0.12)"}
                                onMouseLeave={e=>e.currentTarget.style.background=attrKey===a?"rgba(255,255,255,0.07)":"transparent"}
                                style={{padding:"6px 0",textAlign:"center",fontFamily:"Cinzel,serif",fontSize:10,color:attrKey===a?(cur>0?treinoColor(cur):"var(--gold)"):"var(--muted2)",fontWeight:attrKey===a?"700":"400",cursor:"pointer",background:attrKey===a?"rgba(255,255,255,0.07)":"transparent",borderBottom:a!=="VIG"?"1px solid var(--border)":"none"}}
                              >{a}</div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                  <span style={{fontFamily:"Cinzel,serif",fontSize:11,color:cur>0?treinoColor(cur):"var(--muted)",textAlign:"center"}}>({totalBonus})</span>
                  {(()=>{
                    const isOpen=treinoOpen===base;
                    return (
                      <div style={{position:"relative",textAlign:"center"}}>
                        <span
                          onClick={e=>{e.stopPropagation();setTreinoOpen(isOpen?null:base);}}
                          style={{fontFamily:"Cinzel,serif",fontSize:11,color:treinoColor(cur),fontWeight:cur>0?"700":"400",cursor:"pointer",userSelect:"none"}}
                        >{cur}</span>
                        {isOpen&&(
                          <div onClick={e=>e.stopPropagation()} style={{position:"absolute",zIndex:200,left:"50%",transform:"translateX(-50%)",top:"100%",marginTop:4,background:"var(--card)",border:"1px solid var(--border)",borderRadius:6,overflow:"hidden",minWidth:44,boxShadow:"0 4px 16px rgba(0,0,0,0.5)"}}>
                            {[0,5,10,15].map(v=>(
                              <div key={v}
                                onClick={e=>{
                                  e.stopPropagation();
                                  const updated={...skillTreino,[base]:v};
                                  setSkillTreino(updated);
                                  onUpdate?.({...character,form,origem,classe,skillTreino:updated,skillOutros});
                                  setTreinoOpen(null);
                                }}
                                onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,0.12)"}
                                onMouseLeave={e=>e.currentTarget.style.background=cur===v?"rgba(255,255,255,0.07)":"transparent"}
                                style={{padding:"6px 0",textAlign:"center",fontFamily:"Cinzel,serif",fontSize:11,color:treinoColor(v),fontWeight:v>0?"700":"400",cursor:"pointer",background:cur===v?"rgba(255,255,255,0.07)":"transparent",borderBottom:v!==15?"1px solid var(--border)":"none"}}
                              >{v}</div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                  {(()=>{
                    const outrosVal = skillOutros[base] ?? 0;
                    const isEditing = outrosEditing === base;
                    const saveOutros = (raw) => {
                      const v = Math.max(0, Math.min(99, parseInt(raw)||0));
                      const updated = {...skillOutros, [base]: v};
                      setSkillOutros(updated);
                      onUpdate?.({...character,form,origem,classe,skillTreino,skillOutros:updated});
                      setOutrosEditing(null);
                    };
                    return isEditing ? (
                      <input
                        autoFocus type="number" min={0} max={99}
                        defaultValue={outrosVal}
                        onClick={e=>e.stopPropagation()}
                        onBlur={e=>saveOutros(e.target.value)}
                        onKeyDown={e=>{if(e.key==="Enter"||e.key==="Escape")saveOutros(e.target.value);}}
                        style={{width:"100%",background:"transparent",border:"none",borderBottom:`1px solid ${treinoColor(cur)}`,textAlign:"center",fontFamily:"Cinzel,serif",fontSize:11,color:cur>0?treinoColor(cur):"var(--text)",padding:"0 2px",outline:"none",MozAppearance:"textfield"}}
                      />
                    ) : (
                      <span
                        onClick={e=>{e.stopPropagation();setOutrosEditing(base);}}
                        style={{fontFamily:"Cinzel,serif",fontSize:11,color:cur>0?treinoColor(cur):"var(--muted)",textAlign:"center",cursor:"pointer",userSelect:"none",display:"block"}}
                      >{outrosVal}</span>
                    );
                  })()}
                </div>
              );
            })}
            {/* Footer note */}
            <div style={{padding:"10px 10px",borderTop:"1px solid var(--border)",fontFamily:"Crimson Pro,serif",fontSize:12,color:"var(--muted2)",fontStyle:"italic",textAlign:"center"}}>
              * Somente treinado · + Somente treinado com Bônus
            </div>
          </div>
        </div>

        {/* ════ RIGHT — Combate / Tabs ════ */}
        <div style={{background:"var(--card)",border:"1px solid var(--border)",borderRadius:8,display:"flex",flexDirection:"column"}}>
          {/* Tab bar */}
          <div style={{display:"flex",borderBottom:"1px solid var(--border)",background:"rgba(201,168,76,0.03)"}}>
            {tabs.map(t=>(
              <button key={t} onClick={()=>setActiveTab(t)} style={{
                flex:1,padding:"11px 2px",background:"none",border:"none",cursor:"pointer",
                fontFamily:"Cinzel,serif",fontSize:9,letterSpacing:1,textTransform:"uppercase",
                color:activeTab===t?"var(--gold)":"var(--muted2)",
                borderBottom:activeTab===t?"2px solid var(--gold)":"2px solid transparent",
                marginBottom:-1,transition:"all 0.2s",
              }}>{t}</button>
            ))}
          </div>

          <div style={{padding:14}}>

            {/* ── COMBATE ── */}
            {activeTab==="combate" && (
              <div style={{display:"flex",flexDirection:"column",gap:12}}>
                {/* Filter + dice input */}
                <div style={{display:"flex",gap:8}}>
                  <input placeholder="Filtrar ataques..." style={{flex:1,fontSize:12,padding:"7px 10px"}}/>
                </div>
                <div style={{display:"flex",gap:8}}>
                  <input value={diceInput} onChange={e=>setDiceInput(e.target.value)}
                    onKeyDown={e=>e.key==="Enter"&&rollFreeInput()}
                    placeholder="Rolar dados  (ex: 2d6+3)"
                    style={{flex:1,fontSize:12,padding:"7px 10px"}}/>
                  <button onClick={rollFreeInput} style={{padding:"0 12px",background:"var(--card2)",border:"1px solid var(--border2)",borderRadius:5,color:"var(--gold)",cursor:"pointer",fontSize:16}}>⬡</button>
                </div>
                {/* Quick attr roll buttons */}
                <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                  {Object.entries(attrs).map(([k,v])=>(
                    <button key={k} onClick={()=>handleAttrRoll(k)} style={{padding:"5px 11px",background:"rgba(201,168,76,0.08)",border:"1px solid rgba(201,168,76,0.25)",borderRadius:4,cursor:"pointer",fontFamily:"Cinzel,serif",fontSize:10,color:"var(--gold)",letterSpacing:1}}>{k}({v===0?"2↓":`${v}↑`})</button>
                  ))}
                </div>

                {/* Novo Ataque btn */}
                <button onClick={()=>setShowNewAtk(a=>!a)} style={{padding:"8px",background:"rgba(201,168,76,0.06)",border:"1px solid rgba(201,168,76,0.25)",borderRadius:5,color:"var(--gold)",cursor:"pointer",fontFamily:"Cinzel,serif",fontSize:10,letterSpacing:2,textTransform:"uppercase",width:"100%"}}>
                  {showNewAtk?"✕ Cancelar":"+ Novo Ataque"}
                </button>

                {/* New attack form */}
                {showNewAtk && (
                  <div style={{background:"var(--card2)",border:"1px solid var(--border2)",borderRadius:6,padding:12,display:"flex",flexDirection:"column",gap:8}}>
                    <input value={newAtk.name} onChange={e=>setNewAtk(a=>({...a,name:e.target.value}))} placeholder="Nome do ataque" style={{fontSize:13,padding:"6px 10px"}}/>
                    <div style={{display:"flex",gap:8}}>
                      <input value={newAtk.dmg} onChange={e=>setNewAtk(a=>({...a,dmg:e.target.value}))} placeholder="Dano (ex: 1d6+FOR)" style={{flex:1,fontSize:13,padding:"6px 10px"}}/>
                      <input value={newAtk.crit} onChange={e=>setNewAtk(a=>({...a,crit:e.target.value}))} placeholder="Crítico" style={{width:60,fontSize:13,padding:"6px 10px"}}/>
                    </div>
                    <button className="btn-gold" style={{padding:"8px",fontSize:10,letterSpacing:2}} onClick={()=>{
                      if(newAtk.name){ setAttacks(a=>[...a,{...newAtk}]); setNewAtk({name:"",dmg:"",crit:"x2"}); setShowNewAtk(false); }
                    }}>Adicionar</button>
                  </div>
                )}

                {/* Attacks list */}
                {attacks.length===0 ? (
                  <div style={{textAlign:"center",padding:"20px 0",fontFamily:"Crimson Pro,serif",fontSize:14,color:"var(--muted)",fontStyle:"italic"}}>Você ainda não possui ataques</div>
                ) : attacks.map((atk,i)=>(
                  <div key={i} style={{background:"var(--card2)",border:"1px solid var(--border)",borderRadius:6,padding:"10px 14px",display:"flex",alignItems:"center",gap:10}}>
                    <div style={{width:22,height:22,background:"rgba(122,95,212,0.15)",border:"1px solid rgba(122,95,212,0.3)",borderRadius:4,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,cursor:"pointer"}}
                      onClick={()=>{
                        const m=atk.dmg.match(/(\d+)?[dD](\d+)([+-]\d+)?/);
                        if(m){const n=parseInt(m[1]||"1"),d=parseInt(m[2]),mod=parseInt(m[3]||"0");const rolls=Array.from({length:n},()=>Math.floor(Math.random()*d)+1);const crit=d===20&&rolls.includes(20);setRollPopup({attr:atk.name,rolls,result:rolls.reduce((a,b)=>a+b,0)+mod,worst:false,crit,dice:`D${d}`});}
                      }}>
                      <span style={{fontSize:11,color:"#9b80e8"}}>⬡</span>
                    </div>
                    <div style={{flex:1}}>
                      <div style={{fontFamily:"Cinzel,serif",fontSize:12,color:"var(--text)",marginBottom:2}}>{atk.name}</div>
                      <div style={{fontFamily:"Crimson Pro,serif",fontSize:12,color:"var(--muted2)"}}>
                        <span>Dano: <span style={{color:"#9b80e8"}}>{atk.dmg}</span></span>
                        {atk.crit&&<><span style={{margin:"0 8px",color:"var(--muted)"}}>·</span><span>Crítico: <span style={{color:"#9b80e8"}}>{atk.crit}</span></span></>}
                      </div>
                    </div>
                    <button onClick={()=>setAttacks(a=>a.filter((_,j)=>j!==i))} style={{background:"none",border:"none",color:"var(--muted)",cursor:"pointer",fontSize:14,padding:"0 4px"}}>✕</button>
                  </div>
                ))}
              </div>
            )}

            {/* ── HABILIDADES ── */}
            {activeTab==="habilidades" && (
              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                <div style={{fontFamily:"Cinzel,serif",fontSize:9,letterSpacing:2,color:"var(--gold)",textTransform:"uppercase",marginBottom:4}}>Habilidades — NEX {nex}%</div>
                {classe && (
                  <div style={{padding:"10px 14px",background:"rgba(122,95,212,0.08)",border:"1px solid rgba(122,95,212,0.2)",borderRadius:6}}>
                    <div style={{fontFamily:"Cinzel,serif",fontSize:12,color:"var(--text)",marginBottom:4}}>{classe.icon} {classe.name}</div>
                    <div style={{fontFamily:"Crimson Pro,serif",fontSize:13,color:"var(--muted2)",lineHeight:1.6,fontStyle:"italic"}}>{classe.bonus}</div>
                  </div>
                )}
                {origem && (
                  <div style={{padding:"10px 14px",background:"rgba(201,168,76,0.04)",border:"1px solid rgba(201,168,76,0.12)",borderRadius:6}}>
                    <div style={{fontFamily:"Cinzel,serif",fontSize:9,color:"var(--muted2)",letterSpacing:1,textTransform:"uppercase",marginBottom:4}}>Poder · {origem.name}</div>
                    <div style={{fontFamily:"Crimson Pro,serif",fontSize:13,color:"var(--text)",lineHeight:1.65}}>{origem.power}</div>
                  </div>
                )}
                <div style={{fontFamily:"Crimson Pro,serif",fontSize:12,color:"var(--muted)",fontStyle:"italic",marginTop:4}}>Novas habilidades ao aumentar o NEX.</div>
              </div>
            )}

            {/* ── RITUAIS ── */}
            {activeTab==="rituais" && (
              <div style={{textAlign:"center",padding:"24px 0"}}>
                <div style={{fontSize:32,marginBottom:10}}>🌀</div>
                <div style={{fontFamily:"Cinzel,serif",fontSize:10,letterSpacing:2,color:"var(--muted)",textTransform:"uppercase",marginBottom:6}}>Nenhum Ritual</div>
                <div style={{fontFamily:"Crimson Pro,serif",fontSize:13,color:"var(--muted)",fontStyle:"italic",lineHeight:1.65,maxWidth:260,margin:"0 auto"}}>Rituais custam PE e são aprendidos ao aumentar afinidade paranormal. Ocultistas aprendem com base no Intelecto.</div>
              </div>
            )}

            {/* ── INVENTÁRIO ── */}
            {activeTab==="inventário" && (
              <div>
                <div style={{fontFamily:"Cinzel,serif",fontSize:9,letterSpacing:2,color:"var(--gold)",textTransform:"uppercase",marginBottom:8}}>Equipamentos</div>
                <div style={{fontFamily:"Crimson Pro,serif",fontSize:13,color:"var(--muted2)",fontStyle:"italic",marginBottom:10}}>Capacidade de carga baseada em Patente e NEX.</div>
                <button style={{width:"100%",padding:"8px",background:"rgba(201,168,76,0.05)",border:"1px solid var(--border)",borderRadius:4,color:"var(--muted2)",cursor:"pointer",fontFamily:"Cinzel,serif",fontSize:9,letterSpacing:2,textTransform:"uppercase"}}>+ Adicionar Item</button>
              </div>
            )}

            {/* ── DESCRIÇÃO ── */}
            {activeTab==="descrição" && (
              <div style={{display:"flex",flexDirection:"column",gap:16}}>
                {[
                  ["Anotações","anotacoes",120],
                  ["Aparência","aparencia",90],
                  ["Personalidade","personalidade",90],
                  ["Histórico","historico",90],
                ].map(([label,key,minH])=>(
                  <div key={key}>
                    <div style={{fontFamily:"Cinzel,serif",fontSize:9,letterSpacing:2,color:"#e8e8e8",textTransform:"uppercase",marginBottom:6,fontWeight:700}}>{label}</div>
                    <textarea
                      value={desc[key]}
                      onChange={e=>setDesc(d=>({...d,[key]:e.target.value}))}
                      style={{
                        width:"100%",
                        minHeight:minH,
                        background:"#1a1a1a",
                        border:"1px solid rgba(255,255,255,0.15)",
                        borderRadius:4,
                        color:"#cccccc",
                        fontFamily:"Crimson Pro,serif",
                        fontSize:14,
                        lineHeight:1.7,
                        padding:"8px 10px",
                        resize:"vertical",
                        boxSizing:"border-box",
                        outline:"none",
                      }}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════
   MUSIC SCREEN
═══════════════════════════════ */

async function ytFetchPlaylists(token) {
  const r = await fetch(
    "https://www.googleapis.com/youtube/v3/playlists?part=snippet,contentDetails&mine=true&maxResults=50",
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const d = await r.json();
  if (d.error) throw Object.assign(new Error(d.error.message), { status: d.error.code });
  return d.items || [];
}

async function ytFetchPlaylistItems(playlistId, token) {
  const r = await fetch(
    `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&playlistId=${playlistId}&maxResults=50`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const d = await r.json();
  if (d.error) throw Object.assign(new Error(d.error.message), { status: d.error.code });
  return d.items || [];
}

async function spFetchPlaylists(token) {
  const r = await fetch("https://api.spotify.com/v1/me/playlists?limit=50", {
    headers: { Authorization: `Bearer ${token}` },
  });
  const d = await r.json();
  if (d.error) throw Object.assign(new Error(d.error.message), { status: d.error.status });
  return d.items || [];
}

async function spFetchTracks(playlistId, token) {
  const r = await fetch(
    `https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=50&fields=items(track(id,name,duration_ms,artists,album(images)))`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const d = await r.json();
  if (d.error) throw Object.assign(new Error(d.error.message), { status: d.error.status });
  return (d.items || []).filter(i => i.track);
}

function spRandStr(n) {
  return Array.from(crypto.getRandomValues(new Uint8Array(n)))
    .map(b => "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"[b % 62])
    .join("");
}

async function spCodeChallenge(verifier) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function fmtDuration(ms) {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function fmtSeconds(s) {
  if (!s || s < 0) return "0:00";
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
}

/* ── Persistent Music Player Bar ── */
function MusicPlayerBar({ nowPlaying, onNowPlaying, ytPlayerRef }) {
  const [ytState, setYtState] = useState(-1);
  const [displayIdx, setDisplayIdx] = useState(nowPlaying?.startIdx || 0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [seeking, setSeeking] = useState(false);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  const [playerError, setPlayerError] = useState(null);
  const [playerReady, setPlayerReady] = useState(false);
  const pollRef = useRef(null);
  const displayIdxRef = useRef(displayIdx);
  const seekingRef = useRef(seeking);
  const autoplayTimerRef = useRef(null);
  const apiTimeoutRef = useRef(null);
  displayIdxRef.current = displayIdx;
  seekingRef.current = seeking;
  const gold = "var(--gold)";

  /* init / reinit YouTube IFrame player when playlist changes */
  useEffect(() => {
    if (nowPlaying?.svc !== "youtube") return;
    setCurrentTime(0);
    setDuration(0);
    setAutoplayBlocked(false);
    setPlayerError(null);
    setPlayerReady(false);
    if (autoplayTimerRef.current) clearTimeout(autoplayTimerRef.current);
    if (apiTimeoutRef.current) clearTimeout(apiTimeoutRef.current);

    const ytErrors = { 2: "ID inválido", 5: "Erro HTML5", 100: "Vídeo não encontrado ou removido", 101: "Playlist privada — torne-a pública ou não listada no YouTube para reproduzir", 150: "Playlist privada — torne-a pública ou não listada no YouTube para reproduzir" };

    const create = () => {
      // If player already exists, load new playlist without recreating
      if (ytPlayerRef.current && typeof ytPlayerRef.current.loadPlaylist === "function") {
        try {
          ytPlayerRef.current.loadPlaylist({ listType: "playlist", list: nowPlaying.playlistId, index: nowPlaying.startIdx || 0 });
          setPlayerReady(true);
          autoplayTimerRef.current = setTimeout(() => {
            const p = ytPlayerRef.current;
            if (p && typeof p.getPlayerState === "function" && p.getPlayerState() !== 1) setAutoplayBlocked(true);
          }, 3000);
          return;
        } catch (_) {}
      }
      // Destroy old player if exists
      if (ytPlayerRef.current) {
        try { ytPlayerRef.current.destroy(); } catch (_) {}
        ytPlayerRef.current = null;
      }
      // Find or recreate the host element (YouTube destroys it on destroy())
      let host = document.getElementById("yt-player-host");
      if (!host) {
        host = document.createElement("div");
        host.id = "yt-player-host";
        host.style.cssText = "position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;pointer-events:none";
        document.body.appendChild(host);
      }
      ytPlayerRef.current = new window.YT.Player(host, {
        height: 1, width: 1,
        playerVars: {
          listType: "playlist", list: nowPlaying.playlistId,
          index: nowPlaying.startIdx || 0,
          autoplay: 1, controls: 0, fs: 0, rel: 0,
          origin: window.location.origin,
        },
        events: {
          onStateChange: e => {
            setYtState(e.data);
            if (e.data === 1) { setAutoplayBlocked(false); setPlayerError(null); if (autoplayTimerRef.current) clearTimeout(autoplayTimerRef.current); }
          },
          onReady: e => {
            setPlayerReady(true);
            e.target.playVideo();
            setDisplayIdx(e.target.getPlaylistIndex() || 0);
            autoplayTimerRef.current = setTimeout(() => {
              const p = ytPlayerRef.current;
              if (p && typeof p.getPlayerState === "function" && p.getPlayerState() !== 1) setAutoplayBlocked(true);
            }, 3000);
          },
          onError: e => setPlayerError(ytErrors[e.data] || `Erro ${e.data}`),
        },
      });
    };

    const tryCreate = () => {
      if (window.YT?.Player) {
        create();
      } else {
        const prev = window.onYouTubeIframeAPIReady;
        window.onYouTubeIframeAPIReady = () => { if (prev) prev(); create(); };
        // Timeout: if API never loads (blocked by AdBlocker etc.)
        apiTimeoutRef.current = setTimeout(() => {
          if (!window.YT?.Player) setPlayerError("Player YouTube não carregou. Desative extensões e recarregue a página.");
        }, 10000);
      }
    };

    tryCreate();
    return () => {
      if (autoplayTimerRef.current) clearTimeout(autoplayTimerRef.current);
      if (apiTimeoutRef.current) clearTimeout(apiTimeoutRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nowPlaying?.playlistId]);

  /* poll current track index + progress */
  useEffect(() => {
    if (nowPlaying?.svc !== "youtube") return;
    pollRef.current = setInterval(() => {
      const p = ytPlayerRef.current;
      if (!p || typeof p.getPlaylistIndex !== "function") return;
      const idx = p.getPlaylistIndex();
      if (idx >= 0 && idx !== displayIdxRef.current) {
        setDisplayIdx(idx);
        onNowPlaying(prev => prev ? { ...prev, startIdx: idx } : prev);
      }
      if (!seekingRef.current) {
        if (typeof p.getCurrentTime === "function") setCurrentTime(Math.floor(p.getCurrentTime()));
        if (typeof p.getDuration === "function") setDuration(Math.floor(p.getDuration()));
      }
    }, 800);
    return () => clearInterval(pollRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nowPlaying?.svc]);

  /* handle repeat one */
  useEffect(() => {
    if (ytState !== 0 || !ytPlayerRef.current) return;
    if (nowPlaying?.repeat === "one") { ytPlayerRef.current.seekTo(0); ytPlayerRef.current.playVideo(); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ytState]);

  const isPlaying = ytState === 1;
  const tracks = nowPlaying?.tracks || [];
  const currentTrack = tracks[displayIdx];
  const thumb = currentTrack?.snippet?.thumbnails?.default?.url || nowPlaying?.playlistThumb || "";
  const title = currentTrack?.snippet?.title || nowPlaying?.playlistName || "";
  const channel = currentTrack?.snippet?.videoOwnerChannelTitle || "";
  const repeat = nowPlaying?.repeat || "none";

  const togglePlay = () => { const p = ytPlayerRef.current; if (!p) return; setAutoplayBlocked(false); setPlayerError(null); isPlaying ? p.pauseVideo() : p.playVideo(); };
  const prevTrack = () => { const p = ytPlayerRef.current; if (!p) return; displayIdx === 0 ? p.playVideoAt(Math.max(0, tracks.length - 1)) : p.previousVideo(); };
  const nextTrack = () => ytPlayerRef.current?.nextVideo();
  const cycleRepeat = () => {
    const modes = ["none", "all", "one"];
    const next = modes[(modes.indexOf(repeat) + 1) % 3];
    onNowPlaying(prev => ({ ...prev, repeat: next }));
    if (ytPlayerRef.current?.setLoop) ytPlayerRef.current.setLoop(next === "all");
  };
  const stop = () => {
    if (ytPlayerRef.current) { try { ytPlayerRef.current.stopVideo(); ytPlayerRef.current.destroy(); } catch (_) {} ytPlayerRef.current = null; }
    onNowPlaying(null);
  };

  const btnCtrl = {
    background: "transparent", border: "none", cursor: "pointer",
    color: "var(--muted2)", fontSize: 20, padding: "4px 8px", lineHeight: 1,
    display: "flex", alignItems: "center", justifyContent: "center", transition: "color 0.15s",
  };

  /* Spotify: embed iframe (no SDK without Premium) */
  if (nowPlaying?.svc === "spotify") {
    return (
      <div style={{ background: "rgba(8,8,8,0.97)", borderTop: "1px solid var(--border2)", padding: "10px 20px", display: "flex", gap: 14, alignItems: "center", backdropFilter: "blur(16px)" }}>
        <div style={{ width: 46, height: 46, borderRadius: 4, overflow: "hidden", flexShrink: 0, background: "var(--card2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          {nowPlaying.playlistThumb ? <img src={nowPlaying.playlistThumb} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ color: "var(--muted)", fontSize: 20 }}>♪</span>}
        </div>
        <div style={{ minWidth: 0, maxWidth: 160, flexShrink: 0 }}>
          <div style={{ fontFamily: "Cinzel,serif", fontSize: 9, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{nowPlaying.playlistName}</div>
          <div style={{ fontSize: 11, color: "#1db954", marginTop: 2 }}>● Spotify</div>
        </div>
        <div style={{ flex: 1, maxWidth: 520 }}>
          <iframe title={`Spotify: ${nowPlaying.playlistName}`}
            src={`https://open.spotify.com/embed/playlist/${nowPlaying.playlistId}?utm_source=generator&theme=0`}
            width="100%" height="72" style={{ border: "none", borderRadius: 6, display: "block" }}
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy" />
        </div>
        <button onClick={stop} style={{ ...btnCtrl, border: "1px solid var(--border)", width: 30, height: 30, borderRadius: 4, color: "var(--muted)" }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--border2)"; e.currentTarget.style.color = "var(--text)"; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--muted)"; }}>✕</button>
      </div>
    );
  }

  /* YouTube: full controls */
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div style={{ background: "rgba(8,8,8,0.97)", borderTop: "1px solid var(--border2)", padding: "8px 24px 10px", backdropFilter: "blur(16px)" }}>
      {playerError && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0 3px", color: "#e07070", fontFamily: "Cinzel,serif", fontSize: 9, letterSpacing: 0.5 }}>
          <span>⚠</span><span>{playerError}</span>
        </div>
      )}
      {/* Row 1: thumb + info + controls + stop */}
      <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
        {/* Thumb */}
        <div style={{ width: 42, height: 42, borderRadius: 4, overflow: "hidden", flexShrink: 0, background: "var(--card2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          {thumb ? <img src={thumb} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ color: "var(--muted)", fontSize: 20 }}>♪</span>}
        </div>
        {/* Info */}
        <div style={{ minWidth: 0, width: 200, flexShrink: 0 }}>
          <div style={{ fontFamily: "Cinzel,serif", fontSize: 9, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{title}</div>
          <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{channel}</div>
          {tracks.length > 0 && <div style={{ fontSize: 10, color: "#ff4444", marginTop: 1 }}>{displayIdx + 1} / {tracks.length}</div>}
        </div>
        {/* Controls */}
        <div style={{ display: "flex", gap: 4, alignItems: "center", margin: "0 auto" }}>
          <button onClick={cycleRepeat} title={repeat === "none" ? "Sem repetição" : repeat === "all" ? "Repetir playlist" : "Repetir música"}
            style={{ ...btnCtrl, color: repeat !== "none" ? gold : "var(--muted)", padding: "4px 6px" }}>
            {repeat === "one" ? (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="17 1 21 5 17 9" />
                <path d="M3 11V9a4 4 0 0 1 4-4h14" />
                <polyline points="7 23 3 19 7 15" />
                <path d="M21 13v2a4 4 0 0 1-4 4H3" />
                <line x1="12" y1="12" x2="12" y2="12" strokeWidth="3" />
              </svg>
            ) : (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="17 1 21 5 17 9" />
                <path d="M3 11V9a4 4 0 0 1 4-4h14" />
                <polyline points="7 23 3 19 7 15" />
                <path d="M21 13v2a4 4 0 0 1-4 4H3" />
              </svg>
            )}
          </button>
          <button onClick={prevTrack} style={btnCtrl}
            onMouseEnter={e => e.currentTarget.style.color = "var(--text)"}
            onMouseLeave={e => e.currentTarget.style.color = "var(--muted2)"}>⏮</button>
          <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center" }}>
            {autoplayBlocked && !playerError && (
              <div style={{ position: "absolute", bottom: "calc(100% + 6px)", left: "50%", transform: "translateX(-50%)", background: "rgba(201,168,76,0.12)", border: "1px solid var(--border2)", borderRadius: 4, padding: "3px 8px", whiteSpace: "nowrap", fontFamily: "Cinzel,serif", fontSize: 8, color: "var(--gold2)", letterSpacing: 0.5, pointerEvents: "none" }}>
                Clique para iniciar
              </div>
            )}
            <button onClick={togglePlay} disabled={!!playerError} style={{
              width: 42, height: 42, borderRadius: "50%",
              background: playerError ? "rgba(60,30,30,0.8)" : "linear-gradient(135deg,#c9a84c,#e8c96d)",
              border: playerError ? "1px solid #8b2020" : "none",
              cursor: playerError ? "not-allowed" : "pointer",
              fontSize: playerReady ? 16 : 13, color: "#050505", display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: autoplayBlocked ? "0 0 0 3px rgba(201,168,76,0.5), 0 2px 14px rgba(201,168,76,0.45)" : "0 2px 14px rgba(201,168,76,0.45)",
              transition: "transform 0.15s, box-shadow 0.15s",
              animation: autoplayBlocked && !playerError ? "pulse 1.2s ease-in-out infinite" : "none",
            }}
              onMouseEnter={e => { if (!playerError) { e.currentTarget.style.transform = "scale(1.1)"; e.currentTarget.style.boxShadow = "0 4px 20px rgba(201,168,76,0.65)"; } }}
              onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.boxShadow = autoplayBlocked ? "0 0 0 3px rgba(201,168,76,0.5), 0 2px 14px rgba(201,168,76,0.45)" : "0 2px 14px rgba(201,168,76,0.45)"; }}>
              {playerError ? "⚠" : !playerReady ? <div style={{ width: 14, height: 14, border: "2px solid rgba(5,5,5,0.3)", borderTopColor: "#050505", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} /> : isPlaying ? "⏸" : "▶"}
            </button>
          </div>
          <button onClick={nextTrack} style={btnCtrl}
            onMouseEnter={e => e.currentTarget.style.color = "var(--text)"}
            onMouseLeave={e => e.currentTarget.style.color = "var(--muted2)"}>⏭</button>
        </div>
        {/* Stop */}
        <button onClick={stop} style={{ ...btnCtrl, border: "1px solid var(--border)", width: 30, height: 30, borderRadius: 4, fontSize: 14, color: "var(--muted)" }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--border2)"; e.currentTarget.style.color = "var(--text)"; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--muted)"; }}>✕</button>
      </div>
      {/* Row 2: progress bar */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
        <span style={{ fontSize: 10, color: "var(--muted)", flexShrink: 0, fontVariantNumeric: "tabular-nums", minWidth: 32, textAlign: "right" }}>{fmtSeconds(currentTime)}</span>
        <div style={{ flex: 1, position: "relative", height: 16, display: "flex", alignItems: "center", cursor: "pointer" }}
          onClick={e => {
            const rect = e.currentTarget.getBoundingClientRect();
            const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
            const seekTo = Math.floor(ratio * (duration || 0));
            setCurrentTime(seekTo);
            ytPlayerRef.current?.seekTo(seekTo, true);
          }}>
          {/* Track */}
          <div style={{ position: "absolute", inset: "6px 0", borderRadius: 3, background: "rgba(255,255,255,0.1)" }} />
          {/* Fill */}
          <div style={{ position: "absolute", left: 0, top: 6, bottom: 6, width: `${progress}%`, borderRadius: 3, background: "linear-gradient(90deg,#a07830,#e8c96d)", transition: seeking ? "none" : "width 0.4s linear" }} />
          {/* Thumb */}
          <div style={{ position: "absolute", left: `${progress}%`, top: "50%", transform: "translate(-50%,-50%)", width: 12, height: 12, borderRadius: "50%", background: "var(--gold)", boxShadow: "0 0 6px rgba(201,168,76,0.7)", transition: seeking ? "none" : "left 0.4s linear", pointerEvents: "none" }} />
          {/* Invisible range input for drag support */}
          <input type="range" min={0} max={duration || 1} value={currentTime} step={1}
            onChange={e => setCurrentTime(Number(e.target.value))}
            onMouseDown={() => setSeeking(true)}
            onMouseUp={e => { setSeeking(false); ytPlayerRef.current?.seekTo(Number(e.target.value), true); }}
            onTouchStart={() => setSeeking(true)}
            onTouchEnd={e => { setSeeking(false); ytPlayerRef.current?.seekTo(Number(e.target.value), true); }}
            style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer", width: "100%", margin: 0 }} />
        </div>
        <span style={{ fontSize: 10, color: "var(--muted)", flexShrink: 0, fontVariantNumeric: "tabular-nums", minWidth: 32 }}>{fmtSeconds(duration)}</span>
      </div>
    </div>
  );
}

function MusicScreen({ nowPlaying, onNowPlaying, musicTokens, onMusicTokens, ytPlayerRef }) {
  const ytToken = musicTokens.yt;
  const spToken = musicTokens.sp;
  const setYtToken = t => onMusicTokens(prev => ({ ...prev, yt: t }));
  const setSpToken = t => onMusicTokens(prev => ({ ...prev, sp: t }));

  const [spClientId, setSpClientId] = useState(() => localStorage.getItem("nx_sp_cid") || "");
  const [spClientIdDraft, setSpClientIdDraft] = useState(() => localStorage.getItem("nx_sp_cid") || "");
  const [ytPlaylists, setYtPlaylists] = useState([]);
  const [spPlaylists, setSpPlaylists] = useState([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState(null);
  const [tracks, setTracks] = useState([]);
  const [tracksLoading, setTracksLoading] = useState(false);
  const [tab, setTab] = useState("youtube");
  const [loading, setLoading] = useState("");
  const [err, setErr] = useState("");
  const [spSetupOpen, setSpSetupOpen] = useState(false);
  const dragRef = useRef(null);
  const dragOverRef = useRef(null);

  /* ── Spotify OAuth callback handler ── */
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const code = p.get("code");
    const state = p.get("state");
    const savedState = localStorage.getItem("nx_sp_state");
    if (code && state && state === savedState) {
      window.history.replaceState({}, "", window.location.pathname);
      const cid = localStorage.getItem("nx_sp_cid");
      const ver = localStorage.getItem("nx_sp_ver");
      if (cid && ver) handleSpCallback(code, cid, ver);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Load playlists on mount if tokens already exist in localStorage ── */
  useEffect(() => {
    if (ytToken) {
      ytFetchPlaylists(ytToken)
        .then(items => { setYtPlaylists(items); setTab("youtube"); })
        .catch(() => { localStorage.removeItem("nx_yt_token"); localStorage.removeItem("nx_yt_exp"); setYtToken(null); });
    }
    if (spToken) {
      spFetchPlaylists(spToken)
        .then(items => { setSpPlaylists(items); if (!ytToken) setTab("spotify"); })
        .catch(() => { localStorage.removeItem("nx_sp_token"); localStorage.removeItem("nx_sp_exp"); setSpToken(null); });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSpCallback = async (code, cid, ver) => {
    setLoading("spotify");
    try {
      const redirectUri = window.location.origin + window.location.pathname.replace(/\/+$/, "");
      const body = new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
        client_id: cid,
        code_verifier: ver,
      });
      const r = await fetch("https://accounts.spotify.com/api/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
      });
      const d = await r.json();
      if (d.error) throw new Error(d.error_description || d.error);
      const exp = Date.now() + d.expires_in * 1000;
      localStorage.setItem("nx_sp_token", d.access_token);
      localStorage.setItem("nx_sp_exp", String(exp));
      setSpToken(d.access_token);
      const items = await spFetchPlaylists(d.access_token);
      setSpPlaylists(items);
      setTab("spotify");
      const uid = auth.currentUser?.uid;
      if (uid) await fsSetMusicLink(uid, "spotify", { clientId: cid, connectedAt: Date.now() });
    } catch (e) {
      setErr("Spotify: " + e.message);
    } finally {
      setLoading("");
      localStorage.removeItem("nx_sp_ver");
      localStorage.removeItem("nx_sp_state");
    }
  };

  const connectYouTube = async () => {
    setErr(""); setLoading("youtube");
    try {
      const prov = new GoogleAuthProvider();
      prov.addScope("https://www.googleapis.com/auth/youtube.readonly");
      prov.setCustomParameters({ prompt: "consent" });
      const user = auth.currentUser;
      const isGoogleUser = user?.providerData?.some(p => p.providerId === "google.com");
      const result = isGoogleUser
        ? await reauthenticateWithPopup(user, prov)
        : await signInWithPopup(auth, prov);
      const cred = GoogleAuthProvider.credentialFromResult(result);
      if (!cred?.accessToken) throw new Error("Token não obtido.");
      const token = cred.accessToken;
      const exp = Date.now() + 3500 * 1000; // ~1h
      const ytEmail = result.user.email || "";
      const ytName = result.user.displayName || "";
      localStorage.setItem("nx_yt_token", token);
      localStorage.setItem("nx_yt_exp", String(exp));
      localStorage.setItem("nx_yt_email", ytEmail);
      setYtToken(token);
      const items = await ytFetchPlaylists(token);
      setYtPlaylists(items);
      setTab("youtube");
      if (user?.uid) await fsSetMusicLink(user.uid, "youtube", { email: ytEmail, name: ytName, connectedAt: Date.now() });
    } catch (e) {
      if (e.code !== "auth/popup-closed-by-user" && e.code !== "auth/cancelled-popup-request") {
        setErr("YouTube: " + (e.message || "Tente novamente."));
      }
    } finally {
      setLoading("");
    }
  };

  const connectSpotify = async (overrideCid) => {
    const cid = overrideCid || spClientId;
    if (!cid) { setSpSetupOpen(true); return; }
    const ver = spRandStr(64);
    const state = spRandStr(16);
    localStorage.setItem("nx_sp_ver", ver);
    localStorage.setItem("nx_sp_state", state);
    localStorage.setItem("nx_sp_cid", cid);
    const challenge = await spCodeChallenge(ver);
    const redirectUri = window.location.origin + window.location.pathname.replace(/\/+$/, "");
    window.location.href = "https://accounts.spotify.com/authorize?" + new URLSearchParams({
      client_id: cid,
      response_type: "code",
      redirect_uri: redirectUri,
      code_challenge_method: "S256",
      code_challenge: challenge,
      state,
      scope: "playlist-read-private playlist-read-collaborative user-read-private",
    });
  };

  const disconnectYT = () => {
    localStorage.removeItem("nx_yt_token"); localStorage.removeItem("nx_yt_exp"); localStorage.removeItem("nx_yt_email");
    setYtToken(null); setYtPlaylists([]);
    if (selectedPlaylist?.svc === "youtube") setSelectedPlaylist(null);
    if (nowPlaying?.svc === "youtube") onNowPlaying(null);
    const uid = auth.currentUser?.uid;
    if (uid) fsDeleteMusicLink(uid, "youtube");
  };
  const disconnectSP = () => {
    localStorage.removeItem("nx_sp_token"); localStorage.removeItem("nx_sp_exp"); localStorage.removeItem("nx_sp_email");
    setSpToken(null); setSpPlaylists([]);
    if (selectedPlaylist?.svc === "spotify") setSelectedPlaylist(null);
    if (nowPlaying?.svc === "spotify") onNowPlaying(null);
    const uid = auth.currentUser?.uid;
    if (uid) fsDeleteMusicLink(uid, "spotify");
  };

  const openPlaylist = async (pl, svc) => {
    const name = svc === "youtube" ? pl.snippet?.title : pl.name;
    const thumb = svc === "youtube"
      ? (pl.snippet?.thumbnails?.medium?.url || pl.snippet?.thumbnails?.default?.url)
      : pl.images?.[0]?.url;
    const count = svc === "youtube" ? pl.contentDetails?.itemCount : pl.tracks?.total;
    setSelectedPlaylist({ id: pl.id, name, thumb, count, svc });
    setTracks([]);
    setTracksLoading(true);
    try {
      const rawItems = svc === "youtube"
        ? await ytFetchPlaylistItems(pl.id, ytToken)
        : await spFetchTracks(pl.id, spToken);
      const items = svc === "youtube"
        ? rawItems.map((item, i) => ({ ...item, _ytIdx: i }))
        : rawItems;
      setTracks(items);
    } catch (e) {
      setErr("Erro ao carregar faixas: " + e.message);
    } finally {
      setTracksLoading(false);
    }
  };

  const reorderTracks = (from, to) => {
    setTracks(prev => {
      const arr = [...prev];
      const [moved] = arr.splice(from, 1);
      arr.splice(to, 0, moved);
      return arr;
    });
  };

  const playTrack = (localIdx) => {
    const pl = selectedPlaylist;
    const isYt = pl.svc === "youtube";
    const ytIdx = isYt ? (tracks[localIdx]?._ytIdx ?? localIdx) : localIdx;
    const samePlaylist = nowPlaying?.playlistId === pl.id && nowPlaying?.svc === pl.svc;
    if (samePlaylist && isYt && ytPlayerRef?.current) {
      ytPlayerRef.current.playVideoAt(ytIdx);
      onNowPlaying(prev => prev ? { ...prev, startIdx: ytIdx } : prev);
      return;
    }
    const ytOrderedTracks = isYt
      ? [...tracks].sort((a, b) => (a._ytIdx ?? 0) - (b._ytIdx ?? 0))
      : tracks;
    onNowPlaying({
      svc: pl.svc, playlistId: pl.id, playlistName: pl.name,
      playlistThumb: pl.thumb, trackCount: pl.count,
      startIdx: ytIdx, tracks: ytOrderedTracks,
      repeat: nowPlaying?.repeat || "none",
    });
  };

  const isConnected = ytToken || spToken;
  const currentList = tab === "youtube" ? ytPlaylists : spPlaylists;
  const isTabConnected = tab === "youtube" ? !!ytToken : !!spToken;
  const gold = "var(--gold)";
  const card = { background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 };
  const isPlayingThis = (pl, svc) => nowPlaying?.playlistId === pl.id && nowPlaying?.svc === svc;
  const ytEmail = localStorage.getItem("nx_yt_email") || "";
  const ytTokenExpired = !ytToken && !!ytEmail;

  return (
    <div className="fade" style={{ maxWidth: 1100, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
        {selectedPlaylist && (
          <button onClick={() => { setSelectedPlaylist(null); setTracks([]); }} style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--muted2)", fontSize: 20, padding: "2px 6px", lineHeight: 1 }}
            onMouseEnter={e => e.currentTarget.style.color = "var(--text)"}
            onMouseLeave={e => e.currentTarget.style.color = "var(--muted2)"}
          >←</button>
        )}
        <div style={{ fontSize: 24, color: gold }}>♪</div>
        <div>
          <div style={{ fontFamily: "Cinzel Decorative,serif", fontSize: 17, color: gold, letterSpacing: 2 }}>
            {selectedPlaylist ? selectedPlaylist.name : "Trilhas Sonoras"}
          </div>
          <div style={{ color: "var(--muted)", fontSize: 12, marginTop: 2 }}>
            {selectedPlaylist
              ? `${tracks.length || selectedPlaylist.count || 0} faixas · ${selectedPlaylist.svc === "youtube" ? "YouTube" : "Spotify"}`
              : "Vincule YouTube ou Spotify para tocar suas playlists durante a sessão"}
          </div>
        </div>
        {(isConnected || ytTokenExpired) && !selectedPlaylist && (
          <div style={{ marginLeft: "auto", display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
            {/* YouTube badge */}
            {(ytToken || ytTokenExpired) && (() => {
              const expired = ytTokenExpired;
              const color = expired ? "var(--muted)" : "#ff4444";
              return (
                <div key="youtube" style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 20, border: `1px solid ${expired ? "var(--border2)" : "#ff4444"}`, background: expired ? "transparent" : "rgba(255,68,68,0.08)", transition: "all 0.2s" }}>
                  <svg viewBox="0 0 24 24" width="12" height="12" fill={color}><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
                  <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                    {ytEmail && <span style={{ fontFamily: "Cinzel,serif", fontSize: 8, color, letterSpacing: 0.5 }}>{ytEmail}</span>}
                    {expired && <span style={{ fontSize: 9, color: "#e07070", fontFamily: "Cinzel,serif", letterSpacing: 0.5 }}>Sessão expirada</span>}
                  </div>
                  {expired ? (
                    <button onClick={connectYouTube} style={{ background: "rgba(255,68,68,0.12)", border: "1px solid #ff4444", borderRadius: 4, cursor: "pointer", color: "#ff4444", fontSize: 8, fontFamily: "Cinzel,serif", padding: "2px 7px", letterSpacing: 1 }}>
                      Reconectar
                    </button>
                  ) : (
                    <button onClick={disconnectYT} title="Desconectar YouTube" style={{ background: "transparent", border: "none", cursor: "pointer", color: "rgba(255,68,68,0.5)", fontSize: 14, padding: "0 2px", lineHeight: 1, display: "flex", alignItems: "center" }}
                      onMouseEnter={e => e.currentTarget.style.color = "#ff4444"}
                      onMouseLeave={e => e.currentTarget.style.color = "rgba(255,68,68,0.5)"}>✕</button>
                  )}
                </div>
              );
            })()}
            {/* Spotify badge */}
            {spToken && (
              <div key="spotify" style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 20, border: "1px solid #1db954", background: "rgba(29,185,84,0.08)", transition: "all 0.2s" }}>
                <svg viewBox="0 0 24 24" width="12" height="12" fill="#1db954"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/></svg>
                <span style={{ fontFamily: "Cinzel,serif", fontSize: 9, color: "#1db954", letterSpacing: 0.5 }}>Spotify</span>
                <button onClick={disconnectSP} title="Desconectar Spotify" style={{ background: "transparent", border: "none", cursor: "pointer", color: "rgba(29,185,84,0.5)", fontSize: 14, padding: "0 2px", lineHeight: 1, display: "flex", alignItems: "center" }}
                  onMouseEnter={e => e.currentTarget.style.color = "#1db954"}
                  onMouseLeave={e => e.currentTarget.style.color = "rgba(29,185,84,0.5)"}>✕</button>
              </div>
            )}
          </div>
        )}
        {selectedPlaylist && (
          <button className="btn-gold" style={{ marginLeft: "auto", padding: "8px 18px", fontSize: 10 }}
            onClick={() => playTrack(0)}>
            ▶ Tocar tudo
          </button>
        )}
      </div>

      {err && (
        <div style={{ ...card, padding: "10px 14px", marginBottom: 16, borderColor: "rgba(139,32,32,0.5)", background: "rgba(139,32,32,0.1)", color: "#e07070", fontSize: 13, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>{err}</span><span style={{ cursor: "pointer", marginLeft: 12 }} onClick={() => setErr("")}>✕</span>
        </div>
      )}

      {/* ── Connect view ── */}
      {!isConnected && !ytTokenExpired && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, maxWidth: 600, margin: "48px auto" }}>
          {[
            { svc: "youtube", label: "YouTube", color: "#ff4444", bg: "rgba(255,68,68,0.06)",
              icon: <svg viewBox="0 0 24 24" width="38" height="38" fill="#ff4444"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>,
              desc: "Acesse suas playlists do YouTube durante a sessão de RPG", onClick: connectYouTube, isLoading: loading === "youtube" },
            { svc: "spotify", label: "Spotify", color: "#1db954", bg: "rgba(29,185,84,0.06)",
              icon: <svg viewBox="0 0 24 24" width="38" height="38" fill="#1db954"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/></svg>,
              desc: "Toque suas playlists do Spotify enquanto joga", onClick: () => connectSpotify(), isLoading: loading === "spotify" },
          ].map(({ svc, label, color, bg, icon, desc, onClick, isLoading }) => (
            <div key={svc} onClick={isLoading ? undefined : onClick}
              style={{ ...card, padding: 28, textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 14, cursor: isLoading ? "default" : "pointer", transition: "all 0.25s" }}
              onMouseEnter={e => { if (!isLoading) { e.currentTarget.style.borderColor = color; e.currentTarget.style.background = bg; e.currentTarget.style.transform = "translateY(-2px)"; }}}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.background = "var(--card)"; e.currentTarget.style.transform = "none"; }}>
              {icon}
              <div style={{ fontFamily: "Cinzel,serif", fontSize: 13, letterSpacing: 2, color }}>{label}</div>
              <div style={{ color: "var(--muted)", fontSize: 13, lineHeight: 1.6 }}>{desc}</div>
              <button className="btn-ghost" disabled={isLoading} style={{ marginTop: 4, borderColor: color, color, opacity: isLoading ? 0.6 : 1 }}>
                {isLoading ? <span style={{ display: "flex", alignItems: "center", gap: 7 }}><span style={{ width: 12, height: 12, border: `1.5px solid ${color}`, borderTopColor: "transparent", borderRadius: "50%", display: "inline-block", animation: "spin 0.8s linear infinite" }} />Conectando...</span> : `Conectar ${label}`}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ── Playlist grid ── */}
      {isConnected && !selectedPlaylist && (
        <div>
          <div style={{ display: "flex", gap: 8, marginBottom: 20, borderBottom: "1px solid var(--border)", paddingBottom: 12, alignItems: "center" }}>
            {[{ id: "youtube", label: "▶ YouTube", connected: !!ytToken, color: "#ff4444" }, { id: "spotify", label: "● Spotify", connected: !!spToken, color: "#1db954" }].map(t => (
              <div key={t.id} onClick={() => t.connected ? setTab(t.id) : (t.id === "youtube" ? connectYouTube() : connectSpotify())}
                style={{ padding: "6px 18px", borderRadius: 20, cursor: "pointer", fontFamily: "Cinzel,serif", fontSize: 11, letterSpacing: 1, border: `1px solid ${tab === t.id && t.connected ? t.color : "var(--border)"}`, background: tab === t.id && t.connected ? (t.id === "youtube" ? "rgba(255,68,68,0.08)" : "rgba(29,185,84,0.08)") : "transparent", color: t.connected ? (tab === t.id ? t.color : "var(--muted2)") : "var(--muted)", transition: "all 0.2s" }}>
                {t.label}{!t.connected && <span style={{ fontSize: 9, marginLeft: 4 }}>(conectar)</span>}
              </div>
            ))}
            {loading && <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--muted)", fontSize: 12, marginLeft: 8 }}><div style={{ width: 12, height: 12, border: "1.5px solid var(--border)", borderTopColor: gold, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />Carregando...</div>}
            <div style={{ marginLeft: "auto", fontSize: 12, color: "var(--muted)" }}>{currentList.length > 0 && `${currentList.length} playlist${currentList.length !== 1 ? "s" : ""}`}</div>
          </div>
          {!isTabConnected ? (
            <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--muted)" }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>♪</div>
              <div style={{ marginBottom: 16 }}>Conecte sua conta para ver as playlists</div>
              <button className="btn-ghost" onClick={() => tab === "youtube" ? connectYouTube() : connectSpotify()}>Conectar {tab === "youtube" ? "YouTube" : "Spotify"}</button>
            </div>
          ) : currentList.length === 0 && !loading ? (
            <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--muted)" }}><div style={{ fontSize: 32, marginBottom: 12 }}>♪</div><div>Nenhuma playlist encontrada.</div></div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(160px,1fr))", gap: 12 }}>
              {currentList.map(pl => {
                const isYt = tab === "youtube";
                const thumb = isYt ? (pl.snippet?.thumbnails?.medium?.url || pl.snippet?.thumbnails?.default?.url) : pl.images?.[0]?.url;
                const name = isYt ? pl.snippet?.title : pl.name;
                const count = isYt ? pl.contentDetails?.itemCount : pl.tracks?.total;
                const playing = isPlayingThis(pl, tab);
                const accent = tab === "youtube" ? "#ff4444" : "#1db954";
                return (
                  <div key={pl.id} onClick={() => openPlaylist(pl, tab)}
                    style={{ ...card, padding: 10, cursor: "pointer", transition: "all 0.2s", border: `1px solid ${playing ? accent : "var(--border)"}`, background: playing ? (tab === "youtube" ? "rgba(255,68,68,0.05)" : "rgba(29,185,84,0.05)") : "var(--card)" }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = accent; e.currentTarget.style.transform = "translateY(-2px)"; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = playing ? accent : "var(--border)"; e.currentTarget.style.transform = "none"; }}>
                    <div style={{ width: "100%", aspectRatio: "1", borderRadius: 4, overflow: "hidden", marginBottom: 8, background: "var(--card2)", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
                      {thumb ? <img src={thumb} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ fontSize: 28, color: "var(--muted)" }}>♪</span>}
                      {playing && <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, color: accent }}>▶</div>}
                    </div>
                    <div style={{ fontFamily: "Cinzel,serif", fontSize: 9, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginBottom: 3 }}>{name}</div>
                    {count != null && <div style={{ fontSize: 11, color: "var(--muted)" }}>{count} faixas</div>}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Track list ── */}
      {isConnected && selectedPlaylist && (
        <div>
          {tracksLoading ? (
            <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--muted)" }}>
              <div style={{ width: 28, height: 28, border: "2px solid var(--border)", borderTopColor: gold, borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 12px" }} />
              Carregando faixas...
            </div>
          ) : tracks.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--muted)" }}><div style={{ fontSize: 32, marginBottom: 12 }}>♪</div><div>Nenhuma faixa encontrada.</div></div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {tracks.map((item, idx) => {
                const isYt = selectedPlaylist.svc === "youtube";
                const title = isYt ? item.snippet?.title : item.track?.name;
                const thumb = isYt
                  ? (item.snippet?.thumbnails?.default?.url)
                  : item.track?.album?.images?.[2]?.url || item.track?.album?.images?.[0]?.url;
                const sub = isYt
                  ? item.snippet?.videoOwnerChannelTitle
                  : item.track?.artists?.map(a => a.name).join(", ");
                const dur = !isYt && item.track?.duration_ms ? fmtDuration(item.track.duration_ms) : null;
                const nowYtIdx = nowPlaying?.playlistId === selectedPlaylist.id ? (nowPlaying?.startIdx ?? -1) : -1;
                const isCurrentTrack = isYt ? (item._ytIdx === nowYtIdx) : (nowYtIdx === idx);
                const accent = isYt ? "#ff4444" : "#1db954";

                return (
                  <div key={idx}
                    draggable
                    onDragStart={e => { dragRef.current = idx; e.dataTransfer.effectAllowed = "move"; }}
                    onDragEnter={() => { dragOverRef.current = idx; }}
                    onDragOver={e => e.preventDefault()}
                    onDragEnd={() => {
                      const from = dragRef.current;
                      const to = dragOverRef.current;
                      dragRef.current = null;
                      dragOverRef.current = null;
                      if (from !== null && to !== null && from !== to) reorderTracks(from, to);
                    }}
                    onClick={() => playTrack(idx)}
                    style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 10px", borderRadius: 6, cursor: "pointer", transition: "background 0.15s", background: isCurrentTrack ? (isYt ? "rgba(255,68,68,0.07)" : "rgba(29,185,84,0.07)") : "transparent" }}
                    onMouseEnter={e => { if (!isCurrentTrack) e.currentTarget.style.background = "var(--card)"; }}
                    onMouseLeave={e => { if (!isCurrentTrack) e.currentTarget.style.background = "transparent"; }}>
                    {/* Drag handle */}
                    <div style={{ width: 14, flexShrink: 0, display: "flex", flexDirection: "column", gap: 3, alignItems: "center", justifyContent: "center", cursor: "grab", opacity: 0.35 }}
                      onMouseEnter={e => e.currentTarget.style.opacity = "1"}
                      onMouseLeave={e => e.currentTarget.style.opacity = "0.35"}>
                      <div style={{ width: 10, height: 1.5, borderRadius: 1, background: "var(--gold)" }} />
                      <div style={{ width: 10, height: 1.5, borderRadius: 1, background: "var(--gold)" }} />
                      <div style={{ width: 10, height: 1.5, borderRadius: 1, background: "var(--gold)" }} />
                    </div>
                    {/* Number / play indicator */}
                    <div style={{ width: 24, textAlign: "center", flexShrink: 0, fontSize: 12, color: isCurrentTrack ? accent : "var(--muted)", fontFamily: "Cinzel,serif" }}>
                      {isCurrentTrack ? "▶" : idx + 1}
                    </div>
                    {/* Thumb */}
                    <div style={{ width: 40, height: 40, borderRadius: 4, overflow: "hidden", flexShrink: 0, background: "var(--card2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {thumb ? <img src={thumb} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ fontSize: 16, color: "var(--muted)" }}>♪</span>}
                    </div>
                    {/* Info */}
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: 13, color: isCurrentTrack ? accent : "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{title}</div>
                      {sub && <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{sub}</div>}
                    </div>
                    {dur && <div style={{ fontSize: 11, color: "var(--muted)", flexShrink: 0 }}>{dur}</div>}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Spotify Setup Modal */}
      {spSetupOpen && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center" }}
          onClick={e => { if (e.target === e.currentTarget) setSpSetupOpen(false); }}
        >
          <div style={{ ...card, padding: 28, maxWidth: 480, width: "90%", background: "var(--surface)" }}>
            <div style={{ fontFamily: "Cinzel,serif", fontSize: 14, color: gold, letterSpacing: 2, marginBottom: 6 }}>
              Configurar Spotify
            </div>
            <p style={{ color: "var(--muted2)", fontSize: 13, lineHeight: 1.7, marginBottom: 16 }}>
              Crie um app em{" "}
              <a href="https://developer.spotify.com/dashboard" target="_blank" rel="noreferrer" style={{ color: "#1db954" }}>
                developer.spotify.com
              </a>
              , copie o <strong style={{ color: "var(--text)" }}>Client ID</strong> e adicione como URI de redirecionamento:
            </p>
            <code style={{
              display: "block", background: "var(--card2)", padding: "8px 12px", borderRadius: 4,
              fontSize: 12, color: "var(--gold2)", marginBottom: 16, wordBreak: "break-all",
              border: "1px solid var(--border)",
            }}>
              {window.location.origin + window.location.pathname.replace(/\/+$/, "")}
            </code>
            <input
              value={spClientIdDraft}
              onChange={e => setSpClientIdDraft(e.target.value)}
              placeholder="Cole aqui o Client ID do Spotify..."
              style={{ marginBottom: 14 }}
              onKeyDown={e => {
                if (e.key === "Enter" && spClientIdDraft.trim()) {
                  const cid = spClientIdDraft.trim();
                  setSpClientId(cid); setSpSetupOpen(false); connectSpotify(cid);
                }
              }}
            />
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button className="btn-ghost" onClick={() => setSpSetupOpen(false)}>Cancelar</button>
              <button className="btn-gold"
                disabled={!spClientIdDraft.trim()}
                onClick={() => {
                  const cid = spClientIdDraft.trim();
                  if (cid) { setSpClientId(cid); setSpSetupOpen(false); connectSpotify(cid); }
                }}>
                Salvar e Conectar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════
   ROOT
═══════════════════════════════ */
export default function App() {
  const [loggedIn, setLoggedIn] = useState(null); // null = carregando, false = deslogado, true = logado
  const [activeSystem, setActiveSystem] = useState(() => {
    try { const s = localStorage.getItem('nexus_system'); return s ? JSON.parse(s) : null; } catch { return null; }
  });
  const [screen, setScreen] = useState(() => localStorage.getItem('nexus_screen') || "dashboard");
  const [collapsed, setCollapsed] = useState(false);
  const [creatingChar, setCreatingChar] = useState(false);
  const [createdChar, setCreatedChar] = useState(null);
  const charKey = activeSystem ? `nexus_characters_${activeSystem.id}` : null;
  const [characters, setCharacters] = useState(() => {
    try {
      const sys = JSON.parse(localStorage.getItem('nexus_system') || 'null');
      const key = sys ? `nexus_characters_${sys.id}` : null;
      return key ? JSON.parse(localStorage.getItem(key) || '[]') : [];
    } catch { return []; }
  });
  const [sessions] = useState([]);
  const [nowPlaying, setNowPlaying] = useState(null);
  const [musicTokens, setMusicTokens] = useState(() => {
    const now = Date.now();
    const ytToken = localStorage.getItem("nx_yt_token");
    const ytExp = Number(localStorage.getItem("nx_yt_exp") || 0);
    const spToken = localStorage.getItem("nx_sp_token");
    const spExp = Number(localStorage.getItem("nx_sp_exp") || 0);
    return {
      yt: ytToken && now < ytExp ? ytToken : null,
      sp: spToken && now < spExp ? spToken : null,
    };
  });
  const ytPlayerRef = useRef(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, user => setLoggedIn(!!user));
    return unsub;
  }, []);

  useEffect(() => {
    if (activeSystem) localStorage.setItem('nexus_system', JSON.stringify(activeSystem));
    else localStorage.removeItem('nexus_system');
  }, [activeSystem]);

  useEffect(() => { localStorage.setItem('nexus_screen', screen); }, [screen]);
  useEffect(() => {
    if (charKey) localStorage.setItem(charKey, JSON.stringify(characters));
  }, [characters, charKey]);
  useEffect(() => {
    if (!activeSystem) return;
    const key = `nexus_characters_${activeSystem.id}`;
    try { setCharacters(JSON.parse(localStorage.getItem(key) || '[]')); } catch { setCharacters([]); }
    setCreatedChar(null);
  }, [activeSystem?.id]);

  /* load YouTube IFrame API once */
  useEffect(() => {
    if (document.getElementById("yt-api-script")) return;
    const tag = document.createElement("script");
    tag.id = "yt-api-script";
    tag.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(tag);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('nexus_system');
    localStorage.removeItem('nexus_screen');
    signOut(auth);
  };

  const handleFinishChar = (char) => {
    if (characters.length >= 5) return;
    const d = new Date();
    const dateStr = `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getFullYear()).slice(-2)}`;
    const charWithDate = { ...char, id: Date.now(), nex: 5, createdAt: dateStr };
    setCharacters(prev => [...prev, charWithDate]);
    setCreatedChar(charWithDate);
    setCreatingChar(false);
    setScreen("sheet");
  };

  const renderScreen = () => {
    const sysName = activeSystem?.name || "Sistema";
    if (creatingChar) return null;
    if (createdChar && screen === "sheet") return <FullSheet character={createdChar} onBack={()=>setCreatedChar(null)} onUpdate={(updated) => { setCreatedChar(updated); setCharacters(prev => prev.map(c => (c.id && c.id === updated.id) || (!c.id && c.createdAt === updated.createdAt) ? updated : c)); }}/>;
    switch(screen){
      case "dashboard": return <Dashboard system={activeSystem} onCreateChar={()=>setCreatingChar(true)} characters={characters} sessions={sessions} onSelectChar={c=>{ setCreatedChar(c); setScreen("sheet"); }}/>;
      case "sheet":     return <SheetList characters={characters} system={activeSystem} onCreateChar={()=>setCreatingChar(true)} onSelectChar={c=>{ setCreatedChar(c); }}/>;
      case "map":       return <PlaceholderScreen icon="🗺️" title="Editor de Mapas" desc={`Mapas com tiles e névoa de guerra para ${sysName}.`} badge="Em breve" />;
      case "master":    return <PlaceholderScreen icon="🎭" title="Ajudante do Mestre por Voz" desc={`Ajudante inteligente treinado nas regras de ${sysName}.`} badge="Beta · Pro" />;
      case "party":     return <PlaceholderScreen icon="◎" title="Grupo de Agentes" desc="Compartilhe fichas e gerencie sua campanha." badge="Em breve" />;
      default: return <Dashboard system={activeSystem} onCreateChar={()=>setCreatingChar(true)} characters={characters} sessions={sessions}/>;
    }
  };

  if (loggedIn === null) return (<><G/><div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"var(--bg)"}}><div style={{width:32,height:32,border:"2px solid rgba(201,168,76,0.3)",borderTopColor:"var(--gold)",borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/></div></>);
  if (!loggedIn) return (<><G/><Login onLogin={()=>setLoggedIn(true)}/></>);
  if (!activeSystem) return (<><G/><SystemSelect onSelect={sys => setActiveSystem(sys)} onLogout={handleLogout}/></>);

  if (creatingChar) return (
    <><G/><CharacterCreator onFinish={handleFinishChar} onCancel={()=>setCreatingChar(false)}/></>
  );

  return (
    <>
      <G/>
      <Deco/>
      <div style={{display:"flex", minHeight:"100vh", background:"var(--bg)", position:"relative", zIndex:1}}>
        <Sidebar active={screen} onNav={setScreen} collapsed={collapsed} setCollapsed={setCollapsed} system={activeSystem} onChangeSystem={()=>setActiveSystem(null)} onLogout={handleLogout}/>
        <div style={{flex:1, display:"flex", flexDirection:"column", minWidth:0, overflow:"hidden"}}>
          <Topbar screen={screen} system={activeSystem} onChangeSystem={()=>setActiveSystem(null)} onLogout={handleLogout}/>
          {/* hidden div that hosts the YT IFrame player — never unmounts */}
          <div id="yt-player-host" style={{ position:"fixed", top:-9999, left:-9999, width:1, height:1, pointerEvents:"none" }} />
          <main style={{flex:1, overflowY:"auto", padding:"20px 20px", paddingBottom: nowPlaying ? 112 : 20}}>
            {/* MusicScreen is always mounted so audio persists across navigation */}
            <div style={{ display: screen === "music" ? "block" : "none" }}>
              <MusicScreen nowPlaying={nowPlaying} onNowPlaying={setNowPlaying} musicTokens={musicTokens} onMusicTokens={setMusicTokens} ytPlayerRef={ytPlayerRef} />
            </div>
            {screen !== "music" && renderScreen()}
          </main>
          {nowPlaying && <MusicPlayerBar nowPlaying={nowPlaying} onNowPlaying={setNowPlaying} ytPlayerRef={ytPlayerRef} />}
          <div style={{borderTop:"1px solid var(--border2)", padding:"9px 20px", display:"flex", gap:12, alignItems:"center", background:"rgba(6,6,6,0.6)"}}>
            <div style={{display:"flex", gap:8, alignItems:"center"}}>
              <NexusLogo size={16}/>
              <span style={{fontFamily:"Cinzel,serif", fontSize:8, letterSpacing:2, color:"var(--muted2)", textTransform:"uppercase"}}>Nexus RPG · v0.1 Beta</span>
            </div>
            <div style={{marginLeft:"auto", display:"flex", gap:4}}>
              {[
                {label:"Suporte", icon:<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>},
                {label:"Discord", icon:<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.015.045.03.06a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/></svg>},
                {label:"Changelog", icon:<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>},
              ].map(({label,icon})=>(
                <span key={label} style={{
                  fontFamily:"Cinzel,serif", fontSize:7, letterSpacing:1, color:"var(--muted2)",
                  cursor:"pointer", textTransform:"uppercase",
                  display:"flex", alignItems:"center", gap:4,
                  padding:"3px 8px", borderRadius:4,
                  border:"1px solid transparent",
                  transition:"all 0.2s",
                }}
                  onMouseEnter={e=>{e.currentTarget.style.color="var(--gold)";e.currentTarget.style.borderColor="rgba(201,168,76,0.25)";e.currentTarget.style.background="rgba(201,168,76,0.06)";}}
                  onMouseLeave={e=>{e.currentTarget.style.color="var(--muted2)";e.currentTarget.style.borderColor="transparent";e.currentTarget.style.background="none";}}
                >
                  {icon}{label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

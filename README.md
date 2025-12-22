import React, { useState, useEffect, useRef } from 'react';
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, updateDoc, onSnapshot, increment } from 'firebase/firestore';
import { 
  Trophy, 
  Calendar, 
  Palette, 
  Target, 
  Zap, 
  Users, 
  Sparkles,
  Flame,
  Award,
  Volume2,
  VolumeX,
  RefreshCcw,
  Star,
  Music,
  PartyPopper,
  Moon,
  Sun,
  Eye,
  Ghost,
  Atom,
  Heart
} from 'lucide-react';

// --- Firebase 설정 ---
const firebaseConfig = JSON.parse(__firebase_config);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'mystic-lotto-v10';

// --- 고성능 비트 사운드 엔진 ---
const useAudio = () => {
  const [muted, setMuted] = useState(false);
  const audioCtx = useRef(null);

  const initAudio = () => {
    if (!audioCtx.current) {
      audioCtx.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.current.state === 'suspended') {
      audioCtx.current.resume();
    }
  };

  const playBitSound = (freq = 110, duration = 0.1, type = 'square', vol = 0.08) => {
    if (muted || !audioCtx.current) return;
    const ctx = audioCtx.current;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    osc.connect(gain);
    gain.connect(ctx.destination);

    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.start(now);
    osc.stop(now + duration);
  };

  return { playBitSound, muted, setMuted, initAudio };
};

export default function App() {
  const [initialized, setInitialized] = useState(false);
  const [user, setUser] = useState(null);
  const [globalStats, setGlobalStats] = useState({ 
    totalUsage: 8145060, // 1등 확률에 맞춘 초기 동기화 횟수
    luckGauge: 1.2,
    win1: 1, // 요청하신 대로 1등 1회 기준
    win2: 54, 
    win3: 2450 
  }); 
  const [formData, setFormData] = useState({ date: '', color: '#8b5cf6', wish: '' });
  const [results, setResults] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [explosion, setExplosion] = useState(false);
  const [extraLuck, setExtraLuck] = useState(0); 
  const [bubbles, setBubbles] = useState([]);
  const [sincerityWarning, setSincerityWarning] = useState(false);
  const { playBitSound, muted, setMuted, initAudio } = useAudio();

  // 2025년 12월 22일 기준 최신 로또 번호 (제1203회)
  const LATEST_DRAW = {
    drawNo: 1203,
    date: '2025-12-20',
    numbers: [4, 15, 23, 31, 38, 45],
    bonus: 10
  };

  const currentLuckGauge = Math.min(100, 
    (formData.date ? 20 : 0) + 
    (formData.wish ? 20 : 0) + 
    (formData.color ? 20 : 0) + 
    extraLuck
  );

  // 알록달록 영혼 입자 생성
  useEffect(() => {
    const bubbleColors = ['#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ef4444', '#06b6d4'];
    const interval = setInterval(() => {
      if (bubbles.length < 5) {
        const newBubble = {
          id: Date.now() + Math.random(),
          x: Math.random() * 80 + 10,
          y: Math.random() * 80 + 10,
          size: Math.random() * 30 + 35,
          color: bubbleColors[Math.floor(Math.random() * bubbleColors.length)]
        };
        setBubbles(prev => [...prev, newBubble]);
      }
    }, 4500);
    return () => clearInterval(interval);
  }, [bubbles.length]);

  const popBubble = (id) => {
    initAudio();
    playBitSound(165, 0.12, 'triangle'); 
    setBubbles(prev => prev.filter(b => b.id !== id));
    setExtraLuck(prev => Math.min(prev + (Math.floor(Math.random() * 5) + 4), 40));
  };

  useEffect(() => {
    let unsubscribeAuth = () => {};
    const startApp = async () => {
      try {
        const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
        const auth = getAuth(app);
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
        unsubscribeAuth = onAuthStateChanged(auth, (u) => {
          setUser(u);
          setInitialized(true);
        });
      } catch (err) { setInitialized(true); }
    };
    startApp();
    return () => unsubscribeAuth();
  }, []);

  // 글로벌 통계 리스너
  useEffect(() => {
    if (!user || !initialized) return;
    const db = getFirestore();
    const statsDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'globalStats', 'main');
    
    const unsubscribe = onSnapshot(statsDocRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setGlobalStats({ 
          totalUsage: Number(data.totalUsage || 8145060), 
          luckGauge: Number(data.luckGauge || 1.2),
          win1: Number(data.win1 || 1),
          win2: Number(data.win2 || 54),
          win3: Number(data.win3 || 2450)
        });
        if (data.luckGauge >= 100) {
          setExplosion(true);
          playBitSound(220, 0.6, 'square');
          setTimeout(() => {
            setExplosion(false);
            updateDoc(statsDocRef, { luckGauge: 0.001 }).catch(console.error); // 초기화
          }, 6500);
        }
      } else {
        setDoc(statsDocRef, { totalUsage: 8145060, luckGauge: 1.2, win1: 1, win2: 54, win3: 2450 }).catch(console.error);
      }
    }, (err) => console.error(err));
    return () => unsubscribe();
  }, [user, initialized]);

  const handleGenerate = async () => {
    initAudio(); 
    
    // 꾸짖음 경고 1: 빈칸
    if (!formData.date || !formData.wish) {
      playBitSound(80, 0.3, 'sawtooth');
      alert("이렇게 행운을 시험할 거야? 염원을 담아 빈칸을 채워줘! 우주는 정성 없는 소망에 응답하지 않아. 어서 채우도록!");
      return;
    }

    // 꾸짖음 경고 2: 성의 없는 염원
    if (formData.wish.length < 8 && !sincerityWarning) {
      playBitSound(120, 0.2, 'square');
      setSincerityWarning(true);
      alert("염원이 너무 짧아! 조금 더 구체적으로 성의 있게 우주에 속삭여줘. 당신의 정성이 행운의 크기를 결정해!");
      return;
    }

    setIsGenerating(true);
    setSincerityWarning(false);
    playBitSound(110, 0.2, 'square', 0.15);
    setResults([]);

    const dateNum = parseInt(formData.date.replace(/-/g, '')) || 0;
    const colorNum = parseInt(formData.color.substring(1), 16) || 0;
    let textHash = 0;
    for (let i = 0; i < formData.wish.length; i++) {
      textHash = ((textHash << 5) - textHash) + formData.wish.charCodeAt(i);
      textHash |= 0;
    }
    const seed = Math.abs(dateNum + colorNum + textHash + extraLuck);

    const newSets = [];
    let localWin1 = 0;
    let localWin2 = 0;
    let localWin3 = 0;

    for (let i = 0; i < 5; i++) {
      const nums = [];
      let localSeed = seed + (i * 777);
      while (nums.length < 6) {
        const x = Math.sin(localSeed++) * 10000;
        const rand = x - Math.floor(x);
        const n = Math.floor(rand * 45) + 1;
        if (!nums.includes(n)) nums.push(n);
      }
      nums.sort((a, b) => a - b);
      
      // 당첨 시뮬레이션
      const matches = nums.filter(n => LATEST_DRAW.numbers.includes(n)).length;
      if (matches === 6) localWin1++;
      else if (matches === 5) localWin2++;
      else if (matches === 4) localWin3++;

      newSets.push({ numbers: nums, message: getRandomKoreanMessage(), matches });
    }

    try {
      const db = getFirestore();
      const statsDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'globalStats', 'main');
      await updateDoc(statsDocRef, { 
        totalUsage: increment(1), 
        luckGauge: increment(localWin1 > 0 ? 50 : 0.000123), // 1등급 기운 감지 시 대폭 상승
        win1: increment(localWin1),
        win2: increment(localWin2),
        win3: increment(localWin3)
      });
    } catch (e) { console.error(e); }

    for (let i = 0; i < 6; i++) {
      await new Promise(r => setTimeout(r, 200));
      playBitSound(130 + (i * 15), 0.12, 'square');
    }

    setResults(newSets);
    setIsGenerating(false);
    playBitSound(200, 0.4, 'triangle');
    
    // 자동 초기화
    setFormData({ date: '', color: '#8b5cf6', wish: '' });
    setExtraLuck(0); 
  };

  const getRandomKoreanMessage = () => {
    const msgs = [
      "아이필 굿! 우주가 당신의 정성을 수열로 빚어냈습니다! 🚀",
      "굿럭! 이건 우주가 보낸 신호야! 느낌이 아주 좋아요!",
      "행운도 실력이야! 당신의 에너지가 담긴 완벽한 조합!",
      "무의식이 유의식으로 변하는 순간, 행운은 현실이 됩니다.",
      "운명의 파동이 최고조에 달했습니다. 가즈아!"
    ];
    return msgs[Math.floor(Math.random() * msgs.length)];
  };

  const handleInputChange = (field, val) => {
    initAudio();
    setFormData({...formData, [field]: val});
    playBitSound(140, 0.05, 'sine');
  };

  const handleInputBlur = () => {
    playBitSound(200, 0.08, 'sine', 0.04); 
  };

  if (!initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#030308]">
        <Atom className="animate-spin text-purple-600" size={60} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020206] text-slate-100 font-sans pb-24 overflow-hidden relative selection:bg-purple-500/30">
      
      {/* 반짝이는 별가루 */}
      <div className="fixed inset-0 pointer-events-none">
        {[...Array(40)].map((_, i) => (
          <div 
            key={i}
            className="absolute rounded-full bg-white/20 animate-pulse"
            style={{
              width: Math.random() * 3 + 'px',
              height: Math.random() * 3 + 'px',
              top: Math.random() * 100 + '%',
              left: Math.random() * 100 + '%',
              animationDelay: Math.random() * 5 + 's',
              animationDuration: Math.random() * 4 + 2 + 's'
            }}
          ></div>
        ))}
      </div>

      {/* 알록달록 영혼 입자 */}
      {bubbles.map(bubble => (
        <div 
          key={bubble.id}
          onClick={() => popBubble(bubble.id)}
          className="absolute z-50 cursor-pointer animate-bounce hover:scale-150 transition-all duration-300 group"
          style={{ 
            left: `${bubble.x}%`, 
            top: `${bubble.y}%`, 
            width: `${bubble.size}px`, 
            height: `${bubble.size}px`,
            background: `radial-gradient(circle, ${bubble.color}dd 0%, transparent 85%)`,
            borderRadius: '50%',
            border: `2px solid ${bubble.color}66`,
            backdropFilter: 'blur(5px)',
            boxShadow: `0 0 30px ${bubble.color}55`
          }}
        >
          <div className="w-full h-full flex items-center justify-center text-[9px] text-white font-black tracking-tighter uppercase opacity-80 group-hover:opacity-100">기운</div>
        </div>
      ))}

      {/* 잭팟 폭발 효과 */}
      {explosion && (
        <div className="fixed inset-0 z-50 pointer-events-none flex flex-col items-center justify-center bg-purple-900/30 backdrop-blur-3xl animate-in fade-in duration-700">
          <PartyPopper size={200} className="text-yellow-400 animate-bounce mb-10 shadow-2xl" />
          <h2 className="text-6xl md:text-9xl font-black text-white text-center px-12 drop-shadow-[0_0_60px_rgba(255,255,255,1)] italic uppercase tracking-tighter">
            행운 폭발!<br/>
            <span className="text-purple-400">우주의 문이 활짝 열렸습니다!</span>
          </h2>
        </div>
      )}

      <header className="bg-black/90 backdrop-blur-3xl border-b border-white/5 sticky top-0 z-40 p-6 shadow-[0_10px_40px_rgba(0,0,0,0.6)]">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-5">
            <div className="p-3 bg-gradient-to-tr from-purple-800 to-indigo-800 rounded-3xl shadow-2xl shadow-purple-500/30">
              <Sparkles size={28} className="text-white animate-pulse" />
            </div>
            <div>
              <p className="text-[10px] text-purple-400 font-black tracking-[0.5em] uppercase mb-1">최신 로또 당첨 결과</p>
              <h1 className="text-sm font-black text-white">제 {LATEST_DRAW.drawNo}회 (2025.12.20)</h1>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-white/5 px-8 py-4 rounded-full border border-white/10 shadow-inner group transition-all hover:bg-white/10">
            {LATEST_DRAW.numbers.map(n => (
              <span key={n} className="w-9 h-9 flex items-center justify-center rounded-full font-black text-xs text-indigo-100 transition-transform hover:scale-125">
                {n}
              </span>
            ))}
            <span className="px-1 opacity-20 text-xs text-white">＋</span>
            <span className="w-9 h-9 flex items-center justify-center bg-amber-500 text-black rounded-full font-black text-xs shadow-[0_0_20px_rgba(245,158,11,0.6)]">
              {LATEST_DRAW.bonus}
            </span>
          </div>
          <button onClick={() => { initAudio(); setMuted(!muted); }} className="p-4 bg-white/5 rounded-3xl text-white/30 hover:text-purple-400 transition-all active:scale-90 border border-white/5">
            {muted ? <VolumeX size={22} /> : <Volume2 size={22} />}
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto mt-16 px-6 space-y-20 relative z-10">
        
        {/* 시크릿 법칙 */}
        <section className="relative overflow-hidden bg-white/[0.01] backdrop-blur-3xl border border-white/5 rounded-[5rem] p-16 md:p-20 text-center group shadow-[0_40px_100px_rgba(0,0,0,0.4)] transition-all hover:border-purple-500/20">
          <Eye className="absolute top-10 left-16 text-purple-500/5 group-hover:text-purple-500/15 transition-all animate-bounce" size={100} />
          <h3 className="text-purple-400 font-black text-[11px] uppercase tracking-[0.8em] mb-12 flex items-center justify-center gap-5">
             <Moon size={18} className="text-purple-600" /> 우주의 이끌림, 신비로운 시크릿 <Moon size={18} className="text-purple-600" />
          </h3>
          <p className="text-slate-50 text-xl md:text-3xl font-black leading-[1.7] italic tracking-tight drop-shadow-2xl">
            "당신은 지금 우주의 기운에 한발자국을 디뎠습니다. <br className="hidden md:block"/>
            이것은 단순한 랜덤 생성기가 아닌 이끌림의 법칙에 <br className="hidden md:block"/>
            무의식의 법칙을 유의식의 법칙으로 바꿔주는데 힘을 보태줍니다."
          </p>
        </section>

        {/* 당첨 통계 보드 */}
        <section className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
             <div className="bg-black/60 border border-white/5 p-8 rounded-[3.5rem] text-center shadow-2xl backdrop-blur-md hover:border-yellow-500/30 transition-all">
                <p className="text-[11px] text-yellow-500 font-black uppercase tracking-widest mb-2">1등 동기화 횟수</p>
                <h4 className="text-4xl font-black text-white italic">{globalStats.win1}<span className="text-xs ml-1 opacity-40 font-medium tracking-normal">회</span></h4>
             </div>
             <div className="bg-black/60 border border-white/5 p-8 rounded-[3.5rem] text-center shadow-2xl backdrop-blur-md hover:border-indigo-500/30 transition-all">
                <p className="text-[11px] text-indigo-400 font-black uppercase tracking-widest mb-2">2등 동기화 횟수</p>
                <h4 className="text-4xl font-black text-white italic">{globalStats.win2}<span className="text-xs ml-1 opacity-40 font-medium tracking-normal">회</span></h4>
             </div>
             <div className="bg-black/60 border border-white/5 p-8 rounded-[3.5rem] text-center shadow-2xl backdrop-blur-md hover:border-rose-500/30 transition-all">
                <p className="text-[11px] text-rose-400 font-black uppercase tracking-widest mb-2">3등 동기화 횟수</p>
                <h4 className="text-4xl font-black text-white italic">{globalStats.win3}<span className="text-xs ml-1 opacity-40 font-medium tracking-normal">회</span></h4>
             </div>
          </div>

          {/* 글로벌 동기화 게이지 */}
          <div className="bg-black/80 border border-white/10 rounded-[4rem] p-12 shadow-[0_50px_120px_rgba(0,0,0,0.8)] relative overflow-hidden group">
            <div className="flex justify-between items-center mb-10 px-6">
              <div className="flex items-center gap-5">
                <Flame size={28} className={globalStats.luckGauge > 80 ? 'text-orange-500 animate-pulse' : 'text-purple-600'} />
                <span className="font-black text-slate-400 text-xs tracking-[0.4em] uppercase">우주 기운 집결 (현재 진행형)</span>
              </div>
              <div className="flex items-center gap-4 text-[12px] font-black text-purple-400 bg-purple-600/5 px-8 py-3 rounded-full border border-purple-600/10 shadow-2xl">
                <Users size={18} />
                <span>{globalStats.totalUsage.toLocaleString()} 회의 염원 중</span>
              </div>
            </div>
            <div className="h-20 bg-black/50 rounded-full p-2.5 border border-white/5 shadow-inner relative overflow-hidden group-hover:border-purple-500/20 transition-all">
              <div 
                className={`h-full rounded-full transition-all duration-1000 flex items-center justify-center text-[12px] font-black shadow-[0_0_40px_rgba(139,92,246,0.4)]
                  ${globalStats.luckGauge > 80 ? 'bg-gradient-to-r from-orange-600 via-yellow-500 to-red-600 animate-pulse' : 'bg-gradient-to-r from-purple-800 to-purple-500'}`}
                style={{ width: `${Math.min(globalStats.luckGauge, 100)}%` }}
              >
                {globalStats.luckGauge > 3 ? `${globalStats.luckGauge.toFixed(6)}%` : ''}
              </div>
            </div>
          </div>
        </section>

        {/* 입력란 섹션 - 우주 기운 집결형 디자인 */}
        <section className="bg-white rounded-[6rem] p-16 md:p-24 shadow-[0_120px_250px_rgba(0,0,0,1)] space-y-20 border-b-[30px] border-purple-100/40 relative overflow-hidden text-slate-900">
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-purple-50/50 rounded-full blur-[180px] -mr-80 -mt-80 opacity-60"></div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-20">
            <div className="space-y-8">
              <label className="text-[13px] font-black text-slate-400 uppercase tracking-[0.4em] flex items-center gap-4 px-10">
                <Calendar size={20} className="text-purple-600" /> 운명의 시작 (날짜 선택)
              </label>
              <div className="relative group">
                <input 
                  type="date" 
                  className="w-full p-10 bg-slate-50 border-none rounded-full focus:ring-[20px] focus:ring-purple-100/60 outline-none font-black text-slate-800 transition-all text-3xl shadow-inner text-center hover:bg-slate-100/50 appearance-none"
                  value={formData.date}
                  onChange={e => handleInputChange('date', e.target.value)}
                  onBlur={handleInputBlur}
                  onClick={initAudio}
                />
              </div>
            </div>
            <div className="space-y-8">
              <label className="text-[13px] font-black text-slate-400 uppercase tracking-[0.4em] flex items-center gap-4 px-10">
                <Palette size={20} className="text-purple-600" /> 영혼의 파동 (색상 선택)
              </label>
              <div className="flex gap-12 items-center bg-slate-50 p-5 rounded-full shadow-inner border border-transparent transition-all hover:bg-slate-100 px-12">
                <input 
                  type="color" 
                  className="w-28 h-20 border-none rounded-full cursor-pointer bg-white p-3 shadow-sm transition-transform hover:scale-110"
                  value={formData.color}
                  onChange={e => handleInputChange('color', e.target.value)}
                  onBlur={handleInputBlur}
                  onClick={initAudio}
                />
                <div className="flex flex-col items-center group/ghost">
                   <Ghost size={48} fill={formData.color} stroke={formData.color} className="drop-shadow-[0_0_20px_rgba(0,0,0,0.2)] animate-bounce" />
                   <span className="text-[10px] font-black text-slate-400 uppercase mt-3 tracking-widest">Aura Sync</span>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-8">
            <label className="text-[13px] font-black text-slate-400 uppercase tracking-[0.4em] flex items-center gap-4 px-10">
              <Target size={20} className="text-purple-600" /> 우주로 보내는 간절한 염원
            </label>
            <textarea 
              placeholder="당신의 진심 어린 염원을 새겨주세요..."
              className="w-full p-12 bg-slate-50 border-none rounded-[5rem] focus:ring-[20px] focus:ring-purple-100/60 outline-none resize-none h-44 font-bold text-slate-800 transition-all text-3xl shadow-inner text-center leading-relaxed"
              value={formData.wish}
              onChange={e => handleInputChange('wish', e.target.value)}
              onBlur={handleInputBlur}
              onClick={initAudio}
            />
          </div>

          {/* 개인 기운 게이지 */}
          <div className="space-y-8 px-12">
             <div className="flex justify-between items-end">
                <span className="text-[13px] font-black text-slate-400 uppercase tracking-[0.5em] flex items-center gap-4 italic">
                   <Ghost size={22} className="text-purple-600 animate-pulse" /> 기운 응축도
                </span>
                <span className={`text-5xl font-black italic transition-all duration-700 ${currentLuckGauge === 100 ? 'text-purple-700 scale-110 drop-shadow-2xl' : 'text-slate-300'}`}>
                   {currentLuckGauge}%
                </span>
             </div>
             <div className="h-6 bg-slate-100 rounded-full p-2 shadow-inner border border-slate-200 relative">
                <div 
                  className={`h-full rounded-full transition-all duration-1000 ${currentLuckGauge === 100 ? 'bg-gradient-to-r from-purple-700 via-indigo-600 to-purple-700 animate-[shimmer_3s_infinite]' : 'bg-purple-400'}`}
                  style={{ width: `${currentLuckGauge}%` }}
                ></div>
             </div>
          </div>

          {/* 운명의 수열 추출 버튼 */}
          <button 
            onClick={handleGenerate}
            disabled={isGenerating}
            className={`w-full py-16 rounded-[6rem] text-4xl font-black shadow-2xl transform transition-all flex flex-col items-center justify-center gap-3 overflow-hidden relative group
              ${isGenerating ? 'bg-slate-200 scale-95 cursor-not-allowed' : 'bg-[#0a0a1a] text-white hover:bg-black active:scale-95 shadow-[0_40px_100px_rgba(0,0,0,0.6)] border border-white/5'}
              ${currentLuckGauge === 100 && !isGenerating ? 'ring-[20px] ring-purple-500/20 animate-pulse shadow-[0_0_150px_rgba(139,92,246,0.6)] border-purple-400/50' : ''}`}
          >
            {isGenerating ? (
              <RefreshCcw className="animate-spin text-purple-600" size={70} />
            ) : (
              <>
                <div className={`flex items-center gap-10 transition-all duration-700 ${currentLuckGauge === 100 ? 'scale-110 text-purple-300' : ''}`}>
                  <Zap fill={currentLuckGauge === 100 ? "#facc15" : "white"} size={56} className={currentLuckGauge === 100 ? "animate-bounce text-yellow-400" : "animate-pulse"} />
                  <span className="italic uppercase tracking-tighter">운명의 수열 추출하기</span>
                  <Zap fill={currentLuckGauge === 100 ? "#facc15" : "white"} size={56} className={currentLuckGauge === 100 ? "animate-bounce text-yellow-400" : "animate-pulse"} />
                </div>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[250%] transition-transform duration-1000 skew-x-[-35deg]"></div>
              </>
            )}
          </button>
        </section>

        {/* 결과 섹션 */}
        {results.length > 0 && (
          <div className="space-y-20 animate-in fade-in slide-in-from-bottom-24 duration-1000">
            
            <div className="flex flex-col items-center text-center space-y-6">
              <div className="bg-purple-600 text-white px-20 py-5 rounded-full text-[13px] font-black uppercase tracking-[0.8em] shadow-2xl animate-pulse">아이필 굿! 행운의 수열 발견!</div>
              <h2 className="text-5xl md:text-6xl font-black text-white italic tracking-tighter drop-shadow-[0_0_50px_rgba(255,255,255,0.5)]">"우주가 당신의 이름으로 빚은 수열"</h2>
            </div>
            
            <div className="space-y-16">
              {results.map((res, idx) => (
                <div key={idx} className="bg-white/[0.04] backdrop-blur-3xl p-14 md:p-20 rounded-[7rem] border border-white/10 shadow-3xl relative group transition-all hover:bg-white/[0.08]">
                  <div className="flex flex-col items-center gap-12">
                    <div className="flex items-center gap-8 w-full justify-center">
                       <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-purple-500/40 to-transparent"></div>
                       <div className="text-[12px] font-black text-purple-400 uppercase tracking-[1em] px-8 italic">조합 {idx+1}</div>
                       <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent via-purple-500/40 to-transparent"></div>
                    </div>
                    
                    {/* 가로 나열 강조 */}
                    <div className="flex gap-5 sm:gap-10 flex-wrap justify-center items-center w-full px-8 py-8">
                      {res.numbers.map((num, nIdx) => {
                        let colorClass = "bg-slate-900 text-slate-500";
                        if (num <= 10) colorClass = "bg-yellow-400 text-black border-yellow-200 shadow-[0_0_25px_rgba(250,204,21,0.5)]";
                        else if (num <= 20) colorClass = "bg-blue-600 text-white border-blue-400 shadow-[0_0_25px_rgba(37,99,235,0.5)]";
                        else if (num <= 30) colorClass = "bg-rose-600 text-white border-rose-400 shadow-[0_0_25px_rgba(225,29,72,0.5)]";
                        else if (num <= 40) colorClass = "bg-slate-600 text-white border-slate-400 shadow-[0_0_25px_rgba(71,85,105,0.5)]";
                        else colorClass = "bg-emerald-600 text-white border-emerald-400 shadow-[0_0_25px_rgba(16,185,129,0.5)]";

                        return (
                          <div 
                            key={num} 
                            className="group/ball relative" 
                            style={{ 
                              animation: `sparklePop 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) forwards`,
                              animationDelay: `${nIdx * 0.12}s`
                            }}
                          >
                            <div className={`w-22 h-22 md:w-26 md:h-26 rounded-full flex items-center justify-center font-black text-4xl transition-all duration-700 group-hover/ball:scale-125 border-4 shadow-2xl relative z-10 ${colorClass}`}>
                              {num}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="w-full max-w-3xl relative">
                      <div className="bg-black/70 p-10 rounded-[5rem] border border-white/10 flex items-center justify-center gap-8 shadow-2xl text-center transition-all">
                        <Sparkles size={28} className="text-purple-400 shrink-0 animate-pulse" />
                        <p className="text-base font-black text-purple-50 leading-relaxed italic tracking-wide">
                          {res.message}
                        </p>
                        <Sparkles size={28} className="text-purple-400 shrink-0 animate-pulse" />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-gradient-to-br from-purple-950/90 to-[#020208] border border-purple-500/30 rounded-[7rem] p-32 text-center shadow-3xl relative group overflow-hidden">
               <Trophy className="mx-auto text-yellow-400 mb-16 animate-bounce" size={140} />
               <p className="text-purple-200 font-black text-7xl mb-12 italic tracking-tighter">"행운도 실력이야! 굿럭! 👍"</p>
               <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-purple-600 to-transparent"></div>
            </div>
          </div>
        )}

        <div className="bg-white/[0.02] border-2 border-dashed border-white/5 rounded-[7rem] py-60 text-center text-white/5 text-[13px] font-black uppercase tracking-[3em] italic">
           ENERGY SUPPORT ZONE
        </div>
      </main>

      <footer className="mt-60 text-center px-20 border-t border-white/5 pt-40 pb-24">
        <div className="flex justify-center gap-32 opacity-5 mb-24 animate-pulse">
          <Moon size={80} />
          <Eye size={80} />
          <Sun size={80} />
        </div>
        <p className="text-sm text-slate-800 max-w-lg mx-auto leading-relaxed font-black uppercase italic tracking-[0.8em] mb-20">
          아이필 굿! 당신의 무의식이 거대한 행운을 끌어당기고 있습니다. 즐겁게 우주의 환상을 만끽하세요.
        </p>
        <p className="text-[12px] text-white/5 font-black tracking-[2em] uppercase">MYSTIC COSMOS PRO V4</p>
      </footer>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes shimmer {
          0% { transform: translateX(-100%) skewX(-35deg); }
          100% { transform: translateX(500%) skewX(-35deg); }
        }
        @keyframes sparklePop {
          0% { transform: scale(0) rotate(-30deg); opacity: 0; }
          60% { transform: scale(1.3) rotate(15deg); opacity: 1; }
          100% { transform: scale(1) rotate(0); opacity: 1; }
        }
        input[type="date"]::-webkit-inner-spin-button,
        input[type="date"]::-webkit-calendar-picker-indicator {
          filter: invert(0.9);
          cursor: pointer;
          font-size: 2.5rem;
        }
        /* 우주 스크롤바 */
        ::-webkit-scrollbar { width: 8px; }
        ::-webkit-scrollbar-track { background: #020206; }
        ::-webkit-scrollbar-thumb { background: #1e1e30; border-radius: 10px; }
        ::-webkit-scrollbar-thumb:hover { background: #2d2d4a; }
      `}} />
    </div>
  );
}

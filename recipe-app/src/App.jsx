import { useEffect, useMemo, useRef, useState } from 'react';
import {
  BookOpen, ChefHat, Clock, Link2, Loader2, Play, Plus, Search, Settings, Trash2, Users, X,
} from 'lucide-react';
import { allTags, createRecipe, loadRecipes, saveRecipes, searchRecipes } from './lib/recipes';
import { detectSource, fetchWebContent, fetchYouTubeMeta } from './lib/extract';
import { convertToRecipe, getApiKey, setApiKey } from './lib/ai';

export default function App() {
  const [recipes, setRecipes] = useState(loadRecipes);
  const [query, setQuery] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [selected, setSelected] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [draft, setDraft] = useState(null); // 추가 흐름 상태

  useEffect(() => saveRecipes(recipes), [recipes]);

  const visible = useMemo(() => searchRecipes(recipes, query, tagFilter), [recipes, query, tagFilter]);
  const tags = useMemo(() => allTags(recipes), [recipes]);

  const addRecipe = (recipe) => {
    setRecipes((prev) => [recipe, ...prev]);
    setDraft(null);
    setSelected(recipe);
  };

  const removeRecipe = (id) => {
    setRecipes((prev) => prev.filter((r) => r.id !== id));
    setSelected(null);
  };

  return (
    <div className="app">
      <header className="header">
        <div className="logo">
          <BookOpen size={22} />
          <h1>레시피북</h1>
          <span className="tagline">어디서 본 레시피든, 붙여넣기 하나로</span>
        </div>
        <button className="icon-btn" onClick={() => setShowSettings(true)} aria-label="설정">
          <Settings size={18} />
        </button>
      </header>

      <AddBar onStart={(input) => setDraft({ input, source: detectSource(input) })} />

      <div className="toolbar">
        <div className="search">
          <Search size={16} />
          <input
            placeholder="레시피·재료·태그 검색"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        {tags.length > 0 && (
          <div className="tags">
            {tags.map((t) => (
              <button
                key={t}
                className={`tag ${tagFilter === t ? 'active' : ''}`}
                onClick={() => setTagFilter(tagFilter === t ? '' : t)}
              >
                {t}
              </button>
            ))}
          </div>
        )}
      </div>

      {visible.length === 0 ? (
        <div className="empty">
          <ChefHat size={40} />
          <p>유튜브 링크, 블로그 링크, 또는 레시피 텍스트를 위에 붙여넣어 보세요.</p>
          <p className="sub">AI가 재료와 조리 단계를 정리해 내 레시피북에 저장합니다.</p>
        </div>
      ) : (
        <div className="grid">
          {visible.map((r) => (
            <RecipeCard key={r.id} recipe={r} onClick={() => setSelected(r)} />
          ))}
        </div>
      )}

      {draft && <AddFlow draft={draft} onClose={() => setDraft(null)} onDone={addRecipe} />}
      {selected && (
        <RecipeDetail recipe={selected} onClose={() => setSelected(null)} onDelete={removeRecipe} />
      )}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </div>
  );
}

function AddBar({ onStart }) {
  const [input, setInput] = useState('');
  const submit = () => {
    if (!input.trim()) return;
    onStart(input);
    setInput('');
  };
  return (
    <div className="addbar">
      <Link2 size={18} />
      <input
        placeholder="유튜브 / 블로그 링크 또는 레시피 텍스트 붙여넣기"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
      />
      <button onClick={submit}>
        <Plus size={16} /> 추가
      </button>
    </div>
  );
}

// 추가 흐름: 소스 판별 → (필요시) 원문 확보 → AI 변환 → 저장
function AddFlow({ draft, onClose, onDone }) {
  const { source } = draft;
  const [meta, setMeta] = useState(null);
  const [content, setContent] = useState(source.type === 'text' ? source.text : '');
  const [webStatus, setWebStatus] = useState('loading'); // loading | ok | failed
  const [phase, setPhase] = useState('prepare'); // prepare | converting | error
  const [error, setError] = useState('');

  useEffect(() => {
    if (source.type === 'youtube') {
      fetchYouTubeMeta(source.videoId).then(setMeta);
    } else if (source.type === 'web') {
      fetchWebContent(source.url).then((text) => {
        if (text) {
          setContent(text);
          setWebStatus('ok');
        } else {
          setWebStatus('failed');
        }
      });
    }
  }, [source]);

  const convert = async () => {
    setPhase('converting');
    try {
      const extracted = await convertToRecipe({
        sourceType: source.type,
        title: meta?.title ?? '',
        content: content || meta?.title || '',
      });
      onDone(
        createRecipe({
          ...extracted,
          sourceType: source.type,
          sourceUrl: source.url ?? '',
          videoId: source.videoId ?? '',
          thumbnail: meta?.thumbnail ?? '',
        })
      );
    } catch (e) {
      setError(e?.message ?? '변환에 실패했습니다.');
      setPhase('error');
    }
  };

  return (
    <Modal onClose={onClose} title="레시피로 변환">
      {source.type === 'youtube' && (
        <div className="source-preview">
          {meta?.thumbnail && <img src={meta.thumbnail} alt="" />}
          <div>
            <strong>{meta?.title ?? '영상 정보를 불러오는 중…'}</strong>
            {meta?.author && <span className="sub">{meta.author}</span>}
          </div>
        </div>
      )}
      {source.type === 'web' && (
        <p className="sub">
          {webStatus === 'ok' && '본문을 가져왔습니다. 바로 변환할 수 있어요.'}
          {webStatus === 'failed' && '본문을 자동으로 가져오지 못했습니다. 아래에 레시피 내용을 붙여넣어 주세요.'}
          {webStatus === 'loading' && '본문을 가져오는 중…'}
        </p>
      )}

      {source.type === 'youtube' && (
        <textarea
          rows={6}
          placeholder={
            '(권장) 영상의 자막이나 설명란 내용을 붙여넣으면 훨씬 정확해집니다.\n유튜브 영상 설명 아래 "스크립트 표시" → 전체 복사 → 여기에 붙여넣기'
          }
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
      )}
      {source.type === 'web' && webStatus === 'failed' && (
        <textarea
          rows={6}
          placeholder="레시피 본문 붙여넣기"
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
      )}
      {source.type === 'text' && (
        <textarea rows={8} value={content} onChange={(e) => setContent(e.target.value)} />
      )}

      {phase === 'error' && <p className="error">⚠ {error}</p>}

      <div className="modal-actions">
        <button className="secondary" onClick={onClose}>취소</button>
        <button
          onClick={convert}
          disabled={phase === 'converting' || (!content.trim() && !meta?.title)}
        >
          {phase === 'converting' ? (
            <><Loader2 size={16} className="spin" /> 변환 중…</>
          ) : (
            'AI로 레시피 정리'
          )}
        </button>
      </div>
      {!getApiKey() && (
        <p className="sub note">API 키 미설정 — 데모 변환으로 동작합니다. 설정(⚙)에서 Claude API 키를 입력하세요.</p>
      )}
    </Modal>
  );
}

function RecipeCard({ recipe, onClick }) {
  return (
    <button className="card" onClick={onClick}>
      {recipe.thumbnail ? (
        <img src={recipe.thumbnail} alt="" />
      ) : (
        <div className="card-placeholder"><BookOpen size={28} /></div>
      )}
      <div className="card-body">
        <strong>{recipe.title}</strong>
        <div className="card-meta">
          {recipe.servings && <span><Users size={12} /> {recipe.servings}</span>}
          {recipe.totalTimeMinutes && <span><Clock size={12} /> {recipe.totalTimeMinutes}분</span>}
        </div>
        <div className="card-tags">
          {recipe.tags.slice(0, 3).map((t) => <span key={t}>#{t}</span>)}
        </div>
      </div>
    </button>
  );
}

function RecipeDetail({ recipe, onClose, onDelete }) {
  const playerRef = useRef(null);
  const [checked, setChecked] = useState({});

  const seekTo = (seconds) => {
    playerRef.current?.contentWindow?.postMessage(
      JSON.stringify({ event: 'command', func: 'seekTo', args: [seconds, true] }),
      '*'
    );
  };

  const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  return (
    <Modal onClose={onClose} title={recipe.title} wide>
      {recipe.videoId && (
        <div className="video">
          <iframe
            ref={playerRef}
            src={`https://www.youtube.com/embed/${recipe.videoId}?enablejsapi=1`}
            title={recipe.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      )}

      <div className="detail-meta">
        {recipe.servings && <span><Users size={14} /> {recipe.servings}</span>}
        {recipe.totalTimeMinutes && <span><Clock size={14} /> {recipe.totalTimeMinutes}분</span>}
        {recipe.sourceUrl && (
          <a href={recipe.sourceUrl} target="_blank" rel="noreferrer"><Link2 size={14} /> 원본 보기</a>
        )}
      </div>

      <h3>재료</h3>
      <ul className="ingredients">
        {recipe.ingredients.map((ing, i) => (
          <li key={i} className={checked[i] ? 'done' : ''}>
            <label>
              <input
                type="checkbox"
                checked={!!checked[i]}
                onChange={() => setChecked((c) => ({ ...c, [i]: !c[i] }))}
              />
              <span className="ing-name">{ing.name}</span>
              <span className="ing-amount">{ing.amount}</span>
            </label>
          </li>
        ))}
      </ul>

      <h3>조리 순서</h3>
      <ol className="steps">
        {recipe.steps.map((step, i) => (
          <li key={i}>
            <span className="step-num">{i + 1}</span>
            <p>{step.text}</p>
            {step.timestampSeconds != null && recipe.videoId && (
              <button className="ts" onClick={() => seekTo(step.timestampSeconds)}>
                <Play size={12} /> {fmt(step.timestampSeconds)}
              </button>
            )}
          </li>
        ))}
      </ol>

      <div className="modal-actions">
        <button className="danger" onClick={() => confirm('이 레시피를 삭제할까요?') && onDelete(recipe.id)}>
          <Trash2 size={14} /> 삭제
        </button>
      </div>
    </Modal>
  );
}

function SettingsModal({ onClose }) {
  const [key, setKey] = useState(getApiKey());
  return (
    <Modal onClose={onClose} title="설정">
      <label className="field">
        <span>Claude API 키</span>
        <input
          type="password"
          placeholder="sk-ant-..."
          value={key}
          onChange={(e) => setKey(e.target.value)}
        />
      </label>
      <p className="sub">
        키는 이 브라우저(localStorage)에만 저장됩니다. 키가 없으면 데모 변환으로 동작합니다.
        실제 서비스 단계에서는 서버(프록시) 경유로 전환해야 합니다.
      </p>
      <div className="modal-actions">
        <button className="secondary" onClick={onClose}>취소</button>
        <button onClick={() => { setApiKey(key.trim()); onClose(); }}>저장</button>
      </div>
    </Modal>
  );
}

function Modal({ title, children, onClose, wide }) {
  return (
    <div className="overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${wide ? 'wide' : ''}`}>
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="닫기"><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

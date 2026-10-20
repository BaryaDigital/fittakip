'use strict';

/* =========================================================
   FitTakip — kişisel fitness takip uygulaması (PWA)
   Tüm veriler telefonda localStorage içinde tutulur.
   ========================================================= */

const STORE_KEY = 'fittakip.v1';
const INCREMENT = 2.5;

const DAY_NAMES = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];
const DAY_SHORT = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
const MONTHS = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

const GOALS = {
  lose: { t: 'Kilo vermek', d: 'Yağ yakmak ve daha fit görünmek', ic: '🔥' },
  muscle: { t: 'Kas kazanmak', d: 'Kas kütlesi ve hacim artırmak', ic: '💪' },
  strength: { t: 'Güçlenmek', d: 'Daha ağır kaldırmak', ic: '🏋️' },
  fit: { t: 'Formda kalmak', d: 'Genel sağlık ve kondisyon', ic: '❤️' }
};
const LEVELS = {
  beginner: { t: 'Başlangıç', d: 'Hiç ya da çok az antrenman yaptım' },
  intermediate: { t: 'Orta', d: '6 ay – 2 yıl düzenli antrenman' },
  advanced: { t: 'İleri', d: '2 – 4 yıl düzenli antrenman' },
  expert: { t: 'Uzman', d: '4+ yıl, programlamaya hakimim' }
};
const LOCATIONS = {
  gym: { t: 'Spor salonu', d: 'Makineler, barlar ve dambıllar', ic: '🏢' },
  home: { t: 'Evde', d: 'Dambıl ve vücut ağırlığı', ic: '🏠' }
};

/* ---------------- Tarih yardımcıları ---------------- */
const pad = n => (n < 10 ? '0' : '') + n;
const toKey = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
const fromKey = k => { const p = k.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); };
const addDays = (k, n) => { const d = fromKey(k); d.setDate(d.getDate() + n); return toKey(d); };
const dayIdx = k => (fromKey(k).getDay() + 6) % 7; // Pazartesi = 0
const weekStart = k => addDays(k, -dayIdx(k));
const fmtDate = k => { const d = fromKey(k); return d.getDate() + ' ' + MONTHS[d.getMonth()] + ' ' + d.getFullYear(); };
const fmtShort = k => { const d = fromKey(k); return d.getDate() + ' ' + MONTHS[d.getMonth()]; };
// Test için: index.html?today=2026-10-27
const DEBUG_TODAY = (location.search.match(/today=(\d{4}-\d{2}-\d{2})/) || [])[1];
const today = () => DEBUG_TODAY || toKey(new Date());

/* ---------------- Genel yardımcılar ---------------- */
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const h = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const num = v => { if (v == null) return null; const s = String(v).trim().replace(',', '.'); if (s === '') return null; const n = parseFloat(s); return isFinite(n) ? n : null; };
const fmtKg = v => (Math.round(v * 100) / 100).toString().replace('.', ',');
const totalSets = day => day.exercises.reduce((a, e) => a + e.sets, 0);

/* ---------------- Veri katmanı ---------------- */
function emptyState() {
  return { profile: null, programs: [], activeProgramId: null, logs: [], drafts: {}, weights: [], weighSnooze: null };
}
// Eski kayıtlarda kilo geçmişi yoksa profildeki kiloyla başlat
function migrate(st) {
  if (st.profile && !st.weights.length) {
    const first = st.programs.length ? st.programs[0].createdAt : today();
    st.weights.push({ date: first, kg: st.profile.weight });
  }
  return st;
}
let S = (() => {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) return migrate(Object.assign(emptyState(), JSON.parse(raw)));
  } catch (e) { /* bozuk veri: sıfırdan başla */ }
  return emptyState();
})();
function save() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(S)); }
  catch (e) { toast('Kaydedilemedi! Depolama dolu olabilir.'); }
}

/* ---------------- Vücut ağırlığı (2 haftada bir sorulur) ---------------- */
const WEIGH_EVERY_DAYS = 14;
const sortedWeights = () => S.weights.slice().sort((a, b) => (a.date < b.date ? -1 : 1));
const lastWeight = () => { const w = sortedWeights(); return w[w.length - 1]; };
const nextWeighDate = () => { const l = lastWeight(); return l ? addDays(l.date, WEIGH_EVERY_DAYS) : today(); };
const weighDue = () => nextWeighDate() <= today() && S.weighSnooze !== today();

function addWeight(kg, date) {
  date = date || today();
  S.weights = S.weights.filter(w => w.date !== date); // aynı gün tek kayıt
  S.weights.push({ date, kg });
  S.profile.weight = lastWeight().kg;
  S.weighSnooze = null;
  save();
}

const getProgram = id => S.programs.find(p => p.id === id);
const activeProgram = () => (S.activeProgramId ? getProgram(S.activeProgramId) : null);
const findLog = (pid, date) => S.logs.find(l => l.programId === pid && l.date === date);
const programLogs = pid => S.logs.filter(l => l.programId === pid).sort((a, b) => (a.date < b.date ? 1 : -1));

function setActive(id) {
  S.activeProgramId = id;
  const p = getProgram(id);
  if (p) p.activatedOn = today();
  save();
}

// Aynı programda, aynı haftanın gününe ait, verilen tarihten önceki en son kayıt
function prevLogForDay(pid, d, beforeDate) {
  let best = null;
  S.logs.forEach(l => {
    if (l.programId === pid && l.dayIndex === d && l.date < beforeDate && (!best || l.date > best.date)) best = l;
  });
  return best;
}

/* Bir hareketin belirli bir tarihteki ağırlığı:
   - o gün tamamlandıysa: girilen ağırlık
   - gelecek haftalar: bir önceki haftanın aynı günü tamamlanmadıysa "henüz belirlenmedi"
   - aksi halde: aynı günün son kaydı (+2,5 kg artış seçildiyse) ya da başlangıç ağırlığı */
function plannedWeight(p, date, ex) {
  const log = findLog(p.id, date);
  if (log) {
    const e = log.exercises.find(x => x.exId === ex.id);
    return { kind: 'logged', value: e ? e.weight : null };
  }
  if (weekStart(date) > weekStart(today()) && !findLog(p.id, addDays(date, -7))) {
    return { kind: 'undetermined' };
  }
  const prev = prevLogForDay(p.id, dayIdx(date), date);
  if (prev) {
    const e = prev.exercises.find(x => x.exId === ex.id);
    if (e && e.weight != null) {
      return { kind: 'planned', value: Math.round((e.weight + (e.increase ? INCREMENT : 0)) * 100) / 100, increased: !!e.increase };
    }
  }
  if (ex.startWeight != null) return { kind: 'planned', value: ex.startWeight };
  return { kind: 'unset' };
}

function weightHtml(pw, ex) {
  if (pw.kind === 'undetermined') return '<span class="wtext pending">Ağırlık durumu henüz belirlenmedi</span>';
  if (pw.value == null) return '<span class="wtext pending">' + (ex.bw ? 'Vücut ağırlığı' : 'Belirlenmedi') + '</span>';
  return '<span class="wtext">' + fmtKg(pw.value) + ' kg</span>' + (pw.increased ? ' <span class="up">↑ +' + fmtKg(INCREMENT) + '</span>' : '');
}

function dayStatus(p, date) {
  if (p.days[dayIdx(date)].off) return 'off';
  if (findLog(p.id, date)) return 'done';
  const t = today();
  if (date < t) return p.activatedOn && date < p.activatedOn ? 'na' : 'missed';
  if (date === t) return 'today';
  return 'upcoming';
}
const STATUS_TEXT = { off: 'Off Day', done: 'Tamamlandı', missed: 'Tamamlanmadı', today: 'Bugün', upcoming: 'Yaklaşan', na: 'Aktif değildi' };
const badge = st => '<span class="badge ' + st + '">' + STATUS_TEXT[st] + '</span>';

/* =========================================================
   Program oluşturucu (profil bilgilerine göre)
   ========================================================= */
const COMPOUND = ['Squat', 'Bench Press', 'Deadlift', 'Barbell Row', 'Overhead Press', 'Leg Press', 'Romanian Deadlift',
  'Barfiks', 'Eğimli Dumbbell Press', 'Lat Pulldown', 'Front Squat', 'Hip Thrust', 'Dips', 'Seated Cable Row',
  'Goblet Squat', 'Dumbbell RDL', 'Bulgarian Split Squat', 'Dumbbell Floor Press', 'Şınav', 'Tek Kol Dumbbell Row',
  'Dumbbell Shoulder Press', 'Dumbbell Bench Press', 'Eğilerek Dumbbell Row'];
const BODYWEIGHT = ['Şınav', 'Barfiks', 'Plank', 'Dips', 'Sandalye Dips', 'Pike Şınav', 'Superman', 'Glute Bridge',
  'Lunge', 'Mekik', 'Bacak Kaldırma', 'Yan Plank'];
const TIMED = ['Plank', 'Yan Plank'];

const TEMPLATES = {
  gym: {
    fbA: ['Tüm Vücut A', ['Squat', 'Bench Press', 'Barbell Row', 'Overhead Press', 'Leg Curl', 'Triceps Pushdown', 'Plank']],
    fbB: ['Tüm Vücut B', ['Deadlift', 'Eğimli Dumbbell Press', 'Lat Pulldown', 'Leg Press', 'Lateral Raise', 'Barbell Curl', 'Cable Crunch']],
    fbC: ['Tüm Vücut C', ['Leg Press', 'Dumbbell Bench Press', 'Seated Cable Row', 'Dumbbell Shoulder Press', 'Leg Extension', 'Hammer Curl', 'Plank']],
    push: ['İtiş (Göğüs, Omuz, Arka Kol)', ['Bench Press', 'Overhead Press', 'Eğimli Dumbbell Press', 'Lateral Raise', 'Cable Fly', 'Triceps Pushdown', 'Overhead Triceps Extension']],
    pull: ['Çekiş (Sırt, Ön Kol)', ['Deadlift', 'Lat Pulldown', 'Barbell Row', 'Seated Cable Row', 'Face Pull', 'Barbell Curl', 'Hammer Curl']],
    legs: ['Bacak & Karın', ['Squat', 'Romanian Deadlift', 'Leg Press', 'Leg Curl', 'Leg Extension', 'Calf Raise', 'Cable Crunch']],
    pushB: ['İtiş B', ['Eğimli Dumbbell Press', 'Dumbbell Shoulder Press', 'Dips', 'Cable Fly', 'Lateral Raise', 'Skull Crusher', 'Triceps Pushdown']],
    pullB: ['Çekiş B', ['Barfiks', 'Tek Kol Dumbbell Row', 'Lat Pulldown', 'Face Pull', 'Reverse Fly', 'Dumbbell Curl', 'Hammer Curl']],
    legsB: ['Bacak & Karın B', ['Front Squat', 'Hip Thrust', 'Bulgarian Split Squat', 'Leg Curl', 'Leg Extension', 'Calf Raise', 'Bacak Kaldırma']],
    upA: ['Üst Vücut A', ['Bench Press', 'Barbell Row', 'Overhead Press', 'Lat Pulldown', 'Lateral Raise', 'Barbell Curl', 'Triceps Pushdown']],
    upB: ['Üst Vücut B', ['Eğimli Dumbbell Press', 'Seated Cable Row', 'Dumbbell Shoulder Press', 'Barfiks', 'Cable Fly', 'Hammer Curl', 'Overhead Triceps Extension']],
    loA: ['Alt Vücut A', ['Squat', 'Romanian Deadlift', 'Leg Press', 'Leg Curl', 'Calf Raise', 'Plank']],
    loB: ['Alt Vücut B', ['Deadlift', 'Bulgarian Split Squat', 'Leg Extension', 'Leg Curl', 'Calf Raise', 'Cable Crunch']]
  },
  home: {
    fbA: ['Tüm Vücut A', ['Goblet Squat', 'Şınav', 'Tek Kol Dumbbell Row', 'Dumbbell Shoulder Press', 'Glute Bridge', 'Sandalye Dips', 'Plank']],
    fbB: ['Tüm Vücut B', ['Dumbbell RDL', 'Dumbbell Floor Press', 'Eğilerek Dumbbell Row', 'Lunge', 'Lateral Raise', 'Dumbbell Curl', 'Superman']],
    fbC: ['Tüm Vücut C', ['Bulgarian Split Squat', 'Pike Şınav', 'Tek Kol Dumbbell Row', 'Dumbbell Floor Press', 'Glute Bridge', 'Hammer Curl', 'Plank']],
    push: ['İtiş (Göğüs, Omuz, Arka Kol)', ['Şınav', 'Dumbbell Floor Press', 'Dumbbell Shoulder Press', 'Pike Şınav', 'Lateral Raise', 'Sandalye Dips', 'Overhead Triceps Extension']],
    pull: ['Çekiş (Sırt, Ön Kol)', ['Tek Kol Dumbbell Row', 'Eğilerek Dumbbell Row', 'Dumbbell Pullover', 'Reverse Fly', 'Dumbbell Curl', 'Hammer Curl', 'Superman']],
    legs: ['Bacak & Karın', ['Goblet Squat', 'Dumbbell RDL', 'Bulgarian Split Squat', 'Lunge', 'Glute Bridge', 'Calf Raise', 'Plank']],
    pushB: ['İtiş B', ['Dumbbell Floor Press', 'Pike Şınav', 'Şınav', 'Lateral Raise', 'Dumbbell Fly', 'Sandalye Dips', 'Overhead Triceps Extension']],
    pullB: ['Çekiş B', ['Eğilerek Dumbbell Row', 'Tek Kol Dumbbell Row', 'Reverse Fly', 'Dumbbell Pullover', 'Hammer Curl', 'Dumbbell Curl', 'Superman']],
    legsB: ['Bacak & Karın B', ['Bulgarian Split Squat', 'Dumbbell RDL', 'Goblet Squat', 'Glute Bridge', 'Calf Raise', 'Yan Plank', 'Bacak Kaldırma']],
    upA: ['Üst Vücut A', ['Şınav', 'Tek Kol Dumbbell Row', 'Dumbbell Shoulder Press', 'Dumbbell Pullover', 'Lateral Raise', 'Dumbbell Curl', 'Sandalye Dips']],
    upB: ['Üst Vücut B', ['Dumbbell Floor Press', 'Eğilerek Dumbbell Row', 'Pike Şınav', 'Reverse Fly', 'Hammer Curl', 'Overhead Triceps Extension', 'Plank']],
    loA: ['Alt Vücut A', ['Goblet Squat', 'Dumbbell RDL', 'Lunge', 'Glute Bridge', 'Calf Raise', 'Plank']],
    loB: ['Alt Vücut B', ['Bulgarian Split Squat', 'Dumbbell RDL', 'Goblet Squat', 'Glute Bridge', 'Calf Raise', 'Superman']]
  }
};

function splitFor(days, level) {
  switch (days) {
    case 2: return [[0, 'fbA'], [3, 'fbB']];
    case 3: return level === 'beginner' ? [[0, 'fbA'], [2, 'fbB'], [4, 'fbC']] : [[0, 'push'], [2, 'pull'], [4, 'legs']];
    case 4: return [[0, 'upA'], [1, 'loA'], [3, 'upB'], [4, 'loB']];
    case 5: return [[0, 'push'], [1, 'pull'], [2, 'legs'], [4, 'upA'], [5, 'loA']];
    default: return [[0, 'push'], [1, 'pull'], [2, 'legs'], [3, 'pushB'], [4, 'pullB'], [5, 'legsB']];
  }
}

function generateProgram(pr) {
  const cfg = {
    beginner: { count: 5, sets: 3, cSets: 3 },
    intermediate: { count: 6, sets: 3, cSets: 4 },
    advanced: { count: 6, sets: 4, cSets: 4 },
    expert: { count: 7, sets: 4, cSets: 5 }
  }[pr.level];
  const reps = {
    lose: ['10-12', '12-15'], muscle: ['6-10', '10-12'], strength: ['4-6', '8-10'], fit: ['8-10', '10-12']
  }[pr.goal];
  const notes = {
    lose: 'Setler arası 60 sn dinlen. Her antrenmanın sonuna 15-20 dk orta tempolu kardiyo ekle.',
    muscle: 'Setler arası 90-120 sn dinlen. Günlük kilogram başına ~1,6-2 g protein almaya çalış.',
    strength: 'Ana hareketlerde setler arası 2-3 dk dinlen. Formdan asla ödün verme.',
    fit: 'Setler arası 60-90 sn dinlen. Off günlerinde 30 dk yürüyüş iyi gelir.'
  };
  const days = [];
  for (let i = 0; i < 7; i++) days.push({ off: true });
  splitFor(pr.daysPerWeek, pr.level).forEach(([d, key]) => {
    const tpl = TEMPLATES[pr.location][key];
    days[d] = {
      off: false,
      title: tpl[0],
      exercises: tpl[1].slice(0, cfg.count).map(name => {
        const isC = COMPOUND.indexOf(name) >= 0;
        return {
          id: uid(), name,
          sets: isC ? cfg.cSets : cfg.sets,
          reps: TIMED.indexOf(name) >= 0 ? '30-60 sn' : (isC ? reps[0] : reps[1]),
          startWeight: null,
          bw: BODYWEIGHT.indexOf(name) >= 0
        };
      })
    };
  });
  return {
    id: uid(),
    name: 'AI · ' + GOALS[pr.goal].t + ' Programı',
    source: 'ai',
    createdAt: today(),
    note: notes[pr.goal],
    days
  };
}

/* =========================================================
   Arayüz altyapısı
   ========================================================= */
const $app = document.getElementById('app');
let keepScroll = false;

function go(hash) {
  if (location.hash === hash) render(); else location.hash = hash;
}
function rerender() { keepScroll = true; render(); }

function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.classList.remove('show'), 2400);
}

const ICONS = {
  home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/></svg>',
  week: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4.5" width="18" height="16.5" rx="2.5"/><path d="M3 9.5h18M8 2.5v4M16 2.5v4"/></svg>',
  history: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 7v5l3.5 2"/></svg>',
  programs: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6.5 6.5v11M17.5 6.5v11M3 9.5v5M21 9.5v5M6.5 12h11"/></svg>',
  profile: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/></svg>'
};
const TABS = [['home', 'Ana Sayfa', '#/home'], ['week', 'Haftalık', '#/week'], ['history', 'Geçmiş', '#/history'],
  ['programs', 'Programlarım', '#/programs'], ['profile', 'Profil', '#/profile']];

function layout(v) {
  return '<header class="top">' +
    (v.back ? '<button class="back" data-go="' + v.back + '">‹</button>' : '') +
    '<h1>' + h(v.title) + '</h1>' + (v.right || '') + '</header>' +
    '<main class="view' + (v.sticky ? ' has-sticky' : '') + '">' + v.body + '</main>' +
    (v.sticky ? '<div class="sticky-cta">' + v.sticky + '</div>' : '') +
    '<nav class="tabs">' + TABS.map(t =>
      '<div class="tab' + (v.tab === t[0] ? ' on' : '') + '" data-go="' + t[2] + '">' + ICONS[t[0]] + '<span>' + t[1] + '</span></div>'
    ).join('') + '</nav>';
}

function render() {
  closeModal();
  const y = window.scrollY;
  if (!S.profile) {
    $app.innerHTML = vOnboarding();
  } else {
    const parts = location.hash.replace(/^#\/?/, '').split('/');
    const views = {
      home: vHome, week: vWeek, day: vDay, history: vHistory, log: vLog, programs: vPrograms,
      program: vProgram, 'new-program': vNewProgram, ai: vAI, profile: vProfile, 'edit-profile': vEditProfile, weight: vWeight
    };
    const fn = views[parts[0]] || vHome;
    $app.innerHTML = layout(fn.apply(null, parts.slice(1).map(decodeURIComponent)));
  }
  window.scrollTo(0, keepScroll ? y : 0);
  keepScroll = false;
}

/* =========================================================
   Onboarding (ilk kurulum)
   ========================================================= */
const ob = { step: 0, data: {} };
const OB_STEPS = 5;

function vOnboarding() {
  const d = ob.data;
  let title, lead, body;
  const choice = (key, val, o) =>
    '<div class="choice' + (d[key] === val ? ' sel' : '') + '" data-act="ob-pick" data-k="' + key + '" data-v="' + val + '">' +
    (o.ic ? '<div class="ic">' + o.ic + '</div>' : '') +
    '<div><div class="t">' + o.t + '</div><div class="d">' + o.d + '</div></div></div>';
  const unitInput = (id, unit, val, ph) =>
    '<div class="unit-input"><input id="' + id + '" type="text" inputmode="decimal" value="' + h(val == null ? '' : val) + '" placeholder="' + ph + '"><span>' + unit + '</span></div>';

  switch (ob.step) {
    case 0:
      title = 'Seni tanıyalım 👋';
      lead = 'Sana uygun bir program hazırlayabilmem için birkaç bilgiye ihtiyacım var.';
      body =
        '<label class="f">Ad</label><input id="ob-first" type="text" autocomplete="given-name" value="' + h(d.firstName) + '" placeholder="Adın">' +
        '<label class="f">Soyad</label><input id="ob-last" type="text" autocomplete="family-name" value="' + h(d.lastName) + '" placeholder="Soyadın">' +
        '<div class="two"><div><label class="f">Boy</label>' + unitInput('ob-height', 'cm', d.height, '175') + '</div>' +
        '<div><label class="f">Kilo</label>' + unitInput('ob-weight', 'kg', d.weight, '75') + '</div></div>';
      break;
    case 1:
      title = 'Hedef kilon kaç?';
      lead = 'Şu anki kilon: <b>' + fmtKg(d.weight) + ' kg</b>';
      body = '<label class="f">Hedef kilo</label>' + unitInput('ob-target', 'kg', d.targetWeight, fmtKg(d.weight));
      break;
    case 2:
      title = 'Amacın ne?';
      lead = 'Programın tekrar aralıkları ve dinlenme süreleri buna göre ayarlanacak.';
      body = Object.keys(GOALS).map(k => choice('goal', k, GOALS[k])).join('');
      break;
    case 3:
      title = 'Ne zaman ve nerede?';
      lead = 'Haftada kaç gün antrenman yapacaksın?';
      body = '<div class="chips">' + [2, 3, 4, 5, 6].map(n =>
        '<div class="chip' + (d.daysPerWeek === n ? ' sel' : '') + '" data-act="ob-pick" data-k="daysPerWeek" data-v="' + n + '">' + n + '</div>'
      ).join('') + '</div>' +
        '<p class="lead" style="margin-top:22px">Nerede spor yapacaksın?</p>' +
        Object.keys(LOCATIONS).map(k => choice('location', k, LOCATIONS[k])).join('');
      break;
    default:
      title = 'Fitness geçmişin nedir?';
      lead = 'Set sayısı ve hareket sayısı seviyene göre belirlenecek.';
      body = Object.keys(LEVELS).map(k => choice('level', k, LEVELS[k])).join('');
  }
  return '<div class="ob">' +
    '<div class="ob-progress"><div style="width:' + ((ob.step + 1) / OB_STEPS * 100) + '%"></div></div>' +
    '<div class="ob-step">Adım ' + (ob.step + 1) + ' / ' + OB_STEPS + '</div>' +
    '<h1>' + title + '</h1><p class="lead">' + lead + '</p>' +
    '<div class="ob-body">' + body + '<div class="err" id="ob-err"></div></div>' +
    '<div class="ob-actions">' + (ob.step > 0 ? '<button class="btn secondary" data-act="ob-back">Geri</button>' : '') +
    '<button class="btn" data-act="ob-next">' + (ob.step === OB_STEPS - 1 ? 'Programımı oluştur ✨' : 'Devam') + '</button></div></div>';
}

function obCollect() {
  const d = ob.data;
  const val = id => { const el = document.getElementById(id); return el ? el.value : null; };
  if (ob.step === 0) {
    d.firstName = (val('ob-first') || '').trim();
    d.lastName = (val('ob-last') || '').trim();
    d.height = num(val('ob-height'));
    d.weight = num(val('ob-weight'));
  } else if (ob.step === 1) {
    d.targetWeight = num(val('ob-target'));
  }
}

function obValidate() {
  const d = ob.data;
  switch (ob.step) {
    case 0:
      if (!d.firstName || !d.lastName) return 'Lütfen ad ve soyadını gir.';
      if (!d.height || d.height < 100 || d.height > 250) return 'Lütfen geçerli bir boy gir (cm).';
      if (!d.weight || d.weight < 30 || d.weight > 300) return 'Lütfen geçerli bir kilo gir (kg).';
      return '';
    case 1: return (!d.targetWeight || d.targetWeight < 30 || d.targetWeight > 300) ? 'Lütfen geçerli bir hedef kilo gir.' : '';
    case 2: return d.goal ? '' : 'Lütfen bir amaç seç.';
    case 3: return !d.daysPerWeek ? 'Lütfen haftalık gün sayısını seç.' : (!d.location ? 'Lütfen nerede spor yapacağını seç.' : '');
    default: return d.level ? '' : 'Lütfen seviyeni seç.';
  }
}

/* =========================================================
   Ana sayfa
   ========================================================= */
function vHome() {
  const p = activeProgram();
  const t = today();
  const d = dayIdx(t);
  const pr = S.profile;
  let body = '<div class="hello"><div class="date">' + fmtDate(t) + ', ' + DAY_NAMES[d] + '</div><h2>Merhaba ' + h(pr.firstName) + '!</h2></div>';

  if (weighDue()) {
    body += '<div class="card weigh-card"><div class="row"><span class="wc-ic">⚖️</span><div class="grow"><b>Tartılma zamanı!</b>' +
      '<div class="muted small">2 haftada bir kilonu kaydediyoruz. Son kayıt: ' + fmtKg(lastWeight().kg) + ' kg (' + fmtShort(lastWeight().date) + ')</div></div></div>' +
      '<div class="row" style="margin-top:12px"><div class="unit-input grow"><input id="weigh-in" type="text" inputmode="decimal" placeholder="' + fmtKg(lastWeight().kg) + '"><span>kg</span></div>' +
      '<button class="btn small" data-act="weigh-save">Kaydet</button></div>' +
      '<div class="err" id="weigh-err"></div><button class="btn ghost small" data-act="weigh-snooze" style="padding-left:0">Bugün değil</button></div>';
  }

  if (!p) {
    body += '<div class="card empty">Aktif bir antrenman programın yok.<button class="btn" data-go="#/programs">Programlarım</button></div>';
    return { title: 'FitTakip', tab: 'home', body };
  }

  const day = p.days[d];
  const st = dayStatus(p, t);
  if (day.off) {
    body += '<div class="today-card off" data-go="#/day/' + t + '"><div class="tc-top"><span class="tc-label">Bugün · ' + DAY_NAMES[d] + '</span>' + badge('off') + '</div>' +
      '<div class="tc-title">Off Day 😴</div><div class="tc-meta">Bugün dinlenme günü. Kasların büyüsün!</div></div>';
  } else {
    const names = day.exercises.map(e => e.name);
    body += '<div class="today-card' + (st === 'done' ? ' done' : '') + '" data-go="#/day/' + t + '">' +
      '<div class="tc-top"><span class="tc-label">Bugün · ' + DAY_NAMES[d] + '</span>' + badge(st) + '</div>' +
      '<div class="tc-title">' + h(day.title) + '</div>' +
      '<div class="tc-meta">' + day.exercises.length + ' hareket · ' + totalSets(day) + ' set</div>' +
      '<div class="tc-ex">' + h(names.slice(0, 3).join(' · ')) + (names.length > 3 ? ' +' + (names.length - 3) : '') + '</div>' +
      '<div class="tc-cta">' + (st === 'done' ? 'Detayları gör ›' : 'Antrenmana başla ›') + '</div></div>';
  }

  // Haftalık şerit
  const ws = weekStart(t);
  let done = 0, planned = 0;
  body += '<div class="section-title">Bu hafta · ' + h(p.name) + '</div><div class="strip">';
  for (let i = 0; i < 7; i++) {
    const date = addDays(ws, i);
    const s = dayStatus(p, date);
    if (s !== 'off') planned++;
    if (s === 'done') done++;
    body += '<div class="sd' + (date === t ? ' is-today' : '') + '" data-go="#/day/' + date + '"><div class="n">' + DAY_SHORT[i] + '</div><div class="dn">' + fromKey(date).getDate() + '</div><div class="dot ' + s + '"></div></div>';
  }
  body += '</div>';

  const diff = Math.round((pr.targetWeight - pr.weight) * 10) / 10;
  body += '<div class="section-title">Özet</div><div class="stats">' +
    '<div class="stat"><div class="v">' + done + ' / ' + planned + '</div><div class="l">Bu hafta tamamlanan</div></div>' +
    '<div class="stat" data-go="#/weight"><div class="v">' + fmtKg(pr.weight) + ' kg</div><div class="l">' +
    (diff === 0 ? 'Hedefine ulaştın 🎉' : 'Hedefe ' + (diff > 0 ? '+' : '') + fmtKg(diff) + ' kg') + ' ›</div></div></div>';
  return { title: 'FitTakip', tab: 'home', body };
}

/* =========================================================
   Kilo takibi
   ========================================================= */
function vWeight() {
  const pr = S.profile;
  const list = sortedWeights();
  const first = list[0], last = list[list.length - 1];
  const change = Math.round((last.kg - first.kg) * 10) / 10;
  const kv = (k, v) => '<div class="kv"><span>' + k + '</span><span>' + v + '</span></div>';
  let body = '<div class="stats" style="margin-bottom:12px">' +
    '<div class="stat"><div class="v">' + fmtKg(last.kg) + ' kg</div><div class="l">Şu anki kilo</div></div>' +
    '<div class="stat"><div class="v">' + fmtKg(pr.targetWeight) + ' kg</div><div class="l">Hedef kilo</div></div></div>' +
    '<div class="card">' + kv('Başlangıç', fmtKg(first.kg) + ' kg · ' + fmtShort(first.date)) +
    kv('Toplam değişim', (change > 0 ? '+' : '') + fmtKg(change) + ' kg') +
    kv('Sonraki tartılma', nextWeighDate() <= today() ? 'Bugün' : fmtDate(nextWeighDate())) + '</div>' +
    '<label class="f">Yeni kilo kaydı</label><div class="row"><div class="unit-input grow"><input id="weigh-in" type="text" inputmode="decimal" placeholder="' + fmtKg(last.kg) + '"><span>kg</span></div>' +
    '<button class="btn small" data-act="weigh-save">Kaydet</button></div><div class="err" id="weigh-err"></div>' +
    '<div class="section-title">Kilo geçmişi</div>';
  list.slice().reverse().forEach((w, i, arr) => {
    const prev = arr[i + 1];
    const dd = prev ? Math.round((w.kg - prev.kg) * 10) / 10 : null;
    body += '<div class="hist"><div class="mid"><div class="ttl">' + fmtKg(w.kg) + ' kg</div><div class="sub">' + fmtDate(w.date) + '</div></div>' +
      (dd == null ? '<span class="badge na">Başlangıç</span>' : '<span class="wdiff' + (dd === 0 ? '' : (dd > 0) === (pr.targetWeight > first.kg) ? ' good' : ' bad') + '">' + (dd > 0 ? '+' : '') + fmtKg(dd) + ' kg</span>') + '</div>';
  });
  return { title: 'Kilo Takibi', tab: 'profile', back: '#/profile', body };
}

function saveWeighIn() {
  const kg = num(document.getElementById('weigh-in').value);
  if (!kg || kg < 30 || kg > 300) { document.getElementById('weigh-err').textContent = 'Lütfen geçerli bir kilo gir.'; return; }
  addWeight(kg);
  toast('Kilon kaydedildi: ' + fmtKg(kg) + ' kg');
  rerender();
}

/* =========================================================
   Haftalık program
   ========================================================= */
function vWeek(which) {
  const p = activeProgram();
  if (!p) return { title: 'Haftalık', tab: 'week', body: '<div class="card empty">Aktif bir programın yok.<button class="btn" data-go="#/programs">Programlarım</button></div>' };
  const next = which === '1';
  const ws = addDays(weekStart(today()), next ? 7 : 0);
  let body = '<div class="seg"><div class="' + (next ? '' : 'on') + '" data-go="#/week/0">Bu Hafta</div><div class="' + (next ? 'on' : '') + '" data-go="#/week/1">Gelecek Hafta</div></div>' +
    '<div class="range">' + fmtShort(ws) + ' – ' + fmtShort(addDays(ws, 6)) + ' · ' + h(p.name) + '</div>';
  for (let i = 0; i < 7; i++) {
    const date = addDays(ws, i);
    const day = p.days[i];
    const st = dayStatus(p, date);
    body += '<div class="day-item' + (date === today() ? ' is-today' : '') + (day.off ? ' off' : '') + '" data-go="#/day/' + date + '">' +
      '<div class="dd"><div class="n">' + DAY_SHORT[i] + '</div><div class="dn">' + fromKey(date).getDate() + '</div></div>' +
      '<div class="mid"><div class="ttl">' + (day.off ? 'Off Day' : h(day.title)) + '</div>' +
      '<div class="sub">' + (day.off ? 'Dinlenme günü' : day.exercises.length + ' hareket · ' + totalSets(day) + ' set') + '</div></div>' +
      badge(st) + '</div>';
  }
  return { title: 'Haftalık Program', tab: 'week', body };
}

/* =========================================================
   Gün detayı / antrenman girişi
   ========================================================= */
const draftKey = (pid, date) => 'w|' + pid + '|' + date;

function vDay(date) {
  const p = activeProgram();
  if (!p || !date) return { title: 'Antrenman', tab: 'week', back: '#/week', body: '<div class="card empty">Aktif bir programın yok.</div>' };
  const di = dayIdx(date);
  const day = p.days[di];
  const st = dayStatus(p, date);
  const isNextWeek = weekStart(date) > weekStart(today());
  const back = isNextWeek ? '#/week/1' : '#/week/0';
  const title = DAY_NAMES[di] + ', ' + fmtShort(date);

  if (day.off) {
    return { title, tab: 'week', back, body: '<div class="offbig"><div class="e">😴</div><h2>Off Day</h2><p class="muted">Bugün dinlenme günü. Toparlanmak da antrenmanın bir parçası.</p></div>' };
  }

  const log = findLog(p.id, date);
  if (log) return { title, tab: 'week', back, body: logBody(log, p) };

  let body = '<div class="day-head"><div class="row"><span class="muted small">' + day.exercises.length + ' hareket · ' + totalSets(day) + ' set</span>' + badge(st) + '</div><h2>' + h(day.title) + '</h2></div>';

  // Bugünün antrenmanı: giriş modu
  if (st === 'today') {
    const dr = S.drafts[draftKey(p.id, date)] || { w: {}, r: {} };
    day.exercises.forEach(ex => {
      const pw = plannedWeight(p, date, ex);
      const wVal = dr.w[ex.id] != null ? dr.w[ex.id] : (pw.value != null ? fmtKg(pw.value) : '');
      const reps = dr.r[ex.id] || [];
      body += '<div class="card ex"><div class="ex-name">' + h(ex.name) + '</div>' +
        '<div class="ex-target">' + ex.sets + ' set' + (ex.reps ? ' · Hedef ' + h(ex.reps) : '') + '</div>' +
        '<div class="wline"><span class="lbl">Ağırlık (kg)' + (pw.increased ? ' <span class="up">↑ +' + fmtKg(INCREMENT) + '</span>' : '') + '</span>' +
        '<input type="text" inputmode="decimal" data-w="' + ex.id + '" value="' + h(wVal) + '" placeholder="' + (ex.bw ? 'VA' : 'kg') + '"></div>' +
        '<div class="sets">';
      for (let i = 0; i < ex.sets; i++) {
        body += '<div class="set-row"><span class="sn">Set ' + (i + 1) + '</span><input type="text" inputmode="numeric" pattern="[0-9]*" data-r="' + ex.id + '" data-i="' + i + '" value="' + h(reps[i] == null ? '' : reps[i]) + '" placeholder="tekrar"></div>';
      }
      body += '</div></div>';
    });
    body += '<div class="err" id="day-err"></div>';
    if (p.note) body += '<div class="info">💡 ' + h(p.note) + '</div>';
    return { title, tab: 'week', back, body, sticky: '<button class="btn" data-act="complete" data-date="' + date + '">Tamamla ✓</button>' };
  }

  // Salt okunur görünüm: geçmiş, kaçırılmış ya da gelecek gün
  if (st === 'missed') body += '<div class="banner missed">Bu antrenman tamamlanmadı.</div>';
  else if (st === 'na') body += '<div class="banner na">Bu tarihte program henüz aktif değildi.</div>';
  else body += '<div class="banner upcoming">Bu antrenman ' + (isNextWeek ? 'gelecek hafta' : 'bu hafta') + ' ' + DAY_NAMES[di] + ' günü yapılacak.</div>';

  day.exercises.forEach(ex => {
    const pw = plannedWeight(p, date, ex);
    body += '<div class="card ex"><div class="ex-name">' + h(ex.name) + '</div>' +
      '<div class="ex-target">' + ex.sets + ' set' + (ex.reps ? ' · Hedef ' + h(ex.reps) : '') + '</div>' +
      '<div class="wline"><span class="lbl">Ağırlık</span>' + weightHtml(pw, ex) + '</div><div class="sets">';
    for (let i = 0; i < ex.sets; i++) body += '<div class="set-row"><span class="sn">Set ' + (i + 1) + '</span><div class="box">— tekrar</div></div>';
    body += '</div></div>';
  });
  return { title, tab: 'week', back, body };
}

function logBody(log, p) {
  let body = '<div class="day-head"><div class="row"><span class="muted small">' + DAY_NAMES[log.dayIndex] + ', ' + fmtDate(log.date) + '</span>' + badge('done') + '</div><h2>' + h(log.title) + '</h2></div>';
  if (p && log.programId !== S.activeProgramId) body += '<div class="info">Program: ' + h(p.name) + '</div>';
  log.exercises.forEach(e => {
    body += '<div class="card ex"><div class="ex-name">' + h(e.name) + '</div>' +
      '<div class="ex-target">' + e.sets + ' set' + (e.target ? ' · Hedef ' + h(e.target) : '') + '</div>' +
      '<div class="wline"><span class="lbl">Ağırlık</span>' +
      (e.weight != null ? '<span class="wtext">' + fmtKg(e.weight) + ' kg</span>' : '<span class="wtext pending">' + (e.bw ? 'Vücut ağırlığı' : 'Girilmedi') + '</span>') +
      '</div><div class="sets">';
    for (let i = 0; i < e.sets; i++) {
      const r = e.reps[i];
      body += '<div class="set-row"><span class="sn">Set ' + (i + 1) + '</span><div class="box' + (r != null ? ' val' : '') + '">' + (r != null ? r + ' tekrar' : 'yapılmadı') + '</div></div>';
    }
    body += '</div>' + (e.increase ? '<div class="up" style="margin-top:8px">↑ Sonraki hafta ' + fmtKg(e.weight + INCREMENT) + ' kg</div>' : '') + '</div>';
  });
  return body;
}

function completeWorkout(date) {
  const p = activeProgram();
  const day = p.days[dayIdx(date)];
  const dr = S.drafts[draftKey(p.id, date)] || { w: {}, r: {} };
  const exercises = day.exercises.map(ex => {
    const reps = [];
    for (let i = 0; i < ex.sets; i++) {
      const v = (dr.r[ex.id] || [])[i];
      const n = v == null || String(v).trim() === '' ? null : parseInt(v, 10);
      reps.push(isFinite(n) ? n : null);
    }
    // Kullanıcı ağırlık alanına dokunmadıysa planlanan ağırlık geçerlidir
    const w = dr.w[ex.id] != null ? num(dr.w[ex.id]) : plannedWeight(p, date, ex).value;
    return { exId: ex.id, name: ex.name, sets: ex.sets, target: ex.reps || '', bw: !!ex.bw, weight: w == null ? null : w, reps, increase: false };
  });
  if (!exercises.some(e => e.reps.some(r => r != null))) {
    const err = document.getElementById('day-err');
    if (err) { err.textContent = 'Tamamlamak için en az bir setin tekrar sayısını gir.'; err.scrollIntoView({ block: 'center' }); }
    return;
  }
  openProgressionModal(p, date, day, exercises);
}

/* ---------------- Ağırlık artırma penceresi ---------------- */
let modalCtx = null;

function openProgressionModal(p, date, day, exercises) {
  modalCtx = { p, date, day, exercises, sel: {} };
  drawModal();
}
function drawModal() {
  const c = modalCtx;
  let html = '<div class="modal-bg" data-act="modal-bg"><div class="modal">' +
    '<h3>Harika iş! 💪</h3><p>Hangi hareketlerde ağırlığı artırmaya hazırsın? Seçtiklerin gelecek hafta <b>+' + fmtKg(INCREMENT) + ' kg</b> ile görünecek.</p>';
  const selectable = c.exercises.filter(e => e.weight != null);
  if (selectable.length) {
    const all = selectable.every(e => c.sel[e.exId]);
    html += '<div class="row" style="justify-content:flex-end;margin-bottom:8px"><button class="btn ghost small" data-act="pick-all">' + (all ? 'Hiçbirini seçme' : 'Tümünü seç') + '</button></div>';
  }
  c.exercises.forEach(e => {
    const dis = e.weight == null;
    const sel = !!c.sel[e.exId];
    html += '<div class="pick' + (sel ? ' sel' : '') + (dis ? ' dis' : '') + '"' + (dis ? '' : ' data-act="pick" data-id="' + e.exId + '"') + '>' +
      '<div class="bx">' + (sel ? '✓' : '') + '</div><div class="mid"><div class="nm">' + h(e.name) + '</div>' +
      '<div class="w">' + (dis ? 'Ağırlık girilmedi' : fmtKg(e.weight) + ' kg' + (sel ? ' → <b>' + fmtKg(e.weight + INCREMENT) + ' kg</b>' : '')) + '</div></div></div>';
  });
  html += '<button class="btn" data-act="save-workout" style="margin-top:14px">Kaydet ve Tamamla</button>' +
    '<button class="btn secondary" data-act="modal-close">Geri dön</button></div></div>';
  let el = document.getElementById('modal');
  if (!el) { el = document.createElement('div'); el.id = 'modal'; document.body.appendChild(el); }
  el.innerHTML = html;
}
function closeModal() {
  const el = document.getElementById('modal');
  if (el) el.remove();
  modalCtx = null;
}
function saveWorkout() {
  const c = modalCtx;
  c.exercises.forEach(e => { e.increase = !!c.sel[e.exId] && e.weight != null; });
  S.logs.push({
    id: uid(), programId: c.p.id, date: c.date, dayIndex: dayIdx(c.date), title: c.day.title,
    completedAt: new Date().toISOString(), exercises: c.exercises
  });
  delete S.drafts[draftKey(c.p.id, c.date)];
  save();
  closeModal();
  toast('Antrenman tamamlandı! 🎉');
  render();
}

/* =========================================================
   Geçmiş
   ========================================================= */
function histList(logs) {
  if (!logs.length) return '<div class="card empty">Henüz tamamlanmış antrenman yok.</div>';
  return logs.map(l => {
    const sets = l.exercises.reduce((a, e) => a + e.reps.filter(r => r != null).length, 0);
    return '<div class="hist" data-go="#/log/' + l.id + '"><div class="mid"><div class="ttl">' + h(l.title) + '</div>' +
      '<div class="sub">' + DAY_NAMES[l.dayIndex] + ', ' + fmtDate(l.date) + ' · ' + sets + ' set</div></div><span class="chev">›</span></div>';
  }).join('');
}

function vHistory() {
  const p = activeProgram();
  if (!p) return { title: 'Geçmiş', tab: 'history', body: '<div class="card empty">Aktif bir programın yok. Eski programlarının geçmişi Programlarım sayfasında.<button class="btn" data-go="#/programs">Programlarım</button></div>' };
  return { title: 'Geçmiş', tab: 'history', body: '<div class="range">' + h(p.name) + '</div>' + histList(programLogs(p.id)) };
}

function vLog(id) {
  const log = S.logs.find(l => l.id === id);
  if (!log) return { title: 'Antrenman', tab: 'history', back: '#/history', body: '<div class="card empty">Kayıt bulunamadı.</div>' };
  const p = getProgram(log.programId);
  const back = log.programId === S.activeProgramId ? '#/history' : '#/program/' + log.programId;
  return { title: 'Antrenman Detayı', tab: 'history', back, body: logBody(log, p) };
}

/* =========================================================
   Programlarım
   ========================================================= */
function workoutDays(p) { return p.days.filter(d => !d.off).length; }

function vPrograms() {
  let body = '<div class="btn-row"><button class="btn" data-go="#/ai">✨ AI ile oluştur</button><button class="btn secondary" data-go="#/new-program">+ Kendim oluştur</button></div>' +
    '<div class="section-title">Programlarım</div>';
  if (!S.programs.length) body += '<div class="card empty">Henüz bir programın yok.</div>';
  S.programs.slice().reverse().forEach(p => {
    const on = p.id === S.activeProgramId;
    body += '<div class="prog' + (on ? ' is-active' : '') + '">' +
      '<div class="cb' + (on ? ' on' : '') + '" data-act="toggle-active" data-id="' + p.id + '"><div class="bx">' + (on ? '✓' : '') + '</div>' + (on ? 'Aktif' : 'Aktif et') + '</div>' +
      '<div class="mid" data-go="#/program/' + p.id + '"><div class="nm">' + h(p.name) + '</div>' +
      '<div class="sub">' + (p.source === 'ai' ? 'AI' : 'Kişisel') + ' · Haftada ' + workoutDays(p) + ' gün · ' + programLogs(p.id).length + ' antrenman</div></div>' +
      '<span class="chev" data-go="#/program/' + p.id + '">›</span></div>';
  });
  body += '<div class="info">Aynı anda yalnızca bir program aktif olabilir. Programlar düzenlenemez; değişiklik için yeni bir program oluştur.</div>';
  return { title: 'Programlarım', tab: 'programs', body };
}

function programStructure(p) {
  return p.days.map((d, i) => {
    if (d.off) return '<div class="card pd-day"><div class="row"><b>' + DAY_NAMES[i] + '</b>' + badge('off') + '</div></div>';
    return '<div class="card pd-day"><div class="row"><b>' + DAY_NAMES[i] + '</b><span class="muted small">' + h(d.title) + '</span></div><ul>' +
      d.exercises.map(e => '<li><span>' + h(e.name) + '</span><span>' + e.sets + ' set' + (e.reps ? ' × ' + h(e.reps) : '') + '</span></li>').join('') + '</ul></div>';
  }).join('');
}

function vProgram(id) {
  const p = getProgram(id);
  if (!p) return { title: 'Program', tab: 'programs', back: '#/programs', body: '<div class="card empty">Program bulunamadı.</div>' };
  const on = p.id === S.activeProgramId;
  let body = '<div class="prog' + (on ? ' is-active' : '') + '"><div class="cb' + (on ? ' on' : '') + '" data-act="toggle-active" data-id="' + p.id + '"><div class="bx">' + (on ? '✓' : '') + '</div>' + (on ? 'Aktif' : 'Aktif et') + '</div>' +
    '<div class="mid"><div class="nm">' + h(p.name) + '</div><div class="sub">' + (p.source === 'ai' ? 'AI ile oluşturuldu' : 'Kişisel program') + ' · ' + fmtDate(p.createdAt) + '</div></div></div>';
  if (p.note) body += '<div class="info">💡 ' + h(p.note) + '</div>';
  body += '<div class="section-title">Antrenman geçmişi</div>' + histList(programLogs(p.id));
  body += '<div class="section-title">Program</div>' + programStructure(p);
  return { title: p.name, tab: 'programs', back: '#/programs', body };
}

/* ---------------- AI programı ---------------- */
let aiDraft = null;

function vAI(mode) {
  const pr = S.profile;
  if (!aiDraft) aiDraft = generateProgram(pr);
  const onboard = mode === 'onboard';
  let body = '<div class="card ai-hero"><b>✨ Programın hazır, ' + h(pr.firstName) + '!</b>' +
    '<div class="muted small" style="margin-top:4px">Bilgilerine göre senin için oluşturuldu.</div>' +
    '<div class="ai-sum"><span>' + GOALS[pr.goal].t + '</span><span>Haftada ' + pr.daysPerWeek + ' gün</span><span>' + LOCATIONS[pr.location].t + '</span><span>' + LEVELS[pr.level].t + '</span></div></div>' +
    '<label class="f">Program adı</label><input type="text" data-bind="ai-name" value="' + h(aiDraft.name) + '">' +
    '<div class="info" style="margin-top:12px">💡 ' + h(aiDraft.note) + '</div>' +
    programStructure(aiDraft) +
    '<div class="err" id="ai-err"></div>' +
    '<button class="btn" data-act="ai-use" data-mode="' + (onboard ? 'onboard' : '') + '" style="margin-top:12px">' + (onboard ? 'Bu programı kullan' : 'Programı kaydet') + '</button>' +
    '<button class="btn secondary" data-go="#/new-program">Kendi programımı oluşturayım</button>';
  if (!onboard) body += '<div class="info" style="margin-top:12px">Tercihlerini (gün sayısı, yer, seviye) Profil sayfasından değiştirebilirsin.</div>';
  return { title: 'AI Programı', tab: 'programs', back: onboard ? null : '#/programs', body };
}

/* ---------------- Kendi programını oluştur ---------------- */
function newDraftProgram() {
  const days = [];
  for (let i = 0; i < 7; i++) days.push({ off: true, title: '', exercises: [] });
  return { name: '', days };
}
const newEx = () => ({ id: uid(), name: '', sets: '3', reps: '', startWeight: '' });

function vNewProgram() {
  if (!S.drafts.np) S.drafts.np = newDraftProgram();
  const np = S.drafts.np;
  let body = '<label class="f">Program adı</label><input type="text" data-bind="np-name" value="' + h(np.name) + '" placeholder="örn. Yaz Programı">' +
    '<div class="section-title">Günler</div>';
  np.days.forEach((d, i) => {
    body += '<div class="card b-day"><div class="row"><span class="dname">' + DAY_NAMES[i] + '</span>' +
      '<div class="mini-seg"><div class="' + (d.off ? '' : 'on') + '" data-act="np-off" data-d="' + i + '" data-v="0">Antrenman</div>' +
      '<div class="' + (d.off ? 'on offon' : '') + '" data-act="np-off" data-d="' + i + '" data-v="1">Off Day</div></div></div>';
    if (!d.off) {
      body += '<input type="text" data-bind="np-title" data-d="' + i + '" value="' + h(d.title) + '" placeholder="Gün adı (örn. Göğüs & Arka Kol)" style="margin-top:12px">';
      d.exercises.forEach((e, j) => {
        const a = ' data-d="' + i + '" data-j="' + j + '"';
        body += '<div class="b-ex"><input type="text" data-bind="np-ex-name"' + a + ' value="' + h(e.name) + '" placeholder="Hareket adı">' +
          '<div class="row"><div><label>Set</label><input type="text" inputmode="numeric" pattern="[0-9]*" data-bind="np-ex-sets"' + a + ' value="' + h(e.sets) + '"></div>' +
          '<div><label>Hedef tekrar</label><input type="text" data-bind="np-ex-reps"' + a + ' value="' + h(e.reps) + '" placeholder="8-12"></div>' +
          '<div><label>Başl. kg</label><input type="text" inputmode="decimal" data-bind="np-ex-w"' + a + ' value="' + h(e.startWeight) + '" placeholder="—"></div>' +
          '<div class="del" data-act="np-del"' + a + '>×</div></div></div>';
      });
      body += '<div class="add-ex" data-act="np-add" data-d="' + i + '">+ Hareket ekle</div>';
    }
    body += '</div>';
  });
  body += '<div class="err" id="np-err"></div>' +
    '<button class="btn" data-act="np-save" style="margin-top:8px">Programı kaydet</button>' +
    '<button class="btn secondary" data-act="np-reset">Formu temizle</button>' +
    '<div class="info" style="margin-top:12px">Oluşturulan programlar düzenlenemez. Kaydetmeden önce kontrol et.</div>';
  return { title: 'Yeni Program', tab: 'programs', back: '#/programs', body };
}

function saveNewProgram() {
  const np = S.drafts.np;
  const err = msg => { const el = document.getElementById('np-err'); el.textContent = msg; el.scrollIntoView({ block: 'center' }); };
  if (!np.name.trim()) return err('Lütfen programa bir ad ver.');
  if (np.days.every(d => d.off)) return err('En az bir antrenman günü olmalı.');
  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = np.days[i];
    if (d.off) { days.push({ off: true }); continue; }
    const exs = d.exercises.filter(e => e.name.trim());
    if (!exs.length) return err(DAY_NAMES[i] + ' için en az bir hareket ekle (ya da Off Day yap).');
    const out = [];
    for (const e of exs) {
      const sets = parseInt(e.sets, 10);
      if (!(sets >= 1 && sets <= 10)) return err(DAY_NAMES[i] + ' · ' + e.name + ': set sayısı 1-10 arası olmalı.');
      out.push({ id: uid(), name: e.name.trim(), sets, reps: e.reps.trim(), startWeight: num(e.startWeight), bw: false });
    }
    days.push({ off: false, title: d.title.trim() || DAY_NAMES[i] + ' Antrenmanı', exercises: out });
  }
  const p = { id: uid(), name: np.name.trim(), source: 'custom', createdAt: today(), note: '', days };
  S.programs.push(p);
  delete S.drafts.np;
  if (!S.activeProgramId) { setActive(p.id); toast('Program oluşturuldu ve aktif edildi.'); }
  else { save(); toast('Program oluşturuldu. Kullanmak için "Aktif et"i işaretle.'); }
  go('#/programs');
}

/* =========================================================
   Profil
   ========================================================= */
function vProfile() {
  const p = S.profile;
  const bmi = p.weight / Math.pow(p.height / 100, 2);
  const kv = (k, v) => '<div class="kv"><span>' + k + '</span><span>' + v + '</span></div>';
  const body = '<div class="card">' +
    kv('Ad Soyad', h(p.firstName + ' ' + p.lastName)) + kv('Boy', fmtKg(p.height) + ' cm') + kv('Kilo', fmtKg(p.weight) + ' kg') +
    kv('Hedef kilo', fmtKg(p.targetWeight) + ' kg') + kv('Vücut kitle indeksi', fmtKg(Math.round(bmi * 10) / 10)) +
    kv('Amaç', GOALS[p.goal].t) + kv('Haftalık gün', p.daysPerWeek + ' gün') + kv('Yer', LOCATIONS[p.location].t) + kv('Seviye', LEVELS[p.level].t) +
    '</div><button class="btn" data-go="#/weight">⚖️ Kilo takibi</button><button class="btn secondary" data-go="#/edit-profile">Bilgilerimi düzenle</button>' +
    '<div class="section-title">Yedekleme</div>' +
    '<div class="info">Tüm verilerin bu telefonda saklanır. Ara sıra yedeğini kopyalayıp Notlar\'a yapıştırman iyi olur.</div>' +
    '<button class="btn secondary" data-act="backup-copy">Yedeği panoya kopyala</button>' +
    '<label class="f">Yedekten geri yükle</label><textarea id="restore" placeholder="Yedek metnini buraya yapıştır"></textarea>' +
    '<button class="btn secondary" data-act="backup-restore" style="margin-top:10px">Geri yükle</button>' +
    '<div class="err" id="bk-err"></div>' +
    '<div class="section-title">Tehlikeli bölge</div><button class="btn danger" data-act="reset">Tüm verileri sil</button>';
  return { title: 'Profil', tab: 'profile', body };
}

function vEditProfile() {
  const p = S.profile;
  const opt = (obj, cur) => Object.keys(obj).map(k => '<option value="' + k + '"' + (k === cur ? ' selected' : '') + '>' + obj[k].t + '</option>').join('');
  const body =
    '<div class="two"><div><label class="f">Ad</label><input id="ep-first" type="text" value="' + h(p.firstName) + '"></div>' +
    '<div><label class="f">Soyad</label><input id="ep-last" type="text" value="' + h(p.lastName) + '"></div></div>' +
    '<div class="two"><div><label class="f">Boy (cm)</label><input id="ep-height" type="text" inputmode="decimal" value="' + fmtKg(p.height) + '"></div>' +
    '<div><label class="f">Kilo (kg)</label><input id="ep-weight" type="text" inputmode="decimal" value="' + fmtKg(p.weight) + '"></div></div>' +
    '<label class="f">Hedef kilo (kg)</label><input id="ep-target" type="text" inputmode="decimal" value="' + fmtKg(p.targetWeight) + '">' +
    '<label class="f">Amaç</label><select id="ep-goal">' + opt(GOALS, p.goal) + '</select>' +
    '<label class="f">Haftada kaç gün</label><select id="ep-days">' + [2, 3, 4, 5, 6].map(n => '<option' + (n === p.daysPerWeek ? ' selected' : '') + '>' + n + '</option>').join('') + '</select>' +
    '<label class="f">Yer</label><select id="ep-loc">' + opt(LOCATIONS, p.location) + '</select>' +
    '<label class="f">Fitness geçmişi</label><select id="ep-level">' + opt(LEVELS, p.level) + '</select>' +
    '<div class="err" id="ep-err"></div><button class="btn" data-act="ep-save" style="margin-top:16px">Kaydet</button>';
  return { title: 'Bilgilerim', tab: 'profile', back: '#/profile', body };
}

function saveProfile() {
  const v = id => document.getElementById(id).value;
  const p = {
    firstName: v('ep-first').trim(), lastName: v('ep-last').trim(),
    height: num(v('ep-height')), weight: num(v('ep-weight')), targetWeight: num(v('ep-target')),
    goal: v('ep-goal'), daysPerWeek: parseInt(v('ep-days'), 10), location: v('ep-loc'), level: v('ep-level')
  };
  const err = document.getElementById('ep-err');
  if (!p.firstName || !p.lastName) return (err.textContent = 'Ad ve soyad boş olamaz.');
  if (!p.height || !p.weight || !p.targetWeight) return (err.textContent = 'Boy, kilo ve hedef kilo geçerli sayılar olmalı.');
  const oldWeight = S.profile.weight;
  S.profile = p;
  if (p.weight !== oldWeight) addWeight(p.weight); // kilo değiştiyse geçmişe de yaz
  aiDraft = null;
  save();
  toast('Bilgilerin güncellendi.');
  go('#/profile');
}

/* =========================================================
   Olay yönetimi
   ========================================================= */
let resetArmed = false;

document.addEventListener('click', e => {
  // En içteki tıklanabilir öğe kazanır
  const el = e.target.closest('[data-go],[data-act]');
  if (!el) return;
  if (el.hasAttribute('data-go')) { go(el.getAttribute('data-go')); return; }
  const act = el.getAttribute('data-act');
  const ds = el.dataset;

  switch (act) {
    /* onboarding */
    case 'ob-pick':
      obCollect();
      ob.data[ds.k] = ds.k === 'daysPerWeek' ? parseInt(ds.v, 10) : ds.v;
      rerender();
      break;
    case 'ob-back':
      obCollect(); ob.step--; render();
      break;
    case 'ob-next': {
      obCollect();
      const msg = obValidate();
      if (msg) { document.getElementById('ob-err').textContent = msg; return; }
      if (ob.step < OB_STEPS - 1) { ob.step++; render(); return; }
      S.profile = Object.assign({}, ob.data);
      S.weights = [{ date: today(), kg: S.profile.weight }];
      save();
      aiDraft = null;
      location.hash = '#/ai/onboard';
      render();
      break;
    }

    /* AI programı */
    case 'ai-use': {
      if (!aiDraft.name.trim()) { document.getElementById('ai-err').textContent = 'Lütfen programa bir ad ver.'; return; }
      aiDraft.name = aiDraft.name.trim();
      const p = aiDraft;
      aiDraft = null;
      S.programs.push(p);
      if (ds.mode === 'onboard' || !S.activeProgramId) { setActive(p.id); toast('Programın aktif! Başarılar 💪'); go('#/home'); }
      else { save(); toast('Program kaydedildi. Kullanmak için "Aktif et"i işaretle.'); go('#/programs'); }
      break;
    }

    /* programlar */
    case 'toggle-active':
      if (S.activeProgramId === ds.id) { S.activeProgramId = null; save(); toast('Program pasif edildi.'); }
      else { setActive(ds.id); toast('"' + getProgram(ds.id).name + '" artık aktif.'); }
      rerender();
      break;
    case 'np-off':
      S.drafts.np.days[+ds.d].off = ds.v === '1';
      if (ds.v === '0' && !S.drafts.np.days[+ds.d].exercises.length) S.drafts.np.days[+ds.d].exercises.push(newEx());
      save(); rerender();
      break;
    case 'np-add':
      S.drafts.np.days[+ds.d].exercises.push(newEx());
      save(); rerender();
      break;
    case 'np-del':
      S.drafts.np.days[+ds.d].exercises.splice(+ds.j, 1);
      save(); rerender();
      break;
    case 'np-save':
      saveNewProgram();
      break;
    case 'np-reset':
      S.drafts.np = newDraftProgram(); save(); render();
      break;

    /* antrenman */
    case 'complete':
      completeWorkout(ds.date);
      break;
    case 'pick':
      modalCtx.sel[ds.id] = !modalCtx.sel[ds.id];
      drawModal();
      break;
    case 'pick-all': {
      const sel = modalCtx.exercises.filter(x => x.weight != null);
      const all = sel.every(x => modalCtx.sel[x.exId]);
      sel.forEach(x => { modalCtx.sel[x.exId] = !all; });
      drawModal();
      break;
    }
    case 'save-workout':
      saveWorkout();
      break;
    case 'modal-close':
      closeModal();
      break;
    case 'modal-bg':
      if (e.target === el) closeModal();
      break;

    /* profil */
    case 'weigh-save':
      saveWeighIn();
      break;
    case 'weigh-snooze':
      S.weighSnooze = today(); save(); rerender();
      break;
    case 'ep-save':
      saveProfile();
      break;
    case 'backup-copy': {
      const text = JSON.stringify(S);
      const done = () => toast('Yedek panoya kopyalandı.');
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, () => toast('Kopyalanamadı.'));
      else { const ta = document.getElementById('restore'); ta.value = text; ta.select(); document.execCommand('copy'); done(); }
      break;
    }
    case 'backup-restore': {
      const err = document.getElementById('bk-err');
      try {
        const data = JSON.parse(document.getElementById('restore').value);
        if (!data || !data.profile || !Array.isArray(data.programs) || !Array.isArray(data.logs)) throw new Error();
        S = Object.assign(emptyState(), data);
        save();
        toast('Yedek geri yüklendi.');
        go('#/home');
      } catch (x) { err.textContent = 'Geçersiz yedek metni.'; }
      break;
    }
    case 'reset':
      if (!resetArmed) { resetArmed = true; el.textContent = 'Emin misin? Silmek için tekrar dokun'; setTimeout(() => { resetArmed = false; }, 4000); return; }
      resetArmed = false;
      localStorage.removeItem(STORE_KEY);
      S = emptyState();
      ob.step = 0; ob.data = {};
      location.hash = '';
      render();
      break;
  }
});

// Metin alanları: yazarken taslağa kaydet (sayfayı yeniden çizmeden)
document.addEventListener('input', e => {
  const el = e.target;
  const ds = el.dataset;
  if (ds.w || ds.r) {
    const p = activeProgram();
    const date = location.hash.split('/')[2];
    if (!p || !date) return;
    const k = draftKey(p.id, date);
    const dr = S.drafts[k] || (S.drafts[k] = { w: {}, r: {} });
    if (ds.w) dr.w[ds.w] = el.value;
    else { (dr.r[ds.r] || (dr.r[ds.r] = []))[+ds.i] = el.value; }
    save();
    return;
  }
  const b = ds.bind;
  if (!b) return;
  if (b === 'ai-name') { aiDraft.name = el.value; return; }
  const np = S.drafts.np;
  if (!np) return;
  if (b === 'np-name') np.name = el.value;
  else if (b === 'np-title') np.days[+ds.d].title = el.value;
  else {
    const ex = np.days[+ds.d].exercises[+ds.j];
    if (b === 'np-ex-name') ex.name = el.value;
    else if (b === 'np-ex-sets') ex.sets = el.value;
    else if (b === 'np-ex-reps') ex.reps = el.value;
    else if (b === 'np-ex-w') ex.startWeight = el.value;
  }
  save();
});

// Gün değişince (uygulama arka planda açık kaldıysa) ekranı tazele
let lastDay = today();
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && today() !== lastDay) { lastDay = today(); render(); }
});

window.addEventListener('hashchange', render);
render();

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}

'use strict';
/* CVBuilder Web v2.5.0 - fully client-side port of cv_builder.py.
   No server, no uploads. EN/PL/AR, wizard + tabs, ATS scoring, themed DOC/PDF export. */

const VERSION = '2.5.0';
const $ = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));

/* ------------------------------------------------------------------ data */
function emptyProfile() {
  return {
    name: '', title: '', target_company: '', photo: '',
    contact: { location: '', phone: '', email: '', linkedin: '', portfolio: '' },
    summary: '', skills: [], experience: [], education: [], certifications: [],
    projects: [], languages: [], options: {}
  };
}

const SAMPLE = {
  name: 'Alex Doe', title: 'Senior Software Engineer', target_company: 'CloudScale GmbH', photo: '',
  contact: { location: 'Berlin, Germany', phone: '+49 30 1234 5678',
    email: 'alex.doe@example.com', linkedin: 'linkedin.com/in/alexdoe', portfolio: 'github.com/alexdoe' },
  summary: 'Senior Software Engineer with 7+ years building scalable cloud platforms. Specialized in Python microservices, AWS infrastructure, and CI/CD automation. Led teams of 5 and reduced deployment time by 40% through Kubernetes and Terraform adoption.',
  skills: ['Python', 'Java', 'AWS', 'Docker', 'Kubernetes', 'Terraform', 'Kafka', 'REST APIs',
    'PostgreSQL', 'SQL', 'Linux', 'Git', 'CI/CD', 'Microservices', 'Agile', 'Mentoring'],
  experience: [{
    company: 'CloudScale GmbH', title: 'Senior Software Engineer', location: 'Berlin',
    start: 'Jun 2020', end: 'Present',
    about: 'Own the core services of a cloud logistics platform serving 2M+ daily requests; lead a team of 5 engineers.',
    bullets: ['Reduced deployment time 40% by introducing Kubernetes and Terraform across 12 services.',
      'Designed 8 Python microservices handling 2M+ daily requests with 99.95% uptime.',
      'Mentored 5 engineers and introduced CI/CD standards adopted by 3 teams.']
  }, {
    company: 'DataFlow Ltd', title: 'Software Engineer', location: 'Munich',
    start: 'Aug 2016', end: 'May 2020', about: 'Built data pipelines and REST APIs for analytics customers.',
    bullets: ['Automated ETL pipelines, cutting reporting time from 6 hours to 25 minutes.',
      'Built REST APIs in Python serving 300k requests per day.']
  }],
  education: [{ degree: 'BSc Computer Science', school: 'Technical University of Munich',
    location: 'Munich', start: '2013', end: '2016', details: 'Graduated with distinction.' }],
  certifications: [{ name: 'AWS Certified Solutions Architect', issuer: 'Amazon Web Services', year: '2022' }],
  projects: [{ name: 'Open Source Metrics Dashboard', description: 'Real-time delivery metrics visualisation',
    tech: ['Python', 'React', 'PostgreSQL'] }],
  languages: [{ name: 'English', level: 'Fluent' }, { name: 'German', level: 'B2' }],
  options: {}
};

function clone(o) { return JSON.parse(JSON.stringify(o)); }

const ST = {
  lang: 'en', mode: 'wizard', theme: 'mono',
  profile: emptyProfile(), settings: {},
  wizStep: 0, wizItem: {}, tab: 0,
  cover: true, photo: false, jobText: '',
  report: null, reportText: '', cv: '', letter: ''
};

const SETTINGS_KEY = 'cvbuilder_settings_v2';
const PROFILE_KEY = 'cvbuilder_profile_v2';

function loadLocal() {
  try { ST.settings = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}') || {}; } catch (e) { ST.settings = {}; }
  try {
    const p = JSON.parse(localStorage.getItem(PROFILE_KEY) || 'null');
    if (p && typeof p === 'object') ST.profile = Object.assign(emptyProfile(), p);
  } catch (e) { /* ignore corrupt data */ }
  if (['en', 'pl', 'ar'].includes(ST.settings.language)) ST.lang = ST.settings.language;
  if (ST.settings.mode === 'wizard' || ST.settings.mode === 'tabs') ST.mode = ST.settings.mode;
  if (['mono', 'green', 'rose'].includes(ST.settings.theme)) ST.theme = ST.settings.theme;
  if (typeof ST.settings.dont_ask === 'boolean') ST.settings.dont_ask = ST.settings.dont_ask;
}

function saveLocal() {
  ST.settings.language = ST.lang;
  ST.settings.mode = ST.mode;
  ST.settings.theme = ST.theme;
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(ST.settings)); } catch (e) { /* quota */ }
  try { localStorage.setItem(PROFILE_KEY, JSON.stringify(ST.profile)); } catch (e) { /* quota */ }
}

/* --------------------------------------------------------------- helpers */
function T(key, vars) { return tr(key, ST.lang, vars); }
function isRTL() { return ST.lang === 'ar'; }
function esc(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function mk(tag, attrs, kids) {
  const n = document.createElement(tag);
  if (attrs) for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') n.className = v;
    else if (k === 'text') n.textContent = v;
    else if (k === 'html') n.innerHTML = v;
    else if (k === 'value') n.value = v;
    else if (k === 'disabled') n.disabled = !!v;
    else if (k.startsWith('on') && typeof v === 'function') n.addEventListener(k.slice(2).toLowerCase(), v);
    else n.setAttribute(k, v === true ? '' : v);
  }
  for (const c of (kids || [])) {
    if (c == null || c === false) continue;
    n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
  }
  return n;
}
function replaceChildren(node, children) { node.replaceChildren(...children.filter(Boolean)); }
function normalize(s) {
  return String(s || '').replace(/\u2013/g, '-').replace(/\u2014/g, '-').replace(/\u2019/g, "'")
    .replace(/\s+/g, ' ').trim();
}
function normKey(s) {
  return String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9+#./ -]+/g, ' ').replace(/\s+/g, ' ').trim();
}
function slugify(s) {
  return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'CV';
}
function splitLines(v) {
  return String(v || '').split('\n').map((x) => x.trim()).filter(Boolean);
}

/* ------------------------------------------------- DOCX import (zip + XML) */
/* A .docx is a ZIP archive. These two small routines read word/document.xml
   directly in the browser: no library, no CDN, no upload, no build step.
   inflateRaw is a compact raw-DEFLATE decoder (stored / fixed / dynamic blocks). */
function inflateRaw(data) {
  const LBASE = [3,4,5,6,7,8,9,10,11,13,15,17,19,23,27,31,35,43,51,59,67,83,99,115,131,163,195,227,258];
  const LEXT = [0,0,0,0,0,0,0,0,1,1,1,1,2,2,2,2,3,3,3,3,4,4,4,4,5,5,5,5,0];
  const DBASE = [1,2,3,4,5,7,9,13,17,25,33,49,65,97,129,193,257,385,513,769,
    1025,1537,2049,3073,4097,6145,8193,12289,16385,24577];
  const DEXT = [0,0,0,0,1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,11,11,12,12,13,13];
  let pos = 0, bitBuf = 0, bitCnt = 0;

  function bits(n) {
    if (!n) return 0;
    while (bitCnt < n) {
      if (pos >= data.length) throw new Error('Truncated DOCX data');
      bitBuf |= data[pos++] << bitCnt;
      bitCnt += 8;
    }
    const v = bitBuf & ((1 << n) - 1);
    bitBuf >>>= n;
    bitCnt -= n;
    return v;
  }
  function tree(lengths) {
    let max = 0;
    for (const l of lengths) if (l > max) max = l;
    const counts = new Array(max + 1).fill(0);
    for (const l of lengths) if (l) counts[l]++;
    let code = 0;
    const next = new Array(max + 1).fill(0);
    for (let l = 1; l <= max; l++) { code = (code + counts[l - 1]) << 1; next[l] = code; }
    const map = new Map();
    for (let i = 0; i < lengths.length; i++) {
      const l = lengths[i];
      if (!l) continue;
      map.set(l * 65536 + next[l], i);
      next[l]++;
    }
    return { map, max };
  }
  function symbol(t) {
    let code = 0;
    for (let l = 1; l <= t.max; l++) {
      code = (code << 1) | bits(1);
      const s = t.map.get(l * 65536 + code);
      if (s !== undefined) return s;
    }
    throw new Error('Invalid DOCX data');
  }

  const out = [];
  for (;;) {
    const last = bits(1), type = bits(2);
    if (type === 0) {
      bitBuf = 0; bitCnt = 0;
      const len = data[pos] | (data[pos + 1] << 8);
      const nlen = data[pos + 2] | (data[pos + 3] << 8);
      if ((len ^ 0xffff) !== nlen || pos + 4 + len > data.length)
        throw new Error('Corrupt DOCX block');
      pos += 4;
      for (let i = 0; i < len; i++) out.push(data[pos++]);
    } else if (type === 1 || type === 2) {
      let litLen, distLen;
      if (type === 1) {
        litLen = new Array(288);
        for (let i = 0; i < 144; i++) litLen[i] = 8;
        for (let i = 144; i < 256; i++) litLen[i] = 9;
        for (let i = 256; i < 280; i++) litLen[i] = 7;
        for (let i = 280; i < 288; i++) litLen[i] = 8;
        distLen = new Array(30).fill(5);
      } else {
        const hlit = bits(5) + 257, hdist = bits(5) + 1, hclen = bits(4) + 4;
        const order = [16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15];
        const cl = new Array(19).fill(0);
        for (let i = 0; i < hclen; i++) cl[order[i]] = bits(3);
        const clTree = tree(cl);
        const lens = new Array(hlit + hdist).fill(0);
        let i = 0;
        while (i < lens.length) {
          const s = symbol(clTree);
          if (s < 16) lens[i++] = s;
          else if (s === 16) {
            const prev = lens[i - 1], n = 3 + bits(2);
            for (let j = 0; j < n; j++) lens[i++] = prev;
          } else if (s === 17) {
            const n = 3 + bits(3);
            for (let j = 0; j < n; j++) lens[i++] = 0;
          } else {
            const n = 11 + bits(7);
            for (let j = 0; j < n; j++) lens[i++] = 0;
          }
        }
        litLen = lens.slice(0, hlit);
        distLen = lens.slice(hlit);
      }
      const lt = tree(litLen), dt = tree(distLen);
      for (;;) {
        const s = symbol(lt);
        if (s < 256) out.push(s);
        else if (s === 256) break;
        else {
          const li = s - 257;
          if (li < 0 || li >= LBASE.length) throw new Error('Invalid DOCX length');
          const len = LBASE[li] + bits(LEXT[li]);
          const ds = symbol(dt);
          if (ds >= DBASE.length) throw new Error('Invalid DOCX distance');
          const dist = DBASE[ds] + bits(DEXT[ds]);
          if (dist > out.length) throw new Error('Invalid DOCX back-reference');
          for (let j = 0; j < len; j++) out.push(out[out.length - dist]);
        }
      }
    } else throw new Error('Unsupported DOCX compression');
    if (last) break;
  }
  return new Uint8Array(out);
}

function zipMember(bytes, name) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let eocd = -1;
  const floor = Math.max(0, bytes.length - 65558);
  for (let i = bytes.length - 22; i >= floor; i--) {
    if (view.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error('Not a valid DOCX (ZIP) file');
  const count = view.getUint16(eocd + 10, true);
  let off = view.getUint32(eocd + 16, true);
  const dec = new TextDecoder('utf-8');
  for (let i = 0; i < count; i++) {
    if (off + 46 > bytes.length || view.getUint32(off, true) !== 0x02014b50)
      throw new Error('Corrupt DOCX index');
    const method = view.getUint16(off + 10, true);
    const csize = view.getUint32(off + 20, true);
    const nlen = view.getUint16(off + 28, true);
    const elen = view.getUint16(off + 30, true);
    const clen = view.getUint16(off + 32, true);
    const local = view.getUint32(off + 42, true);
    const fname = dec.decode(bytes.subarray(off + 46, off + 46 + nlen));
    if (fname === name) {
      if (local + 30 > bytes.length || view.getUint32(local, true) !== 0x04034b50)
        throw new Error('Corrupt DOCX entry');
      const ln = view.getUint16(local + 26, true), le = view.getUint16(local + 28, true);
      const start = local + 30 + ln + le;
      const raw = bytes.subarray(start, start + csize);
      if (method === 0) return raw;
      if (method === 8) return inflateRaw(raw);
      throw new Error('Unsupported DOCX compression: ' + method);
    }
    off += 46 + nlen + elen + clen;
  }
  throw new Error('DOCX is missing ' + name);
}

function docxLines(buffer) {
  const xmlBytes = zipMember(new Uint8Array(buffer), 'word/document.xml');
  const xml = new TextDecoder('utf-8').decode(xmlBytes);
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  if (!doc || doc.getElementsByTagName('parsererror').length)
    throw new Error('Invalid document XML');
  const out = [];
  for (const p of Array.from(doc.getElementsByTagNameNS('*', 'p'))) {
    let s = '';
    for (const t of Array.from(p.getElementsByTagNameNS('*', 't'))) s += t.textContent || '';
    s = s.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
    if (!s) continue;
    let style = '';
    const st = p.getElementsByTagNameNS('*', 'pStyle')[0];
    if (st) style = st.getAttributeNS('*', 'val') || '';
    const numbered = p.getElementsByTagNameNS('*', 'numPr').length > 0;
    if ((numbered || /list/i.test(style)) && !/^[-•*·▪]\s+/.test(s)) s = '- ' + s;
    out.push(s);
  }
  return out;
}

const IMPORT_MONTH = {
  jan:'Jan', feb:'Feb', mar:'Mar', apr:'Apr', may:'May', jun:'Jun', jul:'Jul', aug:'Aug',
  sep:'Sep', sept:'Sep', oct:'Oct', nov:'Nov', dec:'Dec',
  sty:'Jan', lut:'Feb', kwi:'Apr', maj:'May', cze:'Jun', lip:'Jul', sie:'Aug',
  wrz:'Sep', paz:'Oct', 'paź':'Oct', lis:'Nov', gru:'Dec'
};
const IMPORT_MONTH_RE = '(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec|'
  + 'Sty|Lut|Mar|Kwi|Maj|Cze|Lip|Sie|Wrz|Paz|Paź|Lis|Gru)[a-z]*\\.?';
const IMPORT_TITLE_RE = /\b(engineer|developer|architect|designer|manager|consultant|analyst|director|lead|specialist|officer|assistant|technician|scientist|administrator|supervisor|coordinator|intern|trainee|professor|teacher|nurse|accountant|bim|cad|software|project|senior|junior|inżynier|architekt|menedżer|specjalista|kierownik)\b/i;
const IMPORT_SCHOOL_RE = /\b(university|college|school|institute|technikum|uczelnia|uniwersytet|wyższa)\b/i;
const IMPORT_DEGREE_RE = /\b(bachelor|master|phd|doctor|diploma|bsc|msc|mba|degree|licencjat|magister|inżynier|doktor)\b/i;
const IMPORT_LOC_RE = /([A-Za-zÀ-ÿ][\w.'À-ÿ-]*(?: [A-Za-zÀ-ÿ][\w.'À-ÿ-]*){0,3},\s*[A-Za-zÀ-ÿ][\w.'À-ÿ-]*(?: [A-Za-zÀ-ÿ][\w.'À-ÿ-]*){0,2})/;
const IMPORT_YEAR_RE = /(?:19|20)\d{2}/g;
const IMPORT_URL_RE = /(?:https?:\/\/|www\.|linkedin\.com|github\.com|@)/i;

function parseDateSpans(s) {
  const re = new RegExp('\\b(?:(?<mon>' + IMPORT_MONTH_RE + ')\\s+(?<yr>\\d{4})'
    + '|(?<yr2>(?:19|20)\\d{2})|(?<now>Present|Current|Ongoing|Today|Now|Obecnie|Teraz))\\b', 'gi');
  const spans = [], tokens = [];
  let m;
  while ((m = re.exec(s))) {
    const mon = m.groups.mon ? IMPORT_MONTH[String(m.groups.mon).slice(0, 3).toLowerCase()] : '';
    tokens.push(mon ? mon + ' ' + m.groups.yr : (m.groups.yr2 || 'Present'));
    spans.push([m.index, m.index + m[0].length]);
  }
  let start = '', end = '';
  if (tokens.length >= 2) {
    start = tokens[0] === 'Present' ? '' : tokens[0];
    end = tokens[tokens.length - 1];
  } else if (tokens.length === 1) {
    if (tokens[0] === 'Present') end = 'Present'; else start = tokens[0];
  }
  let clean = '', at = 0;
  for (const [a, b] of spans) { clean += s.slice(at, a); at = b; }
  clean += s.slice(at);
  clean = clean.replace(/\s+[-–—]\s+|\s{2,}/g, ' ')
    .replace(/^[\s,|–—-]+|[\s,|–—-]+$/g, '').trim();
  return { start, end, clean };
}

function importHeadingKey(line) {
  const s = normalize(line).replace(/:$/, '').trim();
  if (!s || s.length > 40) return null;
  const low = s.toLowerCase();
  if (KNOWN[low]) return KNOWN[low];
  if (s === s.toUpperCase() && low.split(/\s+/).length <= 5) {
    for (const [phrase, key] of Object.entries(KNOWN)) {
      if (phrase.split(/\s+/).every((w) => low.includes(w))) return key;
    }
  }
  return null;
}

function importSplitParts(s) {
  let parts;
  if (s.includes('|')) parts = s.split(/\s*\|\s*/);
  else if (/\s+[-–—]\s+/.test(s)) parts = s.split(/\s+[-–—]\s+/);
  else if ((s.match(/,/g) || []).length <= 3) parts = s.split(/\s*,\s*/);
  else parts = [s];
  return parts.map((x) => x.trim()).filter(Boolean);
}

function importParseHeader(lines) {
  const out = { name: '', title: '', contact: { location: '', phone: '', email: '', linkedin: '', portfolio: '' } };
  const text = lines.join('\n');
  const email = text.match(/[\w.+-]+@[\w-]+\.[\w.-]+/);
  if (email) out.contact.email = email[0];
  const li = text.match(/(?:https?:\/\/)?(?:www\.)?linkedin\.com\/[^\s|]+/i);
  if (li) out.contact.linkedin = li[0].replace(/[.,;]+$/, '');
  const ph = text.match(/(?:\+?\d[\d ().-]{6,}\d)/);
  if (ph && ph[0].replace(/\D/g, '').length >= 7) out.contact.phone = ph[0].trim();
  const loc = text.match(IMPORT_LOC_RE);
  if (loc) out.contact.location = loc[1].trim();
  const web = text.match(/(?:https?:\/\/)?(?:www\.)?(?:github\.com|gitlab\.com|[^\s]+\.(?:io|dev|me|net|org))\/[^\s|]+/i);
  if (web && !/linkedin/i.test(web[0])) out.contact.portfolio = web[0].replace(/[.,;]+$/, '');
  let cleaned = text;
  for (const token of [email && email[0], li && li[0], ph && ph[0], loc && loc[1], web && web[0]])
    if (token) cleaned = cleaned.split(token).join(' ');
  const parts = [];
  for (const line of cleaned.split('\n')) {
    for (const bit of line.split(/\s*[|•·]\s*/)) {
      const v = bit.replace(/^[\s,–—-]+|[\s,–—-]+$/g, '').trim();
      if (v && !/^(curriculum vitae|cv)$/i.test(v) && !IMPORT_URL_RE.test(v)) parts.push(v);
    }
  }
  if (parts.length) {
    out.name = parts[0];
    const rest = parts.slice(1);
    if (rest.length) out.title = rest.find((p) => IMPORT_TITLE_RE.test(p)) || rest[0];
  }
  return out;
}

function importExpHeader(line) {
  const d = parseDateSpans(line);
  let parts = importSplitParts(d.clean);
  let location = '';
  parts = parts.map((p) => {
    const m = p.match(IMPORT_LOC_RE);
    if (!m) return p;
    location = m[1].trim();
    return p.replace(m[1], ' ').replace(/^[\s,|–—-]+|[\s,|–—-]+$/g, '').trim();
  }).filter(Boolean);
  let title = '', company = '';
  if (parts.length >= 3) {
    title = parts[0]; company = parts[1];
    if (!location && parts[2].length < 40) location = parts[2];
  } else if (parts.length === 2) {
    if (IMPORT_TITLE_RE.test(parts[0])) { title = parts[0]; company = parts[1]; }
    else if (IMPORT_TITLE_RE.test(parts[1])) { title = parts[1]; company = parts[0]; }
    else { title = parts[0]; company = parts[1]; }
  } else if (parts.length === 1) {
    if (IMPORT_TITLE_RE.test(parts[0]) || parts[0].split(/\s+/).length <= 5) title = parts[0];
    else company = parts[0];
  }
  return { title, company, location, start: d.start, end: d.end, about: '', bullets: [] };
}

function parseDocxProfile(lines) {
  const sections = { header: [] };
  let cur = 'header';
  for (const line of lines) {
    const key = importHeadingKey(line);
    if (key) { cur = key; if (!sections[key]) sections[key] = []; continue; }
    if (!sections[cur]) sections[cur] = [];
    sections[cur].push(line);
  }
  const p = emptyProfile();
  const head = importParseHeader(sections.header || []);
  p.name = head.name; p.title = head.title; p.contact = head.contact;

  p.summary = (sections.summary || []).join('\n').trim();

  const seenSkills = new Set();
  for (const line of (sections.skills || [])) {
    for (const bit of line.split(/[,;|•·]|\s{2,}|\s+-\s+/)) {
      const s = bit.replace(/^[\s–—-]+|[\s–—-]+$/g, '').trim();
      if (s.length < 2 || s.length > 60 || seenSkills.has(s.toLowerCase())) continue;
      seenSkills.add(s.toLowerCase());
      p.skills.push(s);
    }
  }

  let exp = null, sawBullet = false;
  for (const raw of (sections.experience || [])) {
    let s = String(raw).trim();
    const bullet = /^[-•*·▪]\s+/.test(s);
    if (bullet) s = s.replace(/^[-•*·▪]\s+/, '').trim();
    if (!s) continue;
    if (bullet) {
      if (!exp) { exp = importExpHeader(''); p.experience.push(exp); }
      exp.bullets.push(s); sawBullet = true; continue;
    }
    const d = parseDateSpans(s);
    const hasDate = !!(d.start || d.end);
    const sentence = s.length > 55 || /[.!?]$/.test(s);
    if (!exp || hasDate || (sawBullet && !sentence)) {
      exp = importExpHeader(s); p.experience.push(exp); sawBullet = false;
    } else exp.about = (exp.about ? exp.about + ' ' : '') + s;
  }

  let edu = null;
  for (const raw of (sections.education || [])) {
    let s = String(raw).trim();
    const bullet = /^[-•*·▪]\s+/.test(s);
    if (bullet) s = s.replace(/^[-•*·▪]\s+/, '').trim();
    if (!s) continue;
    const d = parseDateSpans(s);
    const parts = importSplitParts(d.clean);
    const isDetail = !!edu && (bullet || (!d.start && !d.end && parts.length === 1));
    if (!edu || d.start || d.end || (!isDetail && edu.degree && edu.school)) {
      edu = { degree: '', school: '', location: '', start: d.start, end: d.end, details: '' };
      p.education.push(edu);
    }
    if (isDetail) {
      edu.details = (edu.details ? edu.details + ' ' : '') + s;
    } else if (parts.length >= 2) {
      if (!edu.degree) edu.degree = parts[0];
      if (!edu.school) edu.school = parts[1];
      if (parts[2] && parts[2].length < 40) edu.location = parts[2];
    } else if (parts.length === 1) {
      if (!edu.degree && (IMPORT_DEGREE_RE.test(parts[0]) || !IMPORT_SCHOOL_RE.test(parts[0]))) edu.degree = parts[0];
      else if (!edu.school) edu.school = parts[0];
      else edu.details = (edu.details ? edu.details + ' ' : '') + s;
    }
  }

  for (const raw of (sections.certifications || [])) {
    let s = String(raw).replace(/^[-•*·▪]\s+/, '').trim();
    if (!s) continue;
    const years = s.match(IMPORT_YEAR_RE) || [];
    const year = years.length ? years[years.length - 1] : '';
    s = s.replace(new RegExp(IMPORT_YEAR_RE.source, 'g'), ' ').trim();
    let bits;
    if (s.includes('|')) bits = s.split(/\s*\|\s*/);
    else if (/\s+[-–—]\s+/.test(s)) bits = s.split(/\s+[-–—]\s+/);
    else bits = [s];
    bits = bits.map((b) => b.replace(/\s{2,}/g, ' ').replace(/^[\s,|]+|[\s,|]+$/g, '').trim())
      .filter(Boolean);
    p.certifications.push({ name: bits[0] || '', issuer: bits[1] || '', year });
  }

  for (const raw of (sections.projects || [])) {
    let s = String(raw).replace(/^[-•*·▪]\s+/, '').trim();
    if (!s) continue;
    let tech = [];
    const tm = s.match(/(?:Tech|Technologies|Stack)\s*:\s*(.+)$/i) || s.match(/\(([^)]+)\)\s*$/);
    if (tm) { tech = splitComma(tm[1]); s = s.slice(0, tm.index).trim(); }
    const bits = s.includes('|') ? s.split(/\s*\|\s*/) : s.split(/\s+[-–—]\s+/);
    const item = {
      name: bits[0] ? bits[0].trim() : '',
      description: bits.slice(1).map((b) => b.trim()).filter(Boolean).join(' - '),
      tech
    };
    if (item.name) p.projects.push(item);
  }

  for (const raw of (sections.languages || [])) {
    const s = String(raw).replace(/^[-•*·▪]\s+/, '').trim();
    if (!s) continue;
    let name = s, level = '';
    const paren = s.match(/^(.+?)\s*\(([^)]+)\)\s*$/);
    if (paren) { name = paren[1]; level = paren[2]; }
    else {
      const i = s.search(/[:\-–—,]/);
      if (i > 0) { name = s.slice(0, i); level = s.slice(i + 1); }
    }
    name = name.trim();
    level = level.replace(/^[-\s:–—,]+|[\s()]+$/g, '').trim();
    if (name) p.languages.push({ name, level });
  }
  return p;
}

/* -------------------------------------------------------------- constants */
const STOPWORDS = new Set(`a an the and or but if then than that this these those with without within for from into onto
to of in on at by as is are was were be been being am do does did doing done have has had having will would shall
should can could may might must not no nor so such very more most much many few any all each other some own same
too also about above after again against before below between both during further here how just only over under
until up down out off when where why who whom whose which what you your yours we our ours they their them he him
his she her hers it its i me my mine us via across per etc eg ie vs please join us you'll we're looking new
strong experience requirements responsibilities requirements: qualifications preferred nice have good great
excellent ability skills knowledge work working years year role position job company team teams candidate
candidates applicant applicants must plus`.split(/\s+/));

const ACTION_VERBS = new Set(`led managed designed built developed created delivered improved reduced increased optimized
automated implemented launched owned drove migrated architected streamlined coordinated mentored established achieved
spearheaded resolved scaled standardized negotiated analyzed configured deployed integrated maintained supported trained
collaborated partnered`.split(/\s+/));

const KNOWN = {
  'professional summary': 'summary', 'summary': 'summary', 'summary of qualifications': 'summary',
  'profile': 'summary', 'professional profile': 'summary', 'career summary': 'summary',
  'objective': 'summary', 'career objective': 'summary', 'about me': 'summary', 'overview': 'summary',
  'work experience': 'experience', 'professional experience': 'experience', 'experience': 'experience',
  'employment history': 'experience', 'work history': 'experience', 'career history': 'experience',
  'relevant experience': 'experience', 'employment': 'experience',
  'education': 'education', 'academic background': 'education', 'education and training': 'education',
  'academic qualifications': 'education', 'education & training': 'education',
  'skills': 'skills', 'technical skills': 'skills', 'core skills': 'skills', 'key skills': 'skills',
  'core competencies': 'skills', 'competencies': 'skills', 'areas of expertise': 'skills',
  'skills & tools': 'skills', 'technical proficiencies': 'skills', 'technologies': 'skills',
  'certifications': 'certifications', 'certificates': 'certifications',
  'licenses & certifications': 'certifications', 'certifications & licenses': 'certifications',
  'licenses': 'certifications', 'projects': 'projects', 'key projects': 'projects',
  'selected projects': 'projects', 'languages': 'languages', 'spoken languages': 'languages',
  'awards': 'awards', 'achievements': 'awards', 'honors & awards': 'awards', 'awards & honors': 'awards',
  'publications': 'publications', 'volunteer experience': 'volunteer', 'volunteering': 'volunteer',
  'interests': 'interests', 'hobbies': 'interests', 'references': 'references'
};
// Localized headings from the same translation tables, like cv_builder.py lines 633-647.
for (const src of ['Professional Summary', 'Summary', 'Work Experience', 'Experience', 'Education',
  'Skills', 'Certifications', 'Projects', 'Languages']) {
  const target = KNOWN[src.toLowerCase()];
  for (const key of [src, src.toUpperCase()]) {
    const e = I18N[key];
    if (!target || !e) continue;
    for (const lg of ['pl', 'ar']) {
      const loc = e[lg];
      if (!loc) continue;
      const k = String(loc).toLowerCase().replace(/:$/, '').trim();
      if (k) KNOWN[k] = target;
    }
  }
}
const CORE_SECTIONS = ['summary', 'experience', 'education', 'skills'];
const SEVERITY_WEIGHT = { critical: 15, warn: 6, info: 2 };
const KEYWORD_MAX_PENALTY = 15;
const MONTHS = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12 };
const MONTH_RE = '(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\\.?';
const dateRe = () => new RegExp(`(?:(?<mon>${MONTH_RE})\\s+(?<yr1>\\d{4})|(?<yr2>(?:19|20)\\d{2})|(?<now>Present|Current|Ongoing|Today|Now))`, 'gi');
const BULLET_RE = /^\s*[\u2022\-\u25cf*]\s+\S/;
const SKILL_HINTS = `python java javascript typescript c++ c# sql nosql postgresql mysql mongodb aws azure gcp docker
kubernetes terraform ansible jenkins gitlab github ci/cd rest graphql grpc kafka rabbitmq microservices api agile scrum
kanban jira linux bash powershell react angular vue node.js django flask fastapi spring .net html css git devops sre
machine learning deep learning nlp tensorflow pytorch pandas spark hadoop etl data analysis data science tableau
power bi excel sap erp crm salesforce autocad revit bim solidworks project management pmp prince2 six sigma lean
budget forecasting kpi okr stakeholder management communication leadership mentoring negotiation presentation
problem solving time management customer service sales marketing seo content accounting finance recruitment onboarding
payroll supply chain logistics qa testing automation cybersecurity network vmware sharepoint office 365 word
powerpoint outlook english german french spanish arabic bachelors`.split(/\s+/).map((s) => s.trim()).filter(Boolean);
// Restore multi-word hints (join was split on whitespace above).
SKILL_HINTS.push('ci/cd', 'node.js', 'machine learning', 'deep learning', 'data analysis', 'data science',
  'power bi', 'project management', 'stakeholder management', 'problem solving', 'time management',
  'customer service', 'supply chain', 'office 365');

const THEMES = {
  mono: { accent: '#111111', head: '#111111', rule: '#999999', brand: '#111111' },
  green: { accent: '#2f6b3a', head: '#234f2b', rule: '#8fbf95', brand: '#2f6b3a' },
  rose: { accent: '#a34f5b', head: '#7d3843', rule: '#d6a8ae', brand: '#a34f5b' }
};

/* --------------------------------------------------------- keyword helpers */
function keywordHit(keyword, hay) {
  const nk = normKey(keyword);
  if (!nk) return false;
  const pad = ' ' + hay + ' ';
  const edge = (c) => /[a-z0-9+#/]/.test(c || ' ');
  const has = (term) => {
    let i = pad.indexOf(term);
    while (i !== -1) {
      if (!edge(pad[i - 1]) && !edge(pad[i + term.length])) return true;
      i = pad.indexOf(term, i + 1);
    }
    return false;
  };
  if (has(nk)) return true;
  const stem = nk.endsWith('s') && nk.length > 3 ? nk.slice(0, -1) : nk;
  return stem !== nk && has(stem);
}
function countOccurrences(text, term) {
  let n = 0, i = text.indexOf(term);
  while (i !== -1) { n++; i = text.indexOf(term, i + term.length); }
  return n;
}
function extractKeywords(jobText, top) {
  top = top || 40;
  if (top <= 0) return [];
  const low = normKey(jobText);
  const words = (low.match(/[a-z][a-z0-9+#./-]{1,}/g) || [])
    .map((w) => w.replace(/^[.,;:-]+|[.,;:-]+$/g, ''))
    .filter((w) => w.length > 2 && !STOPWORDS.has(w) && !/^\d+$/.test(w));
  const freq = new Map();
  for (const w of words) freq.set(w, (freq.get(w) || 0) + 1);

  const found = [];
  for (const skill of SKILL_HINTS) {
    if (keywordHit(skill, low)) {
      const nsk = normKey(skill);
      found.push([skill, Math.max(1, countOccurrences(low, nsk))]);
    }
  }
  const bigrams = new Map();
  const dashSplit = String(jobText || '').replace(/\s+[\u2013\u2014]\s+/g, '\n');
  for (const sentence of dashSplit.split(/[.\n;:!?]/)) {
    const seg = normKey(sentence);
    const sw = (seg.match(/[a-z][a-z0-9+#./-]{1,}/g) || [])
      .map((w) => w.replace(/^[.,;:-]+|[.,;:-]+$/g, ''))
      .filter((w) => w.length > 2 && !STOPWORDS.has(w) && !/^\d+$/.test(w));
    for (let i = 0; i < sw.length - 1; i++) {
      const bg = sw[i] + ' ' + sw[i + 1];
      bigrams.set(bg, (bigrams.get(bg) || 0) + 1);
    }
  }
  const result = found.map(([w, c]) => [w, c, 'skill']);
  for (const [w, c] of freq) if (c >= 1 && w.length > 3) result.push([w, c, 'term']);
  for (const [b, c] of bigrams) if (c >= 2) result.push([b, c, 'term']);
  result.sort((a, b) => (a[2] === 'skill' ? 0 : 1) - (b[2] === 'skill' ? 0 : 1) || b[1] - a[1] || a[0].localeCompare(b[0]));
  const seen = new Set(), out = [];
  for (const [kw, c, kind] of result) {
    const nk = normKey(kw);
    const singular = nk.endsWith('s') && nk.length > 3 ? nk.slice(0, -1) : nk;
    if (seen.has(nk) || seen.has(singular)) continue;
    seen.add(nk); seen.add(singular);
    out.push([kw, c, kind]);
    if (out.length >= top) break;
  }
  return out;
}
function profileHaystack(p) {
  const parts = [p.name, p.title, p.summary, (p.skills || []).join(' ')];
  for (const e of p.experience || []) parts.push(e.company, e.title, e.about, ...(e.bullets || []));
  for (const e of p.education || []) parts.push(e.degree, e.school, e.details);
  for (const e of p.certifications || []) parts.push(e.name, e.issuer);
  for (const e of p.projects || []) {
    parts.push(e.name, String(e.description || ''));
    if (Array.isArray(e.tech)) parts.push(e.tech.join(' ')); else if (e.tech) parts.push(e.tech);
  }
  for (const e of p.languages || []) parts.push(e.name, e.level);
  return normKey(parts.filter(Boolean).join(' '));
}
function keywordCoverage(p, keywords) {
  const hay = profileHaystack(p), matched = [], missing = [];
  for (const [kw, freq] of keywords) (keywordHit(kw, hay) ? matched : missing).push(keywordHit(kw, hay) ? kw : [kw, freq]);
  return [matched, missing];
}
function yearsOfExperience(exps) {
  const years = new Set();
  for (const e of exps || []) {
    const re = dateRe(); let m;
    while ((m = re.exec(`${e.start || ''} ${e.end || ''}`))) {
      if (m.groups.yr1) years.add(parseInt(m.groups.yr1, 10));
      else if (m.groups.yr2) years.add(parseInt(m.groups.yr2, 10));
    }
  }
  if (!years.size) return null;
  const now = new Date().getFullYear();
  const present = (exps || []).some((e) => /present|current/i.test(`${e.start || ''} ${e.end || ''}`));
  const hi = Math.max(...years, present ? now : Math.max(...years));
  return Math.max(0, hi - Math.min(...years));
}
function autoSummary(p) {
  const title = p.title || 'professional';
  const yrs = yearsOfExperience(p.experience);
  const yrsTxt = yrs && yrs >= 1 ? `${yrs}+ years of` : '';
  const skills = (p.skills || []).slice(0, 5).join(', ');
  const top = (p.experience || [])[0];
  const last = top ? `Most recently ${top.title || ''} at ${top.company || ''}. ` : '';
  return `Result-driven ${title} with ${yrsTxt} experience`.replace(/\s+/g, ' ').trim()
    + (skills ? ` in ${skills}` : '') + '. ' + last
    + 'Proven record of delivering measurable business impact and collaborating across teams.';
}

/* ------------------------------------------------------- text builders */
function cvText(p) {
  const c = p.contact || {}, L = [];
  L.push(p.name || '', p.title || '',
    [c.location, c.phone, c.email, c.linkedin, c.portfolio].filter(Boolean).join(' | '), '');
  const summary = p.summary || autoSummary(p);
  L.push(T('PROFESSIONAL SUMMARY'), summary, '');
  if ((p.skills || []).length) L.push(T('SKILLS'), p.skills.join(', '), '');
  if ((p.experience || []).length) {
    L.push(T('WORK EXPERIENCE'));
    for (const e of p.experience) {
      const bits = [e.title, e.company, e.location].filter(Boolean);
      L.push(bits.join(' | ') + ` (${e.start || ''} - ${e.end || ''})`);
      if (e.about) L.push(e.about);
      for (const b of e.bullets || []) L.push('- ' + b);
      L.push('');
    }
  }
  if ((p.education || []).length) {
    L.push(T('EDUCATION'));
    for (const e of p.education) {
      const bits = [e.degree, e.school, e.location].filter(Boolean);
      let line = bits.join(' | ');
      const dates = `${e.start || ''} - ${e.end || ''}`.replace(/^\s*-\s*|\s*-\s*$/g, '').trim();
      if (dates) line += ` (${dates})`;
      L.push(line);
      if (e.details) L.push(e.details);
      L.push('');
    }
  }
  if ((p.certifications || []).length) {
    L.push(T('CERTIFICATIONS'));
    for (const cert of p.certifications) {
      let line = cert.name || '';
      const extra = [cert.issuer, cert.year ? String(cert.year) : ''].filter(Boolean);
      if (extra.length) line += ' - ' + extra.join(', ');
      L.push('- ' + line);
    }
    L.push('');
  }
  if ((p.projects || []).length) {
    L.push(T('PROJECTS'));
    for (const pr of p.projects) {
      let line = pr.name || '';
      if (pr.description) line += ' - ' + pr.description;
      if ((pr.tech || []).length) line += ` (Tech: ${pr.tech.join(', ')})`;
      L.push('- ' + line);
    }
    L.push('');
  }
  if ((p.languages || []).length) {
    L.push(T('LANGUAGES'),
      p.languages.map((l) => l.level ? `${l.name || ''} (${l.level})` : (l.name || '')).join(', '), '');
  }
  return L.join('\n').replace(/\u2022/g, '-').replace(/\u2013/g, '-')
    .replace(/\u2014/g, '-').replace(/\u2019/g, "'");
}

function coverLetter(p, jobText) {
  const c = p.contact || {}, exp = (p.experience || [])[0] || {};
  const summary = normalize(p.summary || autoSummary(p));
  const date = new Date().toLocaleDateString(ST.lang === 'pl' ? 'pl-PL' : ST.lang === 'ar' ? 'ar' : 'en-GB',
    { day: '2-digit', month: 'long', year: 'numeric' });
  const L = [date, '', T('Hiring Manager'), p.target_company || T('Hiring Team'), '',
    T('Dear Hiring Manager,'), ''];
  const role = p.title ? `${T('the')} ${p.title} ${T('position')}` : T('this position');
  const at = p.target_company ? ` ${T('at')} ${p.target_company}` : '';
  L.push(`${T('I am writing to apply for')} ${role}${at}. ${summary}`, '');
  if (exp.title || exp.company || exp.about) {
    const roleHere = exp.title || p.title;
    const atHere = exp.company ? ` ${T('at')} ${exp.company}` : '';
    const parts = [`${T('My most recent role is')} ${roleHere}${atHere}.`];
    if (exp.about) parts.push(normalize(exp.about));
    const hi = (exp.bullets || []).filter(Boolean).slice(0, 2).map((b) => normalize(b).replace(/\.$/, ''));
    if (hi.length) parts.push(T('Highlights include: ') + hi.join('; ') + '.');
    L.push(parts.join(' '), '');
  }
  if (jobText && jobText.trim()) {
    const kws = extractKeywords(jobText, 15);
    const [hits] = keywordCoverage(p, kws);
    const single = hits.filter((h) => !String(h).includes(' '));
    const chosen = (single.length ? single : hits).slice(0, 6);
    if (chosen.length) {
      L.push(T('Your posting emphasizes ') + chosen.join(', ') +
        T('. This is an area where my background applies directly, and I would welcome the chance to '
          + 'discuss how I can contribute from day one.'), '');
    }
  }
  L.push(T("I would appreciate the opportunity to discuss how my experience can support your team's goals. "
    + 'Thank you for your time and consideration.'), '', T('Sincerely,'), p.name || '');
  const contactLine = [c.phone, c.email, c.linkedin].filter(Boolean).join(' | ');
  if (contactLine) L.push(contactLine);
  return L.join('\n');
}

/* ---------------------------------------------------------- ATS checking */
function finding(sev, message) { return { severity: sev, message }; }
function fmsg(en, pl, ar, vars) {
  let v = ST.lang === 'pl' ? pl : ST.lang === 'ar' ? ar : en;
  if (vars) v = v.replace(/\{(\w+)\}/g, (m, k) => (vars[k] != null ? vars[k] : m));
  return v;
}
function checkCV(text, jobText) {
  const findings = [];
  const flat = normalize(text);
  const wc = flat ? flat.split(/\s+/).filter(Boolean).length : 0;

  // Contact information must be in the document body.
  if (!/[\w.+-]+@[\w-]+\.[\w.-]+/.test(flat))
    findings.push(finding('critical', T('No email address found in the document body.')));
  const hasPhone = (flat.match(/(?<!\d)(\+?[\d][\d\s().-]{6,}\d)(?!\d)/g) || []).some((cand) => {
    if (cand.replace(/\D/g, '').length < 7) return false;
    if (/^\s*(?:19|20)\d{2}\s*-\s*(?:19|20)?\d{2}\s*$/.test(cand)) return false;
    if (/\b\d+\s*years?\b/i.test(cand)) return false;
    return true;
  });
  if (!hasPhone) findings.push(finding('warn', T('No phone number found in the document body.')));
  if (!/linkedin\.com/i.test(flat)) findings.push(finding('info', T('No LinkedIn URL found - recommended for most roles.')));

  // Headings (paragraph lines), mirroring the KNOWN_HEADINGS logic.
  const found = [];
  for (const rawLine of text.split('\n')) {
    const raw = normalize(rawLine).replace(/:$/, '');
    const t = raw.toLowerCase();
    if (!t || t.length > 40) continue;
    if (KNOWN[t]) { if (!found.includes(KNOWN[t])) found.push(KNOWN[t]); continue; }
    if (raw === raw.toUpperCase() && t.split(/\s+/).length <= 5) {
      for (const [phrase, key] of Object.entries(KNOWN)) {
        if (phrase.split(/\s+/).every((w) => t.includes(w)) && !found.includes(key)) { found.push(key); break; }
      }
    }
  }
  for (const s of CORE_SECTIONS) if (!found.includes(s)) {
    findings.push(finding('critical',
      T("Missing standard section heading: '{section}'. ATS maps content by recognizable headings "
        + "(use exact words like 'Work Experience', 'Education', 'Skills').", { section: s })));
  }

  // Dates anywhere + consistency/order inside the experience section.
  const allDates = Array.from(flat.matchAll(dateRe()));
  if (!allDates.length) findings.push(finding('warn',
    T("No dates found. ATS parses employment history by dates - add month/year (e.g. 'Jun 2021 - Present') "
      + 'to every role.')));

  let expText = '', grab = false;
  for (const line of text.split('\n')) {
    const raw = normalize(line).toLowerCase().replace(/:$/, '');
    if (KNOWN[raw]) {
      if (KNOWN[raw] === 'experience') grab = true;
      else if (grab) break;
    } else if (grab) expText += '\n' + line;
  }
  if (expText.trim()) {
    const toks = Array.from(expText.matchAll(dateRe())).map((m) => m.groups);
    const hasMY = toks.some((t) => t.mon);
    const hasYO = toks.some((t) => t.yr2 && !t.mon);
    if (hasMY && hasYO) findings.push(finding('warn',
      T("Mixed date formats in experience (both 'Jun 2021' and bare '2021'). "
        + 'Use one consistent format, month + year.')));
    const starts = [];
    for (const line of expText.split('\n')) {
      if (/^\s*[\u2022\-\u25cf*]\s/.test(line)) continue;
      const m = dateRe().exec(line);
      if (!m) continue;
      const g = m.groups;
      if (g.now) starts.push([9999, 12]);
      else if (g.mon) starts.push([parseInt(g.yr1, 10), MONTHS[g.mon.slice(0, 3).toLowerCase()] || 0]);
      else starts.push([parseInt(g.yr2, 10), 0]);
    }
    const violations = starts.slice(1).some((cur, i) => {
      const prev = starts[i];
      return cur[0] > prev[0] && cur[0] !== 9999 && prev[0] !== 9999;
    });
    if (violations && starts.length > 1) findings.push(finding('warn',
      T('Experience is not in reverse-chronological order (a role after it starts later than the previous '
        + 'role). Most recent role must come first.')));
  }

  // Length.
  if (wc < 200) findings.push(finding('warn', fmsg(
    'Very short CV ({wc} words). Aim for 400-800 words (2 pages max for <10 years).',
    'Bardzo krótkie CV ({wc} słów). Celuj w 400-800 słów (max 2 strony przy <10 latach doświadczenia).',
    'سيرة ذاتية قصيرة جداً ({wc} كلمة). استهدف 400-800 كلمة (صفحتان كحد أقصى).', { wc })));
  else if (wc > 1200) findings.push(finding('warn', fmsg(
    'Long CV ({wc} words). Recruiters skim; trim to 400-800 words unless senior/academic.',
    'Długie CV ({wc} słów). Rekruterzy tylko przeglądają; skróć do 400-800 słów.',
    'سيرة ذاتية طويلة ({wc} كلمة). قلّصها إلى 400-800 كلمة.', { wc })));

  // Bullet quality.
  const bullets = text.split('\n').filter((l) => BULLET_RE.test(l));
  if (bullets.length) {
    const withMetrics = bullets.filter((b) => /\d+\s*%|\d+x|\$\d|\b\d+\+?\b/.test(b)).length;
    const withVerbs = bullets.filter((b) => {
      const first = b.toLowerCase().trim().replace(/^[-*\u2022\u25cf]\s*/, '').split(/\s+/).slice(0, 4);
      return first.some((w) => ACTION_VERBS.has(w));
    }).length;
    if (withMetrics / bullets.length < 0.4) findings.push(finding('warn', fmsg(
      'Only {a}/{b} bullet(s) contain numbers or metrics. Quantify achievements: '
        + "'reduced deploy time 40% by ...'.",
      'Tylko {a}/{b} punkt(ów) zawiera liczby lub wskaźniki. Uwierzytelnij osiągnięcia: '
        + "'skrócenie czasu wdrożenia o 40%'.",
      'عدد النقاط التي تحتوي على أرقام أو مؤشرات: {a} من {b}. كمّن الإنجازات: "تقليل وقت النشر بنسبة 40%".',
      { a: withMetrics, b: bullets.length })));
    if (withVerbs / bullets.length < 0.5) findings.push(finding('info',
      T('Start most bullets with a strong action verb (Led, Designed, Reduced, ...).')));
  } else findings.push(finding('info', T('No bullet points detected - use bullets for achievements, not paragraphs.')));

  if (/references available/i.test(flat)) findings.push(finding('info',
    T("'References available upon request' is obsolete - remove it.")));
  if (/curriculum vitae/i.test(flat)) findings.push(finding('info',
    T("Title 'Curriculum Vitae' is unnecessary - your name is the title.")));

  // Keyword coverage (deduct-only).
  let keywords = null;
  if (jobText && jobText.trim()) {
    const kws = extractKeywords(jobText, 40);
    const hay = normKey(flat);
    const matched = [], missing = [];
    for (const [kw, freq] of kws) (keywordHit(kw, hay) ? matched : missing).push(keywordHit(kw, hay) ? kw : [kw, freq]);
    const coverage = Math.round(100 * matched.length / Math.max(1, kws.length));
    keywords = { coverage, matched, missing: missing.slice(0, 15).map((x) => x[0]) };
  }

  const penalty = findings.reduce((s, f) => s + SEVERITY_WEIGHT[f.severity], 0);
  const structure = Math.max(0, 100 - penalty);
  const breakdown = { structure_and_content: structure };
  let score = structure;
  if (keywords) {
    const kp = Math.round((1 - keywords.coverage / 100) * KEYWORD_MAX_PENALTY);
    breakdown.keyword_coverage_penalty = -kp;
    score = Math.max(0, score - kp);
  }
  breakdown.final = score;
  return { score, findings, word_count: wc, headings_found: found.slice().sort(), keywords, score_breakdown: breakdown };
}

function renderReport(rep, source) {
  const L = [];
  const bar = '='.repeat(64), dash = '-'.repeat(64);
  const band = rep.score >= 90 ? 'EXCELLENT - submit with confidence'
    : rep.score >= 75 ? 'GOOD - fix the items below to maximize pass rate'
      : rep.score >= 50 ? 'NEEDS WORK - address critical items first'
        : 'POOR - major ATS blockers present';
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  L.push(bar, T('ATS COMPLIANCE REPORT'), `File:    ${source}`,
    `Date:    ${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`,
    bar, '');
  L.push(`${T('OVERALL ATS SCORE:')} ${rep.score}/100   ${T(band)}`, '');
  L.push(`${T('Word count:')} ${rep.word_count}   |   ${T('Headings detected:')} ${rep.headings_found.join(', ') || T('none')}`);
  const bd = rep.score_breakdown;
  if (bd) {
    const parts = [`content/structure ${bd.structure_and_content >= 0 ? '+' : ''}${bd.structure_and_content}`];
    if ('keyword_coverage_penalty' in bd) parts.push(`keyword coverage ${bd.keyword_coverage_penalty}`);
    L.push(`${T('Score breakdown:')} ${parts.join('  |  ')}  =>  ${bd.final}`);
  }
  L.push('', T('FINDINGS'), dash);
  const order = { critical: 0, warn: 1, info: 2 };
  const fs = rep.findings.slice().sort((a, b) => order[a.severity] - order[b.severity]);
  if (!fs.length) L.push(T('No issues found. This CV is clean for ATS parsing.'));
  const tag = { critical: '[CRITICAL]', warn: '[WARNING] ', info: '[HINT]    ' };
  for (const f of fs) L.push(`${tag[f.severity]} ${f.message}`);
  L.push('');
  const k = rep.keywords;
  if (k) {
    L.push(T('KEYWORD MATCH vs JOB DESCRIPTION'), dash,
      `Coverage: ${k.coverage}% of top job keywords found in your CV`,
      `Matched:  ${k.matched.slice(0, 20).join(', ')}`);
    if (k.missing.length) {
      L.push(T('MISSING - weave these naturally into summary, skills, or bullets:'));
      L.push('  ' + k.missing.join(', '));
    }
    L.push('');
  }
  L.push(dash, T('Generated by CVBuilder - ATS parsing rules: standard headings, single column,'),
    T('no tables/text boxes/images, contact info in body, 400-800 words, month-year dates.'));
  return L.join('\n');
}

/* --------------------------------------------------- themed HTML document */
function docBody(p, opts) {
  const c = p.contact || {}, out = [];
  const photo = opts.photo && p.photo
    ? `<img src="${esc(p.photo)}" alt="" style="max-height:34mm;float:right;margin-left:6mm">` : '';
  out.push(`<h1>${esc(p.name || '')}</h1>`);
  out.push(photo);
  if (p.title) out.push(`<p class="doc-title">${esc(p.title)}</p>`);
  const contact = [c.location, c.phone, c.email, c.linkedin, c.portfolio].filter(Boolean).map(esc).join('  |  ');
  if (contact) out.push(`<p class="doc-contact">${contact}</p>`);
  const summary = p.summary || autoSummary(p);
  out.push(`<h2>${esc(T('Professional Summary'))}</h2><p>${esc(summary)}</p>`);
  if ((p.skills || []).length) out.push(`<h2>${esc(T('Skills'))}</h2><p>${esc(p.skills.join(', '))}</p>`);
  if ((p.experience || []).length) {
    out.push(`<h2>${esc(T('Work Experience'))}</h2>`);
    for (const e of p.experience) {
      const head = [e.title, [e.company, e.location].filter(Boolean).join(' | ')]
        .filter(Boolean).join('  |  ');
      const dates = `${e.start || ''} - ${e.end || ''}`;
      out.push('<div class="doc-item">');
      out.push(`<p><strong>${esc(head)}</strong> <span class="doc-dates">(${esc(dates)})</span></p>`);
      if (e.about) out.push(`<p class="doc-brief">${esc(e.about)}</p>`);
      if ((e.bullets || []).length) out.push('<ul>' + e.bullets.filter(Boolean).map((b) => `<li>${esc(b)}</li>`).join('') + '</ul>');
      out.push('</div>');
    }
  }
  if ((p.education || []).length) {
    out.push(`<h2>${esc(T('Education'))}</h2>`);
    for (const e of p.education) {
      const head = [e.degree, [e.school, e.location].filter(Boolean).join(' | ')].filter(Boolean).join('  |  ');
      const dates = `${e.start || ''} - ${e.end || ''}`.replace(/^\s*-\s*|\s*-\s*$/g, '').trim();
      out.push('<div class="doc-item">');
      out.push(`<p><strong>${esc(head)}</strong>${dates ? ` <span class="doc-dates">(${esc(dates)})</span>` : ''}</p>`);
      if (e.details) out.push(`<p>${esc(e.details)}</p>`);
      out.push('</div>');
    }
  }
  if ((p.certifications || []).length) {
    out.push(`<h2>${esc(T('Certifications'))}</h2><ul>`);
    for (const cert of p.certifications) {
      const extra = [cert.issuer, cert.year ? String(cert.year) : ''].filter(Boolean);
      out.push(`<li>${esc(cert.name || '')}${extra.length ? '  -  ' + esc(extra.join(', ')) : ''}</li>`);
    }
    out.push('</ul>');
  }
  if ((p.projects || []).length) {
    out.push(`<h2>${esc(T('Projects'))}</h2>`);
    for (const pr of p.projects) {
      let line = `<strong>${esc(pr.name || '')}</strong>`;
      if (pr.description) line += '  -  ' + esc(pr.description);
      if ((pr.tech || []).length) line += `  (Tech: ${esc(pr.tech.join(', '))})`;
      out.push(`<p>${line}</p>`);
    }
  }
  if ((p.languages || []).length) {
    out.push(`<h2>${esc(T('Languages'))}</h2><p>${esc(p.languages.map((l) => l.level
      ? `${l.name || ''} (${l.level})` : (l.name || '')).join(', '))}</p>`);
  }
  return out.join('\n');
}

function docCss(theme) {
  const t = THEMES[theme] || THEMES.mono;
  return `
@page { size: A4; margin: 18mm; }
body { font-family: Calibri, "Segoe UI", Arial, sans-serif; font-size: 10.5pt; line-height: 1.35;
       color: #111; background: #fff; margin: 0; }
h1 { font-size: 20pt; color: ${t.head}; margin: 0 0 2mm; }
.doc-title { font-size: 12pt; font-weight: 600; color: ${t.accent}; margin: 0 0 3mm; }
.doc-contact { font-size: 9.5pt; color: #333; margin: 0 0 5mm; }
h2 { font-size: 11.5pt; text-transform: uppercase; letter-spacing: .06em; color: ${t.head};
     border-bottom: 1.5px solid ${t.rule}; padding-bottom: 1mm; margin: 6mm 0 2mm; page-break-after: avoid; }
p, li { margin: 0 0 1.5mm; }
ul { margin: 0 0 2mm; padding-left: 5mm; }
.doc-item { margin-bottom: 3mm; page-break-inside: avoid; }
.doc-item strong { color: ${t.accent}; }
.doc-dates { color: #444; }
.doc-brief { font-style: italic; color: #444; }
a { color: ${t.accent}; text-decoration: none; }
.letter-body { white-space: pre-wrap; }
.page-break { page-break-before: always; }`;
}
function wordHtml(title, body, theme, dir) {
  return `<!DOCTYPE html><html xmlns:o="urn:schemas-microsoft-com:office:office" `
    + `xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40" `
    + `dir="${dir}"><head><meta charset="utf-8"><title>${esc(title)}</title>`
    + `<!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View><w:Zoom>100</w:Zoom>`
    + `<w:DoNotOptimizeForBrowser/></w:WordDocument></xml><![endif]-->`
    + `<style>${docCss(theme)}</style></head><body>${body}</body></html>`;
}
function letterBody(p, text) {
  const c = p.contact || {};
  const contact = [c.email, c.phone, c.location, c.linkedin].filter(Boolean).map(esc).join('  |  ');
  return `<h1>${esc(p.name || '')}</h1>`
    + (contact ? `<p class="doc-contact">${contact}</p>` : '')
    + `<div class="letter-body">${esc(text)}</div>`;
}

/* --------------------------------------------------------- DOCX import UI */
let IMPORT_FILE = null, IMPORT_PROFILE = null, IMPORT_STATUS = null, IMPORT_DONE_TIMER = null, IMPORT_DONE_FIELDS = '';

function importHasFields(p) {
  return !!(p.name || p.title || p.summary || p.contact.email || p.contact.phone
    || p.contact.location || (p.skills || []).length || (p.experience || []).length
    || (p.education || []).length || (p.certifications || []).length
    || (p.projects || []).length || (p.languages || []).length);
}
function importFieldSummary(p) {
  const bits = [];
  if (p.name) bits.push(T('Full name'));
  if (p.title) bits.push(T('Job title'));
  if (p.contact.location) bits.push(T('Location'));
  if (p.contact.phone) bits.push(T('Phone'));
  if (p.contact.email) bits.push(T('Email'));
  if (p.summary) bits.push(T('Professional Summary - 2-3 sentences with your top keywords').split(' - ')[0]);
  if ((p.skills || []).length) bits.push(`${T('Skills')} (${p.skills.length})`);
  if ((p.experience || []).length) bits.push(`${T('Work experience')} (${p.experience.length})`);
  if ((p.education || []).length) bits.push(`${T('Education')} (${p.education.length})`);
  if ((p.certifications || []).length) bits.push(`${T('Certifications')} (${p.certifications.length})`);
  if ((p.projects || []).length) bits.push(`${T('Projects')} (${p.projects.length})`);
  if ((p.languages || []).length) bits.push(`${T('Languages')} (${p.languages.length})`);
  return bits.join(', ') || T('importNothingShort');
}
function importSetStatus(key, cls, vars) {
  IMPORT_STATUS = { key, cls: cls || '', vars: vars || {} };
  const el = $('#import-status');
  if (!el) return;
  el.textContent = T(key, IMPORT_STATUS.vars);
  el.className = 'import-status' + (IMPORT_STATUS.cls ? ' ' + IMPORT_STATUS.cls : '');
  el.hidden = false;
}
function importClearStatus() {
  IMPORT_STATUS = null;
  const el = $('#import-status');
  if (el) { el.textContent = ''; el.hidden = true; }
}
async function importReadFile(file) {
  IMPORT_FILE = file;
  IMPORT_PROFILE = null;
  $('#import-filename').textContent = file.name;
  $('#import-filename').hidden = false;
  $('#import-apply').disabled = true;
  try {
    if (!/\.docx$/i.test(file.name)) throw new Error(T('importBadExt'));
    const lines = docxLines(await file.arrayBuffer());
    if (!lines.length) throw new Error(T('importEmptyDoc'));
    IMPORT_PROFILE = parseDocxProfile(lines);
    const fields = importFieldSummary(IMPORT_PROFILE);
    importSetStatus(importHasFields(IMPORT_PROFILE) ? 'importReady' : 'importNothing',
      importHasFields(IMPORT_PROFILE) ? '' : 'warn', { file: file.name, fields });
    $('#import-apply').disabled = !importHasFields(IMPORT_PROFILE);
  } catch (e) {
    IMPORT_PROFILE = null;
    importSetStatus('importError', 'error',
      { error: e && e.message ? e.message : String(e) });
  }
}
function mergeImportedProfile(imported, replace) {
  // "Replace" must be a real replacement: start from a blank profile so no
  // stale values survive in fields the DOCX does not mention (target
  // company, photo, extra contact lines, old list entries, ...).
  if (replace) {
    const fresh = emptyProfile();
    for (const key of ['name', 'title', 'target_company', 'summary', 'photo'])
      if (imported[key]) fresh[key] = imported[key];
    for (const [key, value] of Object.entries(imported.contact || {}))
      if (value) fresh.contact[key] = value;
    for (const key of ['skills', 'experience', 'education', 'certifications', 'projects', 'languages'])
      if ((imported[key] || []).length) fresh[key] = clone(imported[key]);
    ST.profile = fresh;
    return;
  }
  const p = ST.profile;
  if (!p.contact || typeof p.contact !== 'object') p.contact = emptyProfile().contact;
  for (const key of ['name', 'title', 'target_company', 'summary'])
    if (imported[key] && !p[key]) p[key] = imported[key];
  for (const [key, value] of Object.entries(imported.contact || {}))
    if (value && !p.contact[key]) p.contact[key] = value;
  for (const key of ['skills', 'experience', 'education', 'certifications', 'projects', 'languages']) {
    const incoming = imported[key] || [];
    if (!incoming.length) continue;
    if (!(p[key] || []).length) p[key] = clone(incoming);
    else {
      const have = new Set((p[key] || []).map((x) => JSON.stringify(x)));
      for (const item of incoming) {
        const sig = JSON.stringify(item);
        if (!have.has(sig)) { p[key].push(clone(item)); have.add(sig); }
      }
    }
  }
}
function importApply() {
  if (!IMPORT_PROFILE) { importSetStatus('importNoFile', 'warn'); return; }
  const fields = importFieldSummary(IMPORT_PROFILE);
  const fromChooser = !!($('#pane-chooser') && $('#pane-chooser').classList.contains('active'));
  mergeImportedProfile(IMPORT_PROFILE, $('#import-replace').checked);
  saveLocal();
  buildOutputs(false, true);
  renderWizard();
  renderTabs();
  // Importing from the first screen must land on the filled form, otherwise
  // the user stays on the chooser and thinks nothing changed.
  if (fromChooser) {
    const dontAsk = $('#dont-ask');
    if (dontAsk) ST.settings.dont_ask = dontAsk.checked;
    setMode('tabs', true);
  }
  $('#import-modal').hidden = true;
  const bar = $('#import-done');
  if (bar) {
    IMPORT_DONE_FIELDS = fields;
    bar.textContent = T('importApplied', { fields });
    bar.hidden = false;
    clearTimeout(IMPORT_DONE_TIMER);
    IMPORT_DONE_TIMER = setTimeout(() => { bar.hidden = true; }, 9000);
  }
}
function openImport() {
  IMPORT_FILE = null;
  IMPORT_PROFILE = null;
  $('#import-zone').classList.remove('dragover');
  const fn = $('#import-filename');
  if (fn) { fn.textContent = ''; fn.hidden = true; }
  const fi = $('#import-file');
  if (fi) fi.value = '';
  $('#import-apply').disabled = true;
  importClearStatus();
  $('#import-modal').hidden = false;
}

/* ------------------------------------------------------------------ UI */
function applyLanguage() {
  document.documentElement.lang = ST.lang;
  document.documentElement.dir = isRTL() ? 'rtl' : 'ltr';
  $$('[data-i18n]').forEach((n) => {
    const v = T(n.getAttribute('data-i18n'));
    if (n.tagName === 'INPUT' && n.type === 'button') n.value = v; else n.textContent = v;
  });
  $$('.lang-btn').forEach((b) => b.classList.toggle('active', b.dataset.lang === ST.lang));
  $('#app-title').textContent = `CVBuilder v${VERSION}`;
  $('#app-subtitle').textContent = T('ATS CV Generator');
  $('#footer-version').textContent = `CVBuilder v${VERSION}`;
  $('#about-modal-title').textContent = T('About CVBuilder');
  $('#about-body').textContent = T('aboutBody', { ver: VERSION });
  $('#mode-toggle').textContent = ST.mode === 'wizard' ? T('switchModeTabs') : T('switchModeWizard');
  $('#wiz-jump').setAttribute('aria-label', T('Jump to question'));
  $('#job-text').placeholder = T('Paste the job advertisement here...');
  $$('.theme-btn').forEach((b) => b.classList.toggle('active', b.dataset.theme === ST.theme));
  $$('.preview').forEach((n) => {
    n.classList.remove('theme-mono', 'theme-green', 'theme-rose');
    n.classList.add('theme-' + ST.theme);
  });
  if (IMPORT_STATUS && $('#import-status') && !$('#import-modal').hidden)
    importSetStatus(IMPORT_STATUS.key, IMPORT_STATUS.cls, IMPORT_STATUS.vars);
  if (IMPORT_DONE_FIELDS && $('#import-done') && !$('#import-done').hidden)
    $('#import-done').textContent = T('importApplied', { fields: IMPORT_DONE_FIELDS });
}
function showPane(name) {
  $$('.pane').forEach((p) => p.classList.toggle('active', p.id === 'pane-' + name));
  window.scrollTo({ top: 0, behavior: 'instant' });
}
function setMode(mode, fromChooser) {
  ST.mode = mode;
  if (mode === 'wizard') { ST.wizStep = Math.min(ST.wizStep, WIZARD_STEPS.length - 1); renderWizard(); }
  else renderTabs();
  saveLocal();
  showPane(mode);
  if (!fromChooser) $('#mode-toggle').textContent = mode === 'wizard' ? T('switchModeTabs') : T('switchModeWizard');
}
function setLanguage(lang) {
  if (!['en', 'pl', 'ar'].includes(lang)) return;
  ST.lang = lang;
  saveLocal();
  applyLanguage();
  renderWizard();
  renderTabs();
  if (ST.report) buildOutputs(false, true);
}

/* --------------------------------------------------------------- widgets */
function inputField(label, value, kind, onChange, rows) {
  const wrap = mk('div', {}, [mk('label', { class: 'field', text: label })]);
  let inp;
  if (kind === 'text' || kind === 'textstr' || kind === 'list') {
    inp = mk('textarea', { rows: rows || 3 });
    inp.value = Array.isArray(value) ? value.join('\n') : (value || '');
    inp.addEventListener('input', () => onChange(kind === 'text' || kind === 'list' ? splitLines(inp.value) : inp.value));
  } else {
    inp = mk('input', { type: 'text' });
    inp.value = value == null ? '' : value;
    inp.addEventListener('input', () => onChange(inp.value));
  }
  wrap.appendChild(inp);
  return wrap;
}
function fieldRow(pairs) {
  return mk('div', { class: 'field-row' }, pairs.map(([label, val, kind, cb, rows, full]) => {
    const n = inputField(label, val, kind, cb, rows);
    if (full) n.classList.add('full');
    return n;
  }));
}
function getPath(obj, path) { return path.split('.').reduce((o, k) => (o || {})[k], obj); }
function setPath(obj, path, value) {
  const keys = path.split('.'), last = keys.pop();
  let o = obj;
  for (const k of keys) o = o[k] || (o[k] = {});
  o[last] = value;
}
function sectionEditor(section, fields, profile) {
  const list = profile[section] || (profile[section] = []);
  const box = mk('div', { class: 'repeat-list' });
  const redraw = () => {
    replaceChildren(box, list.map((item, i) => mk('div', { class: 'repeat-item' }, [
      mk('span', { class: 'item-title', text: itemLabel(section, item, i) }),
      mk('div', { class: 'item-actions' }, [
        mk('button', { class: 'icon-btn', type: 'button', text: T('Edit'), onclick: () => edit(i) }),
        mk('button', { class: 'icon-btn danger', type: 'button', text: T('Delete'),
          onclick: () => { list.splice(i, 1); saveLocal(); redraw(); } })
      ])
    ])));
    if (!list.length) box.appendChild(mk('p', { class: 'muted', text: T('Nothing added yet.') }));
  };
  const edit = (i) => {
    const item = list[i] == null ? {} : list[i];
    const form = mk('div', { class: 'item-form' });
    const inputs = [];
    for (const [key, label, kind, rows] of fields) {
      let val = item[key];
      if (key === 'tech' && Array.isArray(val)) val = val.join(', ');
      inputs.push([key, label, (v) => { item[key] = (key === 'tech') ? splitComma(v) : v; }, kind, rows]);
    }
    inputs.forEach(([key, label, cb, kind, rows]) => form.appendChild(inputField(label, item[key], kind, cb, rows)));
    form.appendChild(mk('div', { class: 'download-row' }, [
      mk('button', { class: 'btn primary', type: 'button', text: T('Save'), onclick: () => {
        if (list[i] == null) list.push(item);
        saveLocal(); panel.replaceChildren(formBtn, box); redraw();
      } }),
      mk('button', { class: 'btn ghost', type: 'button', text: T('Cancel'),
        onclick: () => panel.replaceChildren(formBtn, box) })
    ]));
    panel.replaceChildren(form);
  };
  const formBtn = mk('button', { class: 'btn', type: 'button', text: T('Add entry'),
    onclick: () => edit(list.length) });
  const panel = mk('div', {}, [formBtn, box]);
  redraw();
  return panel;
}
function splitComma(v) { return String(v || '').split(',').map((s) => s.trim()).filter(Boolean); }
function itemLabel(section, item, i) {
  const map = {
    experience: () => `${item.title || '?'} @ ${item.company || '?'} (${item.start || ''} - ${item.end || ''})`,
    education: () => `${item.degree || '?'} @ ${item.school || '?'}`,
    certifications: () => `${item.name || '?'} (${item.year || ''})`,
    projects: () => item.name || '?',
    languages: () => `${item.name || '?'} (${item.level || ''})`
  };
  return `${i + 1}. ` + (map[section] ? map[section]() : JSON.stringify(item));
}

/* ---------------------------------------------------------- wizard */
const WIZARD_STEPS = [
  { title: '1 / 10  About you', hint: 'Tell me who you are. Use the exact job title from the job ad.',
    kind: 'fields', target: 'root', fields: [
      ['name', 'What is your full name?', 'entry'],
      ['title', 'What job title are you applying for?', 'entry'],
      ['target_company', 'Which company is hiring? (used in the cover letter)', 'entry']] },
  { title: '2 / 10  Contact & photo', hint: 'These details go in the body of the CV so ATS software can read them. The photo is optional.',
    kind: 'fields', target: 'contact', fields: [
      ['location', 'Where are you based? (City, Country)', 'entry'],
      ['phone', 'What is your phone number?', 'entry'],
      ['email', 'What is your email address?', 'entry'],
      ['linkedin', 'What is your LinkedIn URL? (optional)', 'entry'],
      ['portfolio', 'What is your portfolio / GitHub URL? (optional)', 'entry']] },
  { title: '3 / 10  Professional summary', hint: 'Write 2-3 sentences. Include your top keywords and years of experience.',
    kind: 'fields', target: 'root', fields: [
      ['summary', 'How would you describe yourself professionally?', 'text', 7]] },
  { title: '4 / 10  Skills', hint: 'One skill per line. Use the exact words from the job ad where truthful.',
    kind: 'fields', target: 'root', fields: [
      ['skills', 'Which skills should appear on your CV? (one per line)', 'list', 11]] },
  { title: '5 / 10  Work experience', hint: "Answer for one job, click 'Add as new', then repeat for the next job.",
    kind: 'repeat', section: 'experience', fields: [
      ['title', 'What was your job title?', 'entry'], ['company', 'For which company?', 'entry'],
      ['location', 'Where was the job? (City, Country)', 'entry'],
      ['start', 'From when? (e.g. Jun 2020)', 'entry'], ['end', 'To when? (e.g. Present)', 'entry'],
      ['about', 'In 1-2 sentences, what did this role involve?', 'textstr', 2],
      ['bullets', 'What did you achieve? One result per line, with numbers.', 'text', 6]] },
  { title: '6 / 10  Education', hint: 'One degree per entry. Add as new, then repeat for the next school.',
    kind: 'repeat', section: 'education', fields: [
      ['degree', 'What degree did you earn?', 'entry'], ['school', 'At which school / university?', 'entry'],
      ['location', 'Where is it? (City, Country)', 'entry'], ['start', 'From which year?', 'entry'],
      ['end', 'To which year?', 'entry'], ['details', 'Anything else? (GPA, thesis, honors)', 'textstr', 2]] },
  { title: '7 / 10  Certifications', hint: 'Add each certification separately. Skip this question if you have none.',
    kind: 'repeat', section: 'certifications', fields: [
      ['name', 'What is the certification called?', 'entry'], ['issuer', 'Who issued it?', 'entry'],
      ['year', 'In which year?', 'entry']] },
  { title: '8 / 10  Projects', hint: 'Add one project at a time. Separate technologies with commas.',
    kind: 'repeat', section: 'projects', fields: [
      ['name', 'What is the project called?', 'entry'],
      ['description', 'What did you build or deliver?', 'textstr', 3],
      ['tech', 'Which technologies did you use? (comma separated)', 'entry']] },
  { title: '9 / 10  Languages', hint: 'Add each language and your level, e.g. English - Fluent.',
    kind: 'repeat', section: 'languages', fields: [
      ['name', 'Which language?', 'entry'],
      ['level', 'What is your level? (e.g. Fluent, B2)', 'entry']] },
  { title: '10 / 10  Review & finish', hint: 'Check the answers below, then save them into your CV.', kind: 'review' }
];

function renderWizard() {
  const st = WIZARD_STEPS[ST.wizStep];
  $('#wizard-head').textContent = T(st.title);
  $('#wizard-progress').style.width = ((ST.wizStep + 1) / WIZARD_STEPS.length * 100) + '%';
  const body = $('#wizard-body');
  const parts = [mk('p', { class: 'hint', text: T(st.hint) })];

  if (st.kind === 'fields') {
    const target = st.target === 'contact' ? ST.profile.contact : ST.profile;
    const form = mk('div', {});
    for (const [key, label, kind, rows] of st.fields) {
      const val = target[key];
      form.appendChild(inputField(T(label), Array.isArray(val) ? val.join('\n') : val,
        kind, (v) => { target[key] = (kind === 'list') ? splitLines(v) : v; saveLocal(); }, rows));
    }
    if (ST.wizStep === 1) {
      const photoBox = mk('div', { class: 'field' }, [
        mk('label', { class: 'field', text: T('Photo (optional)') }),
        mk('input', { type: 'file', accept: 'image/*', onchange: (e) => {
          const f = e.target.files && e.target.files[0];
          if (!f) return;
          const r = new FileReader();
          r.onload = () => { ST.profile.photo = String(r.result); saveLocal(); renderWizard(); };
          r.readAsDataURL(f);
        } })
      ]);
      if (ST.profile.photo) photoBox.appendChild(mk('p', { class: 'muted', text: T('Photo selected.') }));
      form.appendChild(photoBox);
    }
    parts.push(form);
  } else if (st.kind === 'repeat') {
    const sec = st.section;
    const item = ST.wizItem[ST.wizStep] || (ST.wizItem[ST.wizStep] = {});
    const form = mk('div', { class: 'item-form' });
    for (const [key, label, kind, rows] of st.fields) {
      let val = item[key];
      if (key === 'tech' && Array.isArray(val)) val = val.join(', ');
      form.appendChild(inputField(T(label), val, kind, (v) => {
        item[key] = (key === 'tech') ? splitComma(v) : v;
      }, rows));
    }
    form.appendChild(mk('div', { class: 'download-row' }, [
      mk('button', { class: 'btn primary', type: 'button', text: T('Add as new'), onclick: () => {
        if (!Object.values(item).some((v) => String(v || '').trim())) return;
        (ST.profile[sec] || (ST.profile[sec] = [])).push(clone(item));
        ST.wizItem[ST.wizStep] = {};
        saveLocal(); renderWizard();
      } }),
      mk('button', { class: 'btn ghost', type: 'button', text: T('Clear fields'),
        onclick: () => { ST.wizItem[ST.wizStep] = {}; renderWizard(); } })
    ]));
    parts.push(form);
    const saved = ST.profile[sec] || [];
    const list = mk('div', {});
    list.appendChild(mk('h3', { text: `${T('Added so far')} (${saved.length})` }));
    saved.forEach((it, i) => list.appendChild(mk('div', { class: 'repeat-item' }, [
      mk('span', { class: 'item-title', text: itemLabel(sec, it, i) }),
      mk('button', { class: 'icon-btn danger', type: 'button', text: T('Delete'), onclick: () => {
        saved.splice(i, 1); saveLocal(); renderWizard();
      } })
    ])));
    parts.push(list);
  } else {
    const p = ST.profile, c = p.contact || {};
    const rows = [
      [T('Full name'), p.name], [T('Job title'), p.title], [T('Target company'), p.target_company],
      [T('Location'), c.location], [T('Phone'), c.phone], [T('Email'), c.email],
      [T('Skills'), (p.skills || []).length ? `${(p.skills || []).length}` : '0'],
      [T('Work experience'), `${(p.experience || []).length}`],
      [T('Education'), `${(p.education || []).length}`],
      [T('Certifications'), `${(p.certifications || []).length}`],
      [T('Projects'), `${(p.projects || []).length}`],
      [T('Languages'), `${(p.languages || []).length}`]
    ];
    const tbl = mk('div', { class: 'review-list' });
    for (const [k, v] of rows) tbl.appendChild(mk('div', { class: 'review-row' }, [
      mk('strong', { text: k }), mk('span', { text: v || '—' })
    ]));
    parts.push(tbl, mk('p', { class: 'hint', text: T('Ready to save. Here is what you answered:') }));
  }
  replaceChildren(body, parts);

  $('#wiz-back').disabled = ST.wizStep === 0;
  $('#wiz-next').textContent = ST.wizStep === WIZARD_STEPS.length - 1 ? T('buildCV') : T('next');
  const jump = $('#wiz-jump');
  replaceChildren(jump, WIZARD_STEPS.map((s, i) =>
    mk('option', { value: i, text: T(s.title), selected: i === ST.wizStep })));
  jump.value = String(ST.wizStep);
}

/* ------------------------------------------------------------ manual tabs */
const EXP_FIELDS = [
  ['title', 'Job title', 'entry'], ['company', 'Company', 'entry'], ['location', 'Location', 'entry'],
  ['start', 'From (e.g. Jun 2020)', 'entry'], ['end', 'To (e.g. Present)', 'entry'],
  ['about', "Role brief - 1-2 sentences describing the position's scope (team size, mission, products)", 'textstr', 2],
  ['bullets', 'Achievements - one per line, start with a verb, include numbers', 'text', 7]
];
const EDU_FIELDS = [
  ['degree', 'Degree', 'entry'], ['school', 'School / University', 'entry'], ['location', 'Location', 'entry'],
  ['start', 'From (year)', 'entry'], ['end', 'To (year)', 'entry'],
  ['details', 'Details (GPA, thesis, honors)', 'textstr', 2]
];
const CERT_FIELDS = [
  ['name', 'Certification name', 'entry'], ['issuer', 'Issuer', 'entry'], ['year', 'Year', 'entry']
];
const PROJ_FIELDS = [
  ['name', 'Project name', 'entry'], ['description', 'Description', 'textstr', 3],
  ['tech', 'Technologies (comma separated)', 'entry']
];
const LANG_FIELDS = [['name', 'Language', 'entry'], ['level', 'Level (e.g. Fluent, B2)', 'entry']];

const TABS = [
  ['CV Details', renderDetailsTab],
  ['Work Experience', (c) => c.appendChild(sectionEditor('experience', EXP_FIELDS, ST.profile))],
  ['Education', (c) => c.appendChild(sectionEditor('education', EDU_FIELDS, ST.profile))],
  ['Certifications', (c) => c.appendChild(sectionEditor('certifications', CERT_FIELDS, ST.profile))],
  ['Projects', (c) => c.appendChild(sectionEditor('projects', PROJ_FIELDS, ST.profile))],
  ['Languages', (c) => c.appendChild(sectionEditor('languages', LANG_FIELDS, ST.profile))],
  ['Job Match', renderJobTab]
];

function renderDetailsTab(c) {
  const p = ST.profile, cc = p.contact || (p.contact = {});
  c.appendChild(fieldRow([
    ['Full name', p.name, 'entry', (v) => { p.name = v; saveLocal(); }, null, true],
    ['Target job title', p.title, 'entry', (v) => { p.title = v; saveLocal(); }, null, true],
    ['Target company (cover letter)', p.target_company, 'entry', (v) => { p.target_company = v; saveLocal(); }, null, true],
    ['Location', cc.location, 'entry', (v) => { cc.location = v; saveLocal(); }],
    ['Phone', cc.phone, 'entry', (v) => { cc.phone = v; saveLocal(); }],
    ['Email', cc.email, 'entry', (v) => { cc.email = v; saveLocal(); }],
    ['LinkedIn', cc.linkedin, 'entry', (v) => { cc.linkedin = v; saveLocal(); }],
    ['Portfolio / GitHub', cc.portfolio, 'entry', (v) => { cc.portfolio = v; saveLocal(); }]
  ]));
  c.appendChild(inputField(T('Professional Summary - 2-3 sentences with your top keywords'), p.summary,
    'textstr', (v) => { p.summary = v; saveLocal(); }, 5));
  c.appendChild(inputField(T('Skills - one per line'), p.skills, 'list',
    (v) => { p.skills = v; saveLocal(); }, 11));
  const photo = mk('div', { class: 'field' }, [
    mk('label', { class: 'field', text: T('Photo (optional)') }),
    mk('input', { type: 'file', accept: 'image/*', onchange: (e) => {
      const f = e.target.files && e.target.files[0];
      if (!f) return;
      const r = new FileReader();
      r.onload = () => { p.photo = String(r.result); saveLocal(); renderTabs(); };
      r.readAsDataURL(f);
    } })
  ]);
  c.appendChild(photo);
  c.appendChild(mk('label', { class: 'checkbox-row' }, [
    mk('input', { type: 'checkbox', checked: ST.photo, onchange: (e) => { ST.photo = e.target.checked; } }),
    mk('span', { text: T('includePhoto') })
  ]));
}

function renderJobTab(c) {
  c.appendChild(inputField(T('Paste the job advertisement here...'), ST.jobText, 'textstr',
    (v) => { ST.jobText = v; }, 10));
  c.appendChild(mk('p', { class: 'hint', text: T('Job description is used for keyword matching and the cover letter. '
    + 'Nothing is uploaded - analysis happens locally in your browser.') }));
  c.appendChild(mk('button', { class: 'btn primary', type: 'button', text: T('Analyze keywords'),
    onclick: () => { buildOutputs(true); } }));
}

function renderTabs() {
  const bar = $('#tab-bar'), content = $('#tab-content');
  ST.tab = Math.min(ST.tab, TABS.length - 1);
  replaceChildren(bar, TABS.map(([label], i) => mk('button', {
    class: 'tab' + (i === ST.tab ? ' active' : ''), type: 'button', role: 'tab',
    'aria-selected': i === ST.tab ? 'true' : 'false',
    text: T(label), onclick: () => { ST.tab = i; renderTabs(); }
  })));
  const c = mk('div', {});
  TABS[ST.tab][1](c);
  replaceChildren(content, [c]);
}

/* --------------------------------------------------------------- outputs */
function buildOutputs(scroll, quiet) {
  ST.cv = cvText(ST.profile);
  ST.letter = ST.cover ? coverLetter(ST.profile, ST.jobText) : '';
  ST.report = checkCV(ST.cv, ST.jobText);
  ST.reportText = renderReport(ST.report, `${slugify(ST.profile.name)}-CV.txt`);
  $('#cv-preview').textContent = ST.cv;
  $('#letter-preview').textContent = ST.letter || T('Enable the cover letter option to generate it.');
  $('#ats-preview').textContent = ST.reportText;
  $$('.preview').forEach((n) => {
    n.classList.remove('theme-mono', 'theme-green', 'theme-rose');
    n.classList.add('theme-' + ST.theme);
  });
  const rep = ST.report;
  const band = rep.score >= 90 ? T('EXCELLENT - submit with confidence')
    : rep.score >= 75 ? T('GOOD - fix the items below to maximize pass rate')
      : rep.score >= 50 ? T('NEEDS WORK - address critical items first') : T('POOR - major ATS blockers present');
  const banner = $('#score-banner');
  banner.classList.toggle('low', rep.score < 75);
  banner.textContent = `${T('OVERALL ATS SCORE:')} ${rep.score}/100 — ${band}`;
  if (!quiet) showPane('output');
  if (scroll) window.scrollTo({ top: 0, behavior: 'smooth' });
}

function download(name, content, mime) {
  const blob = new Blob([content], { type: mime + ';charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = mk('a', { href: url, download: name });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
/* One printable package: CV first, then the cover letter on a new page when enabled. */
function packageBody() {
  let body = docBody(ST.profile, { photo: ST.photo });
  if (ST.cover && ST.letter && ST.letter.trim()) {
    body += '\n<div class="page-break"></div>\n' + letterBody(ST.profile, ST.letter);
  }
  return body;
}

/* Print from a dedicated top-level window so the PDF contains only the document,
   even when the app runs inside an iframe (Google Sites). Falls back to the
   hidden in-page print area if a pop-up / blob window cannot be opened. */
function openPdf(body) {
  const title = `CV - ${ST.profile.name}`;
  const autoPrint = '<script>window.addEventListener("load",function(){'
    + 'setTimeout(function(){window.print();},250);});</script>';
  const html = '<!DOCTYPE html><html lang="' + ST.lang + '" dir="' + (isRTL() ? 'rtl' : 'ltr') + '">'
    + '<head><meta charset="utf-8"><title>' + esc(title) + '</title>'
    + '<style>' + docCss(ST.theme) + '</style></head><body>' + body + autoPrint + '</body></html>';
  let url = '';
  try { url = URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' })); }
  catch (e) { url = ''; }
  const w = url ? window.open(url, '_blank') : null;
  if (w) {
    setTimeout(() => { try { URL.revokeObjectURL(url); } catch (e) {} }, 60000);
    return true;
  }
  if (url) { try { URL.revokeObjectURL(url); } catch (e) {} }
  const area = $('#print-area');
  area.className = 'doc theme-' + ST.theme;
  area.setAttribute('dir', isRTL() ? 'rtl' : 'ltr');
  area.innerHTML = body;
  setTimeout(() => window.print(), 50);
  return false;
}

function setGenerateStatus(key, warn) {
  const el = $('#generate-status');
  if (!el) return;
  el.textContent = T(key);
  el.classList.toggle('warn', !!warn);
  el.hidden = false;
}

/* The only action on the last page: build, then export the checked formats. */
function generateFiles() {
  buildOutputs(false, true);
  const wantPdf = $('#fmt-pdf').checked;
  const wantDoc = $('#fmt-doc').checked;
  const status = $('#generate-status');
  if (status) status.hidden = true;
  if (!wantPdf && !wantDoc) { setGenerateStatus('noFormat', true); return; }
  const body = packageBody();
  const base = slugify(ST.profile.name);
  if (wantDoc) {
    download(base + '-CV.doc',
      wordHtml('CV - ' + ST.profile.name, body, ST.theme, isRTL() ? 'rtl' : 'ltr'),
      'application/msword');
  }
  if (wantPdf) setGenerateStatus(openPdf(body) ? 'pdfDialogHint' : 'pdfFallbackHint', false);
}

/* ----------------------------------------------------------- web UI text */
const WEB_TEXT = {
  importDocx: { en: 'Import DOCX', pl: 'Importuj DOCX', ar: 'استيراد DOCX' },
  docxDesc: {
    en: 'Fill the form from an existing Word .docx CV.',
    pl: 'Uzupełnij formularz z istniejącego CV w Word .docx.',
    ar: 'املأ النموذج من سيرة ذاتية موجودة بصيغة Word .docx.' },
  importTitle: {
    en: 'Fill the form from a DOCX file', pl: 'Wypełnij formularz z pliku DOCX',
    ar: 'املأ النموذج من ملف DOCX' },
  importHint: {
    en: 'Choose a Word .docx CV. Its text is read locally in your browser and matched to the form fields. Nothing is uploaded.',
    pl: 'Wybierz CV w formacie Word .docx. Tekst jest odczytywany lokalnie w przeglądarce i dopasowywany do pól formularza. Nic nie jest wysyłane.',
    ar: 'اختر سيرة ذاتية بصيغة Word .docx. تتم قراءة النص محلياً في متصفحك ومطابقته مع حقول النموذج. لا يتم رفع أي شيء.' },
  importDrop: {
    en: 'Drop a .docx file here, or click to browse',
    pl: 'Upuść plik .docx tutaj lub kliknij, aby wybrać',
    ar: 'أفلت ملف .docx هنا أو انقر للاختيار' },
  importReplace: {
    en: 'Replace existing entries', pl: 'Zastąp istniejące wpisy',
    ar: 'استبدال الإدخالات الحالية' },
  importApply: { en: 'Fill fields', pl: 'Uzupełnij pola', ar: 'املأ الحقول' },
  importReady: {
    en: 'Read {file}: {fields}.', pl: 'Odczytano {file}: {fields}.',
    ar: 'تمت قراءة {file}: {fields}.' },
  importError: {
    en: 'Could not read this DOCX: {error}', pl: 'Nie udało się odczytać pliku DOCX: {error}',
    ar: 'تعذرت قراءة ملف DOCX: {error}' },
  importNoFile: {
    en: 'Choose a .docx file first.', pl: 'Najpierw wybierz plik .docx.',
    ar: 'اختر ملف .docx أولاً.' },
  importBadExt: {
    en: 'Only .docx files are supported.', pl: 'Obsługiwane są tylko pliki .docx.',
    ar: 'الملفات المدعومة بصيغة .docx فقط.' },
  importEmptyDoc: {
    en: 'The document has no readable text.', pl: 'Dokument nie zawiera tekstu do odczytania.',
    ar: 'لا يحتوي المستند على نص يمكن قراءته.' },
  importNothingShort: {
    en: 'no recognised fields', pl: 'brak rozpoznanych pól', ar: 'لا توجد حقول معروفة' },
  importNothing: {
    en: 'No recognisable fields found in {file}. Use a Word .docx with standard CV headings.',
    pl: 'Nie znaleziono rozpoznawalnych pól w pliku {file}. Użyj Word .docx ze standardowymi nagłówkami CV.',
    ar: 'لم يتم العثور على حقول معروفة في {file}. استخدم Word .docx بعناوين سيرة ذاتية قياسية.' },
  importApplied: {
    en: 'DOCX imported: {fields}. Review the fields before generating.',
    pl: 'Zaimportowano DOCX: {fields}. Sprawdź pola przed wygenerowaniem.',
    ar: 'تم استيراد DOCX: {fields}. راجع الحقول قبل الإنشاء.' },
  fileFormat: { en: 'File format', pl: 'Format pliku', ar: 'تنسيق الملف' },
  formatPdf: { en: 'PDF (Save as PDF)', pl: 'PDF (Zapisz jako PDF)', ar: 'PDF (حفظ كملف PDF)' },
  formatWord: { en: 'Word (.doc)', pl: 'Word (.doc)', ar: 'Word (.doc)' },
  formatHint: {
    en: 'Select one or both formats, then click Generate.',
    pl: 'Zaznacz jeden lub oba formaty, a następnie kliknij „Generuj”.',
    ar: 'اختر تنسيقًا واحدًا أو كليهما، ثم انقر على «إنشاء».'
  },
  generateFiles: { en: 'Generate', pl: 'Generuj', ar: 'إنشاء' },
  noFormat: {
    en: 'Select at least one format: PDF or Word.',
    pl: 'Zaznacz co najmniej jeden format: PDF lub Word.',
    ar: 'اختر تنسيقًا واحدًا على الأقل: PDF أو Word.'
  },
  pdfDialogHint: {
    en: 'PDF ready - in the print window choose "Save as PDF", then Save.',
    pl: 'PDF gotowy - w oknie druku wybierz „Zapisz jako PDF”, a następnie Zapisz.',
    ar: 'ملف PDF جاهز - في نافذة الطباعة اختر «حفظ كملف PDF» ثم احفظ.'
  },
  pdfFallbackHint: {
    en: 'PDF ready - the print dialog opened here. Choose "Save as PDF".',
    pl: 'PDF gotowy - okno druku otworzyło się tutaj. Wybierz „Zapisz jako PDF”.',
    ar: 'ملف PDF جاهز - فتحت نافذة الطباعة هنا. اختر «حفظ كملف PDF».'
  },
  about: { en: 'About', pl: 'O programie', ar: 'حول' },
  questionnaire: { en: 'CV QUESTIONNAIRE', pl: 'KWESTIONARIUSZ CV', ar: 'استبيان السيرة الذاتية' },
  switchModeTabs: { en: 'Fill by tabs instead', pl: 'Wypełnij przez zakładki', ar: 'املأ باستخدام العلامات' },
  switchModeWizard: { en: 'Use the questionnaire', pl: 'Użyj kwestionariusza', ar: 'استخدم الاستبيان' },
  'ATS CV Generator': { en: 'ATS CV Generator', pl: 'Generator CV zgodny z ATS', ar: 'مولد سيرة ذاتية متوافق مع ATS' },
  'Jump to question': { en: 'Jump to question', pl: 'Przejdź do pytania', ar: 'انتقل إلى السؤال' },
  'Paste the job advertisement here...': {
    en: 'Paste the job advertisement here...', pl: 'Wklej tutaj ogłoszenie o pracę...', ar: 'الصق إعلان الوظيفة هنا...' },
  'Job description is used for keyword matching and the cover letter. Nothing is uploaded - analysis happens locally in your browser.': {
    en: 'Job description is used for keyword matching and the cover letter. Nothing is uploaded - analysis happens locally in your browser.',
    pl: 'Opis stanowiska służy do dopasowania słów kluczowych i listu motywacyjnego. Nic nie jest wysyłane - analiza odbywa się lokalnie w przeglądarce.',
    ar: 'يُستخدم وصف الوظيفة لمطابقة الكلمات الرئيسية وخطاب التغطية. لا يتم رفع أي شيء - تتم التحليلات محلياً في متصفحك.' },
  'Add entry': { en: 'Add entry', pl: 'Dodaj wpis', ar: 'إضافة إدخال' },
  'Add as new': { en: 'Add as new', pl: 'Dodaj jako nowe', ar: 'أضف كإدخال جديد' },
  'Clear fields': { en: 'Clear fields', pl: 'Wyczyść pola', ar: 'مسح الحقول' },
  'Added so far': { en: 'Added so far', pl: 'Dodane dotąd', ar: 'تمت الإضافة حتى الآن' },
  'Nothing added yet.': { en: 'Nothing added yet.', pl: 'Nie dodano jeszcze nic.', ar: 'لم تتم إضافة أي شيء بعد.' },
  'Edit': { en: 'Edit', pl: 'Edytuj', ar: 'تعديل' },
  'Delete': { en: 'Delete', pl: 'Usuń', ar: 'حذف' },
  'Save': { en: 'Save', pl: 'Zapisz', ar: 'حفظ' },
  'Cancel': { en: 'Cancel', pl: 'Anuluj', ar: 'إلغاء' },
  'Photo (optional)': { en: 'Photo (optional)', pl: 'Zdjęcie (opcjonalne)', ar: 'صورة (اختياري)' },
  'Photo selected.': { en: 'Photo selected.', pl: 'Zdjęcie wybrane.', ar: 'تم اختيار الصورة.' },
  'Ready to save. Here is what you answered:': {
    en: 'Ready to save. Here is what you answered:', pl: 'Gotowe do zapisu. Oto Twoje odpowiedzi:',
    ar: 'جاهز للحفظ. إليك إجاباتك:' },
  'Full name': { en: 'Full name', pl: 'Imię i nazwisko', ar: 'الاسم الكامل' },
  'Job title': { en: 'Job title', pl: 'Stanowisko', ar: 'المسمى الوظيفي' },
  'Target company': { en: 'Target company', pl: 'Firma docelowa', ar: 'الشركة المستهدفة' },
  'Location': { en: 'Location', pl: 'Lokalizacja', ar: 'الموقع' },
  'Phone': { en: 'Phone', pl: 'Telefon', ar: 'الهاتف' },
  'Email': { en: 'Email', pl: 'E-mail', ar: 'البريد الإلكتروني' },
  'Skills': { en: 'Skills', pl: 'Umiejętności', ar: 'المهارات' },
  'Work experience': { en: 'Work experience', pl: 'Doświadczenie zawodowe', ar: 'الخبرة العملية' },
  'Education': { en: 'Education', pl: 'Wykształcenie', ar: 'التعليم' },
  'Certifications': { en: 'Certifications', pl: 'Certyfikaty', ar: 'الشهادات' },
  'Projects': { en: 'Projects', pl: 'Projekty', ar: 'المشاريع' },
  'Languages': { en: 'Languages', pl: 'Języki', ar: 'اللغات' },
  'Professional Summary - 2-3 sentences with your top keywords': {
    en: 'Professional summary - 2-3 sentences with your top keywords',
    pl: 'Podsumowanie zawodowe - 2-3 zdania z najważniejszymi słowami kluczowymi',
    ar: 'الملخص المهني - جملتان أو ثلاث مع أهم الكلمات الرئيسية' },
  'Skills - one per line': { en: 'Skills - one per line', pl: 'Umiejętności - jedna w wierszu', ar: 'المهارات - واحدة في كل سطر' },
  'CV Details': { en: 'CV Details', pl: 'Dane CV', ar: 'بيانات السيرة الذاتية' },
  'Work Experience': { en: 'Work Experience', pl: 'Doświadczenie', ar: 'الخبرة العملية' },
  'Job Match': { en: 'Job Match', pl: 'Dopasowanie do oferty', ar: 'مطابقة الوظيفة' },
  'Analyze keywords': { en: 'Analyze keywords', pl: 'Analizuj słowa kluczowe', ar: 'حلل الكلمات الرئيسية' },
  'Enable the cover letter option to generate it.': {
    en: 'Enable the cover letter option to generate it.',
    pl: 'Włącz opcję listu motywacyjnego, aby go wygenerować.',
    ar: 'فعّل خيار خطاب التغطية لإنشائه.' },
  'ATS COMPLIANCE REPORT': { en: 'ATS COMPLIANCE REPORT', pl: 'RAPORT ZGODNOŚCI ATS', ar: 'تقرير المطابقة مع ATS' },
  'OVERALL ATS SCORE:': { en: 'OVERALL ATS SCORE:', pl: 'OGÓLNY WYNIK ATS:', ar: 'النتيجة الإجمالية لـ ATS:' },
  'Word count:': { en: 'Word count:', pl: 'Liczba słów:', ar: 'عدد الكلمات:' },
  'Headings detected:': { en: 'Headings detected:', pl: 'Wykryte nagłówki:', ar: 'العناوين المكتشفة:' },
  'none': { en: 'none', pl: 'brak', ar: 'لا يوجد' },
  'Score breakdown:': { en: 'Score breakdown:', pl: 'Podział wyniku:', ar: 'تفصيل النتيجة:' },
  'FINDINGS': { en: 'FINDINGS', pl: 'WNIOSKI', ar: 'النتائج' },
  'KEYWORD MATCH vs JOB DESCRIPTION': { en: 'KEYWORD MATCH vs JOB DESCRIPTION', pl: 'DOPASOWANIE SŁÓW KLUCZOWYCH DO OFERTY', ar: 'مطابقة الكلمات الرئيسية مع الوظيفة' },
  'MISSING - weave these naturally into summary, skills, or bullets:': {
    en: 'MISSING - weave these naturally into summary, skills, or bullets:',
    pl: 'BRAKUJE - wpleć je naturalnie w podsumowanie, umiejętności lub osiągnięcia:',
    ar: 'مفقود - أدرجها بشكل طبيعي في الملخص أو المهارات أو الإنجازات:' },
  'Generated by CVBuilder - ATS parsing rules: standard headings, single column,': {
    en: 'Generated by CVBuilder - ATS parsing rules: standard headings, single column,',
    pl: 'Wygenerowane przez CVBuilder - zasady ATS: standardowe nagłówki, jedna kolumna,',
    ar: 'أُنشئ بواسطة CVBuilder - قواعد تحليل ATS: عناوين قياسية، عمود واحد,' },
  'no tables/text boxes/images, contact info in body, 400-800 words, month-year dates.': {
    en: 'no tables/text boxes/images, contact info in body, 400-800 words, month-year dates.',
    pl: 'bez tabel/pól tekstowych/obrazów, dane kontaktowe w treści, 400-800 słów, daty miesiąc-rok.',
    ar: 'بدون جداول أو مربعات نصية أو صور، ومعلومات الاتصال في المتن، و400-800 كلمة، وتواريخ شهر-سنة.' },
  'EXCELLENT - submit with confidence': { en: 'EXCELLENT - submit with confidence', pl: 'DOSKONAŁE - możesz wysłać', ar: 'ممتاز - يمكنك التقديم بثقة' },
  'GOOD - fix the items below to maximize pass rate': { en: 'GOOD - fix the items below to maximize pass rate', pl: 'DOBRE - popraw poniższe elementy', ar: 'جيد - أصلح العناصر أدناه' },
  'NEEDS WORK - address critical items first': { en: 'NEEDS WORK - address critical items first', pl: 'WYMAGA PRACY - najpierw krytyczne', ar: 'يحتاج عملاً - عالج الأمور الحرجة أولاً' },
  'POOR - major ATS blockers present': { en: 'POOR - major ATS blockers present', pl: 'SŁABE - poważne przeszkody ATS', ar: 'ضعيف - عوائق كبيرة أمام ATS' },
  'next': { en: 'Next >', pl: 'Dalej >', ar: 'التالي >' },
  'back': { en: '< Back', pl: '< Wstecz', ar: '< السابق' },
  'No email address found in the document body.': {
    en: 'No email address found in the document body.', pl: 'Nie znaleziono adresu e-mail w treści dokumentu.', ar: 'لم يتم العثور على بريد إلكتروني في متن المستند.' },
  'No phone number found in the document body.': {
    en: 'No phone number found in the document body.', pl: 'Nie znaleziono numeru telefonu w treści dokumentu.', ar: 'لم يتم العثور على رقم هاتف في متن المستند.' },
  'No LinkedIn URL found - recommended for most roles.': {
    en: 'No LinkedIn URL found - recommended for most roles.', pl: 'Nie znaleziono linku do LinkedIn - zalecany dla większości stanowisk.', ar: 'لم يتم العثور على رابط LinkedIn - يُنصح به لمعظم الوظائف.' },
  "No dates found. ATS parses employment history by dates - add month/year (e.g. 'Jun 2021 - Present') to every role.": {
    en: "No dates found. ATS parses employment history by dates - add month/year (e.g. 'Jun 2021 - Present') to every role.",
    pl: "Nie znaleziono dat. ATS analizuje historię zatrudnienia na podstawie dat - dodaj miesiąc/rok (np. 'Cze 2021 - Obecnie') do każdej roli.",
    ar: "لم يتم العثور على تواريخ. يحلل ATS الخبرة حسب التواريخ - أضف شهر/سنة (مثل 'يونيو 2021 - الحالي') لكل وظيفة." },
  "Mixed date formats in experience (both 'Jun 2021' and bare '2021'). Use one consistent format, month + year.": {
    en: "Mixed date formats in experience (both 'Jun 2021' and bare '2021'). Use one consistent format, month + year.",
    pl: "Mieszane formaty dat w doświadczeniu ('Cze 2021' i samo '2021'). Użyj jednego formatu: miesiąc + rok.",
    ar: "تنسيقات تواريخ مختلطة في الخبرة. استخدم تنسيقاً واحداً: شهر + سنة." },
  'Experience is not in reverse-chronological order (a role after it starts later than the previous role). Most recent role must come first.': {
    en: 'Experience is not in reverse-chronological order (a role after it starts later than the previous role). Most recent role must come first.',
    pl: 'Doświadczenie nie jest w odwrotnej kolejności chronologicznej. Najnowsza rola musi być pierwsza.',
    ar: 'الخبرة ليست بترتيب زمني عكسي. يجب أن تكون أحدث وظيفة أولاً.' },
  'Start most bullets with a strong action verb (Led, Designed, Reduced, ...).': {
    en: 'Start most bullets with a strong action verb (Led, Designed, Reduced, ...).',
    pl: 'Zaczynaj większość punktów mocnym czasownikiem (Prowadziłem, Zaprojektowałem, Zredukowałem...).',
    ar: 'ابدأ معظم النقاط بفعل قوي (قاد، صمم، خفّض...).' },
  'No bullet points detected - use bullets for achievements, not paragraphs.': {
    en: 'No bullet points detected - use bullets for achievements, not paragraphs.',
    pl: 'Nie wykryto punktów listy - używaj wypunktowań dla osiągnięć, nie akapitów.',
    ar: 'لم يتم العثور على نقاط - استخدم النقاط للإنجازات وليس الفقرات.' },
  "'References available upon request' is obsolete - remove it.": {
    en: "'References available upon request' is obsolete - remove it.",
    pl: "'Referencje dostępne na życzenie' jest przestarzałe - usuń to.",
    ar: '"المراجع متوفرة عند الطلب" عبارة قديمة - احذفها.' },
  "Title 'Curriculum Vitae' is unnecessary - your name is the title.": {
    en: "Title 'Curriculum Vitae' is unnecessary - your name is the title.",
    pl: "Tytuł 'Curriculum Vitae' jest niepotrzebny - Twoje imię jest tytułem.",
    ar: 'عنوان "السيرة الذاتية" غير ضروري - اسمك هو العنوان.' },
  'Cover Letter': { en: 'Cover Letter', pl: 'List motywacyjny', ar: 'خطاب التغطية' }
};
// Web-only translations are merged into the generated I18N table.
for (const [k, v] of Object.entries(WEB_TEXT)) {
  if (!I18N[k]) I18N[k] = { en: v.en, pl: v.pl, ar: v.ar };
}

/* ------------------------------------------------------------------ boot */
function bindEvents() {
  $$('.lang-btn').forEach((b) => b.addEventListener('click', () => setLanguage(b.dataset.lang)));
  $('#choose-wizard').addEventListener('click', () => {
    ST.settings.dont_ask = $('#dont-ask').checked;
    saveLocal(); setMode('wizard', true);
  });
  $('#choose-tabs').addEventListener('click', () => {
    ST.settings.dont_ask = $('#dont-ask').checked;
    saveLocal(); setMode('tabs', true);
  });
  $('#choose-docx').addEventListener('click', openImport);
  $('#mode-toggle').addEventListener('click', () => setMode(ST.mode === 'wizard' ? 'tabs' : 'wizard'));
  $('#about-btn').addEventListener('click', () => { $('#about-modal').hidden = false; });
  $$('[data-close-modal]').forEach((n) => n.addEventListener('click', () => { $('#about-modal').hidden = true; }));
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    $('#about-modal').hidden = true;
    $('#import-modal').hidden = true;
  });

  // DOCX import: in-page dialog, file is never uploaded or sent anywhere.
  $('#import-btn').addEventListener('click', openImport);
  $$('[data-close-import]').forEach((n) => n.addEventListener('click', () => { $('#import-modal').hidden = true; }));
  const zone = $('#import-zone');
  $('#import-file').addEventListener('change', (e) => {
    const f = e.target.files && e.target.files[0];
    if (f) importReadFile(f);
  });
  zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('dragover'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
  zone.addEventListener('drop', (e) => {
    e.preventDefault();
    zone.classList.remove('dragover');
    const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    if (f) importReadFile(f);
  });
  $('#import-apply').addEventListener('click', importApply);

  $('#wiz-back').addEventListener('click', () => { if (ST.wizStep > 0) { ST.wizStep--; renderWizard(); } });
  $('#wiz-next').addEventListener('click', () => {
    if (ST.wizStep < WIZARD_STEPS.length - 1) { ST.wizStep++; renderWizard(); }
    else buildOutputs(true);
  });
  $('#wiz-jump').addEventListener('change', (e) => { ST.wizStep = parseInt(e.target.value, 10); renderWizard(); });

  $('#edit-answers').addEventListener('click', () => setMode(ST.mode));
  $('#opt-cover').addEventListener('change', (e) => { ST.cover = e.target.checked; if (ST.report) buildOutputs(false, true); });
  $('#opt-photo').addEventListener('change', (e) => { ST.photo = e.target.checked; });
  let jobTimer;
  $('#job-text').addEventListener('input', (e) => {
    ST.jobText = e.target.value;
    clearTimeout(jobTimer);
    jobTimer = setTimeout(() => { if (ST.report) buildOutputs(false, true); }, 350);
  });
  $('#generate-btn').addEventListener('click', generateFiles);
  $$('.theme-btn').forEach((b) => b.addEventListener('click', () => {
    ST.theme = b.dataset.theme; saveLocal(); applyLanguage();
    if (ST.report) buildOutputs(false, true);
  }));
}

function boot() {
  loadLocal();
  bindEvents();
  applyLanguage();
  renderWizard();
  renderTabs();
  if (ST.settings.dont_ask) setMode(ST.mode, true);
  else showPane('chooser');
  // Seed the sample profile on a truly fresh install so the app is demonstrable.
  if (!localStorage.getItem(PROFILE_KEY) && !ST.profile.name) {
    ST.profile = clone(SAMPLE);
    saveLocal();
    renderWizard(); renderTabs();
  }
}

boot();

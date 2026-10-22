// Words a children's game does not carry: slurs, sex, hate, self-harm, strong swearing. A server-side filter for chat and
// for names, because the filter in the browser can be skipped by anyone who sends the message by hand.
//
// The lists are stored ROT13-encoded on purpose: the repository is public, and a file that is nothing but those words
// is not something to leave lying around in plain text. A heuristic, not a promise: it normalises look-alike characters
// (f.u.c.k, fvck, fuuuck), checks severe terms anywhere in the text with the spaces and symbols taken out, and short or
// ordinary-looking ones only as whole words (so "class" and "Essex" are fine).
const rot13 = s => s.replace(/[a-z]/gi, c => String.fromCharCode((c <= 'Z' ? 90 : 122) >= (c = c.charCodeAt(0) + 13) ? c : c - 26));
const SUBSTRING_TERMS = ["avtt", "snttbg", "sntbg", "phag", "shpx", "fuvg", "ovgpu", "nffubyr", "juber", "fyhg", "ergneq", "intvan", "qvyqb", "oybjwbo", "unaqwbo", "cbea", "uragnv", "wvmm", "betnfz", "znfgheong", "obbo", "gvggvr", "ahqr", "anxrq", "uvgyre", "xvyylbhefrys", "fhvpvqr", "crqb", "zbyrfg", "orurnqvat", "vaprfg", "onfgneq", "qvpxurnq", "pbpxfhpxre", "zbgureshpx", "jnaxre", "gjng", "obyybpx", "chffl", "frzra", "rerpgvba", "xxx", "juvgrcbjre", "urvyuvgyre", "sipx"].map(rot13);
const WORD_TERMS = ["nff", "qvpx", "pbpx", "penc", "qnza", "cvff", "jgs", "fgsh", "frk", "frkl", "phz", "gvgf", "gvg", "snt", "sntf", "xvxr", "puvax", "tbbx", "pbba", "cnxv", "fcvp", "genaal", "anmv", "anmvf", "encr", "encrq", "encrf", "encvat", "nany", "xlf", "urvy", "kkk", "afsj", "ergneqf", "ergneqrq", "tber", "spx", "shx", "fung", "ubr", "gubg", "jube", "qhzonff", "wnpxnff", "encvfg", "encvfgf", "cravf", "sipx"].map(rot13);
const LEET = { '0': 'o', '1': 'i', '!': 'i', '|': 'i', '3': 'e', '4': 'a', '@': 'a', '5': 's', '$': 's', '7': 't', '+': 't' };
// the term with every letter allowed to repeat: "fuck" also catches "fuuuck"
const loose = t => t.split('').map(c => c + '+').join('');
const SUB_RX = new RegExp(SUBSTRING_TERMS.map(loose).join('|'));
const WORD_RX = new RegExp('^(?:' + WORD_TERMS.map(loose).join('|') + ')$');
function normalise(text) {
  return String(text == null ? '' : text).normalize('NFKD')
    .replace(/[\u0300-\u036f\u200b-\u200f\u2060\ufeff]/g, '')       // accents and zero-width characters
    .toLowerCase().replace(/[0-9!|@$+]/g, c => LEET[c] || c);
}
function isBlocked(text) {
  const n = normalise(text);
  const squashed = n.replace(/[^a-z]/g, '');
  if (SUB_RX.test(squashed)) return true;
  const toks = n.split(/[^a-z]+/).filter(Boolean);
  if (toks.some(tok => WORD_RX.test(tok))) return true;
  // letters spelled out one at a time ("a s s", "k.y.s"): a run of single letters is read as one word
  let run = '';
  for (const tok of [...toks, '']) {
    if (tok.length === 1) run += tok;
    else { if (run.length >= 2 && WORD_RX.test(run)) return true; run = ''; }
  }
  return false;
}
const REPLACEMENT = 'what just happened?';
// What is relayed to everyone else for a chat line: the line itself, or a harmless one if it is not fit to show.
function cleanChat(text) {
  const t = String(text == null ? '' : text).replace(/[\u0000-\u001f\u007f]/g, ' ').trim();
  if (!t) return '';
  return isBlocked(t) ? REPLACEMENT : t;
}
// An account or nickname: null if it is fine, else why not.
function nameProblem(name) {
  const t = String(name == null ? '' : name).trim();
  if (isBlocked(t)) return 'That name is not allowed. Pick another one.';
  return null;
}
// How a name is SHOWN to other people: an account that already has a name this filter would refuse is "Player" and four digits.
function safeDisplayName(name) {
  const t = String(name == null ? '' : name);
  if (!isBlocked(t)) return t;
  let h = 0; for (let i = 0; i < t.length; i++) h = (h * 31 + t.charCodeAt(i)) >>> 0;
  return 'Player' + (1000 + h % 9000);
}
module.exports = { isBlocked, cleanChat, nameProblem, safeDisplayName, REPLACEMENT };

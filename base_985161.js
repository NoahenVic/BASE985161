// Base-985161 encoder/decoder (ES module + simple CLI)
// Radix: 985,161 (not a power of two)
// Alphabet: U+10000 .. U+10000+985160 (avoids surrogates)
// Method: big-integer base conversion (256 <-> 985,161) with leading-zero preservation

export const BASE = 985161;
export const CP_START = 0x10000;
export const CP_END   = CP_START + BASE - 1;

export function valToChar(v){
  if (v < 0 || v >= BASE) throw new RangeError('digit out of range');
  return String.fromCodePoint(CP_START + v);
}
export function charToVal(ch){
  const cp = ch.codePointAt(0);
  if (cp < CP_START || cp > CP_END) throw new Error(`Invalid Base-985161 character U+${cp.toString(16).toUpperCase()}`);
  return cp - CP_START;
}

// Divide big-int represented as digits[] (baseFrom, MSB-first) by divisor; return [quotientDigits, remainder]
function divmodNumber(digits, baseFrom, divisor){
  const q = [];
  let rem = 0;
  for (let i=0;i<digits.length;i++){
    const acc = rem * baseFrom + digits[i];
    const d = Math.floor(acc / divisor);
    rem = acc % divisor;
    if (q.length || d !== 0) q.push(d);
  }
  return [q, rem];
}

export function encode(bytes){
  if (!bytes || bytes.length === 0) return valToChar(0);

  // Count leading zero bytes
  let zeros = 0; while (zeros < bytes.length && bytes[zeros] === 0) zeros++;

  let digits256 = Array.from(bytes); // MSB-first
  const outVals = [];
  while (digits256.length){
    const [q, rem] = divmodNumber(digits256, 256, BASE);
    outVals.push(rem);
    digits256 = q;
  }
  // Add markers for leading zero bytes
  for (let i=0;i<zeros;i++) outVals.push(0);
  outVals.reverse();
  return outVals.map(valToChar).join('');
}

export function decode(text){
  if (!text || text.length === 0) return new Uint8Array();
  const digitsB = [];
  for (let i=0;i<text.length;){
    const cp = text.codePointAt(i);
    i += (cp > 0xFFFF ? 2 : 1);
    if (cp < CP_START || cp > CP_END) throw new Error(`Invalid Base-985161 digit U+${cp.toString(16).toUpperCase()}`);
    digitsB.push(cp - CP_START);
  }
  // Count leading zero-digits
  let zeros = 0; for (const v of digitsB){ if (v===0) zeros++; else break; }

  const out = [];
  let arr = digitsB.slice();
  while (arr.length){
    const [q, rem] = divmodNumber(arr, BASE, 256);
    out.push(rem);
    arr = q;
  }
  for (let i=0;i<zeros;i++) out.push(0);
  out.reverse();
  return new Uint8Array(out);
}

// -------------- CLI (Node) --------------
if (typeof process !== 'undefined' && import.meta.url === `file://${process.argv[1]}`){
  const fs = await import('node:fs');
  const args = process.argv.slice(2);
  if (args.length < 1 || !['enc','dec'].includes(args[0])){
    console.error('Usage: node base985161.js enc|dec [infile|-] [outfile|-]');
    process.exit(2);
  }
  const mode = args[0];
  const inf  = args[1] ?? '-';
  const outf = args[2] ?? '-';

  if (mode === 'enc'){
    const data = inf === '-' ? await readStdinBin() : fs.readFileSync(inf);
    const text = encode(new Uint8Array(data));
    if (outf === '-') process.stdout.write(text);
    else fs.writeFileSync(outf, text, 'utf8');
  } else {
    const text = inf === '-' ? await readStdinTxt() : fs.readFileSync(inf, 'utf8');
    const bytes = decode(text);
    if (outf === '-') process.stdout.write(Buffer.from(bytes));
    else fs.writeFileSync(outf, Buffer.from(bytes));
  }
}

async function readStdinBin(){ const chunks=[]; for await (const c of process.stdin) chunks.push(c); return Buffer.concat(chunks); }
async function readStdinTxt(){ const buf = await readStdinBin(); return buf.toString('utf8'); }

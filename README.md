[![npm](https://img.shields.io/npm/v/base985161)](https://www.npmjs.com/package/base985161)

 # BASE-985161 — Binary-to-Text via Big-Integer Conversion

**BASE-985161** encodes any byte stream as text using a Unicode alphabet of 985,161 symbols (from U+10000 upward). It preserves leading zero bytes and performs true base conversion (256 <-> 985,161), similar to Base58 but at a much larger radix.

## Why
- **Symbol-dense:** its larger radix uses fewer Unicode code points than Base64 uses ASCII characters.
- **Reversible:** lossless round-trip; leading zeros preserved.
- **Dependency-free:** the JavaScript and Python implementations use their standard libraries only.

## Web (one-page)
Open `index.html` in your browser. Type text or upload a file -> **ENCODE**. Paste encoded text -> **DECODE**.

## Python
```bash
python base985161.py enc input.bin out.b985161
python base985161.py dec out.b985161 restored.bin
```
```python
import base985161  # if placed on PYTHONPATH
s = base985161.encode(b"Hello")
raw = base985161.decode(s)
```

## Node / JavaScript
```bash
npm install base985161
# or: npm install -g base985161
```
```bash
node base985161.js enc input.bin out.b985161
node base985161.js dec out.b985161 restored.bin
# or via npm bin:
base985161 enc input.bin out.b985161
base985161 dec out.b985161 restored.bin
```
```js
import { encode, decode } from 'base985161';
const s = encode(new TextEncoder().encode('Hello'));
const raw = decode(s);
```

## Design Notes
- Alphabet: contiguous Unicode range **U+10000 .. U+10000+985160** (avoids surrogates).
- Method: big-integer division (repeated div/mod) for 256<->985161, preserving leading 0x00 bytes via leading zero-digits.
- No padding header is needed because conversion is exact in base arithmetic.

## Caveats
- Fewer symbols does not mean fewer bytes: every alphabet symbol occupies four bytes in UTF-8, so Base64 is generally smaller on disk or over the network.
- Encoded text can contain unassigned or noncharacter code points. Some editors, chats, databases, normalizers, and interchange formats may alter or reject it; only exact, code-point-preserving transport is safe.
- Repeated division is quadratic for large inputs. Use this implementation for experiments and modest files, not bulk data.
- Some glyphs may render as tofu; decoding uses code points, not glyph shapes.
- Not encryption: this is an encoding, not a security mechanism.

## Tests
```bash
npm test
```

## License
MIT

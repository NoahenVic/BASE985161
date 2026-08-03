#!/usr/bin/env python3
"""
Base-985161 encoder/decoder (Python)

- Radix: 985,161 (not a power of two)
- Alphabet: contiguous Unicode code points U+10000 .. U+10000+985160
  (stays clear of surrogates; safe scalar values)
- Method: big-integer base conversion (256 <-> 985,161) with leading-zero preservation

Usage:
    python base985161.py enc input.bin output.b985161
    python base985161.py dec input.b985161 output.bin

    # or via stdin/stdout
    cat file | python base985161.py enc - - > out.b985161
    cat out.b985161 | python base985161.py dec - - > file
"""
from __future__ import annotations
import sys
from typing import List, Tuple

BASE = 985_161
CP_START = 0x10000
CP_END   = CP_START + BASE - 1

# ---------------- Alphabet mapping ----------------

def val_to_char(v: int) -> str:
    if not (0 <= v < BASE):
        raise ValueError("digit out of range")
    return chr(CP_START + v)


def char_to_val(ch: str) -> int:
    cp = ord(ch)
    if not (CP_START <= cp <= CP_END):
        raise ValueError(f"Invalid Base-985161 character U+{cp:04X}")
    return cp - CP_START

# ---------------- Core big-int helpers ----------------

def _divmod_number(digits: List[int], base_from: int, divisor: int) -> Tuple[List[int], int]:
    """Divide big-int given as digits (base_from, MSB-first) by `divisor`.
    Returns (quotient_digits (MSB-first, no leading zeros), remainder).
    """
    q: List[int] = []
    rem = 0
    for d in digits:
        acc = rem * base_from + d
        q_digit = acc // divisor
        rem = acc % divisor
        if q or q_digit != 0:
            q.append(q_digit)
    return q, rem

# ---------------- Public API ----------------

def encode(data: bytes) -> str:
    """Encode arbitrary bytes to Base-985161 text.
    Preserves leading 0x00 bytes by emitting leading zero-digits.
    """
    if not data:
        return ""

    # Count leading zero bytes
    zeros = 0
    for b in data:
        if b == 0:
            zeros += 1
        else:
            break

    # Convert base-256 digits -> base-985161 by repeated div/mod
    # Leading zeros are markers, not part of the numeric payload.
    digits256 = list(data[zeros:])  # MSB-first
    out_vals: List[int] = []
    while digits256:
        digits256, rem = _divmod_number(digits256, 256, BASE)
        out_vals.append(rem)
    # Most-significant first
    out_vals.reverse()
    return ''.join(val_to_char(v) for v in ([0] * zeros + out_vals))


def decode(text: str) -> bytes:
    """Decode Base-985161 text back to bytes.
    Restores leading zero bytes from leading zero-digits.
    """
    if not text:
        return b""

    # Convert text to base-BASE digits (MSB-first)
    digitsB = [char_to_val(ch) for ch in text]

    # Count leading zeros (digit value 0)
    zeros = 0
    for v in digitsB:
        if v == 0:
            zeros += 1
        else:
            break

    # Convert to base-256 via repeated division
    out: List[int] = []
    # Exclude zero markers from the numeric conversion.
    digitsB = digitsB[zeros:]
    while digitsB:
        digitsB, rem = _divmod_number(digitsB, BASE, 256)
        out.append(rem)
    # MSB-first: reverse remainders
    out.reverse()
    return bytes([0] * zeros + out)

# ---------------- CLI ----------------

def main(argv: List[str]) -> int:
    if len(argv) < 2 or argv[1] not in ("enc", "dec"):
        print("Usage: base985161.py enc|dec [infile|-] [outfile|-]", file=sys.stderr)
        return 2
    mode = argv[1]
    inf  = argv[2] if len(argv) > 2 else "-"
    outf = argv[3] if len(argv) > 3 else "-"

    if mode == "enc":
        if inf == "-":
            data = sys.stdin.buffer.read()
        else:
            with open(inf, "rb") as input_file:
                data = input_file.read()
        txt = encode(data)
        if outf == "-":
            sys.stdout.write(txt)
        else:
            with open(outf, "w", encoding="utf-8") as output_file:
                output_file.write(txt)
    else:
        if inf == "-":
            txt = sys.stdin.read()
        else:
            with open(inf, "r", encoding="utf-8") as input_file:
                txt = input_file.read()
        raw = decode(txt)
        if outf == "-":
            sys.stdout.buffer.write(raw)
        else:
            with open(outf, "wb") as output_file:
                output_file.write(raw)
    return 0

if __name__ == "__main__":
    raise SystemExit(main(sys.argv))

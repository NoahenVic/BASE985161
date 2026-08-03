import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

import {
  BASE,
  CP_END,
  CP_START,
  charToVal,
  decode,
  encode,
  valToChar,
} from '../base985161.js';

function assertRoundTrip(values) {
  const source = Uint8Array.from(values);
  assert.deepEqual(decode(encode(source)), source);
}

test('alphabet boundaries map in both directions', () => {
  assert.equal(charToVal(String.fromCodePoint(CP_START)), 0);
  assert.equal(charToVal(String.fromCodePoint(CP_END)), BASE - 1);
  assert.equal(valToChar(0), String.fromCodePoint(CP_START));
  assert.equal(valToChar(BASE - 1), String.fromCodePoint(CP_END));
});

test('empty input has an empty canonical representation', () => {
  assert.equal(encode(new Uint8Array()), '');
  assert.deepEqual(decode(''), new Uint8Array());
});

test('leading and all-zero byte sequences round-trip exactly', () => {
  for (const values of [
    [0],
    [0, 0],
    [0, 0, 0],
    [0, 1],
    [0, 0, 1],
    [0, 255],
    [0, 0, 255, 0],
  ]) {
    assertRoundTrip(values);
  }
});

test('representative payloads round-trip exactly', () => {
  assertRoundTrip([72, 101, 108, 108, 111]);
  assertRoundTrip(Array.from({ length: 256 }, (_, index) => index));

  let state = 0x985161;
  for (let length = 0; length <= 512; length += 1) {
    const values = Array.from({ length }, () => {
      state = (1664525 * state + 1013904223) >>> 0;
      return state >>> 24;
    });
    assertRoundTrip(values);
  }
});

test('invalid digits and alphabet values are rejected', () => {
  assert.throws(() => valToChar(-1), RangeError);
  assert.throws(() => valToChar(BASE), RangeError);
  assert.throws(() => charToVal(''), TypeError);
  assert.throws(() => charToVal('ab'), TypeError);
  assert.throws(() => decode('A'), /Invalid Base-985161 digit/);
});

test('CLI entry point runs and prints usage on this platform', () => {
  const cliPath = fileURLToPath(new URL('../base985161.js', import.meta.url));
  const result = spawnSync(process.execPath, [cliPath], { encoding: 'utf8' });

  assert.equal(result.status, 2);
  assert.match(result.stderr, /Usage: node base985161\.js enc\|dec/);
});

test('CLI round-trips a binary file', t => {
  const directory = mkdtempSync(join(tmpdir(), 'base985161-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));

  const cliPath = fileURLToPath(new URL('../base985161.js', import.meta.url));
  const inputPath = join(directory, 'input.bin');
  const encodedPath = join(directory, 'encoded.b985161');
  const decodedPath = join(directory, 'decoded.bin');
  const source = Buffer.from([0, 0, 1, 2, 3, 127, 128, 254, 255, 0]);
  writeFileSync(inputPath, source);

  const encoded = spawnSync(process.execPath, [cliPath, 'enc', inputPath, encodedPath], { encoding: 'utf8' });
  assert.equal(encoded.status, 0, encoded.stderr);

  const decoded = spawnSync(process.execPath, [cliPath, 'dec', encodedPath, decodedPath], { encoding: 'utf8' });
  assert.equal(decoded.status, 0, decoded.stderr);
  assert.deepEqual(readFileSync(decodedPath), source);
});

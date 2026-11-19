import { describe, expect, it } from 'vitest';
import { encodeSwissQRCode } from '../../src/index.js';
import { cornerMarks, mm, qrCodePath, scissors, swissCross } from '../../src/layout/shapes.js';

/** The numbers of path data, as [x, y] pairs. */
function points(d: string): [number, number][] {
  const numbers = (d.match(/-?\d+(\.\d+)?/g) ?? []).map(Number);
  const pairs: [number, number][] = [];
  for (let i = 0; i + 1 < numbers.length; i += 2) pairs.push([numbers[i] ?? 0, numbers[i + 1] ?? 0]);
  return pairs;
}

describe('mm', () => {
  it('writes at most four decimals, without trailing zeros', () => {
    expect(mm(86.5)).toBe('86.5');
    expect(mm(1 / 3)).toBe('0.3333');
    expect(mm(2)).toBe('2');
  });
});

describe('cornerMarks', () => {
  it('draws four right angles of 3 mm, 0.75 pt thick, at the corners of the field', () => {
    expect(cornerMarks({ x: 10, y: 20, width: 40, height: 15 })).toEqual({
      type: 'path',
      d: 'M10 23V20H13M47 20H50V23M50 32V35H47M13 35H10V32',
      stroke: { width: 0.75 },
    });
  });
});

describe('qrCodePath', () => {
  it('draws one rectangle per run of dark modules, scaled to the box', () => {
    const qrCode = encodeSwissQRCode('SPC');
    const path = qrCodePath(qrCode, { x: 0, y: 0, width: 21, height: 21 });
    expect(path.fill).toBe('black');
    const runs = qrCode.modules.flatMap((row) => row.map((dark, i) => dark && row[i - 1] !== true)).filter(Boolean);
    expect(path.d.match(/M/g)).toHaveLength(runs.length);
    // The top left finder pattern: a row of 7 dark modules from the corner.
    expect(path.d.startsWith('M0 0H7V1H0Z')).toBe(true);
  });
});

describe('swissCross (chapter 6.4.2)', () => {
  it('draws a white border, a black square and a white cross, 7 × 7 mm, centred', () => {
    const [border, square, cross] = swissCross(100, 50);
    expect(border).toEqual({ type: 'path', d: 'M96.5 46.5H103.5V53.5H96.5Z', fill: 'white' });
    expect(square).toEqual({ type: 'path', d: 'M97 47H103V53H97Z', fill: 'black' });
    expect(cross?.fill).toBe('white');
    // Arms one sixth longer than wide: the cross spans 20 units of 32 of the square, each arm 6 units wide.
    const [horizontal = '', vertical = ''] = (cross?.d ?? '').split('Z');
    const size = (rectangle: string) => {
      const [x0 = 0, y0 = 0, x1 = 0, y1 = 0] = (rectangle.match(/-?\d+(\.\d+)?/g) ?? []).map(Number);
      return [x1 - x0, y1 - y0];
    };
    expect(size(horizontal)).toEqual([expect.closeTo((6 * 20) / 32, 6), expect.closeTo((6 * 6) / 32, 6)]);
    expect(size(vertical)).toEqual([expect.closeTo((6 * 6) / 32, 6), expect.closeTo((6 * 20) / 32, 6)]);
  });
});

describe('scissors', () => {
  it('draws a stroked symbol of about 4.6 × 2.4 mm across the point, turned on a vertical line', () => {
    for (const direction of ['right', 'down'] as const) {
      const symbol = scissors(50, 50, direction);
      expect('stroke' in symbol && symbol.stroke.width).toBe(0.5);
      const xs = points(symbol.d).map(([x]) => x);
      const ys = points(symbol.d).map(([, y]) => y);
      const [width, height] = [Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)];
      expect(direction === 'right' ? [width, height] : [height, width]).toEqual([
        expect.closeTo(4.55, 1),
        expect.closeTo(2.4, 1),
      ]);
    }
  });
});

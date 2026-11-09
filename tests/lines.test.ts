import { describe, expect, it } from 'vitest';
import { lineText, swapText, swapsFor } from '../src/lib/lines';
import { parseLine } from '../src/lib/units';

const swap = (src: string, n = 0) => {
  const line = parseLine(src);
  return swapText(line, swapsFor(line.ing)[n]);
};

describe('line text', () => {
  it('reads like a recipe', () => {
    expect(lineText(parseLine('2 pc onion'))).toBe('2 onions');
    expect(lineText(parseLine('1 pc onion'))).toBe('1 onion');
    expect(lineText(parseLine('3 clove garlic'))).toBe('3 cloves garlic');
    expect(lineText(parseLine('2 tbsp lemon'))).toBe('2 tbsp lemon juice');
    expect(lineText(parseLine('taste salt'))).toBe('Salt, to taste');
  });
});

describe('swap amounts follow the recipe amount', () => {
  it('buttermilk -> milk + lemon juice', () => {
    expect(swap('250 ml buttermilk')).toBe('250 ml milk + 1 tbsp lemon juice');
    expect(swap('500 ml buttermilk')).toBe('500 ml milk + 2 tbsp lemon juice');
  });
  it('cream -> milk + butter (ml to g at 1:1)', () => {
    expect(swap('200 ml cream')).toBe('150 ml milk + 50 g butter');
  });
  it('a count line uses the per-piece amount', () => {
    expect(swap('4 clove garlic')).toBe('½ tsp garlic powder');
    expect(swap('2 pc eggs')).toBe('6 tbsp Greek yoghurt');
    expect(swap('1 tin chopped-tomatoes', 1)).toBe('5 tomatoes');
  });
  it('spoon lines convert before the factor', () => {
    expect(swap('2 tbsp mirin')).toBe('2 tbsp rice vinegar + 2 tsp sugar');
    expect(swap('200 g self-raising-flour')).toBe('200 g plain flour + 2⅔ tsp baking powder');
  });
  it('fresh herbs to dried use about a third', () => {
    expect(swap('3 tbsp parsley', 1)).toBe('1 tbsp dried mixed herbs');
    expect(swap('4 sprig thyme')).toBe('1 tsp dried thyme');
  });
});

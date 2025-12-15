const add = (a: number, b: number) => a + b;

describe('add', () => {
  it('returns the sum of two numbers', () => {
    expect(add(2, 3)).toBe(5);
  });
});


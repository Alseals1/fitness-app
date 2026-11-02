import { PUBLIC_PLACE_COLUMNS, PUBLIC_PLACE_SELECT } from './places';

const PRIVATE_COLUMNS = ['submitted_by', 'claimed_by'];

describe('PUBLIC_PLACE_COLUMNS', () => {
  it('leaves out the columns that hold user ids', () => {
    for (const column of PRIVATE_COLUMNS) {
      expect(PUBLIC_PLACE_COLUMNS).not.toContain(column);
    }
  });

  it('has no duplicates', () => {
    expect(new Set(PUBLIC_PLACE_COLUMNS).size).toBe(PUBLIC_PLACE_COLUMNS.length);
  });
});

describe('PUBLIC_PLACE_SELECT', () => {
  it('is the comma-joined column list', () => {
    expect(PUBLIC_PLACE_SELECT).toBe(PUBLIC_PLACE_COLUMNS.join(','));
    expect(PUBLIC_PLACE_SELECT).not.toContain('*');
  });
});

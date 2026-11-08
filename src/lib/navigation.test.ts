// Node types only for this test (tsconfig keeps them out of app code): it checks a route file exists.
/// <reference types="node" />
import fs from 'fs';
import path from 'path';

import { rootStackSettings } from './navigation';

describe('rootStackSettings', () => {
  it('anchors deep links on home', () => {
    expect(rootStackSettings.anchor).toBe('index');
  });

  it('names a real route file, so renaming home cannot silently drop the back arrow', () => {
    const route = path.join(__dirname, '../app', `${rootStackSettings.anchor}.tsx`);
    expect(fs.existsSync(route)).toBe(true);
  });
});

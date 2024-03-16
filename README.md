# sb3fix

https://turbowarp.github.io/sb3fix/

Fix corrupted Scratch projects.

## API

Install with:

```bash
npm install @turbowarp/sb3fix
```

Then use from Node.js:

```js
const sb3fix = require('@turbowarp/sb3fix');
const fs = require('fs');

const run = async () => {
  const projectData = fs.readFileSync('your-broken-project.sb3');
  const result = await sb3fix(projectData); // projectData can be ArrayBuffer, Uint8Array-like, Blob, or File

  console.log(result);

  const success = result.success; // success is boolean
  if (success) {
    const fixedZip = result.fixedZip; // fixedZip is ArrayBuffer
    const log = result.log; // log is Array of strings
  } else {
    const error = result.error; // error is any type (probably an Error, but not necessarily)
  }

  // sb3fix is deterministic: the same input project always produces the same output
};

run();
```

## Development

Install things:

```bash
git clone https://github.com/TurboWarp/sb3fix.git
cd sb3fix
npm ci
```

Source code is in the src folder. During development do:

```bash
npm run watch
```

Then open dist/index.html in your favorite browser.

For the final build:

```bash
npm run build
```

All changes should have a corresponding test. Add test sb3 files in tests/samples, then run:

```bash
npm run update
```

Then check that the changes in tests/expected-output match what you expect. No unexpected changes! You can check if all the tests still pass with:

```bash
npm run test
```

## License

Copyright (C) 2023-2024 Thomas Weber

This Source Code Form is subject to the terms of the Mozilla Public
License, v. 2.0. If a copy of the MPL was not distributed with this
file, You can obtain one at https://mozilla.org/MPL/2.0/.

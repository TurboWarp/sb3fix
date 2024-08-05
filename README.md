# sb3fix

https://turbowarp.github.io/sb3fix/

Fix corrupted Scratch 3 projects.

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
  // Fix a .sb3 or .sprite3 with sb3fix.fixZip()
  // Input can be an ArrayBuffer, Uint8Array, Blob, File, or Node.js Buffer.
  // Output will be Uint8Array.
  // This method returns a Promise. If there is an error, that promise will reject.
  const brokenZip = fs.readFileSync('your-broken-project.sb3');
  const fixedZip = await sb3fix.fixZip(brokenZip);
  console.log(fixedZip);

  // Fix just a project.json or sprite.json with sb3fix.fixJSON()
  // Input can be a parsed project.json object or a parsed sprite.json object or a string.
  // If the input is an object, that object will be modified in-place instead of being copied.
  // Output will be a parsed project.json object or a parsed sprite.json object depending on input.
  // This method is NOT async. If there is an error, a plain JavaScript error will be thrown.
  const brokenJSON = fs.readFileSync('your-broken-project.json', 'utf-8');
  const fixedJSON = sb3fix.fixJSON(brokenJSON);
  console.log(fixedJSON);

  // sb3fix is deterministic. The same input will always give the same output, bit-for-bit.

  // Both sb3fix methods take in an optional options object.
  const options = {
    // While sb3fix runs, it'll log what it's doing and what it fixed. You can monitor those
    // using this callback. These messages are primarily a debugging tool, so the exact output
    // is not stable and may change without warning.
    logCallback: (message) => {
      console.log(message);
    }
  };
  // To use the above options, just supply as the second argument when you call sb3fix:
  await sb3fix.fixZip(brokenZip, options);
  sb3fix.fixJSON(brokenJSON, options);
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
npm start
```

Then open dist/index.html in your favorite browser (there isn't a localhost development server).

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

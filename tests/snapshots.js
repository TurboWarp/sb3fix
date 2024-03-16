const fs = require('node:fs');
const path = require('node:path');
const sb3fix = require('../src/sb3fix');

const samplesDirectory = path.join(__dirname, 'samples');
const testFiles = fs.readdirSync(samplesDirectory).filter(i => i.endsWith('.sb3'));

const validate = async () => {
  throw new Error('TODO');
};

const generate = async () => {
  throw new Error('TODO');

  for (const file of testFiles) {
    const data = fs.readFileSync(path.join(samplesDirectory, file));
    const fixed = await sb3fix(data);
    console.log(fixed);
  }
};

const run = async () => {
  if (process.argv.includes('--generate')) {
    await generate();
  } else if (process.argv.includes('--validate')) {
    await validate();
  } else {
    console.log('Please supply --generate or --validate');
    process.exit(1);
  }
};

run()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });

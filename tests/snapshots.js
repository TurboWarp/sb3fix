const fs = require('node:fs');
const fsPromises = require('node:fs/promises');
const path = require('node:path');
const nodeTest = require('node:test');
const assert = require('node:assert');
const {rimraf} = require('rimraf');

const sb3fix = require('../src/sb3fix');

const inputDirectory = path.join(__dirname, 'samples');
const outputDirectory = path.join(__dirname, 'expected-output');
const testcases = fs.readdirSync(inputDirectory)
  .filter(i => i.endsWith('.sb3'))
  .sort()
  .map(i => ({
    name: i,
    inputPath: path.join(inputDirectory, i),
    outputProjectPath: path.join(outputDirectory, i),
    outputLogPath: path.join(outputDirectory, i.replace(/\.sb3$/, '.txt')),
  }));

const runTestcase = async (testcase) => {
  const data = await fsPromises.readFile(testcase.inputPath);
  const result = await sb3fix(data);
  return {
    fixedZip: new Uint8Array(result.fixedZip),
    log: result.log.join('\n')
  };
};

const validate = async () => {
  for (const testcase of testcases) {
    await nodeTest(testcase, async (t) => {
      const expectedFixedProject = new Uint8Array(await fsPromises.readFile(testcase.outputProjectPath));
      const expectedLog = await fsPromises.readFile(testcase.outputLogPath, 'utf-8');
      const result = await runTestcase(testcase);

      assert.equal(result.log, expectedLog, 'log');
      assert.deepStrictEqual(result.fixedZip, expectedFixedProject, 'project');
    });
  }
};

const update = async () => {
  console.time('Updated snapshots');

  await rimraf(outputDirectory);
  await fsPromises.mkdir(outputDirectory, {
    recursive: true
  });

  for (const testcase of testcases) {
    console.log(`${testcase.name} ...`);
    const result = await runTestcase(testcase);
    await fsPromises.writeFile(testcase.outputProjectPath, result.fixedZip);
    await fsPromises.writeFile(testcase.outputLogPath, result.log);
  }

  console.timeEnd('Updated snapshots');
};

const run = async () => {
  if (process.argv.includes('--update')) {
    await update();
  } else if (process.argv.includes('--validate')) {
    await validate();
  } else {
    console.log('Please supply --update or --validate');
    process.exit(1);
  }
};

run()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });

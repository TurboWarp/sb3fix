const fs = require('node:fs');
const fsPromises = require('node:fs/promises');
const path = require('node:path');
const nodeTest = require('node:test');
const assert = require('node:assert');

const sb3fix = require('../src/sb3fix');

const inputDirectory = path.join(__dirname, 'samples');
const outputDirectory = path.join(__dirname, 'expected-output');

/** @type {Array<import('../src/sb3fix').Platform>} */
const nonScratchPlatforms = Object.keys(sb3fix.platforms).filter(i => i !== 'scratch');

const testcases = fs.readdirSync(inputDirectory)
  .filter(i => i.endsWith('.sb3') || i.endsWith('.sprite3'))
  .sort();

/**
 * @typedef Result
 * @property {Uint8Array} result
 * @property {string} log
 */

/**
 * @param {string} testcase
 * @param {import('../src/sb3fix').Platform} platform
 * @returns {string}
 */
const getOutputProjectPath = (testcase, platform) => {
  if (platform === 'scratch') {
    return path.join(outputDirectory, testcase);
  }
  return path.join(outputDirectory, platform, testcase);
};

/**
 * 
 * @param {string} testcase
 * @param {import('../src/sb3fix').Platform} platform
 * @returns {string}
 */
const getOutputLogPath = (testcase, platform) => {
  const name = testcase.replace(/\.(?:sb|sprite)3$/, '.txt');
  if (platform === 'scratch') {
    return path.join(outputDirectory, name);
  }
  return path.join(outputDirectory, platform, name);
};

/**
 * @param {string} testcase
 * @param {import('../src/sb3fix').Platform} platform
 * @returns {Promise<Result>}
 */
const runTestcase = async (testcase, platform) => {
  const logs = [];
  const inputPath = path.join(inputDirectory, testcase);
  const data = await fsPromises.readFile(inputPath);
  const result = await sb3fix.fixZip(data, {
    platform,
    logCallback: (message) => {
      logs.push(message);
    }
  });
  return {
    result,
    log: logs.join('\n')
  };
};

/**
 * @param {Uint8Array} a
 * @param {Uint8Array} b
 * @returns {boolean}
 */
const areArraysShallowEqual = (a, b) => {
  if (a.length !== b.length) {
    return false;
  }
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) {
      return false;
    }
  }
  return true;
};

/**
 * @param {Result} resultA
 * @param {Result} resultB
 * @returns {boolean}
 */
const isIdenticalResult = (resultA, resultB) => (
  resultA.log === resultB.log &&
  areArraysShallowEqual(resultA.result, resultB.result)
);

/**
 * @param {Result} resultA
 * @param {Result} resultB
 */
const assertIdenticalResults = (resultA, resultB) => {
  assert.strictEqual(resultA.log, resultB.log, 'log');
  assert.deepStrictEqual(resultA.result, resultB.result, 'project');
};

const validate = async () => {
  for (const testcase of testcases) {
    await nodeTest(testcase, async () => {
      /** @type {Result|null} */
      let expectedScratchResult = null;

      await nodeTest("scratch", async () => {
        expectedScratchResult = await readResult(testcase, 'scratch');
        assert.notStrictEqual(expectedScratchResult, null, 'scratch expected result exists');

        const actualResult = await runTestcase(testcase, 'scratch');
        assertIdenticalResults(expectedScratchResult, actualResult);
      });

      for (const platform of nonScratchPlatforms) {
        await nodeTest(platform, async () => {
          const expectedResult = await readResult(testcase, platform) || expectedScratchResult;
          const actualResult = await runTestcase(testcase, platform);
          assertIdenticalResults(expectedResult, actualResult);
        });
      }
    });
  }
};

/**
 * @param {string} testcase
 * @param {import('../src/sb3fix').Platform} platform
 * @returns {Promise<Result|null>}
 */
const readResult = async (testcase, platform) => {
  const outputProjectPath = getOutputProjectPath(testcase, platform);
  const outputLogPath = getOutputLogPath(testcase, platform);

  try {
    const result = new Uint8Array(await fsPromises.readFile(outputProjectPath));
    const log = await fsPromises.readFile(outputLogPath, 'utf8');
    return {
      result,
      log
    };
  } catch (e) {
    if (e.code === 'ENOENT') {
      return null;
    }
    throw e;
  }
};

/**
 * @param {string} testcase
 * @param {import('../src/sb3fix').Platform} platform
 * @param {Result} result 
 */
const writeResult = async (testcase, platform, result) => {
  const outputProjectPath = getOutputProjectPath(testcase, platform);
  const outputLogPath = getOutputLogPath(testcase, platform);

  const directory = path.dirname(outputProjectPath);
  await fsPromises.mkdir(directory, {
    recursive: true
  });

  await fsPromises.writeFile(outputProjectPath, result.result);
  await fsPromises.writeFile(outputLogPath, result.log);
};

const update = async () => {
  console.time('Updated snapshots');

  await fsPromises.rm(outputDirectory, {
    force: true,
    recursive: true
  });

  for (const testcase of testcases) {
    console.log(`${testcase} ...`);

    const scratchResult = await runTestcase(testcase, 'scratch');
    await writeResult(testcase, 'scratch', scratchResult);

    for (const platform of nonScratchPlatforms) {
      const nonScratchResult = await runTestcase(testcase, platform);
      if (!isIdenticalResult(scratchResult, nonScratchResult)) {
        await writeResult(testcase, platform, nonScratchResult);
      }
    }
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

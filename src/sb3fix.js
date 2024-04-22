/*!
sb3fix - https://github.com/TurboWarp/sb3fix

Copyright (C) 2023-2024 Thomas Weber

This Source Code Form is subject to the terms of the Mozilla Public
License, v. 2.0. If a copy of the MPL was not distributed with this
file, You can obtain one at https://mozilla.org/MPL/2.0/.
*/

/**
 * @typedef Options
 * @property {(message: string) => void} [logCallback]
 */

/**
 * @param {unknown} obj
 * @returns {obj is object}
 */
const isObject = (obj) => !!obj && typeof obj === 'object';

const BUILTIN_EXTENSIONS = [
  'control',
  'data',
  'event',
  'looks',
  'motion',
  'operators',
  'procedures',
  'argument', // "argument_reporter_boolean" is technically not an extension but we should list here anyways
  'sensing',
  'sound',
  'pen',
  'wedo2',
  'music',
  'microbit',
  'text2speech',
  'translate',
  'videoSensing',
  'ev3',
  'makeymakey',
  'boost',
  'gdxfor'
  // intentionally not listing TurboWarp's 'tw' extension here.
];

/**
 * @param {object} project Parsed project.json.
 * @returns {Set<string>} Set of valid extensions, including the primitive ones, that the project loads.
 */
const getKnownExtensions = (project) => {
  const extensions = project.extensions;
  if (!Array.isArray(extensions)) {
    throw new Error('extensions is not an array');
  }
  for (let i = 0; i < extensions.length; i++) {
    if (typeof extensions[i] !== 'string') {
      throw new Error(`extension ${i} is not a string`);
    }
  }
  return new Set([
    ...BUILTIN_EXTENSIONS,
    ...extensions
  ]);
};

/**
 * @param {string|object} data project.json as a string or as a parsed object already. If object provided, it will be modified in-place.
 * @param {Options} [options]
 * @returns {object} Fixed project.json object. If an object was provided as `data`, the return value will be `data`.
 */
const fixJSON = (data, options = {}) => {
  /**
   * @param {string} message
   */
  const log = (message) => {
    if (options.logCallback) {
      options.logCallback(message);
    }
  };

  /**
   * @param {string} id
   * @param {unknown} variable
   */
  const fixVariableInPlace = (id, variable) => {
    if (!Array.isArray(variable)) {
      throw new Error(`variable object ${id} is not an array`);
    }

    const name = variable[0];
    if (typeof name !== 'string') {
      log(`variable or list ${id} name was not a string`);
      variable[0] = String(variable[0]);
    }

    const value = variable[1];
    if (typeof value !== 'number' && typeof value !== 'string' && typeof value !== 'boolean') {
      log(`variable ${id} value was not a Scratch-compatible value`);
      variable[1] = String(variable[1]);
    }
  };

  /**
   * @param {string} id
   * @param {unknown} list
   */
  const fixListInPlace = (id, list) => {
    if (!Array.isArray(list)) {
      throw new Error(`list object ${id} is not an array`);
    }

    const name = list[0];
    if (typeof name !== 'string') {
      log(`list ${id} name was not a string`);
      list[0] = String(list[0]);
    }

    if (!Array.isArray(list[1])) {
      log(`list ${id} value was not an array`);
      list[1] = [];
    }

    const listValue = list[1];
    for (let i = 0; i < listValue.length; i++) {
      const value = listValue[i];
      if (typeof value !== 'number' && typeof value !== 'string' && typeof value !== 'boolean') {
        log(`list ${id} index ${i} was not a Scratch-compatible value`);
        listValue[i] = String(value);
      }
    }
  };

  /**
   * @param {unknown[]} native
   */
  const fixCompressedNativeInPlace = (native) => {
    if (!Array.isArray(native)) {
      throw new Error('native is not an array');
    }

    const type = native[0];
    if (typeof type !== 'number') {
      throw new Error('native type is not a number');
    }
    switch (type) {
      // Variable: [12, variable name, variable id, x?, y?]
      // List: [13, list name, list id, x?, y?]
      // x and y only present if the native is a top-level block
      case 12:
      case 13: {
        if (native.length !== 3 && native.length !== 5) {
          throw new Error(`Variable or list native is of unexpected length: ${native.length}`);
        }
        const name = native[1];
        if (typeof name !== 'string') {
          log(`variable or list native name was not a string`);
          native[1] = String(native[1]);
        }
        break;
      }
    }
  };

  /**
   * @param {string} id
   * @param {unknown} block
   */
  const fixBlockInPlace = (id, block) => {
    if (Array.isArray(block)) {
      fixCompressedNativeInPlace(block);
    } else if (isObject(block)) {
      const inputs = block.inputs;
      if (!isObject(inputs)) {
        throw new Error('inputs is not an object');
      }
      for (const [inputName, input] of Object.entries(inputs)) {
        if (!Array.isArray(input)) {
          throw new Error(`block ${id} input ${inputName} is not an array`);
        }
        for (let i = 1; i < input.length; i++) {
          if (Array.isArray(input[i])) {
            fixCompressedNativeInPlace(input[i]);
          }
        }
      }

      const fields = block.fields;
      if (!isObject(fields)) {
        throw new Error('fields is not an object');
      }
      for (const [fieldName, field] of Object.entries(fields)) {
        if (!Array.isArray(field)) {
          throw new Error(`block ${id} field ${fieldName} is not an array`);
        }
      }
    } else {
      throw new Error(`block ${id} is not an object`);
    }
  };

  /**
   * @param {unknown} target
   */
  const fixTargetInPlace = (target) => {
    const costumes = target.costumes;
    if (!Array.isArray(costumes)) {
      throw new Error('costumes is not an array');
    }
    for (let i = costumes.length - 1; i >= 0; i--) {
      const costume = costumes[i];
      if (!isObject(costume)) {
        throw new Error(`costume ${i} is not an object`);
      }

      if (typeof costume.name !== 'string') {
        log(`costume ${i} name was not a string`);
        costume.name = String(costume.name);
      }

      if (!('assetId' in costume)) {
        log(`costume ${i} was missing assetId, deleted`);
        costumes.splice(i, 1);
      }
    }
    if (costumes.length === 0) {
      log(`costumes was empty, adding empty costume`);
      costumes.push({
        // Empty SVG costume
        name: 'costume1',
        bitmapResolution: 1,
        dataFormat: 'svg',
        assetId: 'cd21514d0531fdffb22204e0ec5ed84a',
        md5ext: 'cd21514d0531fdffb22204e0ec5ed84a.svg',
        rotationCenterX: 0,
        rotationCenterY: 0
      });
    }

    const sounds = target.sounds;
    if (!Array.isArray(sounds)) {
      throw new Error('sounds is not an array');
    }
    for (let i = sounds.length - 1; i >= 0; i--) {
      const sound = sounds[i];
      if (!isObject(sound)) {
        throw new Error(`sound ${i} is not an object`);
      }

      if (typeof sound.name !== 'string') {
        log(`sound ${i} name was not a string`);
        sound.name = String(sound.name);
      }

      if (!('assetId' in sound)) {
        log(`sound ${i} was missing assetId, deleted`);
        sounds.splice(i, 1);
      }
    }

    const blocks = target.blocks;
    if (!isObject(blocks)) {
      throw new Error('blocks is not an object');
    }
    for (const [blockId, block] of Object.entries(blocks)) {
      fixBlockInPlace(blockId, block);
    }

    const variables = target.variables;
    if (!isObject(variables)) {
      throw new Error('variables is not an object');
    }
    for (const [variableId, variable] of Object.entries(variables)) {
      fixVariableInPlace(variableId, variable);
    }

    const lists = target.lists;
    if (!isObject(lists)) {
      throw new Error('lists is not an object');
    }
    for (const [listId, list] of Object.entries(lists)) {
      fixListInPlace(listId, list);
    }

    if (target.isStage) {
      if (target.layerOrder !== 0) {
        log('stage had invalid layerOrder');
        target.layerOrder = 0;
      }
    } else {
      if (target.layerOrder < 1) {
        log('sprite had invalid layerOrder');
        target.layerOrder = 1;
      }
    }
  };

  /**
   * @param {unknown} project
   */
  const fixProjectInPlace = (project) => {
    if ('objName' in project) {
      throw new Error('Scratch 2 (sb2) projects not supported');
    }

    if (!isObject(project)) {
      throw new Error('Root JSON is not an object');
    }

    if ('name' in project) {
      // Not a project. Just a sprite.
      log('project is a sprite');
      fixTargetInPlace(project);
      return;
    }

    const targets = project.targets;
    if (!Array.isArray(targets)) {
      throw new Error('targets is not an array');
    }
    if (targets.length < 1) {
      throw new Error('targets is empty');
    }
    for (let i = 0; i < targets.length; i++) {
      log(`checking target ${i}`);
      const target = targets[i];
      if (!isObject(target)) {
        throw new Error('target is not an object');
      }
      fixTargetInPlace(target);
    }

    let stage;
    const allStages = targets.filter((target) => target.isStage);
    if (allStages.length === 0) {
      log('stage is missing; adding an empty one');
      stage = {
        isStage: true,
        name: 'Stage',
        variables: {},
        lists: {},
        broadcasts: {},
        blocks: {},
        currentCostume: 0,
        costumes: [
          {
            name: 'backdrop1',
            dataFormat: 'svg',
            assetId: 'cd21514d0531fdffb22204e0ec5ed84a',
            md5ext: 'cd21514d0531fdffb22204e0ec5ed84a.svg',
            rotationCenterX: 240,
            rotationCenterY: 180
          }
        ],
        sounds: [],
        volume: 100,
        layerOrder: 0,
        tempo: 60,
        videoTransparency: 50,
        videoState: "on",
        textToSpeechLanguage: null
      };
      targets.unshift(stage);
    } else if (allStages.length === 1) {
      const stageIndex = targets.findIndex((target) => target.isStage);
      // stageIndex guaranteed to not be -1 by earlier filter check
      stage = targets[stageIndex];
      // stage must be the first target
      if (stageIndex !== 0) {
        log(`stage was at wrong index: ${stageIndex}`);
        targets.splice(stageIndex, 1);
        targets.unshift(stage);
      }
    } else {
      throw new Error(`wrong number of stages: ${allStages.length}`);
    }

    // stage's name must match exactly
    if (stage.name !== 'Stage') {
      log(`stage had wrong name: ${stage.name}`);
      stage.name = 'Stage';
    }

    const knownExtensions = getKnownExtensions(project);
    const monitors = project.monitors;
    if (!Array.isArray(monitors)) {
      throw new Error('monitors is not an array');
    }
    project.monitors = project.monitors.filter((monitor, i) => {
      const opcode = monitor.opcode;
      if (typeof opcode !== 'string') {
        throw new Error(`monitor ${i} opcode is not a string`);
      }
      const extension = opcode.split('_')[0];
      if (!knownExtensions.has(extension)) {
        log(`removed monitor ${i} from unknown extension ${extension}`);
        return false;
      }
      return true;
    });
  };

  if (typeof data === 'object' && data !== null) {
    // Already parsed.
    fixProjectInPlace(data);
    return data;
  } else if (typeof data === 'string') {
    // Need to parse.
    const parsed = JSON.parse(data);
    fixProjectInPlace(parsed);
    return parsed;
  } else {
    throw new Error('Unable to tell how to interpret input as JSON');
  }
};

/**
 * @param {ArrayBuffer|Uint8Array|Blob} data A compressed .sb3 file.
 * @param {Options} [options]
 * @returns {Promise<ArrayBuffer>} A promise that resolves to a fixed compressed .sb3 file.
 */
const fixZip = async (data, options = {}) => {
  // JSZip is not a small library, so we'll load it somewhat lazily.
  const JSZip = require('jszip');

  const zip = await JSZip.loadAsync(data);

  // json is not guaranteed to be stored in the root.
  const jsonFile = zip.file(/(?:project|sprite)\.json/)[0];
  if (!jsonFile) {
    throw new Error('Could not find project.json or sprite.json.');
  }

  const jsonText = await jsonFile.async('text');
  const fixedJSON = fixJSON(jsonText, options);
  const newProjectJSONText = JSON.stringify(fixedJSON);
  zip.file(jsonFile.name, newProjectJSONText);

  // By default, JSZip will use the current date as the modified timestamp, which would generated zips non-deterministic.
  const date = new Date('Thu, 14 Mar 2024 00:00:00 GMT');
  for (const file of Object.values(zip.files)) {
    file.date = date;
  }

  const compressed = await zip.generateAsync({
    type: 'uint8array',
    compression: 'DEFLATE'
  });
  return compressed;
};

module.exports = {
  fixJSON,
  fixZip
};

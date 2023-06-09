/*!
sb3fix - https://github.com/TurboWarp/sb3fix

MIT License

Copyright (c) 2023 Thomas Weber

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

var sb3fix = (function() {
  'use strict';

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
   * @param {ArrayBuffer|Uint8Array|Blob} data
   * @returns {Promise<{log: string[], newZip: ArrayBuffer}>} fixed compressed sb3
   */
  const fix = async (data) => {
    const logMessages = [];
    /**
     * @param {string} message
     */
    const log = (message) => {
      console.log(message);
      logMessages.push(message);
    };

    /**
     * @returns {Set<string>}
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
     * @param {unknown} project
     */
    const fixProjectInPlace = (project) => {
      if ('objName' in project) {
        throw new Error('Scratch 2 (sb2) projects not supported');
      }

      if (!isObject(project)) {
        throw new Error('project.json is not an object');
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

      const allStages = targets.filter((target) => target.isStage);
      if (allStages.length !== 1) {
        throw new Error(`wrong number of stages: ${allStages.length}`);
      }
      const stageIndex = targets.findIndex((target) => target.isStage);
      // stageIndex guaranteed to not be -1 by earlier check
      const stage = targets[stageIndex];
      // stage must be the first target
      if (stageIndex !== 0) {
        log('stage was not at start');
        targets.splice(stageIndex, 1);
        targets.unshift(stage);
      }
      // stage's name must match exactly
      if (stage.name !== 'Stage') {
        stage.name = 'Stage';
        log('stage had wrong name');
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
        fixVariableInPlace(listId, list);
      }
    };

    /**
     * @param {string} id
     * @param {unknown} block
     */
    const fixBlockInPlace = (id, block) => {
      if (Array.isArray(block)) {
        fixNativeInPlace(block);
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
              fixNativeInPlace(input[i]);
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
     * @param {unknown[]} native
     */
    const fixNativeInPlace = (native) => {
      if (!Array.isArray(native)) {
        throw new Error('native is not an array');
      }

      const type = native[0];
      if (typeof type !== 'number') {
        throw new Error('native type is not a number');
      }
      switch (type) {
        case 12: // Variable: [12, variable name, variable id]
        case 13: // List: [13, list name, list id]
          if (native.length !== 3) {
            throw new Error('variable or list native is of wrong length');
          }
          const name = native[1];
          if (typeof name !== 'string') {
            log(`variable or list native name was not a string`);
            native[1] = String(native[1]);
          }
          break;
      }
    };

    /**
     * @param {string} id
     * @param {unknown} variable
     */
    const fixVariableInPlace = (id, variable) => {
      if (!Array.isArray(variable)) {
        throw new Error(`variable or list ${id} is not an array`);
      }
      const name = variable[0];
      if (typeof name !== 'string') {
        log(`variable or list ${id} name was not a string`);
        variable[0] = String(variable[0]);
      }
    };

    /**
     * @returns {Promise<JSZip>}
     */
    const fixZip = async () => {
      // @ts-expect-error
      const zip = await JSZip.loadAsync(data);

      // project.json is not guaranteed to be stored in the root
      const projectJSONFile = zip.file(/project\.json/)[0];
      if (!projectJSONFile) {
        throw new Error('Could not find project.json.');
      }

      const projectJSONText = await projectJSONFile.async('text');
      const projectJSON = JSON.parse(projectJSONText);

      fixProjectInPlace(projectJSON);

      const newProjectJSONText = JSON.stringify(projectJSON);
      zip.file(projectJSONFile.name, newProjectJSONText);

      return zip;
    };

    try {
      const zip = await fixZip();
      const compressedZip = await zip.generateAsync({
        type: 'arraybuffer',
        compression: 'DEFLATE'
      });
      return {
        success: true,
        fixedZip: compressedZip,
        log: logMessages
      };
    } catch (error) {
      return {
        success: false,
        error,
        log: logMessages
      };
    }
  };

  return fix;
})();

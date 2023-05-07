var sb3fix = (function() {
  'use strict';

  /**
   * @param {unknown} obj
   * @returns {obj is object}
   */
  const isObject = (obj) => !!obj && typeof obj === 'object';

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

      for (let i = 0; i < targets.length; i++) {
        log(`checking target ${i}`);
        const target = targets[i];
        if (!isObject(target)) {
          throw new Error('target is not an object');
        }
        fixTargetInPlace(target);
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
      for (let i = 0; i < costumes.length; i++) {
        const costume = costumes[i];
        if (!isObject(costume)) {
          throw new Error(`costume ${j} is not an object`);
        }

        if (typeof costume.name !== 'string') {
          log(`costume ${i} name was not a string`);
          costume.name = String(costume.name);
        }
      }

      const sounds = target.sounds;
      if (!Array.isArray(sounds)) {
        throw new Error('sounds is not an array');
      }
      for (let i = 0; i < sounds.length; i++) {
        const sound = sounds[i];
        if (!isObject(sound)) {
          throw new Error(`sound ${i} is not an object`);
        }

        if (typeof sound.name !== 'string') {
          log(`sound ${i} name was not a string`);
          sound.name = String(sound.name);
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

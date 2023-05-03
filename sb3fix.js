var sb3fix = (function() {
  'use strict';

  const isObject = (obj) => !!obj && typeof obj === 'object';

  /**
   * @param {unknown} projectJSON
   * @returns {string[]}
   */
  const fixProjectJSONInPlace = (projectJSON) => {
    const log = [];

    if ('objName' in projectJSON) {
      throw new Error('Scratch 2 projects not supported');
    }

    if (!isObject(projectJSON)) {
      throw new Error('project.json is not an object');
    }
    
    const targets = projectJSON.targets;
    if (!Array.isArray(targets)) {
      throw new Error('targets is not an array');
    }

    for (let i = 0; i < targets.length; i++) {
      const target = targets[i];
      if (!isObject(target)) {
        throw new Error(`target ${i} is not an object (likely fixable; please report)`);
      }

      const costumes = target.costumes;
      if (!Array.isArray(costumes)) {
        throw new Error(`target ${i} costumes is not an array`);
      }
      for (let j = 0; j < costumes.length; j++) {
        const costume = costumes[j];
        if (!isObject(costume)) {
          throw new Error(`target ${i} costume ${j} is not an object (likely fixable; please report)`)
        }

        if (typeof costume.name !== 'string') {
          log.push(`target ${i} costume ${i} name was not a string`);
          costume.name = String(costume.name);
        }
      }

      const sounds = target.sounds;
      if (!Array.isArray(sounds)) {
        throw new Error(`target ${i} sounds is not an array`);
      }
      for (let j = 0; j < sounds.length; j++) {
        const sound = sounds[j];
        if (!isObject(sound)) {
          throw new Error(`target ${i} sound ${i} is not an object (likely fixable; please report)`);
        }

        if (typeof sound.name !== 'string') {
          log.push(`target ${i} sound ${i} name was not a string`);
          sound.name = String(sound.name);
        }
      }
    }

    return log;
  };

  /**
   * @param {ArrayBuffer|Uint8Array|Blob} data
   * @returns {Promise<{log: string[], newZip: ArrayBuffer}>} fixed compressed sb3
   */
  const fix = async (data) => {
    // @ts-expect-error
    const zip = await JSZip.loadAsync(data);

    // project.json might not be stored at the root
    const projectJSONFile = zip.file(/project\.json/)[0];
    if (!projectJSONFile) {
      throw new Error('Could not find project.json.');
    }

    const projectJSONText = await projectJSONFile.async('text');
    const projectJSON = JSON.parse(projectJSONText);

    const log = fixProjectJSONInPlace(projectJSON);

    const newProjectJSONText = JSON.stringify(projectJSON);
    zip.file(projectJSONFile.name, newProjectJSONText);

    const newZip = await zip.generateAsync({
      type: 'arraybuffer'
    });

    return {
      log,
      newZip
    };
  };

  return fix;
})();

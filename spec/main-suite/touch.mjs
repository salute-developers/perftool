#!/usr/bin/env node

import fsPromises from 'fs/promises';

/**
 * This script changes the test component in order to be tested in collaborative mode
 * or with testSubjectsDeps cache enabled.
 *
 * If the component is unchanged, it won't be tested in listed modes.
 */
async function start() {
    const testPath = './src/components/Components.perftest.tsx';
    let contents = await fsPromises.readFile(testPath, { encoding: 'utf-8' });

    contents = contents.replace(/\/\/\sCOMPONENT/g, 'window.top;');

    await fsPromises.writeFile(testPath, contents, { encoding: 'utf-8' });
}

start();

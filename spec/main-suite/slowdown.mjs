#!/usr/bin/env node

import fsPromises from 'fs/promises';

/**
 * This script enables the test component slow mode.
 *
 * Previously it used to be done with environmental variable, but since the collaborative mode requires the run of only
 * one process, it's no longer possible to set slow mode via env var for only one test run.
 */
async function start() {
    const testPath = './src/components/Components.perftest.tsx';
    let contents = await fsPromises.readFile(testPath, { encoding: 'utf-8' });

    contents = contents.replace(/\/\/\sSLOW/g, 'slow = true;');

    await fsPromises.writeFile(testPath, contents, { encoding: 'utf-8' });
}

start();

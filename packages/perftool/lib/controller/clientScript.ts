import type { RawTest } from '../client/input';
import { Task } from '../client/measurement/types';

export function insertTests(serializedTests: string) {
    const tests: RawTest<any>[] = JSON.parse(serializedTests);

    /**
     * @see utils/window.d.ts
     */
    window.tests = window.tests || [];
    window.tests.push(...tests);
}

export function createInsertionScriptContent<T extends Task<any, any, any>>(tests: RawTest<T>[]) {
    return `${insertTests.toString()}
    insertTests('${JSON.stringify(tests)}');
    `;
}

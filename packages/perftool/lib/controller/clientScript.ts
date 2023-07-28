import type { RawTest } from '../client/input';
import { Task } from '../client/measurement/types';

export function bootstrapTest(serializedTest: string) {
    const test: RawTest<any> = JSON.parse(serializedTest);

    /**
     * @see utils/window.d.ts
     */
    window._perftool_test = test;

    if (window._perftool_api_ready) {
        window._perftool_api_ready();
    }
}

export function createInsertionScriptContent<T extends Task<any, any, any>>(test: RawTest<T>) {
    return `${bootstrapTest.toString()}
    bootstrapTest('${JSON.stringify(test)}');
    `;
}

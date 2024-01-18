import { TestModule } from '../build/collect';
import Cache from '../cache';
import { Config } from '../config';

import { debug } from './logger';

type FilterTestModulesByCachedDepsHashParams = {
    config: Config;
    cache: Cache;
    testModules: TestModule[];
    subjectsDepsHashMap: Map<string, string>;
    baselineTestModules?: TestModule[];
    baselineSubjectsDeps?: Map<string, string>;
};

export function filterTestModulesByCachedDepsHash({
    config,
    cache,
    subjectsDepsHashMap,
    testModules,
    baselineSubjectsDeps,
}: FilterTestModulesByCachedDepsHashParams): TestModule[] {
    if (!config.cache.testSubjectsDeps && !baselineSubjectsDeps) {
        return testModules;
    }

    return testModules
        .map(({ path, subjects }) => ({
            path,
            subjects: subjects.filter(({ id }) => {
                let needsTesting = false;

                if (baselineSubjectsDeps) {
                    needsTesting = baselineSubjectsDeps.get(id) !== subjectsDepsHashMap.get(id);
                } else {
                    needsTesting = cache.getSubjectDepsHash(id) !== subjectsDepsHashMap.get(id);
                }

                if (!needsTesting) {
                    debug(`Subject ${id} is skipped for testing because it's unchanged`);
                }
                return needsTesting;
            }),
        }))
        .filter(({ subjects }) => subjects.length);
}

type FilterBaselineTestModulesParams = {
    testModules: TestModule[];
    baselineTestModules: TestModule[];
};

export function filterBaselineTestModules({
    testModules,
    baselineTestModules,
}: FilterBaselineTestModulesParams): TestModule[] {
    const currentModuleIds = new Set(testModules.map(({ subjects }) => subjects.map(({ id }) => id)).flat());

    return baselineTestModules
        .map(({ path, subjects }) => ({
            path,
            subjects: subjects.filter(({ id }) => {
                const needsTesting = currentModuleIds.has(id);
                if (!needsTesting) {
                    debug(`Subject ${id} is skipped for testing because it's unchanged`);
                }
                return needsTesting;
            }),
        }))
        .filter(({ subjects }) => subjects.length);
}

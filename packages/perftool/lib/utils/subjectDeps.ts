import { TestModule } from '../build/collect';
import Cache from '../cache';
import { Config } from '../config';

import { debug } from './logger';

type Params = {
    config: Config;
    cache: Cache;
    testModules: TestModule[];
    subjectsDepsHashMap: Map<string, string>;
};

export function filterTestModulesByCachedDepsHash({
    config,
    cache,
    subjectsDepsHashMap,
    testModules,
}: Params): TestModule[] {
    if (!config.cache.testSubjectsDeps) {
        return testModules;
    }

    return testModules
        .map(({ path, subjects }) => ({
            path,
            subjects: subjects.filter(({ id }) => {
                const needsTesting = cache.getSubjectDepsHash(id) !== subjectsDepsHashMap.get(id);
                if (!needsTesting) {
                    debug(`Subject ${id} is skipped for testing because it's unchanged`);
                }
                return needsTesting;
            }),
        }))
        .filter(({ subjects }) => subjects.length);
}

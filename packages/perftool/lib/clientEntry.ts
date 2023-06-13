/* eslint-disable */

import type { Config } from './config/common';
import { getAllTasks } from './config/task';
import { Subject } from './client/measurement/runner';
import { subject as staticTaskSubject } from './stabilizers/staticTask';
import { setLogLevel } from './utils/logger';

// <IMPORT_MARK>

const config = ((v) => v)(
    // <CONFIG_ARGS_MARK>
) as unknown as Config;

setLogLevel(config.logLevel);

const allTestSubjects: Subject[] = [
    staticTaskSubject,
    // <TEST_SUBJECT_MARK>
];

if (process.env.PERFTOOL_PREVIEW_MODE) {
    const { createPreviewClient } = await import('./preview');

    await createPreviewClient({ config, subjects: allTestSubjects });
} else {
    const { createPerfToolClient } = await import('./client');
    // TODO tasks in client config are not serialized
    const allTasks = getAllTasks(config);

    await createPerfToolClient({
        config,
        tasks: allTasks,
        subjects: allTestSubjects,
    });
}

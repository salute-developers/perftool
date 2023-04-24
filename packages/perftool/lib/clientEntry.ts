/* eslint-disable */

import type { Config } from './config/common';
import { getAllTasks } from './config/task';
import { createPerfToolClient } from './client';
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

// TODO tasks in client config are serialized,
const allTasks = getAllTasks(config);

await createPerfToolClient({
    config,
    tasks: allTasks,
    subjects: allTestSubjects,
});

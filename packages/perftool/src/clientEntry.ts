/* eslint-disable */

import type { Config } from './config/common';
import { getAllTasks } from './config/task';
import { createPerfToolClient } from './client';
import { Subject } from './client/measurement/runner';
import { subject as staticTaskSubject } from './stabilizers/staticTask';

// <IMPORT_MARK>

const config = ((v) => v)(
    // <CONFIG_ARGS_MARK>
) as unknown as Config;

const allTestSubjects: Subject[] = [
    staticTaskSubject,
    // <TEST_SUBJECT_MARK>
];

const allTasks = getAllTasks(config);

createPerfToolClient({
    config,
    tasks: allTasks,
    subjects: allTestSubjects,
});

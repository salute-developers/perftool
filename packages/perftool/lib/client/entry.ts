/* eslint-disable */

import type { Config } from '../config/common';
import { getAllTasks } from '../config/task';
import { subject as staticTaskSubject } from '../stabilizers/staticTask';
import { setLogLevel } from '../utils/logger';
import { EntrySubject } from './input';
import { onError } from '../utils/ErrorBoundary';

const config = ((v) => v)(
    // <CONFIG_ARGS_MARK>
) as unknown as Config;

setLogLevel(config.logLevel);

const allTestSubjects: EntrySubject[] = [
    staticTaskSubject,
    // <TEST_SUBJECT_MARK>
];

if (process.env.PERFTOOL_PREVIEW_MODE) {
    const { createPreviewClient } = await import(
        /* webpackMode: "eager" */
        '../preview'
    );

    await createPreviewClient({
        config,
        subjects: allTestSubjects.filter(
            (s) => s !== staticTaskSubject
        )
    });
} else {
    const { createPerfToolClient } = await import(
        /* webpackMode: "eager" */
        '.'
    );
    // TODO tasks in client config are not serialized
    const allTasks = getAllTasks(config);

    try {
        await createPerfToolClient({
            config,
            tasks: allTasks,
            subjects: allTestSubjects,
        });
    } catch (error) {
        onError(error);
    }
}

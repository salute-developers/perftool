import React from 'react';

import { Config } from '../config';
import { render } from '../utils/react';
import createContainer from '../utils/createContainer';
import { EntrySubject } from '../client/input';
import { debug, error } from '../utils/logger';

import Root from './components/Root';

type Params = {
    config: Config;
    subjects: EntrySubject[];
};

function getCurrentSubjectId() {
    const paramName = 'subjectId';
    const { searchParams } = new URL(window.location.href);

    if (!searchParams.has(paramName)) {
        return null;
    }

    return searchParams.get(decodeURIComponent(paramName));
}

function waitForApiReady(): Promise<void> {
    if (window._perftool_preview_loaded) {
        return Promise.resolve();
    }

    return new Promise((resolve) => {
        window._perftool_api_ready = resolve;
    });
}

export async function createPreviewClient({ subjects }: Params): Promise<void> {
    const currentSubjectId = getCurrentSubjectId() || subjects[0]?.id;
    const subjectIds = subjects.map(({ id }) => id);
    const currentEntrySubject = subjects.find(({ id }) => id === currentSubjectId);

    if (!currentEntrySubject) {
        error('No test subjects found or subjectId is invalid');
        return;
    }

    const currentSubject = currentEntrySubject && {
        id: currentEntrySubject.id,
        Component: await currentEntrySubject.loadComponent(),
    };

    await waitForApiReady();
    await window._perftool_reset_interception?.();

    if (typeof currentSubject.Component.beforeTest === 'function') {
        debug('Running beforeTest');
        await currentSubject.Component.beforeTest();
    }

    const container = createContainer();
    document.body.style.margin = '0';

    await render(<Root subjectIds={subjectIds} currentSubject={currentSubject} />, container);
}

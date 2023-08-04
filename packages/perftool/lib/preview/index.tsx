import React from 'react';

import { Config } from '../config';
import { render } from '../utils/react';
import { subject } from '../stabilizers/staticTask';
import createContainer from '../utils/createContainer';
import { EntrySubject } from '../client/input';

import Root from './components/Root';

type Params = {
    config: Config;
    subjects: EntrySubject[];
};

export async function createPreviewClient({ subjects }: Params): Promise<void> {
    // TODO beforeTest
    const filteredSubjects = await Promise.all(
        subjects
            .filter(({ id }) => id !== subject.id)
            .map(async ({ id, loadComponent }) => ({ id, Component: await loadComponent() })),
    );
    const container = createContainer();
    document.body.style.margin = '0';

    await render(<Root subjects={filteredSubjects} />, container);
}

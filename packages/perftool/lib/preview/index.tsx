import React from 'react';

import { Config } from '../config';
import { Subject } from '../client/measurement/runner';
import { render } from '../utils/react';
import { subject } from '../stabilizers/staticTask';
import createContainer from '../utils/createContainer';

import Root from './components/Root';

type Params = {
    config: Config;
    subjects: Subject[];
};

export async function createPreviewClient({ subjects }: Params): Promise<void> {
    const filteredSubjects = subjects.filter(({ id }) => id !== subject.id);
    const container = createContainer();
    document.body.style.margin = '0';

    await render(<Root subjects={filteredSubjects} />, container);
}

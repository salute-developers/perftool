import React from 'react';

import { render } from '../../utils/react';
import createContainer from '../../utils/createContainer';

import Root from './components/Root';

async function createReportView(): Promise<void> {
    const container = createContainer();
    document.body.style.margin = '0';
    document.body.style.fontFamily = 'monospace';

    await render(<Root />, container);
}

await createReportView();

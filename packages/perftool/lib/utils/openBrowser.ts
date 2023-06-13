import open from 'open';

import { info } from './logger';

type Params = {
    port: number;
};

async function openBrowser({ port }: Params): Promise<void> {
    const url = `http://localhost:${port}/`;

    info(`Opening browser at (${url})...`);
    await open(url);
}

export default openBrowser;

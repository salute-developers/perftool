import process from 'process';

import { info } from './logger';

export function waitForSignal(sig: string): Promise<void> {
    return new Promise((res) => {
        process.on(sig, function handle() {
            process.off(sig, handle);
            res();
        });
    });
}

export function waitForSigint(): Promise<void> {
    info('Press Ctrl-C to proceed...');
    return waitForSignal('SIGINT');
}

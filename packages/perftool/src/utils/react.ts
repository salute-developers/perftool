import { version } from 'react';
import type * as ReactDOMType from 'react-dom';
import type * as ReactDOMClientType from 'react-dom/client';

export function isReact18AndNewer() {
    return Number(version.split('.')[0]) >= 18;
}

// Import version specific react-dom modules conditionally to avoid build-time errors
let ReactDOMClient: typeof ReactDOMClientType = {} as any;
let ReactDOM: typeof ReactDOMType = {} as any;
if (process.env.PERFTOOL_CLIENT_RUNTIME) {
    if (isReact18AndNewer()) {
        ReactDOMClient = await import(`react-dom/client`);
    } else {
        ReactDOM = await import(`react-dom`);
    }
}

export async function render(element: React.ReactElement, container: HTMLElement): Promise<void> {
    return new Promise((resolve) => {
        if (!isReact18AndNewer()) {
            ReactDOM.render(element, container, resolve);
            return;
        }

        const { createRoot } = ReactDOMClient;
        const root = createRoot(container);
        root.render(element);

        resolve();
    });
}

export async function hydrate(element: React.ReactElement, container: HTMLElement): Promise<void> {
    return new Promise((resolve) => {
        if (!isReact18AndNewer()) {
            ReactDOM.hydrate(element, container, resolve);
            return;
        }

        const { hydrateRoot } = ReactDOMClient;
        hydrateRoot(container, element);

        resolve();
    });
}

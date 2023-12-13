import React from 'react';
import { setViewport } from '@salutejs/perftool';

import { TestComponent as OriginalTestComponent } from './TestComponent';

export function TestComponent() {
    const isSlow = Boolean(process.env.SLOW);

    return <OriginalTestComponent slow={isSlow} />;
}

TestComponent.beforeTest = async function () {
    await setViewport('touch');
};

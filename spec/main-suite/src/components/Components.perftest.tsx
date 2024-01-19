import React from 'react';
import { setViewport } from '@salutejs/perftool';

import { TestComponent as OriginalTestComponent } from './TestComponent';

// eslint-disable-next-line prefer-const
let slow = false;
// SLOW

export function TestComponent() {
    // COMPONENT
    const isSlow = Boolean(process.env.SLOW || slow);

    return <OriginalTestComponent slow={isSlow} />;
}

TestComponent.beforeTest = async function () {
    await setViewport('touch');
};

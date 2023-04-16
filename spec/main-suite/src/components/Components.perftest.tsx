import React from 'react';

import { TestComponent as OriginalTestComponent } from './TestComponent';

export function TestComponent() {
    const isSlow = Boolean(process.env.SLOW);

    return <OriginalTestComponent slow={isSlow} />;
}

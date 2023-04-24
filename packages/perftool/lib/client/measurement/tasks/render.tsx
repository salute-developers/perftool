import React from 'react';

import { Task } from '../types';
import { render as reactRender } from '../../../utils/react';
import Deferred from '../../../utils/deferred';
import debounce from '../../../utils/debounce';
import MeasureLab from '../../../utils/MeasureLab';
import { id as staticTaskStabilizerId } from '../../../stabilizers/staticTask';

type RenderConfig = {
    renderWaitTimeout: number;
};

type State = {
    /**
     * Iteratively decreasing wait interval, always more than maxResult.
     * Tnext = (Tprev + maxResult) / 2
     */
    cumulativeWaitTimeout?: number;
    /**
     * Max render result for current subject
     */
    maxResult?: number;
};

const render: Task<number, RenderConfig, State> = {
    id: 'render',
    isIdempotent: false,
    aim: 'decrease',
    name: 'Initial render',
    availableStabilizers: [staticTaskStabilizerId],
    defaultConfig: {
        renderWaitTimeout: 1000,
    },
    async run({ Subject, container, config, state }) {
        const waitTimeout = state.cumulativeWaitTimeout || config.renderWaitTimeout;
        const task = new Deferred<number>();
        const debouncedFinish = debounce(task.resolve, waitTimeout);
        let startTime = 0;

        function measure(): void {
            const result = performance.now() - startTime;
            debouncedFinish(result);
        }

        startTime = performance.now();
        // eslint-disable-next-line react/jsx-no-bind
        await reactRender(<MeasureLab Subject={Subject} onRender={measure} onMutation={measure} />, container);

        const result = await task.promise;

        state.maxResult = Math.max(result, state.maxResult || 0);
        state.cumulativeWaitTimeout = (state.maxResult + (state.cumulativeWaitTimeout || config.renderWaitTimeout)) / 2;

        return result;
    },
};

export default render;

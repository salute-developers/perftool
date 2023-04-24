import React from 'react';

import assert from '../../../utils/assert';
import { Task } from '../types';
import { render as reactRender } from '../../../utils/react';
import Deferred from '../../../utils/deferred';
import debounce from '../../../utils/debounce';
import MeasureLab from '../../../utils/MeasureLab';
import waitForIdle from '../../../utils/waitForIdle';
import { id as staticTaskStabilizerId } from '../../../stabilizers/staticTask';

type RerenderConfig = {
    renderWaitTimeout: number;
};

type State = {
    /**
     * Iteratively decreasing wait interval for rerender, always more than maxResult.
     * Tnext = (Tprev + maxResult) / 2
     */
    cumulativeWaitTimeout?: number;
    /**
     * Max rerender result for current subject
     */
    maxResult?: number;
    /**
     * Iteratively decreasing wait interval for first render, always more than maxRenderResult.
     */
    cumulativeRenderWaitTimeout?: number;
    /**
     * Max rerender result for current subject
     */
    maxRenderResult?: number;
};

function noop() {}

const rerender: Task<number, RerenderConfig, State> = {
    id: 'rerender',
    isIdempotent: false,
    name: 'Rerender',
    aim: 'decrease',
    availableStabilizers: [staticTaskStabilizerId],
    defaultConfig: {
        renderWaitTimeout: 1000,
    },
    async run({ Subject, container, config, state }) {
        const renderWaitTimeout = state.cumulativeRenderWaitTimeout || config.renderWaitTimeout;
        const waitTimeout = state.cumulativeWaitTimeout || config.renderWaitTimeout;
        const task = new Deferred<number>();
        const renderFinish = new Deferred<number>();
        const debouncedFinish = debounce(task.resolve, waitTimeout);
        const debouncedRenderFinish = debounce(renderFinish.resolve, renderWaitTimeout);
        let startTime = 0;
        let forceRender = noop;
        let isRendered = false;

        function measure(): void {
            if (!isRendered) {
                const result = performance.now() - startTime;
                debouncedRenderFinish(result);
                return;
            }

            const result = performance.now() - startTime;
            debouncedFinish(result);
        }

        await reactRender(
            <MeasureLab
                Subject={Subject}
                // eslint-disable-next-line react/jsx-no-bind
                onRender={measure}
                // eslint-disable-next-line react/jsx-no-bind
                onMutation={measure}
                onForceRenderReady={(cb) => (forceRender = cb)}
            />,
            container,
        );

        const renderResult = await renderFinish.promise;

        await waitForIdle();

        isRendered = true;
        assert(forceRender !== noop);

        startTime = performance.now();
        forceRender();

        const result = await task.promise;

        state.maxResult = Math.max(result, state.maxResult || 0);
        state.cumulativeWaitTimeout = (state.maxResult + (state.cumulativeWaitTimeout || config.renderWaitTimeout)) / 2;
        state.maxRenderResult = Math.max(renderResult, state.maxRenderResult || 0);
        state.cumulativeRenderWaitTimeout =
            (state.maxRenderResult + (state.cumulativeRenderWaitTimeout || config.renderWaitTimeout)) / 2;

        return result;
    },
};

export default rerender;

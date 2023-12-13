import { ComponentType } from 'react';

import { JSONSerializable } from '../../utils/types';

export type MeasurerConfig = {
    [key: string]: MeasurerConfig | Array<MeasurerConfig> | string | number | boolean;
};

export type TaskAim = 'increase' | 'decrease';

export type State = {
    /**
     * Is the current state taken from cache
     */
    cached?: boolean;
};

type RunParams<C extends MeasurerConfig | void, S extends object> = {
    /**
     * Component to test
     */
    Subject: ComponentType;
    /**
     * DOM node to render in
     */
    container: HTMLElement;
    /**
     * Task config
     */
    config: C;
    /**
     * Unique stored state for each (TaskId, SubjectId) pair. State is only changed by task itself.
     */
    state: S;
};

export type TaskState<T extends Task<any, any, any>> = T extends Task<any, any, infer S> ? S : never;

// eslint-disable-next-line @typescript-eslint/ban-types
export type Task<T extends JSONSerializable, C extends MeasurerConfig | void, S extends State = {}> = {
    /**
     * Internal id (for JSON reports)
     */
    id: string;
    /**
     * Flag indicating the result is unchanged if task is repeated
     */
    isIdempotent: T extends number ? boolean : true;
    /**
     * Applicable stabilizers for the task
     */
    availableStabilizers?: string[];
    /**
     * Display name
     */
    name: string;
    /**
     * Aim of the result values change
     */
    aim?: T extends number ? TaskAim : never;
    /**
     * Default config
     */
    defaultConfig?: C;
    /**
     * Description (for UI reports)
     */
    description?: string;
    /**
     * Formatter function (for UI reports)
     */
    format?: (result: T) => string;
    /**
     * Task itself (measurer function)
     */
    run: (params: RunParams<C, S>) => Promise<T>;
};

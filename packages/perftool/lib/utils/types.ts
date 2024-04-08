import { ComponentType } from 'react';

export type JSONSerializable =
    | { [key: string]: JSONSerializable }
    | Array<JSONSerializable>
    | string
    | number
    | boolean
    | null;

export type PerftoolComponent = ComponentType & { beforeTest?: () => Promise<void> | void };

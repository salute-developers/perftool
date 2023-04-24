import BaseError from './baseError';

class AssertionError extends BaseError {}

export default function assert(condition: any): asserts condition {
    if (!condition) {
        throw new AssertionError();
    }
}

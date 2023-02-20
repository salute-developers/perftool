import combineGenerators from '../combineGenerators';
import Deferred, { defer } from '../deferred';

async function* makeGenerator<T extends Array<any>>(itemsToYield: T): AsyncGenerator<T[number], undefined> {
    for (const item of itemsToYield) {
        const res = await item;
        yield res;
    }

    return undefined;
}

describe('utils/combineGenerators', () => {
    it('should yield same output from one generator', async () => {
        const input = ['asd', 1, 3, 'fds', null, false];
        const generator = makeGenerator(input);

        const result = [];

        for await (const val of combineGenerators([generator])) {
            result.push(val);
        }

        expect(result).toEqual(input);
    });

    it('should yield elements in the order of arrival', async () => {
        const seq: Deferred<number>[] = [];

        for (let i = 0; i < 12; ++i) {
            seq.push(new Deferred());
        }

        const input1 = [seq[1], seq[2], seq[3], seq[6], seq[9], seq[10]].map((e) => e.promise);
        const input2 = [seq[0], seq[4], seq[5], seq[7], seq[8], seq[11]].map((e) => e.promise);
        const generator1 = makeGenerator(input1);
        const generator2 = makeGenerator(input2);
        const expectedPromise = Promise.all(seq.map((e) => e.promise));

        async function getGeneratorResult() {
            const result = [];
            for await (const val of combineGenerators([generator1, generator2])) {
                result.push(val);
            }
            return result;
        }
        async function start() {
            for (let i = 0; i < 12; ++i) {
                seq[i].resolve(i);
                await defer();
            }
        }

        const generatorResultPromise = getGeneratorResult();

        await start();

        expect(await generatorResultPromise).toEqual(await expectedPromise);
    });
});

import {
    AError,
    AReason,
    ExceptionalError,
    PromiseRejection,
    AResult,
    Result
} from '../src/index';

describe('index exports', () => {
    const exportsToCheck = [
        ['AError', AError],
        ['AReason', AReason],
        ['ExceptionalError', ExceptionalError],
        ['PromiseRejection', PromiseRejection],
        ['AResult', AResult],
        ['Result', Result]
    ];

    it.each(exportsToCheck)(
        'should export %s as a function (class or constructor)', (...[name, exported]) => {
            expect(typeof exported).toBe('function');
        }
    );
});

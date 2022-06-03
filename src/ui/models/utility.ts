export const delay = <T>(param: T, ms: number): Promise<T> =>
    new Promise((resolve): void => {
        setTimeout(() => resolve(param), ms)
    })
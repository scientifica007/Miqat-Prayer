// Own every external resource once; drain in reverse order even if cleanup fails.
export class Resources {
    constructor(onError = error => console.error(error)) {
        this._cleanups = [];
        this._onError = onError;
    }

    own(cleanup) {
        this._cleanups.push(cleanup);
    }

    connect(object, signal, callback) {
        const id = object.connect(signal, callback);
        this.own(() => object.disconnect(id));
    }

    clear() {
        for (const cleanup of this._cleanups.splice(0).reverse()) {
            try {
                cleanup();
            } catch (error) {
                this._onError(error);
            }
        }
    }
}

import { useState, useEffect } from "haunted";
import { listenKeys } from "nanostores";

export function useStore(store, opts = {}) {
    let [, forceRender] = useState({});
    let [valueBeforeEffect] = useState(store.get());

    useEffect(() => {
        valueBeforeEffect !== store.get() && forceRender({});
    }, []);

    useEffect(() => {
        let batching, timer, unlisten;
        let rerender = () => {
            if (!batching) {
                batching = 1;
                timer = setTimeout(() => {
                    batching = undefined;
                    forceRender({});
                });
            }
        };
        if (opts.keys) {
            unlisten = listenKeys(store, opts.keys, rerender);
        } else {
            unlisten = store.listen(rerender);
        }
        return () => {
            unlisten();
            clearTimeout(timer);
        };
    }, [store, "" + opts.keys]);

    return store.get();
}

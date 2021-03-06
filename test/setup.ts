// setup file
import React from "react";

/**
 * The _actual_ shape Loadable Components transforms imports to via babel.
 *
 * Well, at least the part of the shape we care about.
 */
interface LoadableComponentsBabelImport<T> {
    requireSync: (props: T) => { default: React.ComponentType<T> };
    importAsync: (props: T) => Promise<{ default: React.ComponentType<T> }>;
}

// This is super hacky
// Basically, this is to make Loadable Components _seem_ perfect to code
// you write.
// The "@loadable/babel-plugin" transforms loadable(() => import("./file"))
// imports to an object with a few different requires. Now when bundled up
// with webpack these assumptions are solid and will be correct.
// However jest will be running live under node transpiling on the fly,
// So the goal of this hack to inject our own function to replace loadable()
// that _appears_ to function the same way.
// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
require("@loadable/component").default = function JestLoadableComponent<
    T extends Record<string, unknown> | undefined
>(loadableComponentImport: LoadableComponentsBabelImport<T>) {
    const loaded = loadableComponentImport.requireSync({} as T);

    // This is completely redundant but forces the () => import("./whatever")
    // to be invoked so the code coverage test can see it was ran, though
    // really the requireSync above actually ran that code; however jest
    // won't be able to register the function as ran otherwise.
    void loadableComponentImport.importAsync({} as T);

    return loaded.default;
};

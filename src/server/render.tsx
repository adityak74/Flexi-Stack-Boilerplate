import { Writable } from "stream";
import React from "react";
import { renderToNodeStream } from "react-dom/server";
import { StaticRouter, StaticRouterContext } from "react-router";
import { flushChunkNames } from "react-universal-component/server";
import { ServerStyleSheet } from "styled-components";
import flushChunks from "webpack-flush-chunks";
import { ROOT_ELEMENT_ID, indexHtmlTemplate } from "../shared/build";
import { App } from "../shared/components/App";

/**
 * Renders the React app in a node (server) environment.
 *
 * @param output - the write stream to stream the html to as it is built
 * @param location - the location to render in the app
 * @param csrStats - client side rendering options to inject into the rendered html
 * @returns a promise that resolves once the entire html document has been written to `output`
 */
export async function render(output: Writable, location: string, csrStats?: {}) {
    output.write(indexHtmlTemplate.top);

    const sheet = new ServerStyleSheet();
    // normally we"d use a StaticRouter context to capture if the rendered route was a 404 not found;
    // however we are streaming this response. So the HTTP Status Code has already been sent,
    // thus we don"t care at this point in time.
    const staticRouterContext: StaticRouterContext = {};

    const jsx = sheet.collectStyles((
        <div id={ROOT_ELEMENT_ID}>
            <StaticRouter location={location} context={staticRouterContext}>
                <App />
            </StaticRouter>
        </div>
    ));

    const bodyStream = sheet.interleaveWithNodeStream(renderToNodeStream(jsx));
    bodyStream.pipe(output, { end: false });
    await new Promise((resolve) => bodyStream.once("end", resolve));

    /* istanbul ignore if: once again, chunks are never found during tests */
    if (csr) {
        const chunkNames = flushChunkNames();
        const { js } = flushChunks(csr.stats, { chunkNames });
        /*
        output.write(getBundles(csr.manifest, loadedModules)
            .map((bundle) => `<script src="${urlJoin("/", STATIC_BUNDLE_DIR, bundle.file)}"></script>`)
            .join("") + csr.mainScripts);
        */
    }

    output.end(indexHtmlTemplate.bottom);
}

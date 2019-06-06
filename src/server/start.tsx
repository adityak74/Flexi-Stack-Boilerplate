// import cors from "cors";
import express from "express";
import { Server } from "http";
import { join } from "path";
import * as React from "react";
import { renderToNodeStream } from "react-dom/server";
import { preloadAll } from "react-loadable";
import { StaticRouter } from "react-router";
import { ServerStyleSheet } from 'styled-components'
import { ROOT_ELEMENT_ID, STATIC_BUNDLE_DIR, indexHtmlTemplate } from "../shared/build";
import { App } from "../shared/components/App";
import { readFile } from "fs-extra";

export async function start(port: number, clientSideBundleDir = "") {
    await preloadAll(); // don't even start express till react-loadable is preloaded

    const app = express();

    let scripts = "";
    if (clientSideBundleDir) {
        app.use(`/static`, express.static(join(clientSideBundleDir, STATIC_BUNDLE_DIR)));

        const indexHtml = await readFile(join(clientSideBundleDir, "index.html"));
        const scriptsArray = indexHtml.toString().match(/<script(.*?)<\/script>/g);

        if (!scriptsArray) {
            throw new Error("no scripts!");
        }

        scripts = scriptsArray.join("");
    }

    const htmlStart = [
        indexHtmlTemplate.preHead,
        "<title>Server Side Render</title>",
        scripts,
        indexHtmlTemplate.postHeadPreBody,
    ].join("");

    app.get("*", async (req, res) => {
        res.write(htmlStart);

        const sheet = new ServerStyleSheet();
        const context = {};
        const jsx = sheet.collectStyles((
            <div id={ROOT_ELEMENT_ID}>
                <StaticRouter location={req.url} context={context}>
                    <App />
                </StaticRouter>
            </div>),
        );

        const bodyStream = sheet.interleaveWithNodeStream(renderToNodeStream(jsx));
        bodyStream.pipe(res, { end: false });
        await new Promise((resolve) => bodyStream.once("end", resolve));

        res.end(indexHtmlTemplate.postBody);
    });

    return new Promise<Server>((resolve) => {
        const server = app.listen(port, () => resolve(server));
    });
}

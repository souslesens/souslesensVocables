const path = require("path");
const mode = process.env.NODE_ENV ? process.env.NODE_ENV : "production";

// config editor
module.exports = {
    mode: mode,
    entry: {
        mainapp: "./src/index.tsx",
        kg_upload_app: "./src/kg-upload-app.tsx",
        SourceCreatorUploading: "./src/SourceCreatorUploading.tsx",
    },
    output: {
        path: path.resolve(__dirname, "static/"),
    },
    devtool: "source-map",
    resolve: {
        extensions: [".ts", ".tsx", ".js", ".json"],
    },
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                loader: "ts-loader",
            },
            {
                test: /\.(ttf|eot|svg|woff(2)?|png|jpe?g|gif)(\?[a-z0-9=&.]+)?$/,
                loader: "file-loader",
            },
            { test: /\.css$/, loader: "css-loader" },
            { enforce: "pre", test: /\.js$/, loader: "source-map-loader" },
        ],
    },
    devServer: {
        inline: false,
        contentBase: "build",
        compress: true,
        historyApiFallback: {
            index: "index.html",
        },
    },
};

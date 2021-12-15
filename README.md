# rollup-plugin-css-text

A rollup plugin to generate javascript files that export the text of the css files.

## The plugin functionality

This plugin will search for all css files that exist in the output directory (which is specified via [`output.dir`](https://rollupjs.org/guide/en/#outputdir) rollup option). then it will generate for each css file a javascript file (with the format specified via [`output.format`](https://rollupjs.org/guide/en/#outputformat) and the export strategy specified via [`output.exports`](https://rollupjs.org/guide/en/#outputexports) rollup options). and this generated javascript file will export a constant which holds the text of the css file.

The generated javascript file will have the same name as its corresponding css file name with `.css-text.js` extension (e.g if the css file name is `styles.css` then the generated javascript file name will be `styles.css-text.js`).

The plugin will also generate a typescript declaration file for each generated javascript css text file (you can turn off this behavior by setting the `tsDeclaration` option to `false`, see the full options of this plugin below).

The plugin will not remove the css files, it will only generate a javascript css text file besides each of them (which gives the consumer the flexibility between choosing to import the css file or the generated javascript css text file).

## The plugin use cases

one of the use cases is if you are building a package (for example a react component package) and you are outputting a css file that the consumer has to import besides the component that your package exports to be styled.

And here the problem is as the _webpack css loader_ / _rollup css plugin_ will not inject the css in the server-side.

And the solution is to make your package export a javascript css text file for each css file

So the consumer can get the css text via the constant imported from the javascript css text file then pass it to a CSS-in-JS library tool that supports css rendering for both client-side and server-side like [`styled-jsx`](https://github.com/vercel/styled-jsx), [`emotion-js`](https://github.com/emotion-js/emotion), [`styled-components`](https://github.com/styled-components/styled-components), or others.

## Installation

**using npm**

```
npm install --save-dev rollup-plugin-css-text
```

**using yarn**

```
yarn add --dev rollup-plugin-css-text
```

## Usage

While using this plugin you must specify the following rollup options:

- [`output.dir`](https://rollupjs.org/guide/en/#outputdir) the path of the output directory
- [`output.format`](https://rollupjs.org/guide/en/#outputformat) the format of the generated javascript file. the value can be one of the following `commonjs` | `cjs` | `es` | `esm` | `module` | `iife` | `amd` | `umd` | `system` | `systemjs`
- [`output.exports`](https://rollupjs.org/guide/en/#outputexports) the export strategy of the generated javascript file. the value must be either `named` or `default`

**config example:**

```js
import cssText from 'rollup-plugin-css-text';

/** @type {import('rollup').RollupOptions} */
const options = {
  input: './src/index.js',
  output: {
    dir: './dist',
    format: 'cjs',
    exports: 'named',
  },
  plugins: [
    cssText({
      /* see the plugin options below */
    }),
  ],
};

export default options;
```

> **IMPORTANT**: This plugin will generate javascript css text files from css files that are in the output directory only (in other words, it will not let you load, output, or minify css files in your project. so you must place a plugin that does that before this plugin like [`rollup-plugin-postcss`](https://www.npmjs.com/package/rollup-plugin-postcss) with `extract` set to `true`)

**config with [`rollup-plugin-postcss`](https://www.npmjs.com/package/rollup-plugin-postcss) example**

```js
import postcss from 'rollup-plugin-postcss';
import cssText from 'rollup-plugin-css-text';

/** @type {import('rollup').RollupOptions} */
const options = {
  input: './src/index.js',
  output: {
    dir: './dist',
    format: 'cjs',
    exports: 'named',
  },
  plugins: [
    postcss({
      /* the 'extract' option must be true */
      extract: true,
      minimize: true,
    }),
    cssText({
      /* see the plugin options below */
    }),
  ],
};

export default options;
```

## Options

**includeComments**

Type: `'in-file-only'` | `'in-const'` | `false`

Default: `'in-file-only'`

if `in-file-only` the comments will be in the generated javascript css text file only. if `in-const` the comments will be in the exported const. if `false` the comments will be removed.

**tsDeclaration**

Type: `boolean`

Default: `true`

if it is `true` the plugin will generate a typescript declaration for each generated javascript css text file.

**constName**

Type: `string` | `((cssFilePath: string) => string | Promise<string>)`

Default: `'CSS_TEXT'`

the name of the constant that will be exported in the generated javascript css text file and its typescript declaration file.

import { Plugin } from 'rollup';
import fsPromises from 'fs/promises';
import path from 'path';

// indexAfterOf
const indexAfterOf = (
  str: string,
  searched: string,
  position?: number,
): number | undefined => {
  const index = String.prototype.indexOf.call(str, searched, position);

  return index > -1 ? index + searched.length : undefined;
};

// parseCss
const parseCss = (
  css: string,
  cb: (blockType: 'style' | 'comment', blockContent: string) => void,
) => {
  let styleContent = '';

  for (let idx = 0; idx < css.length; ) {
    const char = css[idx];

    if (char === '"' || char === "'") {
      const stringContent = css.slice(
        idx,
        indexAfterOf(css, char, idx + char.length),
      );

      styleContent += stringContent;
      idx += stringContent.length;
    } else if (char === '/' && css[idx + 1] === '*') {
      const commentOpenSym = '/*';
      const commentCloseSym = '*/';

      const commentContent = css.slice(
        idx,
        indexAfterOf(css, commentCloseSym, idx + commentOpenSym.length),
      );

      if (styleContent.length > 0) {
        cb('style', styleContent);
        styleContent = '';
      }

      cb('comment', commentContent);

      idx += commentContent.length;
    } else {
      styleContent += char;
      idx += 1;
    }
  }

  if (styleContent.length > 0) {
    cb('style', styleContent);
  }
};

// getCssFiles
const getCssFiles = async (dirPath: string) => {
  const files = await fsPromises.readdir(dirPath, { withFileTypes: true });

  const cssFiles: {
    path: string;
    /**
     * the name will be without ".css" extension
     */
    name: string;
    content: string;
    dirPath: string;
  }[] = [];

  for (const file of files) {
    const filePath = path.join(dirPath, file.name);

    if (file.isDirectory()) {
      const dirCssFiles = await getCssFiles(filePath);
      cssFiles.push(...dirCssFiles);
    } else {
      const fileExt = path.extname(file.name);

      if (fileExt === '.css')
        cssFiles.push({
          path: filePath,
          name: file.name.slice(0, -4),
          content: await fsPromises.readFile(filePath, 'utf8'),
          dirPath,
        });
    }
  }

  return cssFiles;
};

// writeTsDeclaration
const writeTsDeclaration = (
  dirPath: string,
  /**
   * the name should be without '.css' extension
   */
  cssFileName: string,
  constName: string,
) => {
  const content =
    `declare const ${constName}: string;` +
    '\n' +
    `export default ${constName};`;

  return fsPromises.writeFile(
    path.join(dirPath, `${cssFileName}.css-text.d.ts`),
    content,
  );
};

// getJsTemplate
const getJsTemplate = (
  format: 'cjs' | 'es' | 'amd' | 'umd' | 'system' | 'iife',
  exports: 'named' | 'default',
  constName: string,
): { codeBegin: string; codeEnd: string } =>
  ({
    cjs: {
      named: {
        codeBegin: `"use strict";Object.defineProperty(exports,"__esModule",{value:!0});var _${constName}="";`,
        codeEnd: `var ${constName}=_${constName};exports["default"]=${constName};`,
      },
      default: {
        codeBegin: `"use strict";var _${constName}="";`,
        codeEnd: `var ${constName}=_${constName};module.exports=${constName};`,
      },
    },
    es: {
      named: {
        codeBegin: `var _${constName}="";`,
        codeEnd: `var ${constName}=_${constName};export default ${constName};`,
      },
      default: {
        codeBegin: `var _${constName}="";`,
        codeEnd: `var ${constName}=_${constName};export default ${constName};`,
      },
    },
    amd: {
      named: {
        codeBegin: `define(["exports"],function(exports){"use strict";var _${constName}="";`,
        codeEnd: `var ${constName}=_${constName};exports["default"]=${constName};Object.defineProperty(exports,"__esModule",{value:!0});});`,
      },
      default: {
        codeBegin: `define(function(){"use strict";var _${constName}="";`,
        codeEnd: `var ${constName}=_${constName};return ${constName};});`,
      },
    },
    umd: {
      named: {
        codeBegin: `(function(global,factory){typeof exports==="object"&&typeof module!=="undefined"?factory(exports):typeof define==="function"&&define.amd?define(["exports"],factory):((global=typeof globalThis!=="undefined"?globalThis:global||self),factory((global.${constName}={})));})(this,function(exports){"use strict";var _${constName}="";`,
        codeEnd: `var ${constName}=_${constName};exports["default"]=${constName};Object.defineProperty(exports,"__esModule",{value:!0});});`,
      },
      default: {
        codeBegin: `(function(global,factory){typeof exports==="object"&&typeof module!=="undefined"?(module.exports=factory()):typeof define==="function"&&define.amd?define(factory):((global=typeof globalThis!=="undefined"?globalThis:global||self),(global.${constName}=factory()));})(this,function(){"use strict";var _${constName}="";`,
        codeEnd: `var ${constName}=_${constName};return ${constName};});`,
      },
    },
    system: {
      named: {
        codeBegin: `System.register([],function(exports){"use strict";return{execute:function(){var _${constName}="";`,
        codeEnd: `var ${constName}=exports("default",_${constName});},};});`,
      },
      default: {
        codeBegin: `System.register([],function(exports){"use strict";return{execute:function(){var _${constName}="";`,
        codeEnd: `var ${constName}=exports("default",_${constName});},};});`,
      },
    },
    iife: {
      named: {
        codeBegin: `var ${constName}=(function(exports){"use strict";var _${constName}="";`,
        codeEnd: `var ${constName}=_${constName};exports["default"]=${constName};Object.defineProperty(exports,"__esModule",{value:!0});return exports;})({});`,
      },
      default: {
        codeBegin: `var ${constName}=(function(){"use strict";var _${constName}="";`,
        codeEnd: `var ${constName}=_${constName};return ${constName};})();`,
      },
    },
  }[format][exports]);

// JsFile
class JsFile {
  private content = '\n';

  constructor(
    private format: 'cjs' | 'es' | 'amd' | 'umd' | 'iife' | 'system',
    private exports: 'named' | 'default',
    private constName: string,
  ) {}

  pushContent(content: string) {
    this.content += content;
  }

  pushConstValue(constValue: string) {
    this.content = this.content.replace(/ +$/, '');

    if (!/\n$/.test(this.content)) {
      this.content += '\n';
    }

    const escapedConstValue = constValue
      .replace(/"/g, '\\"')
      .replace(/\r\n/g, '\\n')
      .replace(/\n|\r/g, '\\n');

    this.content += `_${this.constName}+="${escapedConstValue}"`;
  }

  getContent() {
    const jsTemplate = getJsTemplate(this.format, this.exports, this.constName);
    return jsTemplate.codeBegin + this.content + '\n' + jsTemplate.codeEnd;
  }
}

// cssText
interface CssTextOptions {
  /**
   * Default: 'in-file-only'
   */
  includeComments?: 'in-file-only' | 'in-const' | false;
  /**
   * Default: true
   */
  tsDeclaration?: boolean;
  /**
   * Default: 'CSS_TEXT'
   */
  constName?: string | ((cssFilePath: string) => string | Promise<string>);
}

// omitUndefinedProperties
const omitUndefinedProperties = <T extends { [k: string]: any }>(
  obj: T,
): { [P in keyof T as T[P] extends undefined ? never : P]: T[P] } =>
  Object.entries(obj).reduce(
    (resultObj, [propName, propVal]) =>
      typeof propVal === 'undefined'
        ? resultObj
        : { ...resultObj, [propName]: propVal },
    {},
  ) as any;

const defaultOptions: Partial<CssTextOptions> = {
  includeComments: 'in-file-only',
  tsDeclaration: true,
  constName: 'CSS_TEXT',
};

const cssText = (cssTextOptions: CssTextOptions = {}): Plugin => {
  const {
    includeComments,
    tsDeclaration,
    constName: givenConstName,
  } = {
    ...defaultOptions,
    ...omitUndefinedProperties(cssTextOptions),
  };

  return {
    name: 'css-text',
    async writeBundle({ format, exports, dir }) {
      if (exports !== 'named' && exports !== 'default') {
        throw new Error(
          'you must set rollup "output.exports" option to either "named" or "default"',
        );
      }

      if (
        format !== 'amd' &&
        format !== 'cjs' &&
        format !== 'es' &&
        format !== 'iife' &&
        format !== 'system' &&
        format !== 'umd'
      ) {
        throw new Error(
          'the value of rollup "output.format" option is invalid',
        );
      }

      if (!dir) {
        throw new Error('you must set rollup "output.dir" option');
      }

      const cssFiles = await getCssFiles(dir);

      for (const cssFile of cssFiles) {
        const constName =
          (typeof givenConstName === 'function'
            ? await givenConstName(cssFile.path)
            : givenConstName) ?? 'CSS_TEXT';

        const jsFile = new JsFile(format, exports, constName);

        if (includeComments === 'in-const') {
          jsFile.pushConstValue(cssFile.content);
        } else if (includeComments === 'in-file-only') {
          parseCss(cssFile.content, (blockType, blockContent) => {
            if (blockType === 'style') {
              if (/^\s+$/.test(blockContent)) {
                jsFile.pushContent(blockContent);
              } else {
                jsFile.pushContent(blockContent.match(/^\s*/)![0]);
                jsFile.pushConstValue(blockContent.trim());
                jsFile.pushContent(blockContent.match(/\s*$/)![0]);
              }
            } else if (blockType === 'comment') {
              jsFile.pushContent(blockContent);
            }
          });
        } else if (includeComments === false) {
          let styleContent = '';

          parseCss(cssFile.content, (blockType, blockContent) => {
            if (blockType === 'style') {
              styleContent += blockContent.trim();
            }
          });

          jsFile.pushConstValue(styleContent);
        }

        const jsContent = jsFile.getContent();

        await fsPromises.writeFile(
          path.join(cssFile.dirPath, `${cssFile.name}.css-text.js`),
          jsContent,
        );

        if (tsDeclaration) {
          await writeTsDeclaration(cssFile.dirPath, cssFile.name, constName);
        }
      }
    },
  };
};

export default cssText;

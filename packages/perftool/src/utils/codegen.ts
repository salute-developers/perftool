type NamedImport = string | { original: string; alias: string };

type FormatImportExpressionParams =
    | {
          namedImports: readonly NamedImport[];
          defaultImportIdentity?: string;
      }
    | {
          namedImports?: readonly NamedImport[];
          defaultImportIdentity: string;
      };

export function formatImportExpression(
    modulePath: string,
    { namedImports, defaultImportIdentity }: FormatImportExpressionParams,
): string {
    const importParts = [];

    if (defaultImportIdentity) {
        importParts.push(defaultImportIdentity);
    }

    if (namedImports && namedImports.length) {
        const line = namedImports
            .map((imp) => {
                if (typeof imp === 'string') {
                    return imp;
                }

                return `${imp.original} as ${imp.alias}`;
            })
            .join(', ');

        importParts.push(`{ ${line} }`);
    }

    if (!importParts.length) {
        return '';
    }

    return `import ${importParts.join(', ')} from '${modulePath}';`;
}

export function formatLines(lines: string[]): string {
    return lines.join('\r\n');
}

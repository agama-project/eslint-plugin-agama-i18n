/*
 * Copyright (c) [2026] SUSE LLC
 *
 * Fail-closed check for user-facing JSX props.
 *
 * Any JSX prop that can receive a plain string is treated as user-facing
 * unless a human classified it as machine-facing. User-facing props must
 * receive a TranslatedString (the result of the _() or n_() functions),
 * never a plain string.
 *
 * The classification lives in a committed, human-authored map passed
 * through the `map` option, keyed by package name:
 *
 *   {
 *     "@patternfly/react-core": {
 *       "version": "6.5.1",
 *       "components": {
 *         "ToggleGroupItem": {
 *           "translatable": ["text"],
 *           "machine": ["buttonId"]
 *         },
 *         "Button": { "translatable": [] }
 *       }
 *     }
 *   }
 *
 * Coverage:
 *   - Props listed in `alwaysUserFacing` (aria-label, placeholder, title,
 *     alt, ...) are checked on every JSX element, HTML tags included.
 *   - On components coming from the packages listed in the `packages`
 *     option ("*" covers every component):
 *       1. a component absent from the map is reported at every use site,
 *          forcing a holistic review of its props;
 *       2. props listed as "translatable" must receive a TranslatedString;
 *       3. props listed as "machine", or covered by the built-in machine
 *          classification, are skipped;
 *       4. any other prop whose declared type accepts a plain string is
 *          reported as unclassified: the classification must land in the
 *          map, even when the value happens to be translated.
 *   - When a package section records a `version` and the installed version
 *     differs, the rule reports it (once per file), forcing a human review
 *     of the map on every package update.
 *
 * The map section under the "*" key applies to components whose declaring
 * package cannot be resolved (for example local components covered via
 * `packages: ["*"]`).
 *
 * The default is an error: an unclassified string-accepting prop cannot
 * silently reach the UI.
 */

const fs = require("fs");
const path = require("path");
const { ESLintUtils } = require("@typescript-eslint/utils");

// NOTE: this rule deliberately avoids requiring the "typescript" module.
// The numeric values of enums like ts.TypeFlags differ between TypeScript
// major versions (String is 4 in 5.x and 32 in 6.x), and the copy resolved
// from the plugin can differ from the one building the linted project.
// Only version-stable Type APIs (intrinsicName, isUnion, isStringLiteral)
// are used instead.

// props that never carry user-facing text even though they are plain strings
const DEFAULT_MACHINE_PROPS = [
  "autoComplete",
  "className",
  "dir",
  "form",
  "href",
  "htmlFor",
  "id",
  "inputMode",
  "key",
  "lang",
  "name",
  "rel",
  "role",
  "src",
  "srcSet",
  "target",
  "type",
];

// attribute names carrying user-facing text on any element, HTML included
const DEFAULT_ALWAYS_USER_FACING = [
  "alt",
  "aria-description",
  "aria-label",
  "aria-placeholder",
  "aria-roledescription",
  "aria-valuetext",
  "placeholder",
  "title",
];

// versions of installed packages, cached for the whole lint run
const installedVersions = new Map();

/**
 * The version of the package installed under the closest node_modules,
 * walking up from the given directory, or undefined when not found
 * @param {string} pkg
 * @param {string} fromDir
 * @returns {string | undefined}
 */
function installedVersion(pkg, fromDir) {
  const cacheKey = `${fromDir}\0${pkg}`;
  if (installedVersions.has(cacheKey)) return installedVersions.get(cacheKey);

  let version;
  let dir = fromDir;
  for (;;) {
    const manifest = path.join(dir, "node_modules", ...pkg.split("/"), "package.json");
    if (fs.existsSync(manifest)) {
      try {
        version = JSON.parse(fs.readFileSync(manifest, "utf8")).version;
      } catch {
        version = undefined;
      }
      break;
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }

  installedVersions.set(cacheKey, version);
  return version;
}

/**
 * Whether the type is the plain "string" primitive or "any"
 * @param {import("typescript").Type} type
 * @returns {boolean}
 */
function isStringOrAny(type) {
  return ["string", "any"].includes(type.intrinsicName);
}

/**
 * Collect the members of a union type, or the type itself otherwise
 * @param {import("typescript").Type} type
 * @returns {import("typescript").Type[]}
 */
function unionParts(type) {
  return type.isUnion() ? type.types : [type];
}

module.exports = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Require TranslatedString values in user-facing JSX props (fail-closed)",
      requiresTypeChecking: true,
    },
    messages: {
      untranslated:
        'The "{{ prop }}" prop is user-facing and needs a translated text: wrap the value with _().',
      unclassifiedProp:
        'The "{{ prop }}" prop of "{{ component }}" accepts a plain string and is not classified in the translated-props map: ' +
        'list it under "translatable" or "machine".',
      unmappedComponent:
        'The "{{ component }}" component is not in the translated-props map: ' +
        'review its props and add an entry to the "{{ package }}" section.',
      staleMap:
        'The translated-props map section "{{ package }}" was reviewed at version {{ pinned }} ' +
        "but {{ installed }} is installed: review the section and update its version.",
    },
    schema: [
      {
        type: "object",
        properties: {
          // packages whose components are checked; "*" covers every component
          packages: { type: "array", items: { type: "string" } },
          // the type alias name marking already translated texts
          translatedType: { type: "string" },
          // extra attribute names checked on every element
          alwaysUserFacing: { type: "array", items: { type: "string" } },
          // the human-authored prop classification, keyed by package name;
          // the "*" key applies to components without a resolvable package
          map: {
            type: "object",
            additionalProperties: {
              type: "object",
              properties: {
                // the package version the map was reviewed against
                version: { type: "string" },
                components: {
                  type: "object",
                  additionalProperties: {
                    type: "object",
                    properties: {
                      translatable: { type: "array", items: { type: "string" } },
                      machine: { type: "array", items: { type: "string" } },
                    },
                    additionalProperties: false,
                  },
                },
              },
              additionalProperties: false,
            },
          },
        },
        additionalProperties: false,
      },
    ],
  },

  create: function (context) {
    const options = context.options[0] || {};
    const packages = options.packages || [];
    const translatedType = options.translatedType || "TranslatedString";
    const map = options.map || {};
    const machineProps = new Set(DEFAULT_MACHINE_PROPS);
    const alwaysUserFacing = new Set([
      ...DEFAULT_ALWAYS_USER_FACING,
      ...(options.alwaysUserFacing || []),
    ]);

    const services = ESLintUtils.getParserServices(context);
    const checker = services.program.getTypeChecker();
    const cwd = context.cwd ?? process.cwd();

    // coverage and map lookup per opening element, computed once even when
    // the element has many attributes
    const elementInfoCache = new WeakMap();
    // contextual props type per opening element
    const propsTypeCache = new WeakMap();
    // packages whose version pin was already checked in this file
    const checkedVersions = new Set();

    /**
     * Whether the type is (or aliases) the translated string type
     * @param {import("typescript").Type} type
     * @returns {boolean}
     */
    function isTranslated(type) {
      if (type.aliasSymbol?.escapedName === translatedType) return true;
      // an intersection including the translated type is assignable to it
      if (type.isIntersection()) return type.types.some(isTranslated);
      return type.isUnion() && type.types.every(isTranslated);
    }

    /**
     * Whether the type contains a plain (not translated) string
     * @param {import("typescript").Type} type
     * @returns {boolean}
     */
    function containsPlainString(type) {
      return unionParts(type).some((part) => {
        if (isTranslated(part)) return false;
        // treat `any` as a plain string: the rule fails closed
        if (isStringOrAny(part) || part.isStringLiteral()) return true;
        // a branded intersection (string & { tag }) other than the
        // translated type still carries a plain string
        return part.isIntersection() && part.types.some(containsPlainString);
      });
    }

    /**
     * Report the attribute when its value is not a translated text
     * @param {Object} attribute the JSXAttribute ESTree node
     * @param {string} propName
     */
    function checkValue(attribute, propName) {
      const { value } = attribute;
      // a bare boolean prop (`<Foo compact />`) carries no text
      if (!value) return;

      const expression =
        value.type === "JSXExpressionContainer" ? value.expression : value;
      // an empty expression container (`prop={}`) is a syntax error anyway
      if (expression.type === "JSXEmptyExpression") return;
      // a JSX element value is checked by the rules covering its own content
      if (expression.type === "JSXElement" || expression.type === "JSXFragment")
        return;

      // string literals and template literals are plain strings by
      // definition, no type information needed (and the type checker
      // reports unreliable types for literals used as attribute values)
      const isLiteralString =
        (expression.type === "Literal" && typeof expression.value === "string") ||
        expression.type === "TemplateLiteral";

      if (!isLiteralString) {
        const type = services.getTypeAtLocation(expression);
        if (!containsPlainString(type)) return;
      }

      context.report({
        node: expression,
        messageId: "untranslated",
        data: { prop: propName },
      });
    }

    /**
     * The name of the package declaring the component rendered by the
     * opening element, or undefined when it cannot be determined (local
     * components, unresolved imports)
     * @param {Object} openingElement the JSXOpeningElement ESTree node
     * @returns {string | undefined}
     */
    function declaringPackage(openingElement) {
      const tsNode = services.esTreeNodeToTSNodeMap.get(openingElement.name);
      let symbol = checker.getSymbolAtLocation(tsNode);
      if (!symbol) return undefined;
      try {
        // resolve import aliases to the original symbol; throws when the
        // symbol is not an alias (checking SymbolFlags.Alias is not an
        // option, see the note about numeric enum values above)
        symbol = checker.getAliasedSymbol(symbol);
      } catch {
        // not an alias: keep the symbol as is
      }

      const declaration = symbol.declarations?.[0];
      if (!declaration) return undefined;

      const fileName = declaration.getSourceFile().fileName;
      // "…/node_modules/@scope/name/…" or "…/node_modules/name/…"
      const match = fileName.match(
        /node_modules\/((?:@[^/]+\/)?[^/]+)/,
      );
      return match?.[1];
    }

    /**
     * The rendered tag name ("div", "ToggleGroupItem", "PF.Button")
     * @param {Object} openingElement the JSXOpeningElement ESTree node
     * @returns {string}
     */
    function elementName(openingElement) {
      const { name } = openingElement;
      if (name.type === "JSXMemberExpression") return name.property.name;
      return name.name;
    }

    /**
     * Coverage and map classification for the component rendered by the
     * opening element:
     *   - covered: whether the component belongs to a covered package
     *   - name: the component name
     *   - pkg: the declaring package, when resolvable
     *   - section: the map section the component falls under
     *   - sectionPkg: the key of that section ("*" for the fallback)
     *   - entry: the component's classification, when present in the map
     * @param {Object} openingElement the JSXOpeningElement ESTree node
     * @returns {Object}
     */
    function elementInfo(openingElement) {
      if (elementInfoCache.has(openingElement)) {
        return elementInfoCache.get(openingElement);
      }

      const info = computeElementInfo(openingElement);
      elementInfoCache.set(openingElement, info);
      return info;
    }

    /** @see elementInfo */
    function computeElementInfo(openingElement) {
      const name = elementName(openingElement);
      // lowercase tags are plain HTML: only alwaysUserFacing applies there
      if (/^[a-z]/.test(name)) return { covered: false };

      const starCovered = packages.includes("*");
      if (!starCovered && packages.length === 0) return { covered: false };

      const pkg = declaringPackage(openingElement);
      if (!starCovered && (pkg === undefined || !packages.includes(pkg))) {
        return { covered: false };
      }

      let section = pkg !== undefined && Object.hasOwn(map, pkg) ? map[pkg] : undefined;
      let sectionPkg = pkg;
      if (!section) {
        section = Object.hasOwn(map, "*") ? map["*"] : undefined;
        sectionPkg = "*";
      }

      const components = section?.components || {};
      const entry = Object.hasOwn(components, name) ? components[name] : undefined;

      return { covered: true, name, pkg, section, sectionPkg, entry };
    }

    /**
     * Whether the prop is classified as machine-facing, either by the
     * built-in classification or by the component's map entry
     * @param {Object | undefined} entry the component's map entry
     * @param {string} propName
     * @returns {boolean}
     */
    function isMachineProp(entry, propName) {
      if (propName.startsWith("data-")) return true;
      if (/^on[A-Z]/.test(propName)) return true;
      if (machineProps.has(propName)) return true;
      return Boolean(entry?.machine?.includes(propName));
    }

    /**
     * Whether the prop declared with this type can receive a plain string.
     * Props typed with literal unions ("primary" | "secondary"), booleans,
     * numbers or callbacks cannot, so they are out of scope.
     * @param {import("typescript").Type | undefined} propType
     * @returns {boolean}
     */
    function acceptsString(propType) {
      // no type information: fail closed and check the value
      if (!propType) return true;

      return unionParts(propType).some(isStringOrAny);
    }

    /**
     * The declared type of the prop in the component props, if resolvable
     * @param {Object} attribute the JSXAttribute ESTree node
     * @param {string} propName
     * @returns {import("typescript").Type | undefined}
     */
    function declaredPropType(attribute, propName) {
      const openingElement = attribute.parent;
      const tsOpening = services.esTreeNodeToTSNodeMap.get(openingElement);

      let propsType;
      if (propsTypeCache.has(openingElement)) {
        propsType = propsTypeCache.get(openingElement);
      } else {
        propsType = checker.getContextualType(tsOpening.attributes);
        propsTypeCache.set(openingElement, propsType);
      }

      const property = propsType?.getProperty(propName);
      if (!property) return undefined;
      return checker.getTypeOfSymbolAtLocation(property, tsOpening);
    }

    /**
     * Report a stale version pin for the section covering the component,
     * once per file and package
     * @param {Object} openingElement the JSXOpeningElement ESTree node
     * @param {Object} info the element info (see elementInfo)
     */
    function checkVersionPin(openingElement, info) {
      const pinned = info.section?.version;
      // the "*" fallback section covers no concrete package to compare with
      if (!pinned || info.sectionPkg === "*") return;
      if (checkedVersions.has(info.sectionPkg)) return;
      checkedVersions.add(info.sectionPkg);

      const installed = installedVersion(info.sectionPkg, cwd);
      if (installed === pinned) return;

      context.report({
        node: openingElement.name,
        messageId: "staleMap",
        data: {
          package: info.sectionPkg,
          pinned,
          installed: installed || "an unknown version",
        },
      });
    }

    return {
      JSXOpeningElement(node) {
        const info = elementInfo(node);
        if (!info.covered) return;

        checkVersionPin(node, info);

        if (!info.entry) {
          context.report({
            node: node.name,
            messageId: "unmappedComponent",
            data: { component: info.name, package: info.pkg || "*" },
          });
        }
      },

      JSXAttribute(node) {
        // namespaced names (xlink:href) never carry user-facing text
        if (node.name.type !== "JSXIdentifier") return;
        const propName = node.name.name;

        // attributes that are user-facing on any element, HTML included
        if (alwaysUserFacing.has(propName)) {
          checkValue(node, propName);
          return;
        }

        const info = elementInfo(node.parent);
        if (!info.covered) return;
        // an unmapped component is already reported as a whole
        if (!info.entry) return;

        if (info.entry.translatable?.includes(propName)) {
          checkValue(node, propName);
          return;
        }

        if (isMachineProp(info.entry, propName)) return;

        if (!acceptsString(declaredPropType(node, propName))) return;

        context.report({
          node: node.name,
          messageId: "unclassifiedProp",
          data: { prop: propName, component: info.name },
        });
      },
    };
  },
};

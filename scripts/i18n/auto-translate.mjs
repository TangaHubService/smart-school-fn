/**
 * Babel plugin: wraps user-visible English text in `tx("…")`, which looks the text up in
 * src/i18n/ui/<lang>.json at runtime. The English text is the key, so pages are written in
 * plain English; run `npm run i18n:extract` to list text that still needs a translation.
 */
const TEXT_NAMES = new Set(
  ('title,subtitle,label,placeholder,aria-label,ariaLabel,description,message,alt,header,heading,helperText,helper,hint,' +
    'emptyTitle,emptyMessage,confirmLabel,cancelLabel,submitLabel,text,caption,tooltip,eyebrow,detail,emptyLabel,' +
    'loadingLabel,searchPlaceholder,body,summary,note,sub,subLabel,required_error,invalid_type_error,backLabel,actionLabel,cta').split(',')
);
const NON_TEXT_NAMES = new Set('className,class,d,style,value,id,key,type,name,href,to,src,path,queryKey,points,viewBox,rel,target,fontFamily,font,accept,pattern,prompt,remark,status,Authorization,queryFn'.split(','));
const VALIDATORS = /^(min|max|email|url|refine|regex|required|length|matches|oneOf|nonempty|superRefine)$/;
const SETTERS = /^set[A-Z]\w*(Error|Message|Notice|Feedback)$|^set(Error|Message|Notice)$/;
const SKIP_FILE = /[\\/]src[\\/]i18n[\\/]|ai-material-export/;
/** Reads like a sentence or phrase rather than a code value. */
const isPhrase = s => /^[A-Z"“]?[A-Za-z{'’]+[^<>=;_]* [^<>=;_]*$/.test(s) && /^[A-Z{"“]/.test(s) && /[a-z]{2}/.test(s);
/** Never shown to people: auth headers and developer errors. */
const isTechnical = s => /^Bearer |must be used (inside|within)/.test(s);
const isBrand = s => isTechnical(s) || /^(Smart School( Rwanda)?|https?:|\S+@\S+)/.test(s) && !/ .* .* /.test(s);
const hasWords = s => /[A-Za-z]{2}/.test(s.replace(/\{\{\d+\}\}/g, '').replace(/&\w+;/g, ''));

/** Fields holding code values (PRESENT, MOTHER, …) that pages draw as they are. */
const CODE_FIELDS = new Set('status,relationship,priority,gender,decision,severity,examType,role,category'.split(','));

export const keyOf = s => s.replace(/\s+/g, ' ').trim();

/** Same whitespace rules React applies to JSX text. */
function jsxText(value) {
  const lines = value.split(/\r\n|\n|\r/);
  let last = 0;
  lines.forEach((l, i) => /[^ \t]/.test(l) && (last = i));
  let out = '';
  lines.forEach((l, i) => {
    let s = l.replace(/\t/g, ' ');
    if (i !== 0) s = s.replace(/^ +/, '');
    if (i !== lines.length - 1) s = s.replace(/ +$/, '');
    if (s) out += i !== last ? s + ' ' : s;
  });
  return out;
}

const propName = p => (p.node.computed ? null : p.node.key.name ?? p.node.key.value);

function isVisible(path, raw) {
  // Code values such as PENDING are only ever text when drawn directly in JSX.
  if (/^[A-Z][A-Z0-9_]+$/.test(raw) && !path.findParent(p => p.isJSXExpressionContainer() || p.isFunction())?.isJSXExpressionContainer()) return false;
  let top = path;
  let parent = path.parentPath;
  while (
    (parent.isConditionalExpression() && top.key !== 'test') ||
    parent.isLogicalExpression() ||
    parent.isTSAsExpression() ||
    parent.isTSSatisfiesExpression() ||
    (parent.isBinaryExpression({ operator: '+' }))
  ) {
    top = parent;
    parent = parent.parentPath;
  }
  if (parent.isJSXAttribute()) return TEXT_NAMES.has(parent.node.name.name);
  if (parent.isJSXExpressionContainer()) {
    const owner = parent.parentPath;
    if (owner.node.openingElement?.name?.name === 'style') return false;
    return owner.isJSXAttribute() ? TEXT_NAMES.has(owner.node.name.name) : true;
  }
  if (parent.isObjectProperty() && top.key === 'value') {
    const name = propName(parent);
    if (TEXT_NAMES.has(name)) return true;
    if (NON_TEXT_NAMES.has(name)) return false;
    if (typeof name === 'string' && /^[A-Z][A-Z0-9_]+$/.test(name)) return /^[A-Z][a-z]/.test(raw);
    return isPhrase(raw);
  }
  // Default prop values: ({ actionsLabel = 'Actions' }) => …
  if (parent.isAssignmentPattern() && top.key === 'right') {
    const name = parent.node.left.name ?? '';
    return TEXT_NAMES.has(name) || /(Label|Title|Message|Text|Placeholder)$/.test(name);
  }
  if (parent.isCallExpression() && top.listKey === 'arguments') {
    const callee = parent.node.callee;
    // Word choices inside a template, e.g. `${n} ${n === 1 ? 'day' : 'days'}`.
    if (callee.name === '__tx') return top.key > 0 && /^[A-Za-z][A-Za-z ,]+$/.test(raw);
    if (SETTERS.test(callee.name ?? '')) return true;
    if (VALIDATORS.test(callee.property?.name ?? '')) return / /.test(raw);
    return /^(confirm|alert)$/.test(callee.name ?? callee.property?.name ?? '');
  }
  if (parent.isNewExpression()) return parent.node.callee.name === 'Error';
  if (parent.isReturnStatement() || parent.isVariableDeclarator() || parent.isAssignmentExpression()) return isPhrase(raw);
  if (parent.isArrowFunctionExpression() && top.key === 'body') return isPhrase(raw);
  if (parent.isArrayExpression()) return isPhrase(raw);
  return false;
}

export default function autoTranslate({ types: t }, options = {}) {
  const runtime = options.runtime ?? '/src/i18n/tx';
  const collect = options.collect;

  const call = (state, raw, args = []) => {
    const key = keyOf(raw);
    collect?.(key, state.filename);
    state.txUsed = true;
    const lead = /^\s/.test(raw) ? ' ' : '';
    const tail = /\s$/.test(raw) ? ' ' : '';
    let node = t.callExpression(t.identifier('__tx'), [t.stringLiteral(key), ...args]);
    if (lead) node = t.binaryExpression('+', t.stringLiteral(lead), node);
    if (tail) node = t.binaryExpression('+', node, t.stringLiteral(tail));
    return node;
  };

  const visitor = {
    JSXText(path, state) {
      const raw = jsxText(path.node.value);
      if (!hasWords(raw) || isBrand(raw.trim())) return;
      const tag = path.parent.openingElement?.name?.name;
      if (tag === 'style' || tag === 'code' || tag === 'script') return;
      path.replaceWith(t.jsxExpressionContainer(call(state, raw)));
      path.skip();
    },
    StringLiteral(path, state) {
      const raw = path.node.value;
      if (!hasWords(raw) || isBrand(raw) || !isVisible(path, raw)) return;
      const node = call(state, raw);
      path.replaceWith(path.parentPath.isJSXAttribute() ? t.jsxExpressionContainer(node) : node);
      path.skip();
    },
    JSXExpressionContainer(path, state) {
      const { expression } = path.node;
      if (!path.parentPath.isJSXElement() || !(t.isMemberExpression(expression) || t.isOptionalMemberExpression(expression))) return;
      if (expression.computed || !CODE_FIELDS.has(expression.property.name)) return;
      state.txUsed = true;
      path.node.expression = t.callExpression(t.identifier('__tx'), [expression]);
    },
    /** Dates written with an English locale follow the chosen language instead. */
    'CallExpression|NewExpression'(path, state) {
      const { callee, arguments: args } = path.node;
      const name = callee.property?.name;
      if (!/^(toLocaleDateString|toLocaleTimeString|DateTimeFormat)$/.test(name ?? '')) return;
      const locale = args[0];
      if (t.isStringLiteral(locale) && /^en-(GB|US|RW)$/.test(locale.value)) {
        state.txUsed = true;
        args[0] = t.callExpression(t.identifier('__tx'), [t.stringLiteral(locale.value)]);
      } else if (name !== 'DateTimeFormat' && (!locale || t.isIdentifier(locale, { name: 'undefined' }))) {
        state.txUsed = true;
        args[0] = t.memberExpression(t.identifier('__tx'), t.identifier('locale'));
      }
    },
    TemplateLiteral(path, state) {
      if (path.parentPath.isTaggedTemplateExpression()) return;
      const { quasis, expressions } = path.node;
      const raw = quasis.map((q, i) => q.value.cooked + (i < expressions.length ? `{{${i}}}` : '')).join('');
      if (!hasWords(raw) || /^\{\{0\}\}[-/.]|^[a-z-]+\{\{|https?:|rounded|px-|\.pdf/.test(raw) && !/ [a-z]+ /.test(raw)) return;
      if (isTechnical(raw) || !isVisible(path, raw)) return;
      path.replaceWith(call(state, raw, expressions));
    },
  };

  return {
    name: 'auto-translate',
    visitor: {
      Program: {
        // Runs before the JSX transform sees the file.
        enter(program, state) {
          if (!state.filename || SKIP_FILE.test(state.filename) || /node_modules/.test(state.filename)) return;
          program.traverse(visitor, state);
          if (!state.txUsed) return;
          program.node.body.unshift(
            t.importDeclaration(
              [t.importSpecifier(t.identifier('__tx'), t.identifier('tx'))],
              t.stringLiteral(runtime)
            )
          );
          program.scope.crawl();
        },
      },
    },
  };
}

const ALLOWED_TAGS = new Set([
  "a",
  "b",
  "blockquote",
  "br",
  "code",
  "div",
  "em",
  "i",
  "img",
  "li",
  // MathML tags (used by WIRIS MathType)
  "math",
  "mi",
  "mn",
  "mo",
  "mrow",
  "msqrt",
  "mroot",
  "msub",
  "msup",
  "msubsup",
  "mfrac",
  "mtext",
  "mover",
  "munder",
  "munderover",
  "mtable",
  "mtr",
  "mtd",
  "mspace",
  "mpadded",
  "mstyle",
  "menclose",
  "mphantom",
  "merror",
  "mmultiscripts",
  "mprescripts",
  "none",
  "semantics",
  "annotation",
  "annotation-xml",
  "mglyph",
  "maligngroup",
  "malignmark",
  "mlabeledtr",
  // Standard HTML tags
  "ol",
  "p",
  "span",
  "strong",
  "sub",
  "sup",
  "table",
  "tbody",
  "td",
  "th",
  "thead",
  "tr",
  "u",
  "ul",
]);

const DROP_WITH_CONTENT_TAGS = new Set([
  "base",
  "embed",
  "form",
  "iframe",
  "input",
  "link",
  "meta",
  "object",
  "script",
  "select",
  "style",
  "textarea",
]);

const ALLOWED_ATTRIBUTES = new Set([
  "alt",
  "class",
  "colspan",
  "height",
  "href",
  "rel",
  "role",
  "rowspan",
  "src",
  "style",
  "target",
  "title",
  "width",
  // MathML attributes (used by WIRIS MathType)
  "xmlns",
  "mathvariant",
  "stretchy",
  "fence",
  "separator",
  "lspace",
  "rspace",
  "accent",
  "accentunder",
  "form",
  "largeop",
  "movablelimits",
  "symmetric",
  "display",
  "mathsize",
  "mathcolor",
  "mathbackground",
  "columnalign",
  "rowalign",
  "columnspacing",
  "rowspacing",
  "encoding",
  "linethickness",
  "notation",
  "bevelled",
  "open",
  "close",
  "separators",
  "subscriptshift",
  "superscriptshift",
  "columnspan",
  "rowspan",
  "columnlines",
  "rowlines",
  "frame",
  "framespacing",
  "equalrows",
  "equalcolumns",
  "displaystyle",
  "scriptlevel",
  "maxsize",
  "minsize",
]);

const SAFE_URL_PATTERN = /^(https?:|mailto:|tel:|\/|#|data:image\/)/i;

const stripTags = (value: string): string => value.replace(/<[^>]*>/g, "");

const isSafeUrl = (value: string): boolean => {
  const normalized = value.trim();
  if (normalized.length === 0) {
    return false;
  }
  return SAFE_URL_PATTERN.test(normalized);
};

export const sanitizeRichHtml = (value: string): string => {
  if (!value) {
    return "";
  }

  if (typeof window === "undefined") {
    return stripTags(value);
  }

  const parser = new DOMParser();
  const parsed = parser.parseFromString(value, "text/html");
  const { body } = parsed;

  const sanitizeNode = (node: Node): void => {
    if (node.nodeType === Node.TEXT_NODE) {
      return;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) {
      node.parentNode?.removeChild(node);
      return;
    }

    const element = node as HTMLElement;
    const tagName = element.tagName.toLowerCase();

    if (DROP_WITH_CONTENT_TAGS.has(tagName)) {
      element.remove();
      return;
    }

    if (!ALLOWED_TAGS.has(tagName)) {
      const parent = element.parentNode;
      if (!parent) {
        element.remove();
        return;
      }

      while (element.firstChild) {
        parent.insertBefore(element.firstChild, element);
      }
      parent.removeChild(element);
      return;
    }

    for (const attribute of [...element.attributes]) {
      const attributeName = attribute.name.toLowerCase();
      const attributeValue = attribute.value;

      if (attributeName.startsWith("on")) {
        element.removeAttribute(attribute.name);
        continue;
      }

      if (
        !ALLOWED_ATTRIBUTES.has(attributeName) &&
        !attributeName.startsWith("data-") &&
        !attributeName.startsWith("aria-")
      ) {
        element.removeAttribute(attribute.name);
        continue;
      }

      if ((attributeName === "href" || attributeName === "src") && !isSafeUrl(attributeValue)) {
        element.removeAttribute(attribute.name);
      }
    }

    if (tagName === "a") {
      const href = element.getAttribute("href");
      if (href && !href.startsWith("#")) {
        element.setAttribute("target", "_blank");
        element.setAttribute("rel", "noopener noreferrer");
      }
    }

    const children = [...element.childNodes];
    children.forEach((child) => sanitizeNode(child));
  };

  [...body.childNodes].forEach((child) => sanitizeNode(child));
  return body.innerHTML;
};


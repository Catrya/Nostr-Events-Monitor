/** A `name:value` tag filter as typed in the form. Splits on the first colon only: values can contain colons (URLs, `a` tag addresses). */
export function parseTagFilter(tag: string): [name: string, value: string] | null {
  const i = tag.indexOf(':');
  if (i < 0) return null;
  const name = tag.slice(0, i).trim();
  const value = tag.slice(i + 1).trim();
  return name && value ? [name, value] : null;
}

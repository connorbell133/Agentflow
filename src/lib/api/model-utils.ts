export async function buildBodyJson(body_config: any, vars: any, content?: any): Promise<any> {
  const mergedVars = { ...vars };
  if (content !== undefined) {
    mergedVars.content = content;
  }

  const deepClone = (val: any): any => {
    if (Array.isArray(val)) return val.map(deepClone);
    if (val && typeof val === 'object') {
      const out: any = {};
      Object.entries(val).forEach(([k, v]) => {
        out[k] = deepClone(v);
      });
      return out;
    }
    return val;
  };

  const resolveString = (str: string): any => {
    // Support both ${var} and {{var}} syntax for exact replacement
    const exactMatch = str.match(/^\$\{(\w+)\}$/) || str.match(/^\{\{(\w+)\}\}$/);
    if (exactMatch) {
      const key = exactMatch[1];
      return mergedVars[key];
    }

    // Inline replacement -> stringify injected values
    // Support both syntaxes
    let result = str.replace(/\$\{(\w+)\}/g, (_m, key) => {
      const val = mergedVars[key];
      if (val === undefined || val === null) return '';
      if (typeof val === 'string') return val;
      try {
        return JSON.stringify(val);
      } catch {
        return String(val);
      }
    });

    // Also replace {{var}} syntax
    result = result.replace(/\{\{(\w+)\}\}/g, (_m, key) => {
      const val = mergedVars[key];
      if (val === undefined || val === null) return '';
      if (typeof val === 'string') return val;
      try {
        return JSON.stringify(val);
      } catch {
        return String(val);
      }
    });

    return result;
  };

  const walk = (val: any): any => {
    if (Array.isArray(val)) return val.map(walk);
    if (val && typeof val === 'object') {
      const out: any = {};
      Object.entries(val).forEach(([k, v]) => {
        out[k] = walk(v);
      });
      return out;
    }
    if (typeof val === 'string') return resolveString(val);
    return val;
  };

  return walk(deepClone(body_config));
}

export function getByPath(obj: any, path: string): any {
  if (!path) return obj;
  const tokens = path.replace(/\[(\d+)\]/g, '.$1').split('.').filter(Boolean);
  return tokens.reduce((acc, key) => (acc == null ? undefined : acc[key]), obj);
}
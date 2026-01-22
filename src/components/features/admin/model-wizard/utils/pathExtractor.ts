/**
 * Extracts a value from a nested object using dot notation and array indices
 * Examples: "data.items[0].name", "response.choices[0].message.content"
 */
export const getValueAtPath = (obj: any, path: string): any => {
  if (!path || path.trim() === '') {
    return obj;
  }

  // Split by dots, but preserve array indices
  const parts = path.split('.');
  let currentValue = obj;
  
  for (const part of parts) {
    if (!part) continue;
    
    // Check if this part contains array indices
    const arrayMatch = part.match(/([^[]+)(\[(\d+)\])/);
    
    if (arrayMatch) {
      // Handle property with array index (e.g., "output[1]")
      const [, propName, , arrayIndex] = arrayMatch;
      const index = parseInt(arrayIndex, 10);
      
      // First access the property
      if (
        currentValue === null ||
        currentValue === undefined ||
        !(propName in currentValue)
      ) {
        throw new Error(`Key '${propName}' not found`);
      }
      currentValue = currentValue[propName];
      
      // Then access the array index
      if (
        !Array.isArray(currentValue) ||
        index < 0 ||
        index >= currentValue.length
      ) {
        throw new Error(`Invalid array index '[${index}]' for '${propName}'`);
      }
      currentValue = currentValue[index];
    } else if (part.startsWith("[") && part.endsWith("]")) {
      // Handle standalone array index (e.g., "[0]")
      const index = parseInt(part.slice(1, -1), 10);
      if (
        !Array.isArray(currentValue) ||
        index < 0 ||
        index >= currentValue.length
      ) {
        throw new Error(`Invalid array index '${part}'`);
      }
      currentValue = currentValue[index];
    } else {
      // Handle simple property access
      if (
        currentValue === null ||
        currentValue === undefined ||
        !(part in currentValue)
      ) {
        throw new Error(`Key '${part}' not found`);
      }
      currentValue = currentValue[part];
    }
  }
  
  return currentValue;
};

/**
 * Safe JSON parser that returns empty object on error
 */
export const safeParseJSON = (text: string): unknown => {
  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
};

/**
 * Safe JSON parser for utilities (with default value)
 */
export const safeJsonParse = (text: string, defaultValue: unknown = {}): unknown => {
  try {
    return JSON.parse(text);
  } catch {
    return defaultValue;
  }
};
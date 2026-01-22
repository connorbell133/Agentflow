import React, { useState, useMemo } from "react";
import AJV from "ajv";

import "./styles.css";

function App() {
  const [schema, setSchema] = useState("");
  const [data, setData] = useState("");

  const result = useMemo(() => {
    if (schema && data) {
      try {
        const ajv = new AJV({
          allErrors: true,
          verbose: true,
        });
        const __schema = JSON.parse(schema);
        const __data = JSON.parse(data);
        const validate = ajv.compile(__schema);
        const isValid = validate(__data);

        if (isValid) {
          return "All good here";
        } else {
          return JSON.stringify(validate.errors, null, 2);
        }
      } catch (err) {
        console.log(err);
        return "an error occurred";
      }
    }
    return "missing schema or data";
  }, [schema, data]);

  return (
    <div className="App">
      <div>
        <label>Schema</label>
        <textarea value={schema} onChange={(e) => setSchema(e.target.value)} />
      </div>
      <div>
        <label>Data</label>
        <textarea value={data} onChange={(e) => setData(e.target.value)} />
      </div>

      <div>
        <pre>{result}</pre>
      </div>
    </div>
  );
}

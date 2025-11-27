import React, { useState } from "react";
import "./App.css";
import NodeEditor from "./components/NodeEditor";
import ControlLibrary from "./components/ControlLibrary";
import ImageLibrary from "./components/ImageLibrary";
import { FunctionDef, Graph, Node } from "./types/graph";
import { graphToPython } from "./lib/codegen/python";
import { pythonToGraph } from "./lib/parser/python";

function App(): React.JSX.Element {
  const [graph, setGraph] = useState<Graph>({ nodes: [], edges: [] });
  const [images, setImages] = useState<{ id: string; name: string; dataUrl: string }[]>([]);
  const [functions, setFunctions] = useState<FunctionDef[]>([]);

  function onAddNode(n: Node): void {
    setGraph({ nodes: [...graph.nodes, n], edges: graph.edges });
  }

  function onCreateFunction(def: FunctionDef): void {
    setFunctions([...functions, def]);
  }

  function exportPy(): void {
    const code = graphToPython(graph);
    const blob = new Blob([code], { type: "text/x-python" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "script.py";
    a.click();
    URL.revokeObjectURL(url);
  }

  function importPy(e: React.ChangeEvent<HTMLInputElement>): void {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      const code = String(reader.result);
      const g = pythonToGraph(code);
      setGraph(g);
    };
    reader.readAsText(f);
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "240px 1fr 240px", gridTemplateRows: "48px 1fr", height: "100vh" }}>
      <div style={{ gridColumn: "1 / -1", gridRow: "1", display: "flex", alignItems: "center", gap: 8, padding: "0 12px", background: "#0b1220", color: "#e5e7eb", borderBottom: "1px solid #1f2937" }}>
        <div style={{ fontWeight: 700 }}>Sikuli 挂件</div>
        <button onClick={exportPy} style={{ marginLeft: 12 }}>导出 Python</button>
        <label style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <input type="file" accept=".py" onChange={importPy} />
          导入 Python
        </label>
      </div>
      <ControlLibrary onAddNode={onAddNode} />
      <NodeEditor graph={graph} setGraph={setGraph} onCreateFunction={onCreateFunction} functionLibrary={functions} />
      <ImageLibrary images={images} onAddImage={(i) => setImages([...images, i])} />
    </div>
  );
}

export default App;

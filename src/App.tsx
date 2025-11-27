import React, { useEffect, useRef, useState } from "react";
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
  const pastRef = useRef<Graph[]>([]);
  const futureRef = useRef<Graph[]>([]);

  function cloneGraph(g: Graph): Graph {
    return JSON.parse(JSON.stringify(g)) as Graph;
  }

  function applyGraph(next: Graph): void {
    pastRef.current.push(cloneGraph(graph));
    setGraph(next);
    futureRef.current = [];
  }

  function undo(): void {
    if (pastRef.current.length === 0) return;
    const prev = pastRef.current.pop()!;
    futureRef.current.push(cloneGraph(graph));
    setGraph(prev);
  }

  function redo(): void {
    if (futureRef.current.length === 0) return;
    const next = futureRef.current.pop()!;
    pastRef.current.push(cloneGraph(graph));
    setGraph(next);
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.ctrlKey && !e.shiftKey && e.key.toLowerCase() === "z") {
        e.preventDefault();
        undo();
      } else if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "z") {
        e.preventDefault();
        redo();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [graph]);

  function onAddNode(n: Node): void {
    applyGraph({ nodes: [...graph.nodes, n], edges: graph.edges });
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
      applyGraph(g);
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
      <ControlLibrary onAddNode={onAddNode} functions={functions} />
      <NodeEditor
        graph={graph}
        setGraph={applyGraph}
        setGraphLive={setGraph}
        beginLiveChange={() => {
          pastRef.current.push(cloneGraph(graph));
          futureRef.current = [];
        }}
        commitLiveChange={() => {
          /* No-op: past already recorded at begin; current graph contains end */
        }}
        onCreateFunction={onCreateFunction}
        onUpdateFunction={(updated) => {
          setFunctions(functions.map(f => (f.id === updated.id ? updated : f)));
        }}
        functionLibrary={functions}
      />
      <ImageLibrary images={images} onAddImage={(i) => setImages([...images, i])} />
    </div>
  );
}

export default App;

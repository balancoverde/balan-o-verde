import React, { useCallback, useMemo, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Handle,
  Position,
  addEdge,
  useEdgesState,
  useNodesState,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  Save,
  FolderOpen,
  Plus,
  Trash2,
  Undo2,
  Redo2,
  BarChart3,
  ArrowRight,
  ArrowDownToLine,
  ArrowUpFromLine,
  Settings2,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import "./process.css";

const STORAGE_KEY = "balanco-verde-processo-v5";
const ANALYSIS_KEY = "balanco-verde-analysis-input";

const COMPONENTS = [
  "Água",
  "Etanol",
  "Açúcar",
  "Proteínas",
  "Sais",
  "CO₂",
  "Malte",
  "Lúpulo",
  "Sólidos",
  "Resíduos",
];

const UNIT_DEFS = {
  tanque: {
    label: "Tanque",
    category: "Operações",
  },
  misturador: {
    label: "Misturador",
    category: "Operações",
  },
  separador: {
    label: "Separador",
    category: "Operações",
  },
  filtro: {
    label: "Filtro",
    category: "Operações",
  },
  destilador: {
    label: "Destilador",
    category: "Operações",
  },
  evaporador: {
    label: "Evaporador",
    category: "Operações",
  },
  secador: {
    label: "Secador",
    category: "Operações",
  },
  centrifuga: {
    label: "Centrífuga",
    category: "Operações",
  },
  trocador: {
    label: "Trocador",
    category: "Operações",
  },
  reator: {
    label: "Reator",
    category: "Reação",
  },
  fermentador: {
    label: "Fermentador",
    category: "Reação",
  },
  reciclo: {
    label: "Reciclo",
    category: "Correntes",
  },
  purga: {
    label: "Purga",
    category: "Correntes",
  },
  divisao: {
    label: "Divisão de corrente",
    category: "Correntes",
  },
  bypass: {
    label: "By-pass",
    category: "Correntes",
  },
  personalizada: {
    label: "Unidade personalizada",
    category: "Personalizada",
  },
};

const CATEGORY_ORDER = [
  "Operações",
  "Reação",
  "Correntes",
  "Personalizada",
];

function makeId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function makeUnit(type, position) {
  return {
    id: makeId("unit"),
    type: "equipment",
    position,
    data: {
      nodeRole: "unit",
      unitType: type,
      name: UNIT_DEFS[type]?.label || "Unidade",
      transformation:
        type === "reator" || type === "fermentador"
          ? "Química"
          : "Física",
      operation: "Contínua",
      regime: "Estacionário",
      inputs: ["in-1"],
      outputs: ["out-1"],
    },
  };
}

function makeBoundary(role, position) {
  const isInput = role === "input";

  return {
    id: makeId(isInput ? "input" : "output"),
    type: "boundary",
    position,
    data: {
      nodeRole: role,
      name: isInput ? "Alimentação" : "Produto",
      streamType: isInput ? "Entrada externa" : "Saída externa",
      flow: "",
      unit: "kg/h",
      components: [],
    },
  };
}

function EquipmentNode({ data, selected }) {
  const inputs = data.inputs || ["in-1"];
  const outputs = data.outputs || ["out-1"];

  return (
    <div className={`equipment-node ${selected ? "selected" : ""}`}>
      {inputs.map((id, index) => (
        <Handle
          key={id}
          id={id}
          type="target"
          position={Position.Left}
          style={{
            top: `${((index + 1) / (inputs.length + 1)) * 100}%`,
          }}
        />
      ))}

      <div className="equipment-icon">
        {data.unitType === "destilador" ? "D" : "U"}
      </div>

      <div className="equipment-content">
        <strong>{data.name}</strong>
        <span>{data.transformation}</span>
        <small>{data.regime}</small>
      </div>

      {outputs.map((id, index) => (
        <Handle
          key={id}
          id={id}
          type="source"
          position={Position.Right}
          style={{
            top: `${((index + 1) / (outputs.length + 1)) * 100}%`,
          }}
        />
      ))}
    </div>
  );
}

function BoundaryNode({ data, selected }) {
  const isInput = data.nodeRole === "input";

  return (
    <div
      className={`boundary-node ${
        isInput ? "boundary-input" : "boundary-output"
      } ${selected ? "selected" : ""}`}
    >
      {isInput ? (
        <Handle type="source" position={Position.Right} id="stream-out" />
      ) : (
        <Handle type="target" position={Position.Left} id="stream-in" />
      )}

      <div className="boundary-icon">
        {isInput ? <ArrowRight size={18} /> : <ArrowRight size={18} />}
      </div>

      <div className="boundary-content">
        <strong>{data.name}</strong>
        <span>{isInput ? "Corrente de entrada" : "Corrente de saída"}</span>
        {data.flow ? (
          <small>
            {data.flow} {data.unit || "kg/h"}
          </small>
        ) : (
          <small>Vazão desconhecida</small>
        )}
      </div>
    </div>
  );
}

const nodeTypes = {
  equipment: EquipmentNode,
  boundary: BoundaryNode,
};

function Process() {
  const navigate = useNavigate();

  const initialNodes = useMemo(
    () => [
      makeBoundary("input", { x: 80, y: 220 }),
      makeUnit("destilador", { x: 420, y: 180 }),
      makeBoundary("output", { x: 800, y: 100 }),
      makeBoundary("output", { x: 800, y: 330 }),
    ],
    []
  );

  const initialEdges = useMemo(() => [], []);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const [selectedId, setSelectedId] = useState(null);
  const [history, setHistory] = useState([]);
  const [future, setFuture] = useState([]);

  const selectedNode = nodes.find((node) => node.id === selectedId);
  const selectedEdge = edges.find((edge) => edge.id === selectedId);

  const saveHistory = useCallback(() => {
    setHistory((prev) => [
      ...prev.slice(-19),
      {
        nodes: structuredClone(nodes),
        edges: structuredClone(edges),
      },
    ]);
    setFuture([]);
  }, [nodes, edges]);

  const onConnect = useCallback(
    (connection) => {
      saveHistory();

      const source = nodes.find((n) => n.id === connection.source);
      const target = nodes.find((n) => n.id === connection.target);

      let name = `Corrente ${edges.length + 1}`;

      if (source?.data?.nodeRole === "input") {
        name = source.data.name || "Alimentação";
      } else if (target?.data?.nodeRole === "output") {
        name = target.data.name || "Produto";
      }

      const edge = {
        ...connection,
        id: makeId("edge"),
        type: "smoothstep",
        data: {
          name,
          flow: "",
          unit: "kg/h",
          components: [],
        },
        label: name,
        animated: false,
      };

      setEdges((eds) => addEdge(edge, eds));
    },
    [nodes, edges.length, saveHistory, setEdges]
  );

  function updateNodeData(patch) {
    if (!selectedNode) return;

    saveHistory();

    setNodes((current) =>
      current.map((node) =>
        node.id === selectedNode.id
          ? {
              ...node,
              data: {
                ...node.data,
                ...patch,
              },
            }
          : node
      )
    );
  }

  function updateEdgeData(patch) {
    if (!selectedEdge) return;

    saveHistory();

    setEdges((current) =>
      current.map((edge) =>
        edge.id === selectedEdge.id
          ? {
              ...edge,
              data: {
                ...(edge.data || {}),
                ...patch,
              },
              label: patch.name ?? edge.data?.name,
            }
          : edge
      )
    );
  }

  function addInputPort() {
    if (!selectedNode || selectedNode.type !== "equipment") return;

    saveHistory();

    setNodes((current) =>
      current.map((node) =>
        node.id === selectedNode.id
          ? {
              ...node,
              data: {
                ...node.data,
                inputs: [
                  ...(node.data.inputs || []),
                  `in-${(node.data.inputs || []).length + 1}`,
                ],
              },
            }
          : node
      )
    );
  }

  function addOutputPort() {
    if (!selectedNode || selectedNode.type !== "equipment") return;

    saveHistory();

    setNodes((current) =>
      current.map((node) =>
        node.id === selectedNode.id
          ? {
              ...node,
              data: {
                ...node.data,
                outputs: [
                  ...(node.data.outputs || []),
                  `out-${(node.data.outputs || []).length + 1}`,
                ],
              },
            }
          : node
      )
    );
  }

  function addUnit(type) {
    saveHistory();

    setNodes((current) => [
      ...current,
      makeUnit(type, {
        x: 300 + Math.random() * 300,
        y: 100 + Math.random() * 350,
      }),
    ]);
  }

  function addBoundary(role) {
    saveHistory();

    const node = makeBoundary(role, {
      x: role === "input" ? 80 : 800,
      y: 100 + Math.random() * 350,
    });

    setNodes((current) => [...current, node]);
    setSelectedId(node.id);
  }

  function deleteSelected() {
    if (!selectedId) return;

    saveHistory();

    setNodes((current) =>
      current.filter((node) => node.id !== selectedId)
    );

    setEdges((current) =>
      current.filter(
        (edge) =>
          edge.id !== selectedId &&
          edge.source !== selectedId &&
          edge.target !== selectedId
      )
    );

    setSelectedId(null);
  }

  function undo() {
    if (!history.length) return;

    const previous = history[history.length - 1];

    setFuture((current) => [
      ...current,
      {
        nodes: structuredClone(nodes),
        edges: structuredClone(edges),
      },
    ]);

    setNodes(previous.nodes);
    setEdges(previous.edges);
    setHistory((current) => current.slice(0, -1));
  }

  function redo() {
    if (!future.length) return;

    const next = future[future.length - 1];

    setHistory((current) => [
      ...current,
      {
        nodes: structuredClone(nodes),
        edges: structuredClone(edges),
      },
    ]);

    setNodes(next.nodes);
    setEdges(next.edges);
    setFuture((current) => current.slice(0, -1));
  }

  function saveProcess() {
    const payload = {
      version: 5,
      savedAt: new Date().toISOString(),
      nodes,
      edges,
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    localStorage.setItem(ANALYSIS_KEY, JSON.stringify(payload));

    alert("Processo salvo com sucesso.");
  }

  function loadProcess() {
    const raw =
      localStorage.getItem(STORAGE_KEY) ||
      localStorage.getItem("balanco-verde-processo-v4");

    if (!raw) {
      alert("Nenhum processo salvo foi encontrado.");
      return;
    }

    try {
      const payload = JSON.parse(raw);

      setNodes(payload.nodes || []);
      setEdges(payload.edges || []);
      setSelectedId(null);

      localStorage.setItem(ANALYSIS_KEY, JSON.stringify(payload));

      alert("Processo carregado.");
    } catch {
      alert("Não foi possível carregar o processo.");
    }
  }

  function goAnalysis() {
    const payload = {
      version: 5,
      savedAt: new Date().toISOString(),
      nodes,
      edges,
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    localStorage.setItem(ANALYSIS_KEY, JSON.stringify(payload));

    navigate("/analise");
  }

  const connectedStreams = edges.length;

  return (
    <div className="process-page">
      <header className="process-header">
        <div>
          <div className="process-kicker">BALANÇO VERDE</div>
          <h1>Construtor de processo</h1>
          <p>Monte o fluxograma e informe os dados das correntes.</p>
        </div>

        <div className="process-actions">
          <button onClick={undo} disabled={!history.length}>
            <Undo2 size={17} />
            Desfazer
          </button>

          <button onClick={redo} disabled={!future.length}>
            <Redo2 size={17} />
            Refazer
          </button>

          <button onClick={saveProcess}>
            <Save size={17} />
            Salvar
          </button>

          <button onClick={loadProcess}>
            <FolderOpen size={17} />
            Carregar
          </button>

          <button
            className="danger-button"
            onClick={deleteSelected}
            disabled={!selectedId}
          >
            <Trash2 size={17} />
            Excluir
          </button>

          <button className="analysis-button" onClick={goAnalysis}>
            <BarChart3 size={17} />
            Analisar processo
          </button>
        </div>
      </header>

      <main className="process-workspace">
        <aside className="equipment-panel">
          <div className="panel-heading">
            <div>
              <strong>Biblioteca</strong>
              <span>Elementos do processo</span>
            </div>
          </div>

          {CATEGORY_ORDER.map((category) => (
            <section key={category} className="library-section">
              <div className="library-title">{category}</div>

              {Object.entries(UNIT_DEFS)
                .filter(([, definition]) => definition.category === category)
                .map(([key, definition]) => (
                  <button
                    key={key}
                    className="library-item"
                    onClick={() => addUnit(key)}
                  >
                    <span className="library-item-icon">+</span>
                    <span>{definition.label}</span>
                  </button>
                ))}
            </section>
          ))}

          <section className="library-section stream-library">
            <div className="library-title">Correntes externas</div>

            <button
              className="library-item stream-input-item"
              onClick={() => addBoundary("input")}
            >
              <ArrowDownToLine size={17} />
              <span>Corrente de entrada</span>
            </button>

            <button
              className="library-item stream-output-item"
              onClick={() => addBoundary("output")}
            >
              <ArrowUpFromLine size={17} />
              <span>Corrente de saída</span>
            </button>
          </section>
        </aside>

        <section className="canvas-area">
          <div className="canvas-toolbar">
            <div>
              <strong>Fluxograma</strong>
              <span>
                Arraste, conecte as correntes e selecione os elementos.
              </span>
            </div>

            <div className="canvas-stats">
              <span>{nodes.filter((n) => n.type === "equipment").length} unidades</span>
              <span>{connectedStreams} correntes</span>
            </div>
          </div>

          <div className="flow-wrapper">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              nodeTypes={nodeTypes}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onNodeClick={(_, node) => setSelectedId(node.id)}
              onEdgeClick={(_, edge) => setSelectedId(edge.id)}
              onPaneClick={() => setSelectedId(null)}
              fitView
              snapToGrid
              snapGrid={[20, 20]}
            >
              <Background gap={20} size={1} />
              <Controls />
              <MiniMap />
            </ReactFlow>
          </div>

          <div className="process-status">
            <span>
              <b>{nodes.filter((n) => n.type === "equipment").length}</b> unidades
            </span>
            <span>
              <b>{edges.length}</b> correntes
            </span>
            <span>
              <b>
                {edges.filter((edge) => {
                  const source = nodes.find((n) => n.id === edge.source);
                  return source?.data?.nodeRole === "input";
                }).length}
              </b>{" "}
              entradas externas
            </span>
            <span>
              <b>
                {edges.filter((edge) => {
                  const target = nodes.find((n) => n.id === edge.target);
                  return target?.data?.nodeRole === "output";
                }).length}
              </b>{" "}
              saídas externas
            </span>
          </div>
        </section>

        <aside className="properties-panel">
          <div className="properties-header">
            <div>
              <Settings2 size={18} />
              <strong>Propriedades</strong>
            </div>

            {selectedId && (
              <button onClick={() => setSelectedId(null)}>
                <X size={17} />
              </button>
            )}
          </div>

          {!selectedNode && !selectedEdge && (
            <div className="empty-properties">
              <div className="empty-properties-icon">
                <Settings2 size={24} />
              </div>
              <strong>Nenhum elemento selecionado</strong>
              <p>
                Selecione uma unidade ou uma corrente no fluxograma para
                editar seus dados.
              </p>
            </div>
          )}

          {selectedNode?.type === "equipment" && (
            <div className="property-content">
              <div className="property-tag">UNIDADE</div>

              <h2>{selectedNode.data.name}</h2>

              <label>
                Nome
                <input
                  value={selectedNode.data.name || ""}
                  onChange={(e) =>
                    updateNodeData({ name: e.target.value })
                  }
                />
              </label>

              <label>
                Transformação
                <select
                  value={selectedNode.data.transformation || "Física"}
                  onChange={(e) =>
                    updateNodeData({ transformation: e.target.value })
                  }
                >
                  <option>Física</option>
                  <option>Química</option>
                </select>
              </label>

              <label>
                Operação
                <select
                  value={selectedNode.data.operation || "Contínua"}
                  onChange={(e) =>
                    updateNodeData({ operation: e.target.value })
                  }
                >
                  <option>Contínua</option>
                  <option>Semi-contínua</option>
                  <option>Batela</option>
                </select>
              </label>

              <label>
                Regime
                <select
                  value={selectedNode.data.regime || "Estacionário"}
                  onChange={(e) =>
                    updateNodeData({ regime: e.target.value })
                  }
                >
                  <option>Estacionário</option>
                  <option>Transiente</option>
                </select>
              </label>

              <div className="connections-box">
                <div className="connections-title">
                  <strong>Conexões</strong>
                </div>

                <div className="connection-group">
                  <div className="connection-group-header">
                    <span>Entradas</span>
                    <button onClick={addInputPort}>
                      <Plus size={15} />
                    </button>
                  </div>

                  {(selectedNode.data.inputs || []).map((id, index) => (
                    <div className="connection-row" key={id}>
                      Entrada {index + 1}
                    </div>
                  ))}
                </div>

                <div className="connection-group">
                  <div className="connection-group-header">
                    <span>Saídas</span>
                    <button onClick={addOutputPort}>
                      <Plus size={15} />
                    </button>
                  </div>

                  {(selectedNode.data.outputs || []).map((id, index) => (
                    <div className="connection-row" key={id}>
                      Saída {index + 1}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {selectedNode?.type === "boundary" && (
            <div className="property-content">
              <div className="property-tag">
                {selectedNode.data.nodeRole === "input"
                  ? "CORRENTE DE ENTRADA"
                  : "CORRENTE DE SAÍDA"}
              </div>

              <h2>{selectedNode.data.name}</h2>

              <label>
                Nome da corrente
                <input
                  value={selectedNode.data.name || ""}
                  onChange={(e) =>
                    updateNodeData({ name: e.target.value })
                  }
                />
              </label>

              <label>
                Vazão
                <input
                  type="number"
                  min="0"
                  step="any"
                  placeholder="Ex.: 100"
                  value={selectedNode.data.flow ?? ""}
                  onChange={(e) =>
                    updateNodeData({ flow: e.target.value })
                  }
                />
              </label>

              <label>
                Unidade
                <select
                  value={selectedNode.data.unit || "kg/h"}
                  onChange={(e) =>
                    updateNodeData({ unit: e.target.value })
                  }
                >
                  <option>kg/h</option>
                  <option>kg/s</option>
                  <option>kg/dia</option>
                  <option>t/h</option>
                </select>
              </label>

              <div className="component-box">
                <div className="component-title">
                  <strong>Composição</strong>
                </div>

                {COMPONENTS.map((component) => {
                  const current =
                    selectedNode.data.components?.find(
                      (item) => item.name === component
                    )?.fraction ?? "";

                  return (
                    <label key={component} className="fraction-row">
                      <span>{component}</span>

                      <input
                        type="number"
                        min="0"
                        max="1"
                        step="0.01"
                        placeholder="—"
                        value={current}
                        onChange={(e) => {
                          const components = [
                            ...(selectedNode.data.components || []),
                          ];

                          const index = components.findIndex(
                            (item) => item.name === component
                          );

                          const item = {
                            name: component,
                            fraction: e.target.value,
                          };

                          if (index >= 0) {
                            components[index] = item;
                          } else {
                            components.push(item);
                          }

                          updateNodeData({ components });
                        }}
                      />
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {selectedEdge && (
            <div className="property-content">
              <div className="property-tag">CORRENTE</div>

              <h2>{selectedEdge.data?.name || "Corrente"}</h2>

              <label>
                Nome
                <input
                  value={selectedEdge.data?.name || ""}
                  onChange={(e) =>
                    updateEdgeData({ name: e.target.value })
                  }
                />
              </label>

              <label>
                Vazão
                <input
                  type="number"
                  min="0"
                  step="any"
                  placeholder="Desconhecida"
                  value={selectedEdge.data?.flow ?? ""}
                  onChange={(e) =>
                    updateEdgeData({ flow: e.target.value })
                  }
                />
              </label>

              <label>
                Unidade
                <select
                  value={selectedEdge.data?.unit || "kg/h"}
                  onChange={(e) =>
                    updateEdgeData({ unit: e.target.value })
                  }
                >
                  <option>kg/h</option>
                  <option>kg/s</option>
                  <option>kg/dia</option>
                  <option>t/h</option>
                </select>
              </label>
            </div>
          )}
        </aside>
      </main>
    </div>
  );
}

export default Process;
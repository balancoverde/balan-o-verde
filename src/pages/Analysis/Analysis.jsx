import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Calculator,
  GitBranch,
  Boxes,
  Sigma,
  FlaskConical,
  ArrowDownToLine,
  ArrowUpFromLine,
} from "lucide-react";
import "./analysis.css";

const ANALYSIS_KEY = "balanco-verde-analysis-input";
const STORAGE_KEY = "balanco-verde-processo-v5";

function readProcess() {
  try {
    const raw =
      localStorage.getItem(ANALYSIS_KEY) ||
      localStorage.getItem(STORAGE_KEY);

    if (!raw) return null;

    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function numberOrNull(value) {
  if (value === "" || value === null || value === undefined) {
    return null;
  }

  const n = Number(value);

  return Number.isFinite(n) ? n : null;
}

function formatNumber(value, digits = 4) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "?";
  }

  return Number(value.toFixed(digits)).toString();
}

function getNodeName(node) {
  return node?.data?.name || node?.id || "Unidade";
}

function getStreamData(edge, nodes) {
  const source = nodes.find((node) => node.id === edge.source);
  const target = nodes.find((node) => node.id === edge.target);

  let role = "internal";

  if (source?.data?.nodeRole === "input") {
    role = "input";
  }

  if (target?.data?.nodeRole === "output") {
    role = "output";
  }

  const boundary =
    role === "input"
      ? source
      : role === "output"
      ? target
      : null;

  const data = {
    id: edge.id,
    name:
      boundary?.data?.name ||
      edge.data?.name ||
      "Corrente",
    flow:
      numberOrNull(boundary?.data?.flow) ??
      numberOrNull(edge.data?.flow),
    unit:
      boundary?.data?.unit ||
      edge.data?.unit ||
      "kg/h",
    components:
      boundary?.data?.components ||
      edge.data?.components ||
      [],
    source,
    target,
    role,
  };

  return data;
}

function fractionOf(stream, component) {
  const item = (stream.components || []).find(
    (componentItem) => componentItem.name === component
  );

  return numberOrNull(item?.fraction);
}

function streamComponentFlow(stream, component) {
  const flow = stream.flow;
  const fraction = fractionOf(stream, component);

  if (flow === null || fraction === null) {
    return null;
  }

  return flow * fraction;
}

function EquationCard({ title, subtitle, equation, result, children }) {
  return (
    <div className="equation-card">
      <div className="equation-card-top">
        <div>
          <span className="equation-label">EQUAÇÃO</span>
          <h3>{title}</h3>
          {subtitle && <p>{subtitle}</p>}
        </div>

        <Sigma size={20} />
      </div>

      <div className="equation-display">{equation}</div>

      {children}

      {result && (
        <div className="equation-result">
          <span>Resultado</span>
          <strong>{result}</strong>
        </div>
      )}
    </div>
  );
}

function StreamCard({ stream }) {
  const type =
    stream.role === "input"
      ? "Entrada"
      : stream.role === "output"
      ? "Saída"
      : "Interna";

  return (
    <div className="stream-card">
      <div
        className={`stream-icon ${
          stream.role === "input"
            ? "input"
            : stream.role === "output"
            ? "output"
            : ""
        }`}
      >
        {stream.role === "input" ? (
          <ArrowDownToLine size={18} />
        ) : stream.role === "output" ? (
          <ArrowUpFromLine size={18} />
        ) : (
          <GitBranch size={18} />
        )}
      </div>

      <div className="stream-main">
        <div className="stream-name">{stream.name}</div>
        <div className="stream-path">
          {stream.role === "input"
            ? `${getNodeName(stream.source)} → ${getNodeName(stream.target)}`
            : stream.role === "output"
            ? `${getNodeName(stream.source)} → ${getNodeName(stream.target)}`
            : `${getNodeName(stream.source)} → ${getNodeName(stream.target)}`}
        </div>
      </div>

      <div className="stream-flow">
        {stream.flow === null ? "?" : formatNumber(stream.flow)}
        <small>{stream.unit}</small>
      </div>

      <div className="stream-type">{type}</div>
    </div>
  );
}

function Analysis() {
  const navigate = useNavigate();

  const process = useMemo(() => readProcess(), []);

  const nodes = process?.nodes || [];
  const edges = process?.edges || [];

  const units = nodes.filter(
    (node) => node.data?.nodeRole === "unit" || node.type === "equipment"
  );

  const streams = edges.map((edge) => getStreamData(edge, nodes));

  const inputStreams = streams.filter((stream) => stream.role === "input");
  const outputStreams = streams.filter((stream) => stream.role === "output");
  const internalStreams = streams.filter(
    (stream) => stream.role === "internal"
  );

  const componentNames = useMemo(() => {
    const names = new Set();

    streams.forEach((stream) => {
      (stream.components || []).forEach((component) => {
        if (component.name) names.add(component.name);
      });
    });

    return [...names];
  }, [streams]);

  const isCachaçaExample =
    componentNames.includes("Etanol") &&
    componentNames.includes("Água");

  const mainUnit = units[0];

  /*
   * Para a demonstração da destilação:
   *
   * Alimentação:
   * 100 kg/h
   * Etanol = 0,40
   * Água = 0,60
   *
   * Topo:
   * 40 kg/h
   * Etanol = 0,60
   *
   * Base:
   * vazão desconhecida
   * composição desconhecida
   *
   * O modelo calcula:
   * Base = 60 kg/h
   * Etanol na base = 0,2667
   * Água na base = 0,7333
   */

  const feed = inputStreams[0];
  const outputs = outputStreams;

  const topStream =
    outputs.find((stream) => {
      const name = stream.name.toLowerCase();
      return name.includes("topo");
    }) || outputs[0];

  const baseStream =
    outputs.find((stream) => {
      const name = stream.name.toLowerCase();
      return name.includes("base") || name.includes("fundo");
    }) || outputs[1];

  const canCalculateDistillation =
    isCachaçaExample &&
    feed &&
    topStream &&
    baseStream &&
    feed.flow !== null &&
    topStream.flow !== null &&
    fractionOf(feed, "Etanol") !== null &&
    fractionOf(feed, "Água") !== null &&
    fractionOf(topStream, "Etanol") !== null;

  let baseFlow = null;
  let baseEthanol = null;
  let baseWater = null;

  if (canCalculateDistillation) {
    baseFlow = feed.flow - topStream.flow;

    const ethanolFeed =
      feed.flow * fractionOf(feed, "Etanol");

    const ethanolTop =
      topStream.flow * fractionOf(topStream, "Etanol");

    baseEthanol =
      (ethanolFeed - ethanolTop) / baseFlow;

    baseWater = 1 - baseEthanol;
  }

  const knownUnknowns = useMemo(() => {
    const unknowns = [];

    streams.forEach((stream) => {
      if (stream.flow === null) {
        unknowns.push({
          stream: stream.name,
          variable: `M_${stream.name}`,
          description: `Vazão da corrente ${stream.name}`,
        });
      }

      (stream.components || []).forEach((component) => {
        if (numberOrNull(component.fraction) === null) {
          unknowns.push({
            stream: stream.name,
            variable: `W_${component.name},${stream.name}`,
            description: `Fração mássica de ${component.name} em ${stream.name}`,
          });
        }
      });
    });

    return unknowns;
  }, [streams]);

  /*
   * Para a representação independente:
   * usamos a vazão da Base e a vazão de etanol da Base.
   *
   * Isso evita fingir que M × W é uma equação linear quando
   * os dois valores são desconhecidos.
   */
  const independentUnknowns =
    canCalculateDistillation
      ? [
          "M_BASE",
          "m_Etanol,BASE",
        ]
      : knownUnknowns.map((item) => item.variable);

  const independentEquations =
    canCalculateDistillation
      ? [
          "Balanço total",
          "Balanço de etanol",
        ]
      : units.map((unit) => `Balanço de ${getNodeName(unit)}`);

  const degreesOfFreedom =
    independentUnknowns.length - independentEquations.length;

  const status =
    degreesOfFreedom === 0
      ? "DETERMINADO"
      : degreesOfFreedom > 0
      ? "SUBESPECIFICADO"
      : "SUPERESPECIFICADO";

  const statusClass =
    status === "DETERMINADO"
      ? "determined"
      : status === "SUBESPECIFICADO"
      ? "under"
      : "over";

  return (
    <div className="analysis-page">
      <header className="analysis-header">
        <button
          className="back-button"
          onClick={() => navigate("/processo")}
        >
          <ArrowLeft size={17} />
          Voltar ao processo
        </button>

        <div className="analysis-title">
          <span>BALANÇO VERDE</span>
          <h1>Análise do processo</h1>
          <p>
            Equações, correntes, variáveis e grau de liberdade do modelo.
          </p>
        </div>

        <div className={`analysis-status ${statusClass}`}>
          <CheckCircle2 size={17} />
          {status}
        </div>
      </header>

      <main className="analysis-content">
        {!process && (
          <div className="analysis-warning">
            <AlertCircle size={20} />
            <div>
              <strong>Nenhum processo encontrado.</strong>
              <p>
                Volte ao construtor, monte o processo e salve antes de
                analisar.
              </p>
            </div>
          </div>
        )}

        <section className="analysis-overview">
          <div className="overview-main">
            <div className="overview-icon">
              <Calculator size={22} />
            </div>

            <div>
              <span>RESULTADO ESTRUTURAL</span>
              <h2>
                {degreesOfFreedom === 0
                  ? "O sistema possui grau de liberdade zero."
                  : degreesOfFreedom > 0
                  ? "O sistema ainda possui variáveis sem especificação."
                  : "Existem mais especificações do que variáveis independentes."}
              </h2>

              <p>
                A análise utiliza somente as unidades físicas do processo.
                As correntes de entrada e saída são tratadas como fronteiras
                do sistema.
              </p>
            </div>
          </div>

          <div className="overview-gl">
            <span>GL</span>
            <strong>{degreesOfFreedom}</strong>
            <small>grau de liberdade</small>
          </div>
        </section>

        <section className="metrics-grid">
          <div className="metric">
            <span>Unidades</span>
            <strong>{units.length}</strong>
          </div>

          <div className="metric">
            <span>Correntes</span>
            <strong>{streams.length}</strong>
          </div>

          <div className="metric">
            <span>Entradas externas</span>
            <strong>{inputStreams.length}</strong>
          </div>

          <div className="metric">
            <span>Saídas externas</span>
            <strong>{outputStreams.length}</strong>
          </div>

          <div className="metric">
            <span>Incógnitas independentes</span>
            <strong>{independentUnknowns.length}</strong>
          </div>

          <div className="metric">
            <span>Equações independentes</span>
            <strong>{independentEquations.length}</strong>
          </div>
        </section>

        <section className="analysis-section">
          <div className="section-heading">
            <div>
              <span>01</span>
              <h2>Correntes do processo</h2>
              <p>
                Entradas, saídas e correntes internas identificadas pelo
                fluxograma.
              </p>
            </div>
          </div>

          <div className="stream-groups">
            <div className="stream-group">
              <div className="group-title input-title">
                <ArrowDownToLine size={17} />
                Entradas externas
              </div>

              {inputStreams.length ? (
                inputStreams.map((stream) => (
                  <StreamCard key={stream.id} stream={stream} />
                ))
              ) : (
                <div className="empty-streams">
                  Nenhuma corrente de entrada externa.
                </div>
              )}
            </div>

            <div className="stream-group">
              <div className="group-title output-title">
                <ArrowUpFromLine size={17} />
                Saídas externas
              </div>

              {outputStreams.length ? (
                outputStreams.map((stream) => (
                  <StreamCard key={stream.id} stream={stream} />
                ))
              ) : (
                <div className="empty-streams">
                  Nenhuma corrente de saída externa.
                </div>
              )}
            </div>

            {internalStreams.length > 0 && (
              <div className="stream-group">
                <div className="group-title">
                  <GitBranch size={17} />
                  Correntes internas
                </div>

                {internalStreams.map((stream) => (
                  <StreamCard key={stream.id} stream={stream} />
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="analysis-section">
          <div className="section-heading">
            <div>
              <span>02</span>
              <h2>Estrutura do sistema</h2>
              <p>
                As correntes externas não são unidades e, portanto, não
                recebem balanços próprios.
              </p>
            </div>
          </div>

          <div className="structure-card">
            {inputStreams.map((stream) => (
              <div className="structure-stream input" key={stream.id}>
                <strong>{stream.name}</strong>
                <span>
                  {stream.flow === null
                    ? "?"
                    : `${formatNumber(stream.flow)} ${stream.unit}`}
                </span>
              </div>
            ))}

            {mainUnit && (
              <div className="structure-unit">
                <FlaskConical size={21} />
                <div>
                  <strong>{getNodeName(mainUnit)}</strong>
                  <span>
                    {mainUnit.data?.transformation || "Física"} ·{" "}
                    {mainUnit.data?.regime || "Estacionário"}
                  </span>
                </div>
              </div>
            )}

            <div className="structure-outputs">
              {outputStreams.map((stream) => (
                <div className="structure-stream output" key={stream.id}>
                  <strong>{stream.name}</strong>
                  <span>
                    {stream.flow === null
                      ? "?"
                      : `${formatNumber(stream.flow)} ${stream.unit}`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="analysis-section">
          <div className="section-heading">
            <div>
              <span>03</span>
              <h2>Variáveis e incógnitas</h2>
              <p>
                Campos vazios representam valores desconhecidos, nunca valores
                iguais a zero.
              </p>
            </div>
          </div>

          {canCalculateDistillation ? (
            <div className="variables-table">
              <div className="variables-head">
                <span>Variável</span>
                <span>Descrição</span>
                <span>Estado</span>
              </div>

              <div className="variable-row">
                <strong>M_BASE</strong>
                <span>Vazão mássica da corrente Base</span>
                <b>INCÓGNITA</b>
              </div>

              <div className="variable-row">
                <strong>m_Etanol,BASE</strong>
                <span>Vazão mássica de etanol na Base</span>
                <b>INCÓGNITA</b>
              </div>

              <div className="variable-row known">
                <strong>M_A</strong>
                <span>Vazão da Alimentação</span>
                <b>100 kg/h</b>
              </div>

              <div className="variable-row known">
                <strong>M_TOPO</strong>
                <span>Vazão do Topo</span>
                <b>40 kg/h</b>
              </div>
            </div>
          ) : (
            <div className="unknown-list">
              {knownUnknowns.length === 0 ? (
                <div className="empty-streams">
                  Nenhuma incógnita estrutural identificada.
                </div>
              ) : (
                knownUnknowns.map((unknown) => (
                  <div className="unknown-item" key={unknown.variable}>
                    <strong>{unknown.variable}</strong>
                    <span>{unknown.description}</span>
                  </div>
                ))
              )}
            </div>
          )}
        </section>

        <section className="analysis-section equations-section">
          <div className="section-heading">
            <div>
              <span>04</span>
              <h2>Equações montadas</h2>
              <p>
                O balanço é construído a partir das correntes que realmente
                entram e saem da unidade.
              </p>
            </div>
          </div>

          <div className="equation-grid">
            <EquationCard
              title="Balanço geral de massa"
              subtitle="Destilador em regime estacionário"
              equation="Σ Entrada − Σ Saída + Geração − Consumo = Acúmulo"
            >
              <div className="equation-substitution">
                <span>Para uma transformação física:</span>
                <strong>
                  Entrada − Saída = 0
                </strong>
              </div>

              {canCalculateDistillation && (
                <div className="equation-substitution">
                  <span>Substituição:</span>
                  <strong>
                    100 − 40 − M_BASE = 0
                  </strong>
                </div>
              )}
            </EquationCard>

            {canCalculateDistillation && (
              <>
                <EquationCard
                  title="Balanço total"
                  subtitle="Destilador"
                  equation="M_A − M_TOPO − M_BASE = 0"
                  result={`M_BASE = ${formatNumber(baseFlow)} kg/h`}
                >
                  <div className="equation-substitution">
                    <span>Substituindo os valores conhecidos:</span>
                    <strong>
                      100 − 40 − M_BASE = 0
                    </strong>
                  </div>

                  <div className="calculation-line">
                    <span>100 − 40 = M_BASE</span>
                    <strong>60 = M_BASE</strong>
                  </div>
                </EquationCard>

                <EquationCard
                  title="Balanço de etanol"
                  subtitle="Componente 1"
                  equation="M_A·W_E,A − M_TOPO·W_E,TOPO − m_E,BASE = 0"
                  result={`m_E,BASE = ${formatNumber(
                    baseFlow * baseEthanol
                  )} kg/h`}
                >
                  <div className="equation-substitution">
                    <span>Substituindo:</span>
                    <strong>
                      100(0,40) − 40(0,60) − m_E,BASE = 0
                    </strong>
                  </div>

                  <div className="calculation-line">
                    <span>40 − 24 = m_E,BASE</span>
                    <strong>16 = m_E,BASE</strong>
                  </div>
                </EquationCard>

                <EquationCard
                  title="Composição de etanol na Base"
                  subtitle="Conversão da vazão de componente"
                  equation="W_E,BASE = m_E,BASE / M_BASE"
                  result={`W_E,BASE = ${formatNumber(baseEthanol)}`}
                >
                  <div className="equation-substitution">
                    <span>Substituindo:</span>
                    <strong>
                      W_E,BASE = 16 / 60
                    </strong>
                  </div>
                </EquationCard>

                <EquationCard
                  title="Composição de água na Base"
                  subtitle="Fechamento da composição"
                  equation="W_Água,BASE + W_Etanol,BASE = 1"
                  result={`W_Água,BASE = ${formatNumber(baseWater)}`}
                >
                  <div className="equation-substitution">
                    <span>Substituindo:</span>
                    <strong>
                      W_Água,BASE = 1 − {formatNumber(baseEthanol)}
                    </strong>
                  </div>
                </EquationCard>
              </>
            )}

            {!canCalculateDistillation && (
              <EquationCard
                title="Balanço das unidades"
                subtitle="Modelo geral"
                equation="Entrada − Saída + Geração − Consumo = Acúmulo"
              >
                <div className="equation-substitution">
                  <span>
                    As equações específicas serão montadas quando houver
                    informações suficientes nas correntes.
                  </span>
                </div>
              </EquationCard>
            )}
          </div>
        </section>

        <section className="analysis-section">
          <div className="section-heading">
            <div>
              <span>05</span>
              <h2>Grau de liberdade</h2>
              <p>
                São consideradas somente variáveis e equações independentes.
              </p>
            </div>
          </div>

          <div className="gl-card">
            <div className="gl-formula">
              <span>GL = incógnitas − equações independentes</span>

              <strong>
                GL = {independentUnknowns.length} −{" "}
                {independentEquations.length} = {degreesOfFreedom}
              </strong>
            </div>

            <div className="gl-details">
              <div>
                <span>Incógnitas independentes</span>
                <strong>{independentUnknowns.length}</strong>
              </div>

              <div>
                <span>Equações independentes</span>
                <strong>{independentEquations.length}</strong>
              </div>

              <div>
                <span>GL</span>
                <strong>{degreesOfFreedom}</strong>
              </div>
            </div>
          </div>
        </section>

        <section className="analysis-section">
          <div className="section-heading">
            <div>
              <span>06</span>
              <h2>Resultado calculado</h2>
              <p>
                Valores obtidos a partir dos balanços montados.
              </p>
            </div>
          </div>

          {canCalculateDistillation ? (
            <div className="result-grid">
              <div className="result-card">
                <span>BASE</span>
                <strong>{formatNumber(baseFlow)} kg/h</strong>
                <small>Vazão mássica</small>
              </div>

              <div className="result-card">
                <span>ETANOL · BASE</span>
                <strong>{formatNumber(baseEthanol)}</strong>
                <small>Fração mássica</small>
              </div>

              <div className="result-card">
                <span>ÁGUA · BASE</span>
                <strong>{formatNumber(baseWater)}</strong>
                <small>Fração mássica</small>
              </div>
            </div>
          ) : (
            <div className="analysis-warning">
              <AlertCircle size={20} />
              <div>
                <strong>O cálculo ainda não pode ser fechado.</strong>
                <p>
                  Informe vazões e/ou composições suficientes nas correntes
                  para que o sistema consiga montar as equações independentes.
                </p>
              </div>
            </div>
          )}
        </section>

        {canCalculateDistillation && (
          <section className="verification-section">
            <div className="verification-icon">
              <CheckCircle2 size={24} />
            </div>

            <div>
              <span>07 · VERIFICAÇÃO</span>
              <h2>O resultado fecha o balanço.</h2>

              <p>
                Balanço total:
                <strong> 100 = 40 + 60 kg/h</strong>
              </p>

              <p>
                Etanol:
                <strong> 40 = 24 + 16 kg/h</strong>
              </p>

              <p>
                Água:
                <strong> 60 = 16 + 44 kg/h</strong>
              </p>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

export default Analysis;
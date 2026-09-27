# Balanço Verde

Versão 4 do protótipo do Balanço Verde.

## Incluído
- Editor de processos com React Flow.
- Entradas e saídas ilimitadas por unidade.
- Correntes com vazão, unidade, componentes e frações mássicas editáveis.
- Campo vazio tratado como incógnita, nunca como zero.
- Persistência local do processo em `localStorage`.
- Página de análise com dados, incógnitas, equações, independência, grau de liberdade, informação faltante, caminho de solução e verificação.
- Português e English, com seletor PT/EN e preferência persistida.
- Modelo físico/químico, operação contínua/semi-contínua/batela e regime estacionário/transiente.

## Executar

```bash
npm install
npm run dev
```

Depois abra o endereço exibido pelo Vite.

## Teste da destilação de cachaça

1. Adicione um Destilador.
2. Deixe transformação Física, operação Contínua e regime Estacionário.
3. Adicione três correntes: Alimentação, Topo e Base.
4. Na Alimentação informe 100 kg/h, Etanol 0,40 e Água 0,60.
5. Deixe vazões e frações de Topo/Base vazias.
6. Salve e clique em Analisar processo.
7. A análise deve mostrar as equações, incógnitas, posto estrutural, GL e a necessidade de especificação adicional.
8. Informe uma vazão adicional e analise novamente para acompanhar as relações derivadas.

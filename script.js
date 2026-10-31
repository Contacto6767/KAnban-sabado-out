/**
 * ==============================================================================
 * KANBAN BRASIL - GESTÃO DE TAREFAS & DASHBOARD
 * ==============================================================================
 * Funcionalidades:
 * - Quadros fixos (A fazer, Em execução, Concluído) e novos quadros personalizados
 * - Rotação SPA entre Quadro (#/) e Dashboard (#/dashboard)
 * - 4 Indicadores em tempo real e gráfico temático de tarefas por categoria
 * - Tema Brasil: Animais brasileiros, comidas típicas e personalidades históricas
 * - Persistência completa em LocalStorage
 * - Restrições: Concluídas não alteram status; Vencidas exigem justificativa
 * ==============================================================================
 */

// Chaves de armazenamento no LocalStorage
const STORAGE_TASKS_KEY = 'antigravity_brasil_tasks';
const STORAGE_COLUMNS_KEY = 'antigravity_brasil_columns';

// ------------------------------------------------------------------------------
// CONSTANTES TEMÁTICAS DA FAUNA, CULINÁRIA E HISTÓRIA DO BRASIL
// ------------------------------------------------------------------------------

// Animais exclusivamente brasileiros para mascotes dos quadros
const ANIMAIS_BRASIL = [
    { id: 'capivara', nome: 'Capivara', emoji: '🐾' },
    { id: 'onca', nome: 'Onça-pintada', emoji: '🐆' },
    { id: 'arara', nome: 'Arara-azul', emoji: '🦜' },
    { id: 'mico', nome: 'Mico-leão-dourado', emoji: '🐒' },
    { id: 'tucano', nome: 'Tucano', emoji: '🪶' },
    { id: 'tamandua', nome: 'Tamanduá-bandeira', emoji: '🐜' },
    { id: 'boto', nome: 'Boto-cor-de-rosa', emoji: '🐬' },
    { id: 'lobo', nome: 'Lobo-guará', emoji: '🐺' }
];

// Comidas e frutas típicas brasileiras para categorias das tarefas
const CATEGORIAS_BRASIL = {
    pao_de_queijo: { nome: 'Pão de Queijo', emoji: '🧀' },
    feijoada: { nome: 'Feijoada', emoji: '🍲' },
    acai: { nome: 'Açaí', emoji: '🫐' },
    acaraje: { nome: 'Acarajé', emoji: '🧆' },
    tapioca: { nome: 'Tapioca', emoji: '🥞' },
    brigadeiro: { nome: 'Brigadeiro', emoji: '🍬' },
    caju: { nome: 'Caju', emoji: '🥜' },
    cupuacu: { nome: 'Cupuaçu', emoji: '🥥' },
    jabuticaba: { nome: 'Jabuticaba', emoji: '🍇' },
    pitanga: { nome: 'Pitanga', emoji: '🍒' }
};

// Frases divertidas para colunas vazias
const FRASES_VAZIAS = [
    { texto: 'Nenhuma tarefa aqui… hora de um pão de queijo quentinho!', emoji: '🧀' },
    { texto: 'Quadro vazio! Que tal uma tigela de açaí para comemorar?', emoji: '🫐' },
    { texto: 'Tudo limpo por aqui… já dá tempo de pedir um acarajé!', emoji: '🧆' },
    { texto: 'Sem pendências neste momento… merecemos um brigadeiro!', emoji: '🍬' },
    { texto: 'Nada por aqui! Uma fatia de tapioca na manteiga cairia bem.', emoji: '🥞' }
];

// Colunas iniciais fixas obrigatórias
const COLUNAS_PADRAO = [
    { id: 'todo', title: 'A fazer', fixed: true, animal: 'capivara' },
    { id: 'doing', title: 'Em execução', fixed: true, animal: 'onca' },
    { id: 'done', title: 'Concluído', fixed: true, animal: 'arara' }
];

// Estado da aplicação em memória
let columns = [];
let tasks = [];

// Instâncias globais do Chart.js para evitar vazamentos e conflitos de canvas
let chartColunasInstance = null;
let chartPizzaInstance = null;
let chartLinhasInstance = null;
let chartComparativoInstance = null;

// ==============================================================================
// INICIALIZAÇÃO DA APLICAÇÃO (JQUERY READY)
// ==============================================================================
$(document).ready(function () {
    carregarDados();
    popularSelectsTematicos();
    configurarEventosGerais();
    configurarRoteador();
    renderizarAplicacao();
});

// ==============================================================================
// CARREGAMENTO E PERSISTÊNCIA (LOCALSTORAGE)
// ==============================================================================

/**
 * Carrega quadros e tarefas do LocalStorage
 */
function carregarDados() {
    // 1. Carregar Colunas
    const colunasSalvas = localStorage.getItem(STORAGE_COLUMNS_KEY);
    if (colunasSalvas) {
        try {
            columns = JSON.parse(colunasSalvas);
            // Garante que os 3 quadros fixos existam caso a base antiga seja incompatível
            COLUNAS_PADRAO.forEach(padrao => {
                const existe = columns.find(c => c.id === padrao.id);
                if (!existe) {
                    columns.push({ ...padrao });
                } else {
                    existe.fixed = true; // Mantém fixo
                }
            });
        } catch (e) {
            columns = JSON.parse(JSON.stringify(COLUNAS_PADRAO));
        }
    } else {
        columns = JSON.parse(JSON.stringify(COLUNAS_PADRAO));
        salvarColunas();
    }

    // 2. Carregar Tarefas
    const tarefasSalvas = localStorage.getItem(STORAGE_TASKS_KEY);
    if (tarefasSalvas) {
        try {
            tasks = JSON.parse(tarefasSalvas);
            // Garante que cada tarefa possua categoria e datas
            tasks.forEach(t => {
                if (!t.category) t.category = 'pao_de_queijo';
                if (!t.completionDate && t.status === 'done') {
                    t.completionDate = t.dueDate || formatarDataISO(new Date());
                }
            });
        } catch (e) {
            tasks = [];
        }
    } else {
        // Tarefas de demonstração didática para o início da aula
        const hoje = new Date();
        const amanha = new Date();
        amanha.setDate(hoje.getDate() + 1);

        const ontem = new Date();
        ontem.setDate(hoje.getDate() - 1);

        const anteontem = new Date();
        anteontem.setDate(hoje.getDate() - 2);

        tasks = [
            {
                id: 'task_' + Date.now() + '_1',
                title: 'Estudar arquitetura do Google Antigravity',
                description: 'Compreender a integração de agentes e ferramentas na aula do SENAI.',
                category: 'pao_de_queijo',
                dueDate: formatarDataISO(amanha),
                priority: 'alta',
                status: 'todo',
                completionDate: null,
                completionNote: ''
            },
            {
                id: 'task_' + Date.now() + '_2',
                title: 'Desenvolver componentes com Tema Brasil',
                description: 'Implementar as cores nacionais, fauna e comidas típicas no layout.',
                category: 'feijoada',
                dueDate: formatarDataISO(hoje),
                priority: 'media',
                status: 'doing',
                completionDate: null,
                completionNote: ''
            },
            {
                id: 'task_' + Date.now() + '_3',
                title: 'Configurar ambiente e regras do projeto',
                description: 'Arquivo de regras e setup inicial concluído.',
                category: 'acai',
                dueDate: formatarDataISO(anteontem),
                priority: 'baixa',
                status: 'done',
                completionDate: formatarDataISO(ontem), // Concluída fora do prazo
                completionNote: 'Aguardou alinhamento com a turma do SENAI.'
            }
        ];
        salvarTarefas();
    }
}

function salvarColunas() {
    localStorage.setItem(STORAGE_COLUMNS_KEY, JSON.stringify(columns));
}

function salvarTarefas() {
    localStorage.setItem(STORAGE_TASKS_KEY, JSON.stringify(tasks));
}

// ==============================================================================
// POPULAR SELECTS TEMÁTICOS (CATEGORIAS E ANIMAIS)
// ==============================================================================
function popularSelectsTematicos() {
    // Select de Categorias (Comidas/Frutas)
    const $taskCategory = $('#taskCategory');
    $taskCategory.empty();
    Object.keys(CATEGORIAS_BRASIL).forEach(key => {
        const item = CATEGORIAS_BRASIL[key];
        $taskCategory.append(`<option value="${key}">${item.emoji} ${item.nome}</option>`);
    });

    // Select de Animais para Mascotes das Colunas
    const $columnAnimal = $('#columnAnimal');
    $columnAnimal.empty();
    ANIMAIS_BRASIL.forEach(animal => {
        $columnAnimal.append(`<option value="${animal.id}">${animal.emoji} ${animal.nome}</option>`);
    });
}

function atualizarSelectQuadrosDisponiveis() {
    const $target = $('#taskColumnTarget');
    $target.empty();
    columns.forEach(col => {
        $target.append(`<option value="${col.id}">${col.title}</option>`);
    });
}

// ==============================================================================
// ROTEADOR SPA (QUADRO vs DASHBOARD)
// ==============================================================================
function configurarRoteador() {
    $(window).on('hashchange', function () {
        const hash = window.location.hash || '#/';
        navegarPara(hash);
    });

    // Checagem inicial
    const hashInicial = window.location.hash || '#/';
    navegarPara(hashInicial);
}

function navegarPara(rota) {
    if (rota === '#/dashboard') {
        $('#view-kanban').removeClass('active');
        $('#view-dashboard').addClass('active');
        $('#navKanban').removeClass('active');
        $('#navDashboard').addClass('active');
        atualizarDashboard();
    } else {
        $('#view-dashboard').removeClass('active');
        $('#view-kanban').addClass('active');
        $('#navDashboard').removeClass('active');
        $('#navKanban').addClass('active');
        renderizarQuadro();
    }
}

// ==============================================================================
// RENDERIZAÇÃO DO QUADRO KANBAN (SUPORTE A QUADROS DINÂMICOS)
// ==============================================================================
function renderizarQuadro() {
    const $container = $('#kanbanContainer');
    $container.empty();

    columns.forEach(col => {
        // Encontra o mascote da coluna
        const animalObj = ANIMAIS_BRASIL.find(a => a.id === col.animal) || ANIMAIS_BRASIL[0];

        // Filtra as tarefas pertencentes a este quadro
        const tarefasDaColuna = tasks.filter(t => t.status === col.id);

        // Botões de ação para quadros personalizados (quadros fixos não podem ser excluídos/renomeados)
        let acoesColunaHtml = '';
        if (!col.fixed) {
            acoesColunaHtml = `
                <button class="btn-column-action btn-edit-col" data-id="${col.id}" title="Renomear quadro">
                    <i class="fa-solid fa-pen"></i>
                </button>
                <button class="btn-column-action btn-delete-col" data-id="${col.id}" title="Excluir quadro">
                    <i class="fa-solid fa-trash-can"></i>
                </button>
            `;
        }

        // Constrói o elemento da coluna
        const $coluna = $(`
            <section class="kanban-column" id="col-${col.id}" data-id="${col.id}">
                <div class="column-header">
                    <div class="column-title-group">
                        <span class="column-animal-icon" title="Mascote: ${animalObj.nome}">${animalObj.emoji}</span>
                        <h2>${escapeHtml(col.title)}</h2>
                    </div>
                    <div class="column-controls">
                        <span class="task-count">${tarefasDaColuna.length}</span>
                        ${acoesColunaHtml}
                    </div>
                </div>
                <div class="task-list" id="list-${col.id}">
                    <!-- Cards inseridos abaixo -->
                </div>
            </section>
        `);

        const $lista = $coluna.find('.task-list');

        if (tarefasDaColuna.length === 0) {
            // Estado vazio temático com comidas brasileiras
            const fraseAleatoria = FRASES_VAZIAS[Math.floor(Math.random() * FRASES_VAZIAS.length)];
            $lista.append(`
                <div class="empty-column-state">
                    <span class="empty-food-icon">${fraseAleatoria.emoji}</span>
                    <p>${fraseAleatoria.texto}</p>
                </div>
            `);
        } else {
            tarefasDaColuna.forEach(task => {
                const $card = criarElementoCard(task);
                $lista.append($card);
            });
        }

        // Configuração de Drag & Drop da coluna
        $coluna.on('dragover', function (e) {
            e.preventDefault();
            $coluna.addClass('drag-over');
        });

        $coluna.on('dragleave', function () {
            $coluna.removeClass('drag-over');
        });

        $coluna.on('drop', function (e) {
            e.preventDefault();
            $coluna.removeClass('drag-over');
            const taskId = e.originalEvent.dataTransfer.getData('text/plain');
            if (taskId) {
                moverTarefaParaStatus(taskId, col.id);
            }
        });

        $container.append($coluna);
    });
}

/**
 * Constrói o HTML e eventos do Card de Tarefa
 */
function criarElementoCard(task) {
    const isDone = task.status === 'done';
    const atrasada = isPrazoVencido(task.dueDate);
    const categoriaInfo = CATEGORIAS_BRASIL[task.category] || { nome: 'Geral', emoji: '🇧🇷' };

    let cardClasses = 'task-card';
    if (isDone) cardClasses += ' card-completed';

    // Badge de Prazo e Conclusão
    let deadlineHtml = '';
    const dataPrazoFormatada = formatarDataExibicao(task.dueDate);

    if (isDone) {
        const dataConclusao = task.completionDate ? formatarDataExibicao(task.completionDate) : dataPrazoFormatada;
        deadlineHtml = `<span class="deadline-pill concluded"><i class="fa-solid fa-circle-check"></i> Concluído em ${dataConclusao}</span>`;
    } else if (atrasada) {
        deadlineHtml = `<span class="deadline-pill overdue"><i class="fa-solid fa-triangle-exclamation"></i> Venceu em ${dataPrazoFormatada}</span>`;
    } else {
        deadlineHtml = `<span class="deadline-pill"><i class="fa-regular fa-calendar"></i> Prazo: ${dataPrazoFormatada}</span>`;
    }

    // Botões de ação do card
    let botoesAcaoHtml = '';
    if (!isDone) {
        botoesAcaoHtml = `
            <button class="btn-card-action btn-complete-quick" title="Concluir tarefa agora" data-id="${task.id}">
                <i class="fa-solid fa-check"></i>
            </button>
            <button class="btn-card-action btn-edit-task" title="Editar tarefa" data-id="${task.id}">
                <i class="fa-solid fa-pen"></i>
            </button>
            <button class="btn-card-action btn-delete-task" title="Excluir tarefa" data-id="${task.id}">
                <i class="fa-solid fa-trash-can"></i>
            </button>
        `;
    } else {
        // Tarefas concluídas não podem sofrer alteração de status
        botoesAcaoHtml = `
            <button class="btn-card-action btn-delete-task" title="Excluir do histórico" data-id="${task.id}">
                <i class="fa-solid fa-trash-can"></i>
            </button>
        `;
    }

    // Nota de justificativa para tarefas finalizadas com atraso
    let justificativaHtml = '';
    if (isDone && task.completionNote) {
        justificativaHtml = `
            <div class="card-justification-note">
                <strong><i class="fa-solid fa-file-pen"></i> Justificativa do Atraso:</strong> ${escapeHtml(task.completionNote)}
            </div>
        `;
    }

    const $card = $(`
        <div class="${cardClasses}" data-id="${task.id}" draggable="${!isDone}">
            <div class="card-top-bar">
                <span class="card-category-badge">
                    ${categoriaInfo.emoji} ${categoriaInfo.nome}
                </span>
                <div class="card-actions">
                    ${botoesAcaoHtml}
                </div>
            </div>

            <h4 class="card-title">${escapeHtml(task.title)}</h4>
            ${task.description ? `<p class="card-desc">${escapeHtml(task.description)}</p>` : ''}
            
            ${justificativaHtml}

            <div class="card-footer">
                <span class="priority-pill priority-${task.priority}">${task.priority}</span>
                ${deadlineHtml}
            </div>
        </div>
    `);

    // Eventos de Drag & Drop para o card
    if (!isDone) {
        $card.on('dragstart', function (e) {
            $(this).addClass('dragging');
            e.originalEvent.dataTransfer.setData('text/plain', task.id);
        });

        $card.on('dragend', function () {
            $(this).removeClass('dragging');
        });
    }

    return $card;
}

// ==============================================================================
// ROTA 2: DASHBOARD E INDICADORES EM TEMPO REAL
// ==============================================================================
function atualizarDashboard() {
    // 1. Tarefas Concluídas
    const concluidas = tasks.filter(t => t.status === 'done');

    // 2. Tarefas Em Execução
    const emExecucao = tasks.filter(t => t.status === 'doing');

    // 3. Tarefas Pendentes (todas que não estão em "Concluído" nem em "Em execução", incluindo quadros personalizados)
    const pendentes = tasks.filter(t => t.status !== 'done' && t.status !== 'doing');

    // 4. Tarefas Concluídas Fora do Prazo (data de conclusão maior que data de prazo ou justificativa de atraso registrada)
    const concluidasForaPrazo = concluidas.filter(t => {
        if (t.completionNote && t.completionNote.trim() !== '') {
            return true;
        }
        if (t.completionDate && t.dueDate) {
            return t.completionDate > t.dueDate;
        }
        return false;
    });

    // Atualiza contadores dos 4 cards de indicadores
    $('#metricDoneCount').text(concluidas.length);
    $('#metricDoingCount').text(emExecucao.length);
    $('#metricPendingCount').text(pendentes.length);
    $('#metricLateDoneCount').text(concluidasForaPrazo.length);

    // Renderiza o conjunto completo de gráficos analíticos
    renderizarTodosGraficos();
}

/**
 * Renderiza todos os 4 gráficos analíticos (Coluna, Pizza, Linhas e Comparativo)
 */
function renderizarTodosGraficos() {
    if (typeof Chart === 'undefined') return;

    renderizarGraficoColunas();
    renderizarGraficoPizza();
    renderizarGraficoLinhas();
    renderizarGraficoComparativo();
}

/**
 * 1. GRÁFICO DE COLUNA: Volume de tarefas distribuídas por cada quadro do Kanban
 */
function renderizarGraficoColunas() {
    const ctx = document.getElementById('chartColunas');
    if (!ctx) return;

    if (chartColunasInstance) {
        chartColunasInstance.destroy();
    }

    const labels = columns.map(c => c.title);
    const data = columns.map(c => tasks.filter(t => t.status === c.id).length);

    // Alternância de cores estritamente na paleta Brasil
    const coresColunas = [
        'rgba(0, 71, 179, 0.85)',   // Azul
        'rgba(0, 135, 54, 0.85)',   // Verde
        'rgba(254, 208, 0, 0.85)',  // Amarelo
        'rgba(0, 34, 68, 0.85)',    // Azul Escuro
        'rgba(0, 77, 32, 0.85)'     // Verde Escuro
    ];

    const backgroundColors = columns.map((_, i) => coresColunas[i % coresColunas.length]);

    chartColunasInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Tarefas no Quadro',
                data: data,
                backgroundColor: backgroundColors,
                borderColor: '#002244',
                borderWidth: 1.5,
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            return ` ${context.parsed.y} tarefa(s)`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { precision: 0 }
                }
            }
        }
    });
}

/**
 * 2. GRÁFICO DE PIZZA: Percentual de tarefas por Categoria de Comidas/Frutas Típicas
 */
function renderizarGraficoPizza() {
    const ctx = document.getElementById('chartPizza');
    if (!ctx) return;

    if (chartPizzaInstance) {
        chartPizzaInstance.destroy();
    }

    const contagem = {};
    Object.keys(CATEGORIAS_BRASIL).forEach(cat => { contagem[cat] = 0; });
    tasks.forEach(t => {
        if (contagem[t.category] !== undefined) contagem[t.category]++;
        else contagem.pao_de_queijo++;
    });

    // Pega as categorias com tarefas ou primeiras 4 caso novo
    let categoriasChaves = Object.keys(CATEGORIAS_BRASIL).filter(k => contagem[k] > 0);
    if (categoriasChaves.length === 0) {
        categoriasChaves = ['pao_de_queijo', 'feijoada', 'acai', 'tapioca'];
    }

    const labels = categoriasChaves.map(k => `${CATEGORIAS_BRASIL[k].emoji} ${CATEGORIAS_BRASIL[k].nome}`);
    const data = categoriasChaves.map(k => contagem[k]);

    // Paleta Brasil harmônica para fatias da pizza
    const coresPizza = [
        '#0047b3', '#008736', '#fed000', '#002244', 
        '#00682a', '#e5bb00', '#2563eb', '#16a34a', 
        '#ca8a04', '#1e40af'
    ];

    chartPizzaInstance = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: coresPizza.slice(0, labels.length),
                borderColor: '#ffffff',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        boxWidth: 12,
                        padding: 10,
                        font: { size: 11 }
                    }
                }
            }
        }
    });
}

/**
 * 3. GRÁFICO DE LINHAS: Tendência e evolução de prazos vs conclusões recentes
 */
function renderizarGraficoLinhas() {
    const ctx = document.getElementById('chartLinhas');
    if (!ctx) return;

    if (chartLinhasInstance) {
        chartLinhasInstance.destroy();
    }

    // Intervalo dos últimos 6 dias
    const labelsDias = [];
    const diasISO = [];
    for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        labelsDias.push(d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }));
        diasISO.push(formatarDataISO(d));
    }

    // Contagem de tarefas previstas e tarefas concluídas por data
    const tarefasPrevistas = diasISO.map(dia => {
        return tasks.filter(t => t.dueDate === dia).length;
    });

    const tarefasConcluidas = diasISO.map(dia => {
        return tasks.filter(t => t.status === 'done' && t.completionDate === dia).length;
    });

    chartLinhasInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labelsDias,
            datasets: [
                {
                    label: 'Prazos Estimados',
                    data: tarefasPrevistas,
                    borderColor: '#0047b3',
                    backgroundColor: 'rgba(0, 71, 179, 0.08)',
                    borderWidth: 2.5,
                    tension: 0.35,
                    fill: true,
                    pointBackgroundColor: '#0047b3',
                    pointRadius: 4
                },
                {
                    label: 'Tarefas Concluídas',
                    data: tarefasConcluidas,
                    borderColor: '#008736',
                    backgroundColor: 'rgba(0, 135, 54, 0.12)',
                    borderWidth: 2.5,
                    tension: 0.35,
                    fill: true,
                    pointBackgroundColor: '#008736',
                    pointRadius: 4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: { boxWidth: 12 }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { precision: 0 }
                }
            }
        }
    });
}

/**
 * 4. GRÁFICO COMPARATIVO: Comparativo de cumprimento de prazo por nível de Prioridade
 */
function renderizarGraficoComparativo() {
    const ctx = document.getElementById('chartComparativo');
    if (!ctx) return;

    if (chartComparativoInstance) {
        chartComparativoInstance.destroy();
    }

    const prioridades = ['baixa', 'media', 'alta'];
    const labels = ['Baixa', 'Média', 'Alta'];

    // Comparativo: No Prazo vs Fora do Prazo / Atrasadas
    const noPrazo = prioridades.map(prio => {
        return tasks.filter(t => {
            if (t.priority !== prio) return false;
            if (t.status === 'done') {
                return !t.completionNote && (!t.completionDate || !t.dueDate || t.completionDate <= t.dueDate);
            }
            return !isPrazoVencido(t.dueDate);
        }).length;
    });

    const foraDoPrazo = prioridades.map(prio => {
        return tasks.filter(t => {
            if (t.priority !== prio) return false;
            if (t.status === 'done') {
                return (t.completionNote && t.completionNote.trim() !== '') || (t.completionDate && t.dueDate && t.completionDate > t.dueDate);
            }
            return isPrazoVencido(t.dueDate);
        }).length;
    });

    chartComparativoInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'No Prazo / Em Dia',
                    data: noPrazo,
                    backgroundColor: 'rgba(0, 135, 54, 0.85)', // Verde Brasil
                    borderColor: '#004d20',
                    borderWidth: 1.5,
                    borderRadius: 4
                },
                {
                    label: 'Fora do Prazo / Vencidas',
                    data: foraDoPrazo,
                    backgroundColor: 'rgba(254, 208, 0, 0.85)', // Amarelo Brasil
                    borderColor: '#6e5100',
                    borderWidth: 1.5,
                    borderRadius: 4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: { boxWidth: 12 }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { precision: 0 }
                }
            }
        }
    });
}

// ==============================================================================
// REGRAS DE TRANSIÇÃO E RESTRIÇÕES DE NEGÓCIO
// ==============================================================================

/**
 * Movimenta tarefa entre colunas respeitando as restrições
 */
function moverTarefaParaStatus(taskId, novoStatus) {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    // RESTRIÇÃO 1: Tarefas concluídas não podem sofrer alterações de status
    if (task.status === 'done') {
        alert('⚠️ Restrição: Tarefas concluídas não podem sofrer alterações de status.');
        return;
    }

    if (task.status === novoStatus) return;

    // Se o destino for "Concluído" (done), aplica validação de prazo
    if (novoStatus === 'done') {
        tentarConcluirTarefa(taskId);
        return;
    }

    // Se mover para outro quadro que não seja Concluído, limpa completionDate
    task.completionDate = null;
    task.status = novoStatus;
    salvarTarefas();
    renderizarAplicacao();
}

/**
 * Conclusão de tarefa com checagem de vencimento (Restrição 2)
 */
function tentarConcluirTarefa(taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    // Se já estiver concluída, encerra
    if (task.status === 'done') return;

    const dataHoje = formatarDataISO(new Date());

    // Se a tarefa estiver vencida, exige justificativa obrigatória
    if (isPrazoVencido(task.dueDate)) {
        $('#overdueTaskId').val(task.id);
        $('#overdueNote').val('');
        $('#overdueJustificationModal').css('display', 'flex').hide().fadeIn(200);
        $('#overdueNote').focus();
    } else {
        // Conclusão no prazo ou antes do prazo
        task.status = 'done';
        task.completionDate = dataHoje;
        salvarTarefas();
        renderizarAplicacao();
    }
}

/**
 * Confirma a justificativa e conclui a tarefa vencida
 */
function confirmarJustificativaConclusao() {
    const taskId = $('#overdueTaskId').val();
    const justificativa = $('#overdueNote').val().trim();

    if (!justificativa) {
        alert('Por favor, digite a justificativa obrigatória para registrar a conclusão da tarefa vencida.');
        return;
    }

    const task = tasks.find(t => t.id === taskId);
    if (task) {
        task.status = 'done';
        task.completionDate = formatarDataISO(new Date());
        task.completionNote = justificativa;
        salvarTarefas();
        renderizarAplicacao();
    }

    $('#overdueJustificationModal').fadeOut(200);
}

// ==============================================================================
// GESTÃO DE QUADROS PERSONALIZADOS (CRIAÇÃO, EDIÇÃO, EXCLUSÃO)
// ==============================================================================

/**
 * Abre o modal para criar ou renomear um quadro
 */
function abrirModalQuadro(columnId = null) {
    if (columnId) {
        const col = columns.find(c => c.id === columnId);
        if (!col || col.fixed) {
            alert('Este quadro é fixo e não pode ser editado.');
            return;
        }
        $('#columnModalTitle').html('<i class="fa-solid fa-pen"></i> Renomear Quadro');
        $('#columnId').val(col.id);
        $('#columnTitle').val(col.title);
        $('#columnAnimal').val(col.animal || 'capivara');
    } else {
        $('#columnModalTitle').html('<i class="fa-solid fa-folder-plus"></i> Novo Quadro');
        $('#columnId').val('');
        $('#columnTitle').val('');
        $('#columnAnimal').val('capivara');
    }
    $('#columnModal').css('display', 'flex').hide().fadeIn(200);
    $('#columnTitle').focus();
}

/**
 * Salva a criação ou edição do quadro
 */
function salvarQuadro() {
    const id = $('#columnId').val();
    const title = $('#columnTitle').val().trim();
    const animal = $('#columnAnimal').val();

    if (!title) {
        alert('Por favor, informe o nome do quadro.');
        return;
    }

    if (id) {
        // Atualiza quadro existente
        const col = columns.find(c => c.id === id);
        if (col && !col.fixed) {
            col.title = title;
            col.animal = animal;
        }
    } else {
        // Cria novo quadro personalizado
        const novoId = 'custom_' + Date.now();
        columns.push({
            id: novoId,
            title: title,
            fixed: false,
            animal: animal
        });
    }

    salvarColunas();
    renderizarAplicacao();
    $('#columnModal').fadeOut(200);
}

/**
 * Exclui um quadro personalizado movendo tarefas para 'A fazer'
 */
function excluirQuadro(columnId) {
    const col = columns.find(c => c.id === columnId);
    if (!col) return;

    if (col.fixed) {
        alert('Os quadros fixos ("A fazer", "Em execução" e "Concluído") não podem ser excluídos.');
        return;
    }

    const tarefasNoQuadro = tasks.filter(t => t.status === columnId);

    if (tarefasNoQuadro.length > 0) {
        const confirmou = confirm(
            `Este quadro contém ${tarefasNoQuadro.length} tarefa(s).\n\nDeseja realmente excluí-lo? Todas as tarefas deste quadro serão movidas automaticamente para "A fazer".`
        );
        if (!confirmou) return;

        // Move tarefas para 'todo'
        tarefasNoQuadro.forEach(t => {
            t.status = 'todo';
            t.completionDate = null;
        });
    } else {
        const confirmou = confirm(`Deseja realmente excluir o quadro "${col.title}"?`);
        if (!confirmou) return;
    }

    // Remove a coluna da lista
    columns = columns.filter(c => c.id !== columnId);

    salvarColunas();
    salvarTarefas();
    renderizarAplicacao();
}

// ==============================================================================
// GESTÃO DE TAREFAS (CADASTRO, EDIÇÃO, EXCLUSÃO)
// ==============================================================================

function abrirModalTarefa(taskId = null) {
    atualizarSelectQuadrosDisponiveis();

    if (taskId) {
        const task = tasks.find(t => t.id === taskId);
        if (!task) return;

        if (task.status === 'done') {
            alert('Tarefas concluídas não podem ser alteradas.');
            return;
        }

        $('#modalTitle').html('<i class="fa-solid fa-pen"></i> Editar Tarefa');
        $('#taskId').val(task.id);
        $('#taskTitle').val(task.title);
        $('#taskDescription').val(task.description);
        $('#taskCategory').val(task.category);
        $('#taskDueDate').val(task.dueDate);
        $('#taskPriority').val(task.priority);
        $('#taskColumnTarget').val(task.status);
    } else {
        $('#modalTitle').html('<i class="fa-solid fa-list-check"></i> Cadastrar Tarefa');
        $('#taskId').val('');
        $('#taskForm')[0].reset();
        $('#taskDueDate').val(formatarDataISO(new Date()));
        $('#taskCategory').val('pao_de_queijo');
        $('#taskPriority').val('media');
        $('#taskColumnTarget').val('todo');
    }

    $('#taskModal').css('display', 'flex').hide().fadeIn(200);
    $('#taskTitle').focus();
}

function salvarTarefaFormulario() {
    const id = $('#taskId').val();
    const title = $('#taskTitle').val().trim();
    const description = $('#taskDescription').val().trim();
    const category = $('#taskCategory').val();
    const dueDate = $('#taskDueDate').val();
    const priority = $('#taskPriority').val();
    const statusTarget = $('#taskColumnTarget').val() || 'todo';

    if (!title || !dueDate) {
        alert('Por favor, preencha o título e a data de prazo da tarefa.');
        return;
    }

    if (id) {
        const task = tasks.find(t => t.id === id);
        if (task) {
            task.title = title;
            task.description = description;
            task.category = category;
            task.dueDate = dueDate;
            task.priority = priority;
            if (task.status !== 'done' && statusTarget !== task.status) {
                moverTarefaParaStatus(task.id, statusTarget);
            }
        }
    } else {
        const novaTarefa = {
            id: 'task_' + Date.now(),
            title: title,
            description: description,
            category: category,
            dueDate: dueDate,
            priority: priority,
            status: statusTarget === 'done' ? 'todo' : statusTarget, // Novas tarefas começam abertas
            completionDate: null,
            completionNote: ''
        };
        tasks.push(novaTarefa);
    }

    salvarTarefas();
    renderizarAplicacao();
    $('#taskModal').fadeOut(200);
}

function excluirTarefa(taskId) {
    if (confirm('Deseja realmente excluir esta tarefa?')) {
        tasks = tasks.filter(t => t.id !== taskId);
        salvarTarefas();
        renderizarAplicacao();
    }
}

// ==============================================================================
// CONFIGURAÇÃO DOS EVENTOS GERAIS
// ==============================================================================
function configurarEventosGerais() {
    // Modais de Tarefa
    $('#btnOpenNewTaskModal').on('click', function () {
        abrirModalTarefa();
    });
    $('#btnCloseTaskModal, #btnCancelTaskModal').on('click', function () {
        $('#taskModal').fadeOut(200);
    });
    $('#taskForm').on('submit', function (e) {
        e.preventDefault();
        salvarTarefaFormulario();
    });

    // Modais de Quadro
    $('#btnOpenNewColumnModal').on('click', function () {
        abrirModalQuadro();
    });
    $('#btnCloseColumnModal, #btnCancelColumnModal').on('click', function () {
        $('#columnModal').fadeOut(200);
    });
    $('#columnForm').on('submit', function (e) {
        e.preventDefault();
        salvarQuadro();
    });

    // Modal de Justificativa de Vencimento
    $('#btnCloseJustificationModal, #btnCancelJustificationModal').on('click', function () {
        $('#overdueJustificationModal').fadeOut(200);
    });
    $('#justificationForm').on('submit', function (e) {
        e.preventDefault();
        confirmarJustificativaConclusao();
    });

    // Ações dinâmicas nos cards
    $('#kanbanContainer').on('click', '.btn-delete-task', function () {
        const id = $(this).data('id');
        excluirTarefa(id);
    });
    $('#kanbanContainer').on('click', '.btn-edit-task', function () {
        const id = $(this).data('id');
        abrirModalTarefa(id);
    });
    $('#kanbanContainer').on('click', '.btn-complete-quick', function () {
        const id = $(this).data('id');
        tentarConcluirTarefa(id);
    });

    // Ações dinâmicas nas colunas
    $('#kanbanContainer').on('click', '.btn-edit-col', function () {
        const id = $(this).data('id');
        abrirModalQuadro(id);
    });
    $('#kanbanContainer').on('click', '.btn-delete-col', function () {
        const id = $(this).data('id');
        excluirQuadro(id);
    });
}

function renderizarAplicacao() {
    const hash = window.location.hash || '#/';
    if (hash === '#/dashboard') {
        atualizarDashboard();
    } else {
        renderizarQuadro();
    }
}

// ==============================================================================
// UTILITÁRIOS DE DATAS E TEXTO
// ==============================================================================
function isPrazoVencido(dataISO) {
    if (!dataISO) return false;
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const partes = dataISO.split('-');
    const dataPrazo = new Date(partes[0], partes[1] - 1, partes[2]);
    dataPrazo.setHours(0, 0, 0, 0);

    return dataPrazo < hoje;
}

function formatarDataISO(date) {
    const ano = date.getFullYear();
    const mes = String(date.getMonth() + 1).padStart(2, '0');
    const dia = String(date.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
}

function formatarDataExibicao(dataISO) {
    if (!dataISO) return '';
    const partes = dataISO.split('-');
    if (partes.length !== 3) return dataISO;
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

function escapeHtml(texto) {
    if (!texto) return '';
    return $('<div>').text(texto).html();
}

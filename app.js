const SUPABASE_URL = "https://igasvgxnbetpxexqqyfp.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_pnU6nOZUuP4FGA7gyy6rrA_zB1ptFGN";

const supabaseClient = supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
);

async function testarConexao() {
    const { data, error } = await supabaseClient
        .from("registro_diario")
        .select("*")
        .limit(1);

    if (error) {
        console.error("Erro conexão:", error);
    } else {
        console.log("Conectado com sucesso:", data);
    }
}

testarConexao();

// === STATE MANAGEMENT ===
let records = [];
let modoProvaAtivo = false;
let userSession = null;

// === AUTH FUNCTIONS ===
async function signUp(email, password) {
    return await supabaseClient.auth.signUp({ email, password });
}

async function signIn(email, password) {
    return await supabaseClient.auth.signInWithPassword({ email, password });
}

async function signOut() {
    return await supabaseClient.auth.signOut();
}

async function carregarDados() {
    const { data, error } = await supabaseClient
        .from("registro_diario")
        .select("*")
        .order("data", { ascending: true });

    if (error) {
        console.error("Erro ao carregar dados:", error);
        return;
    }

    // atualizar estado interno do dashboard
    records = data.map(dbRecord => {
        const isModoProva = false; // Supabase table has no modo_prova by user snippet
        const score = calculateScore(
            dbRecord.cold_call,
            dbRecord.ifma,
            dbRecord.ingles,
            dbRecord.treino,
            dbRecord.revisao,
            isModoProva
        );

        return {
            id: dbRecord.id, // Supabase id
            date: dbRecord.data,
            cold: dbRecord.cold_call,
            ifma: dbRecord.ifma,
            ingles: dbRecord.ingles,
            treino: dbRecord.treino,
            revisao: dbRecord.revisao,
            saiuPlano: dbRecord.saiu_do_plano,
            imprevisto: dbRecord.imprevisto || '',
            energia: dbRecord.energia,
            score: score,
            nivel: calculateNivel(score),
            consistente: score >= 4 && !dbRecord.saiu_do_plano ? 1 : 0,
            modoProva: isModoProva
        };
    });

    updateUI();
}

// === DOM ELEMENTS ===
const loginSection = document.getElementById('loginSection');
const dashboardSection = document.getElementById('dashboardSection');
const dashboardHeader = document.getElementById('dashboardHeader');
const emailInput = document.getElementById('emailInput');
const passwordInput = document.getElementById('passwordInput');
const btnSignIn = document.getElementById('btnSignIn');
const btnSignUp = document.getElementById('btnSignUp');
const logoutBtn = document.getElementById('logoutBtn');
const loginError = document.getElementById('loginError');

const dataInput = document.getElementById('dataInput');
const energiaInput = document.getElementById('energiaInput');
const energiaValue = document.getElementById('energiaValue');
const modoProvaToggle = document.getElementById('modoProvaToggle');
const dailyForm = document.getElementById('dailyForm');
const cbColdCall = document.getElementById('coldCall');
const cbIfma = document.getElementById('ifma');
const cbIngles = document.getElementById('ingles');
const cbTreino = document.getElementById('treino');
const cbRevisao = document.getElementById('revisao');
const cbSaiuPlano = document.getElementById('saiuPlano');
const imprevistoContainer = document.getElementById('imprevistoContainer');
const imprevistoInput = document.getElementById('imprevistoInput');

const previewScore = document.getElementById('previewScore');
const previewNivel = document.getElementById('previewNivel');
const tableBody = document.getElementById('tableBody');
const clearDataBtn = document.getElementById('clearDataBtn');

// KPI Elements
const kpiIpp = document.getElementById('kpi-ipp');
const kpiConsistency = document.getElementById('kpi-consistency');
const kpiPlan = document.getElementById('kpi-plan');
const kpiEnergy = document.getElementById('kpi-energy');
const kpiDiasFortes = document.getElementById('kpi-dias-fortes');
const kpiEnergyStrong = document.getElementById('kpi-energy-strong');
const kpiEnergyWeak = document.getElementById('kpi-energy-weak');

const monthlyTreino = document.getElementById('monthly-treino');
const monthlyIngles = document.getElementById('monthly-ingles');
const weeklyGold = document.getElementById('weekly-gold');

// 3 Pillars Elements
const meterBusiness = document.getElementById('meter-business');
const textBusiness = document.getElementById('text-business');
const meterBody = document.getElementById('meter-body');
const textBody = document.getElementById('text-body');
const meterMind = document.getElementById('meter-mind');
const textMind = document.getElementById('text-mind');
const balanceBadge = document.getElementById('balanceBadge');

// Strategic Insight Elements
const strategicInsight = document.getElementById('strategicInsight');
const insightTitle = document.getElementById('insightTitle');
const insightMessage = document.getElementById('insightMessage');
const insightAction = document.getElementById('insightAction');

// Chart Instances
let mixedChartInst, ippChartInst;

// === INITIALIZATION ===
async function checkAuth() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    userSession = session;

    if (session) {
        // Logged in
        loginSection.style.display = 'none';
        dashboardSection.style.display = 'grid';
        dashboardHeader.style.display = 'flex';
        await carregarDados();
    } else {
        // Not logged in
        loginSection.style.display = 'flex';
        dashboardSection.style.display = 'none';
        dashboardHeader.style.display = 'none';
    }
}

async function init() {
    // Set today as default date
    dataInput.valueAsDate = new Date();

    // Auth Listeners
    btnSignIn.addEventListener('click', async () => {
        const email = emailInput.value;
        const password = passwordInput.value;
        if (!email || !password) return showLoginError("Preencha email e senha.");

        btnSignIn.textContent = 'Carregando...';
        const { data, error } = await signIn(email, password);
        btnSignIn.textContent = 'Entrar';

        if (error) {
            showLoginError(error.message);
        } else {
            loginError.style.display = 'none';
            checkAuth();
        }
    });

    btnSignUp.addEventListener('click', async () => {
        const email = emailInput.value;
        const password = passwordInput.value;
        if (!email || !password) return showLoginError("Preencha email e senha.");

        btnSignUp.textContent = 'Carregando...';
        const { data, error } = await signUp(email, password);
        btnSignUp.textContent = 'Criar Conta';

        if (error) {
            showLoginError(error.message);
        } else {
            showLoginError("Conta criada! Você já pode entrar.", true);
        }
    });

    logoutBtn.addEventListener('click', async () => {
        await signOut();
        checkAuth();
    });

    // Set Listeners
    energiaInput.addEventListener('input', (e) => {
        energiaValue.textContent = e.target.value;
    });

    modoProvaToggle.addEventListener('change', (e) => {
        modoProvaAtivo = e.target.checked;
        updatePreview();
    });

    cbSaiuPlano.addEventListener('change', (e) => {
        imprevistoContainer.style.display = e.target.checked ? 'block' : 'none';
        if (!e.target.checked) imprevistoInput.value = '';
    });

    const checkboxes = [cbColdCall, cbIfma, cbIngles, cbTreino, cbRevisao];
    checkboxes.forEach(cb => cb.addEventListener('change', updatePreview));

    dailyForm.addEventListener('submit', handleFormSubmit);
    clearDataBtn.addEventListener('click', confirmClearData);

    await checkAuth();
}

function showLoginError(msg, isSuccess = false) {
    loginError.textContent = msg;
    loginError.style.color = isSuccess ? 'var(--accent-success)' : 'var(--accent-danger)';
    loginError.style.display = 'block';
}

// === LOGIC & CALCULATIONS ===
function calculateScore(cold, ifma, ingles, treino, revisao, isModoProva) {
    let score = 0;
    score += cold ? 1 : 0;
    score += ifma ? (isModoProva ? 2 : 1) : 0;
    score += ingles ? 1 : 0;
    score += treino ? 1 : 0;
    score += revisao ? 1 : 0;

    // Cap score at 5 visually even if Modo Prova pushes it to 6, though logic specifically says "IFMA deve ter peso 2 na pontuação".
    // "5 pontos = Ouro", we'll allow score to be 6 but for Nivel it's >= 5
    return score;
}

function calculateNivel(score) {
    if (score >= 5) return { text: 'Ouro', class: 'ouro' };
    if (score === 4) return { text: 'Prata', class: 'prata' };
    if (score === 2 || score === 3) return { text: 'Bronze', class: 'bronze' };
    return { text: 'Zero', class: 'zero' };
}

function updatePreview() {
    const score = calculateScore(
        cbColdCall.checked,
        cbIfma.checked,
        cbIngles.checked,
        cbTreino.checked,
        cbRevisao.checked,
        modoProvaAtivo
    );

    previewScore.textContent = score;
    const nivel = calculateNivel(score);
    previewNivel.textContent = nivel.text;
    previewNivel.className = `nivel-badge ${nivel.class}`;
}

// === DATA HANDLING ===
async function handleFormSubmit(e) {
    e.preventDefault();

    const dateVal = dataInput.value;
    if (!dateVal) return alert("Selecione uma data.");

    // Preparar os dados para o Supabase
    const dbData = {
        data: dateVal,
        cold_call: cbColdCall.checked,
        ifma: cbIfma.checked,
        ingles: cbIngles.checked,
        treino: cbTreino.checked,
        revisao: cbRevisao.checked,
        saiu_do_plano: cbSaiuPlano.checked,
        imprevisto: cbSaiuPlano.checked ? imprevistoInput.value : null,
        energia: parseInt(energiaInput.value)
    };

    // Verificar se já existe um registro para esta data localmente
    const existingRecord = records.find(r => r.date === dateVal);

    try {
        if (existingRecord && existingRecord.id) {
            // Update
            const { error } = await supabaseClient
                .from("registro_diario")
                .update(dbData)
                .eq("id", existingRecord.id);

            if (error) throw error;
        } else {
            // Insert
            const { error } = await supabaseClient
                .from("registro_diario")
                .insert([dbData]);

            if (error) throw error;
        }

        // Recarregar os dados do banco e atualizar a UI
        await carregarDados();

        // Reset form briefly but keep date
        dailyForm.reset();
        dataInput.value = dateVal;
        energiaValue.textContent = '5';
        imprevistoContainer.style.display = 'none';
        updatePreview();

    } catch (err) {
        console.error("Erro ao salvar no Supabase:", err);
        alert("Ocorreu um erro ao salvar o registro no banco de dados.");
    }
}

async function deleteRecord(id) {
    if (confirm("Tem certeza que deseja excluir este registro?")) {
        try {
            const { error } = await supabaseClient
                .from("registro_diario")
                .delete()
                .eq("id", id);

            if (error) throw error;
            await carregarDados();
        } catch (err) {
            console.error("Erro ao excluir do Supabase:", err);
            alert("Erro ao excluir o registro.");
        }
    }
}

async function confirmClearData() {
    if (confirm("ATENÇÃO: Deseja apagar TODO o histórico? Esta ação não pode ser desfeita.")) {
        try {
            // Remove todos os registros validos (data is not null)
            const { error } = await supabaseClient
                .from("registro_diario")
                .delete()
                .not("data", "is", null);

            if (error) throw error;
            await carregarDados();
        } catch (err) {
            console.error("Erro ao limpar dados do Supabase:", err);
            alert("Erro ao limpar o histórico.");
        }
    }
}

// === UI UPDATES ===
function updateUI() {
    renderTable();
    updateKPIs();
    drawCharts();
}

function renderTable() {
    tableBody.innerHTML = '';

    // Show last 7 records descending for history
    const recentRecords = [...records].reverse().slice(0, 10);

    recentRecords.forEach(r => {
        const tr = document.createElement('tr');

        // Format date to DD/MM/YYYY
        const [year, month, day] = r.date.split('-');
        const formattedDate = `${day}/${month}/${year}`;

        const inPlanIcon = r.saiuPlano ?
            `<i class="ph-fill ph-x-circle" style="color:var(--accent-danger); font-size: 18px" title="Imprevisto: ${r.imprevisto || 'Não detalhado'}"></i>` :
            `<i class="ph-fill ph-check-circle" style="color:var(--accent-success); font-size: 18px"></i>`;

        tr.innerHTML = `
            <td>${formattedDate}</td>
            <td><strong>${r.score}</strong></td>
            <td><span class="nivel-badge ${r.nivel.class}">${r.nivel.text}</span></td>
            <td>${r.consistente ? '<i class="ph-fill ph-check-circle" style="color:var(--text-main); font-size: 18px"></i>' : '<i class="ph-fill ph-x-circle" style="color:var(--text-muted); font-size: 18px"></i>'}</td>
            <td>${inPlanIcon}</td>
            <td>
                <button class="action-btn" onclick="deleteRecord('${r.id}')" title="Excluir">
                    <i class="ph ph-trash"></i>
                </button>
            </td>
        `;
        tableBody.appendChild(tr);
    });
}

// Helper: Get Records for Current Week (Monday to Friday)
function getRecordsForCurrentWeek() {
    if (records.length === 0) return [];

    const today = new Date();
    // Get Monday of current week
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
    const monday = new Date(today.setDate(diff));
    monday.setHours(0, 0, 0, 0);

    const friday = new Date(monday);
    friday.setDate(monday.getDate() + 4);
    friday.setHours(23, 59, 59, 999);

    return records.filter(r => {
        const rDate = new Date(r.date + 'T12:00:00'); // Prevent timezone shift
        return rDate >= monday && rDate <= friday;
    });
}

// Helper: Get Records for Current Month
function getRecordsForCurrentMonth() {
    if (records.length === 0) return [];
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    return records.filter(r => r.date.startsWith(currentMonth));
}

function updateKPIs() {
    const weeklyRecords = getRecordsForCurrentWeek();
    const monthlyRecords = getRecordsForCurrentMonth();

    // Weekly IPP = (Soma Pontuação Semana ÷ 25) × 100
    const weekScoreSum = weeklyRecords.reduce((sum, r) => sum + r.score, 0);
    const ipp = Math.min((weekScoreSum / 25) * 100, 100).toFixed(1); // Cap at 100% just in case of Mode Prova overflow

    // Weekly Consistency = (Dias Consistentes ÷ 5) × 100
    const weekConsistDays = weeklyRecords.reduce((sum, r) => sum + r.consistente, 0);
    const consistency = Math.min((weekConsistDays / 5) * 100, 100).toFixed(1);

    // Weekly Plan Days = (Dias Dentro do Plano ÷ 5) × 100
    const inPlanDays = weeklyRecords.reduce((sum, r) => sum + (!r.saiuPlano ? 1 : 0), 0);
    const planPerc = Math.min((inPlanDays / 5) * 100, 100).toFixed(1);

    // Average Energy (All Time or Weekly? Requirements say "Média de Energia", usually for the week context)
    const weekEnergySum = weeklyRecords.reduce((sum, r) => sum + r.energia, 0);
    const avgEnergy = weeklyRecords.length > 0 ? (weekEnergySum / weeklyRecords.length).toFixed(1) : 0;

    // Count Ouro Days (Weekly)
    const ouroDays = weeklyRecords.filter(r => r.nivel.text === 'Ouro').length;

    // Energy metrics by tier (All Time)
    const strongDays = records.filter(r => r.nivel.text === 'Ouro' || r.nivel.text === 'Prata');
    const weakDays = records.filter(r => r.nivel.text === 'Bronze' || r.nivel.text === 'Zero');

    const avgEnergyStrong = strongDays.length > 0
        ? (strongDays.reduce((sum, r) => sum + r.energia, 0) / strongDays.length).toFixed(1) : '--';

    const avgEnergyWeak = weakDays.length > 0
        ? (weakDays.reduce((sum, r) => sum + r.energia, 0) / weakDays.length).toFixed(1) : '--';

    // Total Dias Fortes (Weekly)
    const weeklyDiasFortes = weeklyRecords.filter(r => r.score >= 4 && !r.saiuPlano && r.energia >= 7).length;

    // 3 PILLARS CALCULATION (Weekly based, max 5 days so denominator is usually length or 5)
    // We will use 5 days as the standard week goal denominator
    const totalDaysTarget = 5;

    // Pillar 1: Negócio (% Cold Call)
    const coldCallDays = weeklyRecords.reduce((sum, r) => sum + (r.cold ? 1 : 0), 0);
    const percBusiness = Math.min((coldCallDays / totalDaysTarget) * 100, 100);

    // Pillar 2: Corpo (% Treino + Avg Energy converted to %) / 2
    const treinoDays = weeklyRecords.reduce((sum, r) => sum + (r.treino ? 1 : 0), 0);
    const percTreino = Math.min((treinoDays / totalDaysTarget) * 100, 100);
    const percEnergy = Math.min((avgEnergy / 10) * 100, 100);
    const percBody = (percTreino + percEnergy) / 2;

    // Pillar 3: Mente (% IFMA + Inglês + Revisão) / 300 * 100
    const ifmaDays = weeklyRecords.reduce((sum, r) => sum + (r.ifma ? 1 : 0), 0);
    const englishDays = weeklyRecords.reduce((sum, r) => sum + (r.ingles ? 1 : 0), 0);
    const reviewDays = weeklyRecords.reduce((sum, r) => sum + (r.revisao ? 1 : 0), 0);

    const percIfma = Math.min((ifmaDays / totalDaysTarget) * 100, 100);
    const percEnglish = Math.min((englishDays / totalDaysTarget) * 100, 100);
    const percReview = Math.min((reviewDays / totalDaysTarget) * 100, 100);
    const percMind = (percIfma + percEnglish + percReview) / 3;

    // Balance check
    const pillars = [
        { name: 'Negócio', value: percBusiness, el: meterBusiness ? meterBusiness.closest('.pillar-card') : null },
        { name: 'Corpo', value: percBody, el: meterBody ? meterBody.closest('.pillar-card') : null },
        { name: 'Mente', value: percMind, el: meterMind ? meterMind.closest('.pillar-card') : null }
    ];

    // Sort pillars by value ascending to easily find min and max
    const sortedPillars = [...pillars].sort((a, b) => a.value - b.value);
    const minPillar = sortedPillars[0];
    const maxPillar = sortedPillars[2];
    const imbalance = maxPillar.value - minPillar.value;

    // Monthly Frequencies
    const freqTreino = monthlyRecords.filter(r => r.treino).length;
    const freqIngles = monthlyRecords.filter(r => r.ingles).length;

    // Update DOM
    kpiIpp.textContent = `${ipp}%`;
    kpiConsistency.textContent = `${consistency}%`;
    kpiPlan.textContent = `${planPerc}%`;
    kpiEnergy.textContent = avgEnergy;

    if (kpiDiasFortes) kpiDiasFortes.textContent = weeklyDiasFortes;
    if (kpiEnergyStrong) kpiEnergyStrong.textContent = avgEnergyStrong;
    if (kpiEnergyWeak) kpiEnergyWeak.textContent = avgEnergyWeak;

    monthlyTreino.textContent = `${freqTreino} dias`;
    monthlyIngles.textContent = `${freqIngles} dias`;
    weeklyGold.textContent = `${ouroDays} dias`;

    // Update Pillars UI
    if (meterBusiness) {
        meterBusiness.style.width = `${percBusiness}%`;
        textBusiness.textContent = `${Math.round(percBusiness)}%`;

        meterBody.style.width = `${percBody}%`;
        textBody.textContent = `${Math.round(percBody)}%`;

        meterMind.style.width = `${percMind}%`;
        textMind.textContent = `${Math.round(percMind)}%`;

        // Reset visual warnings
        pillars.forEach(p => {
            if (p.el) p.el.classList.remove('pillar-warning');
        });

        if (weeklyRecords.length === 0) {
            balanceBadge.textContent = 'Sem dados na semana';
            balanceBadge.className = 'nivel-badge zero';
            if (strategicInsight) strategicInsight.style.display = 'none';
        } else if (imbalance > 20) {
            balanceBadge.textContent = `Atenção: Foco em ${minPillar.name}`;
            balanceBadge.className = 'nivel-badge bronze';
            if (minPillar.el) minPillar.el.classList.add('pillar-warning');

            // Show strategic insight
            if (strategicInsight && insightTitle && insightMessage && insightAction) {
                strategicInsight.style.display = 'flex';
                insightTitle.textContent = `Desequilíbrio Crítico: ${minPillar.name}`;
                insightMessage.textContent = `Seu pilar de ${minPillar.name} está operando a apenas ${Math.round(minPillar.value)}%, o que está puxando sua performance geral para baixo e criando uma disparidade de ${Math.round(imbalance)}% em relação ao seu melhor pilar.`;

                // Provide context-specific action
                if (minPillar.name === 'Negócio') {
                    insightAction.textContent = "Agende um bloco de 30-45 minutos inegociáveis para Cold Call amanhã logo no primeiro horário (Eat That Frog).";
                } else if (minPillar.name === 'Corpo') {
                    insightAction.textContent = "Priorize pelo menos 20 min de exercício cardiovascular hoje e foque em recalibrar sua energia para amanhã (sono e hidratação).";
                } else if (minPillar.name === 'Mente') {
                    insightAction.textContent = "Desbloqueie pelo menos 1 tarefa mental pendente hoje (IFMA, Inglês ou Revisão) para retomar o controle cognitivo da semana.";
                }
            }

        } else {
            balanceBadge.textContent = 'Semana Equilibrada';
            balanceBadge.className = 'nivel-badge ouro';
            if (strategicInsight) strategicInsight.style.display = 'none';
        }
    }
}

// === CHART GENERATION ===
function drawCharts() {
    // Shared chart styling
    Chart.defaults.color = '#9ca3af';
    Chart.defaults.font.family = "'Inter', sans-serif";

    // Destroy previous instances to re-draw
    if (mixedChartInst) mixedChartInst.destroy();
    if (ippChartInst) ippChartInst.destroy();

    // Data prep: Last 30 days for monthly combined chart
    const recentChartRecords = [...records].slice(-30);
    const labels = recentChartRecords.map(r => {
        const d = r.date.split('-');
        return `${d[2]}/${d[1]}`;
    });

    const energyData = recentChartRecords.map(r => r.energia);
    const scoreData = recentChartRecords.map(r => r.score);

    // 1. Mixed Chart (Bar for Score, Line for Energy)
    const ctxMixed = document.getElementById('mixedChart').getContext('2d');
    mixedChartInst = new Chart(ctxMixed, {
        data: {
            labels: labels,
            datasets: [
                {
                    type: 'line',
                    label: 'Energia (0-10)',
                    data: energyData,
                    borderColor: '#f59e0b', // Amber
                    backgroundColor: 'rgba(245, 158, 11, 0.1)',
                    borderWidth: 2,
                    tension: 0.4,
                    fill: false,
                    pointBackgroundColor: '#f59e0b',
                    yAxisID: 'yEnergy'
                },
                {
                    type: 'bar',
                    label: 'Pontuação',
                    data: scoreData,
                    backgroundColor: scoreData.map(s => {
                        if (s >= 5) return '#eab308'; // Ouro
                        if (s === 4) return '#94a3b8'; // Prata
                        if (s >= 2) return '#d97706'; // Bronze
                        return '#4b5563'; // Zero
                    }),
                    borderRadius: 4,
                    yAxisID: 'yScore'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                yScore: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    min: 0,
                    max: 6,
                    title: { display: true, text: 'Pontuação' }
                },
                yEnergy: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    min: 0,
                    max: 10,
                    title: { display: true, text: 'Energia' },
                    grid: { drawOnChartArea: false } // Only draw grid for left axis
                }
            },
            plugins: {
                legend: { position: 'top' }
            }
        }
    });

    // 3. Weekly IPP Bar Chart
    // Group records by week YYYY-Www format for chart labels
    const ipByWeek = calculateIppPerWeek(records);

    const ctxIpp = document.getElementById('ippChart').getContext('2d');
    ippChartInst = new Chart(ctxIpp, {
        type: 'bar',
        data: {
            labels: ipByWeek.map(w => w.label),
            datasets: [{
                label: 'IPP Semanal (%)',
                data: ipByWeek.map(w => w.ipp),
                backgroundColor: '#3b82f6',
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { min: 0, max: 100 }
            },
            plugins: {
                legend: { display: false }
            }
        }
    });
}

function calculateIppPerWeek(allRecords) {
    if (!allRecords.length) return [];

    const weeksMap = {};

    allRecords.forEach(r => {
        // Find Monday of the record's week
        const d = new Date(r.date + 'T12:00:00');
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(d.setDate(diff));

        const key = `Sem ${monday.getDate()}/${monday.getMonth() + 1}`;

        if (!weeksMap[key]) {
            weeksMap[key] = { itemsCount: 0, scoreSum: 0 };
        }

        // Only count Monday to Friday (day 1 to 5)
        const originalDay = new Date(r.date + 'T12:00:00').getDay();
        if (originalDay >= 1 && originalDay <= 5) {
            weeksMap[key].scoreSum += r.score;
        }
    });

    const result = [];
    for (const [label, data] of Object.entries(weeksMap)) {
        // IPP calculation logic: (Score sum / 25 ) * 100
        let ipp = (data.scoreSum / 25) * 100;
        if (ipp > 100) ipp = 100; // Cap
        result.push({ label, ipp: ipp.toFixed(1) });
    }

    // Return last 5 weeks
    return result.slice(-5);
}

// Start App
init();

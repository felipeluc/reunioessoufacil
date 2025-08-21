const CONFIG = {
    API_KEY: 'AIzaSyAiU6bMImfPaQLJj8nVO4V0Je67sSyvGTo',
    SHEET_ID: '1-kcIEyUDiBWcGEUKxqotqlpyT-hIta5k3Cx1_mFEUIg',
    SHEET_RANGE: 'Sheet1!A1:Z9999'
};

// Usuários do sistema com senhas fixas
const USERS = {
    angela: {
        name: 'Angela',
        email: 'angela@soufacil.com',
        password: 'angela1234',
        role: 'angela'
    },
    glaucia: {
        name: 'Glaucia',
        email: 'glaucia@soufacil.com',
        password: 'glaucia1234',
        role: 'consultor'
    },
    leticia: {
        name: 'Leticia',
        email: 'leticia@soufacil.com',
        password: 'leticia1234',
        role: 'consultor'
    },
    marcelo: {
        name: 'Marcelo',
        email: 'marcelo@soufacil.com',
        password: 'marcelo1234',
        role: 'consultor'
    },
    gabriel: {
        name: 'Gabriel',
        email: 'gabriel@soufacil.com',
        password: 'gabriel1234',
        role: 'consultor'
    },
    felipe: {
        name: 'Felipe',
        email: 'felipe@soufacil.com',
        password: 'felipe1234',
        role: 'admin'
    },
    carol: {
        name: 'Carol',
        email: 'carol@soufacil.com',
        password: 'carol1234',
        role: 'gerente'
    }
};

// Status possíveis das reuniões
const STATUS = {
    AGENDADA: 'Agendada',
    CONFIRMADA: 'Confirmada',
    RECUSADA: 'Recusada',
    SUGERIDO: 'Sugerido Novo Horário',
    TRANSFERIDA: 'Transferida',
    REALIZADA: 'Realizada',
    CANCELADA: 'Cancelada'
};

// Status pós-reunião para consultores
const STATUS_POS_REUNIAO = {
    FECHADO: 'Fechado',
    NAO_INTERESSOU: 'Não se interessou',
    REMARCOU: 'Remarcou',
    NEGOCIANDO: 'Negociando'
};

// Estado global da aplicação
const AppState = {
    user: null,
    currentView: null,
    currentConsultor: null,
    meetings: [],
    contasProprias: [],
    gapiInited: false,
    selectedMeeting: null
};

// Elementos DOM
const DOM = {
    // Autenticação
    loginForm: document.getElementById('loginForm'),
    selectLoginUser: document.getElementById('selectLoginUser'),
    loginPassword: document.getElementById('loginPassword'),
    btnSignIn: document.getElementById('btnSignIn'),
    btnSignOut: document.getElementById('btnSignOut'),
    userEmail: document.getElementById('userEmail'),
    selectUser: document.getElementById('selectUser'),
    
    // Formulário Angela
    formAngela: document.getElementById('formAngela'),
    formAgendamento: document.getElementById('formAgendamento'),
    btnSalvar: document.getElementById('btnSalvar'),
    btnWhats: document.getElementById('btnWhats'),
    btnClear: document.getElementById('btnClear'),
    
    // Painel de reuniões
    painelReunioes: document.getElementById('painelReunioes'),
    painelTitulo: document.getElementById('painelTitulo'),
    painelSubtitulo: document.getElementById('painelSubtitulo'),
    listaReunioes: document.getElementById('listaReunioes'),
    startDate: document.getElementById('startDate'),
    endDate: document.getElementById('endDate'),
    btnFilter: document.getElementById('btnFilter'),
    errorMsg: document.getElementById('errorMsg'),
    
    // Seções específicas
    consultorMinhasReunioes: document.getElementById('consultorMinhasReunioes'),
    angelaGerenciarSugestoes: document.getElementById('angelaGerenciarSugestoes'),
    
    // Dashboard
    dashboardGerencial: document.getElementById('dashboardGerencial'),
    dashStartDate: document.getElementById('dashStartDate'),
    dashEndDate: document.getElementById('dashEndDate'),
    btnDashFilter: document.getElementById('btnDashFilter'),
    
    // Stats do dashboard
    statAgendadas: document.getElementById('statAgendadas'),
    statConfirmadas: document.getElementById('statConfirmadas'),
    statRecusadas: document.getElementById('statRecusadas'),
    statTransferidas: document.getElementById('statTransferidas'),
    statSugeridas: document.getElementById('statSugeridas'),
    statRealizadas: document.getElementById('statRealizadas'),
    statContasFechadas: document.getElementById('statContasFechadas'),
    statValorAdesao: document.getElementById('statValorAdesao'),
    
    // Modais
    modalDetalhes: document.getElementById('modalDetalhes'),
    modalAcoes: document.getElementById('modalAcoes'),
    modalSugerir: document.getElementById('modalSugerir'),
    modalGerenciar: document.getElementById('modalGerenciar'),
    modalStatusPos: document.getElementById('modalStatusPos'),
    modalContaPropria: document.getElementById('modalContaPropria'),
    modalTransferir: document.getElementById('modalTransferir'),
    modalStatInfo: document.getElementById('modalStatInfo'),
    
    // Loading e notificações
    loadingOverlay: document.getElementById('loadingOverlay'),
    notification: document.getElementById('notification')
};

// Utilitários
const Utils = {
    formatDateBR(isoDate) {
        if (!isoDate) return '-';
        const [year, month, day] = isoDate.split('-');
        return `${day}/${month}/${year}`;
    },
    
    formatDateISO(brDate) {
        if (!brDate) return '';
        const [day, month, year] = brDate.split('/');
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    },
    
    formatCurrency(value) {
        if (!value || isNaN(value)) return 'R$ 0,00';
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value);
    },
    
    normalizeHeader(header) {
        return header.toLowerCase()
            .trim()
            .replace(/\s+/g, '_')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, "");
    },
    
    showLoading() {
        if (DOM.loadingOverlay) {
            DOM.loadingOverlay.classList.remove('hidden');
        }
    },
    
    hideLoading() {
        if (DOM.loadingOverlay) {
            DOM.loadingOverlay.classList.add('hidden');
        }
    },
    
    showNotification(message, type = 'info') {
        console.log(`[${type.toUpperCase()}] ${message}`);
        
        if (DOM.notification) {
            const icon = DOM.notification.querySelector('.notification-icon');
            const messageEl = DOM.notification.querySelector('.notification-message');
            
            if (icon && messageEl) {
                // Definir ícone baseado no tipo
                const icons = {
                    success: 'fas fa-check-circle',
                    error: 'fas fa-exclamation-circle',
                    warning: 'fas fa-exclamation-triangle',
                    info: 'fas fa-info-circle'
                };
                
                icon.className = `notification-icon ${icons[type] || icons.info}`;
                messageEl.textContent = message;
                DOM.notification.className = `notification notification-${type}`;
                
                // Mostrar notificação
                DOM.notification.classList.remove('hidden');
                
                // Esconder após 5 segundos
                setTimeout(() => {
                    DOM.notification.classList.add('hidden');
                }, 5000);
            }
        }
    },
    
    showError(message) {
        if (DOM.errorMsg) {
            DOM.errorMsg.textContent = message;
            DOM.errorMsg.classList.remove('hidden');
        }
        this.showNotification(message, 'error');
    },
    
    hideError() {
        if (DOM.errorMsg) {
            DOM.errorMsg.classList.add('hidden');
        }
    },
    
    showModal(modal) {
        if (modal) {
            modal.classList.remove('hidden');
            modal.style.display = 'flex';
        }
    },
    
    hideModal(modal) {
        if (modal) {
            modal.classList.add('hidden');
            modal.style.display = 'none';
        }
    }
};

// Gerenciamento de autenticação local
const Auth = {
    async init() {
        try {
            console.log('🚀 Inicializando sistema...');
            
            // Inicializar Google Sheets API
            await this.initGapi();
            
            // Configurar event listeners
            this.setupEventListeners();
            
            console.log('✅ Sistema de autenticação local inicializado');
        } catch (error) {
            console.error('❌ Erro ao inicializar autenticação:', error);
            Utils.showError('Erro ao inicializar sistema');
        }
    },
    
    async initGapi() {
        return new Promise((resolve, reject) => {
            console.log('🔧 Inicializando Google Sheets API...');
            gapi.load('client', async () => {
                try {
                    await gapi.client.init({
                        apiKey: CONFIG.API_KEY,
                        discoveryDocs: [
                            'https://sheets.googleapis.com/$discovery/rest?version=v4'
                        ]
                    });
                    AppState.gapiInited = true;
                    console.log('✅ Google Sheets API inicializada');
                    resolve();
                } catch (error) {
                    console.error('❌ Erro ao inicializar Google Sheets API:', error);
                    reject(error);
                }
            });
        });
    },
    
    setupEventListeners() {
        console.log('🔧 Configurando event listeners...');
        
        if (DOM.btnSignIn) {
            console.log('✅ Botão de login encontrado, adicionando listener');
            DOM.btnSignIn.addEventListener('click', this.handleLogin.bind(this));
        } else {
            console.error('❌ Botão de login não encontrado!');
        }
        
        if (DOM.btnSignOut) {
            console.log('✅ Botão de logout encontrado, adicionando listener');
            DOM.btnSignOut.addEventListener('click', this.handleLogout.bind(this));
        } else {
            console.error('❌ Botão de logout não encontrado!');
        }
        
        // Enter key no campo de senha
        if (DOM.loginPassword) {
            console.log('✅ Campo de senha encontrado, adicionando listener para Enter');
            DOM.loginPassword.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    console.log('🔑 Enter pressionado no campo de senha');
                    this.handleLogin();
                }
            });
        } else {
            console.error('❌ Campo de senha não encontrado!');
        }
        
        // Event listeners para formulários e botões
        this.setupFormListeners();
    },
    
    setupFormListeners() {
        // Formulário Angela
        if (DOM.btnSalvar) {
            DOM.btnSalvar.addEventListener('click', AngelaManager.salvarReuniao.bind(AngelaManager));
        }
        
        if (DOM.btnWhats) {
            DOM.btnWhats.addEventListener('click', AngelaManager.enviarWhatsApp.bind(AngelaManager));
        }
        
        if (DOM.btnClear) {
            DOM.btnClear.addEventListener('click', AngelaManager.limparFormulario.bind(AngelaManager));
        }
        
        // Filtros
        if (DOM.btnFilter) {
            DOM.btnFilter.addEventListener('click', MeetingRenderer.applyFilters.bind(MeetingRenderer));
        }
        
        if (DOM.btnDashFilter) {
            DOM.btnDashFilter.addEventListener('click', DashboardManager.applyFilters.bind(DashboardManager));
        }
        
        // Seletor de usuário para admin
        if (DOM.selectUser) {
            DOM.selectUser.addEventListener('change', this.handleUserSelection.bind(this));
        }
    },
    
    handleLogin() {
        console.log('🔐 Tentativa de login iniciada...');
        
        const username = DOM.selectLoginUser?.value;
        const password = DOM.loginPassword?.value;
        
        console.log('👤 Usuário selecionado:', username);
        console.log('🔑 Senha fornecida:', password ? '***' : 'vazia');
        
        if (!username || !password) {
            console.error('❌ Usuário ou senha não fornecidos');
            Utils.showError('Por favor, selecione um usuário e digite a senha');
            return;
        }
        
        const user = USERS[username];
        console.log('🔍 Dados do usuário encontrados:', user ? 'sim' : 'não');
        
        if (!user || user.password !== password) {
            console.error('❌ Credenciais inválidas');
            Utils.showError('Usuário ou senha incorretos');
            return;
        }
        
        console.log('✅ Login bem-sucedido para:', user.name);
        
        // Login bem-sucedido
        AppState.user = user;
        this.updateUI();
        this.setupUserView();
        
        Utils.showNotification(`Bem-vindo, ${user.name}!`, 'success');
    },
    
    handleLogout() {
        console.log('🚪 Fazendo logout...');
        
        AppState.user = null;
        AppState.currentView = null;
        AppState.currentConsultor = null;
        AppState.meetings = [];
        AppState.contasProprias = [];
        
        this.updateUI();
        this.hideAllSections();
        
        // Limpar campos de login
        if (DOM.selectLoginUser) DOM.selectLoginUser.value = '';
        if (DOM.loginPassword) DOM.loginPassword.value = '';
        
        Utils.showNotification('Logout realizado com sucesso!', 'success');
    },
    
    updateUI() {
        if (AppState.user) {
            console.log('🎨 Atualizando UI para usuário logado:', AppState.user.name);
            
            // Usuário logado
            if (DOM.userEmail) DOM.userEmail.textContent = AppState.user.email;
            if (DOM.loginForm) DOM.loginForm.classList.add('hidden');
            if (DOM.btnSignOut) DOM.btnSignOut.classList.remove('hidden');
            
            // Mostrar seletor de visualização para admin/gerente
            if ((AppState.user.role === 'admin' || AppState.user.role === 'gerente') && DOM.selectUser) {
                DOM.selectUser.classList.remove('hidden');
            }
        } else {
            console.log('🎨 Atualizando UI para usuário não logado');
            
            // Usuário não logado
            if (DOM.userEmail) DOM.userEmail.textContent = 'Não conectado';
            if (DOM.loginForm) DOM.loginForm.classList.remove('hidden');
            if (DOM.btnSignOut) DOM.btnSignOut.classList.add('hidden');
            if (DOM.selectUser) DOM.selectUser.classList.add('hidden');
        }
    },
    
    async setupUserView() {
        if (!AppState.user) {
            console.log('❌ Nenhum usuário logado para configurar visualização');
            return;
        }
        
        console.log('🎯 Configurando visualização para:', AppState.user.role);
        
        try {
            Utils.showLoading();
            
            // Carregar dados da planilha
            await DataManager.loadMeetings();
            await DataManager.loadContasProprias();
            
            // Configurar visualização baseada no papel do usuário
            switch (AppState.user.role) {
                case 'angela':
                    this.showAngelaView();
                    break;
                case 'consultor':
                    this.showConsultorView();
                    break;
                case 'admin':
                case 'gerente':
                    this.showAdminView();
                    break;
                default:
                    Utils.showError('Papel de usuário não reconhecido');
            }
            
            Utils.hideLoading();
        } catch (error) {
            console.error('❌ Erro ao configurar visualização:', error);
            Utils.showError('Erro ao carregar dados');
            Utils.hideLoading();
        }
    },
    
    showAngelaView() {
        console.log('👩‍💼 Exibindo visualização da Angela');
        
        if (DOM.formAngela) DOM.formAngela.classList.remove('hidden');
        if (DOM.painelReunioes) DOM.painelReunioes.classList.remove('hidden');
        if (DOM.angelaGerenciarSugestoes) DOM.angelaGerenciarSugestoes.classList.remove('hidden');
        
        if (DOM.painelTitulo) DOM.painelTitulo.innerHTML = '<i class="fas fa-calendar"></i> Minhas Reuniões';
        if (DOM.painelSubtitulo) DOM.painelSubtitulo.textContent = 'Reuniões agendadas por você';
        
        AppState.currentView = 'angela';
        MeetingRenderer.renderMeetings('angela');
    },
    
    showConsultorView() {
        console.log('👨‍💼 Exibindo visualização do consultor');
        
        if (DOM.painelReunioes) DOM.painelReunioes.classList.remove('hidden');
        if (DOM.consultorMinhasReunioes) DOM.consultorMinhasReunioes.classList.remove('hidden');
        
        if (DOM.painelTitulo) DOM.painelTitulo.innerHTML = `<i class="fas fa-user"></i> Reuniões - ${AppState.user.name}`;
        if (DOM.painelSubtitulo) DOM.painelSubtitulo.textContent = 'Reuniões atribuídas a você';
        
        AppState.currentView = 'consultor';
        AppState.currentConsultor = AppState.user.name;
        MeetingRenderer.renderMeetings('consultor');
    },
    
    showAdminView() {
        console.log('👨‍💻 Exibindo visualização do admin');
        
        if (DOM.selectUser) DOM.selectUser.classList.remove('hidden');
        if (DOM.dashboardGerencial) DOM.dashboardGerencial.classList.remove('hidden');
        
        AppState.currentView = 'admin';
        DashboardManager.init();
    },
    
    handleUserSelection(event) {
        const selectedUser = event.target.value;
        console.log('🔄 Mudança de visualização para:', selectedUser);
        
        if (!selectedUser) return;
        
        this.hideAllSections();
        
        if (selectedUser === 'dashboard') {
            this.showAdminView();
        } else {
            // Simular visualização de outro usuário
            const tempUser = USERS[selectedUser];
            if (tempUser) {
                const originalUser = AppState.user;
                AppState.user = tempUser;
                this.setupUserView();
                AppState.user = originalUser; // Restaurar usuário original
            }
        }
    },
    
    hideAllSections() {
        console.log('🙈 Escondendo todas as seções');
        
        if (DOM.formAngela) DOM.formAngela.classList.add('hidden');
        if (DOM.painelReunioes) DOM.painelReunioes.classList.add('hidden');
        if (DOM.consultorMinhasReunioes) DOM.consultorMinhasReunioes.classList.add('hidden');
        if (DOM.angelaGerenciarSugestoes) DOM.angelaGerenciarSugestoes.classList.add('hidden');
        if (DOM.dashboardGerencial) DOM.dashboardGerencial.classList.add('hidden');
        if (DOM.listaReunioes) DOM.listaReunioes.innerHTML = '';
    }
};

// Gerenciamento de dados
const DataManager = {
    async loadMeetings() {
        console.log('📊 Carregando reuniões da planilha...');
        
        if (!AppState.gapiInited) {
            console.error('❌ Google Sheets API não inicializada');
            Utils.showError('Sistema não inicializado');
            return;
        }
        
        try {
            const response = await gapi.client.sheets.spreadsheets.values.get({
                spreadsheetId: CONFIG.SHEET_ID,
                range: CONFIG.SHEET_RANGE
            });
            
            const rows = response.result.values;
            console.log('📋 Dados recebidos da planilha:', rows ? rows.length : 0, 'linhas');
            
            if (!rows || rows.length === 0) {
                AppState.meetings = [];
                console.log('📭 Nenhuma reunião encontrada');
                return;
            }
            
            // Converter dados da planilha para objetos
            const headers = rows[0];
            AppState.meetings = rows.slice(1).map((row, index) => {
                const meeting = { id: index + 1 };
                headers.forEach((header, i) => {
                    const normalizedHeader = Utils.normalizeHeader(header);
                    meeting[normalizedHeader] = row[i] || '';
                });
                return meeting;
            });
            
            console.log('✅ Reuniões carregadas:', AppState.meetings.length);
        } catch (error) {
            console.error('❌ Erro ao carregar reuniões:', error);
            Utils.showError('Erro ao carregar dados da planilha');
        }
    },
    
    async loadContasProprias() {
        console.log('💼 Carregando contas próprias...');
        
        try {
            // Simular carregamento de contas próprias
            // Em uma implementação real, isso viria de outra aba da planilha
            AppState.contasProprias = [];
            console.log('✅ Contas próprias carregadas:', AppState.contasProprias.length);
        } catch (error) {
            console.error('❌ Erro ao carregar contas próprias:', error);
        }
    },
    
    async saveMeeting(meetingData) {
        console.log('💾 Salvando reunião na planilha...');
        
        if (!AppState.gapiInited) {
            Utils.showError('Sistema não inicializado');
            return false;
        }
        
        try {
            Utils.showLoading();
            
            // Adicionar timestamp e ID
            meetingData.id = Date.now();
            meetingData.data_criacao = new Date().toISOString();
            meetingData.status_reuniao = STATUS.AGENDADA;
            meetingData.agendado_por = AppState.user.name;
            
            // Preparar dados para a planilha
            const values = [Object.values(meetingData)];
            
            await gapi.client.sheets.spreadsheets.values.append({
                spreadsheetId: CONFIG.SHEET_ID,
                range: 'Sheet1!A:Z',
                valueInputOption: 'RAW',
                resource: { values }
            });
            
            // Recarregar dados
            await this.loadMeetings();
            
            Utils.hideLoading();
            Utils.showNotification('Reunião salva com sucesso!', 'success');
            return true;
        } catch (error) {
            console.error('❌ Erro ao salvar reunião:', error);
            Utils.showError('Erro ao salvar reunião');
            Utils.hideLoading();
            return false;
        }
    },
    
    async updateMeeting(meetingId, updates) {
        console.log('🔄 Atualizando reunião:', meetingId);
        
        try {
            // Encontrar a reunião
            const meetingIndex = AppState.meetings.findIndex(m => m.id == meetingId);
            if (meetingIndex === -1) {
                throw new Error('Reunião não encontrada');
            }
            
            // Atualizar dados localmente
            Object.assign(AppState.meetings[meetingIndex], updates);
            
            // Em uma implementação real, você atualizaria a linha específica na planilha
            // Por enquanto, vamos simular a atualização
            
            Utils.showNotification('Reunião atualizada com sucesso!', 'success');
            return true;
        } catch (error) {
            console.error('❌ Erro ao atualizar reunião:', error);
            Utils.showError('Erro ao atualizar reunião');
            return false;
        }
    },
    
    async saveContaPropria(contaData) {
        console.log('💼 Salvando conta própria...');
        
        try {
            contaData.id = Date.now();
            contaData.data_criacao = new Date().toISOString();
            contaData.consultor = AppState.user.name;
            
            AppState.contasProprias.push(contaData);
            
            Utils.showNotification('Conta própria adicionada com sucesso!', 'success');
            return true;
        } catch (error) {
            console.error('❌ Erro ao salvar conta própria:', error);
            Utils.showError('Erro ao salvar conta própria');
            return false;
        }
    }
};

// Renderização de reuniões
const MeetingRenderer = {
    renderMeetings(viewType) {
        console.log('🎨 Renderizando reuniões para:', viewType);
        
        const lista = DOM.listaReunioes;
        if (!lista) {
            console.error('❌ Elemento listaReunioes não encontrado!');
            return;
        }
        
        lista.innerHTML = '';
        
        let filteredMeetings = this.filterMeetings(viewType);
        
        console.log('📊 Reuniões filtradas:', filteredMeetings.length);
        
        if (filteredMeetings.length === 0) {
            lista.innerHTML = '<div class="no-meetings">Nenhuma reunião encontrada</div>';
            return;
        }
        
        filteredMeetings.forEach(meeting => {
            const meetingCard = this.createMeetingCard(meeting, viewType);
            lista.appendChild(meetingCard);
        });
        
        console.log('✅ Renderização concluída');
    },
    
    filterMeetings(viewType) {
        let filtered = AppState.meetings;
        
        // Filtrar por tipo de visualização
        if (viewType === 'angela') {
            // Angela vê todas as reuniões que ela agendou
            filtered = AppState.meetings.filter(meeting => 
                meeting.agendado_por === AppState.user.name || !meeting.agendado_por
            );
        } else if (viewType === 'consultor') {
            // Consultor vê apenas suas reuniões
            const consultorNome = AppState.currentConsultor;
            filtered = AppState.meetings.filter(meeting => 
                meeting.consultor && meeting.consultor.includes(consultorNome)
            );
        }
        
        // Aplicar filtros de data se existirem
        const startDate = DOM.startDate?.value;
        const endDate = DOM.endDate?.value;
        
        if (startDate) {
            filtered = filtered.filter(meeting => 
                meeting.data_reuniao >= startDate
            );
        }
        
        if (endDate) {
            filtered = filtered.filter(meeting => 
                meeting.data_reuniao <= endDate
            );
        }
        
        return filtered;
    },
    
    createMeetingCard(meeting, viewType) {
        const card = document.createElement('div');
        card.className = 'meeting-card';
        
        const statusClass = this.getStatusClass(meeting.status_reuniao);
        const needsAttention = meeting.status_reuniao === STATUS.SUGERIDO;
        
        card.innerHTML = `
            <div class="meeting-header">
                <div class="meeting-title">
                    <h3>${meeting.empresa || 'Empresa não informada'}</h3>
                    <span class="meeting-status ${statusClass}">${meeting.status_reuniao || 'Agendada'}</span>
                    ${needsAttention ? '<i class="fas fa-exclamation-circle attention-icon" title="Precisa de atenção"></i>' : ''}
                </div>
                <div class="meeting-date">
                    ${Utils.formatDateBR(meeting.data_reuniao)} às ${meeting.horario}
                </div>
            </div>
            <div class="meeting-details">
                <div class="detail-item">
                    <i class="fas fa-phone"></i>
                    <span>Contato: ${meeting.contato || '-'}</span>
                </div>
                <div class="detail-item">
                    <i class="fas fa-building"></i>
                    <span>Segmento: ${meeting.segmento || '-'}</span>
                </div>
                <div class="detail-item">
                    <i class="fas fa-user"></i>
                    <span>Consultor: ${meeting.consultor || '-'}</span>
                </div>
                ${meeting.valor_adesao ? `
                <div class="detail-item">
                    <i class="fas fa-coins"></i>
                    <span>Valor Adesão: ${Utils.formatCurrency(meeting.valor_adesao)}</span>
                </div>
                ` : ''}
            </div>
            <div class="meeting-actions">
                <button class="btn btn-sm btn-outline" onclick="MeetingActions.showDetails(${meeting.id})">
                    <i class="fas fa-info-circle"></i>
                    Ver Detalhes
                </button>
                ${this.getActionButtons(meeting, viewType)}
            </div>
        `;
        
        return card;
    },
    
    getActionButtons(meeting, viewType) {
        if (viewType === 'angela') {
            if (meeting.status_reuniao === STATUS.SUGERIDO) {
                return `
                    <button class="btn btn-sm btn-warning" onclick="AngelaManager.showGerenciarModal(${meeting.id})">
                        <i class="fas fa-cog"></i>
                        Gerenciar
                    </button>
                `;
            }
        } else if (viewType === 'consultor') {
            if (meeting.status_reuniao === STATUS.AGENDADA || meeting.status_reuniao === STATUS.TRANSFERIDA) {
                return `
                    <button class="btn btn-sm btn-primary" onclick="MeetingActions.showConsultorActions(${meeting.id})">
                        <i class="fas fa-tasks"></i>
                        Ações
                    </button>
                `;
            } else if (meeting.status_reuniao === STATUS.CONFIRMADA) {
                return `
                    <button class="btn btn-sm btn-success" onclick="ConsultorManager.showStatusModal(${meeting.id})">
                        <i class="fas fa-edit"></i>
                        Status
                    </button>
                `;
            }
        }
        return '';
    },
    
    getStatusClass(status) {
        switch (status) {
            case STATUS.AGENDADA: return 'status-agendada';
            case STATUS.CONFIRMADA: return 'status-confirmada';
            case STATUS.RECUSADA: return 'status-recusada';
            case STATUS.SUGERIDO: return 'status-sugerido';
            case STATUS.TRANSFERIDA: return 'status-transferida';
            case STATUS.REALIZADA: return 'status-realizada';
            default: return 'status-agendada';
        }
    },
    
    applyFilters() {
        console.log('🔍 Aplicando filtros...');
        MeetingRenderer.renderMeetings(AppState.currentView);
    }
};

// Ações de reuniões
const MeetingActions = {
    showDetails(meetingId) {
        const meeting = AppState.meetings.find(m => m.id == meetingId);
        if (!meeting) return;
        
        AppState.selectedMeeting = meeting;
        
        // Implementar modal de detalhes
        console.log('📋 Mostrando detalhes da reunião:', meeting);
        Utils.showNotification('Funcionalidade de detalhes em desenvolvimento', 'info');
    },
    
    showConsultorActions(meetingId) {
        const meeting = AppState.meetings.find(m => m.id == meetingId);
        if (!meeting) return;
        
        AppState.selectedMeeting = meeting;
        
        // Implementar modal de ações do consultor
        console.log('⚡ Mostrando ações do consultor para reunião:', meeting);
        Utils.showNotification('Funcionalidade de ações em desenvolvimento', 'info');
    },
    
    async aceitarReuniao() {
        if (!AppState.selectedMeeting) return;
        
        try {
            Utils.showLoading();
            
            await DataManager.updateMeeting(AppState.selectedMeeting.id, {
                status_reuniao: STATUS.CONFIRMADA,
                data_confirmacao: new Date().toISOString()
            });
            
            MeetingRenderer.renderMeetings(AppState.currentView);
            Utils.showNotification('Reunião aceita com sucesso!', 'success');
        } catch (error) {
            console.error('❌ Erro ao aceitar reunião:', error);
            Utils.showError('Erro ao aceitar reunião');
        } finally {
            Utils.hideLoading();
        }
    },
    
    async recusarReuniao() {
        if (!AppState.selectedMeeting) return;
        
        try {
            Utils.showLoading();
            
            await DataManager.updateMeeting(AppState.selectedMeeting.id, {
                status_reuniao: STATUS.RECUSADA,
                data_recusa: new Date().toISOString()
            });
            
            MeetingRenderer.renderMeetings(AppState.currentView);
            Utils.showNotification('Reunião recusada', 'success');
        } catch (error) {
            console.error('❌ Erro ao recusar reunião:', error);
            Utils.showError('Erro ao recusar reunião');
        } finally {
            Utils.hideLoading();
        }
    }
};

// Gerenciamento específico da Angela
const AngelaManager = {
    salvarReuniao() {
        console.log('💾 Salvando reunião...');
        
        const formData = new FormData(DOM.formAgendamento);
        const meetingData = {};
        
        for (let [key, value] of formData.entries()) {
            meetingData[key] = value;
        }
        
        // Validações básicas
        if (!meetingData.empresa || !meetingData.data_reuniao || !meetingData.horario || !meetingData.consultor) {
            Utils.showError('Por favor, preencha todos os campos obrigatórios');
            return;
        }
        
        DataManager.saveMeeting(meetingData).then(success => {
            if (success) {
                this.limparFormulario();
                MeetingRenderer.renderMeetings('angela');
            }
        });
    },
    
    enviarWhatsApp() {
        console.log('📱 Enviando WhatsApp...');
        
        const formData = new FormData(DOM.formAgendamento);
        const contato = formData.get('contato');
        const empresa = formData.get('empresa');
        const dataReuniao = formData.get('data_reuniao');
        const horario = formData.get('horario');
        
        if (!contato || !empresa || !dataReuniao || !horario) {
            Utils.showError('Por favor, preencha os dados da reunião antes de enviar o WhatsApp');
            return;
        }
        
        const dataFormatada = Utils.formatDateBR(dataReuniao);
        const mensagem = `Olá! Temos uma reunião agendada para ${dataFormatada} às ${horario}. Empresa: ${empresa}`;
        
        const numeroLimpo = contato.replace(/\D/g, '');
        const whatsappUrl = `https://wa.me/${numeroLimpo}?text=${encodeURIComponent(mensagem)}`;
        
        window.open(whatsappUrl, '_blank');
        Utils.showNotification('WhatsApp aberto em nova aba', 'success');
    },
    
    limparFormulario() {
        console.log('🧹 Limpando formulário...');
        DOM.formAgendamento.reset();
        Utils.showNotification('Formulário limpo', 'info');
    },
    
    showGerenciarModal(meetingId) {
        const meeting = AppState.meetings.find(m => m.id == meetingId);
        if (!meeting) return;
        
        AppState.selectedMeeting = meeting;
        
        console.log('⚙️ Gerenciando sugestão para reunião:', meeting);
        Utils.showNotification('Modal de gerenciamento em desenvolvimento', 'info');
    }
};

// Gerenciamento específico do Consultor
const ConsultorManager = {
    showStatusModal(meetingId) {
        const meeting = AppState.meetings.find(m => m.id == meetingId);
        if (!meeting) return;
        
        AppState.selectedMeeting = meeting;
        
        console.log('📊 Atualizando status pós-reunião:', meeting);
        Utils.showNotification('Modal de status em desenvolvimento', 'info');
    },
    
    showContaPropriaModal() {
        console.log('💼 Adicionando conta própria...');
        Utils.showNotification('Modal de conta própria em desenvolvimento', 'info');
    }
};

// Gerenciamento do Dashboard
const DashboardManager = {
    init() {
        console.log('📊 Inicializando dashboard...');
        this.updateStats();
        this.setupStatInfoButtons();
    },
    
    updateStats() {
        const meetings = AppState.meetings;
        const contasProprias = AppState.contasProprias;
        
        // Calcular estatísticas
        const stats = {
            agendadas: meetings.filter(m => m.status_reuniao === STATUS.AGENDADA).length,
            confirmadas: meetings.filter(m => m.status_reuniao === STATUS.CONFIRMADA).length,
            recusadas: meetings.filter(m => m.status_reuniao === STATUS.RECUSADA).length,
            transferidas: meetings.filter(m => m.status_reuniao === STATUS.TRANSFERIDA).length,
            sugeridas: meetings.filter(m => m.status_reuniao === STATUS.SUGERIDO).length,
            realizadas: meetings.filter(m => m.status_reuniao === STATUS.REALIZADA).length,
            contasFechadas: meetings.filter(m => m.status_pos_reuniao === STATUS_POS_REUNIAO.FECHADO).length + contasProprias.length,
            valorAdesao: this.calculateTotalAdesao(meetings, contasProprias)
        };
        
        // Atualizar elementos DOM
        if (DOM.statAgendadas) DOM.statAgendadas.textContent = stats.agendadas;
        if (DOM.statConfirmadas) DOM.statConfirmadas.textContent = stats.confirmadas;
        if (DOM.statRecusadas) DOM.statRecusadas.textContent = stats.recusadas;
        if (DOM.statTransferidas) DOM.statTransferidas.textContent = stats.transferidas;
        if (DOM.statSugeridas) DOM.statSugeridas.textContent = stats.sugeridas;
        if (DOM.statRealizadas) DOM.statRealizadas.textContent = stats.realizadas;
        if (DOM.statContasFechadas) DOM.statContasFechadas.textContent = stats.contasFechadas;
        if (DOM.statValorAdesao) DOM.statValorAdesao.textContent = Utils.formatCurrency(stats.valorAdesao);
        
        console.log('📈 Estatísticas atualizadas:', stats);
    },
    
    calculateTotalAdesao(meetings, contasProprias) {
        let total = 0;
        
        // Somar valores de adesão das reuniões
        meetings.forEach(meeting => {
            if (meeting.valor_adesao && !isNaN(meeting.valor_adesao)) {
                total += parseFloat(meeting.valor_adesao);
            }
        });
        
        // Somar valores das contas próprias
        contasProprias.forEach(conta => {
            if (conta.valor_adesao && !isNaN(conta.valor_adesao)) {
                total += parseFloat(conta.valor_adesao);
            }
        });
        
        return total;
    },
    
    setupStatInfoButtons() {
        const infoButtons = document.querySelectorAll('.stat-info');
        infoButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const statType = e.target.dataset.stat || e.target.dataset.statPos;
                this.showStatInfo(statType);
            });
        });
    },
    
    showStatInfo(statType) {
        console.log('ℹ️ Mostrando informações para:', statType);
        Utils.showNotification(`Informações detalhadas de ${statType} em desenvolvimento`, 'info');
    },
    
    applyFilters() {
        console.log('🔍 Aplicando filtros do dashboard...');
        this.updateStats();
    }
};

// Inicialização do sistema
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Inicializando sistema...');
    Auth.init();
});

console.log('📝 Script carregado com sucesso');


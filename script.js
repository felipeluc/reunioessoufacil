// Configurações da aplicação
const CONFIG = {
    CLIENT_ID: '689575420157-di4d81kgeo6tnaf70edsi6sii5523sev.apps.googleusercontent.com',
    API_KEY: 'AIzaSyAiU6bMImfPaQLJj8nVO4V0Je67sSyvGTo',
    SHEET_ID: '1-kcIEyUDiBWcGEUKxqotqlpyT-hIta5k3Cx1_mFEUIg',
    SHEET_RANGE: 'Sheet1!A1:Z9999'
};

// Emails de usuários
const USERS = {
    ANGELA: 'angela@exemplo.com',
    CONSULTORES: {
        'glaucia@exemplo.com': 'Glaucia',
        'leticia@exemplo.com': 'Leticia',
        'marcelo@exemplo.com': 'Marcelo',
        'gabriel@exemplo.com': 'Gabriel'
    },
    ADMIN: 'felipesoufacil@gmail.com',
    GERENTES: ['felipesoufacil@gmail.com', 'carol@exemplo.com']
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

// Estado global da aplicação
const AppState = {
    user: null,
    currentView: null,
    currentConsultor: null,
    meetings: [],
    gapiInited: false,
    tokenClient: null,
    selectedMeeting: null
};

// Elementos DOM
const DOM = {
    // Autenticação
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
    
    // Dashboard
    dashboardGerencial: document.getElementById('dashboardGerencial'),
    dashStartDate: document.getElementById('dashStartDate'),
    dashEndDate: document.getElementById('dashEndDate'),
    btnDashFilter: document.getElementById('btnDashFilter'),
    
    // Modais
    modalDetalhes: document.getElementById('modalDetalhes'),
    modalAcoes: document.getElementById('modalAcoes'),
    modalSugerir: document.getElementById('modalSugerir'),
    modalGerenciar: document.getElementById('modalGerenciar'),
    
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
    
    normalizeHeader(header) {
        return header.toLowerCase()
            .trim()
            .replace(/\s+/g, '_')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, "");
    },
    
    showLoading() {
        DOM.loadingOverlay.classList.remove('hidden');
    },
    
    hideLoading() {
        DOM.loadingOverlay.classList.add('hidden');
    },
    
    showNotification(message, type = 'info') {
        const notification = DOM.notification;
        const icon = notification.querySelector('.notification-icon');
        const messageEl = notification.querySelector('.notification-message');
        
        // Definir ícone baseado no tipo
        const icons = {
            success: 'fas fa-check-circle',
            error: 'fas fa-exclamation-circle',
            warning: 'fas fa-exclamation-triangle',
            info: 'fas fa-info-circle'
        };
        
        icon.className = `notification-icon ${icons[type] || icons.info}`;
        messageEl.textContent = message;
        notification.className = `notification notification-${type}`;
        
        // Mostrar notificação
        notification.classList.remove('hidden');
        
        // Esconder após 5 segundos
        setTimeout(() => {
            notification.classList.add('hidden');
        }, 5000);
    },
    
    showError(message) {
        DOM.errorMsg.textContent = message;
        DOM.errorMsg.classList.remove('hidden');
        this.showNotification(message, 'error');
    },
    
    hideError() {
        DOM.errorMsg.classList.add('hidden');
    }
};

// Gerenciamento de autenticação
const Auth = {
    async init() {
        try {
            await this.initGapi();
            this.initTokenClient();
        } catch (error) {
            console.error('Erro ao inicializar autenticação:', error);
            Utils.showError('Erro ao inicializar sistema de autenticação');
        }
    },
    
    async initGapi() {
        return new Promise((resolve, reject) => {
            gapi.load('client', async () => {
                try {
                    await gapi.client.init({
                        apiKey: CONFIG.API_KEY,
                        discoveryDocs: [
                            'https://sheets.googleapis.com/$discovery/rest?version=v4'
                        ]
                    });
                    AppState.gapiInited = true;
                    resolve();
                } catch (error) {
                    reject(error);
                }
            });
        });
    },
    
    initTokenClient() {
        AppState.tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: CONFIG.CLIENT_ID,
            scope: 'https://www.googleapis.com/auth/spreadsheets openid email profile',
            callback: this.handleAuthCallback.bind(this)
        });
    },
    
    async handleAuthCallback(response) {
        if (response.error) {
            console.error('Erro na autenticação:', response);
            Utils.showError('Erro na autenticação: ' + response.error);
            return;
        }
        
        try {
            Utils.showLoading();
            
            // Buscar informações do usuário
            const userResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                headers: { Authorization: 'Bearer ' + response.access_token }
            });
            
            AppState.user = await userResponse.json();
            
            // Atualizar interface
            DOM.userEmail.textContent = AppState.user.email;
            DOM.btnSignIn.classList.add('hidden');
            DOM.btnSignOut.classList.remove('hidden');
            
            // Carregar dados e configurar visualização
            await DataManager.loadMeetings();
            this.setupUserView();
            
            Utils.hideLoading();
            Utils.showNotification('Login realizado com sucesso!', 'success');
            
        } catch (error) {
            console.error('Erro ao processar autenticação:', error);
            Utils.showError('Erro ao processar login');
            Utils.hideLoading();
        }
    },
    
    setupUserView() {
        if (!AppState.user) return;
        
        const email = AppState.user.email.toLowerCase();
        
        // Verificar se é Angela
        if (email.includes('angela') || email === USERS.ANGELA) {
            AppState.currentView = 'angela';
            this.showAngelaView();
        }
        // Verificar se é consultor
        else if (USERS.CONSULTORES[email]) {
            AppState.currentView = 'consultor';
            AppState.currentConsultor = USERS.CONSULTORES[email];
            this.showConsultorView();
        }
        // Verificar se é gerente/admin
        else if (USERS.GERENTES.includes(email) || email === USERS.ADMIN) {
            AppState.currentView = 'admin';
            this.showAdminView();
        }
        else {
            Utils.showError('Usuário não autorizado para este sistema');
        }
    },
    
    showAngelaView() {
        DOM.formAngela.classList.remove('hidden');
        DOM.painelReunioes.classList.remove('hidden');
        DOM.painelTitulo.innerHTML = '<i class="fas fa-calendar"></i> Minhas Reuniões';
        DOM.painelSubtitulo.textContent = 'Reuniões agendadas por você';
        MeetingRenderer.renderMeetings('angela');
    },
    
    showConsultorView() {
        DOM.painelReunioes.classList.remove('hidden');
        DOM.painelTitulo.innerHTML = `<i class="fas fa-user"></i> Reuniões - ${AppState.currentConsultor}`;
        DOM.painelSubtitulo.textContent = 'Reuniões atribuídas a você';
        MeetingRenderer.renderMeetings('consultor');
    },
    
    showAdminView() {
        DOM.selectUser.classList.remove('hidden');
        DOM.dashboardGerencial.classList.remove('hidden');
        Dashboard.init();
    },
    
    signIn() {
        if (!AppState.tokenClient) {
            Utils.showError('Sistema de autenticação não inicializado');
            return;
        }
        AppState.tokenClient.requestAccessToken();
    },
    
    signOut() {
        AppState.user = null;
        AppState.currentView = null;
        AppState.currentConsultor = null;
        AppState.meetings = [];
        
        // Resetar interface
        DOM.userEmail.textContent = 'Não conectado';
        DOM.btnSignIn.classList.remove('hidden');
        DOM.btnSignOut.classList.add('hidden');
        DOM.formAngela.classList.add('hidden');
        DOM.painelReunioes.classList.add('hidden');
        DOM.dashboardGerencial.classList.add('hidden');
        DOM.selectUser.classList.add('hidden');
        DOM.listaReunioes.innerHTML = '';
        
        Utils.showNotification('Logout realizado com sucesso!', 'success');
    }
};

// Gerenciamento de dados
const DataManager = {
    async loadMeetings() {
        if (!AppState.gapiInited) {
            Utils.showError('Sistema não inicializado');
            return;
        }
        
        try {
            Utils.showLoading();
            
            const response = await gapi.client.sheets.spreadsheets.values.get({
                spreadsheetId: CONFIG.SHEET_ID,
                range: CONFIG.SHEET_RANGE
            });
            
            const rows = response.result.values || [];
            
            if (rows.length < 2) {
                AppState.meetings = [];
                Utils.hideLoading();
                return;
            }
            
            // Processar dados
            const headers = rows[0].map(Utils.normalizeHeader);
            AppState.meetings = rows.slice(1).map(row => {
                const meeting = {};
                headers.forEach((header, index) => {
                    meeting[header] = row[index] || '';
                });
                return meeting;
            });
            
            Utils.hideLoading();
            Utils.hideError();
            
        } catch (error) {
            console.error('Erro ao carregar reuniões:', error);
            Utils.showError('Erro ao carregar dados da planilha');
            Utils.hideLoading();
        }
    },
    
    async saveMeeting(meetingData) {
        if (!AppState.gapiInited) {
            Utils.showError('Sistema não inicializado');
            return false;
        }
        
        try {
            Utils.showLoading();
            
            // Adicionar dados de controle
            meetingData.data_contato = meetingData.data_contato || new Date().toISOString().split('T')[0];
            meetingData.status_reuniao = STATUS.AGENDADA;
            meetingData.email_de_quem_mandou = AppState.user.email;
            meetingData.data_criacao = new Date().toISOString();
            
            // Preparar dados para inserção
            const values = [Object.values(meetingData)];
            
            await gapi.client.sheets.spreadsheets.values.append({
                spreadsheetId: CONFIG.SHEET_ID,
                range: 'Sheet1!A:Z',
                valueInputOption: 'USER_ENTERED',
                resource: { values }
            });
            
            // Recarregar dados
            await this.loadMeetings();
            
            Utils.hideLoading();
            Utils.showNotification('Reunião salva com sucesso!', 'success');
            return true;
            
        } catch (error) {
            console.error('Erro ao salvar reunião:', error);
            Utils.showError('Erro ao salvar reunião');
            Utils.hideLoading();
            return false;
        }
    },
    
    async updateMeetingStatus(meetingIndex, newStatus, additionalData = {}) {
        if (!AppState.gapiInited) {
            Utils.showError('Sistema não inicializado');
            return false;
        }
        
        try {
            Utils.showLoading();
            
            // Encontrar a linha da reunião (considerando header)
            const rowIndex = meetingIndex + 2; // +1 para header, +1 para base 1
            
            // Atualizar status
            const statusRange = `Sheet1!O${rowIndex}:O${rowIndex}`; // Assumindo coluna O para status
            await gapi.client.sheets.spreadsheets.values.update({
                spreadsheetId: CONFIG.SHEET_ID,
                range: statusRange,
                valueInputOption: 'USER_ENTERED',
                resource: {
                    values: [[newStatus]]
                }
            });
            
            // Atualizar dados adicionais se fornecidos
            if (Object.keys(additionalData).length > 0) {
                for (const [field, value] of Object.entries(additionalData)) {
                    // Aqui você precisaria mapear os campos para as colunas corretas
                    // Por simplicidade, vamos assumir algumas colunas fixas
                    let columnRange;
                    switch (field) {
                        case 'observacao_consultor':
                            columnRange = `Sheet1!P${rowIndex}:P${rowIndex}`;
                            break;
                        case 'nova_data':
                            columnRange = `Sheet1!Q${rowIndex}:Q${rowIndex}`;
                            break;
                        case 'novo_horario':
                            columnRange = `Sheet1!R${rowIndex}:R${rowIndex}`;
                            break;
                        default:
                            continue;
                    }
                    
                    await gapi.client.sheets.spreadsheets.values.update({
                        spreadsheetId: CONFIG.SHEET_ID,
                        range: columnRange,
                        valueInputOption: 'USER_ENTERED',
                        resource: {
                            values: [[value]]
                        }
                    });
                }
            }
            
            // Recarregar dados
            await this.loadMeetings();
            
            Utils.hideLoading();
            Utils.showNotification('Status atualizado com sucesso!', 'success');
            return true;
            
        } catch (error) {
            console.error('Erro ao atualizar status:', error);
            Utils.showError('Erro ao atualizar status da reunião');
            Utils.hideLoading();
            return false;
        }
    }
};

// Renderização de reuniões
const MeetingRenderer = {
    renderMeetings(viewType, filterData = null) {
        DOM.listaReunioes.innerHTML = '';
        
        let filteredMeetings = this.filterMeetingsByView(viewType);
        
        // Aplicar filtro de data se fornecido
        if (filterData) {
            filteredMeetings = this.applyDateFilter(filteredMeetings, filterData);
        }
        
        if (filteredMeetings.length === 0) {
            DOM.listaReunioes.innerHTML = '<div class="no-meetings">Nenhuma reunião encontrada</div>';
            return;
        }
        
        filteredMeetings.forEach((meeting, index) => {
            const meetingElement = this.createMeetingElement(meeting, index, viewType);
            DOM.listaReunioes.appendChild(meetingElement);
        });
    },
    
    filterMeetingsByView(viewType) {
        switch (viewType) {
            case 'angela':
                return AppState.meetings.filter(meeting => 
                    (meeting.email_de_quem_mandou || '').toLowerCase().includes('angela')
                );
            case 'consultor':
                return AppState.meetings.filter(meeting => 
                    meeting.consultor && 
                    meeting.consultor.toLowerCase().includes(AppState.currentConsultor.toLowerCase())
                );
            default:
                return AppState.meetings;
        }
    },
    
    applyDateFilter(meetings, filterData) {
        const { startDate, endDate } = filterData;
        
        if (!startDate && !endDate) return meetings;
        
        return meetings.filter(meeting => {
            const meetingDate = meeting.data_da_reuniao || meeting.data_reuniao;
            if (!meetingDate) return false;
            
            if (startDate && !endDate) {
                return meetingDate === startDate;
            }
            
            if (startDate && endDate) {
                return meetingDate >= startDate && meetingDate <= endDate;
            }
            
            return true;
        });
    },
    
    createMeetingElement(meeting, index, viewType) {
        const div = document.createElement('div');
        div.className = 'meeting-item';
        
        const status = meeting.status_reuniao || STATUS.AGENDADA;
        const statusClass = this.getStatusClass(status);
        
        div.innerHTML = `
            <div class="meeting-header">
                <div class="meeting-basic-info">
                    <h4>${meeting.empresa || 'Empresa não informada'}</h4>
                    <div class="meeting-meta">
                        <span class="meeting-date">
                            <i class="fas fa-calendar"></i>
                            ${Utils.formatDateBR(meeting.data_da_reuniao || meeting.data_reuniao)}
                        </span>
                        <span class="meeting-time">
                            <i class="fas fa-clock"></i>
                            ${meeting.horario || 'Horário não informado'}
                        </span>
                        <span class="meeting-status ${statusClass}">
                            <i class="fas fa-circle"></i>
                            ${status}
                        </span>
                    </div>
                </div>
                <div class="meeting-actions">
                    <button class="btn btn-sm btn-outline" onclick="MeetingActions.showDetails(${index})">
                        <i class="fas fa-info-circle"></i>
                        Ver Detalhes
                    </button>
                    ${this.getMeetingActionButtons(meeting, index, viewType)}
                </div>
            </div>
        `;
        
        return div;
    },
    
    getMeetingActionButtons(meeting, index, viewType) {
        const status = meeting.status_reuniao || STATUS.AGENDADA;
        
        if (viewType === 'consultor' && status === STATUS.AGENDADA) {
            return `
                <button class="btn btn-sm btn-primary" onclick="MeetingActions.showConsultorActions(${index})">
                    <i class="fas fa-tasks"></i>
                    Ações
                </button>
            `;
        }
        
        if (viewType === 'angela' && (status === STATUS.SUGERIDO || status === STATUS.RECUSADA)) {
            return `
                <button class="btn btn-sm btn-warning" onclick="MeetingActions.showAngelaActions(${index})">
                    <i class="fas fa-cogs"></i>
                    Gerenciar
                </button>
            `;
        }
        
        return '';
    },
    
    getStatusClass(status) {
        const statusClasses = {
            [STATUS.AGENDADA]: 'status-scheduled',
            [STATUS.CONFIRMADA]: 'status-confirmed',
            [STATUS.RECUSADA]: 'status-rejected',
            [STATUS.SUGERIDO]: 'status-suggested',
            [STATUS.TRANSFERIDA]: 'status-transferred',
            [STATUS.REALIZADA]: 'status-completed',
            [STATUS.CANCELADA]: 'status-cancelled'
        };
        
        return statusClasses[status] || 'status-default';
    }
};

// Ações de reuniões
const MeetingActions = {
    showDetails(index) {
        const meeting = AppState.meetings[index];
        if (!meeting) return;
        
        const detailsContent = DOM.modalDetalhes.querySelector('#detalhesContent');
        detailsContent.innerHTML = this.generateDetailsHTML(meeting);
        
        DOM.modalDetalhes.classList.remove('hidden');
    },
    
    generateDetailsHTML(meeting) {
        return `
            <div class="details-grid">
                <div class="detail-item">
                    <label>Empresa:</label>
                    <span>${meeting.empresa || '-'}</span>
                </div>
                <div class="detail-item">
                    <label>CNPJ:</label>
                    <span>${meeting.cnpj || '-'}</span>
                </div>
                <div class="detail-item">
                    <label>Contato:</label>
                    <span>${meeting.nome || '-'}</span>
                </div>
                <div class="detail-item">
                    <label>Telefone:</label>
                    <span>${meeting.contato || '-'}</span>
                </div>
                <div class="detail-item">
                    <label>Função:</label>
                    <span>${meeting.funcao || '-'}</span>
                </div>
                <div class="detail-item">
                    <label>Segmento:</label>
                    <span>${meeting.segmento || '-'}</span>
                </div>
                <div class="detail-item">
                    <label>UF:</label>
                    <span>${meeting.uf || '-'}</span>
                </div>
                <div class="detail-item">
                    <label>Quantidade de lojas:</label>
                    <span>${meeting.qtd_lojas || '-'}</span>
                </div>
                <div class="detail-item">
                    <label>Prospecção:</label>
                    <span>${meeting.prospeccao || '-'}</span>
                </div>
                <div class="detail-item">
                    <label>Tipo de reunião:</label>
                    <span>${meeting.reuniao || '-'}</span>
                </div>
                <div class="detail-item">
                    <label>Data da reunião:</label>
                    <span>${Utils.formatDateBR(meeting.data_da_reuniao || meeting.data_reuniao)}</span>
                </div>
                <div class="detail-item">
                    <label>Horário:</label>
                    <span>${meeting.horario || '-'}</span>
                </div>
                <div class="detail-item">
                    <label>Consultor:</label>
                    <span>${meeting.consultor || '-'}</span>
                </div>
                <div class="detail-item">
                    <label>Status:</label>
                    <span class="${MeetingRenderer.getStatusClass(meeting.status_reuniao || STATUS.AGENDADA)}">
                        ${meeting.status_reuniao || STATUS.AGENDADA}
                    </span>
                </div>
                ${meeting.observacoes ? `
                <div class="detail-item detail-full">
                    <label>Observações:</label>
                    <span>${meeting.observacoes}</span>
                </div>
                ` : ''}
                ${meeting.observacao_consultor ? `
                <div class="detail-item detail-full">
                    <label>Observação do consultor:</label>
                    <span>${meeting.observacao_consultor}</span>
                </div>
                ` : ''}
            </div>
        `;
    },
    
    showConsultorActions(index) {
        AppState.selectedMeeting = index;
        const meeting = AppState.meetings[index];
        
        const reuniaoInfo = DOM.modalAcoes.querySelector('#reuniaoInfo');
        reuniaoInfo.innerHTML = `
            <h4>${meeting.empresa}</h4>
            <p><strong>Data:</strong> ${Utils.formatDateBR(meeting.data_da_reuniao || meeting.data_reuniao)}</p>
            <p><strong>Horário:</strong> ${meeting.horario}</p>
            <p><strong>Tipo:</strong> ${meeting.reuniao}</p>
        `;
        
        DOM.modalAcoes.classList.remove('hidden');
    },
    
    showAngelaActions(index) {
        AppState.selectedMeeting = index;
        const meeting = AppState.meetings[index];
        
        const gerenciarInfo = DOM.modalGerenciar.querySelector('#gerenciarInfo');
        const gerenciarActions = DOM.modalGerenciar.querySelector('#gerenciarActions');
        
        gerenciarInfo.innerHTML = `
            <h4>${meeting.empresa}</h4>
            <p><strong>Consultor:</strong> ${meeting.consultor}</p>
            <p><strong>Status:</strong> ${meeting.status_reuniao}</p>
            ${meeting.observacao_consultor ? `<p><strong>Observação:</strong> ${meeting.observacao_consultor}</p>` : ''}
        `;
        
        if (meeting.status_reuniao === STATUS.SUGERIDO) {
            gerenciarActions.innerHTML = `
                <button class="btn btn-success" onclick="MeetingActions.acceptSuggestion(${index})">
                    <i class="fas fa-check"></i>
                    Aceitar Novo Horário
                </button>
                <button class="btn btn-warning" onclick="MeetingActions.showTransferOptions(${index})">
                    <i class="fas fa-exchange-alt"></i>
                    Transferir para Outro Consultor
                </button>
            `;
        } else {
            gerenciarActions.innerHTML = `
                <button class="btn btn-warning" onclick="MeetingActions.showTransferOptions(${index})">
                    <i class="fas fa-exchange-alt"></i>
                    Transferir para Outro Consultor
                </button>
            `;
        }
        
        DOM.modalGerenciar.classList.remove('hidden');
    },
    
    async acceptMeeting() {
        if (AppState.selectedMeeting === null) return;
        
        const success = await DataManager.updateMeetingStatus(
            AppState.selectedMeeting, 
            STATUS.CONFIRMADA
        );
        
        if (success) {
            DOM.modalAcoes.classList.add('hidden');
            MeetingRenderer.renderMeetings(AppState.currentView);
        }
    },
    
    async rejectMeeting() {
        if (AppState.selectedMeeting === null) return;
        
        const success = await DataManager.updateMeetingStatus(
            AppState.selectedMeeting, 
            STATUS.RECUSADA
        );
        
        if (success) {
            DOM.modalAcoes.classList.add('hidden');
            MeetingRenderer.renderMeetings(AppState.currentView);
        }
    },
    
    showSuggestionForm() {
        DOM.modalAcoes.classList.add('hidden');
        DOM.modalSugerir.classList.remove('hidden');
    },
    
    async submitSuggestion(event) {
        event.preventDefault();
        
        if (AppState.selectedMeeting === null) return;
        
        const formData = new FormData(event.target);
        const suggestionData = {
            nova_data: formData.get('novaData'),
            novo_horario: formData.get('novoHorario'),
            observacao_consultor: formData.get('observacaoSugestao')
        };
        
        const success = await DataManager.updateMeetingStatus(
            AppState.selectedMeeting,
            STATUS.SUGERIDO,
            suggestionData
        );
        
        if (success) {
            DOM.modalSugerir.classList.add('hidden');
            event.target.reset();
            MeetingRenderer.renderMeetings(AppState.currentView);
        }
    },
    
    async acceptSuggestion(index) {
        const meeting = AppState.meetings[index];
        
        const success = await DataManager.updateMeetingStatus(
            index,
            STATUS.CONFIRMADA,
            {
                data_da_reuniao: meeting.nova_data,
                horario: meeting.novo_horario
            }
        );
        
        if (success) {
            DOM.modalGerenciar.classList.add('hidden');
            MeetingRenderer.renderMeetings(AppState.currentView);
        }
    }
};

// Dashboard
const Dashboard = {
    charts: {},
    
    init() {
        this.updateStats();
        this.initCharts();
    },
    
    updateStats(filterData = null) {
        let meetings = AppState.meetings;
        
        if (filterData) {
            meetings = MeetingRenderer.applyDateFilter(meetings, filterData);
        }
        
        const stats = this.calculateStats(meetings);
        this.renderStats(stats);
        this.updateCharts(meetings);
    },
    
    calculateStats(meetings) {
        const stats = {
            agendadas: 0,
            confirmadas: 0,
            recusadas: 0,
            transferidas: 0,
            sugeridas: 0,
            realizadas: 0
        };
        
        meetings.forEach(meeting => {
            const status = meeting.status_reuniao || STATUS.AGENDADA;
            switch (status) {
                case STATUS.AGENDADA:
                    stats.agendadas++;
                    break;
                case STATUS.CONFIRMADA:
                    stats.confirmadas++;
                    break;
                case STATUS.RECUSADA:
                    stats.recusadas++;
                    break;
                case STATUS.TRANSFERIDA:
                    stats.transferidas++;
                    break;
                case STATUS.SUGERIDO:
                    stats.sugeridas++;
                    break;
                case STATUS.REALIZADA:
                    stats.realizadas++;
                    break;
            }
        });
        
        return stats;
    },
    
    renderStats(stats) {
        document.getElementById('statAgendadas').textContent = stats.agendadas;
        document.getElementById('statConfirmadas').textContent = stats.confirmadas;
        document.getElementById('statRecusadas').textContent = stats.recusadas;
        document.getElementById('statTransferidas').textContent = stats.transferidas;
        document.getElementById('statSugeridas').textContent = stats.sugeridas;
        document.getElementById('statRealizadas').textContent = stats.realizadas;
    },
    
    initCharts() {
        // Chart por consultor
        const ctxConsultores = document.getElementById('chartConsultores');
        if (ctxConsultores) {
            this.charts.consultores = new Chart(ctxConsultores, {
                type: 'bar',
                data: {
                    labels: ['Glaucia', 'Leticia', 'Marcelo', 'Gabriel'],
                    datasets: [{
                        label: 'Reuniões',
                        data: [0, 0, 0, 0],
                        backgroundColor: [
                            'rgba(54, 162, 235, 0.8)',
                            'rgba(255, 99, 132, 0.8)',
                            'rgba(255, 205, 86, 0.8)',
                            'rgba(75, 192, 192, 0.8)'
                        ]
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: {
                            display: false
                        }
                    }
                }
            });
        }
        
        // Chart por status
        const ctxStatus = document.getElementById('chartStatus');
        if (ctxStatus) {
            this.charts.status = new Chart(ctxStatus, {
                type: 'doughnut',
                data: {
                    labels: ['Agendadas', 'Confirmadas', 'Recusadas', 'Sugeridas'],
                    datasets: [{
                        data: [0, 0, 0, 0],
                        backgroundColor: [
                            'rgba(255, 206, 84, 0.8)',
                            'rgba(75, 192, 192, 0.8)',
                            'rgba(255, 99, 132, 0.8)',
                            'rgba(153, 102, 255, 0.8)'
                        ]
                    }]
                },
                options: {
                    responsive: true
                }
            });
        }
    },
    
    updateCharts(meetings) {
        // Atualizar chart de consultores
        if (this.charts.consultores) {
            const consultorData = [0, 0, 0, 0];
            const consultores = ['Glaucia', 'Leticia', 'Marcelo', 'Gabriel'];
            
            meetings.forEach(meeting => {
                const consultor = meeting.consultor;
                const index = consultores.findIndex(c => consultor && consultor.toLowerCase().includes(c.toLowerCase()));
                if (index !== -1) {
                    consultorData[index]++;
                }
            });
            
            this.charts.consultores.data.datasets[0].data = consultorData;
            this.charts.consultores.update();
        }
        
        // Atualizar chart de status
        if (this.charts.status) {
            const stats = this.calculateStats(meetings);
            this.charts.status.data.datasets[0].data = [
                stats.agendadas,
                stats.confirmadas,
                stats.recusadas,
                stats.sugeridas
            ];
            this.charts.status.update();
        }
    }
};

// Event Listeners
function setupEventListeners() {
    // Autenticação
    DOM.btnSignIn.addEventListener('click', Auth.signIn);
    DOM.btnSignOut.addEventListener('click', Auth.signOut);
    
    // Seletor de usuário (admin)
    DOM.selectUser.addEventListener('change', (e) => {
        const selected = e.target.value;
        
        // Esconder todas as views
        DOM.formAngela.classList.add('hidden');
        DOM.painelReunioes.classList.add('hidden');
        DOM.dashboardGerencial.classList.add('hidden');
        
        if (selected === 'angela') {
            AppState.currentView = 'angela';
            Auth.showAngelaView();
        } else if (selected === 'dashboard') {
            AppState.currentView = 'dashboard';
            DOM.dashboardGerencial.classList.remove('hidden');
            Dashboard.init();
        } else if (selected) {
            AppState.currentView = 'consultor';
            AppState.currentConsultor = selected.charAt(0).toUpperCase() + selected.slice(1);
            DOM.painelReunioes.classList.remove('hidden');
            DOM.painelTitulo.innerHTML = `<i class="fas fa-user"></i> Reuniões - ${AppState.currentConsultor}`;
            DOM.painelSubtitulo.textContent = 'Reuniões atribuídas';
            MeetingRenderer.renderMeetings('consultor');
        }
    });
    
    // Formulário Angela
    DOM.btnSalvar.addEventListener('click', async () => {
        const formData = new FormData(DOM.formAgendamento);
        const meetingData = Object.fromEntries(formData.entries());
        
        const success = await DataManager.saveMeeting(meetingData);
        if (success) {
            DOM.formAgendamento.reset();
            MeetingRenderer.renderMeetings('angela');
        }
    });
    
    DOM.btnClear.addEventListener('click', () => {
        DOM.formAgendamento.reset();
    });
    
    DOM.btnWhats.addEventListener('click', () => {
        const formData = new FormData(DOM.formAgendamento);
        const empresa = formData.get('empresa');
        const data = formData.get('data_reuniao');
        const horario = formData.get('horario');
        const consultor = formData.get('consultor');
        
        const message = `Reunião agendada!\n\nEmpresa: ${empresa}\nData: ${Utils.formatDateBR(data)}\nHorário: ${horario}\nConsultor: ${consultor}`;
        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
    });
    
    // Filtros
    DOM.btnFilter.addEventListener('click', () => {
        const filterData = {
            startDate: DOM.startDate.value,
            endDate: DOM.endDate.value
        };
        MeetingRenderer.renderMeetings(AppState.currentView, filterData);
    });
    
    DOM.btnDashFilter.addEventListener('click', () => {
        const filterData = {
            startDate: DOM.dashStartDate.value,
            endDate: DOM.dashEndDate.value
        };
        Dashboard.updateStats(filterData);
    });
    
    // Modais
    document.getElementById('btnCloseDetalhes').addEventListener('click', () => {
        DOM.modalDetalhes.classList.add('hidden');
    });
    
    document.getElementById('btnCloseAcoes').addEventListener('click', () => {
        DOM.modalAcoes.classList.add('hidden');
    });
    
    document.getElementById('btnCloseSugerir').addEventListener('click', () => {
        DOM.modalSugerir.classList.add('hidden');
    });
    
    document.getElementById('btnCloseGerenciar').addEventListener('click', () => {
        DOM.modalGerenciar.classList.add('hidden');
    });
    
    // Ações do consultor
    document.getElementById('btnAceitar').addEventListener('click', MeetingActions.acceptMeeting);
    document.getElementById('btnRecusar').addEventListener('click', MeetingActions.rejectMeeting);
    document.getElementById('btnSugerir').addEventListener('click', MeetingActions.showSuggestionForm);
    
    // Formulário de sugestão
    document.getElementById('formSugerir').addEventListener('submit', MeetingActions.submitSuggestion);
    document.getElementById('btnCancelSugerir').addEventListener('click', () => {
        DOM.modalSugerir.classList.add('hidden');
    });
    
    // Fechar modais clicando fora
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            e.target.classList.add('hidden');
        }
    });
}

// Inicialização
window.addEventListener('load', async () => {
    setupEventListeners();
    await Auth.init();
});


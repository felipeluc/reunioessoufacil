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
            // Carregar a biblioteca do Google API Client
            await new Promise((resolve, reject) => {
                gapi.load("client", async () => {
                    try {
                        await gapi.client.init({
                            apiKey: CONFIG.API_KEY,
                            discoveryDocs: [
                                "https://sheets.googleapis.com/$discovery/rest?version=v4",
                            ],
                        });
                        AppState.gapiInited = true;
                        resolve();
                    } catch (error) {
                        reject(error);
                    }
                });
            });

            // Inicializar o Google Identity Services (GIS)
            AppState.tokenClient = google.accounts.oauth2.initTokenClient({
                client_id: CONFIG.CLIENT_ID,
                scope: "https://www.googleapis.com/auth/spreadsheets openid email profile",
                callback: Auth.handleAuthCallback,
            });

            // Verificar se o usuário já está logado
            const auth2 = gapi.auth2.getAuthInstance();
            if (auth2 && auth2.isSignedIn.get()) {
                const user = auth2.currentUser.get();
                const profile = user.getBasicProfile();
                await AppInitializer.initializeApp({
                    email: profile.getEmail(),
                    name: profile.getName(),
                });
            }
        } catch (error) {
            console.error("Erro ao inicializar autenticação:", error);
            Utils.showError("Erro ao inicializar sistema de autenticação");
        }
    },
    
    async handleAuthCallback(resp) {
        if (resp.error) {
            console.error("Erro na autenticação:", resp);
            Utils.showError("Erro na autenticação: " + resp.error);
            return;
        }

        try {
            Utils.showLoading();

            // Obter informações do usuário
            const userInfoResponse = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
                headers: { Authorization: `Bearer ${resp.access_token}` },
            });
            const userInfo = await userInfoResponse.json();

            // Inicializar a aplicação com as informações do usuário
            await AppInitializer.initializeApp({
                email: userInfo.email,
                name: userInfo.name,
            });

            Utils.hideLoading();
            Utils.showNotification("Login realizado com sucesso!", "success");
        } catch (error) {
            console.error("Erro ao processar autenticação:", error);
            Utils.showError("Erro ao processar login");
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



// Funcionalidades específicas para Angela
const AngelaManager = {
    // Mostrar modal de gerenciamento para reuniões que precisam de atenção
    showGerenciarModal(meetingId) {
        const meeting = AppState.meetings.find(m => m.id == meetingId);
        if (!meeting) return;
        
        AppState.selectedMeeting = meeting;
        
        const modal = DOM.modalGerenciar;
        const info = document.getElementById('gerenciarInfo');
        const actions = document.getElementById('gerenciarActions');
        
        // Mostrar informações da reunião
        info.innerHTML = `
            <div class="meeting-summary">
                <h4>${meeting.empresa}</h4>
                <p><strong>Data original:</strong> ${Utils.formatDateBR(meeting.data_reuniao)} às ${meeting.horario}</p>
                <p><strong>Consultor:</strong> ${meeting.consultor}</p>
                <p><strong>Status:</strong> ${meeting.status_reuniao}</p>
                ${meeting.observacao_consultor ? `<p><strong>Observação do consultor:</strong> ${meeting.observacao_consultor}</p>` : ''}
                ${meeting.nova_data && meeting.novo_horario ? `
                    <div class="suggestion-info">
                        <p><strong>Novo horário sugerido:</strong> ${Utils.formatDateBR(meeting.nova_data)} às ${meeting.novo_horario}</p>
                    </div>
                ` : ''}
            </div>
        `;
        
        // Mostrar ações disponíveis
        actions.innerHTML = '';
        
        if (meeting.status_reuniao === STATUS.SUGERIDO) {
            actions.innerHTML = `
                <button class="btn btn-success" onclick="AngelaManager.aceitarSugestao()">
                    <i class="fas fa-check"></i>
                    Aceitar Novo Horário
                </button>
                <button class="btn btn-warning" onclick="AngelaManager.showTransferirModal()">
                    <i class="fas fa-exchange-alt"></i>
                    Transferir para Outro Consultor
                </button>
                <button class="btn btn-danger" onclick="AngelaManager.recusarSugestao()">
                    <i class="fas fa-times"></i>
                    Recusar Sugestão
                </button>
            `;
        } else if (meeting.status_reuniao === STATUS.RECUSADA) {
            actions.innerHTML = `
                <button class="btn btn-warning" onclick="AngelaManager.showTransferirModal()">
                    <i class="fas fa-exchange-alt"></i>
                    Transferir para Outro Consultor
                </button>
                <button class="btn btn-secondary" onclick="AngelaManager.remarcarReuniao()">
                    <i class="fas fa-calendar-alt"></i>
                    Remarcar Reunião
                </button>
            `;
        }
        
        Utils.showModal(modal);
    },
    
    // Aceitar sugestão de novo horário
    async aceitarSugestao() {
        const meeting = AppState.selectedMeeting;
        if (!meeting || !meeting.nova_data || !meeting.novo_horario) return;
        
        try {
            Utils.showLoading();
            
            // Atualizar a reunião com o novo horário
            const updateData = {
                data_reuniao: meeting.nova_data,
                horario: meeting.novo_horario,
                status_reuniao: STATUS.CONFIRMADA,
                nova_data: '', // Limpar campos de sugestão
                novo_horario: '',
                observacao_consultor: ''
            };
            
            const success = await DataManager.updateMeetingStatus(meeting.id, STATUS.CONFIRMADA, updateData);
            
            if (success) {
                Utils.hideModal(DOM.modalGerenciar);
                Utils.showNotification('Novo horário aceito com sucesso!', 'success');
                await this.loadAndRenderMeetings();
            }
            
        } catch (error) {
            console.error('Erro ao aceitar sugestão:', error);
            Utils.showError('Erro ao aceitar sugestão');
        } finally {
            Utils.hideLoading();
        }
    },
    
    // Recusar sugestão de novo horário
    async recusarSugestao() {
        const meeting = AppState.selectedMeeting;
        if (!meeting) return;
        
        try {
            Utils.showLoading();
            
            const updateData = {
                status_reuniao: STATUS.AGENDADA,
                nova_data: '', // Limpar campos de sugestão
                novo_horario: '',
                observacao_consultor: ''
            };
            
            const success = await DataManager.updateMeetingStatus(meeting.id, STATUS.AGENDADA, updateData);
            
            if (success) {
                Utils.hideModal(DOM.modalGerenciar);
                Utils.showNotification('Sugestão recusada. Reunião voltou ao status original.', 'info');
                await this.loadAndRenderMeetings();
            }
            
        } catch (error) {
            console.error('Erro ao recusar sugestão:', error);
            Utils.showError('Erro ao recusar sugestão');
        } finally {
            Utils.hideLoading();
        }
    },
    
    // Mostrar modal de transferência
    showTransferirModal() {
        const meeting = AppState.selectedMeeting;
        if (!meeting) return;
        
        const modal = DOM.modalTransferir;
        const resumo = document.getElementById('transferirResumo');
        const consultorSelect = document.getElementById('transferirConsultor');
        
        // Mostrar resumo da reunião
        resumo.innerHTML = `
            <div class="meeting-summary">
                <h4>${meeting.empresa}</h4>
                <p><strong>Data:</strong> ${Utils.formatDateBR(meeting.data_reuniao)} às ${meeting.horario}</p>
                <p><strong>Consultor atual:</strong> ${meeting.consultor}</p>
                <p><strong>Contato:</strong> ${meeting.contato}</p>
            </div>
        `;
        
        // Limpar e popular select de consultores (excluindo o atual)
        consultorSelect.innerHTML = '<option value="">Selecione</option>';
        const consultores = ['Glaucia', 'Leticia', 'Marcelo', 'Gabriel'];
        consultores.forEach(consultor => {
            if (consultor !== meeting.consultor) {
                consultorSelect.innerHTML += `<option value="${consultor}">${consultor}</option>`;
            }
        });
        
        Utils.hideModal(DOM.modalGerenciar);
        Utils.showModal(modal);
    },
    
    // Confirmar transferência
    async confirmarTransferencia() {
        const novoConsultor = document.getElementById('transferirConsultor').value;
        const meeting = AppState.selectedMeeting;
        
        if (!novoConsultor || !meeting) {
            Utils.showError('Selecione um consultor para transferir');
            return;
        }
        
        try {
            Utils.showLoading();
            
            const updateData = {
                consultor: novoConsultor,
                status_reuniao: STATUS.TRANSFERIDA,
                consultor_original: meeting.consultor,
                nova_data: '', // Limpar campos de sugestão se houver
                novo_horario: '',
                observacao_consultor: ''
            };
            
            const success = await DataManager.updateMeetingStatus(meeting.id, STATUS.TRANSFERIDA, updateData);
            
            if (success) {
                Utils.hideModal(DOM.modalTransferir);
                Utils.showNotification(`Reunião transferida para ${novoConsultor} com sucesso!`, 'success');
                await this.loadAndRenderMeetings();
            }
            
        } catch (error) {
            console.error('Erro ao transferir reunião:', error);
            Utils.showError('Erro ao transferir reunião');
        } finally {
            Utils.hideLoading();
        }
    },
    
    // Remarcar reunião (para casos de recusa)
    remarcarReuniao() {
        const meeting = AppState.selectedMeeting;
        if (!meeting) return;
        
        // Preencher formulário com dados da reunião para edição
        Utils.hideModal(DOM.modalGerenciar);
        
        // Preencher campos do formulário
        document.getElementById('empresa').value = meeting.empresa || '';
        document.getElementById('data_reuniao').value = meeting.data_reuniao || '';
        document.getElementById('horario').value = meeting.horario || '';
        document.getElementById('consultorSelect').value = meeting.consultor || '';
        
        // Focar no campo de data para facilitar a edição
        document.getElementById('data_reuniao').focus();
        
        Utils.showNotification('Dados carregados no formulário para remarcar', 'info');
    },
    
    async loadAndRenderMeetings() {
        await DataManager.loadMeetings();
        MeetingRenderer.renderMeetings('angela');
    }
};

// Funcionalidades específicas para Consultores
const ConsultorManager = {
    // Mostrar seção "Minhas Reuniões" para consultores
    showMinhasReunioes() {
        const section = DOM.consultorMinhasReunioes;
        const lista = document.getElementById('listaMinhasReunioes');
        
        // Filtrar reuniões do consultor atual
        const minhasReunioes = AppState.meetings.filter(meeting => {
            const consultorNome = USERS.CONSULTORES[AppState.user.email];
            return meeting.consultor && meeting.consultor.includes(consultorNome) && 
                   (meeting.status_reuniao === STATUS.CONFIRMADA || meeting.status_reuniao === STATUS.REALIZADA);
        });
        
        lista.innerHTML = '';
        
        if (minhasReunioes.length === 0) {
            lista.innerHTML = '<div class="no-meetings">Nenhuma reunião confirmada encontrada</div>';
        } else {
            minhasReunioes.forEach(meeting => {
                const meetingCard = this.createMinhaReuniaoCard(meeting);
                lista.appendChild(meetingCard);
            });
        }
        
        section.classList.remove('hidden');
    },
    
    createMinhaReuniaoCard(meeting) {
        const div = document.createElement('div');
        div.className = 'meeting-card minha-reuniao';
        
        const statusPosReuniao = meeting.status_pos_reuniao || 'Pendente';
        const valorAdesao = meeting.valor_adesao ? `R$ ${parseFloat(meeting.valor_adesao).toFixed(2)}` : 'Não informado';
        
        div.innerHTML = `
            <div class="meeting-header">
                <div class="meeting-title">
                    <h3>${meeting.empresa}</h3>
                    <span class="meeting-status ${this.getStatusPosClass(statusPosReuniao)}">${statusPosReuniao}</span>
                </div>
                <div class="meeting-date">
                    ${Utils.formatDateBR(meeting.data_reuniao)} às ${meeting.horario}
                </div>
            </div>
            <div class="meeting-details">
                <div class="detail-item">
                    <i class="fas fa-phone"></i>
                    <span>Contato: ${meeting.contato}</span>
                </div>
                <div class="detail-item">
                    <i class="fas fa-coins"></i>
                    <span>Valor de Adesão: ${valorAdesao}</span>
                </div>
                ${meeting.observacoes ? `
                <div class="detail-item">
                    <i class="fas fa-comment"></i>
                    <span>Observações: ${meeting.observacoes}</span>
                </div>
                ` : ''}
            </div>
            <div class="meeting-actions">
                <button class="btn btn-sm btn-outline" onclick="ConsultorManager.showMeetingDetails(${meeting.id})">
                    <i class="fas fa-info-circle"></i>
                    Ver Detalhes
                </button>
                ${statusPosReuniao === 'Pendente' ? `
                <div class="status-actions">
                    <select class="status-select" onchange="ConsultorManager.updateStatusPos(${meeting.id}, this.value)">
                        <option value="">Atualizar Status</option>
                        <option value="Fechado">Fechado</option>
                        <option value="Não se interessou">Não se interessou</option>
                        <option value="Remarcou">Remarcou</option>
                        <option value="Negociando">Negociando</option>
                    </select>
                </div>
                ` : ''}
                ${statusPosReuniao === 'Fechado' && !meeting.valor_adesao ? `
                <button class="btn btn-sm btn-success" onclick="ConsultorManager.showAdesaoModal(${meeting.id})">
                    <i class="fas fa-coins"></i>
                    Definir Valor
                </button>
                ` : ''}
            </div>
        `;
        
        return div;
    },
    
    getStatusPosClass(status) {
        const classes = {
            'Pendente': 'status-pending',
            'Fechado': 'status-closed',
            'Não se interessou': 'status-not-interested',
            'Remarcou': 'status-rescheduled',
            'Negociando': 'status-negotiating'
        };
        return classes[status] || 'status-default';
    },
    
    // Atualizar status pós-reunião
    async updateStatusPos(meetingId, novoStatus) {
        if (!novoStatus) return;
        
        try {
            Utils.showLoading();
            
            const updateData = {
                status_pos_reuniao: novoStatus
            };
            
            const success = await DataManager.updateMeetingStatus(meetingId, null, updateData);
            
            if (success) {
                Utils.showNotification(`Status atualizado para: ${novoStatus}`, 'success');
                this.showMinhasReunioes(); // Recarregar a lista
            }
            
        } catch (error) {
            console.error('Erro ao atualizar status pós-reunião:', error);
            Utils.showError('Erro ao atualizar status');
        } finally {
            Utils.hideLoading();
        }
    },
    
    // Mostrar modal para definir valor de adesão
    showAdesaoModal(meetingId) {
        const meeting = AppState.meetings.find(m => m.id == meetingId);
        if (!meeting) return;
        
        AppState.selectedMeeting = meeting;
        
        const modal = DOM.modalAdesao;
        const info = document.getElementById('adesaoInfo');
        
        info.innerHTML = `
            <div class="meeting-summary">
                <h4>${meeting.empresa}</h4>
                <p><strong>Data:</strong> ${Utils.formatDateBR(meeting.data_reuniao)} às ${meeting.horario}</p>
                <p><strong>Status:</strong> ${meeting.status_pos_reuniao}</p>
            </div>
        `;
        
        document.getElementById('valorAdesaoInput').value = '';
        Utils.showModal(modal);
    },
    
    // Salvar valor de adesão
    async salvarAdesao() {
        const valor = document.getElementById('valorAdesaoInput').value;
        const meeting = AppState.selectedMeeting;
        
        if (!valor || !meeting) {
            Utils.showError('Informe o valor de adesão');
            return;
        }
        
        try {
            Utils.showLoading();
            
            const updateData = {
                valor_adesao: parseFloat(valor)
            };
            
            const success = await DataManager.updateMeetingStatus(meeting.id, null, updateData);
            
            if (success) {
                Utils.hideModal(DOM.modalAdesao);
                Utils.showNotification('Valor de adesão salvo com sucesso!', 'success');
                this.showMinhasReunioes(); // Recarregar a lista
            }
            
        } catch (error) {
            console.error('Erro ao salvar valor de adesão:', error);
            Utils.showError('Erro ao salvar valor de adesão');
        } finally {
            Utils.hideLoading();
        }
    },
    
    // Mostrar modal para adicionar conta própria
    showContaPropriaModal() {
        const modal = DOM.modalContaPropria;
        
        // Limpar formulário
        document.getElementById('formContaPropria').reset();
        
        // Definir data atual como padrão
        document.getElementById('cpData').value = new Date().toISOString().split('T')[0];
        
        Utils.showModal(modal);
    },
    
    // Salvar conta própria
    async salvarContaPropria(formData) {
        try {
            Utils.showLoading();
            
            const consultorNome = USERS.CONSULTORES[AppState.user.email];
            
            // Criar nova linha na planilha
            const newRow = [
                new Date().toISOString().split('T')[0], // data_contato
                formData.empresa,
                '', // cnpj
                '', // qtd_lojas
                'Conta Própria', // segmento
                '', // uf
                'Conta Própria', // prospeccao
                consultorNome, // nome
                'Consultor', // funcao
                '', // contato
                'Conta Própria', // reuniao
                formData.data_reuniao,
                formData.horario,
                consultorNome, // consultor
                formData.observacoes || '',
                STATUS.REALIZADA, // status_reuniao
                '', // observacao_consultor
                '', // nova_data
                '', // novo_horario
                'Fechado', // status_pos_reuniao
                formData.valor_adesao,
                AppState.user.email // email_de_quem_mandou
            ];
            
            const response = await gapi.client.sheets.spreadsheets.values.append({
                spreadsheetId: CONFIG.SHEET_ID,
                range: 'Sheet1!A:Z',
                valueInputOption: 'USER_ENTERED',
                resource: {
                    values: [newRow]
                }
            });
            
            if (response.result) {
                Utils.hideModal(DOM.modalContaPropria);
                Utils.showNotification('Conta própria adicionada com sucesso!', 'success');
                await DataManager.loadMeetings();
                this.showMinhasReunioes();
            }
            
        } catch (error) {
            console.error('Erro ao salvar conta própria:', error);
            Utils.showError('Erro ao salvar conta própria');
        } finally {
            Utils.hideLoading();
        }
    }
};

// Event Listeners para os novos modais
document.addEventListener('DOMContentLoaded', function() {
    // Modal Gerenciar (Angela)
    const btnCloseGerenciar = document.getElementById('btnCloseGerenciar');
    if (btnCloseGerenciar) {
        btnCloseGerenciar.addEventListener('click', () => Utils.hideModal(DOM.modalGerenciar));
    }
    
    // Modal Transferir
    const btnCloseTransferir = document.getElementById('btnCloseTransferir');
    const btnConfirmTransfer = document.getElementById('btnConfirmTransfer');
    const btnCancelTransfer = document.getElementById('btnCancelTransfer');
    
    if (btnCloseTransferir) {
        btnCloseTransferir.addEventListener('click', () => Utils.hideModal(DOM.modalTransferir));
    }
    if (btnConfirmTransfer) {
        btnConfirmTransfer.addEventListener('click', () => AngelaManager.confirmarTransferencia());
    }
    if (btnCancelTransfer) {
        btnCancelTransfer.addEventListener('click', () => Utils.hideModal(DOM.modalTransferir));
    }
    
    // Modal Adesão
    const btnCloseAdesao = document.getElementById('btnCloseAdesao');
    const btnSalvarAdesao = document.getElementById('btnSalvarAdesao');
    const btnCancelAdesao = document.getElementById('btnCancelAdesao');
    
    if (btnCloseAdesao) {
        btnCloseAdesao.addEventListener('click', () => Utils.hideModal(DOM.modalAdesao));
    }
    if (btnSalvarAdesao) {
        btnSalvarAdesao.addEventListener('click', () => ConsultorManager.salvarAdesao());
    }
    if (btnCancelAdesao) {
        btnCancelAdesao.addEventListener('click', () => Utils.hideModal(DOM.modalAdesao));
    }
    
    // Modal Conta Própria
    const btnCloseContaPropria = document.getElementById('btnCloseContaPropria');
    const btnCancelContaPropria = document.getElementById('btnCancelContaPropria');
    const btnAddContaPropria = document.getElementById('btnAddContaPropria');
    const formContaPropria = document.getElementById('formContaPropria');
    
    if (btnCloseContaPropria) {
        btnCloseContaPropria.addEventListener('click', () => Utils.hideModal(DOM.modalContaPropria));
    }
    if (btnCancelContaPropria) {
        btnCancelContaPropria.addEventListener('click', () => Utils.hideModal(DOM.modalContaPropria));
    }
    if (btnAddContaPropria) {
        btnAddContaPropria.addEventListener('click', () => ConsultorManager.showContaPropriaModal());
    }
    if (formContaPropria) {
        formContaPropria.addEventListener('submit', function(e) {
            e.preventDefault();
            const formData = new FormData(this);
            const data = Object.fromEntries(formData);
            ConsultorManager.salvarContaPropria(data);
        });
    }
});

// Funções globais para serem chamadas pelos botões
window.showGerenciarModal = function(meetingId) {
    AngelaManager.showGerenciarModal(meetingId);
};

window.showMinhasReunioes = function() {
    ConsultorManager.showMinhasReunioes();
};


// Atualização das funções de renderização para incluir as novas funcionalidades
const MeetingRenderer = {
    ...MeetingRenderer,
    
    // Renderizar reuniões para consultores com novas funcionalidades
    renderConsultorReunioes(meetings) {
        const lista = DOM.listaReunioes;
        lista.innerHTML = '';

        if (meetings.length === 0) {
            lista.innerHTML = '<div class="no-meetings">Nenhuma reunião encontrada</div>';
            return;
        }

        meetings.forEach(meeting => {
            const meetingCard = document.createElement('div');
            meetingCard.className = 'meeting-card';
            
            const statusClass = this.getStatusClass(meeting.status_reuniao);
            const isActionable = meeting.status_reuniao === STATUS.AGENDADA || meeting.status_reuniao === STATUS.TRANSFERIDA;
            
            meetingCard.innerHTML = `
                <div class="meeting-header">
                    <div class="meeting-title">
                        <h3>${meeting.empresa}</h3>
                        <span class="meeting-status ${statusClass}">${meeting.status_reuniao || 'Agendada'}</span>
                        ${meeting.status_reuniao === STATUS.TRANSFERIDA ? '<i class="fas fa-exchange-alt transfer-icon" title="Reunião transferida"></i>' : ''}
                    </div>
                    <div class="meeting-date">
                        ${Utils.formatDateBR(meeting.data_reuniao)} às ${meeting.horario}
                    </div>
                </div>
                <div class="meeting-details">
                    <div class="detail-item">
                        <i class="fas fa-phone"></i>
                        <span>Contato: ${meeting.contato}</span>
                    </div>
                    <div class="detail-item">
                        <i class="fas fa-building"></i>
                        <span>Segmento: ${meeting.segmento}</span>
                    </div>
                    ${meeting.consultor_original ? `
                    <div class="detail-item">
                        <i class="fas fa-user-friends"></i>
                        <span>Transferida de: ${meeting.consultor_original}</span>
                    </div>
                    ` : ''}
                </div>
                <div class="meeting-actions">
                    <button class="btn btn-sm btn-outline" onclick="MeetingActions.showDetails(${meeting.id})">
                        <i class="fas fa-info-circle"></i>
                        Ver Detalhes
                    </button>
                    ${isActionable ? `
                    <button class="btn btn-sm btn-primary" onclick="MeetingActions.showConsultorActions(${meeting.id})">
                        <i class="fas fa-tasks"></i>
                        Ações
                    </button>
                    ` : ''}
                </div>
            `;
            
            lista.appendChild(meetingCard);
        });
    }
};

// Atualização das ações de reuniões para consultores
const MeetingActions = {
    ...MeetingActions,
    
    // Mostrar ações específicas do consultor
    showConsultorActions(meetingId) {
        const meeting = AppState.meetings.find(m => m.id == meetingId);
        if (!meeting) return;
        
        AppState.selectedMeeting = meeting;
        
        const modal = DOM.modalAcoes;
        const info = document.getElementById('reuniaoInfo');
        
        info.innerHTML = `
            <div class="meeting-summary">
                <h4>${meeting.empresa}</h4>
                <p><strong>Data:</strong> ${Utils.formatDateBR(meeting.data_reuniao)} às ${meeting.horario}</p>
                <p><strong>Contato:</strong> ${meeting.contato}</p>
                <p><strong>Segmento:</strong> ${meeting.segmento}</p>
                ${meeting.observacoes ? `<p><strong>Observações:</strong> ${meeting.observacoes}</p>` : ''}
            </div>
        `;
        
        Utils.showModal(modal);
    },
    
    // Aceitar reunião
    async aceitarReuniao() {
        const meeting = AppState.selectedMeeting;
        if (!meeting) return;
        
        try {
            Utils.showLoading();
            
            const success = await DataManager.updateMeetingStatus(meeting.id, STATUS.CONFIRMADA);
            
            if (success) {
                Utils.hideModal(DOM.modalAcoes);
                Utils.showNotification('Reunião aceita com sucesso!', 'success');
                await this.reloadCurrentView();
                
                // Mostrar a reunião na seção "Minhas Reuniões"
                ConsultorManager.showMinhasReunioes();
            }
            
        } catch (error) {
            console.error('Erro ao aceitar reunião:', error);
            Utils.showError('Erro ao aceitar reunião');
        } finally {
            Utils.hideLoading();
        }
    },
    
    // Recusar reunião
    async recusarReuniao() {
        const meeting = AppState.selectedMeeting;
        if (!meeting) return;
        
        try {
            Utils.showLoading();
            
            const success = await DataManager.updateMeetingStatus(meeting.id, STATUS.RECUSADA);
            
            if (success) {
                Utils.hideModal(DOM.modalAcoes);
                Utils.showNotification('Reunião recusada. Angela será notificada.', 'info');
                await this.reloadCurrentView();
            }
            
        } catch (error) {
            console.error('Erro ao recusar reunião:', error);
            Utils.showError('Erro ao recusar reunião');
        } finally {
            Utils.hideLoading();
        }
    },
    
    // Sugerir novo horário
    showSugerirModal() {
        Utils.hideModal(DOM.modalAcoes);
        Utils.showModal(DOM.modalSugerir);
        
        // Definir data mínima como hoje
        const hoje = new Date().toISOString().split('T')[0];
        document.getElementById('novaData').min = hoje;
    },
    
    // Enviar sugestão de novo horário
    async enviarSugestao(formData) {
        const meeting = AppState.selectedMeeting;
        if (!meeting) return;
        
        try {
            Utils.showLoading();
            
            const updateData = {
                nova_data: formData.novaData,
                novo_horario: formData.novoHorario,
                observacao_consultor: formData.observacaoSugestao
            };
            
            const success = await DataManager.updateMeetingStatus(meeting.id, STATUS.SUGERIDO, updateData);
            
            if (success) {
                Utils.hideModal(DOM.modalSugerir);
                Utils.showNotification('Sugestão enviada para Angela!', 'success');
                await this.reloadCurrentView();
            }
            
        } catch (error) {
            console.error('Erro ao enviar sugestão:', error);
            Utils.showError('Erro ao enviar sugestão');
        } finally {
            Utils.hideLoading();
        }
    },
    
    async reloadCurrentView() {
        await DataManager.loadMeetings();
        
        if (AppState.currentView === 'angela') {
            MeetingRenderer.renderMeetings('angela');
        } else if (AppState.currentView === 'consultor') {
            const consultorNome = USERS.CONSULTORES[AppState.user.email];
            const consultorMeetings = AppState.meetings.filter(meeting => 
                meeting.consultor && meeting.consultor.includes(consultorNome)
            );
            MeetingRenderer.renderConsultorReunioes(consultorMeetings);
        }
    }
};

// Atualização do ViewManager para incluir a seção "Minhas Reuniões" dos consultores
const ViewManager = {
    ...ViewManager,
    
    setupConsultorView(consultorEmail) {
        const consultorNome = USERS.CONSULTORES[consultorEmail];
        AppState.currentView = 'consultor';
        AppState.currentConsultor = consultorNome;
        
        // Mostrar seções relevantes
        DOM.painelReunioes.classList.remove('hidden');
        DOM.consultorMinhasReunioes.classList.remove('hidden');
        
        // Atualizar títulos
        DOM.painelTitulo.innerHTML = '<i class="fas fa-calendar"></i> Reuniões Atribuídas';
        DOM.painelSubtitulo.textContent = `Reuniões para ${consultorNome}`;
        
        // Filtrar e renderizar reuniões do consultor
        const consultorMeetings = AppState.meetings.filter(meeting => 
            meeting.consultor && meeting.consultor.includes(consultorNome) &&
            (meeting.status_reuniao === STATUS.AGENDADA || meeting.status_reuniao === STATUS.TRANSFERIDA)
        );
        
        MeetingRenderer.renderConsultorReunioes(consultorMeetings);
        
        // Carregar "Minhas Reuniões"
        ConsultorManager.showMinhasReunioes();
    }
};

// Event Listeners adicionais para as novas funcionalidades
document.addEventListener('DOMContentLoaded', function() {
    // Ações do modal de consultor
    const btnAceitar = document.getElementById('btnAceitar');
    const btnRecusar = document.getElementById('btnRecusar');
    const btnSugerir = document.getElementById('btnSugerir');
    
    if (btnAceitar) {
        btnAceitar.addEventListener('click', () => MeetingActions.aceitarReuniao());
    }
    if (btnRecusar) {
        btnRecusar.addEventListener('click', () => MeetingActions.recusarReuniao());
    }
    if (btnSugerir) {
        btnSugerir.addEventListener('click', () => MeetingActions.showSugerirModal());
    }
    
    // Modal de sugerir novo horário
    const formSugerir = document.getElementById('formSugerir');
    const btnCancelSugerir = document.getElementById('btnCancelSugerir');
    const btnCloseSugerir = document.getElementById('btnCloseSugerir');
    
    if (formSugerir) {
        formSugerir.addEventListener('submit', function(e) {
            e.preventDefault();
            const formData = new FormData(this);
            const data = Object.fromEntries(formData);
            MeetingActions.enviarSugestao(data);
        });
    }
    if (btnCancelSugerir) {
        btnCancelSugerir.addEventListener('click', () => Utils.hideModal(DOM.modalSugerir));
    }
    if (btnCloseSugerir) {
        btnCloseSugerir.addEventListener('click', () => Utils.hideModal(DOM.modalSugerir));
    }
});

// Atualização dos elementos DOM para incluir os novos modais
DOM.modalGerenciar = document.getElementById('modalGerenciar');
DOM.modalTransferir = document.getElementById('modalTransferir');
DOM.modalAdesao = document.getElementById('modalAdesao');
DOM.modalContaPropria = document.getElementById('modalContaPropria');
DOM.consultorMinhasReunioes = document.getElementById('consultorMinhasReunioes');


// Funcionalidades específicas para Gerentes (Dashboard)
const DashboardManager = {
    // Inicializar dashboard
    initDashboard() {
        this.setupDateFilters();
        this.loadDashboardData();
        this.setupStatInfoButtons();
    },
    
    // Configurar filtros de data
    setupDateFilters() {
        const hoje = new Date();
        const primeiroDiaMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
        
        document.getElementById('dashStartDate').value = primeiroDiaMes.toISOString().split('T')[0];
        document.getElementById('dashEndDate').value = hoje.toISOString().split('T')[0];
    },
    
    // Carregar dados do dashboard
    async loadDashboardData(startDate = null, endDate = null) {
        try {
            Utils.showLoading();
            
            let filteredMeetings = AppState.meetings;
            
            // Aplicar filtro de data se fornecido
            if (startDate && endDate) {
                filteredMeetings = AppState.meetings.filter(meeting => {
                    const meetingDate = meeting.data_reuniao;
                    return meetingDate >= startDate && meetingDate <= endDate;
                });
            }
            
            // Calcular estatísticas
            const stats = this.calculateStats(filteredMeetings);
            
            // Atualizar cards de estatísticas
            this.updateStatCards(stats);
            
            // Atualizar gráficos
            this.updateCharts(filteredMeetings);
            
        } catch (error) {
            console.error('Erro ao carregar dashboard:', error);
            Utils.showError('Erro ao carregar dados do dashboard');
        } finally {
            Utils.hideLoading();
        }
    },
    
    // Calcular estatísticas
    calculateStats(meetings) {
        const stats = {
            agendadas: 0,
            confirmadas: 0,
            recusadas: 0,
            transferidas: 0,
            sugeridas: 0,
            realizadas: 0,
            contasFechadas: 0,
            valorAdesaoTotal: 0
        };
        
        meetings.forEach(meeting => {
            const status = meeting.status_reuniao || STATUS.AGENDADA;
            const statusPos = meeting.status_pos_reuniao;
            const valorAdesao = parseFloat(meeting.valor_adesao) || 0;
            
            // Contar por status de reunião
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
            
            // Contar contas fechadas e valor de adesão
            if (statusPos === 'Fechado' || valorAdesao > 0) {
                stats.contasFechadas++;
                stats.valorAdesaoTotal += valorAdesao;
            }
        });
        
        return stats;
    },
    
    // Atualizar cards de estatísticas
    updateStatCards(stats) {
        document.getElementById('statAgendadas').textContent = stats.agendadas;
        document.getElementById('statConfirmadas').textContent = stats.confirmadas;
        document.getElementById('statRecusadas').textContent = stats.recusadas;
        document.getElementById('statTransferidas').textContent = stats.transferidas;
        document.getElementById('statSugeridas').textContent = stats.sugeridas;
        document.getElementById('statRealizadas').textContent = stats.realizadas;
        document.getElementById('statContasFechadas').textContent = stats.contasFechadas;
        document.getElementById('statValorAdesao').textContent = `R$ ${stats.valorAdesaoTotal.toFixed(2).replace('.', ',')}`;
    },
    
    // Configurar botões de informações dos cards
    setupStatInfoButtons() {
        const infoButtons = document.querySelectorAll('.stat-info');
        infoButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const statType = e.currentTarget.dataset.stat || e.currentTarget.dataset.statPos;
                this.showStatDetails(statType);
            });
        });
    },
    
    // Mostrar detalhes de uma estatística
    showStatDetails(statType) {
        const modal = document.getElementById('modalDashInfo');
        const content = document.getElementById('dashInfoContent');
        
        let filteredMeetings = [];
        let title = '';
        
        // Filtrar reuniões baseado no tipo de estatística
        switch (statType) {
            case 'Agendada':
                filteredMeetings = AppState.meetings.filter(m => (m.status_reuniao || STATUS.AGENDADA) === STATUS.AGENDADA);
                title = 'Reuniões Agendadas';
                break;
            case 'Confirmada':
                filteredMeetings = AppState.meetings.filter(m => m.status_reuniao === STATUS.CONFIRMADA);
                title = 'Reuniões Confirmadas';
                break;
            case 'Recusada':
                filteredMeetings = AppState.meetings.filter(m => m.status_reuniao === STATUS.RECUSADA);
                title = 'Reuniões Recusadas';
                break;
            case 'Transferida':
                filteredMeetings = AppState.meetings.filter(m => m.status_reuniao === STATUS.TRANSFERIDA);
                title = 'Reuniões Transferidas';
                break;
            case 'Sugerido Novo Horário':
                filteredMeetings = AppState.meetings.filter(m => m.status_reuniao === STATUS.SUGERIDO);
                title = 'Reuniões com Novo Horário Sugerido';
                break;
            case 'Realizada':
                filteredMeetings = AppState.meetings.filter(m => m.status_reuniao === STATUS.REALIZADA);
                title = 'Reuniões Realizadas';
                break;
            case 'Fechado':
                filteredMeetings = AppState.meetings.filter(m => m.status_pos_reuniao === 'Fechado' || parseFloat(m.valor_adesao) > 0);
                title = 'Contas Fechadas';
                break;
            case 'ValorAdesao':
                filteredMeetings = AppState.meetings.filter(m => parseFloat(m.valor_adesao) > 0);
                title = 'Reuniões com Valor de Adesão';
                break;
            default:
                filteredMeetings = [];
                title = 'Detalhes';
        }
        
        // Gerar conteúdo do modal
        content.innerHTML = `
            <h4>${title}</h4>
            <div class="stat-details-list">
                ${filteredMeetings.length === 0 ? 
                    '<p class="no-data">Nenhum registro encontrado</p>' :
                    filteredMeetings.map(meeting => this.createMeetingDetailItem(meeting, statType)).join('')
                }
            </div>
        `;
        
        Utils.showModal(modal);
    },
    
    // Criar item de detalhe da reunião
    createMeetingDetailItem(meeting, statType) {
        const valorAdesao = parseFloat(meeting.valor_adesao) || 0;
        
        return `
            <div class="meeting-detail-item">
                <div class="meeting-detail-header">
                    <h5>${meeting.empresa}</h5>
                    <span class="meeting-detail-date">${Utils.formatDateBR(meeting.data_reuniao)} às ${meeting.horario}</span>
                </div>
                <div class="meeting-detail-info">
                    <span><strong>Consultor:</strong> ${meeting.consultor}</span>
                    <span><strong>Contato:</strong> ${meeting.contato}</span>
                    <span><strong>Segmento:</strong> ${meeting.segmento}</span>
                    ${meeting.status_pos_reuniao ? `<span><strong>Status Pós-Reunião:</strong> ${meeting.status_pos_reuniao}</span>` : ''}
                    ${valorAdesao > 0 ? `<span><strong>Valor de Adesão:</strong> R$ ${valorAdesao.toFixed(2).replace('.', ',')}</span>` : ''}
                    ${meeting.observacao_consultor ? `<span><strong>Observação:</strong> ${meeting.observacao_consultor}</span>` : ''}
                </div>
            </div>
        `;
    },
    
    // Atualizar gráficos
    updateCharts(meetings) {
        this.updateConsultorChart(meetings);
        this.updateStatusChart(meetings);
    },
    
    // Gráfico de reuniões por consultor
    updateConsultorChart(meetings) {
        const ctx = document.getElementById('chartConsultores');
        if (!ctx) return;
        
        // Contar reuniões por consultor
        const consultorData = {};
        meetings.forEach(meeting => {
            const consultor = meeting.consultor || 'Não atribuído';
            consultorData[consultor] = (consultorData[consultor] || 0) + 1;
        });
        
        // Destruir gráfico existente se houver
        if (window.consultorChart) {
            window.consultorChart.destroy();
        }
        
        window.consultorChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: Object.keys(consultorData),
                datasets: [{
                    label: 'Reuniões',
                    data: Object.values(consultorData),
                    backgroundColor: [
                        '#3B82F6',
                        '#10B981',
                        '#F59E0B',
                        '#EF4444',
                        '#8B5CF6'
                    ]
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                }
            }
        });
    },
    
    // Gráfico de status das reuniões
    updateStatusChart(meetings) {
        const ctx = document.getElementById('chartStatus');
        if (!ctx) return;
        
        // Contar reuniões por status
        const statusData = {};
        meetings.forEach(meeting => {
            const status = meeting.status_reuniao || STATUS.AGENDADA;
            statusData[status] = (statusData[status] || 0) + 1;
        });
        
        // Destruir gráfico existente se houver
        if (window.statusChart) {
            window.statusChart.destroy();
        }
        
        window.statusChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: Object.keys(statusData),
                datasets: [{
                    data: Object.values(statusData),
                    backgroundColor: [
                        '#3B82F6', // Agendada
                        '#10B981', // Confirmada
                        '#EF4444', // Recusada
                        '#F59E0B', // Sugerido
                        '#8B5CF6', // Transferida
                        '#6B7280'  // Realizada
                    ]
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    },
    
    // Aplicar filtro de data
    async applyDateFilter() {
        const startDate = document.getElementById('dashStartDate').value;
        const endDate = document.getElementById('dashEndDate').value;
        
        if (!startDate || !endDate) {
            Utils.showError('Selecione as datas inicial e final');
            return;
        }
        
        if (startDate > endDate) {
            Utils.showError('Data inicial não pode ser maior que a data final');
            return;
        }
        
        await this.loadDashboardData(startDate, endDate);
    }
};

// Atualização do ViewManager para incluir o dashboard
const ViewManager = {
    ...ViewManager,
    
    setupDashboardView() {
        AppState.currentView = 'dashboard';
        
        // Mostrar apenas o dashboard
        this.hideAllSections();
        DOM.dashboardGerencial.classList.remove('hidden');
        
        // Inicializar dashboard
        DashboardManager.initDashboard();
    },
    
    hideAllSections() {
        DOM.formAngela.classList.add('hidden');
        DOM.painelReunioes.classList.add('hidden');
        DOM.dashboardGerencial.classList.add('hidden');
        DOM.consultorMinhasReunioes.classList.add('hidden');
    }
};

// Event Listeners para o dashboard
document.addEventListener('DOMContentLoaded', function() {
    // Filtro do dashboard
    const btnDashFilter = document.getElementById('btnDashFilter');
    if (btnDashFilter) {
        btnDashFilter.addEventListener('click', () => DashboardManager.applyDateFilter());
    }
    
    // Modal de detalhes do dashboard
    const btnCloseDashInfo = document.getElementById('btnCloseDashInfo');
    if (btnCloseDashInfo) {
        btnCloseDashInfo.addEventListener('click', () => Utils.hideModal(document.getElementById('modalDashInfo')));
    }
});

// Atualização dos elementos DOM
DOM.dashboardGerencial = document.getElementById('dashboardGerencial');
DOM.modalDashInfo = document.getElementById('modalDashInfo');


// Finalização da implementação de Conta Própria e correções
const ContaPropriaManager = {
    // Validar dados da conta própria
    validateContaPropriaData(data) {
        const errors = [];
        
        if (!data.empresa || data.empresa.trim() === '') {
            errors.push('Nome da empresa é obrigatório');
        }
        
        if (!data.data_reuniao) {
            errors.push('Data da reunião é obrigatória');
        }
        
        if (!data.horario) {
            errors.push('Horário é obrigatório');
        }
        
        if (!data.valor_adesao || parseFloat(data.valor_adesao) <= 0) {
            errors.push('Valor de adesão deve ser maior que zero');
        }
        
        return errors;
    },
    
    // Processar dados da conta própria para inserção na planilha
    processContaPropriaData(formData, consultorEmail) {
        const consultorNome = USERS.CONSULTORES[consultorEmail];
        const hoje = new Date().toISOString().split('T')[0];
        
        return [
            hoje, // data_contato
            formData.empresa,
            '', // cnpj
            '', // qtd_lojas
            'Conta Própria', // segmento
            '', // uf
            'Conta Própria', // prospeccao
            consultorNome, // nome
            'Consultor', // funcao
            '', // contato
            'Conta Própria', // tipo_reuniao
            formData.data_reuniao,
            formData.horario,
            consultorNome, // consultor
            formData.observacoes || '',
            STATUS.REALIZADA, // status_reuniao
            '', // observacao_consultor
            '', // nova_data
            '', // novo_horario
            'Fechado', // status_pos_reuniao
            parseFloat(formData.valor_adesao),
            consultorEmail, // email_de_quem_mandou
            consultorNome // consultor_original (para rastreamento)
        ];
    }
};

// Atualização do ConsultorManager para usar o ContaPropriaManager
ConsultorManager.salvarContaPropria = async function(formData) {
    try {
        // Validar dados
        const errors = ContaPropriaManager.validateContaPropriaData(formData);
        if (errors.length > 0) {
            Utils.showError(errors.join('\n'));
            return;
        }
        
        Utils.showLoading();
        
        // Processar dados
        const newRow = ContaPropriaManager.processContaPropriaData(formData, AppState.user.email);
        
        // Inserir na planilha
        const response = await gapi.client.sheets.spreadsheets.values.append({
            spreadsheetId: CONFIG.SHEET_ID,
            range: 'Sheet1!A:Z',
            valueInputOption: 'USER_ENTERED',
            resource: {
                values: [newRow]
            }
        });
        
        if (response.result) {
            Utils.hideModal(DOM.modalContaPropria);
            Utils.showNotification('Conta própria adicionada com sucesso!', 'success');
            
            // Recarregar dados e atualizar visualizações
            await DataManager.loadMeetings();
            this.showMinhasReunioes();
            
            // Se estiver no dashboard, atualizar também
            if (AppState.currentView === 'dashboard') {
                DashboardManager.loadDashboardData();
            }
        }
        
    } catch (error) {
        console.error('Erro ao salvar conta própria:', error);
        Utils.showError('Erro ao salvar conta própria');
    } finally {
        Utils.hideLoading();
    }
};

// Correções e melhorias no sistema de navegação
const NavigationManager = {
    // Configurar navegação baseada no usuário logado
    setupUserNavigation(userEmail) {
        const selectUser = DOM.selectUser;
        
        // Limpar opções existentes
        selectUser.innerHTML = '<option value="">Selecionar visualização</option>';
        
        // Adicionar opções baseadas no perfil do usuário
        if (userEmail === USERS.ADMIN || USERS.GERENTES.includes(userEmail)) {
            // Admin e gerentes podem ver todas as visualizações
            selectUser.innerHTML += `
                <option value="angela">Angela (Agendamento)</option>
                <option value="glaucia">Glaucia (Consultor)</option>
                <option value="leticia">Leticia (Consultor)</option>
                <option value="marcelo">Marcelo (Consultor)</option>
                <option value="gabriel">Gabriel (Consultor)</option>
                <option value="dashboard">Dashboard Gerencial</option>
            `;
        } else if (Object.keys(USERS.CONSULTORES).includes(userEmail)) {
            // Consultores só veem sua própria visualização
            const consultorNome = USERS.CONSULTORES[userEmail];
            selectUser.innerHTML += `
                <option value="${consultorNome.toLowerCase()}">${consultorNome} (Consultor)</option>
            `;
        } else if (userEmail.toLowerCase().includes('angela')) {
            // Angela só vê sua visualização
            selectUser.innerHTML += `
                <option value="angela">Angela (Agendamento)</option>
            `;
        }
        
        selectUser.classList.remove('hidden');
    },
    
    // Navegar para uma visualização específica
    navigateToView(viewType) {
        ViewManager.hideAllSections();
        
        switch (viewType) {
            case 'angela':
                ViewManager.setupAngelaView();
                break;
            case 'glaucia':
            case 'leticia':
            case 'marcelo':
            case 'gabriel':
                ViewManager.setupConsultorView(this.getConsultorEmail(viewType));
                break;
            case 'dashboard':
                ViewManager.setupDashboardView();
                break;
            default:
                Utils.showError('Visualização não encontrada');
        }
    },
    
    // Obter email do consultor baseado no nome
    getConsultorEmail(consultorName) {
        const emailMap = {
            'glaucia': 'glaucia@exemplo.com',
            'leticia': 'leticia@exemplo.com',
            'marcelo': 'marcelo@exemplo.com',
            'gabriel': 'gabriel@exemplo.com'
        };
        return emailMap[consultorName.toLowerCase()];
    }
};

// Atualização do sistema de inicialização
const AppInitializer = {
    // Inicializar aplicação após login
    async initializeApp(user) {
        try {
            AppState.user = user;
            
            // Configurar navegação
            NavigationManager.setupUserNavigation(user.email);
            
            // Carregar dados
            await DataManager.loadMeetings();
            
            // Configurar visualização inicial baseada no usuário
            this.setupInitialView(user.email);
            
            Utils.showNotification(`Bem-vindo, ${user.name}!`, 'success');
            
        } catch (error) {
            console.error('Erro ao inicializar aplicação:', error);
            Utils.showError('Erro ao carregar dados da aplicação');
        }
    },
    
    // Configurar visualização inicial
    setupInitialView(userEmail) {
        if (userEmail === USERS.ADMIN || USERS.GERENTES.includes(userEmail)) {
            // Gerentes veem o dashboard por padrão
            NavigationManager.navigateToView('dashboard');
            DOM.selectUser.value = 'dashboard';
        } else if (Object.keys(USERS.CONSULTORES).includes(userEmail)) {
            // Consultores veem sua própria visualização
            const consultorNome = USERS.CONSULTORES[userEmail];
            NavigationManager.navigateToView(consultorNome.toLowerCase());
            DOM.selectUser.value = consultorNome.toLowerCase();
        } else if (userEmail.toLowerCase().includes('angela')) {
            // Angela vê sua visualização
            NavigationManager.navigateToView('angela');
            DOM.selectUser.value = 'angela';
        }
    }
};

    // Event Listeners finais e correções
    document.addEventListener("DOMContentLoaded", function() {
        // Navegação por select
        const selectUser = DOM.selectUser;
        if (selectUser) {
            selectUser.addEventListener("change", function() {
                const selectedView = this.value;
                if (selectedView) {
                    NavigationManager.navigateToView(selectedView);
                }
            });
        }

        // Inicializar autenticação Google
        Auth.init();

        // Adicionar event listener para o botão de login
        if (DOM.btnSignIn) {
            DOM.btnSignIn.addEventListener("click", Auth.signIn);
        }
        if (DOM.btnSignOut) {
            DOM.btnSignOut.addEventListener("click", Auth.signOut);
        }
    });

// Funções utilitárias adicionais
const Utils = {
    ...Utils,
    
    // Formatar data para exibição brasileira
    formatDateBR(dateString) {
        if (!dateString) return 'Data não informada';
        
        try {
            const date = new Date(dateString + 'T00:00:00');
            return date.toLocaleDateString('pt-BR');
        } catch (error) {
            return dateString;
        }
    },
    
    // Formatar valor monetário
    formatCurrency(value) {
        if (!value || isNaN(value)) return 'R$ 0,00';
        
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(parseFloat(value));
    },
    
    // Validar email
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
};

// Exportar funções globais necessárias
window.NavigationManager = NavigationManager;
window.DashboardManager = DashboardManager;
window.ContaPropriaManager = ContaPropriaManager;


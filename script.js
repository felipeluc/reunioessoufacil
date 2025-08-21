// Configurações da aplicação
const CONFIG = {
    CLIENT_ID: '689575420157-di4d81kgeo6tnaf70edsi6sii5523sev.apps.googleusercontent.com',
    API_KEY: 'AIzaSyAiU6bMImfPaQLJj8nVO4V0Je67sSyvGTo',
    SHEET_ID: '1-kcIEyUDiBWcGEUKxqotqlpyT-hIta5k3Cx1_mFEUIg',
    SHEET_RANGE: 'Sheet1!A1:Z9999'
};

// Emails de usuários
const USERS = {
    ANGELA: 'angela@soufacil.com',
    CONSULTORES: {
        'glaucia@soufacil.com': 'Glaucia',
        'leticia@soufacil.com': 'Leticia',
        'marcelo@soufacil.com': 'Marcelo',
        'gabriel@soufacil.com': 'Gabriel'
    },
    ADMIN: 'felipe@soufacil.com',
    GERENTES: ['felipe@soufacil.com', 'carol@soufacil.com']
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
    statusFilter: document.getElementById('statusFilter'),
    btnFilter: document.getElementById('btnFilter'),
    
    // Dashboard
    dashboardGerencial: document.getElementById('dashboardGerencial'),
    btnDashFilter: document.getElementById('btnDashFilter'),
    dashStartDate: document.getElementById('dashStartDate'),
    dashEndDate: document.getElementById('dashEndDate'),
    
    // Stats
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
    modalTransferir: document.getElementById('modalTransferir'),
    modalStatusReuniao: document.getElementById('modalStatusReuniao'),
    modalContaPropria: document.getElementById('modalContaPropria'),
    modalDashInfo: document.getElementById('modalDashInfo'),
    
    // Seções específicas
    consultorMinhasReunioes: document.getElementById('consultorMinhasReunioes'),
    angelaGerenciarSugestoes: document.getElementById('angelaGerenciarSugestoes'),
    listaSugestoes: document.getElementById('listaSugestoes'),
    
    // Mensagens
    loadingMsg: document.getElementById('loadingMsg'),
    errorMsg: document.getElementById('errorMsg'),
    successMsg: document.getElementById('successMsg')
};

// Utilitários
const Utils = {
    showLoading() {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) overlay.classList.remove('hidden');
    },
    
    hideLoading() {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) overlay.classList.add('hidden');
    },
    
    showError(message) {
        this.showNotification(message, 'error');
    },
    
    showNotification(message, type = 'info') {
        const notification = document.getElementById('notification');
        if (notification) {
            const content = notification.querySelector('.notification-content');
            const icon = content.querySelector('.notification-icon');
            const messageEl = content.querySelector('.notification-message');
            
            // Definir ícone baseado no tipo
            const icons = {
                success: 'fas fa-check-circle',
                error: 'fas fa-exclamation-circle',
                warning: 'fas fa-exclamation-triangle',
                info: 'fas fa-info-circle'
            };
            
            icon.className = `notification-icon ${icons[type] || icons.info}`;
            messageEl.textContent = message;
            
            // Remover classes de tipo anteriores e adicionar nova
            notification.className = `notification notification-${type}`;
            notification.classList.remove('hidden');
            
            // Auto-hide após 5 segundos
            setTimeout(() => {
                notification.classList.add('hidden');
            }, 5000);
        } else {
            alert(message);
        }
    },
    
    showModal(modal) {
        if (modal) modal.classList.remove('hidden');
    },
    
    hideModal(modal) {
        if (modal) modal.classList.add('hidden');
    },
    
    hideError() {
        if (DOM.errorMsg) DOM.errorMsg.classList.add('hidden');
    },
    
    formatCurrency(value) {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(parseFloat(value) || 0);
    },
    
    formatDateBR(dateString) {
        if (!dateString) return 'Data não informada';
        
        try {
            const date = new Date(dateString + 'T00:00:00');
            return date.toLocaleDateString('pt-BR');
        } catch (error) {
            return dateString;
        }
    },
    
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
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

            console.log('Sistema de autenticação Google inicializado');
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

            // Configurar usuário
            AppState.user = {
                email: userInfo.email,
                name: userInfo.name,
            };

            // Atualizar interface
            DOM.userEmail.textContent = AppState.user.email;
            DOM.btnSignIn.classList.add('hidden');
            DOM.btnSignOut.classList.remove('hidden');

            // Carregar dados e configurar visualização
            await DataManager.loadMeetings();
            this.setupUserView();

            Utils.hideLoading();
            Utils.showNotification("Login realizado com sucesso!", "success");
            console.log("Auth.handleAuthCallback: Login processado com sucesso.");
        } catch (error) {
            console.error("Auth.handleAuthCallback: Erro ao processar autenticação:", error);
            Utils.showError("Erro ao processar login");
            Utils.hideLoading();
        }
    },
    
    setupUserView() {
        console.log("Auth.setupUserView: Iniciando configuração da visualização do usuário.");
        if (!AppState.user) {
            console.log("Auth.setupUserView: AppState.user é nulo, retornando.");
            return;
        }
        
        const email = AppState.user.email.toLowerCase();
        console.log("Auth.setupUserView: Usuário logado - ", email);
        
        // Esconder todas as seções antes de mostrar a correta
        DOM.formAngela.classList.add("hidden");
        DOM.painelReunioes.classList.add("hidden");
        DOM.consultorMinhasReunioes.classList.add("hidden");
        DOM.angelaGerenciarSugestoes.classList.add("hidden");
        DOM.dashboardGerencial.classList.add("hidden");
        DOM.selectUser.classList.add("hidden");

        // Verificar se é Angela
        if (email.includes("angela") || email === USERS.ANGELA) {
            AppState.currentView = "angela";
            console.log("Auth.setupUserView: Usuário é Angela.");
            this.showAngelaView();
        }
        // Verificar se é consultor
        else if (USERS.CONSULTORES[email]) {
            AppState.currentView = "consultor";
            AppState.currentConsultor = USERS.CONSULTORES[email];
            console.log("Auth.setupUserView: Usuário é consultor - ", AppState.currentConsultor);
            this.showConsultorView();
        }
        // Verificar se é gerente/admin
        else if (USERS.GERENTES.includes(email) || email === USERS.ADMIN) {
            AppState.currentView = "admin";
            console.log("Auth.setupUserView: Usuário é admin/gerente.");
            this.showAdminView();
        }
        else {
            Utils.showError("Usuário não autorizado para este sistema");
            console.error("Auth.setupUserView: Usuário não autorizado - ", email);
        }
    },
    
    showAngelaView() {
        console.log("Auth.showAngelaView: Exibindo visualização da Angela.");
        DOM.formAngela.classList.remove("hidden");
        DOM.painelReunioes.classList.remove("hidden");
        DOM.angelaGerenciarSugestoes.classList.remove("hidden");
        DOM.painelTitulo.innerHTML = '<i class="fas fa-calendar"></i> Minhas Reuniões';
        DOM.painelSubtitulo.textContent = 'Reuniões agendadas por você';
        MeetingRenderer.renderMeetings('angela');
        AngelaManager.renderSugestoes();
        console.log("Auth.showAngelaView: Visualização da Angela exibida.");
    },
    
    showConsultorView() {
        console.log("Auth.showConsultorView: Exibindo visualização do consultor.");
        DOM.painelReunioes.classList.remove("hidden");
        DOM.consultorMinhasReunioes.classList.remove("hidden");
        DOM.painelTitulo.innerHTML = `<i class="fas fa-user"></i> Reuniões - ${AppState.currentConsultor}`;
        DOM.painelSubtitulo.textContent = 'Reuniões atribuídas a você';
        MeetingRenderer.renderMeetings('consultor');
        ConsultorManager.showMinhasReunioes();
        console.log("Auth.showConsultorView: Visualização do consultor exibida.");
    },
    
    showAdminView() {
        console.log("Auth.showAdminView: Exibindo visualização do admin.");
        DOM.selectUser.classList.remove("hidden");
        DOM.dashboardGerencial.classList.remove("hidden");
        DashboardManager.init();
        console.log("Auth.showAdminView: Visualização do admin exibida.");
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
        DOM.consultorMinhasReunioes.classList.add('hidden');
        DOM.angelaGerenciarSugestoes.classList.add('hidden');
        DOM.dashboardGerencial.classList.add('hidden');
        DOM.selectUser.classList.add('hidden');
        DOM.listaReunioes.innerHTML = '';
        
        Utils.showNotification('Logout realizado com sucesso!', 'success');
    }
};

// Gerenciamento de dados
const DataManager = {
    async loadMeetings() {
        try {
            if (!AppState.gapiInited) {
                throw new Error('Google Sheets API não inicializada');
            }

            const response = await gapi.client.sheets.spreadsheets.values.get({
                spreadsheetId: CONFIG.SHEET_ID,
                range: CONFIG.SHEET_RANGE,
            });

            const rows = response.result.values;
            if (!rows || rows.length === 0) {
                AppState.meetings = [];
                return;
            }

            // Converter dados da planilha para objetos
            const headers = rows[0];
            AppState.meetings = rows.slice(1).map((row, index) => {
                const meeting = { id: index + 1 };
                headers.forEach((header, i) => {
                    meeting[header] = row[i] || '';
                });
                return meeting;
            });

            console.log('Reuniões carregadas:', AppState.meetings.length);
        } catch (error) {
            console.error('Erro ao carregar reuniões:', error);
            Utils.showError('Erro ao carregar dados da planilha');
        }
    },

    async saveMeeting(meetingData) {
        try {
            if (!AppState.gapiInited) {
                throw new Error('Google Sheets API não inicializada');
            }

            // Adicionar timestamp e ID
            meetingData.id = Date.now();
            meetingData.data_criacao = new Date().toISOString();
            meetingData.status_reuniao = STATUS.AGENDADA;

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
            
            Utils.showNotification('Reunião salva com sucesso!', 'success');
        } catch (error) {
            console.error('Erro ao salvar reunião:', error);
            Utils.showError('Erro ao salvar reunião');
        }
    },

    async updateMeeting(meetingId, updates) {
        try {
            if (!AppState.gapiInited) {
                throw new Error('Google Sheets API não inicializada');
            }

            // Encontrar a reunião
            const meetingIndex = AppState.meetings.findIndex(m => m.id == meetingId);
            if (meetingIndex === -1) {
                throw new Error('Reunião não encontrada');
            }

            // Atualizar dados localmente
            Object.assign(AppState.meetings[meetingIndex], updates);

            // Atualizar na planilha (implementação simplificada)
            // Em uma implementação real, você atualizaria a linha específica
            
            Utils.showNotification('Reunião atualizada com sucesso!', 'success');
        } catch (error) {
            console.error('Erro ao atualizar reunião:', error);
            Utils.showError('Erro ao atualizar reunião');
        }
    },

    async saveContaPropria(contaData) {
        try {
            if (!AppState.gapiInited) {
                throw new Error('Google Sheets API não inicializada');
            }

            // Adicionar à lista local
            contaData.id = Date.now();
            contaData.data_criacao = new Date().toISOString();
            contaData.tipo = 'conta_propria';
            AppState.contasProprias.push(contaData);

            // Salvar na planilha (implementação específica necessária)
            
            Utils.showNotification('Conta própria adicionada com sucesso!', 'success');
        } catch (error) {
            console.error('Erro ao salvar conta própria:', error);
            Utils.showError('Erro ao salvar conta própria');
        }
    }
};

// Renderização de reuniões
const MeetingRenderer = {
    renderMeetings(viewType) {
        console.log("MeetingRenderer.renderMeetings: Iniciando renderização para", viewType);
        
        if (!DOM.listaReunioes) {
            console.error("MeetingRenderer.renderMeetings: Elemento listaReunioes não encontrado");
            return;
        }

        let filteredMeetings = this.filterMeetings(viewType);
        
        DOM.listaReunioes.innerHTML = '';

        if (filteredMeetings.length === 0) {
            DOM.listaReunioes.innerHTML = '<div class="no-meetings">Nenhuma reunião encontrada</div>';
            return;
        }

        filteredMeetings.forEach(meeting => {
            const card = this.createMeetingCard(meeting, viewType);
            DOM.listaReunioes.appendChild(card);
        });
    },

    filterMeetings(viewType) {
        let meetings = AppState.meetings;

        // Filtrar por data se especificado
        const startDate = DOM.startDate?.value;
        const endDate = DOM.endDate?.value;
        const statusFilter = DOM.statusFilter?.value;

        if (startDate || endDate || statusFilter) {
            meetings = meetings.filter(meeting => {
                let include = true;

                if (startDate && meeting.data_reuniao < startDate) {
                    include = false;
                }
                if (endDate && meeting.data_reuniao > endDate) {
                    include = false;
                }
                if (statusFilter && meeting.status_reuniao !== statusFilter) {
                    include = false;
                }

                return include;
            });
        }

        // Filtrar por tipo de visualização
        if (viewType === 'angela') {
            // Angela vê todas as reuniões que ela agendou
            return meetings;
        } else if (viewType === 'consultor') {
            // Consultor vê apenas suas reuniões
            const consultorNome = AppState.currentConsultor;
            return meetings.filter(meeting => 
                meeting.consultor && meeting.consultor.includes(consultorNome)
            );
        }

        return meetings;
    },

    createMeetingCard(meeting, viewType) {
        const card = document.createElement('div');
        card.className = 'meeting-card';
        
        const statusClass = this.getStatusClass(meeting.status_reuniao);
        const needsAttention = meeting.status_reuniao === STATUS.SUGERIDO;
        
        if (needsAttention) {
            card.classList.add('needs-attention');
        }

        card.innerHTML = `
            <div class="meeting-header">
                <div class="meeting-title">
                    <h3>${meeting.empresa}</h3>
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
                    <span>Contato: ${meeting.contato}</span>
                </div>
                <div class="detail-item">
                    <i class="fas fa-building"></i>
                    <span>Segmento: ${meeting.segmento}</span>
                </div>
                <div class="detail-item">
                    <i class="fas fa-user"></i>
                    <span>Consultor: ${meeting.consultor}</span>
                </div>
                ${meeting.status_pos_reuniao ? `
                <div class="detail-item">
                    <i class="fas fa-flag"></i>
                    <span>Status: ${meeting.status_pos_reuniao}</span>
                </div>
                ` : ''}
                ${meeting.valor_adesao ? `
                <div class="detail-item">
                    <i class="fas fa-money-bill"></i>
                    <span>Valor: ${Utils.formatCurrency(meeting.valor_adesao)}</span>
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
    }
};

// Ações de reuniões
const MeetingActions = {
    showDetails(meetingId) {
        const meeting = AppState.meetings.find(m => m.id == meetingId);
        if (!meeting) return;

        AppState.selectedMeeting = meeting;
        
        // Preencher modal com detalhes
        const modal = DOM.modalDetalhes;
        if (modal) {
            const content = modal.querySelector('#detalhesContent');
            if (content) {
                content.innerHTML = `
                    <div class="details-grid">
                        <div class="detail-item">
                            <label>Empresa</label>
                            <span>${meeting.empresa}</span>
                        </div>
                        <div class="detail-item">
                            <label>CNPJ</label>
                            <span>${meeting.cnpj}</span>
                        </div>
                        <div class="detail-item">
                            <label>Contato</label>
                            <span>${meeting.nome} - ${meeting.contato}</span>
                        </div>
                        <div class="detail-item">
                            <label>Função</label>
                            <span>${meeting.funcao}</span>
                        </div>
                        <div class="detail-item">
                            <label>Data da Reunião</label>
                            <span>${Utils.formatDateBR(meeting.data_reuniao)} às ${meeting.horario}</span>
                        </div>
                        <div class="detail-item">
                            <label>Consultor</label>
                            <span>${meeting.consultor}</span>
                        </div>
                        <div class="detail-item">
                            <label>Status</label>
                            <span>${meeting.status_reuniao}</span>
                        </div>
                        <div class="detail-item detail-full">
                            <label>Observações</label>
                            <span>${meeting.observacoes || 'Nenhuma observação'}</span>
                        </div>
                    </div>
                `;
            }
            Utils.showModal(modal);
        }
    },

    showConsultorActions(meetingId) {
        const meeting = AppState.meetings.find(m => m.id == meetingId);
        if (!meeting) return;

        AppState.selectedMeeting = meeting;
        Utils.showModal(DOM.modalAcoes);
    },

    async aceitarReuniao() {
        if (!AppState.selectedMeeting) return;

        try {
            Utils.showLoading();
            
            await DataManager.updateMeeting(AppState.selectedMeeting.id, {
                status_reuniao: STATUS.CONFIRMADA,
                data_confirmacao: new Date().toISOString()
            });
            
            Utils.hideModal(DOM.modalAcoes);
            MeetingRenderer.renderMeetings(AppState.currentView);
            ConsultorManager.showMinhasReunioes();
            
            Utils.showNotification('Reunião aceita com sucesso!', 'success');
        } catch (error) {
            console.error('Erro ao aceitar reunião:', error);
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
            
            Utils.hideModal(DOM.modalAcoes);
            MeetingRenderer.renderMeetings(AppState.currentView);
            
            Utils.showNotification('Reunião recusada', 'success');
        } catch (error) {
            console.error('Erro ao recusar reunião:', error);
            Utils.showError('Erro ao recusar reunião');
        } finally {
            Utils.hideLoading();
        }
    },

    showSugerirModal() {
        Utils.hideModal(DOM.modalAcoes);
        Utils.showModal(DOM.modalSugerir);
        
        // Definir data mínima como hoje
        const hoje = new Date().toISOString().split('T')[0];
        const novaDataInput = document.getElementById('novaData');
        if (novaDataInput) {
            novaDataInput.min = hoje;
        }
    },

    async sugerirNovoHorario() {
        if (!AppState.selectedMeeting) return;

        const novaData = document.getElementById('novaData')?.value;
        const novoHorario = document.getElementById('novoHorario')?.value;
        const observacao = document.getElementById('observacaoSugestao')?.value;

        if (!novaData || !novoHorario) {
            Utils.showError('Por favor, preencha a nova data e horário');
            return;
        }

        try {
            Utils.showLoading();
            
            await DataManager.updateMeeting(AppState.selectedMeeting.id, {
                status_reuniao: STATUS.SUGERIDO,
                nova_data_sugerida: novaData,
                novo_horario_sugerido: novoHorario,
                observacao_sugestao: observacao,
                data_sugestao: new Date().toISOString()
            });
            
            Utils.hideModal(DOM.modalSugerir);
            MeetingRenderer.renderMeetings(AppState.currentView);
            
            Utils.showNotification('Sugestão de novo horário enviada!', 'success');
        } catch (error) {
            console.error('Erro ao sugerir novo horário:', error);
            Utils.showError('Erro ao enviar sugestão');
        } finally {
            Utils.hideLoading();
        }
    }
};

// Gerenciamento específico da Angela
const AngelaManager = {
    renderSugestoes() {
        if (!DOM.listaSugestoes) return;

        const sugestoes = AppState.meetings.filter(meeting => 
            meeting.status_reuniao === STATUS.SUGERIDO
        );

        DOM.listaSugestoes.innerHTML = '';

        if (sugestoes.length === 0) {
            DOM.listaSugestoes.innerHTML = '<div class="no-meetings">Nenhuma sugestão pendente</div>';
            return;
        }

        sugestoes.forEach(meeting => {
            const card = document.createElement('div');
            card.className = 'meeting-card needs-attention';
            
            card.innerHTML = `
                <div class="meeting-header">
                    <div class="meeting-title">
                        <h3>${meeting.empresa}</h3>
                        <span class="meeting-status status-sugerido">Novo Horário Sugerido</span>
                    </div>
                    <div class="meeting-date">
                        Original: ${Utils.formatDateBR(meeting.data_reuniao)} às ${meeting.horario}
                    </div>
                </div>
                <div class="suggestion-info">
                    <strong>Novo horário sugerido:</strong><br>
                    ${Utils.formatDateBR(meeting.nova_data_sugerida)} às ${meeting.novo_horario_sugerido}<br>
                    <em>${meeting.observacao_sugestao || 'Sem observação'}</em>
                </div>
                <div class="meeting-actions">
                    <button class="btn btn-sm btn-success" onclick="AngelaManager.aceitarSugestao(${meeting.id})">
                        <i class="fas fa-check"></i>
                        Aceitar Sugestão
                    </button>
                    <button class="btn btn-sm btn-warning" onclick="AngelaManager.showTransferirModal(${meeting.id})">
                        <i class="fas fa-exchange-alt"></i>
                        Transferir para Outro Consultor
                    </button>
                </div>
            `;
            
            DOM.listaSugestoes.appendChild(card);
        });
    },

    showGerenciarModal(meetingId) {
        const meeting = AppState.meetings.find(m => m.id == meetingId);
        if (!meeting) return;

        AppState.selectedMeeting = meeting;
        
        // Preencher modal com informações da sugestão
        const modal = DOM.modalGerenciar;
        if (modal) {
            const infoDiv = modal.querySelector('#sugestaoInfo');
            if (infoDiv) {
                infoDiv.innerHTML = `
                    <div class="meeting-info">
                        <h4>${meeting.empresa}</h4>
                        <p><strong>Horário original:</strong> ${Utils.formatDateBR(meeting.data_reuniao)} às ${meeting.horario}</p>
                        <p><strong>Novo horário sugerido:</strong> ${Utils.formatDateBR(meeting.nova_data_sugerida)} às ${meeting.novo_horario_sugerido}</p>
                        <p><strong>Observação:</strong> ${meeting.observacao_sugestao || 'Nenhuma observação'}</p>
                    </div>
                `;
            }
            Utils.showModal(modal);
        }
    },

    async aceitarSugestao(meetingId) {
        const meeting = AppState.meetings.find(m => m.id == meetingId);
        if (!meeting) return;

        try {
            Utils.showLoading();
            
            await DataManager.updateMeeting(meeting.id, {
                data_reuniao: meeting.nova_data_sugerida,
                horario: meeting.novo_horario_sugerido,
                status_reuniao: STATUS.AGENDADA,
                data_aceite_sugestao: new Date().toISOString()
            });
            
            Utils.hideModal(DOM.modalGerenciar);
            MeetingRenderer.renderMeetings('angela');
            this.renderSugestoes();
            
            Utils.showNotification('Sugestão aceita e reunião reagendada!', 'success');
        } catch (error) {
            console.error('Erro ao aceitar sugestão:', error);
            Utils.showError('Erro ao aceitar sugestão');
        } finally {
            Utils.hideLoading();
        }
    },

    showTransferirModal(meetingId) {
        const meeting = AppState.meetings.find(m => m.id == meetingId);
        if (!meeting) return;

        AppState.selectedMeeting = meeting;
        
        // Preencher resumo da reunião
        const modal = DOM.modalTransferir;
        if (modal) {
            const form = modal.querySelector('#formTransferir');
            if (form) {
                // Adicionar resumo da reunião antes do formulário
                let summary = form.querySelector('.meeting-summary');
                if (!summary) {
                    summary = document.createElement('div');
                    summary.className = 'meeting-summary';
                    form.insertBefore(summary, form.firstChild);
                }
                
                summary.innerHTML = `
                    <h4>${meeting.empresa}</h4>
                    <p>Data original: ${Utils.formatDateBR(meeting.data_reuniao)} às ${meeting.horario}</p>
                    <p>Consultor atual: ${meeting.consultor}</p>
                `;
            }
            Utils.showModal(modal);
        }
    },

    async transferirReuniao() {
        if (!AppState.selectedMeeting) return;

        const novoConsultor = document.getElementById('novoConsultor')?.value;
        const motivo = document.getElementById('motivoTransferencia')?.value;
        
        if (!novoConsultor) {
            Utils.showError('Por favor, selecione um consultor');
            return;
        }

        try {
            Utils.showLoading();
            
            await DataManager.updateMeeting(AppState.selectedMeeting.id, {
                consultor_original: AppState.selectedMeeting.consultor,
                consultor: novoConsultor,
                status_reuniao: STATUS.TRANSFERIDA,
                motivo_transferencia: motivo,
                data_transferencia: new Date().toISOString()
            });
            
            Utils.hideModal(DOM.modalTransferir);
            MeetingRenderer.renderMeetings('angela');
            this.renderSugestoes();
            
            Utils.showNotification('Reunião transferida com sucesso!', 'success');
        } catch (error) {
            console.error('Erro ao transferir reunião:', error);
            Utils.showError('Erro ao transferir reunião');
        } finally {
            Utils.hideLoading();
        }
    }
};

// Gerenciamento específico do Consultor
const ConsultorManager = {
    showMinhasReunioes() {
        if (!AppState.currentConsultor) return;
        
        const consultorNome = AppState.currentConsultor;
        const minhasReunioes = AppState.meetings.filter(meeting => 
            meeting.consultor && meeting.consultor.includes(consultorNome) &&
            meeting.status_reuniao === STATUS.CONFIRMADA
        );
        
        // Renderizar na seção específica
        this.renderMinhasReunioes(minhasReunioes);
    },

    renderMinhasReunioes(meetings) {
        const container = DOM.consultorMinhasReunioes;
        if (!container) return;

        let lista = container.querySelector('.minhas-reunioes-lista');
        if (!lista) {
            lista = document.createElement('div');
            lista.className = 'minhas-reunioes-lista';
            container.appendChild(lista);
        }

        lista.innerHTML = '';

        if (meetings.length === 0) {
            lista.innerHTML = '<div class="no-meetings">Nenhuma reunião confirmada</div>';
            return;
        }

        meetings.forEach(meeting => {
            const card = document.createElement('div');
            card.className = 'meeting-card minha-reuniao';
            
            card.innerHTML = `
                <div class="meeting-header">
                    <div class="meeting-title">
                        <h3>${meeting.empresa}</h3>
                        <span class="meeting-status status-confirmada">Confirmada</span>
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
                    ${meeting.status_pos_reuniao ? `
                    <div class="detail-item">
                        <i class="fas fa-flag"></i>
                        <span>Status: ${meeting.status_pos_reuniao}</span>
                    </div>
                    ` : ''}
                    ${meeting.valor_adesao ? `
                    <div class="detail-item">
                        <i class="fas fa-money-bill"></i>
                        <span>Valor: ${Utils.formatCurrency(meeting.valor_adesao)}</span>
                    </div>
                    ` : ''}
                </div>
                <div class="meeting-actions">
                    <button class="btn btn-sm btn-primary" onclick="ConsultorManager.showStatusModal(${meeting.id})">
                        <i class="fas fa-edit"></i>
                        Atualizar Status
                    </button>
                </div>
            `;
            
            lista.appendChild(card);
        });
    },

    showStatusModal(meetingId) {
        const meeting = AppState.meetings.find(m => m.id == meetingId);
        if (!meeting) return;

        AppState.selectedMeeting = meeting;
        
        // Configurar evento para mostrar/esconder campo de valor
        const statusSelect = document.getElementById('statusPosReuniao');
        const valorGroup = document.getElementById('valorAdesaoGroup');
        
        if (statusSelect && valorGroup) {
            statusSelect.addEventListener('change', function() {
                if (this.value === STATUS_POS_REUNIAO.FECHADO) {
                    valorGroup.style.display = 'block';
                } else {
                    valorGroup.style.display = 'none';
                }
            });
        }
        
        Utils.showModal(DOM.modalStatusReuniao);
    },

    async atualizarStatusReuniao() {
        if (!AppState.selectedMeeting) return;

        const status = document.getElementById('statusPosReuniao')?.value;
        const valorAdesao = document.getElementById('valorAdesaoReuniao')?.value;
        const observacao = document.getElementById('observacaoStatus')?.value;

        if (!status) {
            Utils.showError('Por favor, selecione um status');
            return;
        }

        try {
            Utils.showLoading();
            
            const updates = {
                status_pos_reuniao: status,
                observacao_status: observacao,
                data_atualizacao_status: new Date().toISOString()
            };

            if (status === STATUS_POS_REUNIAO.FECHADO && valorAdesao) {
                updates.valor_adesao = parseFloat(valorAdesao);
            }
            
            await DataManager.updateMeeting(AppState.selectedMeeting.id, updates);
            
            Utils.hideModal(DOM.modalStatusReuniao);
            this.showMinhasReunioes();
            
            Utils.showNotification('Status atualizado com sucesso!', 'success');
        } catch (error) {
            console.error('Erro ao atualizar status:', error);
            Utils.showError('Erro ao atualizar status');
        } finally {
            Utils.hideLoading();
        }
    },

    showContaPropriaModal() {
        Utils.showModal(DOM.modalContaPropria);
    },

    async adicionarContaPropria() {
        const empresa = document.getElementById('cpEmpresa')?.value;
        const data = document.getElementById('cpData')?.value;
        const horario = document.getElementById('cpHorario')?.value;
        const valor = document.getElementById('cpValor')?.value;
        const observacoes = document.getElementById('cpObservacoes')?.value;

        if (!empresa || !data || !horario || !valor) {
            Utils.showError('Por favor, preencha todos os campos obrigatórios');
            return;
        }

        try {
            Utils.showLoading();
            
            const contaPropria = {
                consultor: AppState.currentConsultor,
                empresa: empresa,
                data_reuniao: data,
                horario: horario,
                valor_adesao: parseFloat(valor),
                observacoes: observacoes,
                status_pos_reuniao: STATUS_POS_REUNIAO.FECHADO
            };

            await DataManager.saveContaPropria(contaPropria);
            
            // Limpar formulário
            document.getElementById('formContaPropria').reset();
            
            Utils.hideModal(DOM.modalContaPropria);
            Utils.showNotification('Conta própria adicionada com sucesso!', 'success');
        } catch (error) {
            console.error('Erro ao adicionar conta própria:', error);
            Utils.showError('Erro ao adicionar conta própria');
        } finally {
            Utils.hideLoading();
        }
    }
};

// Gerenciamento do Dashboard
const DashboardManager = {
    init() {
        this.setupDateFilters();
        this.loadDashboardData();
        this.setupEventListeners();
    },

    setupDateFilters() {
        const hoje = new Date();
        const primeiroDiaMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
        
        if (DOM.dashStartDate) {
            DOM.dashStartDate.value = primeiroDiaMes.toISOString().split('T')[0];
        }
        if (DOM.dashEndDate) {
            DOM.dashEndDate.value = hoje.toISOString().split('T')[0];
        }
    },

    setupEventListeners() {
        if (DOM.btnDashFilter) {
            DOM.btnDashFilter.addEventListener('click', () => {
                this.loadDashboardData();
            });
        }

        // Event listeners para botões de informação
        document.querySelectorAll('.stat-info').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const stat = e.target.closest('.stat-info').dataset.stat;
                const statPos = e.target.closest('.stat-info').dataset.statPos;
                this.showStatInfo(stat || statPos);
            });
        });
    },

    async loadDashboardData() {
        try {
            Utils.showLoading();
            
            // Filtrar reuniões por data se especificado
            let meetings = AppState.meetings;
            const startDate = DOM.dashStartDate?.value;
            const endDate = DOM.dashEndDate?.value;

            if (startDate || endDate) {
                meetings = meetings.filter(meeting => {
                    if (startDate && meeting.data_reuniao < startDate) return false;
                    if (endDate && meeting.data_reuniao > endDate) return false;
                    return true;
                });
            }

            const stats = this.calculateStats(meetings);
            this.updateStatsDisplay(stats);
            this.updateCharts(meetings);
            
            Utils.hideLoading();
        } catch (error) {
            console.error('Erro ao carregar dashboard:', error);
            Utils.showError('Erro ao carregar dados do dashboard');
            Utils.hideLoading();
        }
    },

    calculateStats(meetings) {
        const stats = {
            agendadas: 0,
            confirmadas: 0,
            recusadas: 0,
            transferidas: 0,
            sugeridas: 0,
            realizadas: 0,
            contasFechadas: 0,
            valorAdesao: 0
        };

        meetings.forEach(meeting => {
            switch (meeting.status_reuniao) {
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

            if (meeting.status_pos_reuniao === STATUS_POS_REUNIAO.FECHADO) {
                stats.contasFechadas++;
                if (meeting.valor_adesao) {
                    stats.valorAdesao += parseFloat(meeting.valor_adesao);
                }
            }
        });

        // Adicionar contas próprias
        AppState.contasProprias.forEach(conta => {
            stats.contasFechadas++;
            stats.valorAdesao += parseFloat(conta.valor_adesao || conta.valor || 0);
        });

        return stats;
    },

    updateStatsDisplay(stats) {
        if (DOM.statAgendadas) DOM.statAgendadas.textContent = stats.agendadas;
        if (DOM.statConfirmadas) DOM.statConfirmadas.textContent = stats.confirmadas;
        if (DOM.statRecusadas) DOM.statRecusadas.textContent = stats.recusadas;
        if (DOM.statTransferidas) DOM.statTransferidas.textContent = stats.transferidas;
        if (DOM.statSugeridas) DOM.statSugeridas.textContent = stats.sugeridas;
        if (DOM.statRealizadas) DOM.statRealizadas.textContent = stats.realizadas;
        if (DOM.statContasFechadas) DOM.statContasFechadas.textContent = stats.contasFechadas;
        if (DOM.statValorAdesao) DOM.statValorAdesao.textContent = Utils.formatCurrency(stats.valorAdesao);
    },

    updateCharts(meetings) {
        // Implementar gráficos com Chart.js
        // Esta é uma implementação básica
        console.log('Atualizando gráficos com', meetings.length, 'reuniões');
    },

    showStatInfo(stat) {
        // Mostrar modal com informações detalhadas da estatística
        const modal = DOM.modalDashInfo;
        if (modal) {
            const content = modal.querySelector('#dashInfoContent');
            if (content) {
                let filteredMeetings = [];
                let title = '';

                if (stat === 'Fechado') {
                    // Mostrar reuniões fechadas + contas próprias
                    filteredMeetings = AppState.meetings.filter(m => 
                        m.status_pos_reuniao === STATUS_POS_REUNIAO.FECHADO
                    );
                    title = 'Contas Fechadas';
                } else if (stat === 'ValorAdesao') {
                    // Mostrar todas as reuniões com valor de adesão
                    filteredMeetings = AppState.meetings.filter(m => 
                        m.valor_adesao && parseFloat(m.valor_adesao) > 0
                    );
                    title = 'Reuniões com Valor de Adesão';
                } else {
                    // Filtrar por status
                    filteredMeetings = AppState.meetings.filter(m => 
                        m.status_reuniao === stat
                    );
                    title = `Reuniões - ${stat}`;
                }

                content.innerHTML = `
                    <h4>${title}</h4>
                    <div class="stat-details-list">
                        ${filteredMeetings.length === 0 ? 
                            '<p class="no-data">Nenhum registro encontrado</p>' :
                            filteredMeetings.map(meeting => `
                                <div class="meeting-detail-item">
                                    <div class="meeting-detail-header">
                                        <h5>${meeting.empresa}</h5>
                                        <span class="meeting-detail-date">${Utils.formatDateBR(meeting.data_reuniao)}</span>
                                    </div>
                                    <div class="meeting-detail-info">
                                        <span>Consultor: ${meeting.consultor}</span>
                                        <span>Contato: ${meeting.contato}</span>
                                        ${meeting.valor_adesao ? `<span>Valor: ${Utils.formatCurrency(meeting.valor_adesao)}</span>` : ''}
                                    </div>
                                </div>
                            `).join('')
                        }
                        ${stat === 'Fechado' && AppState.contasProprias.length > 0 ? `
                            <h5 style="margin-top: 20px;">Contas Próprias</h5>
                            ${AppState.contasProprias.map(conta => `
                                <div class="meeting-detail-item">
                                    <div class="meeting-detail-header">
                                        <h5>${conta.empresa}</h5>
                                        <span class="meeting-detail-date">${Utils.formatDateBR(conta.data_reuniao)}</span>
                                    </div>
                                    <div class="meeting-detail-info">
                                        <span>Consultor: ${conta.consultor}</span>
                                        <span>Valor: ${Utils.formatCurrency(conta.valor_adesao || conta.valor)}</span>
                                    </div>
                                </div>
                            `).join('')}
                        ` : ''}
                    </div>
                `;
            }
            Utils.showModal(modal);
        }
    }
};

// Inicialização do sistema
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Inicializando sistema...');
    
    // Configurar event listeners
    if (DOM.btnSignIn) {
        DOM.btnSignIn.addEventListener('click', () => Auth.signIn());
    }
    
    if (DOM.btnSignOut) {
        DOM.btnSignOut.addEventListener('click', () => Auth.signOut());
    }
    
    // Event listeners para formulários e modais
    setupFormEventListeners();
    setupModalEventListeners();
    
    // Inicializar autenticação
    console.log('🔐 Inicializando autenticação...');
    Auth.init().then(() => {
        console.log('✅ Sistema inicializado com sucesso');
    }).catch(error => {
        console.error('❌ Erro na inicialização:', error);
    });
});

function setupFormEventListeners() {
    // Event listeners para formulários
    if (DOM.btnSalvar) {
        DOM.btnSalvar.addEventListener('click', async () => {
            const formData = new FormData(DOM.formAgendamento);
            const meetingData = Object.fromEntries(formData);
            await DataManager.saveMeeting(meetingData);
        });
    }

    if (DOM.btnClear) {
        DOM.btnClear.addEventListener('click', () => {
            DOM.formAgendamento.reset();
        });
    }

    if (DOM.btnFilter) {
        DOM.btnFilter.addEventListener('click', () => {
            MeetingRenderer.renderMeetings(AppState.currentView);
        });
    }

    // Event listeners para modais
    if (document.getElementById('btnAceitar')) {
        document.getElementById('btnAceitar').addEventListener('click', MeetingActions.aceitarReuniao);
    }
    
    if (document.getElementById('btnRecusar')) {
        document.getElementById('btnRecusar').addEventListener('click', MeetingActions.recusarReuniao);
    }
    
    if (document.getElementById('btnSugerir')) {
        document.getElementById('btnSugerir').addEventListener('click', MeetingActions.showSugerirModal);
    }
    
    if (document.getElementById('btnConfirmarSugestao')) {
        document.getElementById('btnConfirmarSugestao').addEventListener('click', MeetingActions.sugerirNovoHorario);
    }
    
    if (document.getElementById('btnAceitarSugestao')) {
        document.getElementById('btnAceitarSugestao').addEventListener('click', () => {
            AngelaManager.aceitarSugestao(AppState.selectedMeeting.id);
        });
    }
    
    if (document.getElementById('btnTransferirReuniao')) {
        document.getElementById('btnTransferirReuniao').addEventListener('click', () => {
            AngelaManager.showTransferirModal(AppState.selectedMeeting.id);
        });
    }
    
    if (document.getElementById('btnConfirmarTransferencia')) {
        document.getElementById('btnConfirmarTransferencia').addEventListener('click', AngelaManager.transferirReuniao);
    }
    
    if (document.getElementById('btnSalvarStatus')) {
        document.getElementById('btnSalvarStatus').addEventListener('click', ConsultorManager.atualizarStatusReuniao);
    }
    
    if (document.getElementById('btnAddContaPropria')) {
        document.getElementById('btnAddContaPropria').addEventListener('click', ConsultorManager.showContaPropriaModal);
    }
    
    if (document.getElementById('btnSalvarContaPropria')) {
        document.getElementById('btnSalvarContaPropria').addEventListener('click', ConsultorManager.adicionarContaPropria);
    }
}

function setupModalEventListeners() {
    // Event listeners para fechar modais
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('btn-close') || e.target.classList.contains('modal')) {
            const modal = e.target.closest('.modal');
            if (modal) {
                Utils.hideModal(modal);
            }
        }
        
        // Fechar modal clicando fora do conteúdo
        if (e.target.classList.contains('modal')) {
            Utils.hideModal(e.target);
        }
    });

    // Event listeners para botões de cancelar
    const cancelButtons = [
        'btnCancelarSugestao',
        'btnCancelarTransferencia', 
        'btnCancelarStatus',
        'btnCancelContaPropria'
    ];

    cancelButtons.forEach(btnId => {
        const btn = document.getElementById(btnId);
        if (btn) {
            btn.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal');
                if (modal) Utils.hideModal(modal);
            });
        }
    });
}

// Exportar funções globais necessárias
window.MeetingActions = MeetingActions;
window.AngelaManager = AngelaManager;
window.ConsultorManager = ConsultorManager;
window.DashboardManager = DashboardManager;


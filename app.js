// app.js - Lógica principal de la aplicación

class ChampionsPorraApp {
    constructor() {
        this.data = {
            matches: [],
            participants: [],
            predictions: {},
            initialClas: [],
            teams: [],
            rules: {}
        };
        this.editedMatches = new Map(); // Map<matchId, {homeGoals, awayGoals}>
        this.isAdmin = false;
        this.init();
    }

    async init() {
        await this.loadData();
        this.setupEventListeners();
        this.checkAdminStatus();
        this.updateTabVisibility();
        this.renderLeagueTab();
        this.setupValidation();
    }

    async loadData() {
        try {
            for (const [key, path] of Object.entries(CONFIG.DATA_PATHS)) {
                const response = await fetch(path);
                if (!response.ok) throw new Error(`Error loading ${path}`);
                this.data[key] = await response.json();
            }
            console.log('Datos cargados exitosamente');
        } catch (error) {
            console.error('Error cargando datos:', error);
            alert('Error al cargar los datos. Verifica la consola.');
        }
    }

    setupEventListeners() {
        // Tabs
        document.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
        });

        // Admin toggle
        document.getElementById('admin-toggle').addEventListener('click', () => this.showAdminModal());
        document.getElementById('logout-btn').addEventListener('click', () => this.logoutAdmin());
        document.getElementById('modal-confirm').addEventListener('click', () => this.verifyAdminPin());
        document.getElementById('modal-cancel').addEventListener('click', () => this.hideAdminModal());
        document.getElementById('admin-pin').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.verifyAdminPin();
        });

        // Filtros y botones
        document.getElementById('matchday-filter').addEventListener('change', () => this.renderLeagueTab());
        document.getElementById('save-btn').addEventListener('click', () => this.saveChanges());
        document.getElementById('restore-btn').addEventListener('click', () => this.restoreExcel());
        document.getElementById('export-btn').addEventListener('click', () => this.exportBackup());
        document.getElementById('import-btn').addEventListener('click', () => document.getElementById('file-input').click());
        document.getElementById('file-input').addEventListener('change', (e) => this.importBackup(e));
    }

    switchTab(tabName) {
        if (tabName === 'pronosticos') {
            // Redirigir a la vista externa
            window.location.href = 'https://guille93.github.io/predictions-viewer/';
            return;
        }

        // Solo admin puede ver la pestaña League
        if (tabName === 'league' && !this.isAdmin) {
            alert('Solo el administrador puede acceder a la pestaña League.');
            // Cambiar a la pestaña de clasificación
            this.forceSwitchToTab('clasificacion');
            return;
        }

        document.querySelectorAll('.tab, .tab-content').forEach(el => el.classList.remove('active'));
        document.querySelector(`.tab[data-tab="${tabName}"]`).classList.add('active');
        document.getElementById(`${tabName}-tab`).classList.add('active');

        switch (tabName) {
            case 'league':
                this.renderLeagueTab();
                break;
            case 'clasificacion':
                this.renderClasificacionTab();
                break;
        }
    }

    forceSwitchToTab(tabName) {
        document.querySelectorAll('.tab, .tab-content').forEach(el => el.classList.remove('active'));
        document.querySelector(`.tab[data-tab="${tabName}"]`).classList.add('active');
        document.getElementById(`${tabName}-tab`).classList.add('active');
        this.renderClasificacionTab();
    }

    updateTabVisibility() {
        const leagueTabBtn = document.getElementById('league-tab-btn');
        if (this.isAdmin) {
            leagueTabBtn.style.display = 'inline-block';
        } else {
            leagueTabBtn.style.display = 'none';
            // Si la pestaña activa es league, cambiar a clasificacion
            if (document.querySelector('.tab.active').dataset.tab === 'league') {
                this.forceSwitchToTab('clasificacion');
            }
        }
    }

    renderLeagueTab() {
        const matchday = document.getElementById('matchday-filter').value;
        let filteredMatches = this.data.matches;
        if (matchday !== 'all') {
            filteredMatches = this.data.matches.filter(m => m.matchday == matchday);
        }

        // Renderizar lista de partidos
        let matchesHTML = `
            <div class="match-item header">
                <div>Jor.</div>
                <div>Fecha</div>
                <div>Local</div>
                <div>Goles L</div>
                <div>Goles V</div>
                <div>Visitante</div>
                <div>Estado</div>
                <div>Editado</div>
            </div>
        `;

        filteredMatches.forEach(match => {
            const isEdited = this.editedMatches.has(match.id);
            const editedData = isEdited ? this.editedMatches.get(match.id) : null;
            const homeGoals = editedData ? editedData.homeGoals : match.homeGoals;
            const awayGoals = editedData ? editedData.awayGoals : match.awayGoals;
            const isPlayed = homeGoals !== null && awayGoals !== null;
            const status = isPlayed ? 'Jugado' : 'Pendiente';
            const sign = this.calculateMatchSign(homeGoals, awayGoals);

            matchesHTML += `
                <div class="match-item ${isEdited ? 'edited' : ''}" data-match-id="${match.id}">
                    <div>J${match.matchday}</div>
                    <div>${new Date(match.datetime).toLocaleDateString('es-ES')}</div>
                    <div>${match.home}</div>
                    <div><input type="number" min="0" value="${homeGoals !== null ? homeGoals : ''}" 
                           ${this.isAdmin ? '' : 'disabled'} class="goal-input" data-team="home"></div>
                    <div><input type="number" min="0" value="${awayGoals !== null ? awayGoals : ''}" 
                           ${this.isAdmin ? '' : 'disabled'} class="goal-input" data-team="away"></div>
                    <div>${match.away}</div>
                    <div>${status} ${sign ? '(' + sign + ')' : ''}</div>
                    <div>${isEdited ? '✓' : ''}</div>
                </div>
            `;
        });

        document.getElementById('matches-list').innerHTML = matchesHTML;

        // Añadir event listeners a los inputs si es admin
        if (this.isAdmin) {
            document.querySelectorAll('.goal-input').forEach(input => {
                input.addEventListener('change', (e) => this.handleGoalChange(e));
            });
        }

        // Renderizar clasificación de equipos
        this.renderStandings();
    }

    handleGoalChange(event) {
        const input = event.target;
        const matchItem = input.closest('.match-item');
        const matchId = matchItem.dataset.matchId;
        const team = input.dataset.team;
        const value = input.value === '' ? null : parseInt(input.value);

        if (!this.editedMatches.has(matchId)) {
            this.editedMatches.set(matchId, { homeGoals: null, awayGoals: null });
        }
        const editedData = this.editedMatches.get(matchId);
        editedData[team === 'home' ? 'homeGoals' : 'awayGoals'] = value;

        matchItem.classList.add('edited');
        matchItem.querySelector('div:nth-child(8)').textContent = '✓';

        // Recalcular todo
        this.recalculateAll();
    }

    renderStandings() {
        // Calcular standings desde los partidos editados
        const standings = this.calculateTeamStandings();
        let standingsHTML = `
            <table class="table standings-table">
                <thead>
                    <tr>
                        <th>Pos</th>
                        <th>Equipo</th>
                        <th>Pts</th>
                        <th>J</th>
                        <th>G</th>
                        <th>E</th>
                        <th>P</th>
                        <th>GF</th>
                        <th>GC</th>
                        <th>DG</th>
                    </tr>
                </thead>
                <tbody>
        `;

        standings.forEach((team, index) => {
            standingsHTML += `
                <tr>
                    <td>${index + 1}</td>
                    <td>${team.name}</td>
                    <td>${team.points}</td>
                    <td>${team.played}</td>
                    <td>${team.wins}</td>
                    <td>${team.draws}</td>
                    <td>${team.losses}</td>
                    <td>${team.goalsFor}</td>
                    <td>${team.goalsAgainst}</td>
                    <td>${team.goalDifference}</td>
                </tr>
            `;
        });

        standingsHTML += '</tbody></table>';
        document.getElementById('standings-table').innerHTML = standingsHTML;
    }

    calculateTeamStandings() {
        // Implementar cálculo de clasificación de equipos
        const teamsMap = {};
        this.data.teams.forEach(team => {
            teamsMap[team.team] = {
                name: team.team,
                points: 0,
                played: 0,
                wins: 0,
                draws: 0,
                losses: 0,
                goalsFor: 0,
                goalsAgainst: 0,
                goalDifference: 0,
                awayGoals: 0,
                awayWins: 0
            };
        });

        this.data.matches.forEach(match => {
            const edited = this.editedMatches.get(match.id);
            const homeGoals = edited ? edited.homeGoals : match.homeGoals;
            const awayGoals = edited ? edited.awayGoals : match.awayGoals;
            if (homeGoals === null || awayGoals === null) return;

            const homeTeam = teamsMap[match.home];
            const awayTeam = teamsMap[match.away];
            if (!homeTeam || !awayTeam) return;

            homeTeam.played++;
            awayTeam.played++;
            homeTeam.goalsFor += homeGoals;
            homeTeam.goalsAgainst += awayGoals;
            awayTeam.goalsFor += awayGoals;
            awayTeam.goalsAgainst += homeGoals;
            awayTeam.awayGoals += awayGoals;

            if (homeGoals > awayGoals) {
                homeTeam.points += 3;
                homeTeam.wins++;
                awayTeam.losses++;
            } else if (homeGoals < awayGoals) {
                awayTeam.points += 3;
                awayTeam.wins++;
                awayTeam.awayWins++;
                homeTeam.losses++;
            } else {
                homeTeam.points += 1;
                awayTeam.points += 1;
                homeTeam.draws++;
                awayTeam.draws++;
            }
        });

        // Calcular diferencia de goles
        Object.values(teamsMap).forEach(team => {
            team.goalDifference = team.goalsFor - team.goalsAgainst;
        });

        // Ordenar según criterios
        const standings = Object.values(teamsMap);
        standings.sort((a, b) => {
            if (a.points !== b.points) return b.points - a.points;
            if (a.goalDifference !== b.goalDifference) return b.goalDifference - a.goalDifference;
            if (a.goalsFor !== b.goalsFor) return b.goalsFor - a.goalsFor;
            if (a.awayGoals !== b.awayGoals) return b.awayGoals - a.awayGoals;
            if (a.wins !== b.wins) return b.wins - a.wins;
            if (a.awayWins !== b.awayWins) return b.awayWins - a.awayWins;
            return a.name.localeCompare(b.name);
        });

        return standings;
    }

    renderClasificacionTab() {
        // Renderizar clasificación de participantes
        const ranking = this.calculateParticipantRanking();
        let clasHTML = `
            <table class="table clas-table">
                <thead>
                    <tr>
                        <th>Pos</th>
                        <th>Jugador</th>
                        <th>Puntos Totales</th>
                        <th>Aciertos Exactos</th>
                        <th>Aciertos Signo</th>
                        <th>Partidos Jugados</th>
                    </tr>
                </thead>
                <tbody>
        `;

        ranking.forEach(player => {
            clasHTML += `
                <tr>
                    <td>${player.position}</td>
                    <td>${player.name}</td>
                    <td>${player.totalPoints}</td>
                    <td>${player.exactHits}</td>
                    <td>${player.signHits}</td>
                    <td>${player.playedMatches}</td>
                </tr>
            `;
        });

        clasHTML += '</tbody></table>';
        document.getElementById('clas-table').innerHTML = clasHTML;

        // Renderizar estadísticas
        this.renderStatistics(ranking);

        // Validación
        this.validateData(ranking);
    }

    calculateParticipantRanking() {
        const participants = this.data.participants;
        const predictions = this.data.predictions;
        const stats = participants.map(name => ({
            name,
            totalPoints: 0,
            exactHits: 0,
            signHits: 0,
            playedMatches: 0
        }));

        this.data.matches.forEach(match => {
            const edited = this.editedMatches.get(match.id);
            const homeGoals = edited ? edited.homeGoals : match.homeGoals;
            const awayGoals = edited ? edited.awayGoals : match.awayGoals;
            const isPlayed = homeGoals !== null && awayGoals !== null;
            if (!isPlayed) return;

            const realSign = this.calculateMatchSign(homeGoals, awayGoals);
            stats.forEach(stat => {
                const pred = predictions[stat.name] && predictions[stat.name][match.id];
                if (!pred || pred.predHome === null) return;
                const points = this.calculatePointsForPredictionMatch(homeGoals, awayGoals, pred);
                stat.totalPoints += points;
                stat.playedMatches++;
                if (points === 5) stat.exactHits++;
                else if (points === 2) stat.signHits++;
            });
        });

        // Ordenar por puntos totales
        stats.sort((a, b) => b.totalPoints - a.totalPoints);
        // Asignar posiciones con empates
        let pos = 1;
        for (let i = 0; i < stats.length; i++) {
            if (i > 0 && stats[i].totalPoints !== stats[i-1].totalPoints) {
                pos = i + 1;
            }
            stats[i].position = pos;
        }

        return stats;
    }

    calculatePointsForPredictionMatch(homeGoals, awayGoals, prediction) {
        if (prediction.predHome === null) return 0;
        const predSign = this.calculateMatchSign(prediction.predHome, prediction.predAway);
        const realSign = this.calculateMatchSign(homeGoals, awayGoals);
        let points = 0;
        if (predSign === realSign) points += CONFIG.SCORING_RULES.signo;
        if (prediction.predHome === homeGoals && prediction.predAway === awayGoals) points += CONFIG.SCORING_RULES.exacto;
        return points;
    }

    renderStatistics(ranking) {
        // Calcular estadísticas variadas
        const mostExact = ranking.reduce((a, b) => a.exactHits > b.exactHits ? a : b);
        const mostSign = ranking.reduce((a, b) => a.signHits > b.signHits ? a : b);
        const bestStreak = this.calculateBestStreak(); // Implementar si es posible
        
        let statsHTML = `
            <table class="table stats-table">
                <thead>
                    <tr>
                        <th>Estadística</th>
                        <th>Valor</th>
                        <th>Jugador</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>Más aciertos exactos</td>
                        <td>${mostExact.exactHits}</td>
                        <td>${mostExact.name}</td>
                    </tr>
                    <tr>
                        <td>Más aciertos de signo</td>
                        <td>${mostSign.signHits}</td>
                        <td>${mostSign.name}</td>
                    </tr>
                    <tr>
                        <td>Puntos totales máximos</td>
                        <td>${ranking[0].totalPoints}</td>
                        <td>${ranking[0].name}</td>
                    </tr>
                    <tr>
                        <td>Partidos jugados con pronóstico</td>
                        <td>${ranking[0].playedMatches}</td>
                        <td>${ranking[0].name}</td>
                    </tr>
                </tbody>
            </table>
        `;
        document.getElementById('statistics-table').innerHTML = statsHTML;
    }

    calculateBestStreak() {
        // Implementar cálculo de mejor racha de aciertos si es posible
        return 'Por implementar';
    }

    validateData(ranking) {
        // Comparar con initialClas
        const initial = this.data.initialClas;
        let errors = [];
        initial.forEach(initPlayer => {
            const calcPlayer = ranking.find(p => p.name === initPlayer.player);
            if (!calcPlayer || calcPlayer.totalPoints !== initPlayer.totalPoints) {
                errors.push(`${initPlayer.player}: Esperado ${initPlayer.totalPoints}, Calculado ${calcPlayer ? calcPlayer.totalPoints : 'N/A'}`);
            }
        });
        
        const validationEl = document.getElementById('validation-result');
        if (errors.length === 0) {
            validationEl.innerHTML = '<span class="validation-ok">✓ Validación pasada: Los puntos coinciden con el Excel.</span>';
        } else {
            validationEl.innerHTML = `<span class="validation-error">✗ Errores de validación: ${errors.join(', ')}</span>`;
        }
    }

    setupValidation() {
        // Validar al cargar
        const ranking = this.calculateParticipantRanking();
        this.validateData(ranking);
    }

    checkAdminStatus() {
        const token = localStorage.getItem(CONFIG.LOCALSTORAGE_KEYS.adminToken);
        const expiry = localStorage.getItem(CONFIG.LOCALSTORAGE_KEYS.adminExpiry);
        if (token && expiry && new Date(expiry) > new Date()) {
            this.isAdmin = true;
            this.updateUIForAdmin();
        } else {
            this.clearAdminToken();
        }
    }

    showAdminModal() {
        document.getElementById('admin-modal').style.display = 'flex';
        document.getElementById('admin-pin').focus();
    }

    hideAdminModal() {
        document.getElementById('admin-modal').style.display = 'none';
        document.getElementById('admin-pin').value = '';
        document.getElementById('modal-error').textContent = '';
    }

    verifyAdminPin() {
        const pin = document.getElementById('admin-pin').value;
        if (pin === CONFIG.ADMIN_PIN) {
            this.setAdminToken();
            this.isAdmin = true;
            this.updateUIForAdmin();
            this.hideAdminModal();
            alert('¡Modo admin activado! Ahora puedes editar resultados.');
        } else {
            document.getElementById('modal-error').textContent = 'PIN incorrecto. Inténtalo de nuevo.';
            document.getElementById('admin-pin').value = '';
        }
    }

    setAdminToken() {
        const expiry = new Date();
        expiry.setHours(expiry.getHours() + CONFIG.ADMIN_TOKEN_EXPIRY_HOURS);
        localStorage.setItem(CONFIG.LOCALSTORAGE_KEYS.adminToken, 'true');
        localStorage.setItem(CONFIG.LOCALSTORAGE_KEYS.adminExpiry, expiry.toISOString());
    }

    clearAdminToken() {
        localStorage.removeItem(CONFIG.LOCALSTORAGE_KEYS.adminToken);
        localStorage.removeItem(CONFIG.LOCALSTORAGE_KEYS.adminExpiry);
        this.isAdmin = false;
        this.updateUIForGuest();
    }

    logoutAdmin() {
        this.clearAdminToken();
        alert('Has salido del modo admin.');
    }

    updateUIForAdmin() {
        document.getElementById('mode-status').textContent = 'Modo: Admin';
        document.getElementById('admin-toggle').style.display = 'none';
        document.getElementById('logout-btn').style.display = 'inline-flex';
        document.getElementById('save-btn').disabled = false;
        document.getElementById('restore-btn').disabled = false;
        this.updateTabVisibility();
        // Re-renderizar si es necesario
        if (document.getElementById('league-tab').classList.contains('active')) {
            this.renderLeagueTab();
        }
    }

    updateUIForGuest() {
        document.getElementById('mode-status').textContent = 'Modo: Invitado';
        document.getElementById('admin-toggle').style.display = 'inline-flex';
        document.getElementById('logout-btn').style.display = 'none';
        document.getElementById('save-btn').disabled = true;
        document.getElementById('restore-btn').disabled = true;
        this.updateTabVisibility();
    }

    saveChanges() {
        const editedObj = Object.fromEntries(this.editedMatches);
        localStorage.setItem(CONFIG.LOCALSTORAGE_KEYS.editedMatches, JSON.stringify(editedObj));
        alert('Cambios guardados en localStorage.');
        this.recalculateAll();
    }

    restoreExcel() {
        if (confirm('¿Restaurar datos originales del Excel? Se perderán los cambios no guardados.')) {
            localStorage.removeItem(CONFIG.LOCALSTORAGE_KEYS.editedMatches);
            this.editedMatches.clear();
            this.recalculateAll();
            alert('Datos restaurados al estado inicial del Excel.');
        }
    }

    exportBackup() {
        const data = {
            editedMatches: Object.fromEntries(this.editedMatches),
            exportDate: new Date().toISOString()
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `champions_backup_${new Date().toISOString().slice(0,10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    importBackup(event) {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                if (data.editedMatches) {
                    this.editedMatches = new Map(Object.entries(data.editedMatches));
                    this.saveChanges();
                    alert('Backup importado exitosamente.');
                } else {
                    throw new Error('Formato de backup inválido');
                }
            } catch (error) {
                alert('Error importando backup: ' + error.message);
            }
        };
        reader.readAsText(file);
        event.target.value = '';
    }

    recalculateAll() {
        this.renderLeagueTab();
        this.renderClasificacionTab();
    }

    calculateMatchSign(homeGoals, awayGoals) {
        if (homeGoals === null || awayGoals === null) return null;
        if (homeGoals > awayGoals) return '1';
        if (homeGoals === awayGoals) return 'X';
        return '2';
    }
}

// Iniciar la aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    window.app = new ChampionsPorraApp();
});

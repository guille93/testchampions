// Configuración de la aplicación
const CONFIG = {
    ADMIN_PIN: '1234', // PIN por defecto, cambiar si es necesario
    ADMIN_TOKEN_EXPIRY_HOURS: 24, // Expiración del token admin en horas
    DATA_PATHS: {
        matches: 'data/matches.json',
        participants: 'data/participants.json',
        predictions: 'data/predictions.json',
        initialClas: 'data/initial_clas.json',
        teams: 'data/teams.json',
        rules: 'data/rules.json'
    },
    SCORING_RULES: {
        signo: 2,   // Puntos por acertar el signo (1, X, 2)
        exacto: 3,  // Puntos adicionales por resultado exacto
        diferencia: 0 // Puntos por diferencia de goles (0 en fase liga)
    },
    LOCALSTORAGE_KEYS: {
        editedMatches: 'champions_edited_matches',
        adminToken: 'champions_admin_token',
        adminExpiry: 'champions_admin_expiry'
    }
};

/**
 * API wrapper for G-Win Metro Lottery
 */
const GWinAPI = {
    /**
     * Fetch user balance from the server
     * @param {string} username 
     * @returns {Promise<object|null>}
     */
    async getUserBalance(username) {
        if (!window.API_CONFIG) return null;

        const url = `${window.API_CONFIG.API_BASE_URL}${window.API_CONFIG.ENDPOINTS.BALANCE}?username=${username}`;

        try {
            const response = await fetch(url);
            const result = await response.json();
            return result;
        } catch (error) {
            console.error('API Error (fetchBalance):', error);
            throw error;
        }
    },

    /**
     * Perform login
     * @param {string} username 
     * @param {string} password 
     */
    async login(username, password) {
        const url = window.API_CONFIG.API_BASE_URL + window.API_CONFIG.ENDPOINTS.LOGIN;
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            return await response.json();
        } catch (error) {
            console.error('API Error (login):', error);
            throw error;
        }
    },

    /**
     * Perform logout
     * @param {string} userId 
     */
    async logout(userId) {
        const url = window.API_CONFIG.API_BASE_URL + window.API_CONFIG.ENDPOINTS.LOGOUT;
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: userId })
            });
            return await response.json();
        } catch (error) {
            console.error('API Error (logout):', error);
            throw error;
        }
    },

    /**
     * Place bet
     * @param {object} payload 
     */
    async placeBet(payload) {
        const url = window.API_CONFIG.API_BASE_URL + window.API_CONFIG.ENDPOINTS.PLACE_BET;
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            return await response.json();
        } catch (error) {
            console.error('API Error (placeBet):', error);
            throw error;
        }
    },

    /**
     * Get bet history
     * @param {string} username
     * @param {string} recordDate (YYYY-MM-DD or similar)
     */
    async getBetHistory(username, recordDate) {
        if (!window.API_CONFIG) return null;
        const url = `${window.API_CONFIG.API_BASE_URL}${window.API_CONFIG.ENDPOINTS.BET_HISTORY}?username=${username}&record_date=${recordDate}`;
        try {
            const response = await fetch(url);
            return await response.json();
        } catch (error) {
            console.error('API Error (getBetHistory):', error);
            throw error;
        }
    },

    /**
     * Open Ticket print URL
     * @param {string} username
     * @param {string} barcode
     */
    printTicket(username, barcode) {
        if (!window.API_CONFIG) return;
        const url = `${window.API_CONFIG.API_BASE_URL}${window.API_CONFIG.ENDPOINTS.PRINT_TICKET}?username=${username}&barcodee=${barcode}`;
        window.open(url, 'PrintTicketWindow', 'width=800,height=600');
    },

    /**
     * Get Printable Ticket Data
     * @param {string} username
     * @param {string} barcode
     */
    async getPrintTicketData(username, barcode) {
        if (!window.API_CONFIG) return null;
        const url = `${window.API_CONFIG.API_BASE_URL}${window.API_CONFIG.ENDPOINTS.PRINT_TICKETS_DATA}?username=${username}&barcodee=${barcode}`;
        try {
            const response = await fetch(url);
            return await response.json();
        } catch (error) {
            console.error('API Error (getPrintTicketData):', error);
            throw error;
        }
    },

    /**
     * Cancel a specific ticket
     * @param {string|number} ticketId 
     */
    async cancelTicket(ticketId) {
        if (!window.API_CONFIG) return null;
        const url = `${window.API_CONFIG.API_BASE_URL}${window.API_CONFIG.ENDPOINTS.CANCEL_TICKET}?id=${ticketId}`;
        try {
            const response = await fetch(url);
            return await response.json();
        } catch (error) {
            console.error('API Error (cancelTicket):', error);
            throw error;
        }
    },

    /**
     * Get current draw bet history for a user
     * @param {string} username 
     */
    async getCurrentDrawHistory(username) {
        if (!window.API_CONFIG) return null;
        const url = `${window.API_CONFIG.API_BASE_URL}${window.API_CONFIG.ENDPOINTS.CURRENT_DRAW_HISTORY}?username=${username}`;
        try {
            const response = await fetch(url);
            return await response.json();
        } catch (error) {
            console.error('API Error (getCurrentDrawHistory):', error);
            throw error;
        }
    },

    /**
     * Get last draw bet amount for a user
     * @param {string} username 
     */
    async getLastDrawBetAmount(username) {
        if (!window.API_CONFIG) return null;
        const url = `${window.API_CONFIG.API_BASE_URL}${window.API_CONFIG.ENDPOINTS.LAST_DRAW_BET_AMOUNT}?username=${username}`;
        try {
            const response = await fetch(url);
            return await response.json();
        } catch (error) {
            console.error('API Error (getLastDrawBetAmount):', error);
            throw error;
        }
    },

    /**
     * Get advance draw times
     */
    async getAdvanceDrawTimes() {
        if (!window.API_CONFIG) return null;
        const url = `${window.API_CONFIG.API_BASE_URL}${window.API_CONFIG.ENDPOINTS.ADVANCE_DRAW_TIME}`;
        try {
            const response = await fetch(url);
            return await response.json();
        } catch (error) {
            console.error('API Error (getAdvanceDrawTimes):', error);
            throw error;
        }
    },

    /**
     * Get timer and draw data
     */
    async getTimerData() {
        if (!window.API_CONFIG) return null;
        const url = `${window.API_CONFIG.API_BASE_URL}${window.API_CONFIG.ENDPOINTS.TIMER}`;
        try {
            const response = await fetch(url);
            return await response.json();
        } catch (error) {
            console.error('API Error (getTimerData):', error);
            throw error;
        }
    },


    /**
     * Get timer and draw data
     */
    async result() {
        if (!window.API_CONFIG) return null;
        const url = `${window.API_CONFIG.API_BASE_URL}${window.API_CONFIG.ENDPOINTS.RESULT}`;
        try {
            const response = await fetch(url);
            return await response.json();
        } catch (error) {
            console.error('API Error (result):', error);
            throw error;
        }
    },

    /**
     * Get result date wise
     */
    async resultDateWise(date) {
        if (!window.API_CONFIG) return null;
        const url = `${window.API_CONFIG.API_BASE_URL}${window.API_CONFIG.ENDPOINTS.RESULT_DATE_WISE}?record_date=${date}`;
        try {
            const response = await fetch(url);
            return await response.json();
        } catch (error) {
            console.error('API Error (resultDateWise):', error);
            throw error;
        }
    },

    async result6Wise(){
        if(!window.API_CONFIG) return null;
        const URL = `${window.API_CONFIG.API_BASE_URL}${window.API_CONFIG.ENDPOINTS.RESULT_6_WISE}`;
        try {
            const response = await fetch(URL);
            return await response.json();
        } catch (error) {
            console.error('API Error (result6Wise):', error);
            throw error;
        }
    },

    async claimTicket(barcode, username) {
        if (!window.API_CONFIG) return null;
        const url = `${window.API_CONFIG.API_BASE_URL}${window.API_CONFIG.ENDPOINTS.CLAIM_TICKET}`;
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    barcode_number: barcode,
                    username: username
                })
            });
            const result = await response.json();
            // Handle array response [ { status: ... } ]
            return Array.isArray(result) ? result[0] : result;
        } catch (error) {
            console.error('API Error (claimTicket):', error);
            throw error;
        }
    }
};

window.GWinAPI = GWinAPI;
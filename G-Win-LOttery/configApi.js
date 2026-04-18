const CONFIG = {
    // Replace with your actual API base URL from Postman {{platinumLottery}}
    API_BASE_URL: 'https://dhlmedia.online/LotteryAll/Games/', // Production URL
    ENDPOINTS: {
        LOGIN: 'UserDetailes/login.php',
        LOGOUT: 'UserDetailes/logout.php',
        BALANCE: 'UserDetailes/balance.php',
        PLACE_BET: 'Gwin/GameApi/InsertData.php',
        BET_HISTORY: 'Gwin/GameApi/BetHistory.php',
        PRINT_TICKET: 'Gwin/GameApi/TicketViewAndPrint.php',
        PRINT_TICKETS_DATA: 'Gwin/GameApi/PrintTickets.php',
        CANCEL_TICKET: 'Gwin/GameApi/CancleTicket.php',
        CURRENT_DRAW_HISTORY: 'Gwin/GameApi/CurrentDrawBetHistory.php',
        LAST_DRAW_BET_AMOUNT: 'Gwin/GameApi/LastDrawBetAmount.php',
        ADVANCE_DRAW_TIME: 'Gwin/GameApi/AdvancDrawTime.php',
        TIMER: 'Gwin/GameApi/Timer.php',
        RESULT: 'Gwin/GameApi/Result.php',
        RESULT_DATE_WISE: 'Gwin/GameApi/ResultDateWise.php',
        RESULT_6_WISE: 'Gwin/GameApi/ResultLast6.php',
        CLAIM_TICKET: 'Gwin/GameApi/ClaimTickets.php'
    }
};

// If using ES modules, you'd export it, but for simple scripts we can just use a global or 
// ensure it's loaded before login.js in index.html.
window.API_CONFIG = CONFIG;
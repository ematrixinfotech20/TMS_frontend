import axiosInterceptor from './axiosInterceptor';

export const upsertTodayTicketWork = async (data) => {
    try {
        const response = await axiosInterceptor.post('/today_ticket_work', data);
        return response.data;
    } catch (error) {
        console.error("Error saving today's ticket work log:", error);
        throw error;
    }
};

export const getTodayTicketWork = async (userId, ticketId, date = '') => {
    try {
        let url = `/today_ticket_work/user/${userId}/ticket/${ticketId}`;
        if (date) {
            url += `?date=${date}`;
        }
        const response = await axiosInterceptor.get(url);
        return response.data;
    } catch (error) {
        console.error(`Error fetching today's ticket work log for user ${userId} and ticket ${ticketId}:`, error);
        throw error;
    }
};

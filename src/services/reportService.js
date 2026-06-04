import axiosInterceptor from './axiosInterceptor';
import { reportURL } from '../config/config';
export const getDailyReport = async (date) => {
    try {
        const response = await axiosInterceptor.get(`${reportURL}/daily?date=${date}`);
        return response.data;
    } catch (error) {
        console.error("Error fetching daily report:", error);
        throw error;
    }
};

export const getMonthlyReport = async (startDate, endDate) => {
    try {
        const response = await axiosInterceptor.get(`${reportURL}/monthly?start_date=${startDate}&end_date=${endDate}`);
        return response.data;
    } catch (error) {
        console.error("Error fetching monthly report:", error);
        throw error;
    }
};

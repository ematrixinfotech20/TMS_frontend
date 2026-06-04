import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button, CircularProgress } from '@mui/material';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faClock,
    faUsers,
    faTicketAlt,
    faChevronDown,
    faChevronUp,
    faCalendarTimes,
    faExclamationTriangle
} from '@fortawesome/free-solid-svg-icons';
import { useForm } from 'react-hook-form';
import dayjs from 'dayjs';
import DatePickerComponent from '../../components/common/datePickerComponent';
import PermissionWrapper from '../../components/permissionWrapper/PermissionWrapper';
import { getMonthlyReport } from '../../services/reportService';
import { connect } from 'react-redux';
import { setAlert } from '../../redux/commonReducers/commonReducers';

const parseWorkingHours = (hoursStr) => {
    if (!hoursStr) return { hours: 0, minutes: 0 };
    const parts = hoursStr.split('.');
    const hours = parseInt(parts[0] || '0', 10);
    const minutes = parseInt(parts[1] || '0', 10);
    return { hours, minutes };
};

const formatLoggedTime = (totalHours, totalMinutes) => {
    const extraHours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    const hrs = totalHours + extraHours;
    return `${hrs}h ${mins.toString().padStart(2, '0')}m`;
};

const MonthlyReport = ({ setAlert }) => {
    const navigate = useNavigate();

    // Check permission
    const hasAccess = PermissionWrapper.hasPermission({
        functionalityName: "manage reports",
        moduleName: "Monthly Report",
        actionId: 4
    });

    // Form setup with React Hook Form
    const { control, watch, setValue } = useForm({
        defaultValues: {
            startDate: dayjs().startOf('month'),
            endDate: dayjs().endOf('month')
        }
    });

    const startDate = watch('startDate');
    const endDate = watch('endDate');

    const [reportData, setReportData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [expandedTickets, setExpandedTickets] = useState({});

    const fetchReport = async (startStr, endStr) => {
        if (!hasAccess) return;
        setLoading(true);
        try {
            const res = await getMonthlyReport(startStr, endStr);
            if (res.status === 200) {
                setReportData(res.result || []);
            } else {
                setAlert({ open: true, message: res.message || "Failed to fetch report data", type: "error" });
            }
        } catch (err) {
            console.error(err);
            setAlert({ open: true, message: "An error occurred while fetching the monthly report.", type: "error" });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (startDate && endDate && dayjs(startDate).isValid() && dayjs(endDate).isValid()) {
            if (startDate.isAfter(endDate)) {
                setAlert({ open: true, message: "Start Date cannot be after End Date.", type: "error" });
                setReportData([]);
            } else {
                fetchReport(startDate.format('YYYY-MM-DD'), endDate.format('YYYY-MM-DD'));
            }
        }
    }, [startDate, endDate]);

    const handleResetMonth = () => {
        setValue('startDate', dayjs().startOf('month'));
        setValue('endDate', dayjs().endOf('month'));
    };

    const toggleExpandTicket = (ticketId) => {
        setExpandedTickets(prev => ({
            ...prev,
            [ticketId]: !prev[ticketId]
        }));
    };

    // Access guard fallback
    if (!hasAccess) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center bg-white border border-[#DFE1E6] rounded-2xl shadow-sm max-w-2xl mx-auto my-12 animate-fade-in-up">
                <div className="w-16 h-16 bg-[#FFEBE6] rounded-full flex items-center justify-center mb-4 text-[#DE350B]">
                    <FontAwesomeIcon icon={faExclamationTriangle} size="2x" />
                </div>
                <h3 className="text-xl font-bold text-[#172B4D] mb-2">Access Denied</h3>
                <p className="text-[#5E6C84] mb-6">You do not have permission to view the Monthly Reports dashboard. Please contact your system administrator.</p>
                <Button
                    variant="contained"
                    onClick={() => navigate('/dashboard')}
                    sx={{
                        textTransform: 'none',
                        bgcolor: '#0052CC',
                        fontWeight: 600,
                        '&:hover': { bgcolor: '#0040A3' }
                    }}
                >
                    Back to Dashboard
                </Button>
            </div>
        );
    }

    // Calculations for overall KPIs
    let totalMinutesLogged = 0;
    const activeDevsSet = new Set();

    reportData.forEach(ticket => {
        const { hours, minutes } = parseWorkingHours(ticket.total_working_hours);
        totalMinutesLogged += hours * 60 + minutes;

        ticket.users.forEach(user => {
            activeDevsSet.add(user.developer_id);
        });
    });

    const kpiTotalHours = Math.floor(totalMinutesLogged / 60);
    const kpiTotalMinutes = totalMinutesLogged % 60;
    const totalTimeDisplay = formatLoggedTime(kpiTotalHours, kpiTotalMinutes);

    return (
        <div className="w-full max-w-7xl mx-auto space-y-8 animate-fade-in-up pb-10">
            {/* Header and Controls */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 border border-[#DFE1E6] rounded-2xl shadow-sm">
                <div>
                    <h2 className="text-2xl font-bold text-[#172B4D]">Monthly Work Reports</h2>
                    <p className="text-sm text-[#5E6C84] mt-1">Review ticket aggregated hours and user contributions by date range.</p>
                </div>

                <div className="flex flex-wrap items-center gap-3 self-start md:self-center">
                    <div style={{ width: 160 }}>
                        <DatePickerComponent
                            control={control}
                            name="startDate"
                            label="Start Date"
                            maxDate={endDate}
                        />
                    </div>
                    <div style={{ width: 160 }}>
                        <DatePickerComponent
                            control={control}
                            name="endDate"
                            label="End Date"
                            minDate={startDate}
                        />
                    </div>
                    <button
                        onClick={handleResetMonth}
                        className="bg-[#EBECF0] hover:bg-[#DFE1E6] text-[#42526E] font-bold text-sm px-4 py-2.5 rounded-xl transition active:scale-95 cursor-pointer h-[40px] flex items-center justify-center"
                    >
                        This Month
                    </button>
                </div>
            </div>

            {/* KPI Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* Total Logged Hours Card */}
                <div className="relative overflow-hidden p-6 bg-white border border-[#DFE1E6] rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5">
                    <div className="flex justify-between items-start">
                        <div>
                            <h3 className="font-medium text-[#5E6C84] text-xs uppercase tracking-wider">Total Worked Hours</h3>
                            <p className="text-3xl font-bold mt-2 text-[#172B4D]">{totalTimeDisplay}</p>
                        </div>
                        <div className="w-11 h-11 rounded-xl bg-[#E9F2FF] text-[#0052CC] flex items-center justify-center shrink-0">
                            <FontAwesomeIcon icon={faClock} size="lg" />
                        </div>
                    </div>
                    <div className="absolute bottom-0 left-0 w-full h-1 bg-[#0052CC]" />
                </div>

                {/* Tickets Card */}
                <div className="relative overflow-hidden p-6 bg-white border border-[#DFE1E6] rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5">
                    <div className="flex justify-between items-start">
                        <div>
                            <h3 className="font-medium text-[#5E6C84] text-xs uppercase tracking-wider">Total Tickets</h3>
                            <p className="text-3xl font-bold mt-2 text-[#172B4D]">{reportData.length}</p>
                        </div>
                        <div className="w-11 h-11 rounded-xl bg-[#FFF0B3] text-[#FF991F] flex items-center justify-center shrink-0">
                            <FontAwesomeIcon icon={faTicketAlt} size="lg" />
                        </div>
                    </div>
                    <div className="absolute bottom-0 left-0 w-full h-1 bg-[#FF991F]" />
                </div>
            </div>

            {/* Main Content Area */}
            {!loading && reportData.length === 0 ? (
                /* Empty State */
                <div className="flex flex-col items-center justify-center p-16 text-center bg-white border border-[#DFE1E6] rounded-2xl shadow-sm animate-fade-in">
                    <div className="w-16 h-16 bg-[#F4F5F7] rounded-full flex items-center justify-center mb-5 text-[#8993A4]">
                        <FontAwesomeIcon icon={faCalendarTimes} size="2x" />
                    </div>
                    <h3 className="text-lg font-bold text-[#172B4D] mb-1">No Work Logged</h3>
                    <p className="text-[#5E6C84] max-w-md">No ticket work logs found in the selected date range. Try choosing a different range.</p>
                </div>
            ) : (
                !loading && (
                    /* Tickets Accordion List */
                    <div className="space-y-4">
                        <h3 className="text-lg font-bold text-[#172B4D] px-1">Ticket Work Breakdown</h3>

                        {reportData.map((ticket) => {
                            const isExpanded = !!expandedTickets[ticket.ticket_id];

                            // Parse and format total logged time for this ticket
                            const { hours, minutes } = parseWorkingHours(ticket.total_working_hours);
                            const ticketTimeDisplay = formatLoggedTime(hours, minutes);

                            return (
                                <div
                                    key={ticket.ticket_id}
                                    className="bg-white border border-[#DFE1E6] rounded-2xl overflow-hidden shadow-xs hover:shadow-sm transition-all"
                                >
                                    {/* Accordion Header */}
                                    <div
                                        onClick={() => toggleExpandTicket(ticket.ticket_id)}
                                        className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:bg-[#FAFBFC] transition-colors select-none"
                                    >
                                        {/* Ticket Info */}
                                        <div className="flex items-center gap-3.5 min-w-0 flex-1">
                                            <div className="w-10 h-10 rounded-xl bg-[#E9F2FF] text-[#0052CC] flex items-center justify-center font-bold text-sm shrink-0">
                                                <FontAwesomeIcon icon={faTicketAlt} />
                                            </div>
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <Link
                                                        to={`/dashboard/manage-tickets/view/${ticket.ticket_id}`}
                                                        className="font-bold text-[#0052CC] hover:underline"
                                                        onClick={(e) => e.stopPropagation()} // Prevent accordion toggle on link click
                                                    >
                                                        {ticket.ticket_no}
                                                    </Link>
                                                    {ticket.project_name && (
                                                        <span className="text-xs font-semibold bg-violet-50 text-violet-700 border-violet-200 px-2 py-0.5 rounded">
                                                            {ticket.project_name}
                                                        </span>
                                                    )}
                                                </div>
                                                <h4 className="font-bold text-[#172B4D] text-base truncate mt-0.5">{ticket.title}</h4>
                                            </div>
                                        </div>

                                        {/* Hours Logged & Expansion controls */}
                                        <div className="flex items-center justify-between md:justify-end gap-5 shrink-0">
                                            <div className="text-right">
                                                <div className="text-xs text-[#5E6C84] font-medium">Total Hours</div>
                                                <div className="text-base font-bold text-[#172B4D]">{ticketTimeDisplay}</div>
                                            </div>
                                            <span className="text-xs font-bold text-[#6B778C] bg-[#F4F5F7] px-2.5 py-1 rounded-full shrink-0">
                                                {ticket.users.length} {ticket.users.length === 1 ? 'Contributor' : 'Contributors'}
                                            </span>
                                            <div className="w-8 h-8 rounded-full hover:bg-[#EBECF0] text-[#5E6C84] flex items-center justify-center transition-colors">
                                                <FontAwesomeIcon icon={isExpanded ? faChevronUp : faChevronDown} />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Accordion Body */}
                                    {isExpanded && (
                                        <div className="border-t border-[#DFE1E6] bg-[#FAFBFC] p-5">
                                            <div className="overflow-hidden border border-[#DFE1E6] rounded-xl bg-white shadow-xs">
                                                <table className="min-w-full divide-y divide-[#DFE1E6]">
                                                    <thead className="bg-[#FAFBFC]">
                                                        <tr>
                                                            <th scope="col" className="px-5 py-3 text-left text-xs font-bold text-[#8993A4] uppercase tracking-wider">Developer Name</th>
                                                            <th scope="col" className="px-5 py-3 text-right text-xs font-bold text-[#8993A4] uppercase tracking-wider">Total Hours</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="bg-white divide-y divide-[#DFE1E6]">
                                                        {ticket.users.map((user) => {
                                                            const { hours: uHrs, minutes: uMins } = parseWorkingHours(user.working_hours);
                                                            const userTimeDisplay = formatLoggedTime(uHrs, uMins);

                                                            return (
                                                                <tr key={user.developer_id} className="hover:bg-[#FAFBFC] transition-colors">
                                                                    <td className="px-5 py-3.5 whitespace-nowrap text-sm font-semibold text-[#172B4D]">
                                                                        <div className="flex items-center gap-2">
                                                                            <div className="w-6 h-6 rounded-full bg-[#E3FCEF] text-[#36B37E] flex items-center justify-center text-[10px] font-bold">
                                                                                {user.developer_name ? user.developer_name.split(' ').map(n => n[0]).join('') : 'D'}
                                                                            </div>
                                                                            <span>{user.developer_name}</span>
                                                                        </div>
                                                                    </td>
                                                                    <td className="px-5 py-3.5 whitespace-nowrap text-sm text-[#172B4D] font-semibold text-right">
                                                                        {userTimeDisplay}
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )
            )}
        </div>
    );
};

const mapStateToProps = (state) => ({});

const mapDispatchToProps = {
    setAlert
};

export default connect(mapStateToProps, mapDispatchToProps)(MonthlyReport);

import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button, CircularProgress, Tooltip } from '@mui/material';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faClock,
    faUsers,
    faTicketAlt,
    faChevronDown,
    faChevronUp,
    faCalendarTimes,
    faExclamationTriangle,
    faExternalLinkAlt
} from '@fortawesome/free-solid-svg-icons';
import { useForm } from 'react-hook-form';
import dayjs from 'dayjs';
import DatePickerComponent from '../../components/common/datePickerComponent';
import PermissionWrapper from '../../components/permissionWrapper/PermissionWrapper';
import { getDailyReport } from '../../services/reportService';
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

const DailyReports = ({ setAlert }) => {
    const navigate = useNavigate();

    // Check permission
    const hasAccess = PermissionWrapper.hasPermission({
        functionalityName: "manage reports",
        moduleName: "Daily Report",
        actionId: 4
    });

    // Form setup with React Hook Form
    const { control, watch, setValue } = useForm({
        defaultValues: {
            reportDate: dayjs()
        }
    });

    const reportDate = watch('reportDate');

    const [reportData, setReportData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [expandedDevs, setExpandedDevs] = useState({});

    const fetchReport = async (dateStr) => {
        if (!hasAccess) return;
        setLoading(true);
        try {
            const res = await getDailyReport(dateStr);
            if (res.status === 200) {
                setReportData(res.result || []);
            } else {
                setAlert({ open: true, message: res.message || "Failed to fetch report data", type: "error" });
            }
        } catch (err) {
            console.error(err);
            setAlert({ open: true, message: "An error occurred while fetching the daily report.", type: "error" });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (reportDate && dayjs(reportDate).isValid()) {
            fetchReport(reportDate.format('YYYY-MM-DD'));
        }
    }, [reportDate]);

    const handleTodayClick = () => {
        setValue('reportDate', dayjs());
    };

    const toggleExpandDev = (devId) => {
        setExpandedDevs(prev => ({
            ...prev,
            [devId]: !prev[devId]
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
                <p className="text-[#5E6C84] mb-6">You do not have permission to view the Daily Reports dashboard. Please contact your system administrator.</p>
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
    let totalUniqueTickets = new Set();

    reportData.forEach(dev => {
        dev.tickets.forEach(ticket => {
            const { hours, minutes } = parseWorkingHours(ticket.today_working_hours);
            totalMinutesLogged += hours * 60 + minutes;
            totalUniqueTickets.add(ticket.ticket_id);
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
                    <h2 className="text-2xl font-bold text-[#172B4D]">Daily Work Reports</h2>
                    <p className="text-sm text-[#5E6C84] mt-1">Review developers' logged hours and ticket activities by date.</p>
                </div>

                <div className="flex items-center gap-3 self-start md:self-center">
                    <div style={{ width: 180 }}>
                        <DatePickerComponent
                            control={control}
                            name="reportDate"
                            label="Date"
                        />
                    </div>
                    <button
                        onClick={handleTodayClick}
                        className="bg-[#EBECF0] hover:bg-[#DFE1E6] text-[#42526E] font-bold text-sm px-4 py-2.5 rounded-xl transition active:scale-95 cursor-pointer h-[40px] flex items-center justify-center"
                    >
                        Today
                    </button>
                </div>
            </div>

            {/* KPI Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
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

                {/* Active Developers Card */}
                <div className="relative overflow-hidden p-6 bg-white border border-[#DFE1E6] rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5">
                    <div className="flex justify-between items-start">
                        <div>
                            <h3 className="font-medium text-[#5E6C84] text-xs uppercase tracking-wider">Active Developers</h3>
                            <p className="text-3xl font-bold mt-2 text-[#172B4D]">{reportData.length}</p>
                        </div>
                        <div className="w-11 h-11 rounded-xl bg-[#E3FCEF] text-[#36B37E] flex items-center justify-center shrink-0">
                            <FontAwesomeIcon icon={faUsers} size="lg" />
                        </div>
                    </div>
                    <div className="absolute bottom-0 left-0 w-full h-1 bg-[#36B37E]" />
                </div>

                {/* Tickets Worked On Card */}
                <div className="relative overflow-hidden p-6 bg-white border border-[#DFE1E6] rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5">
                    <div className="flex justify-between items-start">
                        <div>
                            <h3 className="font-medium text-[#5E6C84] text-xs uppercase tracking-wider">Tickets Worked On</h3>
                            <p className="text-3xl font-bold mt-2 text-[#172B4D]">{totalUniqueTickets.size}</p>
                        </div>
                        <div className="w-11 h-11 rounded-xl bg-[#FFF0B3] text-[#FF991F] flex items-center justify-center shrink-0">
                            <FontAwesomeIcon icon={faTicketAlt} size="lg" />
                        </div>
                    </div>
                    <div className="absolute bottom-0 left-0 w-full h-1 bg-[#FF991F]" />
                </div>
            </div>

            {/* Main Content Area */}
            {reportData.length === 0 ? (
                /* Empty State */
                <div className="flex flex-col items-center justify-center p-16 text-center bg-white border border-[#DFE1E6] rounded-2xl shadow-sm animate-fade-in">
                    <div className="w-16 h-16 bg-[#F4F5F7] rounded-full flex items-center justify-center mb-5 text-[#8993A4]">
                        <FontAwesomeIcon icon={faCalendarTimes} size="2x" />
                    </div>
                    <h3 className="text-lg font-bold text-[#172B4D] mb-1">No Work Logged</h3>
                    <p className="text-[#5E6C84] max-w-md">No developer has logged ticket work on this date. Select another date or check back later.</p>
                </div>
            ) : (
                /* Developers Accordion List */
                <div className="space-y-4">
                    <h3 className="text-lg font-bold text-[#172B4D] px-1">Developer Work Details</h3>

                    {reportData.map((dev) => {
                        const isExpanded = !!expandedDevs[dev.developer_id];

                        // Parse logged time for this developer
                        let devMinutes = 0;
                        dev.tickets.forEach(ticket => {
                            const { hours, minutes } = parseWorkingHours(ticket.today_working_hours);
                            devMinutes += hours * 60 + minutes;
                        });
                        const devHours = Math.floor(devMinutes / 60);
                        const devMins = devMinutes % 60;
                        const devLoggedTimeDisplay = formatLoggedTime(devHours, devMins);

                        // Calculate progress bar percent against user standard total_working_hours
                        const standardHoursVal = parseFloat(dev.total_working_hours) || 0.0;
                        const standardMinutes = standardHoursVal * 60;
                        const progressPercent = Math.min(Math.round((devMinutes / standardMinutes) * 100), 100);

                        return (
                            <div
                                key={dev.developer_id}
                                className="bg-white border border-[#DFE1E6] rounded-2xl overflow-hidden shadow-xs hover:shadow-sm transition-all"
                            >
                                {/* Accordion Header */}
                                <div
                                    onClick={() => toggleExpandDev(dev.developer_id)}
                                    className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:bg-[#FAFBFC] transition-colors select-none"
                                >
                                    {/* Developer Info */}
                                    <div className="flex items-center gap-3.5 min-w-0">
                                        <div className="w-10 h-10 rounded-full bg-linear-to-br from-[#0052CC] to-[#4C9AFF] text-white flex items-center justify-center font-bold text-base shadow-sm shrink-0">
                                            {dev.developer_name ? dev.developer_name.split(' ').map(n => n[0]).join('') : 'D'}
                                        </div>
                                        <div className="min-w-0">
                                            <h4 className="font-bold text-[#172B4D] text-base truncate">{dev.developer_name}</h4>
                                        </div>
                                    </div>

                                    {/* Progress and Time Logged */}
                                    <div className="flex-1 max-w-md flex flex-col md:flex-row md:items-center gap-4 md:px-6">
                                        <div className="flex-1 min-w-[150px]">
                                            <div className="flex justify-between text-xs font-semibold text-[#5E6C84] mb-1.5">
                                                <span>Worked: {devLoggedTimeDisplay}</span>
                                                <span>Target: {standardHoursVal}h</span>
                                            </div>
                                            <div className="w-full h-2 bg-[#EBECF0] rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full transition-all duration-500 ${progressPercent >= 90 ? 'bg-[#36B37E]' :
                                                        progressPercent >= 50 ? 'bg-[#FFAB00]' : 'bg-[#FF5630]'
                                                        }`}
                                                    style={{ width: `${progressPercent}%` }}
                                                />
                                            </div>
                                        </div>
                                        {/* <div className="shrink-0 text-xs font-bold text-center bg-[#F4F5F7] text-[#42526E] py-1 px-2.5 rounded-md">
                                            {progressPercent}% Complete
                                        </div> */}
                                    </div>

                                    {/* Toggle Icon */}
                                    <div className="flex items-center justify-between md:justify-end gap-3 shrink-0">
                                        <span className="text-xs font-bold text-[#6B778C] bg-[#E9F2FF] text-[#0052CC] px-2.5 py-1 rounded-full shrink-0">
                                            {dev.tickets.length} {dev.tickets.length === 1 ? 'Ticket' : 'Tickets'}
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
                                                        <th scope="col" className="px-5 py-3 text-left text-xs font-bold text-[#8993A4] uppercase tracking-wider">Ticket No</th>
                                                        <th scope="col" className="px-5 py-3 text-left text-xs font-bold text-[#8993A4] uppercase tracking-wider">Project Name</th>
                                                        <th scope="col" className="px-5 py-3 text-left text-xs font-bold text-[#8993A4] uppercase tracking-wider">Title</th>
                                                        <th scope="col" className="px-5 py-3 text-right text-xs font-bold text-[#8993A4] uppercase tracking-wider">Work Time</th>
                                                        {/* <th scope="col" className="px-5 py-3 text-center text-xs font-bold text-[#8993A4] uppercase tracking-wider">Action</th> */}
                                                    </tr>
                                                </thead>
                                                <tbody className="bg-white divide-y divide-[#DFE1E6]">
                                                    {dev.tickets.map((ticket) => {
                                                        const { hours: tHrs, minutes: tMins } = parseWorkingHours(ticket.today_working_hours);
                                                        const ticketTimeDisplay = formatLoggedTime(tHrs, tMins);

                                                        return (
                                                            <tr key={ticket.ticket_id} className="hover:bg-[#FAFBFC] transition-colors">
                                                                <td className="px-5 py-3.5 whitespace-nowrap text-sm font-semibold text-[#0052CC]">
                                                                    <Link to={`/dashboard/manage-tickets/view/${ticket.ticket_id}`} className="hover:underline">
                                                                        {ticket.ticket_no}
                                                                    </Link>
                                                                </td>
                                                                <td className="px-5 py-3.5 whitespace-nowrap text-sm text-[#42526E] font-semibold">
                                                                    {ticket.project_name || '-'}
                                                                </td>
                                                                <td className="px-5 py-3.5 text-sm text-[#172B4D] font-medium max-w-xs md:max-w-md truncate">
                                                                    {ticket.title}
                                                                </td>
                                                                <td className="px-5 py-3.5 whitespace-nowrap text-sm text-[#172B4D] font-semibold text-right">
                                                                    {ticketTimeDisplay}
                                                                </td>
                                                                {/* <td className="px-5 py-3.5 whitespace-nowrap text-center text-sm">
                                                                    <Tooltip title="View Ticket Details" arrow>
                                                                        <Link
                                                                            to={`/dashboard/manage-tickets/view/${ticket.ticket_id}`}
                                                                            className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-[#E9F2FF] hover:bg-[#0052CC] text-[#0052CC] hover:text-white transition-all shadow-xs"
                                                                        >
                                                                            <FontAwesomeIcon icon={faExternalLinkAlt} size="xs" />
                                                                        </Link>
                                                                    </Tooltip>
                                                                </td> */}
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
            )}
        </div>
    );
};

const mapStateToProps = (state) => ({});

const mapDispatchToProps = {
    setAlert
};

export default connect(mapStateToProps, mapDispatchToProps)(DailyReports);

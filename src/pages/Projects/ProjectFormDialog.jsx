import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { connect } from 'react-redux';
import CustomInput from '../../components/common/CustomInput';
import CustomSelect from '../../components/common/CustomSelect';
import CustomModalWrapper from '../../components/common/CustomModalWrapper';
import { getProjectById, addProject, updateProject } from '../../services/projectService';
import { getCustomers, getAllAdmins } from '../../services/userService';
import { CircularProgress } from '@mui/material';
import { setAlert } from '../../redux/commonReducers/commonReducers';

const ProjectFormDialog = ({
    open,
    onClose,
    onSuccess,
    editingProjectId,
    setAlert,
    companyId
}) => {
    const {
        control,
        handleSubmit,
        reset,
        watch,
        setValue
    } = useForm({
        defaultValues: {
            name: '',
            client_id: '',
            project_type: ''
        }
    });

    const [clients, setClients] = useState([]);
    const [loadingData, setLoadingData] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const fetchClients = async () => {
        try {
            // Fetch users that have the Customer role
            const res = await getCustomers(companyId);
            const clientOptions = (res.result || []).map(user => ({
                value: user.id,
                label: `${user.first_name} ${user.last_name}`
            }));
            setClients(clientOptions);
            // if (companyId && clientOptions.length > 0 && !editingProjectId) {
            //     setValue("client_id", clientOptions[0].value);
            // }
        } catch (err) {
            console.error("Failed to fetch clients", err);
        }
    };

    const fetchAdmins = async () => {
        try {
            const res = await getAllAdmins();
            const adminOptions = (res.result || []).map(user => ({
                value: user.id,
                label: `${user.first_name} ${user.last_name}`
            }));
            setClients(adminOptions);
        } catch (err) {
            console.error("Failed to fetch admins", err);
        }
    };

    useEffect(() => {
        if (watch("project_type") === "internal") {
            fetchAdmins();
        }
        if (watch("project_type") === "client") {
            fetchClients();
        }
    }, [watch('project_type'), companyId]);

    useEffect(() => {
        if (open) {
            if (editingProjectId) {
                setLoadingData(true);
                getProjectById(editingProjectId).then(res => {
                    reset({
                        name: res.result.name || '',
                        client_id: res.result.client_id || '',
                        project_type: res.result.project_type || ''
                    });
                }).catch(err => {
                    console.error("Failed to load project details", err);
                    setAlert({ open: true, message: "Failed to load project details.", type: "error" });
                }).finally(() => {
                    setLoadingData(false);
                });
            } else {
                reset({
                    name: '',
                    client_id: '',
                    project_type: companyId ? 'client' : ''
                });
            }
        }
    }, [open, editingProjectId, reset, setAlert, companyId]);

    const handleFormSubmit = async (data) => {
        setIsSubmitting(true);
        try {
            if (editingProjectId) {
                await updateProject(editingProjectId, data);
            } else {
                await addProject(data);
            }
            setAlert({
                open: true,
                message: `Project ${editingProjectId ? 'updated' : 'created'} successfully!`,
                type: "success"
            });
            if (onSuccess) onSuccess();
        } catch (err) {
            console.error(err);
            setAlert({
                open: true,
                message: err.message || "Failed to save project.",
                type: "error"
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <CustomModalWrapper
            open={open}
            onClose={() => !isSubmitting && onClose()}
            title={editingProjectId ? 'Edit Project' : 'Add New Project'}
            onSubmit={handleSubmit(handleFormSubmit)}
            isSubmitting={isSubmitting || loadingData}
            submitText={editingProjectId ? 'Save Changes' : 'Submit'}
            cancelText="Cancel"
            maxWidth="md"
        >
            <form id="project-form" onSubmit={handleSubmit(handleFormSubmit)}>
                {loadingData ? (
                    <div className="flex justify-center p-6">
                        <CircularProgress size={30} sx={{ color: '#0052CC' }} />
                    </div>
                ) : (
                    <div className="flex flex-col gap-4 mt-2">
                        <div className={companyId ? 'flex flex-col gap-3' : 'grid grid-cols-2 gap-3'}>
                            <CustomInput
                                name="name"
                                control={control}
                                label="Project Name"
                                rules={{ required: "Project name is required" }}
                            />
                            {!companyId && (
                                <CustomSelect
                                    name="project_type"
                                    control={control}
                                    label="Project Type"
                                    options={[
                                        { value: 'internal', label: 'Internal Project' },
                                        { value: 'client', label: 'Client Project' },
                                    ]}
                                    rules={{ required: "Project type is required" }}
                                />
                            )}
                        </div>
                        <CustomSelect
                            disabled={!watch("project_type")}
                            name="client_id"
                            control={control}
                            label="Assigned Client"
                            options={clients}
                            rules={{ required: "Client is required" }}
                        />
                    </div>
                )}
            </form>
        </CustomModalWrapper>
    );
};

const mapStateToProps = (state) => ({});

const mapDispatchToProps = {
    setAlert
};

export default connect(mapStateToProps, mapDispatchToProps)(ProjectFormDialog);

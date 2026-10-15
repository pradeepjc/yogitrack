import axiosClient from './axiosClient';

export const listMyClasses = () => axiosClient.get('/attendance/classes').then((res) => res.data);

export const listAttendanceCustomers = () => axiosClient.get('/attendance/customers').then((res) => res.data);

export const previewAttendance = (data) => axiosClient.post('/attendance/preview', data).then((res) => res.data);

export const recordAttendance = (data) => axiosClient.post('/attendance', data).then((res) => res.data);

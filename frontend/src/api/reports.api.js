import axiosClient from './axiosClient';

export const getPackageSalesReport = () => axiosClient.get('/reports/package-sales').then((res) => res.data);

export const getInstructorClassesReport = () => axiosClient.get('/reports/instructor-classes').then((res) => res.data);

export const getCustomerPackagesReport = () => axiosClient.get('/reports/customer-packages').then((res) => res.data);

export const getTeacherPaymentsReport = (month) =>
  axiosClient.get('/reports/teacher-payments', { params: { month } }).then((res) => res.data);

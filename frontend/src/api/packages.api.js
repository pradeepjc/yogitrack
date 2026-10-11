import axiosClient from './axiosClient';

export const createPackage = (data) => axiosClient.post('/packages', data).then((res) => res.data);

export const listPackages = () => axiosClient.get('/packages').then((res) => res.data);

export const updatePackage = (id, data) => axiosClient.put(`/packages/${id}`, data).then((res) => res.data);

export const deactivatePackage = (id) => axiosClient.delete(`/packages/${id}`).then((res) => res.data);

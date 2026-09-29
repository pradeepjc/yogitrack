import axiosClient from './axiosClient';

export const createPackage = (data) => axiosClient.post('/packages', data).then((res) => res.data);

export const listPackages = () => axiosClient.get('/packages').then((res) => res.data);

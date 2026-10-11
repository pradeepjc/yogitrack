import axiosClient from './axiosClient';

export const createSale = (data) => axiosClient.post('/sales', data).then((res) => res.data);

export const listSales = () => axiosClient.get('/sales').then((res) => res.data);

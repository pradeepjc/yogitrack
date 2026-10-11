import axiosClient from './axiosClient';

export const checkDuplicateCustomer = (firstName, lastName) =>
  axiosClient
    .get('/customers/check-duplicate', { params: { firstName, lastName } })
    .then((res) => res.data);

export const createCustomer = (data) => axiosClient.post('/customers', data).then((res) => res.data);

export const listCustomers = () => axiosClient.get('/customers').then((res) => res.data);

export const updateCustomer = (id, data) => axiosClient.put(`/customers/${id}`, data).then((res) => res.data);

export const deactivateCustomer = (id) => axiosClient.delete(`/customers/${id}`).then((res) => res.data);

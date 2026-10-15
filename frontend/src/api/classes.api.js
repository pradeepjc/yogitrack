import axiosClient from './axiosClient';

export const checkClassConflict = (dayOfWeek, time, excludeClassId) =>
  axiosClient
    .post('/classes/check-conflict', { dayOfWeek, time, excludeClassId })
    .then((res) => res.data);

export const createClass = (data) => axiosClient.post('/classes', data).then((res) => res.data);

export const listClasses = (instructorId) =>
  axiosClient.get('/classes', { params: instructorId ? { instructorId } : {} }).then((res) => res.data);

export const getClass = (id) => axiosClient.get(`/classes/${id}`).then((res) => res.data);

export const updateClass = (id, data) => axiosClient.put(`/classes/${id}`, data).then((res) => res.data);

export const deactivateClass = (id) => axiosClient.delete(`/classes/${id}`).then((res) => res.data);

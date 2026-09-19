import axiosClient from './axiosClient';

export const checkDuplicateInstructor = (firstName, lastName) =>
  axiosClient
    .get('/instructors/check-duplicate', { params: { firstName, lastName } })
    .then((res) => res.data);

export const createInstructor = (data) => axiosClient.post('/instructors', data).then((res) => res.data);

export const listInstructors = (q) =>
  axiosClient.get('/instructors', { params: q ? { q } : {} }).then((res) => res.data);

export const getInstructor = (id) => axiosClient.get(`/instructors/${id}`).then((res) => res.data);

export const updateInstructor = (id, data) =>
  axiosClient.put(`/instructors/${id}`, data).then((res) => res.data);

export const deactivateInstructor = (id) =>
  axiosClient.delete(`/instructors/${id}`).then((res) => res.data);

import axios from "axios";

const api = axios.create({
  baseURL: "http://127.0.0.1:8001",
});

export const getCustomers = () => api.get("/customers");
export const getAnalysis = (id) => api.get(`/analysis/${id}`);
export const reviewDecision = (decision_id, status, modifications = null) => 
  api.post("/analysis/review", { decision_id, status, modifications });

export default api;

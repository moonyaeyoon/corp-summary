const { contextBridge } = require("electron");

contextBridge.exposeInMainWorld("corpSummaryConfig", {
  apiBaseUrl: process.env.CORP_SUMMARY_API_BASE_URL || "http://127.0.0.1:4820/v1",
});

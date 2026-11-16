import "./lib/env.js";
import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth.js";
import cohortRoutes from "./routes/cohorts.js";
import teamRoutes from "./routes/teams.js";
import studentRoutes from "./routes/students.js";
import businessRoutes from "./routes/businesses.js";
import productRoutes from "./routes/products.js";
import teacherRoutes from "./routes/teacher.js";
import saleRoutes from "./routes/sales.js";
import expenseRoutes from "./routes/expenses.js";
import { failure } from "./lib/api-response.js";
import { HttpError } from "./lib/errors.js";

const app = express();

app.use(cors());
app.use(express.json());

// Health check
app.get("/health", (_req, res) => {
  res.status(200).json({
    success: true,
    data: {
      message: "YouthBiz API is running",
      timestamp: new Date().toISOString(),
    },
  });
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/cohorts", cohortRoutes);
app.use("/api/teams", teamRoutes);
app.use("/api/students", studentRoutes);
app.use("/api/businesses", businessRoutes);
app.use("/api/products", productRoutes);
app.use("/api/teacher", teacherRoutes);
app.use("/api/sales", saleRoutes);
app.use("/api/expenses", expenseRoutes);

// 404 handler
app.use((_req, res) => {
  failure(res, "Not found", 404);
});

// Error handler — converts HttpError into the standard response format
app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (err instanceof HttpError) {
    return failure(res, err.message, err.status);
  }
  console.error("Unhandled error:", err);
  return failure(res, "Internal server error", 500);
});

export default app;

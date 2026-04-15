// Shared types for Roman Series monorepo
// Export types from this file

// Example type definition
export interface ApiResponse<T> {
  status: "success" | "error";
  data?: T;
  message?: string;
  timestamp: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

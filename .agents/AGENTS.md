# Project Standards

- **Separation of Concerns**: Strictly separate backend logic (API, database interactions) from frontend views (UI, state management).
- **Error Handling**: Handle API errors gracefully. The backend must always return consistent and structured error responses (e.g., standard JSON error objects with appropriate HTTP status codes). The frontend must gracefully display these errors to the user without crashing.

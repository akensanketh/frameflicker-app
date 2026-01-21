// client/src/api/config.js

const API_BASE_URL = import.meta.env.PROD 
  ? 'https://your-backend-name.onrender.com'  // Replace with your Render backend URL
  : '';  // Empty for development (uses Vite proxy)

export default API_BASE_URL;
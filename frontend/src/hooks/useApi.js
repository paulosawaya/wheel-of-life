// frontend/src/hooks/useApi.js
import { useState } from 'react';
import toast from 'react-hot-toast';

export const useApi = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const request = async (apiCall, options = {}) => {
    setLoading(true);
    setError(null);
    const {
        showSuccess = false,
        successMessage = 'Operação realizada com sucesso!',
        showError = true,
      // You can add a default errorMessage if needed
    } = options;

    try {
        const result = await apiCall();
        
      // Assuming the apiCall (like login/register in AuthContext)
      // returns an object with a 'success' boolean and optionally an 'error' message
        if (result && result.success === false) {
        // Handle errors returned by business logic (e.g., invalid credentials)
        const errorMessage = result.error || 'Ocorreu um erro.';
        if (showError) {
            toast.error(errorMessage);
        }
        setError(errorMessage);
        setLoading(false);
        // Throw an error to be caught by the calling component if it needs to act on it
        throw new Error(errorMessage);
    }

    if (showSuccess) {
        toast.success(successMessage);
    }
    setLoading(false);
      return result; // Return the result of the apiCall
    } catch (err) {
      // Handle network errors or errors thrown by the apiCall itself
      // If the error was already handled (e.g. business logic error from above), don't re-toast
        if (err.message !== (error || (options.errorMessage || 'Ocorreu um erro.'))) {
            const errorMessage = err.response?.data?.message || err.message || 'Ocorreu um erro inesperado.';
            if (showError) {
            toast.error(errorMessage);
            }
            setError(errorMessage);
        }
        setLoading(false);
      throw err; // Re-throw the error so the calling component can also catch it if needed
    }
    };

    return { request, loading, error };
};
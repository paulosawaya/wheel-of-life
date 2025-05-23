// frontend/src/hooks/useApi.js
import { useState } from 'react';
import toast from 'react-hot-toast';

/**
 * Custom hook to manage API requests, loading states, errors, and notifications.
 *
 * @returns {object} An object containing:
 * - request: A function to make an API call.
 * - loading: A boolean indicating if a request is in progress.
 * - error: An error object or null if no error.
 */
export const useApi = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Makes an API call and handles loading, error states, and notifications.
   *
   * @param {Function} apiCall - A function that returns a Promise representing the API call.
   * This function should ideally return an object like:
   * { success: true, data: ... } or { success: false, error: 'Error message' }
   * @param {object} [options={}] - Options to customize behavior.
   * @param {boolean} [options.showSuccess=false] - Whether to show a success toast.
   * @param {string} [options.successMessage='Operação realizada com sucesso!'] - Custom success message.
   * @param {boolean} [options.showError=true] - Whether to show an error toast.
   * @param {string} [options.defaultErrorMessage='Ocorreu um erro inesperado.'] - Default error message if none is provided by the API.
   * @returns {Promise<any>} A Promise that resolves with the API call result or rejects with an error.
   */
  const request = async (apiCall, options = {}) => {
    setLoading(true);
    setError(null);
    const {
      showSuccess = false,
      successMessage = 'Operação realizada com sucesso!',
      showError = true,
      defaultErrorMessage = 'Ocorreu um erro inesperado.',
    } = options;

    try {
      const result = await apiCall();

      // Handle cases where the API call itself indicates a business logic failure
      // (e.g., invalid credentials, item not found, etc.),
      // assuming the apiCall function (like login/register in AuthContext)
      // returns an object with a 'success' boolean and optionally an 'error' message.
      if (result && result.success === false) {
        const errorMessage = result.error || defaultErrorMessage;
        if (showError) {
          toast.error(errorMessage);
        }
        setError(errorMessage);
        setLoading(false);
        // Throw an error to be caught by the calling component if it needs to act on it.
        // This ensures that component-level error handling (e.g., redirecting, specific UI changes) can occur.
        throw new Error(errorMessage);
      }

      // Handle successful API calls
      if (showSuccess) {
        toast.success(successMessage);
      }
      setLoading(false);
      return result; // Return the result of the apiCall
    } catch (err) {
      // This catch block handles:
      // 1. Network errors or other exceptions thrown during the apiCall execution.
      // 2. Errors explicitly thrown above for business logic failures (result.success === false).

      // Avoid re-toasting if the error was already set and toasted by the business logic failure block.
      // The `error` state variable would still be null if this is the first time we're seeing this error.
      if (error === null) {
        const errorMessage = err.response?.data?.message || err.response?.data?.error || err.message || defaultErrorMessage;
        if (showError) {
          toast.error(errorMessage);
        }
        setError(errorMessage);
      }
      
      setLoading(false);
      // Re-throw the error so the calling component can also catch it if needed
      // for specific component-level error handling.
      throw err;
    }
  };

  return { request, loading, error };
};

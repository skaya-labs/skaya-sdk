import axios, { AxiosRequestConfig } from 'axios';
import Cookies from 'js-cookie';
import { ApiEndpoint } from './apiEndpoints';


const Request = async ({ endpointId, slug, data }: any) => {
  const storedAccessToken = Cookies.get('access');  // Retrieve stored access token
  const endpoint = ApiEndpoint[endpointId];

  if (!endpoint) {
    throw new Error(`Invalid API endpoint: ${endpointId}`);
  }

  let fullUrl = endpoint.url;
  if (slug) {
    fullUrl += `${slug}`;  // Append additional slug to URL if provided
  }

  
  const axiosConfig: AxiosRequestConfig = {
    method: endpoint.method,
    url: fullUrl,
    headers: {
      ...endpoint.headers,
      // Use the appropriate Authorization header based on the endpoint type
      Authorization: endpoint.withAuth ? `Bearer ${storedAccessToken}` : undefined
    }
  };

  if (data instanceof FormData) {
    delete axiosConfig.headers['Content-Type']; // Let browser set it
  }
  
  // Check and set appropriate data for non-GET requests
  if (endpoint.method !== 'GET') {
    axiosConfig.data = data;
  }

  try {
    const response = await axios(axiosConfig);

    // Handle unsuccessful response
    if (response.status < 200 || response.status >= 300) {
      const errorText = response.data?.error || response.data?.message || endpoint.errorMessage || "Unexpected error occurred.";
      throw new Error(errorText);
    }

    return response.data;  // Return the response data for further processing
  } catch (error) {
    throw error;  // Re-throw the error for further handling
  }
};

export default Request;
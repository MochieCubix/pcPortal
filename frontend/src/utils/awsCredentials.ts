/**
 * Utility for validating AWS credentials in different environments
 */

/**
 * Check if AWS credentials are available in the environment
 * @returns Object containing validation status
 */
export async function validateAwsCredentials(): Promise<{
  valid: boolean;
  message: string;
}> {
  try {
    // In a browser context, we can't directly check for credentials
    // Instead, we'll make a lightweight request to S3
    const response = await fetch('/api/aws/check-credentials', {
      method: 'GET'
    });

    if (!response.ok) {
      const data = await response.json();
      return {
        valid: false,
        message: data.error || 'AWS credentials check failed'
      };
    }

    const data = await response.json();
    return {
      valid: true,
      message: data.message || 'AWS credentials are valid'
    };

  } catch (error) {
    console.error('Error validating AWS credentials:', error);
    return {
      valid: false,
      message: error instanceof Error ? error.message : 'Unknown error checking AWS credentials'
    };
  }
}

/**
 * Check if SES is properly configured
 * @returns Object containing validation status for SES
 */
export async function validateSesConfiguration(): Promise<{
  valid: boolean;
  message: string;
}> {
  try {
    const response = await fetch('/api/aws/check-ses', {
      method: 'GET'
    });

    if (!response.ok) {
      const data = await response.json();
      return {
        valid: false,
        message: data.error || 'SES configuration check failed'
      };
    }

    const data = await response.json();
    return {
      valid: true,
      message: data.message || 'SES is properly configured'
    };

  } catch (error) {
    console.error('Error validating SES configuration:', error);
    return {
      valid: false,
      message: error instanceof Error ? error.message : 'Unknown error checking SES configuration'
    };
  }
} 
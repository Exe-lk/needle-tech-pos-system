/**
 * Validates Sri Lankan VAT number format
 * Formats:
 * - XXXXXXXXX-7000 (9 digits + -7000 suffix)
 * - XXXXXXXXX-2 (9 digits + -2 suffix)
 * - XXXXXXXXX (9 digits only)
 * - 12-digit format (aligned with new TIN/NIC)
 */
export const validateVATNumber = (value: string): string | null => {
    if (!value || typeof value !== 'string') {
      return 'VAT number is required';
    }
  
    const trimmed = value.trim().replace(/\s+/g, ''); // Remove spaces
  
    // Pattern 1: 9 digits followed by optional -7000 or -2 suffix
    const pattern1 = /^[0-9]{9}(-7000|-2)?$/;
    
    // Pattern 2: 12 digits (new format)
    const pattern2 = /^[0-9]{12}$/;
  
    if (pattern1.test(trimmed) || pattern2.test(trimmed)) {
      return null; // Valid
    }
  
    return 'Invalid VAT number format. Expected formats: 123456789, 123456789-7000, 123456789-2, or 12-digit number';
  };
  
  /**
   * Validates Sri Lankan TIN (Tax Identification Number) format
   * Formats:
   * - 9 digits (older format)
   * - 12 digits (new format, aligned with NIC)
   */
  export const validateTINNumber = (value: string): string | null => {
    if (!value || typeof value !== 'string') {
      return 'TIN number is required';
    }
  
    const trimmed = value.trim().replace(/\s+/g, ''); // Remove spaces
  
    // TIN can be 9 or 12 digits
    const pattern = /^[0-9]{9}$|^[0-9]{12}$/;
  
    if (pattern.test(trimmed)) {
      return null; // Valid
    }
  
    return 'Invalid TIN number format. Expected 9 or 12 digits';
  };
  
  /**
   * Validates VAT/TIN combined field (for companies)
   * Accepts both VAT and TIN formats
   */
  export const validateVATTIN = (value: string): string | null => {
    if (!value || typeof value !== 'string') {
      return 'VAT/TIN number is required';
    }
  
    const trimmed = value.trim().replace(/\s+/g, ''); // Remove spaces
  
    // Check VAT format first
    const vatPattern1 = /^[0-9]{9}(-7000|-2)?$/;
    const vatPattern2 = /^[0-9]{12}$/;
    
    // Check TIN format
    const tinPattern = /^[0-9]{9}$|^[0-9]{12}$/;
  
    if (vatPattern1.test(trimmed) || vatPattern2.test(trimmed) || tinPattern.test(trimmed)) {
      return null; // Valid
    }
  
    return 'Invalid VAT/TIN number format. Expected: 9 or 12 digits, or 9 digits with -7000/-2 suffix';
  };
  
  /**
   * Validates Sri Lankan NIC (National Identity Card) number format
   * Formats:
   * - Old format: 9 digits + V or X (e.g., 855420159V)
   * - New format: 12 digits (e.g., 199012304567)
   *   Structure: YYYYDDD####0
   *   - YYYY: 4-digit birth year
   *   - DDD: 3 digits for day of year (001-366, +500 for females: 501-866)
   *   - ####: 4-digit serial number
   *   - 0: Check digit
   */
  export const validateNICNumber = (value: string): string | null => {
    if (!value || typeof value !== 'string') {
      return 'NIC number is required';
    }
  
    const trimmed = value.trim().toUpperCase().replace(/\s+/g, ''); // Remove spaces and convert to uppercase
  
    // Old format: 9 digits + V or X
    const oldFormatPattern = /^[0-9]{9}[VX]$/;
    
    // New format: 12 digits
    const newFormatPattern = /^[0-9]{12}$/;
  
    if (oldFormatPattern.test(trimmed)) {
      // Additional validation for old format: check if it's a valid 9-digit number
      const digits = trimmed.slice(0, 9);
      if (/^[0-9]{9}$/.test(digits)) {
        return null; // Valid old format
      }
    }
  
    if (newFormatPattern.test(trimmed)) {
      // Additional validation for new format
      const year = parseInt(trimmed.substring(0, 4));
      const dayOfYear = parseInt(trimmed.substring(4, 7));
      
      // Validate year (reasonable range: 1900 to current year + 1)
      const currentYear = new Date().getFullYear();
      if (year < 1900 || year > currentYear + 1) {
        return 'Invalid birth year in NIC number';
      }
      
      // Validate day of year (001-366 for males, 501-866 for females)
      if ((dayOfYear >= 1 && dayOfYear <= 366) || (dayOfYear >= 501 && dayOfYear <= 866)) {
        return null; // Valid new format
      }
      
      return 'Invalid day of year in NIC number';
    }
  
    return 'Invalid NIC number format. Expected: 9 digits + V/X (old format) or 12 digits (new format)';
  };
  
  /**
   * Validates email format
   */
  export const validateEmail = (value: string): string | null => {
    if (!value || typeof value !== 'string') {
      return 'Email is required';
    }
  
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value.trim())) {
      return 'Please enter a valid email address';
    }
  
    return null;
  };
  
  /**
   * Validates phone number (Sri Lankan format)
   * Accepts various formats: +94, 0, or without prefix
   */
  export const validatePhoneNumber = (value: string): string | null => {
    if (!value || typeof value !== 'string') {
      return 'Phone number is required';
    }
  
    const trimmed = value.trim().replace(/\s+/g, ''); // Remove spaces
    
    // Sri Lankan phone number patterns:
    // - +94XXXXXXXXX (with country code)
    // - 0XXXXXXXXX (with leading 0)
    // - XXXXXXXXX (9 digits)
    const patterns = [
      /^\+94[0-9]{9}$/,           // +94XXXXXXXXX
      /^0[0-9]{9}$/,              // 0XXXXXXXXX
      /^[0-9]{9}$/,               // XXXXXXXXX
    ];
  
    const isValid = patterns.some(pattern => pattern.test(trimmed));
    
    if (isValid) {
      return null;
    }
  
    return 'Invalid phone number format. Expected: 9 digits, 0XXXXXXXXX, or +94XXXXXXXXX';
  };
  
  /**
   * Validates required text field
   */
  export const validateRequired = (value: string): string | null => {
    if (!value || (typeof value === 'string' && value.trim() === '')) {
      return 'This field is required';
    }
    return null;
  };


  // ... existing code ...

/**
 * Validates sewing machine serial number format
 * Common formats:
 * - SN-YYYY-### (e.g., SN-2024-001)
 * - SN-### (e.g., SN-001)
 * - YYYY-SN-### (e.g., 2024-SN-001)
 * - Brand-Model-SN-### (e.g., BROTHER-XL2600I-SN-2024-001)
 * 
 * Flexible validation: Must contain alphanumeric characters, hyphens, and underscores
 * Minimum length: 3 characters
 * Maximum length: 50 characters
 */
export const validateSerialNumber = (value: string): string | null => {
    if (!value || typeof value !== 'string') {
      return 'Serial number is required';
    }
  
    const trimmed = value.trim();
  
    // Check minimum and maximum length
    if (trimmed.length < 3) {
      return 'Serial number must be at least 3 characters long';
    }
  
    if (trimmed.length > 50) {
      return 'Serial number must not exceed 50 characters';
    }
  
    // Allow alphanumeric characters, hyphens, underscores, and spaces
    // Common patterns: SN-2024-001, SN-001, 2024-SN-001, etc.
    const serialNumberPattern = /^[A-Za-z0-9\s\-_]+$/;
  
    if (!serialNumberPattern.test(trimmed)) {
      return 'Serial number can only contain letters, numbers, hyphens, underscores, and spaces';
    }
  
    // Ensure it's not just spaces or special characters
    if (!/[A-Za-z0-9]/.test(trimmed)) {
      return 'Serial number must contain at least one letter or number';
    }
  
    return null; // Valid
  };
  
  /**
   * Validates sewing machine box number format
   * Common formats:
   * - BOX-YYYY-### (e.g., BOX-2024-001)
   * - BOX-### (e.g., BOX-001)
   * - YYYY-BOX-### (e.g., 2024-BOX-001)
   * 
   * Flexible validation: Must contain alphanumeric characters, hyphens, and underscores
   * Minimum length: 3 characters
   * Maximum length: 50 characters
   */
  export const validateBoxNumber = (value: string): string | null => {
    if (!value || typeof value !== 'string') {
      return 'Box number is required';
    }
  
    const trimmed = value.trim();
  
    // Check minimum and maximum length
    if (trimmed.length < 3) {
      return 'Box number must be at least 3 characters long';
    }
  
    if (trimmed.length > 50) {
      return 'Box number must not exceed 50 characters';
    }
  
    // Allow alphanumeric characters, hyphens, underscores, and spaces
    // Common patterns: BOX-2024-001, BOX-001, 2024-BOX-001, etc.
    const boxNumberPattern = /^[A-Za-z0-9\s\-_]+$/;
  
    if (!boxNumberPattern.test(trimmed)) {
      return 'Box number can only contain letters, numbers, hyphens, underscores, and spaces';
    }
  
    // Ensure it's not just spaces or special characters
    if (!/[A-Za-z0-9]/.test(trimmed)) {
      return 'Box number must contain at least one letter or number';
    }
  
    return null; // Valid
  };
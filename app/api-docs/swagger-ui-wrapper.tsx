'use client';

import { useEffect } from 'react';
import SwaggerUI from 'swagger-ui-react';

type SwaggerUIWrapperProps = {
  spec: any;
};

export default function SwaggerUIWrapper({ spec }: SwaggerUIWrapperProps) {
  // Suppress console warnings for deprecated lifecycle methods
  // This is a known issue with swagger-ui-react and React 18+ strict mode
  useEffect(() => {
    const originalError = console.error;
    
    console.error = (...args: any[]) => {
      if (
        typeof args[0] === 'string' &&
        args[0].includes('UNSAFE_componentWillReceiveProps')
      ) {
        return;
      }
      originalError.call(console, ...args);
    };

    return () => {
      console.error = originalError;
    };
  }, []);

  return <SwaggerUI spec={spec} />;
}

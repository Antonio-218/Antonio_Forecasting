'use client';

import dynamic from 'next/dynamic';

const SwaggerUI = dynamic(() => import('swagger-ui-react'), { ssr: false });
import 'swagger-ui-react/swagger-ui.css';
import swaggerSpec from '@/../../swagger-spec.json';

export default function ApiDocs() {
  return (
    <div className="min-h-screen">
      <SwaggerUI spec={swaggerSpec} />
    </div>
  );
}

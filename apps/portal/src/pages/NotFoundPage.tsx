import { Button } from '@fluentui/react-components';
import { useNavigate } from 'react-router-dom';
import { ServicePage } from '../../../../packages/ui/src';

export function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <ServicePage
      area="portal"
      title="Page not found"
      description="The requested workspace route does not exist or has moved."
      actions={<Button onClick={() => navigate('/')} appearance="primary">Return to overview</Button>}
    />
  );
}

import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, XCircle, Clock, ArrowLeft } from 'lucide-react';

export function PaymentStatus() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const status = searchParams.get('status');

  useEffect(() => {
    if (status === 'approved') {
      // Redirect to home after 5 seconds on successful payment
      const timer = setTimeout(() => {
        navigate('/');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [status, navigate]);

  // Define a type for status content to ensure consistency
  interface StatusContentType {
    icon: JSX.Element;
    title: string;
    message: string;
    actions: Array<{
      text: string;
      action: () => void;
      style: string;
      isPrimary: boolean;
    }>;
  }

  const getStatusContent = (): StatusContentType => {
    switch (status) {
      case 'approved':
        return {
          icon: <CheckCircle className="h-16 w-16 text-green-500" />,
          title: '¡Pago exitoso!',
          message: 'Tu pago ha sido procesado correctamente. Serás redirigido al inicio en 5 segundos.',
          actions: [
            {
              text: 'Volver al inicio',
              action: () => navigate('/'),
              style: 'bg-green-600 hover:bg-green-700 text-white',
              isPrimary: true,
            },
          ],
        };
      case 'rejected':
        return {
          icon: <XCircle className="h-16 w-16 text-red-500" />,
          title: 'Pago rechazado',
          message: 'Lo sentimos, tu pago no pudo ser procesado. Por favor intenta de nuevo.',
          actions: [
            {
              text: 'Elegir otro medio de pago',
              action: () => navigate('/checkout'),
              style: 'bg-red-600 hover:bg-red-700 text-white',
              isPrimary: true,
            },
            {
              text: 'Volver al inicio',
              action: () => navigate('/'),
              style: 'bg-gray-200 hover:bg-gray-300 text-gray-700',
              isPrimary: false,
            },
          ],
        };
      case 'pending':
        return {
          icon: <Clock className="h-16 w-16 text-yellow-500" />,
          title: 'Pago pendiente',
          message: 'Tu pago está siendo procesado. Te notificaremos cuando se confirme.',
          actions: [
            {
              text: 'Volver al inicio',
              action: () => navigate('/'),
              style: 'bg-yellow-600 hover:bg-yellow-700 text-white',
              isPrimary: true,
            },
          ],
        };
      default:
        return {
          icon: <XCircle className="h-16 w-16 text-gray-500" />,
          title: 'Estado desconocido',
          message: 'No pudimos determinar el estado de tu pago.',
          actions: [
            {
              text: 'Volver al inicio',
              action: () => navigate('/'),
              style: 'bg-gray-600 hover:bg-gray-700 text-white',
              isPrimary: true,
            },
          ],
        };
    }
  };

  const statusContent = getStatusContent();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="flex items-center p-4 border-b bg-white shadow-sm">
        <button
          onClick={() => navigate('/')}
          className="text-gray-600 hover:text-gray-900 focus:outline-none"
        >
          <ArrowLeft className="h-6 w-6" />
        </button>
      </div>

      <div className="flex-1 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white shadow rounded-lg p-8 text-center">
          <div className="flex justify-center mb-6">
            {statusContent.icon}
          </div>
          
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            {statusContent.title}
          </h2>
          
          <p className="text-gray-600 mb-8">
            {statusContent.message}
          </p>

          <div className="space-y-4">
            {statusContent.actions.map((buttonInfo, index) => (
              <button
                key={index}
                onClick={buttonInfo.action}
                className={`w-full py-3 px-4 rounded-md font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 ${buttonInfo.style} ${buttonInfo.isPrimary ? '' : 'border border-gray-300'}`}
              >
                {buttonInfo.text}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

